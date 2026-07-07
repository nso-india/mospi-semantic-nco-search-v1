"""Ingest an NCO CSV into Qdrant.

Usage:
    python -m app.ingest                         # uses data/nco_sample.csv
    python -m app.ingest --csv path/to/your.csv  # your real 3,500-row file
    python -m app.ingest --csv your.csv --batch-size 128
"""
from __future__ import annotations

import argparse

from .config import settings
from .embeddings import Embedder
from .nco import build_document_text, build_payload, load_nco_csv, stable_id
from .qdrant_store import VectorStore


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest NCO 2015 CSV into Qdrant.")
    parser.add_argument("--csv", default="data/nco_sample.csv", help="Path to the NCO CSV.")
    parser.add_argument("--batch-size", type=int, default=64)
    args = parser.parse_args()

    print(f"[1/5] Loading CSV: {args.csv}")
    df = load_nco_csv(args.csv)
    print(f"      {len(df)} occupation rows.")

    print(f"[2/5] Loading models (dense={settings.dense_model}, sparse={settings.sparse_model}) ...")
    print("      First run downloads BGE-M3 (~hundreds of MB). Subsequent runs are cached.")
    embedder = Embedder(settings.dense_model, settings.sparse_model)

    print("[3/5] Creating Qdrant collection ...")
    store = VectorStore(
        collection=settings.collection_name,
        url=settings.qdrant_url,
        api_key=settings.qdrant_api_key,
        path=settings.qdrant_path,
    )
    store.recreate(embedder.dense_dim)

    print("[4/5] Embedding + upserting in batches ...")
    rows = df.to_dict(orient="records")
    total = 0
    for start in range(0, len(rows), args.batch_size):
        batch = rows[start:start + args.batch_size]
        texts = [build_document_text(r) for r in batch]
        dense = embedder.embed_documents_dense(texts)
        sparse = embedder.embed_documents_sparse(texts)
        ids = [stable_id(r["nco_code_2015"]) for r in batch]
        payloads = [build_payload(r) for r in batch]
        store.upsert(ids, dense, sparse, payloads)
        total += len(batch)
        print(f"      upserted {total}/{len(rows)}")

    print(f"[5/5] Done. Collection '{settings.collection_name}' now holds {store.count()} points.")


if __name__ == "__main__":
    main()