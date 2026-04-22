# Kira2Lah — Backend

FastAPI service that handles auth, uploads, the AI orchestration layer, report
generation, exports, and delivery (email / WhatsApp).

## Layout

```
app/
├── api/               Route modules (auth, shops, upload, chat, reports, menu_items, tax, dashboard)
├── models/            SQLAlchemy ORM models (one file per table)
├── schemas/           Pydantic request/response schemas
├── services/
│   ├── ai_service.py           Z.ai GLM client wrapper — ALL AI calls go here
│   ├── file_processor.py       CSV / XLSX / PDF / image → structured JSON via GLM
│   ├── ocr_service.py          pytesseract + pdf2image preprocessing
│   ├── chat_flow.py            Structured Bahasa Malaysia data-collection flow
│   ├── report_generator.py     Per-item metrics, cannibalization, tax, GLM narrative
│   ├── tax_calculator.py       Malaysian LHDN progressive brackets
│   ├── export_service.py       PDF (reportlab) / XLSX (openpyxl) / DOCX (python-docx)
│   ├── email_service.py        aiosmtplib
│   └── whatsapp_service.py     Generic bearer-token REST send
├── core/
│   ├── database.py    Async SQLAlchemy engine + get_db dependency
│   ├── security.py    bcrypt, JWT, Streamlit iframe tokens
│   └── dependencies.py  get_current_user guard (httpOnly cookie)
├── bootstrap.py       create_all at startup (dev) — Alembic lives under migrations/
├── config.py          pydantic-settings loaded from .env
└── main.py            FastAPI entry point
```

## Running locally (without Docker)

```bash
pip install -r requirements.txt
export DATABASE_URL=postgresql+asyncpg://...
python -m app.bootstrap       # create tables
uvicorn app.main:app --reload
```

## Z.ai / GLM

This service uses the OpenAI Python SDK with a custom `base_url`, as
specified in the PRD. If `ZAI_API_KEY` is not set, `ai_service.get_client()`
raises `AIUnavailableError` and analytical endpoints return HTTP 503 — there
is no non-AI fallback, by design.

## Security

- httpOnly JWT cookie, bcrypt cost 12
- Parameterised SQLAlchemy everywhere — no string SQL on user input
- File uploads: extension + MIME check, 10 MB cap, random filename, stored
  outside the web root
- Rate limit via `slowapi` (60/min default)
- CORS restricted to `FRONTEND_URL`
