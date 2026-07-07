"""Request/response models for the search API."""
from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field


# ── Search ─────────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(10, ge=1, le=50)
    division_code: str | None = None
    normalize: bool = True
    response_language: str | None = None
    via_voice: bool = False
    llm_mode: str = Field("online", description="Can be 'online' or 'offline'")


class SearchResult(BaseModel):
    nco_code: str
    title: str
    description: str
    score: float
    confidence: float
    reason: str | None = None
    display_title: str | None = None
    summary: str | None = None
    division_code: str | None = None
    division_name: str | None = None
    group_name: str | None = None
    family_name: str | None = None
    hierarchy_path: str | None = None


class NormalizationInfo(BaseModel):
    original: str
    normalized: str
    detected_language: str
    detected_script: str
    method: str
    applied_steps: list[str] = []


class SearchResponse(BaseModel):
    query: str
    count: int
    results: list[SearchResult]
    normalization: NormalizationInfo
    reranked: bool = False
    search_log_id: int | None = None
    fallback_suggestions: list[str] | None = None
    low_confidence: bool = False


class BatchSearchRequest(BaseModel):
    queries: list[str] = Field(..., min_length=1, max_length=100)
    top_k: int = Field(1, ge=1, le=10)
    llm_mode: str = Field("online", description="Can be 'online' or 'offline'")


class BatchSearchItemResponse(BaseModel):
    query: str
    nco_code: str | None = None
    title: str | None = None
    confidence: float | None = None
    error: str | None = None


class BatchSearchResponse(BaseModel):
    results: list[BatchSearchItemResponse]


# ── Assignment / override ──────────────────────────────────────────────────

class AssignRequest(BaseModel):
    search_log_id: int | None = None
    original_query: str
    assigned_nco_code: str
    assigned_title: str | None = None
    suggested_nco_code: str | None = None
    enumerator_id: str | None = None
    notes: str | None = None


class AssignResponse(BaseModel):
    id: int
    assigned_nco_code: str
    overridden: bool
    created_at: datetime


# ── Feedback ───────────────────────────────────────────────────────────────

class FeedbackRequest(BaseModel):
    search_log_id: int | None = None
    nco_code: str
    query: str
    positive: bool
    comment: str | None = None


class FeedbackResponse(BaseModel):
    id: int
    positive: bool


# ── Dashboard ──────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    search_stats: dict
    assignment_stats: dict
    feedback_stats: dict
    recent_searches: list[dict]
    recent_assignments: list[dict]


# ── Admin ──────────────────────────────────────────────────────────────────

class OccupationPatch(BaseModel):
    title: str | None = None
    description: str | None = None
    admin_note: str | None = None
    reembed: bool = Field(True, description="Re-embed after edit")


# ── Auth (Feature 6 security) ──────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str

class TwoFARequest(BaseModel):
    totp_code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int

class SetupResponse(BaseModel):
    totp_secret: str
    qr_code_base64: str
    qr_uri: str
    password_hash: str
    instructions: str