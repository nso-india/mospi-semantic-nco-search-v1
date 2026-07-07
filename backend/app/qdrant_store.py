"""Qdrant vector store: collection management, upsert, and hybrid (RRF) search.

Works in two modes:
  * embedded / on-disk  -> QdrantClient(path=...)        (default, no Docker)
  * server              -> QdrantClient(url=...)         (set QDRANT_URL)

Hybrid search fuses a dense (semantic) prefetch and a sparse (BM25/lexical)
prefetch using Qdrant's built-in Reciprocal Rank Fusion.
"""
from __future__ import annotations

from qdrant_client import QdrantClient, models

from .embeddings import SparseVec

DENSE_VEC = "dense"
SPARSE_VEC = "sparse"


class VectorStore:
    def __init__(
        self,
        collection: str,
        url: str | None = None,
        api_key: str | None = None,
        path: str = "./qdrant_data",
    ) -> None:
        if url:
            self.client = QdrantClient(url=url, api_key=api_key or None)
        else:
            self.client = QdrantClient(path=path)
        self.collection = collection

    # ---- lifecycle ----
    def recreate(self, dense_dim: int) -> None:
        if self.client.collection_exists(self.collection):
            self.client.delete_collection(self.collection)
        self.client.create_collection(
            collection_name=self.collection,
            vectors_config={
                DENSE_VEC: models.VectorParams(
                    size=dense_dim, distance=models.Distance.COSINE
                )
            },
            # IDF modifier lets Qdrant compute proper BM25 scoring on the sparse vector.
            sparse_vectors_config={
                SPARSE_VEC: models.SparseVectorParams(modifier=models.Modifier.IDF)
            },
        )

    def count(self) -> int:
        try:
            return self.client.count(self.collection, exact=True).count
        except Exception:
            return 0

    # ---- write ----
    def upsert(
        self,
        ids: list[str],
        dense_vecs: list[list[float]],
        sparse_vecs: list[SparseVec],
        payloads: list[dict],
    ) -> None:
        points = [
            models.PointStruct(
                id=pid,
                vector={
                    DENSE_VEC: dv,
                    SPARSE_VEC: models.SparseVector(indices=sv.indices, values=sv.values),
                },
                payload=pl,
            )
            for pid, dv, sv, pl in zip(ids, dense_vecs, sparse_vecs, payloads)
        ]
        self.client.upsert(collection_name=self.collection, points=points)

    # ---- read ----
    def hybrid_search(
        self,
        dense_q: list[float],
        sparse_q: SparseVec,
        limit: int = 10,
        prefetch_limit: int = 40,
        query_filter: models.Filter | None = None,
    ) -> list[models.ScoredPoint]:
        # Perform true hybrid search using Qdrant's Reciprocal Rank Fusion (RRF)
        # Prefetch dense and sparse candidates, then fuse their rankings to guarantee highly relevant baseline retrieval.
        resp = self.client.query_points(
            collection_name=self.collection,
            prefetch=[
                models.Prefetch(query=dense_q, using=DENSE_VEC, limit=prefetch_limit, filter=query_filter),
                models.Prefetch(
                    query=models.SparseVector(indices=sparse_q.indices, values=sparse_q.values),
                    using=SPARSE_VEC,
                    limit=prefetch_limit,
                    filter=query_filter,
                ),
            ],
            query=models.FusionQuery(fusion=models.Fusion.RRF),
            with_payload=True,
            limit=limit,
        )
        return resp.points