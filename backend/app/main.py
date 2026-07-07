"""FastAPI app exposing /health and /search (hybrid dense+sparse with RRF fusion)."""
from __future__ import annotations

import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from qdrant_client import models
from sqlalchemy.orm import Session

from .config import settings
from .crud import (
    log_search, create_assignment, create_feedback,
    audit_summary, dashboard_stats,
    log_occupation_edit, mark_reembedded, list_occupation_edits,
)
from .database import get_db, init_db
from .embeddings import Embedder
from .fallback import get_fallback_suggestions, LOW_CONFIDENCE_THRESHOLD
from .evaluate import run_evaluation
from .normalize import LLMNormalizer, NormalizedQuery, QueryNormalizer
from .qdrant_store import VectorStore
from .llm_client import LLMClient
from .rerank import LLMReranker
from .translator import translator_service
from .auth import (
    hash_password, verify_password,
    generate_totp_secret, totp_qr_base64, get_totp_uri, verify_totp,
    make_preauth_token, make_session_token,
    require_admin, require_preauth,
)
from .schemas import (
    AssignRequest,
    AssignResponse,
    FeedbackRequest,
    FeedbackResponse,
    LoginRequest,
    NormalizationInfo,
    OccupationPatch,
    SearchRequest,
    SearchResponse,
    SearchResult,
    SetupResponse,
    TokenResponse,
    TwoFARequest,
    BatchSearchRequest,
    BatchSearchResponse,
    BatchSearchItemResponse,
)

state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create SQLite tables (safe to call repeatedly).
    init_db()
    # Load models + connect to Qdrant once, at startup.
    state["embedder"] = Embedder(settings.dense_model, settings.sparse_model)
    state["store"] = VectorStore(
        collection=settings.collection_name,
        url=settings.qdrant_url,
        api_key=settings.qdrant_api_key,
        path=settings.qdrant_path,
    )
    llm_client = LLMClient(
        offline=settings.llm_offline,
        model_path=settings.llm_model_path,
        base_url=settings.llm_base_url,
        api_key=settings.llm_api_key,
        model=settings.llm_model,
        fallback_base_url=settings.llm_fallback_base_url,
        fallback_api_key=settings.llm_fallback_api_key,
        fallback_model=settings.llm_fallback_model,
    )
    state["llm_client"] = llm_client
    state["normalizer"] = QueryNormalizer(
        use_lexicon=settings.use_lexicon,
        use_typo=settings.use_typo_correction,
        fuzzy_threshold=settings.fuzzy_threshold,
        typo_threshold=settings.typo_threshold,
        llm=LLMNormalizer(
            client=llm_client,
            enabled=settings.llm_normalize,
            timeout=settings.llm_timeout,
        ),
    )
    state["reranker"] = LLMReranker(
        client=llm_client,
        enabled=settings.rerank and settings.llm_normalize,
        timeout=settings.llm_timeout,
    )
    yield
    state.clear()


app = FastAPI(title="NCO 2015 Semantic Search API", version="0.1.0", lifespan=lifespan)

# Open CORS for local frontend development (locked down in Phase 5).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health(db: Session = Depends(get_db)) -> dict:
    from .database import DB_PATH, SearchLog
    from sqlalchemy import func, select
    store: VectorStore = state["store"]
    total_searches = db.execute(select(func.count()).select_from(SearchLog)).scalar() or 0
    return {
        "status": "ok",
        "collection": settings.collection_name,
        "points": store.count(),
        "dense_model": settings.dense_model,
        "sparse_model": settings.sparse_model,
        "database": DB_PATH,
        "total_searches_logged": total_searches,
    }


@app.post("/normalize")
def normalize(req: SearchRequest) -> NormalizationInfo:
    """Debug endpoint: see exactly how a query is normalized (no search)."""
    nq: NormalizedQuery = state["normalizer"].normalize(req.query)
    return NormalizationInfo(
        original=nq.original,
        normalized=nq.search_text,
        detected_language=nq.language,
        detected_script=nq.script,
        method=nq.method,
        applied_steps=nq.steps,
    )


