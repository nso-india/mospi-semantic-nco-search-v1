"""Embeddings: multilingual dense + BM25 sparse via FastEmbed (ONNX, CPU-friendly).

The dense model is multilingual (e.g. intfloat/multilingual-e5-large, 1024-d,
~100 languages incl. all Indic). For e5 models, FastEmbed automatically applies
the required "passage:" prefix in .embed() and "query:" prefix in .query_embed(),
so callers must NOT add prefixes manually. BM25 produces the sparse lexical channel.

Pick any dense model present in your build: TextEmbedding.list_supported_models().
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from fastembed import SparseTextEmbedding, TextEmbedding


@dataclass
class SparseVec:
    """Lightweight, framework-agnostic sparse vector."""
    indices: list[int]
    values: list[float]


class Embedder:
    def __init__(self, dense_model: str, sparse_model: str) -> None:
        # Loading the models triggers a one-time download + cache.
        self.dense = TextEmbedding(model_name=dense_model)
        self.sparse = SparseTextEmbedding(model_name=sparse_model)
        self._dim: int | None = None

    # ---- dimensionality (auto-detected so swapping models "just works") ----
    @property
    def dense_dim(self) -> int:
        if self._dim is None:
            probe = next(iter(self.dense.embed(["dimension probe"])))
            self._dim = int(len(probe))
        return self._dim

    # ---- document side (batch) ----
    def embed_documents_dense(self, texts: list[str]) -> list[list[float]]:
        return [vec.tolist() for vec in self.dense.embed(texts)]

    def embed_documents_sparse(self, texts: list[str]) -> list[SparseVec]:
        return [self._to_sparse(s) for s in self.sparse.embed(texts)]

    # ---- query side (single) ----
    def embed_query_dense(self, text: str) -> list[float]:
        return next(iter(self.dense.query_embed(text))).tolist()

    def embed_query_sparse(self, text: str) -> SparseVec:
        return self._to_sparse(next(iter(self.sparse.query_embed(text))))

    @staticmethod
    def _to_sparse(s) -> SparseVec:
        return SparseVec(indices=s.indices.tolist(), values=s.values.tolist())