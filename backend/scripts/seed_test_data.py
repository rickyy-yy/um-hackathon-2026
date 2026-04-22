#!/usr/bin/env python3
"""Seed the database with a demo account for the Kira2Lah hackathon build.

Creates (idempotently):
  * Test user       — phone +60123456789, password TestUser123!
  * One shop        — "Nasi Lemak Mak Cik Test" (hawker stall, KL)
  * Six menu items  — nasi lemak, mee goreng, drinks
  * Three months of sales + cost data (with a chicken-cost spike in month 2
    and a cannibalization pattern between Nasi Lemak Ayam and Mee Goreng)
  * One generated report so the dashboard has content on first login

Run:
  docker compose up -d db backend
  docker compose run --rm seeder
  # or:
  docker compose exec backend python scripts/seed_test_data.py

The script is idempotent — re-running it will not create duplicates.
"""
from __future__ import annotations

import asyncio
import logging
import random
import sys
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

# Make the backend app importable when run as a plain script inside the
# container (compose mounts ./backend at /app).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession  # noqa: E402

from app.core.database import AsyncSessionLocal  # noqa: E402
from app.core.scope import Scope  # noqa: E402
from app.core.security import hash_password, normalize_phone  # noqa: E402
from app.models import (  # noqa: E402
    CostEntry,
    MenuItem,
    Report,
    SalesRecord,
    Shop,
    User,
)
from app.services import report_generator  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("kira2lah.seed")

TEST_PHONE_RAW = "+60123456789"
TEST_PASSWORD = "TestUser123!"
TEST_EMAIL = "test@kira2lah.local"
TEST_NAME = "Test User"
SHOP_NAME = "Nasi Lemak Mak Cik Test"

# Menu definitions: (name, category, price_rm, base_cost_rm, mean_daily_qty)
MENU: list[tuple[str, str, Decimal, Decimal, int]] = [
    ("Nasi Lemak Biasa", "Rice", Decimal("4.50"), Decimal("1.80"), 35),
    ("Nasi Lemak Ayam", "Rice", Decimal("7.50"), Decimal("3.20"), 28),
    ("Mee Goreng", "Noodle", Decimal("6.00"), Decimal("2.40"), 18),
    ("Teh Tarik", "Drink", Decimal("2.50"), Decimal("0.70"), 55),
    ("Kopi O", "Drink", Decimal("2.00"), Decimal("0.50"), 30),
    ("Roti Bakar", "Side", Decimal("3.50"), Decimal("1.20"), 22),
]


async def ensure_user(db: AsyncSession) -> User:
    phone = normalize_phone(TEST_PHONE_RAW)
    result = await db.execute(select(User).where(User.phone_number == phone))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            phone_number=phone,
            password_hash=hash_password(TEST_PASSWORD),
            full_name=TEST_NAME,
            email=TEST_EMAIL,
            preferred_language="en",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info("Created test user %s", phone)
    else:
        logger.info("Test user already exists — reusing")
    return user


async def ensure_shop(db: AsyncSession, user: User) -> Shop:
    result = await db.execute(
        select(Shop).where(Shop.owner_user_id == user.id, Shop.shop_name == SHOP_NAME)
    )
    shop = result.scalar_one_or_none()
    if shop is None:
        shop = Shop(
            owner_user_id=user.id,
            shop_name=SHOP_NAME,
            shop_type="hawker_stall",
            address="Jalan Demo, Kuala Lumpur",
            sst_registered=False,
        )
        db.add(shop)
        await db.commit()
        await db.refresh(shop)
        logger.info("Created demo shop %s", SHOP_NAME)

        user.last_shop_id = shop.id
        await db.commit()
    else:
        logger.info("Demo shop already exists — reusing")
    return shop


async def ensure_menu(db: AsyncSession, shop: Shop) -> dict[str, MenuItem]:
    result = await db.execute(select(MenuItem).where(MenuItem.shop_id == shop.id))
    existing = {m.name: m for m in result.scalars().all()}
    items: dict[str, MenuItem] = dict(existing)

    for name, category, price, _cost, _qty in MENU:
        if name in existing:
            continue
        item = MenuItem(shop_id=shop.id, name=name, category=category, selling_price=price)
        db.add(item)
        await db.flush()
        items[name] = item

    await db.commit()
    for item in items.values():
        await db.refresh(item)
    logger.info("Menu has %s items", len(items))
    return items