@app.post("/preload")
def preload_offline() -> dict:
    """Wake up the offline LLM model by sending a dummy prompt with a long timeout."""
    client: LLMClient = state.get("llm_client")
    if client and client.fallback_base_url:
        # Fire a quick dummy request. The timeout in llm_client will handle up to 120s.
        client.chat_completion(
            messages=[{"role": "user", "content": "wake up"}],
            mode="offline",
            timeout=120.0
        )
    return {"status": "preloaded"}


@app.post("/transcribe")
def transcribe(file: UploadFile = File(...), language: str | None = Form(None)) -> dict:
    """Speech-to-text via an OpenAI-compatible Whisper endpoint (default: Groq)."""
    key = settings.stt_api_key or settings.llm_api_key
    if not (settings.stt_enabled and key):
        raise HTTPException(
            status_code=503,
            detail="Voice is not configured. Set STT_API_KEY (or LLM_API_KEY) to a Groq key.",
        )

    import httpx

    audio = file.file.read()
    data = {"model": settings.stt_model, "response_format": "json"}
    if language:
        data["language"] = language
    files = {"file": (file.filename or "audio.webm", audio, file.content_type or "audio/webm")}

    try:
        resp = httpx.post(
            f"{settings.stt_base_url.rstrip('/')}/audio/transcriptions",
            headers={"Authorization": f"Bearer {key}"},
            data=data,
            files=files,
            timeout=settings.stt_timeout,
        )
        resp.raise_for_status()
        return {"text": (resp.json().get("text") or "").strip()}
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"STT provider error {e.response.status_code}: {e.response.text[:200]}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"STT request failed: {e}")


