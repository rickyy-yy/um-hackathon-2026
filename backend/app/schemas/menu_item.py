from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class MenuItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category: str | None = Field(default=None, max_length=100)
    selling_price: Decimal = Field(ge=0)


class MenuItemUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    category: str | None = Field(default=None, max_length=100)
    selling_price: Decimal | None = Field(default=None, ge=0)
    is_active: bool | None = None


class MenuItemResponse(BaseModel):
    id: UUID
    name: str
    category: str | None = None
    selling_price: Decimal
    is_active: bool

    model_config = {"from_attributes": True}
