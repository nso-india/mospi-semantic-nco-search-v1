"""Application settings, loaded from environment / .env file."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- Qdrant ---
    # Leave QDRANT_URL empty to use the embedded (on-disk) Qdrant — no Docker needed.
    # Set QDRANT_URL=http://localhost:6333 to use a running Qdrant server/container.
    qdrant_url: str | None = None
    qdrant_api_key: str | None = None
    qdrant_path: str = "./qdrant_data"          # used only in embedded mode
    collection_name: str = "nco_2015"

    # --- Models (FastEmbed model ids) ---
    # multilingual-e5-large: 1024-d, ~100 languages incl. Indic, MIT-licensed.
    # FastEmbed auto-applies e5's required "query:"/"passage:" prefixes based on
    # whether .query_embed() or .embed() is called, so no manual prefixing needed.
    dense_model: str = "intfloat/multilingual-e5-large"
    sparse_model: str = "Qdrant/bm25"           # lexical / keyword channel

    # --- Search defaults ---
    default_top_k: int = 10
    prefetch_limit: int = 40                    # candidates pulled per channel before fusion
    confidence_ref: float = 0.7                 # RRF score treated as ~100% (absolute, not relative)

    # --- Phase 2: multilingual normalization (Tier 1, always available) ---
    use_lexicon: bool = True                    # Hinglish/Devanagari -> English mapping
    use_typo_correction: bool = True            # softwear enginer -> software engineer
    fuzzy_threshold: int = 86                   # lexicon fuzzy-match cutoff (0-100)
    typo_threshold: int = 84                    # typo fuzzy-match cutoff (0-100)

    # --- Phase 2: optional LLM normalizer (Tier 2) ---
    # Works with any OpenAI-compatible endpoint (OpenAI, Groq, Sarvam, Ollama, ...).
    # Leave LLM_NORMALIZE=false (or omit LLM_API_KEY) to use Tier 1 only.
    llm_normalize: bool = True
    llm_offline: bool = False
    llm_model_path: str = "./app/gemma-4-E4B-it-GGUF/gemma-4-E4B-it-Q4_K_M.gguf"
    llm_base_url: str = "https://api.groq.com/openai/v1"
    llm_api_key: str | None = None
    llm_model: str = "llama-3.3-70b-versatile"
    llm_fallback_base_url: str | None = "http://localhost:11434/v1"
    llm_fallback_api_key: str | None = "ollama"
    llm_fallback_model: str | None = "gemma2"
    llm_timeout: float = 8.0

    # --- LLM reranking (reuses the LLM_* settings above) ---
    rerank: bool = True            # reorder + score results with the LLM (needs LLM configured)
    rerank_pool: int = 15          # candidates fetched for reranking before trimming to top_k

    # --- Phase 4: speech-to-text (Whisper via OpenAI-compatible endpoint, e.g. Groq) ---
    stt_enabled: bool = True
    stt_base_url: str = "https://api.groq.com/openai/v1"
    stt_api_key: str | None = None     # falls back to LLM_API_KEY if left empty
    stt_model: str = "whisper-large-v3"
    stt_timeout: float = 30.0

    # --- Admin auth (Feature 6 security) ---
    # Generate a strong secret: python -c "import secrets; print(secrets.token_hex(32))"
    admin_username: str = "admin"
    admin_password_hash: str = ""        # bcrypt hash — set via ADMIN_PASSWORD_HASH in .env
    admin_totp_secret: str = ""          # base32 TOTP secret — set via ADMIN_TOTP_SECRET in .env
    jwt_secret: str = "change-me-use-secrets-token-hex-32"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60         # session expires after 60 min


settings = Settings()