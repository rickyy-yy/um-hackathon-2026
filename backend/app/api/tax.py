"""Tax estimation endpoint."""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import CostEntry, MenuItem, SalesRecord, User
from app.schemas.tax import TaxEstimate
from app.services import tax_calculator

router = APIRouter(prefix="/api/tax", tags=["tax"])


@router.get("/estimate/{year}", response_model=TaxEstimate)
async def estimate(
    year: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TaxEstimate:
    start, end = date(year, 1, 1), date(year, 12, 31)

    # Total revenue
    rev_stmt = select(
        func.coalesce(
            func.sum(SalesRecord.quantity_sold * SalesRecord.unit_selling_price), 0
        )
    ).where(
        and_(
            SalesRecord.user_id == user.id,
            SalesRecord.sale_date >= start,
            SalesRecord.sale_date <= end,
        )
    )
    total_revenue = float((await db.execute(rev_stmt)).scalar_one() or 0)

    # Total cost — join each sale with the latest applicable cost_entry
    sales_result = await db.execute(
        select(SalesRecord).where(
            and_(
                SalesRecord.user_id == user.id,
                SalesRecord.sale_date >= start,
                SalesRecord.sale_date <= end,
            )
        )
    )
    sales = list(sales_result.scalars().all())

    cost_stmt = select(CostEntry).join(MenuItem, CostEntry.menu_item_id == MenuItem.id).where(
        MenuItem.user_id == user.id
    )
    cost_entries = list((await db.execute(cost_stmt)).scalars().all())
    costs_by_item: dict = {}
    for c in cost_entries:
        costs_by_item.setdefault(c.menu_item_id, []).append(c)
    for bucket in costs_by_item.values():
        bucket.sort(key=lambda c: c.recorded_date)

    total_cost = 0.0
    for s in sales:
        bucket = costs_by_item.get(s.menu_item_id, [])
        applicable = [c for c in bucket if c.recorded_date <= s.sale_date]
        unit_cost = float(applicable[-1].cost_per_unit) if applicable else (
            float(bucket[0].cost_per_unit) if bucket else 0.0
        )
        total_cost += unit_cost * s.quantity_sold

    taxable = max(total_revenue - total_cost, 0.0)
    tax_result = tax_calculator.calculate_tax(taxable)

    return TaxEstimate(
        tax_year=year,
        total_revenue=round(total_revenue, 2),
        total_expenses=round(total_cost, 2),
        taxable_income=round(taxable, 2),
        estimated_tax=tax_result.tax,
        tax_bracket=tax_result.bracket_label,
        note="This is an estimate only. Please consult a tax professional.",
    )
