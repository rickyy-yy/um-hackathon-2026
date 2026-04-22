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
          .join('. ')}. Sesetengah peniaga lebih baik naikkan harga khas untuk delivery atau keluarkan item ini dari apps.`
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

export function mockWhatIf(question: string, report: FullReport): WhatIfAnswer {
  const q = question.toLowerCase();

  const priceDelta = parsePriceDelta(q);
  const mentionedItem = findMentionedItem(q, report);

  if (/grab|foodpanda|deliver|milo/.test(q)) {
    return varyDelivery(q, report);
  }
  if (/salted egg/.test(q) && /(buang|keluar|remove|hilangkan)/.test(q)) {
    return varyRemoveSaltedEgg(report);
  }
  if (/(naik|tambah|tinggikan).*harga|harga.*(naik|tambah)/.test(q) && priceDelta != null) {
    return varyPriceIncrease(priceDelta, mentionedItem, report);
  }
  if (/(turun|kurang).*harga|harga.*(turun|kurang)/.test(q) && priceDelta != null) {
    return varyPriceDecrease(priceDelta, mentionedItem, report);
  }
  if (/(tambah|new item|item baru|menu baru|combo)/.test(q)) {
    return varyAddItem(q);
  }
  if (/(kurang.{0,10}(kos|bahan)|cut cost|jimat|turunkan kos)/.test(q)) {
    return matchFixture(/kurang/, q);
  }
  if (/(buang|keluar|remove|hilangkan)/.test(q) && mentionedItem) {
    return varyRemoveItem(mentionedItem, report);
  }

  // Fall through to static fixture matches, then fallback
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

function parsePriceDelta(q: string): number | null {
  const rmMatch = q.match(/rm\s*(\d+(?:\.\d+)?)/i);
  if (rmMatch) return Number(rmMatch[1]);
  const senMatch = q.match(/(\d+)\s*sen/i);
  if (senMatch) return Number(senMatch[1]) / 100;
  if (/(setengah|separuh)/.test(q)) return 0.5;
  return null;
}

function findMentionedItem(q: string, report: FullReport): string | null {
  for (const item of report.analytics.items) {
    const name = item.name.toLowerCase();
    if (q.includes(name)) return item.name;
    const short = name.split(' ').slice(0, 2).join(' ');
    if (short.length > 5 && q.includes(short)) return item.name;
  }
  return null;
}

function varyPriceIncrease(
  delta: number,
  mentionedItem: string | null,
  report: FullReport
): WhatIfAnswer {
  // Simple elasticity: every RM1 increase ≈ 12% volume drop, but per-unit margin rises
  const volDropPct = Math.round(Math.min(40, delta * 12));
  const baseProfit = report.analytics.estimatedProfit;
  // Rough elasticity: +RM1 ≈ 10% profit swing, offset by volume loss worth ~25% of drop
  const netImpact = Math.round(baseProfit * (delta * 0.10 - (volDropPct / 100) * 0.25));

  const deltaStr = delta >= 1 ? `RM${delta.toFixed(2).replace(/\.00$/, '')}` : `${Math.round(delta * 100)} sen`;
  const scope = mentionedItem ? `harga ${mentionedItem}` : 'semua harga';

  return {
    answer: `Kalau boss naikkan ${scope} ${deltaStr}, model saya kata: volum jualan akan turun anggaran ${volDropPct}% (pelanggan sensitif harga akan pergi), tapi margin per unit naik. Net impact anggaran ${netImpact >= 0 ? '+' : '−'}RM${Math.abs(netImpact).toLocaleString()}/bulan. Sweet spot biasanya: naikkan untuk item yang tak sensitif harga (macam nasi) dan kekalkan harga minuman (persaingan kuat, pelanggan perasan).`,
    projectedDeltaRm: netImpact,
    risks: [
      'Pelanggan tetap mungkin kecewa',
      'Pesaing dekat boleh tarik pelanggan kalau kenaikan terlalu besar',
    ],
  };
}

function varyPriceDecrease(
  delta: number,
  mentionedItem: string | null,
  report: FullReport
): WhatIfAnswer {
  const volRisePct = Math.round(Math.min(30, delta * 10));
  const baseProfit = report.analytics.estimatedProfit;
  // Price cuts usually hurt micro-F&B: cost doesn't fall, margin compresses faster than volume rises
  const netImpact = Math.round(baseProfit * ((volRisePct / 100) * 0.25 - delta * 0.12));

  const deltaStr = delta >= 1 ? `RM${delta.toFixed(2).replace(/\.00$/, '')}` : `${Math.round(delta * 100)} sen`;
  const scope = mentionedItem ? mentionedItem : 'item';

  return {
    answer: `Kalau boss turunkan harga ${scope} ${deltaStr}: volum naik anggaran ${volRisePct}%, tapi margin per unit jatuh. Net impact anggaran ${netImpact >= 0 ? '+' : '−'}RM${Math.abs(netImpact).toLocaleString()}/bulan. Potongan harga biasanya BERISIKO untuk F&B kecil sebab cost bahan tak boleh dikurangkan sebanyak itu. Lebih baik buat promosi terhad (contoh: diskaun hari kerja) daripada turun harga tetap.`,
    projectedDeltaRm: netImpact,
    risks: [
      'Kos bahan tak turun sepadan — margin bersih boleh jatuh lebih dari jangkaan',
      'Pelanggan terbiasa dengan harga baru, payah nak naik balik',
    ],
  };
}

function varyDelivery(_q: string, report: FullReport): WhatIfAnswer {
  const trap = report.analytics.deliveryTraps[0];
  if (!trap) {
    return matchFixture(/grab/, 'grab');
  }
  return {
    answer: `${trap.itemName} anda di GrabFood sekarang untung cuma RM${trap.effectiveMarginRm.toFixed(2)} selepas komisyen ${Math.round(trap.commission * 100)}%. Tiga pilihan: (1) Naikkan harga di Grab jadi RM${(trap.price + 1.5).toFixed(2)} — pelanggan delivery biasanya sanggup bayar 20-30% lebih sebab convenience. Anggaran impact +RM750/bulan. (2) Keluarkan dari Grab, jual dine-in sahaja — tak rugi tapi tak tumbuh. (3) Buat combo bundled di Grab (margin lebih baik sebab sebaran kos). Pilihan 1 paling cepat.`,
    projectedDeltaRm: 750,
    risks: ['Pelanggan delivery mungkin kurang kalau rasa harga terlalu tinggi'],
  };
}

function varyRemoveSaltedEgg(report: FullReport): WhatIfAnswer {
  const c = report.analytics.cannibalization;
  if (!c.detected) {
    return matchFixture(/salted egg/, 'salted egg');
  }
  const net = c.netMonthlyImpactRm ?? 0;
  return {
    answer: `Hmm, kalau boss buang ${c.culpritItem}, tiga perkara akan jadi: (1) Pelanggan yang sekarang order ${c.culpritItem} mungkin separuh balik order ${c.victimItem}, separuh lagi pergi tempat lain. (2) Untung dari ${c.culpritItem} hilang, tapi ${c.victimItem} naik balik dari ${c.volumeAfter}/hari ke ${c.volumeBefore}/hari. (3) Net: untung ${net >= 0 ? 'NAIK' : 'TURUN'} anggaran RM${Math.abs(net).toLocaleString()}/bulan. Cadangan saya: jangan buang — naikkan harga ${c.culpritItem} RM1 dan kekal ${c.victimItem} sebagai pilihan murah. Pelanggan premium bayar lebih, pelanggan biasa tak lari.`,
    projectedDeltaRm: -Math.abs(net),
    risks: [
      `Kehilangan pelanggan baru yang suka ${c.culpritItem}`,
      'Menu jadi kurang menarik di media sosial',
    ],
  };
}

function varyRemoveItem(itemName: string, report: FullReport): WhatIfAnswer {
  const item = report.analytics.items.find((i) => i.name === itemName);
  if (!item) return matchFixture(/buang/, 'buang');
  return {
    answer: `Kalau boss buang ${itemName}, anda akan hilang anggaran RM${item.monthlyProfit.toLocaleString()}/bulan untung dari item itu. Soal yang lagi penting: ada pelanggan yang datang KHUSUS untuk ${itemName}? Kalau ya, mereka mungkin tak datang langsung. Cadangan: daripada buang, cuba kekalkan tapi kurangkan effort — portion lebih kecil, atau masa jualan terhad (contoh: hari Khamis-Sabtu sahaja). Kalau benar-benar nak buang, pastikan ada item pengganti yang margin tinggi.`,
    projectedDeltaRm: -Math.round(item.monthlyProfit * 0.7),
    risks: [
      `Pelanggan tetap yang datang khusus untuk ${itemName} mungkin berhenti`,
      'Menu jadi lebih kecil — kurang pilihan boleh bermakna kurang trafik',
    ],
  };
}

function varyAddItem(q: string): WhatIfAnswer {
  const wantsCombo = /combo|bundle/.test(q);
  if (wantsCombo) {
    return {
      answer: `Combo bundling adalah strategi terbaik untuk naikkan ticket size tanpa risiko kanibalisasi besar. Contoh untuk warung anda: nasi lemak + teh + roti bakar pada RM10 (bundled discount 10% dari pecah-pecah). Spread kos bahan, pelanggan rasa dapat value. Anggaran impact: +RM1,800/bulan kalau 15 combo/hari terjual. Test masa sarapan 7-10am dulu, kalau jalan baru expand.`,
      projectedDeltaRm: 1800,
      risks: [
        'Margin per combo lebih rendah dari beli setiap item — perlu volum untuk justify',
        'Kompleksiti operasi: bagaimana kitchen ambil order bundled?',
      ],
    };
  }
  return {
    answer: `Untuk warung seperti anda, item baru yang paling berpotensi ialah: nasi kerabu (margin tinggi, bahan mudah, tak kanibal nasi lemak sebab rasa berbeza) atau set breakfast combo. Anggaran impact: +RM1,800/bulan. Tapi HATI-HATI: tambah 2+ item baru pada masa sama boleh kanibal antara satu sama lain — macam yang jadi dengan salted egg sekarang. Test satu dulu, kaji 2 minggu, baru tambah lagi.`,
    projectedDeltaRm: 1800,
    risks: [
      'Kanibalisasi baru dengan menu sedia ada',
      'Kos bahan baru untuk item yang tak laku',
    ],
  };
}

function matchFixture(pattern: RegExp, _q: string): WhatIfAnswer {
  const a = whatifFixture.answers.find((x) => pattern.test(x.pattern));
  if (a) {
    return { answer: a.answer, projectedDeltaRm: a.projectedDeltaRm, risks: a.risks };
  }
  const fb = whatifFixture.fallback;
  return { answer: fb.answer, projectedDeltaRm: fb.projectedDeltaRm, risks: fb.risks };
}

function rm(n: number): string {
  return n.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