@app.post("/search", response_model=SearchResponse)
def search(req: SearchRequest, db: Session = Depends(get_db)) -> SearchResponse:
    t0 = time.perf_counter()
    embedder: Embedder = state["embedder"]
    store: VectorStore = state["store"]
    normalizer: QueryNormalizer = state["normalizer"]
    reranker: LLMReranker = state["reranker"]

    # Phase 2: normalize (transliterate / translate / typo-fix) before embedding.
    if req.normalize:
        nq = normalizer.normalize(req.query, mode=req.llm_mode)
    else:
        nq = NormalizedQuery(req.query, req.query, "n/a", "n/a", "disabled", [])

    search_text = nq.search_text or req.query
    dense_q = embedder.embed_query_dense(search_text)
    sparse_q = embedder.embed_query_sparse(search_text)

    # Decide what language to present results in: explicit request wins, else match
    # the detected query language (Hinglish/English both map to English).
    def resolve_language(req_lang: str | None, detected: str | None) -> str:
        if req_lang and req_lang.strip().lower() not in ("", "auto"):
            return req_lang.strip()
        d = (detected or "").strip()
        if not d or "english" in d.lower() or "hinglish" in d.lower() or d == "en" or d == "eng_Latn":
            return "en"
        return d

    target_language = resolve_language(req.response_language, nq.language)

    query_filter = None
    if req.division_code:
        query_filter = models.Filter(
            must=[models.FieldCondition(
                key="division_code",
                match=models.MatchValue(value=req.division_code),
            )]
        )

    # Fetch a larger candidate pool when reranking, so a strong match the bi-encoder
    # under-ranked still gets a chance to rise to the top.
    fetch_limit = max(req.top_k, settings.rerank_pool) if reranker.enabled else req.top_k
    
    # Speed optimization: Local LLMs are slow with huge contexts. 
    # Limit to top_k when offline to cut inference time by half.
    if req.llm_mode == "offline":
        fetch_limit = req.top_k
        
    points = store.hybrid_search(
        dense_q=dense_q,
        sparse_q=sparse_q,
        limit=fetch_limit,
        prefetch_limit=settings.prefetch_limit,
        query_filter=query_filter,
    )

    def build(p, confidence, reason, display_title=None, summary=None):
        pl = p.payload or {}
        return SearchResult(
            nco_code=pl.get("nco_code_2015", ""),
            title=pl.get("title", ""),
            description=pl.get("description", ""),
            score=float(p.score),
            confidence=confidence,
            reason=reason,
            display_title=display_title,
            summary=summary,
            division_code=pl.get("division_code") or None,
            division_name=pl.get("division_name") or None,
            group_name=pl.get("group_name") or None,
            family_name=pl.get("family_name") or None,
            hierarchy_path=pl.get("hierarchy_path") or None,
        )

    reranked = False
    items = reranker.rerank(
        req.query,
        search_text,
        [
            {
                "code": (p.payload or {}).get("nco_code_2015", ""),
                "title": (p.payload or {}).get("title", ""),
                "desc": (p.payload or {}).get("description", ""),
            }
            for p in points
        ],
        target_language=target_language,
        mode=req.llm_mode,
    ) if reranker.enabled else None

    if items:
        reranked = True
        by_code = {(p.payload or {}).get("nco_code_2015", ""): p for p in points}
        seen: set[str] = set()
        results = []
        for it in items:
            p = by_code.get(it.code)
            if p is None or it.code in seen:
                continue
            seen.add(it.code)
            results.append(build(
                p, round(it.score, 1), it.reason or None,
                display_title=it.title or None, summary=it.summary or None,
            ))
        # Append any candidates the LLM omitted, lowest priority.
        for code, p in by_code.items():
            if code not in seen:
                results.append(build(p, 0.0, None))
        
        # Ensure results are strictly sorted by the LLM's confidence score descending
        # This fixes the bug where LLMs might return a high score but put it at the end of the JSON array.
        results.sort(key=lambda x: x.confidence, reverse=True)
        results = results[: req.top_k]
    else:
        # Fallback: absolute confidence from the raw fusion score (design Sec. 4).
        ref = settings.confidence_ref or 0.7
        results = [
            build(p, round(min(100.0, max(0.0, float(p.score) / ref * 100.0)), 1), None)
            for p in points[: req.top_k]
        ]

    # Translate results back if necessary
    if target_language != "en" and target_language != "eng_Latn":
        for r in results:
            if r.title:
                r.title = translator_service.en_to_indic(r.title, target_language)
            if r.description:
                r.description = translator_service.en_to_indic(r.description, target_language)
            if r.display_title:
                r.display_title = translator_service.en_to_indic(r.display_title, target_language)
            if r.summary:
                r.summary = translator_service.en_to_indic(r.summary, target_language)

    # ── Feature 3: Fallback suggestions (low confidence) ─────────────────
    top_conf = results[0].confidence if results else 0.0
    low_confidence = top_conf < LOW_CONFIDENCE_THRESHOLD
    fallback_suggestions = get_fallback_suggestions(
        query=req.query,
        top_confidence=top_conf,
        top_results=[
            {
                "division_name": r.division_name,
                "group_name": r.group_name,
            }
            for r in results[:3]
        ],
        llm_client=state["llm_client"],
        llm_enabled=settings.llm_normalize,
        llm_timeout=settings.llm_timeout,
    )

    # ── Persist to audit log ──────────────────────────────────────────────
    latency_ms = round((time.perf_counter() - t0) * 1000, 1)
    top = results[0] if results else None
    try:
        entry = log_search(
            db,
            original_query=req.query,
            normalized_query=search_text,
            detected_language=nq.language,
            norm_method=nq.method,
            response_language=target_language,
            top_nco_code=top.nco_code if top else None,
            top_title=top.display_title or top.title if top else None,
            top_confidence=top.confidence if top else None,
            result_count=len(results),
            reranked=reranked,
            latency_ms=latency_ms,
            via_voice=req.via_voice,
        )
        log_id = entry.id
    except Exception:
        log_id = None

    return SearchResponse(
        query=req.query,
        count=len(results),
        results=results,
        reranked=reranked,
        search_log_id=log_id,
        low_confidence=low_confidence,
        fallback_suggestions=fallback_suggestions,
        normalization=NormalizationInfo(
            original=nq.original,
            normalized=search_text,
            detected_language=nq.language,
            detected_script=nq.script,
            method=nq.method,
            applied_steps=nq.steps,
        ),
    )


