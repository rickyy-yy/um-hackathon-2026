"""Z.ai GLM client wrapper.

Every analytical feature in Kira2Lah routes through this service. We use
OpenAI's Python SDK with a custom ``base_url`` pointing at Z.ai's OpenAI-
compatible endpoint, as specified in the PRD.

If ``ZAI_API_KEY`` is unset or the GLM fails, we raise ``AIUnavailableError``
rather than silently falling back — by design the system must not function
without the AI engine.
"""
from __future__ import annotations

import base64
import json
import logging
import time
from typing import Any, Iterable

from openai import APIError, APITimeoutError, OpenAI

from app.config import settings

logger = logging.getLogger(__name__)


class AIUnavailableError(RuntimeError):
    """Raised when the GLM is unreachable or disabled."""


_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        if not settings.zai_api_key:
            raise AIUnavailableError(
                "ZAI_API_KEY is not configured. Kira2Lah requires Z.ai GLM to function."
            )
        _client = OpenAI(api_key=settings.zai_api_key, base_url=settings.zai_base_url)
    return _client


def _call_with_retry(
    messages: list[dict[str, Any]],
    *,
    temperature: float = 0.3,
    response_format: dict | None = None,
    max_retries: int = 3,
) -> str:
    """Call the GLM with 3 retries and exponential backoff."""
    client = get_client()
    last_error: Exception | None = None
    for attempt in range(max_retries):
        try:
            kwargs: dict[str, Any] = {
                "model": settings.zai_model_name,
                "messages": messages,
                "temperature": temperature,
            }
            if response_format is not None:
                kwargs["response_format"] = response_format
            response = client.chat.completions.create(**kwargs)
            return response.choices[0].message.content or ""
        except (APIError, APITimeoutError) as exc:
            last_error = exc
            wait = 2**attempt
            logger.warning(
                "Z.ai call failed (attempt %d/%d): %s — retrying in %ds",
                attempt + 1,
                max_retries,
                exc,
                wait,
            )
            time.sleep(wait)
    raise AIUnavailableError(
        f"Z.ai GLM failed after {max_retries} attempts: {last_error}"
    ) from last_error


def complete_text(
    system: str,
    user: str,
    *,
    temperature: float = 0.3,
) -> str:
    """Plain text completion."""
    return _call_with_retry(
        [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
    )


def complete_json(
    system: str,
    user: str,
    *,
    temperature: float = 0.2,
) -> dict[str, Any]:
    """Completion that asks the model for strict JSON output."""
    system_with_json = (
        system
        + "\n\nIMPORTANT: Respond with a single JSON object. No prose, no markdown fences."
    )
    raw = _call_with_retry(
        [
            {"role": "system", "content": system_with_json},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
        response_format={"type": "json_object"},
    )
    return _safe_json_loads(raw)


def complete_chat(messages: Iterable[dict[str, str]], *, temperature: float = 0.4) -> str:
    return _call_with_retry(list(messages), temperature=temperature)


def analyse_image(
    image_bytes: bytes,
    prompt: str,
    *,
    mime: str = "image/jpeg",
    temperature: float = 0.2,
) -> str:
    """Multi-modal call. Z.ai GLM supports the OpenAI vision message format."""
    b64 = base64.b64encode(image_bytes).decode("ascii")
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime};base64,{b64}"},
                },
            ],
        }
    ]
    return _call_with_retry(messages, temperature=temperature)


def _safe_json_loads(raw: str) -> dict[str, Any]:
    """Strip markdown fences if present, then parse JSON."""
    if not raw:
        return {}
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
        text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        logger.error("GLM returned non-JSON: %r", raw[:500])
        raise AIUnavailableError(f"GLM returned invalid JSON: {exc}") from exc
