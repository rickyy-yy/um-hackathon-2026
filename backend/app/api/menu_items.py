"""Menu item CRUD. Scoped to the caller's active shop."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.scope import Scope, require_authenticated_scope
from app.models import MenuItem
from app.schemas.menu_item import MenuItemCreate, MenuItemResponse, MenuItemUpdate

router = APIRouter(prefix="/api/menu-items", tags=["menu-items"])


@router.get("", response_model=list[MenuItemResponse])
async def list_items(
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(require_authenticated_scope),
) -> list[MenuItem]:
    result = await db.execute(
        select(MenuItem)
        .where(MenuItem.shop_id == scope.shop_id)
        .order_by(MenuItem.name)
    )
    return list(result.scalars().all())


@router.post("", response_model=MenuItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    payload: MenuItemCreate,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(require_authenticated_scope),
) -> MenuItem:
    item = MenuItem(shop_id=scope.shop_id, **payload.model_dump())
    db.add(item)
    try:
        await db.commit()
        await db.refresh(item)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="ERR_MENU_ITEM_EXISTS") from None
    return item


@router.put("/{item_id}", response_model=MenuItemResponse)
async def update_item(
    item_id: UUID,
    payload: MenuItemUpdate,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(require_authenticated_scope),
) -> MenuItem:
    item = await _get_scoped(db, scope, item_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(require_authenticated_scope),
) -> None:
    item = await _get_scoped(db, scope, item_id)
    item.is_active = False
    await db.commit()


async def _get_scoped(db: AsyncSession, scope: Scope, item_id: UUID) -> MenuItem:
    result = await db.execute(
        select(MenuItem).where(and_(MenuItem.id == item_id, MenuItem.shop_id == scope.shop_id))
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="ERR_MENU_ITEM_NOT_FOUND")
    return item
