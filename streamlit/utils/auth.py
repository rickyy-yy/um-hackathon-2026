"""Validate iframe tokens issued by the FastAPI backend."""
from __future__ import annotations

import os

import jwt

SECRET = os.environ.get("JWT_SECRET_KEY", "change_me_jwt_secret")
ALGO = os.environ.get("JWT_ALGORITHM", "HS256")


def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGO])
    except jwt.PyJWTError as exc:
        raise ValueError(f"Invalid token: {exc}") from exc
    if payload.get("scope") != "streamlit":
        raise ValueError("Token scope mismatch")
    return payload
