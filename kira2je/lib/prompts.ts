import type { AnalyticsResult, FullReport } from './schemas';

export const SYSTEM_BM =
  'Anda ialah Kira2 je, penasihat menu AI untuk perniagaan F&B mikro di Malaysia. Jawab dalam Bahasa Malaysia santai, seperti kawan. Gunakan RM untuk semua nilai wang. Jangan guna jargon kewangan yang susah.';

export function ocrPrompt(): string {
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

export function followupPrompt(extracted: unknown, askedSoFar: string[]): string {
  return `Berdasarkan data yang dah dikumpul, kenal pasti apa maklumat yang masih kurang untuk analisis keuntungan penuh.

Data setakat ini: ${JSON.stringify(extracted).slice(0, 800)}

Soalan yang dah ditanya: ${askedSoFar.join(' | ')}

Tanya SATU soalan seterusnya sahaja. Fokus pada: (1) peratus kos makanan untuk setiap kategori, (2) platform delivery dan komisyen, (3) perubahan menu 3 bulan lepas.

Kembalikan JSON: { "question": "...", "done": bool, "field": "costPercent"|"deliveryCommission"|"menuChanges"|"none" }`;
}

export function reportPrompt(analytics: AnalyticsResult): string {
  return `Hasilkan laporan strategik dalam BM berdasarkan data analitik di bawah. Semua nombor sudah dikira — tugas anda hanya menerangkan corak dan memberi cadangan.

Data: ${JSON.stringify(analytics)}

Laporan mesti merangkumi:
1. Ringkasan (ayat pendek tentang prestasi keseluruhan)
2. Naratif kanibalisasi (jika dikesan) — terangkan dengan angka sebenar
3. Naratif perangkap delivery (jika ada) — sebut nama item dan RM
4. Naratif cukai (rujuk angka dalam data.tax)
5. Cadangan berperingkat (maks 5) — setiap satu dengan impact_rm anggaran

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

export function whatIfPrompt(report: FullReport, question: string): string {
  return `Pengguna tanya soalan "what if" tentang menu mereka.

Laporan semasa (ringkas):
- Untung bulanan: RM${report.analytics.estimatedProfit}
- Item teratas: ${report.analytics.items
    .slice()
    .sort((a, b) => b.monthlyProfit - a.monthlyProfit)
    .slice(0, 3)
    .map((i) => `${i.name} (RM${i.monthlyProfit}/bulan)`)
    .join(', ')}
- Kanibalisasi: ${
    report.analytics.cannibalization.detected
      ? `${report.analytics.cannibalization.culpritItem} menarik jualan dari ${report.analytics.cannibalization.victimItem}`
      : 'tiada'
  }
- Perangkap delivery: ${report.analytics.deliveryTraps.map((t) => t.itemName).join(', ') || 'tiada'}

Soalan pengguna: "${question}"

Fikir langkah demi langkah:
- Bagaimana perubahan ini akan jejas volum jualan?
- Bagaimana margin akan berubah?
- Ada risiko kanibalisasi baru?
- Berapa anggaran impact RM sebulan?

Kembalikan JSON: { "answer": "...", "projectedDeltaRm": ... atau null, "risks": ["..."] }

Jawab dalam BM santai. Guna RM tepat. Jujur tentang risiko.`;
}
