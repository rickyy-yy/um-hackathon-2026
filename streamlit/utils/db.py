"""Direct Postgres access for the Streamlit dashboard."""
from __future__ import annotations

import os
from typing import Any

from sqlalchemy import create_engine, text

SYNC_DB_URL = os.environ.get(
    "SYNC_DATABASE_URL",
    "postgresql://kira2lah_user:change_me_db_password@db:5432/kira2lah",
)

_engine = create_engine(SYNC_DB_URL, pool_pre_ping=True)


def fetch_report(report_id: str, shop_id: str | None = None) -> dict[str, Any] | None:
    """Fetch a single report. If ``shop_id`` is provided, also enforce that
    the report belongs to it — defence in depth on top of the signed token."""
    with _engine.connect() as conn:
        if shop_id:
            row = conn.execute(
                text(
                    "SELECT id, shop_id, title, report_month, summary_json, ai_recommendations, generated_at "
                    "FROM reports WHERE id = :report_id AND shop_id = :shop_id"
                ),
                {"report_id": report_id, "shop_id": shop_id},
            ).fetchone()
        else:
            row = conn.execute(
                text(
                    "SELECT id, shop_id, title, report_month, summary_json, ai_recommendations, generated_at "
                    "FROM reports WHERE id = :report_id"
                ),
                {"report_id": report_id},
            ).fetchone()
    if row is None:
        return None
    return dict(row._mapping)


def list_reports(shop_id: str) -> list[dict[str, Any]]:
    with _engine.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT id, title, report_month, summary_json, generated_at "
                "FROM reports WHERE shop_id = :shop_id "
                "ORDER BY report_month DESC, generated_at DESC"
            ),
            {"shop_id": shop_id},
        ).fetchall()
    return [dict(r._mapping) for r in rows]