async def generate_sales_and_costs(
    db: AsyncSession, shop: Shop, items: dict[str, MenuItem]
) -> tuple[date, date]:
    today = date.today().replace(day=1)
    start = (today - timedelta(days=1)).replace(day=1)
    start = (start - timedelta(days=1)).replace(day=1)
    start = (start - timedelta(days=1)).replace(day=1)  # three months back

    # Skip if we already have sales data for this period.
    existing = await db.execute(
        select(SalesRecord).where(SalesRecord.shop_id == shop.id).limit(1)
    )
    if existing.scalar_one_or_none() is not None:
        logger.info("Sales data already present — skipping bulk insert")
        return start, today - timedelta(days=1)

    rng = random.Random(42)
    payment_methods = ["cash", "touch_n_go", "duitnow", "card"]

    def cost_for(name: str, on: date) -> Decimal:
        base = next(c for n, _, _, c, _ in MENU if n == name)
        month_offset = (on.year - start.year) * 12 + (on.month - start.month)
        # Month-2 chicken-cost spike: Nasi Lemak Ayam rises 30%, Mee Goreng a smaller 8%
        if month_offset == 1:
            if name == "Nasi Lemak Ayam":
                return base * Decimal("1.30")
            if name == "Mee Goreng":
                return base * Decimal("1.08")
        return base

    recorded_cost_keys: set[tuple[str, date]] = set()
    end = today - timedelta(days=1)
    day = start
    total_rows = 0
    while day <= end:
        for name, _, price, _, mean_qty in MENU:
            qty_mean = mean_qty
            # Cannibalization effect: as Nasi Lemak Ayam gets more popular,
            # Mee Goreng sales decay. Both items target the same customer.
            if name == "Nasi Lemak Ayam":
                qty_mean = int(mean_qty * (1.0 + day.day / 60.0))
            elif name == "Mee Goreng":
                qty_mean = int(mean_qty * (1.0 - day.day / 90.0))

            qty = max(0, int(rng.gauss(qty_mean, qty_mean * 0.25)))
            if qty == 0:
                continue

            item = items[name]
            payment = rng.choice(payment_methods)
            db.add(
                SalesRecord(
                    shop_id=shop.id,
                    menu_item_id=item.id,
                    quantity_sold=qty,
                    unit_selling_price=price,
                    sale_date=day,
                    payment_method=payment,
                )
            )
            total_rows += 1

            # Record a cost entry on the 1st of each month per item
            if day.day == 1 and (name, day) not in recorded_cost_keys:
                db.add(
                    CostEntry(
                        menu_item_id=item.id,
                        cost_per_unit=cost_for(name, day),
                        recorded_date=day,
                        notes=None,
                    )
                )
                recorded_cost_keys.add((name, day))

        day += timedelta(days=1)
        if total_rows and total_rows % 500 == 0:
            await db.flush()

    await db.commit()
    logger.info("Inserted %s sales rows for %s..%s", total_rows, start, end)
    return start, end


async def ensure_seed_report(db: AsyncSession, user: User, shop: Shop, start: date, end: date) -> None:
    existing = await db.execute(select(Report).where(Report.shop_id == shop.id).limit(1))
    if existing.scalar_one_or_none() is not None:
        logger.info("A report already exists for this shop — skipping AI generation")
        return
    scope = Scope(user=user, shop=shop, guest_session=None)
    try:
        report = await report_generator.generate_report(
            db, scope, start, end, label=f"{start.strftime('%b %Y')} – {end.strftime('%b %Y')} demo"
        )
        logger.info("Generated sample report %s", report.id)
    except Exception as exc:  # noqa: BLE001
        # The GLM may be unreachable in CI / first boot — skip rather than fail
        # the whole seed.
        logger.warning("Skipping report generation (GLM not available?): %s", exc)


async def main() -> None:
    async with AsyncSessionLocal() as db:
        user = await ensure_user(db)
        shop = await ensure_shop(db, user)
        items = await ensure_menu(db, shop)
        start, end = await generate_sales_and_costs(db, shop, items)
        await ensure_seed_report(db, user, shop, start, end)

    print("\n" + "=" * 60)
    print("✓ Seed complete.")
    print(f"  Phone    : {TEST_PHONE_RAW}")
    print(f"  Password : {TEST_PASSWORD}")
    print(f"  Email    : {TEST_EMAIL}")
    print(f"  Shop     : {SHOP_NAME}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