@app.post("/search/batch", response_model=BatchSearchResponse)
def search_batch(req: BatchSearchRequest) -> BatchSearchResponse:
    embedder: Embedder = state["embedder"]
    store: VectorStore = state["store"]
    normalizer: QueryNormalizer = state["normalizer"]

    import concurrent.futures

    # 1. Normalize all concurrently (to parallelize slow LLM normalizer calls)
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        normalized_texts = list(executor.map(lambda q: normalizer.normalize(q, mode=req.llm_mode).search_text or q, req.queries))

    # 2. Batch embed
    dense_vecs = embedder.embed_documents_dense(normalized_texts)
    sparse_vecs = embedder.embed_documents_sparse(normalized_texts)

    results = []
    # 3. Hybrid search sequentially
    for q, dq, sq in zip(req.queries, dense_vecs, sparse_vecs):
        try:
            points = store.hybrid_search(
                dense_q=dq,
                sparse_q=sq,
                limit=req.top_k,
                prefetch_limit=settings.prefetch_limit
            )
            if points:
                p = points[0]
                confidence = min(100.0, max(0.0, float(p.score) / (settings.confidence_ref or 0.7) * 100.0))
                pl = p.payload or {}
                results.append(BatchSearchItemResponse(
                    query=q,
                    nco_code=pl.get("nco_code_2015", ""),
                    title=pl.get("display_title") or pl.get("title", ""),
                    confidence=round(confidence, 1)
                ))
            else:
                results.append(BatchSearchItemResponse(
                    query=q,
                    error="No match found"
                ))
        except Exception as e:
            results.append(BatchSearchItemResponse(query=q, error=str(e)))

    return BatchSearchResponse(results=results)


# ── Feature 2: Assignment / Manual Override ────────────────────────────────

@app.post("/assign", response_model=AssignResponse)
def assign_code(req: AssignRequest, db: Session = Depends(get_db)) -> AssignResponse:
    """Assign an NCO code to a query. If the assigned code differs from the
    AI's top suggestion, it's flagged as a manual override."""
    overridden = bool(
        req.suggested_nco_code
        and req.assigned_nco_code.strip() != req.suggested_nco_code.strip()
    )
    entry = create_assignment(
        db,
        search_log_id=req.search_log_id,
        original_query=req.original_query,
        assigned_nco_code=req.assigned_nco_code,
        assigned_title=req.assigned_title,
        suggested_nco_code=req.suggested_nco_code,
        overridden=overridden,
        enumerator_id=req.enumerator_id,
        notes=req.notes,
    )
    return AssignResponse(
        id=entry.id,
        assigned_nco_code=entry.assigned_nco_code,
        overridden=overridden,
        created_at=entry.created_at,
    )


# ── Feature 2: Feedback ───────────────────────────────────────────────────

@app.post("/feedback", response_model=FeedbackResponse)
def submit_feedback(req: FeedbackRequest, db: Session = Depends(get_db)) -> FeedbackResponse:
    """Submit thumbs-up or thumbs-down on a search result."""
    entry = create_feedback(
        db,
        search_log_id=req.search_log_id,
        nco_code=req.nco_code,
        query=req.query,
        positive=req.positive,
        comment=req.comment,
    )
    return FeedbackResponse(id=entry.id, positive=entry.positive)


# ── Feature 2: Audit Trail ────────────────────────────────────────────────

@app.get("/audit")
def get_audit(db: Session = Depends(get_db)) -> dict:
    """Combined audit view: search log, assignments, overrides, feedback."""
    return audit_summary(db)


# ── Feature 5: Dashboard ──────────────────────────────────────────────────

