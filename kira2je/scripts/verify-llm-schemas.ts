#!/usr/bin/env tsx
// Verifies that realistic LLM response shapes parse cleanly through our
// Zod schemas. Doesn't actually call the API — instead, we feed the
// schemas the exact JSON structure our prompts ask for, plus common
// failure-mode payloads. If this passes, MOCK_LLM=false should work on
// first try (assuming the real LLM actually follows instructions).

import {
  OcrExtraction,
  FollowupTurn,
  ReportNarration,
  WhatIfAnswer,
} from '../lib/schemas';

let pass = 0;
let fail = 0;

function expectOk(name: string, schema: { safeParse: (x: unknown) => { success: boolean; error?: unknown } }, payload: unknown) {
  const r = schema.safeParse(payload);
  if (r.success) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.log(`  ✗ ${name}:`);
    console.log('   ', JSON.stringify(r.error, null, 2).slice(0, 400));
    fail++;
  }
}

function expectFail(name: string, schema: { safeParse: (x: unknown) => { success: boolean } }, payload: unknown) {
  const r = schema.safeParse(payload);
  if (!r.success) {
    console.log(`  ✓ ${name} (correctly rejected)`);
    pass++;
  } else {
    console.log(`  ✗ ${name}: should have been rejected but wasn't`);
    fail++;
  }
}

console.log('\n== OcrExtraction — happy path ==');
expectOk('canonical shape', OcrExtraction, {
  items: [{ name: 'Nasi lemak ayam', quantity: 18, price: 8.0, date: '2026-03-20' }],
  confidence: 'high',
  missingInfo: [],
});
expectOk('with low confidence + missing info', OcrExtraction, {
  items: [{ name: 'Teh tarik', quantity: 22, price: 2.5, date: '2026-03-20' }],
  confidence: 'low',
  missingInfo: ['Beberapa harga tak jelas'],
});

console.log('\n== OcrExtraction — rejects ==');
expectFail('missing confidence', OcrExtraction, {
  items: [{ name: 'X', quantity: 1, price: 1, date: '2026-03-20' }],
  missingInfo: [],
});
expectFail('invalid confidence value', OcrExtraction, {
  items: [{ name: 'X', quantity: 1, price: 1, date: '2026-03-20' }],
  confidence: 'sure',
  missingInfo: [],
});
expectFail('snake_case missing_info (old prompt bug)', OcrExtraction, {
  items: [{ name: 'X', quantity: 1, price: 1, date: '2026-03-20' }],
  confidence: 'high',
  missing_info: [],
});

console.log('\n== FollowupTurn ==');
expectOk('next question', FollowupTurn, {
  question: 'Berapa kos bahan untuk nasi lemak?',
  done: false,
  field: 'costPercent',
});
expectOk('final turn', FollowupTurn, {
  question: 'Terima kasih, menyediakan laporan...',
  done: true,
  field: 'none',
});
expectFail('invalid field enum', FollowupTurn, {
  question: 'Q',
  done: false,
  field: 'randomField',
});

console.log('\n== ReportNarration ==');
expectOk('full narration', ReportNarration, {
  headline: 'Laporan menu boss',
  summary: 'Bulan ini...',
  cannibalizationNarrative: 'Ada tanda...',
  deliveryNarrative: 'Milo Dinosaur...',
  taxNarrative: 'Anggaran cukai...',
  recommendations: [
    { rank: 1, title: 'Naikkan harga', description: 'Lorem', impactRm: 500 },
    { rank: 2, title: 'Combo', description: 'Ipsum', impactRm: 1200 },
  ],
  totalImpactRm: 1700,
});
expectOk('null narratives allowed', ReportNarration, {
  headline: 'H',
  summary: 'S',
  cannibalizationNarrative: null,
  deliveryNarrative: null,
  taxNarrative: 'T',
  recommendations: [],
  totalImpactRm: 0,
});
expectFail('missing taxNarrative', ReportNarration, {
  headline: 'H',
  summary: 'S',
  cannibalizationNarrative: null,
  deliveryNarrative: null,
  recommendations: [],
  totalImpactRm: 0,
});

console.log('\n== WhatIfAnswer ==');
expectOk('with delta and risks', WhatIfAnswer, {
  answer: 'Kalau boss naikkan harga...',
  projectedDeltaRm: 834,
  risks: ['Pelanggan mungkin kecewa'],
});
expectOk('null delta (uncertain)', WhatIfAnswer, {
  answer: 'Susah nak kata tanpa data lagi...',
  projectedDeltaRm: null,
  risks: [],
});
expectFail('missing answer', WhatIfAnswer, {
  projectedDeltaRm: 500,
  risks: [],
});

console.log(`\n== Summary ==\n${pass} pass, ${fail} fail\n`);
process.exit(fail > 0 ? 1 : 0);
