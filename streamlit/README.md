# Kira2Lah — Streamlit

Read-only visualization app, embedded inside the Next.js dashboard via
iframe. Expects the following query params:

- `token` — a short-lived JWT with `scope=streamlit`, signed with the same
  `JWT_SECRET_KEY` as the FastAPI backend.
- `report_id` — UUID of the report to render.

The Streamlit service reads the same Postgres database as the backend
(`SYNC_DATABASE_URL` env). It never writes.

Two modes:

1. **Ringkasan Bulan** — revenue vs COGS vs profit bars, payment-method pie.
2. **Per Menu** — metric cards + trend lines across previous reports.

All charts honour the Kira2Lah palette via `utils/theme.py`.