@app.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)) -> dict:
    """All stats for the three dashboard panels: usage, audit, performance."""
    return dashboard_stats(db)


# ── Feature 4: Evaluation ─────────────────────────────────────────────────

@app.get("/evaluate")
def evaluate(max_queries: int = 107) -> dict:
    """Run the evaluation harness on the gold test set.
    Returns Recall@K, MRR, nDCG@5, per-language and per-category breakdowns.
    Use max_queries=20 for a quick test (~30s). Full run takes 2-5 min.
    """
    embedder: Embedder = state["embedder"]
    store: VectorStore = state["store"]
    normalizer = state["normalizer"]
    reranker = state["reranker"]
    result = run_evaluation(
        embedder=embedder,
        store=store,
        normalizer=normalizer,
        reranker=reranker,
        settings=settings,
        max_queries=min(max_queries, 107),
    )
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


# ── Feature 6: Auth endpoints ─────────────────────────────────────────────

@app.post("/admin/auth/setup", response_model=SetupResponse)
def admin_setup(plain_password: str) -> SetupResponse:
    """ONE-TIME setup: generates TOTP secret + bcrypt hash.
    Run once, copy the values into .env, then this endpoint is informational only.
    ?plain_password=YourStrongPassword
    """
    secret = generate_totp_secret()
    pw_hash = hash_password(plain_password)
    return SetupResponse(
        totp_secret=secret,
        qr_code_base64=totp_qr_base64(secret, settings.admin_username),
        qr_uri=get_totp_uri(secret, settings.admin_username),
        password_hash=pw_hash,
        instructions=(
            "1. Scan the QR code with Google Authenticator or Authy.\n"
            "2. Add these to your backend .env:\n"
            f"   ADMIN_PASSWORD_HASH={pw_hash}\n"
            f"   ADMIN_TOTP_SECRET={secret}\n"
            "3. Set a strong JWT_SECRET in .env.\n"
            "4. Restart the backend. Setup is complete."
        ),
    )


