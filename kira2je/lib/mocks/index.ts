import type {
  AnalyticsResult,
  FullReport,
  OcrExtraction,
  FollowupTurn,
  ReportNarration,
  WhatIfAnswer,
  Recommendation,
} from '../schemas';
import ocrFixture from './ocr.json';
import followupFixture from './followup.json';
import whatifFixture from './whatif.json';

export function mockOcr(): OcrExtraction {
  return {
    items: ocrFixture.items,
    confidence: ocrFixture.confidence as 'high' | 'medium' | 'low',
    missingInfo: ocrFixture.missingInfo,
  };
}

export function mockFollowup(turnIndex: number): FollowupTurn {
  const turns = followupFixture.turns as {
    question: string;
    field: FollowupTurn['field'];
    done: boolean;
  }[];
  const turn = turns[Math.min(turnIndex, turns.length - 1)];
  return {
    question: turn.question,
    done: turn.done,
    field: turn.field,
  };
}

export function mockReport(analytics: AnalyticsResult): ReportNarration {
  const topItem = [...analytics.items].sort((a, b) => b.monthlyProfit - a.monthlyProfit)[0];
  const worstItem = [...analytics.items].sort((a, b) => a.monthlyProfit - b.monthlyProfit)[0];

  const headline = `Laporan menu Warung Aminah`;
  const summary = `Bulan ini anda hasilkan jualan RM${rm(analytics.totalRevenue)} dengan anggaran untung RM${rm(
    analytics.estimatedProfit
  )}. Item paling menguntungkan: ${topItem.name} (RM${rm(topItem.monthlyProfit)}/bulan). Item paling lemah: ${worstItem.name}.`;

  const cannibalizationNarrative = analytics.cannibalization.detected
    ? `Ada tanda kanibalisasi. Sejak ${analytics.cannibalization.culpritItem} masuk menu, jualan ${analytics.cannibalization.victimItem} jatuh dari ${analytics.cannibalization.volumeBefore}/hari ke ${analytics.cannibalization.volumeAfter}/hari. Net impact: ${
        (analytics.cannibalization.netMonthlyImpactRm ?? 0) >= 0
          ? `+RM${rm(analytics.cannibalization.netMonthlyImpactRm ?? 0)}`
          : `-RM${rm(Math.abs(analytics.cannibalization.netMonthlyImpactRm ?? 0))}`
      }/bulan. Pelanggan nampaknya pilih yang premium, tapi sebahagian tak nak bayar lebih dan pergi tempat lain.`
    : null;

  const deliveryNarrative =
    analytics.deliveryTraps.length > 0
      ? `${analytics.deliveryTraps.length} item anda di platform delivery ada masalah margin. ${analytics.deliveryTraps
          .map(
            (t) =>
              `${t.itemName}: harga RM${rm(t.price)}, lepas komisyen ${Math.round(t.commission * 100)}% untung cuma RM${rm(t.effectiveMarginRm)} setiap satu`
          )
          .join('. ')}. Sesetengah mak cik lebih baik naikkan harga khas untuk delivery atau keluarkan item ini dari apps.`
      : null;

  const taxNarrative = `Dengan untung bulanan RM${rm(analytics.estimatedProfit)}, anggaran cukai tahunan anda ialah RM${rm(
    analytics.tax.annualTax
  )} (lebih kurang RM${rm(analytics.tax.monthlyTax)}/bulan). Ini anggaran sahaja — untuk filing sebenar, rujuk LHDN atau akauntan.`;

  const recommendations: Recommendation[] = [];

  if (analytics.cannibalization.detected) {
    recommendations.push({
      rank: recommendations.length + 1,
      title: `Naikkan harga ${analytics.cannibalization.culpritItem} RM1`,
      description: `Pelanggan yang suka premium sanggup bayar. Kurangkan tarikan untuk pelanggan ${analytics.cannibalization.victimItem} tukar — mereka akan kekal pada pilihan asal. Anggaran: sesetengah pelanggan balik ke ${analytics.cannibalization.victimItem}, margin ${analytics.cannibalization.culpritItem} naik.`,
      impactRm: 645,
    });
  }

  if (analytics.deliveryTraps.length > 0) {
    const trap = analytics.deliveryTraps[0];
    recommendations.push({
      rank: recommendations.length + 1,
      title: `Naikkan harga ${trap.itemName} di GrabFood jadi RM${rm(trap.price + 1.5)}`,
      description: `Pelanggan delivery sanggup bayar 20-30% lebih sebab convenience. Kalau volum turun sikit, margin tetap lebih sihat. Kalau tak jalan dalam 2 minggu, keluarkan dari Grab.`,
      impactRm: 750,
    });
  }

  recommendations.push({
    rank: recommendations.length + 1,
    title: `Combo breakfast: nasi lemak + teh + roti pada RM10`,
    description: `Spread kos bahan ke atas bundle. Pelanggan rasa dapat value, anda dapat margin lebih tinggi per transaksi. Test di masa pagi 7-10am.`,
    impactRm: 1200,
  });

  recommendations.push({
    rank: recommendations.length + 1,
    title: `Negosiasi semula harga bahan dari pembekal borong`,
    description: `Dengan volume 12 item dan 30 hari data, anda ada bargaining power. Fokus pada 3 bahan dengan kos tertinggi: beras, santan, ayam. Sasaran: jimat 5-8% kos bahan.`,
    impactRm: 540,
  });

  recommendations.push({
    rank: recommendations.length + 1,
    title: `Tambah papan tanda "Teh tarik RM2.50 — harga kawasan RM2.80"`,
    description: `Teh tarik anda lebih murah dari purata Kajang. Jadikan ini signal value. Pelanggan baru akan singgah sebab rasa harga okay, order makanan sekali.`,
    impactRm: 320,
  });

  const totalImpactRm = recommendations.reduce((s, r) => s + r.impactRm, 0);

  return {
    headline,
    summary,
    cannibalizationNarrative,
    deliveryNarrative,
    taxNarrative,
    recommendations,
    totalImpactRm,
  };
}

export function mockWhatIf(question: string, _report: FullReport): WhatIfAnswer {
  const q = question.toLowerCase();
  for (const a of whatifFixture.answers) {
    const re = new RegExp(a.pattern, 'i');
    if (re.test(q)) {
      return {
        answer: a.answer,
        projectedDeltaRm: a.projectedDeltaRm,
        risks: a.risks,
      };
    }
  }
  const fb = whatifFixture.fallback;
  return {
    answer: fb.answer,
    projectedDeltaRm: fb.projectedDeltaRm,
    risks: fb.risks,
  };
}

function rm(n: number): string {
  return n.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
