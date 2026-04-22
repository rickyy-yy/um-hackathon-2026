# UM Hackathon 2026 — Kira2 je

**Kira2 je** is an AI-powered menu profitability strategist for Malaysian micro F&B SMEs — kopitiams, warungs, small cafés. Upload CSV sales data, photos of notebooks, or chat about your menu, and the app produces a Bahasa Malaysia report covering per-item margins, cannibalization detection, delivery-platform traps, Malaysian (YA2025) tax estimates, and ranked strategic recommendations. A what-if chat lets you ask "Kalau saya buang salted egg?" and get reasoned answers with RM projections.

UM Hackathon 2026 entry. Domain: AI for Economic Empowerment & Decision Intelligence.

## The app lives in [`kira2je/`](./kira2je)

See [`kira2je/README.md`](./kira2je/README.md) for setup, demo script, and architecture details.

Quickstart:

```bash
cd kira2je
npm install
cp .env.example .env
npx prisma migrate deploy
npx prisma db seed
npm run build
npm run start
```

Ships with `MOCK_LLM=true` so the full app — including vision OCR, follow-up chat, report narration, and what-if — runs end-to-end without any API key. One-line env swap migrates to Z.AI GLM.
