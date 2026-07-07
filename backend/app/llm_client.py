from __future__ import annotations
import json
import logging
import httpx

logger = logging.getLogger(__name__)

class LLMClient:
    def __init__(
        self,
        offline: bool,
        model_path: str | None,
        base_url: str | None,
        api_key: str | None,
        model: str | None,
        fallback_base_url: str | None = None,
        fallback_api_key: str | None = None,
        fallback_model: str | None = None,
    ) -> None:
        self.offline = offline
        self.model_path = model_path
        self.base_url = (base_url or "").rstrip("/")
        self.api_key = api_key
        self.model = model
        self.fallback_base_url = (fallback_base_url or "").rstrip("/")
        self.fallback_api_key = fallback_api_key
        self.fallback_model = fallback_model
        self.llm = None

        # Always try to initialize the offline LLM if the model path is provided.
        # This guarantees it is loaded in memory and ready for an instant fallback if the online API fails.
        if self.model_path:
            logger.info(f"Initializing offline LLM from {self.model_path}...")
            try:
                from llama_cpp import Llama
                # Set up the llama-cpp-python instance
                self.llm = Llama(
                    model_path=self.model_path,
                    n_ctx=2048,
                    n_threads=4,
                    verbose=False
                )
                logger.info("Offline LLM initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize offline LLM: {e}")
                self.llm = None

    def chat_completion(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.0,
        timeout: float = 8.0,
        mode: str = "online",
    ) -> str | None:
        # Phase 1: Try Online Groq API first
        if mode != "offline" and self.api_key and self.base_url:
            try:
                # Use a slightly aggressive timeout for the connection to fail fast if internet is down
                resp = httpx.post(
                    f"{self.base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={
                        "model": self.model,
                        "temperature": temperature,
                        "messages": messages,
                    },
                    timeout=httpx.Timeout(timeout, connect=3.0),
                )
                resp.raise_for_status()
                logger.debug("Successfully used ONLINE API for chat completion.")
                return resp.json()["choices"][0]["message"]["content"]
            except (httpx.ConnectError, httpx.TimeoutException) as e:
                logger.warning(f"Network error trying online API ({e}). Falling back to offline model...")
            except Exception as e:
                logger.warning(f"Online API failed ({e}). Falling back to offline model...")

        # Phase 2: Fallback to Local API (e.g. Ollama)
        if self.fallback_base_url:
            try:
                logger.info("Executing chat completion on FALLBACK local API.")
                resp = httpx.post(
                    f"{self.fallback_base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {self.fallback_api_key or 'dummy'}"},
                    json={
                        "model": self.fallback_model,
                        "temperature": temperature,
                        "messages": messages,
                    },
                    timeout=httpx.Timeout(max(120.0, timeout * 2), connect=30.0),
                )
                resp.raise_for_status()
                return resp.json()["choices"][0]["message"]["content"]
            except Exception as e:
                logger.error(f"Fallback local API failed: {e}")

        # Phase 3: Fallback to llama_cpp (if loaded)
        if self.llm:
            try:
                logger.info("Executing chat completion on OFFLINE local model.")
                response = self.llm.create_chat_completion(
                    messages=messages,
                    temperature=temperature,
                )
                return response["choices"][0]["message"]["content"]
            except Exception as e:
                logger.error(f"Offline chat completion failed: {e}")
                return None
                
        return None
