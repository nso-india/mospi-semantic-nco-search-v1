"""Evaluation harness: Recall@K, MRR, nDCG@5, per-language and per-category.

Loads the gold test set, runs every query through the live search pipeline,
and computes retrieval metrics. Results are returned as a structured dict
so they can be served via /evaluate endpoint and displayed as charts.

Metrics:
  Recall@K  -- fraction of queries where correct code is in top-K results.
  MRR       -- Mean Reciprocal Rank (how high is the first correct hit?).
  nDCG@K    -- normalised Discounted Cumulative Gain (rank-weighted relevance).

Partial credit: we check prefix matching (e.g. "6111" matches "6111.02"),
so family-level hits get partial credit -- appropriate for NCO's hierarchy.
"""
from __future__ import annotations

import json
import math
import time
from pathlib import Path
from typing import Any

GOLD_PATH = Path(__file__).parent.parent / "data" / "gold_test_set.json"
KS = [1, 3, 5]          # K values for Recall@K and nDCG@K


# ── Metric helpers ────────────────────────────────────────────────────────

def _is_match(returned_code: str, expected_codes: list[str]) -> bool:
    """Exact match OR 4-digit-family prefix match (partial credit)."""
    rc = returned_code.strip()
    for ec in expected_codes:
        if rc == ec.strip():
            return True
        # Prefix match: "6111" matches "6111.02"
        prefix = ec.split(".")[0].strip()
        if rc.startswith(prefix) or returned_code.startswith(prefix):
            return True
    return False


def _reciprocal_rank(codes: list[str], expected: list[str]) -> float:
    for rank, code in enumerate(codes, 1):
        if _is_match(code, expected):
            return 1.0 / rank
    return 0.0


def _dcg(codes: list[str], expected: list[str], k: int) -> float:
    score = 0.0
    for rank, code in enumerate(codes[:k], 1):
        if _is_match(code, expected):
            score += 1.0 / math.log2(rank + 1)
    return score


def _ndcg(codes: list[str], expected: list[str], k: int) -> float:
    ideal = sum(1.0 / math.log2(i + 2) for i in range(min(len(expected), k)))
    if ideal == 0:
        return 0.0
    return _dcg(codes, expected, k) / ideal


# ── Runner ────────────────────────────────────────────────────────────────

def run_evaluation(
    embedder: Any,
    store: Any,
    normalizer: Any,
    reranker: Any,
    settings: Any,
    max_queries: int | None = None,
) -> dict:
    """Run the full evaluation and return a metrics dict."""
    if not GOLD_PATH.exists():
        return {"error": f"Gold test set not found at {GOLD_PATH}"}

    gold: list[dict] = json.loads(GOLD_PATH.read_text(encoding="utf-8"))
    if max_queries:
        gold = gold[:max_queries]

    from .normalize import NormalizedQuery
    from qdrant_client import models as qmodels

    results_by_cat: dict[str, list[dict]] = {}
    results_by_lang: dict[str, list[dict]] = {}
    all_rows: list[dict] = []

    total_t = 0.0

    for item in gold:
        query: str = item["query"]
        expected: list[str] = item["expected_codes"]
        lang: str = item.get("language", "unknown")
        cat: str = item.get("category", "general")

        t0 = time.perf_counter()

        # -- normalise
        nq = normalizer.normalize(query)
        search_text = nq.search_text or query

        # -- embed
        dense_q = embedder.embed_query_dense(search_text)
        sparse_q = embedder.embed_query_sparse(search_text)

        # -- retrieve (top 10 for eval)
        fetch_k = max(10, settings.rerank_pool) if reranker.enabled else 10
        points = store.hybrid_search(
            dense_q=dense_q,
            sparse_q=sparse_q,
            limit=fetch_k,
            prefetch_limit=settings.prefetch_limit,
        )

        returned_codes = [(p.payload or {}).get("nco_code_2015", "") for p in points]

        # -- optional rerank (only if enabled; skip for speed)
        if reranker.enabled and points:
            candidates = [
                {
                    "code": (p.payload or {}).get("nco_code_2015", ""),
                    "title": (p.payload or {}).get("title", ""),
                    "desc": (p.payload or {}).get("description", "")[:200],
                }
                for p in points
            ]
            items = reranker.rerank(query, search_text, candidates, target_language="English")
            if items:
                returned_codes = [it.code for it in items]

        latency = (time.perf_counter() - t0) * 1000
        total_t += latency

        row: dict = {
            "query": query,
            "language": lang,
            "category": cat,
            "returned": returned_codes[:10],
            "expected": expected,
            "latency_ms": round(latency, 1),
            "mrr": _reciprocal_rank(returned_codes, expected),
            "ndcg5": _ndcg(returned_codes, expected, 5),
        }
        for k in KS:
            row[f"recall@{k}"] = int(
                any(_is_match(c, expected) for c in returned_codes[:k])
            )

        all_rows.append(row)
        results_by_cat.setdefault(cat, []).append(row)
        results_by_lang.setdefault(lang, []).append(row)

    # ── Aggregate ─────────────────────────────────────────────────────────
    n = len(all_rows)

    def agg(rows: list[dict]) -> dict:
        if not rows:
            return {}
        m: dict[str, float] = {
            f"recall@{k}": round(sum(r[f"recall@{k}"] for r in rows) / len(rows) * 100, 1)
            for k in KS
        }
        m["mrr"] = round(sum(r["mrr"] for r in rows) / len(rows), 4)
        m["ndcg@5"] = round(sum(r["ndcg5"] for r in rows) / len(rows), 4)
        m["count"] = len(rows)
        return m

    overall = agg(all_rows)
    overall["avg_latency_ms"] = round(total_t / n, 1) if n else 0
    overall["total_queries"] = n

    per_category = {cat: agg(rows) for cat, rows in results_by_cat.items()}
    per_language = {lang: agg(rows) for lang, rows in results_by_lang.items()}

    # Worst queries (bottom 10 by MRR)
    worst = sorted(all_rows, key=lambda r: r["mrr"])[:10]

    return {
        "overall": overall,
        "per_category": per_category,
        "per_language": per_language,
        "worst_queries": [
            {
                "query": r["query"],
                "language": r["language"],
                "mrr": r["mrr"],
                "recall@5": r["recall@5"],
                "top3_returned": r["returned"][:3],
                "expected": r["expected"][:3],
            }
            for r in worst
        ],
        "sample_size": n,
    }