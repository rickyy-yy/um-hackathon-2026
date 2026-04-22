# Kira2 je

AI-powered menu profitability strategist for Malaysian micro F&B SMEs (kopitiam, warung, small cafés). UM Hackathon 2026 MVP.

All UI in casual Bahasa Malaysia. Mobile-first Next.js web app.

## Run locally

```bash
cd kira2je
npm install
cp .env.local.example .env.local
npx prisma migrate deploy
npx prisma db seed
npm run build
npm run start      # http://localhost:3000
```

`MOCK_LLM=true` is the default in `.env.local.example`, so the full app — including vision OCR, follow-up chat, report narration, and what-if — runs end-to-end without any API key using canned Bahasa Malaysia responses. Swap to a real LLM by setting `MOCK_LLM=false` plus the `LLM_*` vars (Z.AI GLM migration is a three-line env change).

### Demo login

Phone: any Malaysian number (e.g. `12-345 6789`)
OTP: any 6 digits

If the phone matches the seeded `+60123456789`, you land straight on Mak Cik Aminah's pre-generated report.

## Architecture

- **`lib/analytics.ts`** is the source of truth. Pearson correlation for cannibalization, effective-margin math for delivery traps, YA2025 bracket tax — all computed programmatically.
- **`lib/llm.ts`** is a task-discriminated client: `llm({ task: 'report' | 'whatif' | 'followup' | 'ocr', ... })`. The mock path (`lib/mocks/`) returns canned BM fixtures; the real path uses any OpenAI-compatible endpoint with Zod-validated output.
- **State persists in SQLite**. Report rows hold the analytics blob; narration is generated lazily on first read and cached back. What-if turns live in `WhatIfTurn`. No server session beyond the signed auth cookie — every screen is refresh-safe.

## Demo script (5–7 min)

1. Open `http://localhost:3000` → log in with `+60 12-345-6789` / any 6 digits.
2. Dashboard loads with Mak Cik Aminah's seeded report. Walk through:
   - Summary stats (revenue / profit)
   - Per-item table (sortable)
   - Profit bars ranked by RM contribution
   - **Cannibalization alert**: salted egg pulling sales from nasi lemak biasa (80 → 50/day)
   - **Delivery trap**: Milo Dinosaur effective margin RM0.80 after GrabFood 30% cut
   - Tax estimate card — toggle reliefs, watch the number move
   - Ranked actions with total monthly RM impact
   - Area benchmark — teh tarik cheaper than Kajang average
3. Tap "Tanya: Kalau saya...?" → ask *"Kalau saya buang salted egg?"* → canned but coherent BM response with RM delta.

To show the upload path without adding stage seconds: `/onboarding` → "Ada fail dari POS" → "Atau guna data contoh Warung Aminah" → preview → Hantar → follow-up chat → dashboard.

## Files of note

- `prisma/schema.prisma`, `prisma/seed.ts` — data model and Aminah scenario
- `lib/analytics.ts` — computeAnalytics()
- `lib/llm.ts`, `lib/mocks/`, `lib/prompts.ts` — LLM layer
- `app/dashboard/page.tsx` — the demo centerpiece
- `app/whatif/page.tsx` — the second wow beat
- `scripts/scrape-benchmark.ts` — documented stub for scaling-path story; not run during demo

## Swapping to Z.AI GLM

Edit `.env.local`:

```
MOCK_LLM=false
LLM_BASE_URL=https://api.z.ai/v1
LLM_API_KEY=your-key
LLM_MODEL=glm-4
```

No code changes.
