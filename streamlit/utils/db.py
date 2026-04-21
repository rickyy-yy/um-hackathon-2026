"""Direct Postgres access for the Streamlit dashboard."""
from __future__ import annotations

import os
from typing import Any

from sqlalchemy import create_engine, text

SYNC_DB_URL = os.environ.get(
    "SYNC_DATABASE_URL",
    "postgresql://kira2je_user:change_me_db_password@db:5432/kira2je",
)

_engine = create_engine(SYNC_DB_URL, pool_pre_ping=True)


def fetch_report(report_id: str, user_id: str) -> dict[str, Any] | None:
    with _engine.connect() as conn:
        row = conn.execute(
            text(
                "SELECT id, title, report_month, summary_json, ai_recommendations, generated_at "
                "FROM reports WHERE id = :report_id AND user_id = :user_id"
            ),
            {"report_id": report_id, "user_id": user_id},
        ).fetchone()
    if row is None:
        return None
    return dict(row._mapping)


def list_reports(user_id: str) -> list[dict[str, Any]]:
    with _engine.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT id, title, report_month, summary_json, generated_at "
                "FROM reports WHERE user_id = :user_id "
                "ORDER BY report_month DESC, generated_at DESC"
            ),
            {"user_id": user_id},
        ).fetchall()
    return [dict(r._mapping) for r in rows]