@app.post("/admin/auth/login", response_model=TokenResponse)
def admin_login(req: LoginRequest) -> TokenResponse:
    """Step 1: verify username + password. Returns a short pre-auth token."""
    if req.username != settings.admin_username:
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    if not settings.admin_password_hash:
        raise HTTPException(
            status_code=503,
            detail="Admin password not configured. Run /admin/auth/setup first.",
        )
    if not verify_password(req.password, settings.admin_password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    token = make_preauth_token()
    return TokenResponse(access_token=token, expires_in_minutes=5)


@app.post("/admin/auth/verify-2fa", response_model=TokenResponse)
def admin_verify_2fa(
    req: TwoFARequest,
    _pre: dict = Depends(require_preauth),
) -> TokenResponse:
    """Step 2: verify TOTP code. Returns a full session JWT (60 min)."""
    if not settings.admin_totp_secret:
        raise HTTPException(
            status_code=503,
            detail="2FA not configured. Run /admin/auth/setup first.",
        )
    if not verify_totp(req.totp_code):
        raise HTTPException(status_code=401, detail="Invalid or expired 2FA code.")
    token = make_session_token()
    return TokenResponse(
        access_token=token,
        expires_in_minutes=settings.jwt_expire_minutes,
    )


@app.get("/admin/auth/me")
def admin_me(current: dict = Depends(require_admin)) -> dict:
    """Returns the current admin session info."""
    return {
        "username": current.get("sub"),
        "expires": current.get("exp"),
    }


# ── Feature 6: Admin Panel ────────────────────────────────────────────────

@app.get("/admin/occupations/{nco_code}")
def admin_get_occupation(nco_code: str, _: dict = Depends(require_admin)) -> dict:
    """Fetch a single occupation's current payload from Qdrant."""
    store: VectorStore = state["store"]
    from qdrant_client.models import FieldCondition, Filter, MatchValue
    results = store.client.scroll(
        collection_name=settings.collection_name,
        scroll_filter=Filter(
            must=[FieldCondition(key="nco_code_2015", match=MatchValue(value=nco_code))]
        ),
        limit=1,
        with_payload=True,
    )
    points = results[0]
    if not points:
        raise HTTPException(status_code=404, detail=f"NCO code {nco_code} not found.")
    return points[0].payload or {}


@app.get("/admin/occupations")
def admin_list_occupations(
    query: str = "",
    limit: int = 50,
    offset: int = 0,
    _: dict = Depends(require_admin),
) -> dict:
    """List occupations from Qdrant. Optional text filter on title/code."""
    store: VectorStore = state["store"]
    from qdrant_client.models import FieldCondition, Filter, MatchText

    scroll_filter = None
    if query.strip():
        scroll_filter = Filter(
            should=[
                FieldCondition(key="title", match=MatchText(text=query)),
                FieldCondition(key="nco_code_2015", match=MatchText(text=query)),
            ]
        )
    results, next_offset = store.client.scroll(
        collection_name=settings.collection_name,
        scroll_filter=scroll_filter,
        limit=limit,
        offset=offset,
        with_payload=True,
    )
    return {
        "occupations": [p.payload for p in results],
        "count": len(results),
        "next_offset": next_offset,
        "total": store.count(),
    }


@app.patch("/admin/occupations/{nco_code}")
def admin_update_occupation(
    nco_code: str,
    patch: OccupationPatch,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    """Update title and/or description of an occupation and re-embed if requested."""
    store: VectorStore = state["store"]
    embedder: Embedder = state["embedder"]

    # 1) Fetch current payload
    from qdrant_client.models import FieldCondition, Filter, MatchValue, PayloadSelectorExclude, SetPayload
    results = store.client.scroll(
        collection_name=settings.collection_name,
        scroll_filter=Filter(
            must=[FieldCondition(key="nco_code_2015", match=MatchValue(value=nco_code))]
        ),
        limit=1,
        with_payload=True,
    )
    points = results[0]
    if not points:
        raise HTTPException(status_code=404, detail=f"NCO code {nco_code} not found.")

    point = points[0]
    current = dict(point.payload or {})
    point_id = point.id

    # 2) Apply patch + log each changed field
    updated: dict = dict(current)
    changed_fields: list[str] = []

    if patch.title is not None and patch.title != current.get("title"):
        log_occupation_edit(db, nco_code=nco_code, field="title",
                            old_value=current.get("title"), new_value=patch.title,
                            admin_note=patch.admin_note)
        updated["title"] = patch.title
        changed_fields.append("title")

    if patch.description is not None and patch.description != current.get("description"):
        log_occupation_edit(db, nco_code=nco_code, field="description",
                            old_value=current.get("description")[:120] if current.get("description") else None,
                            new_value=patch.description[:120],
                            admin_note=patch.admin_note)
        updated["description"] = patch.description
        changed_fields.append("description")

    if not changed_fields:
        return {"status": "no_change", "nco_code": nco_code}

    # 3) Update payload in Qdrant
    store.client.set_payload(
        collection_name=settings.collection_name,
        payload=updated,
        points=[point_id],
    )

    # 4) Re-embed if requested (default True)
    reembedded = False
    if patch.reembed and changed_fields:
        from .nco import build_document_text
        doc_text = build_document_text(updated)
        dense_vec = embedder.embed_documents_dense([doc_text])[0]
        sparse_vec = embedder.embed_documents_sparse([doc_text])[0]
        from qdrant_client.models import SparseVector
        store.client.update_vectors(
            collection_name=settings.collection_name,
            points=[
                models.PointVectors(
                    id=point_id,
                    vector={
                        "dense": dense_vec,
                        "sparse": SparseVector(
                            indices=sparse_vec.indices,
                            values=sparse_vec.values,
                        ),
                    },
                )
            ],
        )
        mark_reembedded(db, nco_code)
        reembedded = True

    return {
        "status": "updated",
        "nco_code": nco_code,
        "changed_fields": changed_fields,
        "reembedded": reembedded,
    }


@app.post("/admin/occupations")
def admin_add_occupation(
    occupation: dict,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    """Add a new occupation to the index."""
    store: VectorStore = state["store"]
    embedder: Embedder = state["embedder"]

    nco_code = (occupation.get("nco_code_2015") or "").strip()
    if not nco_code:
        raise HTTPException(status_code=422, detail="nco_code_2015 is required.")

    # Check for duplicate
    from qdrant_client.models import FieldCondition, Filter, MatchValue
    existing = store.client.scroll(
        collection_name=settings.collection_name,
        scroll_filter=Filter(
            must=[FieldCondition(key="nco_code_2015", match=MatchValue(value=nco_code))]
        ),
        limit=1,
    )
    if existing[0]:
        raise HTTPException(status_code=409, detail=f"NCO code {nco_code} already exists. Use PATCH to update.")

    from .nco import build_document_text, build_payload, stable_id
    payload = build_payload(occupation)
    doc_text = build_document_text(occupation)
    dense_vec = embedder.embed_documents_dense([doc_text])[0]
    sparse_vec = embedder.embed_documents_sparse([doc_text])[0]

    from qdrant_client.models import PointStruct, SparseVector
    store.client.upsert(
        collection_name=settings.collection_name,
        points=[
            PointStruct(
                id=stable_id(nco_code),
                vector={
                    "dense": dense_vec,
                    "sparse": SparseVector(
                        indices=sparse_vec.indices,
                        values=sparse_vec.values,
                    ),
                },
                payload=payload,
            )
        ],
    )
    log_occupation_edit(db, nco_code=nco_code, field="CREATE",
                        old_value=None, new_value=occupation.get("title"),
                        admin_note="New occupation added via admin panel")
    return {"status": "created", "nco_code": nco_code, "total": store.count()}


@app.delete("/admin/occupations/{nco_code}")
def admin_delete_occupation(
    nco_code: str,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    """Delete an occupation from the search index."""
    store: VectorStore = state["store"]
    from .nco import stable_id
    point_id = stable_id(nco_code)
    store.client.delete(
        collection_name=settings.collection_name,
        points_selector=models.PointIdsList(points=[point_id]),
    )
    log_occupation_edit(db, nco_code=nco_code, field="DELETE",
                        old_value=nco_code, new_value=None,
                        admin_note="Deleted via admin panel")
    return {"status": "deleted", "nco_code": nco_code, "total": store.count()}


@app.get("/admin/edits")
def admin_edit_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    """Full edit history from the audit log."""
    edits = list_occupation_edits(db, limit=limit)
    return {
        "edits": [
            {
                "id": e.id,
                "nco_code": e.nco_code,
                "field": e.field,
                "old_value": e.old_value,
                "new_value": e.new_value,
                "admin_note": e.admin_note,
                "reembedded": e.reembedded,
                "time": e.created_at.isoformat() if e.created_at else None,
            }
            for e in edits
        ],
        "total": len(edits),
    }

import os
import time

@app.post("/api/feedback/submit")
async def submit_feedback_with_image(
    text: str = Form(...),
    image: UploadFile = File(None)
):
    """Receive text feedback and an optional image, saving them to the feedback directory."""
    feedback_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "feedback")
    os.makedirs(feedback_dir, exist_ok=True)
    
    timestamp = int(time.time())
    
    # Save text
    text_path = os.path.join(feedback_dir, f"feedback_{timestamp}.txt")
    with open(text_path, "w", encoding="utf-8") as f:
        f.write(text)
        
    # Save image if exists
    image_path = None
    if image and image.filename:
        # Secure filename just by using timestamp
        ext = os.path.splitext(image.filename)[1]
        image_path = os.path.join(feedback_dir, f"feedback_{timestamp}{ext}")
        content = await image.read()
        with open(image_path, "wb") as f:
            f.write(content)
            
    return {"status": "success", "text_path": text_path, "image_path": image_path}