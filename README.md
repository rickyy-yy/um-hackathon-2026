# Kira2Lah

**Kira2Lah** (Malay: _"let's just calculate, lah"_) is an AI-powered business advisor built for Malaysian F&B MSMEs — hawker stalls, roadside vendors, pasar malam sellers, cafes and small restaurants.

Upload messy data — CSVs, photos of handwritten ledgers, Touch n Go screenshots, POS receipts — and Kira2Lah uses Z.ai's GLM to extract it, calculate per-item profitability, flag menu cannibalization, warn you about margin decline, estimate your LHDN tax, and chat with you in English, Bahasa Malaysia or 中文 about "what if I drop the salted egg?"-style scenarios.

This repository is **iteration 2**: phone-based auth (password + OTP), anonymous "Try now" flow, multi-shop support per user, full trilingual UI, dark mode, and a redesigned chat interface.

---

## Tech stack

| Layer         | Technology                                              |
| ------------- | ------------------------------------------------------- |
| Backend       | Python 3.11, FastAPI, SQLAlchemy 2 (async), Alembic     |
| Frontend      | Next.js 14 (App Router), React 18, TypeScript, Tailwind |
| Database      | PostgreSQL 16                                           |
| Charts        | Streamlit + Plotly (embedded via iframe)                |
| AI            | Z.ai GLM (OpenAI-compatible endpoint)                   |
| Exports       | reportlab (PDF), openpyxl (XLSX), python-docx (DOCX)    |
| SMS (stub)    | `ConsoleSmsProvider` — OTPs print to backend logs       |
| Orchestration | Docker Compose                                          |

---

## Prerequisites

- Docker 24+ with Compose v2
- A Z.ai API key (free tier works for the hackathon)

You do **not** need Node.js or Python installed locally — everything runs in containers.

---

## Setup

```bash
cp .env.example .env
# Edit .env and set ZAI_API_KEY. Everything else has working defaults.

docker compose up --build
docker compose run --rm seeder          # creates the test user & demo data
```

After the stack is up:

| Service          | URL                                      |
| ---------------- | ---------------------------------------- |
| Frontend         | http://localhost:3000                    |
| Backend API docs | http://localhost:8000/docs               |
| Streamlit charts | http://localhost:8501                    |
| Postgres         | `localhost:5432` (inside compose: `db`)  |

### Test account

The seed script creates a ready-to-use demo account:

```
Phone    : +60123456789
Password : TestUser123!
Email    : test@kira2lah.local
Shop     : Nasi Lemak Mak Cik Test
```

The shop ships with three months of sample sales, a month-2 chicken-cost spike, and a pre-built cannibalization pattern between Nasi Lemak Ayam and Mee Goreng so the demo dashboard has meaningful flags to show.

### SMS OTPs

The hackathon build ships with a **console SMS stub**. OTPs are printed to the backend container logs rather than sent over SMS. To see them:

```bash
docker compose logs -f backend | grep SMS-STUB
```

To switch to a real provider post-hackathon, implement `SmsProvider` in `backend/app/services/sms_service.py` and set `SMS_PROVIDER` accordingly.

---

## What works in iteration 2

- **Phone-based auth**: login with password or 6-digit OTP; forgot-password via OTP
- **"Try now" guest flow**: upload a file and generate a report without signing up; a follow-up sign-up migrates the guest data into the new account
- **Shops as the unit of account**: one user, many shops; reports / menus / uploads all scoped to the active shop
- **Trilingual UI**: EN / MS / 中文 with persisted preference and browser-language detection
- **Dark / light mode** with OS-preference default and no flash on first paint
- **Redesigned AI chat** with markdown rendering, suggested starter prompts, typing indicator
- **Export + delivery**: PDF / XLSX / DOCX downloads; email and WhatsApp endpoints (graceful 503 when not configured)

See `DESIGN_DECISIONS.md` for items flagged for product confirmation and `KNOWN_ISSUES.md` for what is not yet polished.

---

## Troubleshooting

**`docker compose up` fails with `db: unhealthy`**
Postgres is rejecting your `POSTGRES_USER` / `POSTGRES_PASSWORD`. Make sure you copied `.env.example` to `.env` and that the values match `DATABASE_URL`.

**Sign-up returns a "connection error" in the browser**
Make sure you rebuilt the frontend (`docker compose build frontend`) after pulling iteration 2. The Next.js rewrite in `next.config.js` now uses `BACKEND_URL` (server-side hostname) rather than `NEXT_PUBLIC_BACKEND_URL`. If you are running the frontend outside Docker, set `BACKEND_URL=http://localhost:8000` in your environment.

**I can't see the OTP in an SMS**
The hackathon build logs OTPs instead of sending them: `docker compose logs -f backend`. Look for `[SMS-STUB]`.

**The seeder says "GLM not available"**
You need a working `ZAI_API_KEY` for the sample report to be generated. The other seed data (user, shop, sales, costs) still lands in the database — you can log in and generate a fresh report yourself.

---

## Tests

No automated test suite ships with iteration 2. Manual verification is covered by Section 10 of the iteration-2 brief.

---

## License

Proprietary · built for the UM Hackathon 2026.
