"""Fallback suggestions: triggered when top confidence is below threshold.

Strategy (layered, fails soft at every step):
1. LLM query-refinement (if Groq is on) -- "what did you mean?"
2. Hierarchy hint from top result -- "try searching in <division>"
3. Rule-based agent suffixes -- "try: <query> worker / operator / specialist"

Never raises an exception -- always returns None or a list.
"""
from __future__ import annotations

import json
import re
from .llm_client import LLMClient

LOW_CONFIDENCE_THRESHOLD = 55.0

_REFINE_SYSTEM = (
    "You are a helpful assistant for India's NCO-2015 occupation classification. "
    "The user searched for an occupation but the AI returned low-confidence results. "
    "Suggest exactly 3 alternative English phrasings or related occupation names "
    "they could search to get better results. Keep each under 8 words. "
    'Return STRICT JSON only: {"suggestions":["...","...","..."]}'
)


def get_fallback_suggestions(
    query: str,
    top_confidence: float,
    top_results: list[dict],
    llm_client: LLMClient | None = None,
    llm_enabled: bool = False,
    llm_timeout: float = 8.0,
) -> list[str] | None:
    """Return 2-4 suggestions when confidence is low, else None."""
    if top_confidence >= LOW_CONFIDENCE_THRESHOLD:
        return None

    suggestions: list[str] = []

    # 1) LLM refinements
    if llm_enabled and llm_client:
        try:
            content = llm_client.chat_completion(
                messages=[
                    {"role": "system", "content": _REFINE_SYSTEM},
                    {"role": "user", "content": f'Query: "{query}"'},
                ],
                temperature=0.3,
                timeout=llm_timeout,
            )
            if content:
                m = re.search(r"\{.*\}", content, re.DOTALL)
                data = json.loads(m.group(0) if m else content)
                suggestions = [s.strip() for s in (data.get("suggestions") or []) if s.strip()][:3]
        except Exception:
            pass

    # 2) Hierarchy hint from top result
    if top_results:
        top = top_results[0]
        div = top.get("division_name") or top.get("group_name")
        if div:
            hint = f"occupations in {div}"
            if hint not in suggestions:
                suggestions.append(hint)

    # 3) Rule-based fallback
    if not suggestions:
        q = query.strip()
        suggestions = [
            f"{q} worker",
            f"{q} operator",
            f"{q} specialist",
        ]

    return suggestions[:4] if suggestions else None