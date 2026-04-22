from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.shop import SHOP_TYPES


class ShopCreateRequest(BaseModel):
    shop_name: str = Field(min_length=1, max_length=255)
    shop_type: str
    address: str | None = Field(default=None, max_length=500)
    ssm_registration_no: str | None = Field(default=None, max_length=64)
    sst_registered: bool = False

    @field_validator("shop_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in SHOP_TYPES:
            raise ValueError("ERR_SHOP_TYPE_INVALID")
        return v


class ShopUpdateRequest(BaseModel):
    shop_name: str | None = Field(default=None, max_length=255)
    shop_type: str | None = None
    address: str | None = Field(default=None, max_length=500)
    ssm_registration_no: str | None = Field(default=None, max_length=64)
    sst_registered: bool | None = None

    @field_validator("shop_type")
    @classmethod
    def validate_type(cls, v: str | None) -> str | None:
        if v is not None and v not in SHOP_TYPES:
            raise ValueError("ERR_SHOP_TYPE_INVALID")
        return v


class ShopResponse(BaseModel):
    id: UUID
    shop_name: str
    shop_type: str
    address: str | None = None
    ssm_registration_no: str | None = None
    sst_registered: bool

    model_config = {"from_attributes": True}
