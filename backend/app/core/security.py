"""Password/OTP hashing + JWT helpers."""
from __future__ import annotations

import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import UUID

import bcrypt
import jwt

from app.config import settings


# ---------- Password hashing ----------

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# ---------- OTP hashing ----------
# OTPs are short and low-entropy, so bcrypt is overkill and slow. We use an
# HMAC-SHA256 keyed with the JWT secret. Constant-time comparison.

def hash_otp(code: str) -> str:
    digest = hmac.new(
        settings.jwt_secret_key.encode("utf-8"), code.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    return digest


def verify_otp(code: str, hashed: str) -> bool:
    return hmac.compare_digest(hash_otp(code), hashed)


def generate_otp_code() -> str:
    """Generate a zero-padded 6-digit OTP using cryptographic randomness."""
    n = secrets.randbelow(10 ** settings.otp_length)
    return str(n).zfill(settings.otp_length)


# ---------- Phone number normalization ----------

_PHONE_CLEAN_RE = re.compile(r"[\s\-\(\)]+")
# Malaysian mobile prefix: 01X (X any digit 0-9). We accept 01[0-9] to be lenient.
_MY_MOBILE_RE = re.compile(r"^\+60(1[0-9])(\d{7,8})$")


class InvalidPhoneNumberError(ValueError):
    """Raised when a phone number cannot be normalized."""


def normalize_phone(raw: str) -> str:
    """Normalize a Malaysian phone number to E.164 (+60...).

    Accepts: 0123456789, +60123456789, 60123456789, 012-345 6789, (012) 3456789.
    Returns the canonical +60XXXXXXXXX form.
    Raises InvalidPhoneNumberError for invalid input.
    """
    if not raw or not isinstance(raw, str):
        raise InvalidPhoneNumberError("ERR_PHONE_INVALID")
    cleaned = _PHONE_CLEAN_RE.sub("", raw.strip())

    if cleaned.startswith("+60"):
        e164 = cleaned
    elif cleaned.startswith("60"):
        e164 = "+" + cleaned
    elif cleaned.startswith("0"):
        e164 = "+60" + cleaned[1:]
    else:
        raise InvalidPhoneNumberError("ERR_PHONE_INVALID")

    if not _MY_MOBILE_RE.match(e164):
        raise InvalidPhoneNumberError("ERR_PHONE_INVALID")
    return e164


# ---------- JWT ----------

def create_access_token(
    subject: str | UUID,
    expires_minutes: Optional[int] = None,
    extra: Optional[dict[str, Any]] = None,
) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.jwt_expiration_minutes
    )
    payload: dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])


def create_streamlit_token(user_id: str | UUID, report_id: str | UUID) -> str:
    """Short-lived (5 min) token used to embed Streamlit iframes."""
    return create_access_token(
        subject=user_id,
        expires_minutes=5,
        extra={"report_id": str(report_id), "scope": "streamlit"},
    )


def generate_nonce() -> str:
    return secrets.token_urlsafe(24)
