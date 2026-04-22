"""OTP issuance + verification.

- Codes are hashed at rest via HMAC-SHA256 keyed on the JWT secret.
- Rate limiting: no more than OTP_MAX_REQUESTS_PER_WINDOW (default 3) new
  codes per phone_number per OTP_WINDOW_SECONDS (default 15 min).
- A code can be verified at most `MAX_ATTEMPTS` times before being invalidated.
- Previously-issued codes for the same (phone, purpose) pair are marked
  consumed when a new one is issued, so only the most recent code is valid.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Literal

from sqlalchemy import and_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import generate_otp_code, hash_otp, verify_otp
from app.models.otp import OtpChallenge
from app.services.sms_service import get_sms_provider

logger = logging.getLogger("kira2lah.otp")

MAX_ATTEMPTS = 5

Purpose = Literal["login", "password_reset"]


class OtpRateLimitError(Exception):
    """Too many OTPs requested for the same phone number recently."""


class OtpInvalidError(Exception):
    """Code is missing, expired, already consumed, or plain wrong."""


async def issue_otp(db: AsyncSession, phone_number: str, purpose: Purpose) -> tuple[str, int]:
    """Create a new OTP, persist (hashed), and dispatch via SMS provider.

    Returns ``(code, ttl_seconds)``. The code should only be exposed to the
    client in development builds (SMS_PROVIDER=console).
    """
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(seconds=settings.otp_window_seconds)

    recent = await db.execute(
        select(OtpChallenge).where(
            and_(
                OtpChallenge.phone_number == phone_number,
                OtpChallenge.purpose == purpose,
                OtpChallenge.created_at >= window_start,
            )
        )
    )
    recent_count = len(recent.scalars().all())
    if recent_count >= settings.otp_max_requests_per_window:
        raise OtpRateLimitError("ERR_OTP_RATE_LIMITED")

    # Invalidate older unconsumed challenges for this phone+purpose.
    await db.execute(
        update(OtpChallenge)
        .where(
            and_(
                OtpChallenge.phone_number == phone_number,
                OtpChallenge.purpose == purpose,
                OtpChallenge.consumed == False,  # noqa: E712
            )
        )
        .values(consumed=True)
    )

    code = generate_otp_code()
    challenge = OtpChallenge(
        phone_number=phone_number,
        code_hash=hash_otp(code),
        purpose=purpose,
        expires_at=now + timedelta(seconds=settings.otp_ttl_seconds),
    )
    db.add(challenge)
    await db.commit()

    provider = get_sms_provider()
    label = "Kira2Lah sign-in" if purpose == "login" else "Kira2Lah password reset"
    await provider.send(phone_number, f"{label} code: {code} (valid {settings.otp_ttl_seconds // 60} min)")

    return code, settings.otp_ttl_seconds


async def verify_and_consume(
    db: AsyncSession, phone_number: str, code: str, purpose: Purpose
) -> None:
    """Consume a valid OTP. Raises OtpInvalidError on any failure mode."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(OtpChallenge)
        .where(
            and_(
                OtpChallenge.phone_number == phone_number,
                OtpChallenge.purpose == purpose,
                OtpChallenge.consumed == False,  # noqa: E712
            )
        )
        .order_by(OtpChallenge.created_at.desc())
        .limit(1)
    )
    challenge = result.scalar_one_or_none()
    if challenge is None:
        raise OtpInvalidError("ERR_OTP_INVALID")

    challenge.attempts += 1
    if challenge.attempts > MAX_ATTEMPTS:
        challenge.consumed = True
        await db.commit()
        raise OtpInvalidError("ERR_OTP_INVALID")

    if challenge.expires_at.replace(tzinfo=timezone.utc) < now:
        challenge.consumed = True
        await db.commit()
        raise OtpInvalidError("ERR_OTP_EXPIRED")

    if not verify_otp(code, challenge.code_hash):
        await db.commit()  # persist attempt count
        raise OtpInvalidError("ERR_OTP_INVALID")

    challenge.consumed = True
    await db.commit()
