"""SMS provider abstraction.

Kira2Lah hackathon ships with a ConsoleSmsProvider that writes the OTP to the
backend logs, which is sufficient for local development and live demos. Real
providers (Twilio, Vonage, Malaysian telcos) can be wired in by adding another
implementation and selecting it via SMS_PROVIDER env var.
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod

from app.config import settings

logger = logging.getLogger("kira2lah.sms")


class SmsProvider(ABC):
    """Abstract SMS provider. Real providers should implement ``send``."""

    @abstractmethod
    async def send(self, phone_number: str, message: str) -> None: ...


class ConsoleSmsProvider(SmsProvider):
    """Writes the SMS body to stdout. Used for hackathon demos so the OTP is
    visible without integrating a paid SMS API."""

    async def send(self, phone_number: str, message: str) -> None:
        # Use a distinctive banner so reviewers can grep `docker compose logs`
        # and find the OTP quickly.
        logger.info("[SMS-STUB] → %s: %s", phone_number, message)


_provider: SmsProvider | None = None


def get_sms_provider() -> SmsProvider:
    global _provider
    if _provider is not None:
        return _provider
    kind = (settings.sms_provider or "console").lower()
    if kind == "console":
        _provider = ConsoleSmsProvider()
    else:  # pragma: no cover — guard for unimplemented providers
        logger.warning("SMS provider %s not implemented, falling back to console", kind)
        _provider = ConsoleSmsProvider()
    return _provider
