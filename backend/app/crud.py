"""CRUD helpers -- all database read/write operations.

Feature 1: search logging.
Feature 2: assignments (manual override), feedback, audit queries.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from .database import Assignment, Feedback, SearchLog


# -- Search log (Feature 1) -----------------------------------------------

def log_search(db: Session, **kwargs: Any) -> SearchLog:
    entry = SearchLog(**kwargs)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def recent_searches(db: Session, limit: int = 50) -> list[SearchLog]:
    return list(db.execute(
        select(SearchLog).order_by(desc(SearchLog.created_at)).limit(limit)
    ).scalars())


def search_count(db: Session) -> int:
    return db.execute(select(func.count()).select_from(SearchLog)).scalar() or 0


# -- Assignment / override (Feature 2) ------------------------------------

def create_assignment(db: Session, **kwargs: Any) -> Assignment:
    entry = Assignment(**kwargs)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def recent_assignments(db: Session, limit: int = 50) -> list[Assignment]:
    return list(db.execute(
        select(Assignment).order_by(desc(Assignment.created_at)).limit(limit)
    ).scalars())


def assignment_count(db: Session) -> int:
    return db.execute(select(func.count()).select_from(Assignment)).scalar() or 0


def override_count(db: Session) -> int:
    return db.execute(
        select(func.count()).select_from(Assignment).where(Assignment.overridden == True)
    ).scalar() or 0


# -- Feedback (Feature 2) -------------------------------------------------

def create_feedback(db: Session, **kwargs: Any) -> Feedback:
    entry = Feedback(**kwargs)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def feedback_counts(db: Session) -> dict:
    pos = db.execute(
        select(func.count()).select_from(Feedback).where(Feedback.positive == True)
    ).scalar() or 0
    neg = db.execute(
        select(func.count()).select_from(Feedback).where(Feedback.positive == False)
    ).scalar() or 0
    return {"positive": pos, "negative": neg, "total": pos + neg}


# -- Audit view (Feature 2) -----------------------------------------------

def audit_summary(db: Session) -> dict:
    """Combined audit summary for the /audit endpoint."""
    searches = recent_searches(db, limit=30)
    assignments = recent_assignments(db, limit=30)

    return {
        "total_searches": search_count(db),
        "total_assignments": assignment_count(db),
        "total_overrides": override_count(db),
        "feedback": feedback_counts(db),
        "recent_searches": [
            {
                "id": s.id,
                "query": s.original_query,
                "normalized": s.normalized_query,
                "language": s.detected_language,
                "top_code": s.top_nco_code,
                "top_title": s.top_title,
                "confidence": s.top_confidence,
                "latency_ms": s.latency_ms,
                "reranked": s.reranked,
                "voice": s.via_voice,
                "time": s.created_at.isoformat() if s.created_at else None,
            }
            for s in searches
        ],
        "recent_assignments": [
            {
                "id": a.id,
                "query": a.original_query,
                "assigned_code": a.assigned_nco_code,
                "assigned_title": a.assigned_title,
                "suggested_code": a.suggested_nco_code,
                "overridden": a.overridden,
                "enumerator": a.enumerator_id,
                "notes": a.notes,
                "time": a.created_at.isoformat() if a.created_at else None,
            }
            for a in assignments
        ],
    }


# -- Dashboard aggregates (Feature 5) ------------------------------------

from datetime import timedelta

def dashboard_stats(db: Session) -> dict:
    """All stats needed by the three dashboard panels."""
    from sqlalchemy import case

    # -- totals
    total_searches = search_count(db)
    total_assignments = assignment_count(db)
    total_overrides = override_count(db)
    fb = feedback_counts(db)

    # -- daily search counts (last 14 days)
    daily = []
    verification_trend = []
    performance_trend = []
    for i in range(13, -1, -1):
        day = datetime.now(timezone.utc) - timedelta(days=i)
        start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        count = db.execute(
            select(func.count()).select_from(SearchLog).where(
                SearchLog.created_at >= start,
                SearchLog.created_at < end,
            )
        ).scalar() or 0
        daily.append({"date": start.strftime("%d %b"), "count": count})
        
        matches = db.execute(
            select(func.count()).select_from(Assignment).where(
                Assignment.created_at >= start,
                Assignment.created_at < end,
                Assignment.overridden == False
            )
        ).scalar() or 0
        overrides = db.execute(
            select(func.count()).select_from(Assignment).where(
                Assignment.created_at >= start,
                Assignment.created_at < end,
                Assignment.overridden == True
            )
        ).scalar() or 0
        verification_trend.append({"date": start.strftime("%d %b"), "matches": matches, "overrides": overrides})

        stats = db.execute(
            select(
                func.avg(SearchLog.latency_ms),
                func.avg(SearchLog.top_confidence)
            ).where(
                SearchLog.created_at >= start,
                SearchLog.created_at < end,
            )
        ).first()
        
        avg_lat_day = round(float(stats[0]), 1) if stats and stats[0] else 0
        avg_conf_day = round(float(stats[1]), 1) if stats and stats[1] else 0
        
        performance_trend.append({
            "date": start.strftime("%d %b"),
            "avg_latency": avg_lat_day,
            "avg_confidence": avg_conf_day
        })

    # -- language breakdown
    langs = db.execute(
        select(SearchLog.detected_language, func.count().label("n"))
        .where(SearchLog.detected_language.isnot(None))
        .group_by(SearchLog.detected_language)
        .order_by(desc("n"))
        .limit(12)
    ).all()

    # -- top queries
    top_queries = db.execute(
        select(SearchLog.original_query, func.count().label("n"))
        .group_by(SearchLog.original_query)
        .order_by(desc("n"))
        .limit(10)
    ).all()

    # -- most overridden queries
    most_overridden = db.execute(
        select(Assignment.original_query, func.count().label("n"))
        .where(Assignment.overridden == True)
        .where(Assignment.original_query.isnot(None))
        .group_by(Assignment.original_query)
        .order_by(desc("n"))
        .limit(10)
    ).all()

    # -- avg confidence by language
    conf_by_lang = db.execute(
        select(
            SearchLog.detected_language,
            func.avg(SearchLog.top_confidence).label("avg_conf"),
            func.count().label("n"),
        )
        .where(SearchLog.detected_language.isnot(None))
        .where(SearchLog.top_confidence.isnot(None))
        .group_by(SearchLog.detected_language)
        .order_by(desc("n"))
        .limit(12)
    ).all()

    # -- normalization breakdown
    norm_methods = db.execute(
        select(SearchLog.norm_method, func.count().label("n"))
        .where(SearchLog.norm_method.isnot(None))
        .group_by(SearchLog.norm_method)
    ).all()

    # -- low confidence count
    low_conf_count = db.execute(
        select(func.count()).select_from(SearchLog)
        .where(SearchLog.top_confidence < 55.0)
    ).scalar() or 0

    # -- latency buckets (p50, p90 approximation via sorted slice)
    latencies = db.execute(
        select(SearchLog.latency_ms)
        .where(SearchLog.latency_ms.isnot(None))
        .order_by(SearchLog.latency_ms)
    ).scalars().all()
    avg_lat = round(sum(latencies) / len(latencies), 1) if latencies else None
    p50 = latencies[len(latencies) // 2] if latencies else None
    p90 = latencies[int(len(latencies) * 0.9)] if latencies else None

    fast_lat = sum(1 for x in latencies if x < 1000)
    med_lat = sum(1 for x in latencies if 1000 <= x <= 3000)
    slow_lat = sum(1 for x in latencies if x > 3000)

    # -- voice vs text
    voice_count = db.execute(
        select(func.count()).select_from(SearchLog).where(SearchLog.via_voice == True)
    ).scalar() or 0

    # -- reranked ratio
    reranked_count = db.execute(
        select(func.count()).select_from(SearchLog).where(SearchLog.reranked == True)
    ).scalar() or 0

    # -- avg confidence overall
    avg_conf = db.execute(
        select(func.avg(SearchLog.top_confidence)).select_from(SearchLog)
    ).scalar()

    # -- Gemma Model Metrics
    gemma_invocations = db.execute(
        select(func.count()).select_from(SearchLog).where(SearchLog.reranked == True)
    ).scalar() or 0
    
    vector_invocations = db.execute(
        select(func.count()).select_from(SearchLog).where(SearchLog.reranked == False)
    ).scalar() or 0

    gemma_matches = db.execute(
        select(func.count()).select_from(Assignment).join(SearchLog, Assignment.search_log_id == SearchLog.id)
        .where(Assignment.overridden == False, SearchLog.reranked == True)
    ).scalar() or 0
    
    gemma_overrides = db.execute(
        select(func.count()).select_from(Assignment).join(SearchLog, Assignment.search_log_id == SearchLog.id)
        .where(Assignment.overridden == True, SearchLog.reranked == True)
    ).scalar() or 0

    gemma_total = gemma_matches + gemma_overrides
    gemma_accuracy = round(gemma_matches / gemma_total * 100, 1) if gemma_total > 0 else 0

    vector_matches = db.execute(
        select(func.count()).select_from(Assignment).join(SearchLog, Assignment.search_log_id == SearchLog.id)
        .where(Assignment.overridden == False, SearchLog.reranked == False)
    ).scalar() or 0

    vector_overrides = db.execute(
        select(func.count()).select_from(Assignment).join(SearchLog, Assignment.search_log_id == SearchLog.id)
        .where(Assignment.overridden == True, SearchLog.reranked == False)
    ).scalar() or 0
    
    vector_total = vector_matches + vector_overrides
    vector_accuracy = round(vector_matches / vector_total * 100, 1) if vector_total > 0 else 0

    return {
        "totals": {
            "searches": total_searches,
            "assignments": total_assignments,
            "overrides": total_overrides,
            "override_rate": round(total_overrides / total_assignments * 100, 1) if total_assignments else 0,
            "voice_searches": voice_count,
            "feedback_positive": fb["positive"],
            "feedback_negative": fb["negative"],
        },
        "search_trend": daily,
        "verification_trend": verification_trend,
        "performance_trend": performance_trend,
        "language_breakdown": [
            {"language": r[0], "count": r[1]} for r in langs
        ],
        "confidence_by_language": [
            {
                "language": r[0],
                "avg_confidence": round(float(r[1]), 1) if r[1] else None,
                "count": r[2],
            }
            for r in conf_by_lang
        ],
        "normalization_methods": [
            {"method": r[0], "count": r[1]} for r in norm_methods
        ],
        "top_queries": [
            {"query": r[0], "count": r[1]} for r in top_queries
        ],
        "most_overridden_queries": [
            {"query": r[0], "count": r[1]} for r in most_overridden
        ],
        "performance": {
            "avg_latency_ms": avg_lat,
            "p50_latency_ms": round(p50, 1) if p50 else None,
            "p90_latency_ms": round(p90, 1) if p90 else None,
            "avg_confidence": round(float(avg_conf), 1) if avg_conf else None,
            "reranked_pct": round(reranked_count / total_searches * 100, 1) if total_searches else 0,
            "low_confidence_pct": round(low_conf_count / total_searches * 100, 1) if total_searches else 0,
            "total_queries_measured": len(latencies),
            "latency_distribution": {
                "fast": fast_lat,
                "medium": med_lat,
                "slow": slow_lat,
            }
        },
        "gemma_stats": {
            "gemma_invocations": gemma_invocations,
            "vector_invocations": vector_invocations,
            "gemma_accuracy": gemma_accuracy,
            "vector_accuracy": vector_accuracy,
            "gemma_total_assignments": gemma_total,
            "vector_total_assignments": vector_total
        }
    }


# -- Admin / occupation management (Feature 6) ----------------------------

from .database import OccupationEdit


def list_occupation_edits(db: Session, limit: int = 100) -> list[OccupationEdit]:
    return list(db.execute(
        select(OccupationEdit).order_by(desc(OccupationEdit.created_at)).limit(limit)
    ).scalars())


def log_occupation_edit(db: Session, **kwargs: Any) -> OccupationEdit:
    entry = OccupationEdit(**kwargs)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def mark_reembedded(db: Session, nco_code: str) -> None:
    """Mark all pending edits for a code as reembedded."""
    edits = db.execute(
        select(OccupationEdit).where(
            OccupationEdit.nco_code == nco_code,
            OccupationEdit.reembedded == False,
        )
    ).scalars().all()
    for e in edits:
        e.reembedded = True
    db.commit()