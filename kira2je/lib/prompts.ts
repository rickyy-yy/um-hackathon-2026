import type { AnalyticsResult, FullReport } from './schemas';
import type { Locale } from './i18n/dictionary';

export function systemPrompt(locale: Locale): string {
  if (locale === 'en') {
    return 'You are Kira2 je, an AI menu advisor for Malaysian micro F&B businesses. Respond in casual Malaysian English — friendly, like a friend talking to a small-business owner. Use RM for all monetary values. Avoid financial jargon.';
  }
  return 'Anda ialah Kira2 je, penasihat menu AI untuk perniagaan F&B mikro di Malaysia. Jawab dalam Bahasa Malaysia santai, seperti kawan. Gunakan RM untuk semua nilai wang. Jangan guna jargon kewangan yang susah.';
}

// Legacy export kept for callers that import SYSTEM_BM directly (none in app)
export const SYSTEM_BM = systemPrompt('ms');

export function ocrPrompt(locale: Locale = 'ms'): string {
  if (locale === 'en') {
    return `You are analyzing a photo of handwritten sales records from a Malaysian F&B stall.
Extract all sales data and return as JSON:
{
  "items": [{ "name": "...", "quantity": ..., "price": ..., "date": "YYYY-MM-DD" }],
  "confidence": "high" | "medium" | "low",
  "missingInfo": ["list of what you couldn't determine"]
}
Records may be in BM, English, or mixed. Handwriting may be messy.
Interpret abbreviations (NL = nasi lemak, TT = teh tarik, MG = mee goreng, etc.)`;
  }
  return `Anda sedang analisis gambar rekod jualan tulisan tangan dari gerai makanan Malaysia.
Ekstrak semua data jualan dan kembalikan sebagai JSON:
{
  "items": [{ "name": "...", "quantity": ..., "price": ..., "date": "YYYY-MM-DD" }],
  "confidence": "high" | "medium" | "low",
  "missingInfo": ["senarai apa yang tak pasti"]
}
Rekod mungkin dalam BM, Inggeris, atau campuran. Tulisan mungkin tak kemas.
Tafsir singkatan (NL = nasi lemak, TT = teh tarik, MG = mee goreng, dll.)`;
}

export function followupPrompt(
  extracted: unknown,
  askedSoFar: string[],
  locale: Locale = 'ms'
): string {
  if (locale === 'en') {
    return `Based on the data collected so far, identify what's still missing for a full profitability analysis.

Data so far: ${JSON.stringify(extracted).slice(0, 800)}

Questions asked: ${askedSoFar.join(' | ')}

Ask ONE next question. Focus on: (1) food cost % per category, (2) delivery platforms and commissions, (3) menu changes in the last 3 months.

Return JSON: { "question": "...", "done": bool, "field": "costPercent"|"deliveryCommission"|"menuChanges"|"none" }`;
  }
  return `Berdasarkan data yang dah dikumpul, kenal pasti apa maklumat yang masih kurang untuk analisis keuntungan penuh.

Data setakat ini: ${JSON.stringify(extracted).slice(0, 800)}

Soalan yang dah ditanya: ${askedSoFar.join(' | ')}

Tanya SATU soalan seterusnya sahaja. Fokus pada: (1) peratus kos makanan untuk setiap kategori, (2) platform delivery dan komisyen, (3) perubahan menu 3 bulan lepas.

Kembalikan JSON: { "question": "...", "done": bool, "field": "costPercent"|"deliveryCommission"|"menuChanges"|"none" }`;
}

