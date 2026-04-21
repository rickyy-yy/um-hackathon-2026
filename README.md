# Kira2 Je

**Kira2 Je** (Malay: "let's just calculate") is an AI-powered data analyst and business advisor built for Malaysian F&B MSMEs — hawker stalls, roadside vendors, pasar malam sellers, cafes and small restaurants.

Upload your messy data — CSVs, photos of handwritten ledgers, Touch n Go screenshots, POS receipts — and Kira2 Je uses Z.ai's GLM to extract it, calculate per-item profitability, flag menu cannibalization, warn you about margin decline, estimate your LHDN tax, and chat with you in plain Bahasa Malaysia about "kalau saya buang salted egg...?"-style what-if questions.

## Stack

| Layer                | Tech                                           |
| -------------------- | ---------------------------------------------- |
| Backend              | Python · FastAPI · SQLAlchemy (async) · Alembic |
| Frontend             | Next.js 14 (App Router) · Tailwind CSS · TypeScript |
| Database             | PostgreSQL 16                                   |
| Data Visualization   | Streamlit · Plotly                              |
| AI                   | Z.ai GLM (OpenAI-compatible SDK)                |
| Orchestration        | Docker Compose                                  |

All analytical features route through Z.ai's GLM. Without a valid `ZAI_API_KEY`, AI features return an error state — there is no non-AI fallback, by design.

## Quick start

```bash
cp .env.example .env
# edit .env — at minimum, set ZAI_API_KEY and ZAI_BASE_URL
docker compose up --build
```

Then:
- Frontend: <http://localhost:3000>
- Backend API docs: <http://localhost:8000/docs>
- Streamlit: <http://localhost:8501>
- Postgres: `localhost:5432`

## Project layout

```
.
├── backend/       FastAPI service — auth, uploads, reports, AI orchestration
├── frontend/      Next.js 14 app — landing, signup, login, dashboard, upload, report
├── streamlit/     Streamlit app — interactive charts embedded in the dashboard
├── docker-compose.yml
└── .env.example
```

See `backend/README.md`, `frontend/README.md`, and `streamlit/README.md` for per-service details.

## Design language

Palette (all hex, use exactly these):
- `#0F6E56` — primary teal (headers, CTAs)
- `#F0DD62` — accent yellow (highlights, positive deltas)
- `#C6DABF` — sage surface (AI chat bubbles, soft cards)
- `#F3E9D2` — cream background
- `#D64933` — alert red (losses, warnings)

The interface speaks casual Bahasa Malaysia ("Kira sedang bertanya", "Cuba satu je dulu pun okay") with RM-denominated answers — never percentages without RM context. See the mocks referenced in the PRD.

## Security notes

- JWT is issued as an **httpOnly** cookie (never `localStorage`).
- Passwords are bcrypt-hashed (cost ≥ 12).
- All DB access is through parameterized SQLAlchemy — no raw SQL on user input.
- File uploads are MIME- and extension-checked, size-capped at 10 MB, and stored under random filenames outside the web root.
- For production: terminate TLS at a reverse proxy (nginx/Caddy). The dev compose runs HTTP only.

## Out of scope (explicitly)

Mobile app, multi-language UI, multi-currency, multi-branch, inventory/supplier/payroll management, real-time POS sync, payment processing, automated LHDN filing, CRM.
