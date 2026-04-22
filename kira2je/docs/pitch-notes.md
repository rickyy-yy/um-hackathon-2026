# Kira2 je — Pitch Notes

Talking points and rebuttals for hackathon Q&A. Judges at economic-empowerment tracks
will test on revenue model, privacy, scaling, and defensibility. Have one-liners ready.

## Revenue model

**Free for the individual report; paid for what happens next.**

Three candidate revenue streams, staged:

1. **Freemium core.** Every micro-F&B owner gets one full menu analysis + the what-if chat + 30 days of data retention, free. This is the sticky feature — they come back every month to upload new data. No friction at the moment of first value.

2. **Tax filing package — RM49/year.** Once the owner trusts the profitability report, upselling a LHDN-aware tax filing helper is natural. Pre-fills e-BE with estimated income + reliefs, lets them attach receipts via photo OCR. Volume play: even at 0.5% conversion of Malaysia's ~600k micro-F&B businesses, that's RM150k ARR.

3. **Commission from POS / payment integrations.** When the owner opts to connect a POS (StoreHub, Slurp) or a payment gateway (GrabPay, Touch 'n Go), we take a small referral fee from the partner (standard industry practice). The owner doesn't pay us — and our analysis gets more accurate with real-time data. Win-win.

**Explicitly NOT doing:** selling data, ads, or scraping-based competitive pricing (the benchmark feature uses publicly-listed prices, not vendor-specific data).

## Privacy posture

**Three things to say when asked:**

1. **Raw sales data never leaves the device for pure analysis.** All margin math, cannibalization detection, and tax bracket calculation happens server-side *within* our Malaysian-hosted backend. No raw sales rows are sent to third-party LLM providers.

2. **LLM calls only receive aggregated analytics (RM amounts and item names), not raw records.** The vendor can see that "nasi lemak biasa dropped from 27/day to 17/day" but never sees customer identifiers, timestamps, or payment methods — because those don't exist in our pipeline.

3. **Data residency is Malaysia-first.** The default LLM is Z.AI's GLM endpoint (Chinese provider with MY-region availability); we chose OpenAI-compatible interfaces specifically so we can swap to a domestic provider (e.g., YTL's Ilmu) or on-premise when needed. A one-line env change, no code.

**If pushed on GDPR/PDPA compliance:** we operate under PDPA 2010, process data only for the purpose consented to (profitability analysis), and delete on request. Vendors can export their data in CSV at any time.

## Scaling path

**From 1 Mak Cik Aminah to 10,000 micro F&B businesses:**

| Stage | Users | Strategy |
|---|---|---|
| Now | 1 (demo) | Seeded scenario, polished demo |
| 30 days post-hackathon | 10–50 (pilot) | Manual onboarding via kopitiam owners we know; collect feedback; fix onboarding friction |
| 90 days | 500 | Partner with a single POS vendor (StoreHub or Slurp) to offer Kira2 je as a value-add; they bring the users, we bring the insight |
| 12 months | 5,000 | Expand to delivery platforms (GrabFood, Foodpanda) — their data is our benchmark layer; grow via their small-vendor outreach programs |
| Longer | 50,000+ | LHDN partnership for SME tax literacy (they have the motivation, we have the distribution-worthy product) |

**The scraper stub (`scripts/scrape-benchmark.ts`) is the scaling primitive for the benchmark feature** — real implementation respects robots.txt, rate-limits politely, and builds the area price corpus over weeks, not minutes. This is one of the things that gets more valuable with scale.

## Competitive position

**Who else is doing this?**

- **Generic BI tools (Power BI, Google Sheets):** Require data literacy and English fluency. Not for a mak cik.
- **POS-native dashboards (StoreHub, Slurp):** Lock-in by vendor. Most warungs don't have a POS at all. And even those that do, the dashboards show *what happened*, not *what to do next*.
- **Accountants:** Expensive (RM300-800/year for a micro business) and reactive, not strategic.

**Our wedge:** the combination of (a) accepting messy input (photos, chat, sparse CSV) via LLM, (b) giving strategic advice in casual BM with RM numbers, and (c) explicit Malaysian tax bracket literacy. No one else hits all three.

## Defensibility (the "can't someone else just copy this?" question)

The code, sure — but the *distribution* is the moat:
1. Partnerships with POS vendors and delivery platforms (18 months to build)
2. LHDN credibility (harder — takes showing responsibility and accuracy over time)
3. The benchmark data corpus (takes 6-12 months of scraping + user submissions to build)
4. A library of micro-F&B-specific heuristics embedded in analytics (cannibalization patterns, delivery trap patterns, seasonal dynamics for different cuisines) — this is real product IP

The LLM layer is the *easiest* thing to replicate. The distribution and data layers are what make this sustainable.

## Judge-killer one-liners

> "How do you make money?" → "Free forever for the core analysis; RM49/year for tax filing; commission from POS partnerships. No ads, no data sales."

> "Why would a mak cik trust you with her sales data?" → "Raw data stays on our servers in Malaysia. LLM only sees aggregates. She can export or delete everything at any time. One-line swap to on-prem if we need to."

> "What stops Grab from building this themselves?" → "They already have the data — they built it for *themselves*. The mak cik doesn't work for Grab; she works for herself. Neutral, multi-platform advice is the product."

> "Why BM-only?" → "Not BM-only — BM-first. Because every competitor is English-first and our target user isn't. Trilingual (BM/EN/中文) is on the roadmap but BM is the wedge."
