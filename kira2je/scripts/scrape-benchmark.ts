#!/usr/bin/env tsx
/**
 * scripts/scrape-benchmark.ts
 *
 * Benchmark scraper stub for GrabFood / Foodpanda.
 *
 * Production design (not implemented for hackathon demo):
 *  1. Accept an area name as argv (e.g. "Kajang") and optional radius km.
 *  2. Hit GrabFood / Foodpanda public listing endpoints for restaurants
 *     in that area. Respect robots.txt and rate limits; use a queue with
 *     jittered backoff.
 *  3. For each restaurant, pull menu item names + prices.
 *  4. Normalise item names using a rules + fuzzy-match pipeline:
 *       "Nasi Lemak Ayam Istimewa" / "NL Ayam" / "nasi lemak ayam" → "nasi lemak ayam"
 *  5. Per normalized item compute avgPrice / minPrice / maxPrice / sampleSize.
 *  6. Upsert rows into AreaBenchmark keyed by (itemName, area).
 *
 * The hackathon demo uses pre-seeded benchmark rows (see prisma/seed.ts) so
 * the comparison UI works without live scraping. This script exists to
 * demonstrate the scaling path to judges.
 *
 * Usage (once implemented):
 *   npx tsx scripts/scrape-benchmark.ts Kajang 3
 */

import { prisma } from '../lib/db';

async function main() {
  const area = process.argv[2] ?? 'Kajang';
  console.log(`[stub] Would scrape GrabFood + Foodpanda for area: ${area}`);
  const existing = await prisma.areaBenchmark.count({ where: { area } });
  console.log(`[stub] ${existing} seeded benchmark rows already exist for ${area}.`);
  console.log(`[stub] Wire up real scraping in production.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
