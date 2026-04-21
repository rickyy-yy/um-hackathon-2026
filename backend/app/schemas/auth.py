from __future__ import annotations

import re
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

BUSINESS_TYPES = {
    "hawker_stall",
    "roadside_vendor",
    "cafe",
    "restaurant",
    "food_truck",
    "other",
}

PASSWORD_PATTERN = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$")


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    business_name: str = Field(min_length=1, max_length=255)
    business_type: str
    phone_number: str | None = Field(default=None, max_length=20)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not PASSWORD_PATTERN.match(v):
            raise ValueError(
                "Password must be at least 8 characters and contain an uppercase letter, "
                "a lowercase letter, and a number."
            )
        return v

    @field_validator("business_type")
    @classmethod
    def validate_business_type(cls, v: str) -> str:
        if v not in BUSINESS_TYPES:
            raise ValueError(f"business_type must be one of {sorted(BUSINESS_TYPES)}")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    business_name: str
    business_type: str
    phone_number: str | None = None
    has_reports: bool

    model_config = {"from_attributes": True}
