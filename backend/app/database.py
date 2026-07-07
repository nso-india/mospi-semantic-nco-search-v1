"""Database layer: SQLAlchemy 2.x (sync) with SQLite.

Tables
------
search_log      Every query + normalisation + top result + confidence + timing.
assignment      When a user assigns an NCO code (manual override) -- Feature 2.
feedback        Thumbs-up/down on a result -- Feature 2.
occupation_edit Admin edits to occupation records -- Feature 6.

Design: sync SQLAlchemy with scoped_session (our FastAPI endpoints are sync
def, not async def, because embedding work is CPU-bound). SQLite file
lives at DB_PATH (default ./skillweave.db).
"""
from __future__ import annotations

import os
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, DateTime, Float, Integer, String, Text,
    create_engine, func,
)
from sqlalchemy.orm import (
    DeclarativeBase, Mapped, Session,
    mapped_column, scoped_session, sessionmaker,
)

DB_PATH = os.environ.get("DB_PATH", "./skillweave.db")
ENGINE = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
    echo=False,
)
_factory = sessionmaker(bind=ENGINE, autocommit=False, autoflush=False)
SessionLocal: scoped_session = scoped_session(_factory)


class Base(DeclarativeBase):
    pass


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# -- Models --

class SearchLog(Base):
    __tablename__ = "search_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    original_query: Mapped[str] = mapped_column(Text)
    normalized_query: Mapped[str | None] = mapped_column(Text, nullable=True)
    detected_language: Mapped[str | None] = mapped_column(String(64), nullable=True)
    norm_method: Mapped[str | None] = mapped_column(String(32), nullable=True)
    response_language: Mapped[str | None] = mapped_column(String(64), nullable=True)

    top_nco_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    top_title: Mapped[str | None] = mapped_column(Text, nullable=True)
    top_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    result_count: Mapped[int] = mapped_column(Integer, default=0)
    reranked: Mapped[bool] = mapped_column(Boolean, default=False)
    latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    via_voice: Mapped[bool] = mapped_column(Boolean, default=False)


class Assignment(Base):
    __tablename__ = "assignment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    search_log_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    original_query: Mapped[str] = mapped_column(Text)
    assigned_nco_code: Mapped[str] = mapped_column(String(32))
    assigned_title: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggested_nco_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    overridden: Mapped[bool] = mapped_column(Boolean, default=False)
    enumerator_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    search_log_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    nco_code: Mapped[str] = mapped_column(String(32))
    query: Mapped[str] = mapped_column(Text)
    positive: Mapped[bool] = mapped_column(Boolean)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)


class OccupationEdit(Base):
    __tablename__ = "occupation_edit"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    nco_code: Mapped[str] = mapped_column(String(32))
    field: Mapped[str] = mapped_column(String(64))
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reembedded: Mapped[bool] = mapped_column(Boolean, default=False)


# -- Lifecycle --

def init_db() -> None:
    """Create all tables if they don't exist. Safe to call multiple times."""
    Base.metadata.create_all(bind=ENGINE)


def get_db() -> Session:
    """FastAPI dependency: yields a scoped session, removes after request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        SessionLocal.remove()