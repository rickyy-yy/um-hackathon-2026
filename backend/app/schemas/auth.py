"""Auth-related Pydantic models.

All user-facing error strings are emitted as error *codes* (e.g. ERR_PHONE_INVALID).
The frontend is responsible for translating them. This keeps the backend
language-agnostic and lets us add new locales without touching endpoints.
"""
from __future__ import annotations

import re
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

PASSWORD_PATTERN = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$")
LANGUAGES = {"en", "ms", "zh"}
THEMES = {"light", "dark", "system"}


class SignupRequest(BaseModel):
    phone_number: str = Field(min_length=3, max_length=32)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = None
    preferred_language: str = Field(default="en")

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not PASSWORD_PATTERN.match(v):
            raise ValueError("ERR_PASSWORD_WEAK")
        return v

    @field_validator("preferred_language")
    @classmethod
    def validate_language(cls, v: str) -> str:
        if v not in LANGUAGES:
            raise ValueError("ERR_LANGUAGE_INVALID")
        return v


class LoginPasswordRequest(BaseModel):
    phone_number: str = Field(min_length=3, max_length=32)
    password: str = Field(min_length=1, max_length=128)


class OtpRequest(BaseModel):
    phone_number: str = Field(min_length=3, max_length=32)
    purpose: Literal["login", "password_reset"] = "login"


class OtpVerifyRequest(BaseModel):
    phone_number: str = Field(min_length=3, max_length=32)
    code: str = Field(min_length=4, max_length=10)
    purpose: Literal["login", "password_reset"] = "login"


class PasswordResetRequest(BaseModel):
    phone_number: str = Field(min_length=3, max_length=32)
    code: str = Field(min_length=4, max_length=10)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not PASSWORD_PATTERN.match(v):
            raise ValueError("ERR_PASSWORD_WEAK")
        return v


class UpdateProfileRequest(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = None
    preferred_language: str | None = None
    theme_preference: str | None = None

    @field_validator("preferred_language")
    @classmethod
    def validate_language(cls, v: str | None) -> str | None:
        if v is not None and v not in LANGUAGES:
            raise ValueError("ERR_LANGUAGE_INVALID")
        return v

    @field_validator("theme_preference")
    @classmethod
    def validate_theme(cls, v: str | None) -> str | None:
        if v is not None and v not in THEMES:
            raise ValueError("ERR_THEME_INVALID")
        return v


class UserResponse(BaseModel):
    id: UUID
    phone_number: str
    full_name: str | None = None
    email: str | None = None
    preferred_language: str
    theme_preference: str
    last_shop_id: UUID | None = None
    has_password: bool = True

    model_config = {"from_attributes": True}

    @classmethod
    def from_user(cls, user) -> "UserResponse":
        return cls(
            id=user.id,
            phone_number=user.phone_number,
            full_name=user.full_name,
            email=user.email,
            preferred_language=user.preferred_language,
            theme_preference=user.theme_preference,
            last_shop_id=user.last_shop_id,
            has_password=bool(user.password_hash),
        )


class OtpRequestedResponse(BaseModel):
    """Returned when a new OTP is dispatched.

    We do not leak whether the phone number belongs to a registered user. The
    frontend always displays the same success message.
    """

    delivered: bool = True
    expires_in_seconds: int
    # For local dev only — in the hackathon demo we echo the code back so
    # the reviewer can sign in without real SMS infrastructure. Suppressed
    # automatically when SMS_PROVIDER != "console".
    dev_code: str | None = None
