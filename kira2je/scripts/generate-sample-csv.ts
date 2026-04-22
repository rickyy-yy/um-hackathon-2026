#!/usr/bin/env tsx
// Writes public/sample-warung.csv from the shared scenario data so the
// "use sample data" upload path produces the same analytics as the seeded
// dashboard — same cannibalization story, same delivery trap, same numbers.

import { writeFileSync } from 'fs';
import { join } from 'path';
import { generateDailyRecords } from '../lib/scenario';

const records = generateDailyRecords();

const header = 'item,price,quantity,date,channel,cost_percent,delivery_commission';
const rows = records.map((r) => {
  const d = r.date.toISOString().slice(0, 10);
  return [
    escape(r.itemName),
    r.price.toFixed(2),
    r.quantity,
    d,
    r.channel,
    r.costPercent.toFixed(2),
    r.deliveryCommission != null ? r.deliveryCommission.toFixed(2) : '',
  ].join(',');
});

function escape(s: string): string {
  if (s.includes(',') || s.includes('"')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const out = [header, ...rows].join('\n') + '\n';
const target = join(process.cwd(), 'public', 'sample-warung.csv');
writeFileSync(target, out);

console.log(`Wrote ${records.length} rows to ${target}`);
