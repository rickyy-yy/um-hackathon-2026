# Kira2 je

**AI-powered menu profitability strategist for Malaysian micro F&B SMEs.**

Built for kopitiams, warungs, and small cafés — businesses that run on gut feel, a notebook, and WhatsApp. Kira2 je turns raw sales CSVs and invoice photos into a Bahasa Malaysia report covering per-item margins, cannibalization alerts, delivery-platform traps, YA2025 tax estimates, and ranked recommendations with real RM impact numbers.

UM Hackathon 2026 entry — domain: **AI for Economic Empowerment & Decision Intelligence**.

---

## Demo Video and Documents

Google Drive Link: [Here](https://drive.google.com/drive/folders/1cMf5HkCVZSdWbYdoYLyZ6qFqtJ19hXBL?usp=sharing)

This Drive folder should include:

- Product Requirements Document (PRD)
- System Analysis Document (SAD)
- Quality Assurance Testing Document (QATD)
- Pitch Deck.pdf
- Pitch Video.mp4

**Alternatively, the documents can be found in the /documents directory within this repository.**

---

## The Problem

Malaysian micro F&B operators rarely know which menu items are actually profitable. A nasi lemak that sells 100 plates a day can still lose money if ingredient costs spike. A Milo Dinosaur listed on GrabFood can silently bleed margin after the 30% platform cut. Most owners lack the time, tools, or accounting background to find out.

Kira2 je closes that gap. The full analysis runs without any accounting knowledge — just upload what you already have (a POS export, invoice photos, or even a chat message), and the app does the rest.

---

## Key Features

### Data Ingestion
- **Invoice OCR** — photograph supplier invoices; vision pipeline (Gemini → GLM → Tesseract fallback) extracts line items, quantities, and totals
- **POS CSV/Excel import** — drag-and-drop sales exports from StoreHub or Loyverse with intelligent column auto-detection
- **Chat entry** — type "I sold 50 nasi lemak at RM8 yesterday" and the app parses it
- **Batch photo upload** — multiple invoice photos processed in one go

### Analytics (all computed server-side, not sent to LLM)
| Analysis | What it tells you |
|---|---|
| Per-item margin | Revenue, cost, profit, and margin % for every menu item |
| Monthly summary | Total revenue, expenses, and net profit |
| Trends | Month-over-month movement across all key metrics |
| Cannibalization detection | Pearson correlation to find items pulling sales from each other |
| Delivery trap | Effective margin after GrabFood/platform cuts (30% fee modelled) |
| Tax estimate | YA2025 Malaysian income tax bracket with toggleable relief deductions |
| Ranked recommendations | Prioritised actions with projected RM monthly impact |
| Area benchmark | Compare your prices against local averages |

### What-If Chat
Ask questions in Bahasa Malaysia like *"Kalau saya buang salted egg?"* and get a reasoned answer with RM delta projections — powered by LLM with the analytics context injected.

### Localisation
Full UI and LLM prompts in both **Bahasa Malaysia** (default) and **English**. User-selectable at onboarding.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS 3 with a custom warm-paper colour palette, Framer Motion |
| ORM | Prisma 5 |
| Database | PostgreSQL (production / Neon) or SQLite (local dev) |
| LLM | OpenAI-compatible endpoint — defaults to Z.AI GLM; switchable to any provider |
| OCR | Tesseract.js (local), with optional Gemini vision pipeline |
| File parsing | PapaParse (CSV), XLSX (Excel), PDF-Parse (PDFs), Jimp (image preprocessing) |
| Validation | Zod (all LLM outputs and API boundaries) |

---

## Architecture

```
kira2je/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/                # REST endpoints (auth, upload, report, chat)
│   ├── dashboard/          # Main analytics hub
│   ├── onboarding/         # 4-step setup wizard
│   ├── report/[month]/     # Per-month report view
│   ├── upload/             # File upload interface
│   ├── invoices/           # Invoice review and OCR confirmation queue
│   ├── mapping/            # Ingredient-to-menu-item mapping
│   └── whatif/             # What-if scenario chat
├── lib/
│   ├── analytics.ts        # Source of truth — all margins, correlations, tax
│   ├── llm.ts              # Task-discriminated LLM client (mock + real)
│   ├── prompts.ts          # System prompts parameterised by locale
│   ├── schemas.ts          # Zod schemas for every LLM response type
│   ├── mocks/              # Canned BM fixtures for MOCK_LLM=true
│   └── i18n/               # en / bm translation dictionaries
├── prisma/
│   ├── schema.prisma       # PostgreSQL data model
│   ├── schema.sqlite.prisma# SQLite variant for local dev
│   └── seed.ts             # Demo user + 3 months of pre-generated report data
├── components/             # React UI components
├── docs/
│   └── pitch-notes.md      # Business model, competitive positioning, scaling path
└── scripts/                # Utility and dev scripts
```

### Core design decisions

**Analytics are computed in code, not in the LLM.** `lib/analytics.ts` runs Pearson correlation for cannibalization detection, effective-margin arithmetic for delivery trap detection, and YA2025 bracket math for tax estimates. The LLM receives the *results* of these calculations and turns them into natural-language narrative — it never touches the raw numbers.

**The LLM layer is task-discriminated.** `lib/llm.ts` exports a single `llm({ task, ... })` function that routes to the right system prompt, output schema, and mock fixture based on the task type (`invoice-ocr`, `ingredient-mapping`, `report`, `whatif`, `followup`). Swapping providers is a three-line `.env` change.

**Mock mode ships as the default.** `MOCK_LLM=true` makes the entire app runnable without any API key — OCR, report narration, what-if chat, and follow-ups all return canned Bahasa Malaysia responses. This lets judges and reviewers evaluate the full UX without provider credentials.

**State is entirely database-backed.** Report rows cache the analytics blob; narration is generated lazily on first read and written back. What-if turns are stored in `WhatIfTurn`. The auth mechanism is a signed cookie — every page is safe to refresh.

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm
- (For PostgreSQL mode) a running PostgreSQL instance or [Neon](https://neon.tech) connection string

### Quickstart (SQLite — no database setup needed)

```bash
cd kira2je
npm install
cp .env.example .env
npm run dev:local         # starts on http://localhost:3000
```

`dev:local` automatically pushes the SQLite schema and starts the Next.js dev server. No additional steps.

### Quickstart (PostgreSQL)

```bash
cd kira2je
npm install
cp .env.example .env
# Edit .env — set DATABASE_URL to your PostgreSQL connection string
npx prisma migrate deploy
npx prisma db seed
npm run build
npm run start             # starts on http://localhost:3000
```

> **Why `.env` and not `.env.local`?** Prisma CLI only reads `.env` by default. Next.js reads both, with `.env.local` taking precedence, so a single `.env` file covers both tools for local development.

### Demo login

| Field | Value |
|---|---|
| Phone | Any Malaysian number — e.g. `+60 12-345 6789` |
| OTP | Any 6 digits |

If the phone matches the seeded `+60123456789`, you land directly on Mak Cik Aminah's pre-generated three-month report. Any other number creates a fresh account.

---

## Environment Variables

```bash
# .env.example

# Database
DATABASE_URL=file:./dev.db         # SQLite (local)
# DATABASE_URL=postgresql://...    # Neon / PostgreSQL (production)

# Auth
SESSION_SECRET=dev-secret-change-me-before-prod

# LLM — set MOCK_LLM=false and fill in the three LLM_* vars to use a real model
MOCK_LLM=true
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=
LLM_MODEL=gpt-4o-mini

# Vision OCR (optional — Tesseract is the fallback if unset)
GEMINI_API_KEY=
```

All variables are optional in mock mode. The only required change for a production deployment is `DATABASE_URL`, `SESSION_SECRET`, and the three `LLM_*` vars.

---

## LLM Provider Configuration

Kira2 je uses any OpenAI-compatible endpoint. Switch providers by editing `.env` only — no code changes.

**OpenAI:**
```bash
MOCK_LLM=false
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
```

**Mock (default — no API key required):**
```bash
MOCK_LLM=true
```

---

## npm Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server with PostgreSQL |
| `npm run dev:local` | Dev server with SQLite (auto schema push) |
| `npm run setup:sqlite` | Initialise local SQLite schema |
| `npm run seed:local` | Seed demo data to SQLite |
| `npm run build` | Production build (runs DB migrations first) |
| `npm run start` | Start production server |
| `npm run demo:setup` | One-liner: Prisma setup + seed for demo environment |
| `npm run db:reset` | Reset and re-seed database |

---

## Demo Walkthrough (5–7 min)

1. Open `http://localhost:3000` → log in with `+60 12-345 6789` / any 6 digits.
2. Dashboard loads with Mak Cik Aminah's seeded data:
   - **Summary stats** — total revenue, expenses, and net profit for the month
   - **Per-item table** — sortable by any column; real cost and margin for every dish
   - **Profit bars** — items ranked by RM contribution at a glance
   - **Cannibalization alert** — salted egg variant pulling sales from nasi lemak biasa (80 → 50/day detected via Pearson correlation)
   - **Delivery trap** — Milo Dinosaur effective margin RM0.80 after GrabFood 30% cut
   - **Tax estimate** — YA2025 bracket with toggleable relief deductions
   - **Ranked actions** — top changes by projected RM monthly impact
   - **Area benchmark** — teh tarik priced below Kajang average
3. Tap **"Tanya: Kalau saya...?"** → ask *"Kalau saya buang salted egg?"* → response in Bahasa Malaysia with RM delta projection.

To demonstrate the upload path without adding stage time: navigate to `/onboarding` → "Ada fail dari POS" → "Atau guna data contoh Warung Aminah" → preview → Hantar → follow-up chat → dashboard.

---

## Data Model

```
User
 └── has many Invoice (supplier receipts, OCR-extracted)
 └── has many PosUpload (sales CSV/Excel exports)
 └── has many IngredientMapping (invoice item → menu item)
 └── has many Report (cached analytics blob + LLM narration per month)
       └── has many WhatIfTurn (chat history per report)
 └── has many MenuItemOverride (manual cost corrections)
```

---

## Project Structure (full)

```
kira2je/
├── app/
│   ├── api/
│   │   ├── auth/           # send-otp, verify-otp, logout
│   │   ├── upload/         # invoice, csv, pos, photo, chat
│   │   ├── invoices/       # list + confirm OCR results
│   │   ├── mapping/        # ingredient mapping suggestions
│   │   ├── report/         # generate, latest, [id]
│   │   ├── chat/           # whatif, followup
│   │   ├── dashboard/      # data readiness check
│   │   ├── user/           # profile + data export
│   │   └── locale/         # language preference
│   ├── dashboard/
│   ├── onboarding/
│   ├── upload/
│   ├── report/[month]/
│   ├── report/generate/
│   ├── invoices/
│   ├── mapping/
│   ├── whatif/
│   └── processing/
├── components/
│   ├── ReportViewToggle.tsx
│   ├── AppHeader.tsx
│   ├── ItemTable.tsx
│   ├── ActionCards.tsx
│   ├── CannibalizationAlert.tsx
│   ├── DeliveryTrapTable.tsx
│   ├── TaxCard.tsx
│   ├── ProfitBars.tsx
│   ├── BenchmarkCard.tsx
│   └── ...
├── lib/
│   ├── analytics.ts
│   ├── llm.ts
│   ├── prompts.ts
│   ├── schemas.ts
│   ├── mocks/
│   └── i18n/
├── prisma/
│   ├── schema.prisma
│   ├── schema.sqlite.prisma
│   └── seed.ts
├── docs/
│   └── pitch-notes.md
├── scripts/
│   ├── db-setup.js
│   └── scrape-benchmark.ts   # stub — area price scraper, documented in pitch-notes
├── public/
├── .env.example
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---
