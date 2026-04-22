"""Shop CRUD endpoints. All scoped to ``current_user``."""
from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.shop import Shop
from app.models.user import User
from app.schemas.shop import ShopCreateRequest, ShopResponse, ShopUpdateRequest

router = APIRouter(prefix="/api/shops", tags=["shops"])


@router.get("", response_model=List[ShopResponse])
async def list_shops(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[Shop]:
    result = await db.execute(
        select(Shop)
        .where(Shop.owner_user_id == user.id, Shop.is_active == True)  # noqa: E712
        .order_by(Shop.created_at.asc())
    )
    return list(result.scalars().all())


@router.post("", response_model=ShopResponse, status_code=status.HTTP_201_CREATED)
async def create_shop(
    payload: ShopCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Shop:
    shop = Shop(
        owner_user_id=user.id,
        shop_name=payload.shop_name.strip(),
        shop_type=payload.shop_type,
        address=payload.address,
        ssm_registration_no=payload.ssm_registration_no,
        sst_registered=payload.sst_registered,
    )
    db.add(shop)
    await db.commit()
    await db.refresh(shop)
    if user.last_shop_id is None:
        user.last_shop_id = shop.id
        await db.commit()
    return shop


@router.patch("/{shop_id}", response_model=ShopResponse)
async def update_shop(
    shop_id: UUID,
    payload: ShopUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Shop:
    result = await db.execute(
        select(Shop).where(Shop.id == shop_id, Shop.owner_user_id == user.id)
    )
    shop = result.scalar_one_or_none()
    if shop is None:
        raise HTTPException(status_code=404, detail="ERR_SHOP_NOT_FOUND")
    for field in ("shop_name", "shop_type", "address", "ssm_registration_no", "sst_registered"):
        value = getattr(payload, field)
        if value is not None:
            setattr(shop, field, value)
    await db.commit()
    await db.refresh(shop)
    return shop


@router.post("/{shop_id}/select", response_model=ShopResponse)
async def select_shop(
    shop_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Shop:
    """Mark ``shop_id`` as the user's active shop. Persists to user profile."""
    result = await db.execute(
        select(Shop).where(Shop.id == shop_id, Shop.owner_user_id == user.id)
    )
    shop = result.scalar_one_or_none()
    if shop is None:
        raise HTTPException(status_code=404, detail="ERR_SHOP_NOT_FOUND")
    user.last_shop_id = shop.id
    await db.commit()
    return shop
