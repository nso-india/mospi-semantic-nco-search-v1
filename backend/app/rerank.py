"""LLM-based reranking + scoring + explanations + localization.

Bi-encoder retrieval (dense + BM25 + RRF) finds the right neighborhood but ranks
imperfectly and its scores are not calibrated relevance. This module re-reads the
query against each retrieved candidate with the LLM and returns, per candidate:
a 0-100 relevance score, a short reason, a cleaned title, and a one-line summary --
all written in the requested response language. Reuses the same OpenAI-compatible
endpoint as the normalizer (e.g. Groq). Fails soft: returns None on any error so
search still works with the original hybrid order.

The NCO code and hierarchy are NEVER generated -- only the human-readable title,
summary, and reason are produced/translated for display.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from .llm_client import LLMClient

_RERANK_SYSTEM = (
    "You are an expert in India's NCO-2015 occupation classification. "
    "Given a user's job query and candidate occupations, for EACH candidate: "
    "(1) score how well it matches the occupation the user means, 0-100 "
    "(100 = exact match, 0 = unrelated); "
    "(2) give a reason in 12 words or fewer; "
    "(3) reconstruct the full, correct occupation TITLE from the candidate's given "
    "title and description (given titles are often truncated) -- do NOT invent "
    "occupations, use only what the text supports; "
    "(4) write a one-sentence plain SUMMARY (max 25 words) of what the role does. "
    "Write the title, summary, and reason in the RESPONSE LANGUAGE the user specifies "
    "(translate occupation names into that language and script; keep the NCO code as-is). "
    "Return STRICT JSON only: an array "
    '[{"code":"<code>","score":<int>,"reason":"<...>","title":"<...>","summary":"<...>"}] '
    "containing every candidate exactly once, best first."
)


@dataclass
class RerankItem:
    code: str
    score: float
    reason: str
    title: str = ""
    summary: str = ""


class LLMReranker:
    def __init__(self, client: LLMClient | None, enabled: bool, timeout: float) -> None:
        self.client = client
        self.enabled = enabled and (client is not None)
        self.timeout = timeout

    def rerank(
        self, query: str, normalized: str, candidates: list[dict],
        target_language: str = "English", mode: str = "online",
    ) -> list[RerankItem] | None:
        """candidates: [{"code","title","desc"}]. Returns ranked items or None."""
        if not self.enabled or not self.client or not candidates:
            return None
        try:
            lines = []
            for i, c in enumerate(candidates, 1):
                desc = (c.get("desc") or "").replace("\n", " ")[:240]
                lines.append(f'{i}. [{c["code"]}] {c.get("title","")} -- {desc}')
            meaning = (
                f' (meaning: "{normalized}")'
                if normalized and normalized.strip().lower() != query.strip().lower()
                else ""
            )
            user = (
                f"RESPONSE LANGUAGE: {target_language}\n"
                f'Query: "{query}"{meaning}\nCandidates:\n' + "\n".join(lines)
            )

            content = self.client.chat_completion(
                messages=[
                    {"role": "system", "content": _RERANK_SYSTEM},
                    {"role": "user", "content": user},
                ],
                temperature=0.0,
                timeout=self.timeout,
                mode=mode,
            )
            if not content:
                return None
            m = re.search(r"\[.*\]", content, re.DOTALL)
            data = json.loads(m.group(0) if m else content)

            items: list[RerankItem] = []
            for d in data:
                code = str(d.get("code", "")).strip()
                if not code:
                    continue
                score = max(0.0, min(100.0, float(d.get("score", 0))))
                items.append(RerankItem(
                    code=code,
                    score=score,
                    reason=str(d.get("reason", "")).strip(),
                    title=str(d.get("title", "")).strip(),
                    summary=str(d.get("summary", "")).strip(),
                ))
            return items or None
        except Exception:
            return None