export function reportPrompt(analytics: AnalyticsResult, locale: Locale = 'ms'): string {
  const data = JSON.stringify(analytics);
  if (locale === 'en') {
    return `Generate a strategic report based on the analytics data below. All numbers are pre-computed — your job is just to explain the patterns and give recommendations.

Data: ${data}

The report must include:
1. Summary (one short sentence about overall performance)
2. Cannibalization narrative (if detected) — explain with actual numbers
3. Delivery trap narrative (if any) — name items and RM amounts
4. Tax narrative (refer to data.tax)
5. Ranked recommendations (max 5) — each with impactRm estimate

Return JSON:
{
  "headline": "...",
  "summary": "...",
  "cannibalizationNarrative": "..." or null,
  "deliveryNarrative": "..." or null,
  "taxNarrative": "...",
  "recommendations": [{ "rank": 1, "title": "...", "description": "...", "impactRm": ... }],
  "totalImpactRm": ...
}

Use actual item names and exact RM amounts. Casual friend-of-the-boss tone.`;
  }
  return `Hasilkan laporan strategik dalam BM berdasarkan data analitik di bawah. Semua nombor sudah dikira — tugas anda hanya menerangkan corak dan memberi cadangan.

Data: ${data}

Laporan mesti merangkumi:
1. Ringkasan (ayat pendek tentang prestasi keseluruhan)
2. Naratif kanibalisasi (jika dikesan) — terangkan dengan angka sebenar
3. Naratif perangkap delivery (jika ada) — sebut nama item dan RM
4. Naratif cukai (rujuk angka dalam data.tax)
5. Cadangan berperingkat (maks 5) — setiap satu dengan impactRm anggaran

Kembalikan JSON:
{
  "headline": "...",
  "summary": "...",
  "cannibalizationNarrative": "..." atau null,
  "deliveryNarrative": "..." atau null,
  "taxNarrative": "...",
  "recommendations": [{ "rank": 1, "title": "...", "description": "...", "impactRm": ... }],
  "totalImpactRm": ...
}

Guna nama item sebenar dan RM tepat. Nada santai seperti kawan.`;
}

export function whatIfPrompt(
  report: FullReport,
  question: string,
  locale: Locale = 'ms'
): string {
  const topItems = report.analytics.items
    .slice()
    .sort((a, b) => b.monthlyProfit - a.monthlyProfit)
    .slice(0, 3);
  const cannibalization = report.analytics.cannibalization;
  const traps = report.analytics.deliveryTraps;

  if (locale === 'en') {
    return `The user is asking a "what if" question about their menu.

Current report (summary):
- Monthly profit: RM${report.analytics.estimatedProfit}
- Top items: ${topItems.map((i) => `${i.name} (RM${i.monthlyProfit}/month)`).join(', ')}
- Cannibalization: ${
      cannibalization.detected
        ? `${cannibalization.culpritItem} pulling sales from ${cannibalization.victimItem}`
        : 'none'
    }
- Delivery traps: ${traps.map((t) => t.itemName).join(', ') || 'none'}

User question: "${question}"

Reason step by step:
- How would this change affect sales volume?
- How would margin change?
- New cannibalization risk?
- Estimated RM impact per month?

Return JSON: { "answer": "...", "projectedDeltaRm": ... or null, "risks": ["..."] }

Respond in casual Malaysian English. Be specific with RM numbers. Be honest about risks.`;
  }

  return `Pengguna tanya soalan "what if" tentang menu mereka.

Laporan semasa (ringkas):
- Untung bulanan: RM${report.analytics.estimatedProfit}
- Item teratas: ${topItems.map((i) => `${i.name} (RM${i.monthlyProfit}/bulan)`).join(', ')}
- Kanibalisasi: ${
    cannibalization.detected
      ? `${cannibalization.culpritItem} menarik jualan dari ${cannibalization.victimItem}`
      : 'tiada'
  }
- Perangkap delivery: ${traps.map((t) => t.itemName).join(', ') || 'tiada'}

Soalan pengguna: "${question}"

Fikir langkah demi langkah:
- Bagaimana perubahan ini akan jejas volum jualan?
- Bagaimana margin akan berubah?
- Ada risiko kanibalisasi baru?
- Berapa anggaran impact RM sebulan?

Kembalikan JSON: { "answer": "...", "projectedDeltaRm": ... atau null, "risks": ["..."] }

Jawab dalam BM santai. Guna RM tepat. Jujur tentang risiko.`;
}
