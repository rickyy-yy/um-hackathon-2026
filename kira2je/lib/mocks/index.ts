import type {
  AnalyticsResult,
  FullReport,
  OcrExtraction,
  FollowupTurn,
  ReportNarration,
  WhatIfAnswer,
  Recommendation,
} from '../schemas';
import type { Locale } from '../i18n/dictionary';
import ocrFixture from './ocr.json';
import followupFixture from './followup.json';
import whatifFixture from './whatif.json';

// Locale-specific canned copy for followup chat.
const FOLLOWUP_EN = [
  {
    question:
      "Boss, roughly what's the food cost percentage for nasi lemak? (e.g. RM2 cost on a RM5 nasi lemak = 40%)",
    field: 'costPercent' as const,
    done: false,
  },
  {
    question: 'Any sales on GrabFood or Foodpanda? If yes, which platform sells the most?',
    field: 'deliveryCommission' as const,
    done: false,
  },
  {
    question: 'In the past 3 months, added any new items or raised prices? If so, when?',
    field: 'menuChanges' as const,
    done: false,
  },
  {
    question: "All set! Preparing your report now...",
    field: 'none' as const,
    done: true,
  },
];

export function mockOcr(): OcrExtraction {
  return {
    items: ocrFixture.items,
    confidence: ocrFixture.confidence as 'high' | 'medium' | 'low',
    missingInfo: ocrFixture.missingInfo,
  };
}

export function mockFollowup(turnIndex: number, locale: Locale = 'ms'): FollowupTurn {
  if (locale === 'en') {
    const turn = FOLLOWUP_EN[Math.min(turnIndex, FOLLOWUP_EN.length - 1)];
    return {
      question: turn.question,
      done: turn.done,
      field: turn.field,
    };
  }
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

export function mockReport(
  analytics: AnalyticsResult,
  locale: Locale = 'ms'
): ReportNarration {
  const topItem = [...analytics.items].sort((a, b) => b.monthlyProfit - a.monthlyProfit)[0];
  const worstItem = [...analytics.items].sort((a, b) => a.monthlyProfit - b.monthlyProfit)[0];

  const isEn = locale === 'en';

  const headline = isEn ? `Menu report — Warung Aminah` : `Laporan menu Warung Aminah`;

  const summary = isEn
    ? `This month you generated RM${rm(analytics.totalRevenue)} in revenue with an estimated profit of RM${rm(analytics.estimatedProfit)}. Top performer: ${topItem.name} (RM${rm(topItem.monthlyProfit)}/month). Weakest: ${worstItem.name}.`
    : `Bulan ini anda hasilkan jualan RM${rm(analytics.totalRevenue)} dengan anggaran untung RM${rm(analytics.estimatedProfit)}. Item paling menguntungkan: ${topItem.name} (RM${rm(topItem.monthlyProfit)}/bulan). Item paling lemah: ${worstItem.name}.`;

  const cannibalizationNarrative = analytics.cannibalization.detected
    ? isEn
      ? `We spot cannibalization. Since ${analytics.cannibalization.culpritItem} joined the menu, sales of ${analytics.cannibalization.victimItem} dropped from ${analytics.cannibalization.volumeBefore}/day to ${analytics.cannibalization.volumeAfter}/day. Net impact: ${
          (analytics.cannibalization.netMonthlyImpactRm ?? 0) >= 0
            ? `+RM${rm(analytics.cannibalization.netMonthlyImpactRm ?? 0)}`
            : `-RM${rm(Math.abs(analytics.cannibalization.netMonthlyImpactRm ?? 0))}`
        }/month. Customers seem to trade up to the premium option, but some walk away rather than pay more.`
      : `Ada tanda kanibalisasi. Sejak ${analytics.cannibalization.culpritItem} masuk menu, jualan ${analytics.cannibalization.victimItem} jatuh dari ${analytics.cannibalization.volumeBefore}/hari ke ${analytics.cannibalization.volumeAfter}/hari. Net impact: ${
          (analytics.cannibalization.netMonthlyImpactRm ?? 0) >= 0
            ? `+RM${rm(analytics.cannibalization.netMonthlyImpactRm ?? 0)}`
            : `-RM${rm(Math.abs(analytics.cannibalization.netMonthlyImpactRm ?? 0))}`
        }/bulan. Pelanggan nampaknya pilih yang premium, tapi sebahagian tak nak bayar lebih dan pergi tempat lain.`
    : null;

  const deliveryNarrative =
    analytics.deliveryTraps.length > 0
      ? isEn
        ? `${analytics.deliveryTraps.length} item(s) on delivery platforms have margin problems. ${analytics.deliveryTraps
            .map(
              (t) =>
                `${t.itemName}: priced RM${rm(t.price)}, after ${Math.round(t.commission * 100)}% commission you only clear RM${rm(t.effectiveMarginRm)} per order`
            )
            .join('. ')}. Consider a delivery-specific price uplift or removing these from the app.`
        : `${analytics.deliveryTraps.length} item anda di platform delivery ada masalah margin. ${analytics.deliveryTraps
            .map(
              (t) =>
                `${t.itemName}: harga RM${rm(t.price)}, lepas komisyen ${Math.round(t.commission * 100)}% untung cuma RM${rm(t.effectiveMarginRm)} setiap satu`
            )
            .join('. ')}. Sesetengah peniaga lebih baik naikkan harga khas untuk delivery atau keluarkan item ini dari apps.`
      : null;

  const taxNarrative = isEn
    ? `At a monthly profit of RM${rm(analytics.estimatedProfit)}, your estimated annual tax is RM${rm(analytics.tax.annualTax)} (about RM${rm(analytics.tax.monthlyTax)}/month). This is an estimate only — for actual filing, consult LHDN or an accountant.`
    : `Dengan untung bulanan RM${rm(analytics.estimatedProfit)}, anggaran cukai tahunan anda ialah RM${rm(analytics.tax.annualTax)} (lebih kurang RM${rm(analytics.tax.monthlyTax)}/bulan). Ini anggaran sahaja — untuk filing sebenar, rujuk LHDN atau akauntan.`;

  const recommendations: Recommendation[] = [];

  if (analytics.cannibalization.detected) {
    recommendations.push({
      rank: recommendations.length + 1,
      title: isEn
        ? `Raise ${analytics.cannibalization.culpritItem} price by RM1`
        : `Naikkan harga ${analytics.cannibalization.culpritItem} RM1`,
      description: isEn
        ? `Premium-seeking customers will still pay. Reduces the pull that makes ${analytics.cannibalization.victimItem} regulars switch — they'll stick with the cheaper option.`
        : `Pelanggan yang suka premium sanggup bayar. Kurangkan tarikan untuk pelanggan ${analytics.cannibalization.victimItem} tukar — mereka akan kekal pada pilihan asal.`,
      impactRm: 645,
    });
  }

  if (analytics.deliveryTraps.length > 0) {
    const trap = analytics.deliveryTraps[0];
    recommendations.push({
      rank: recommendations.length + 1,
      title: isEn
        ? `Raise ${trap.itemName} price on GrabFood to RM${rm(trap.price + 1.5)}`
        : `Naikkan harga ${trap.itemName} di GrabFood jadi RM${rm(trap.price + 1.5)}`,
      description: isEn
        ? `Delivery customers typically accept 20-30% higher prices for convenience. If volume drops a bit, margins stay healthier. If it doesn't work in 2 weeks, pull from Grab.`
        : `Pelanggan delivery sanggup bayar 20-30% lebih sebab convenience. Kalau volum turun sikit, margin tetap lebih sihat. Kalau tak jalan dalam 2 minggu, keluarkan dari Grab.`,
      impactRm: 750,
    });
  }

  recommendations.push({
    rank: recommendations.length + 1,
    title: isEn
      ? `Breakfast combo: nasi lemak + teh + roti at RM10`
      : `Combo breakfast: nasi lemak + teh + roti pada RM10`,
    description: isEn
      ? `Spread ingredient costs across a bundle. Customers feel they're getting value, you get higher margin per transaction. Test between 7-10am.`
      : `Spread kos bahan ke atas bundle. Pelanggan rasa dapat value, anda dapat margin lebih tinggi per transaksi. Test di masa pagi 7-10am.`,
    impactRm: 1200,
  });

  recommendations.push({
    rank: recommendations.length + 1,
    title: isEn
      ? `Renegotiate ingredient prices with wholesale suppliers`
      : `Negosiasi semula harga bahan dari pembekal borong`,
    description: isEn
      ? `With 12 items and 30 days of data, you have bargaining power. Focus on the 3 costliest ingredients: rice, coconut milk, chicken. Target: save 5-8% on COGS.`
      : `Dengan volume 12 item dan 30 hari data, anda ada bargaining power. Fokus pada 3 bahan dengan kos tertinggi: beras, santan, ayam. Sasaran: jimat 5-8% kos bahan.`,
    impactRm: 540,
  });

  recommendations.push({
    rank: recommendations.length + 1,
    title: isEn
      ? `Add a sign: "Teh tarik RM2.50 — area average RM2.80"`
      : `Tambah papan tanda "Teh tarik RM2.50 — harga kawasan RM2.80"`,
    description: isEn
      ? `Your teh tarik is cheaper than the Kajang average. Use this as a value signal — new walk-ins will try it and order food as well.`
      : `Teh tarik anda lebih murah dari purata Kajang. Jadikan ini signal value. Pelanggan baru akan singgah sebab rasa harga okay, order makanan sekali.`,
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

export function mockWhatIf(
  question: string,
  report: FullReport,
  locale: Locale = 'ms'
): WhatIfAnswer {
  const q = question.toLowerCase();
  const priceDelta = parsePriceDelta(q);
  const mentionedItem = findMentionedItem(q, report);

  if (/grab|foodpanda|deliver|milo/.test(q)) {
    return varyDelivery(report, locale);
  }
  if (/salted egg/.test(q) && /(buang|keluar|remove|hilangkan|drop|pull)/.test(q)) {
    return varyRemoveSaltedEgg(report, locale);
  }
  if (
    /(naik|tambah|tinggikan|raise|increase|up).*(harga|price)|(harga|price).*(naik|tambah|raise|up)/.test(
      q
    ) &&
    priceDelta != null
  ) {
    return varyPriceIncrease(priceDelta, mentionedItem, report, locale);
  }
  if (
    /(turun|kurang|lower|drop|cut).*(harga|price)|(harga|price).*(turun|kurang|lower|drop)/.test(
      q
    ) &&
    priceDelta != null
  ) {
    return varyPriceDecrease(priceDelta, mentionedItem, report, locale);
  }
  if (/(tambah|new item|item baru|menu baru|combo|add new|add.*item)/.test(q)) {
    return varyAddItem(q, locale);
  }
  if (/(kurang.{0,10}(kos|bahan)|cut cost|jimat|turunkan kos|save.*cost|reduce.*cost)/.test(q)) {
    return varyReduceCost(locale);
  }
  if (/(buang|keluar|remove|hilangkan|drop|pull)/.test(q) && mentionedItem) {
    return varyRemoveItem(mentionedItem, report, locale);
  }

  // Fall through to static BM fixture matches, then fallback
  if (locale === 'ms') {
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

  // English fallback
  return {
    answer: `Interesting question, boss. With your current monthly profit of RM${rm(report.analytics.estimatedProfit)}, any significant change deserves 2-3 weeks of test data before being made permanent. My suggestion: try a small tweak first, measure the effect, then scale. Ask me something more specific like "What if I raise nasi lemak ayam by RM1?" or "What if I remove Milo from GrabFood?".`,
    projectedDeltaRm: null,
    risks: ['Decisions made without data usually cost more than they save'],
  };
}

function parsePriceDelta(q: string): number | null {
  const rmMatch = q.match(/rm\s*(\d+(?:\.\d+)?)/i);
  if (rmMatch) return Number(rmMatch[1]);
  const senMatch = q.match(/(\d+)\s*sen/i);
  if (senMatch) return Number(senMatch[1]) / 100;
  if (/(setengah|separuh|half)/.test(q)) return 0.5;
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
  report: FullReport,
  locale: Locale
): WhatIfAnswer {
  const volDropPct = Math.round(Math.min(40, delta * 12));
  const baseProfit = report.analytics.estimatedProfit;
  const netImpact = Math.round(baseProfit * (delta * 0.1 - (volDropPct / 100) * 0.25));

  const deltaStr = delta >= 1 ? `RM${delta.toFixed(2).replace(/\.00$/, '')}` : `${Math.round(delta * 100)} sen`;
  const deltaStrEn =
    delta >= 1 ? `RM${delta.toFixed(2).replace(/\.00$/, '')}` : `${Math.round(delta * 100)} sen`;

  if (locale === 'en') {
    const scope = mentionedItem ? `${mentionedItem}` : 'all prices';
    return {
      answer: `If boss raises ${scope} by ${deltaStrEn}, the model predicts: sales volume drops ~${volDropPct}% (price-sensitive customers walk), but per-unit margin goes up. Estimated net impact: ${netImpact >= 0 ? '+' : '−'}RM${Math.abs(netImpact).toLocaleString()}/month. Sweet spot is usually: raise prices on items with less price-sensitivity (like rice dishes), keep drink prices the same (competition is fierce and customers notice).`,
      projectedDeltaRm: netImpact,
      risks: [
        'Regular customers may feel upset',
        'Nearby competitors could poach customers if the hike is too large',
      ],
    };
  }

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
  report: FullReport,
  locale: Locale
): WhatIfAnswer {
  const volRisePct = Math.round(Math.min(30, delta * 10));
  const baseProfit = report.analytics.estimatedProfit;
  const netImpact = Math.round(baseProfit * ((volRisePct / 100) * 0.25 - delta * 0.12));

  const deltaStr = delta >= 1 ? `RM${delta.toFixed(2).replace(/\.00$/, '')}` : `${Math.round(delta * 100)} sen`;

  if (locale === 'en') {
    const scope = mentionedItem ? mentionedItem : 'the item';
    return {
      answer: `Dropping ${scope} by ${deltaStr}: volume rises ~${volRisePct}%, but per-unit margin falls faster. Net impact: ${netImpact >= 0 ? '+' : '−'}RM${Math.abs(netImpact).toLocaleString()}/month. Price cuts are usually RISKY for small F&B because ingredient costs don't fall in step. Better alternative: limited-time promos (e.g. weekday discounts) rather than permanent price cuts.`,
      projectedDeltaRm: netImpact,
      risks: [
        "Ingredient costs won't drop proportionally — net margin may fall further than expected",
        "Customers get used to the new price, hard to raise back",
      ],
    };
  }

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

function varyDelivery(report: FullReport, locale: Locale): WhatIfAnswer {
  const trap = report.analytics.deliveryTraps[0];
  if (!trap) {
    return locale === 'en'
      ? {
          answer: `No delivery traps detected on your menu right now. If you're thinking of joining GrabFood, aim for items with at least RM3 profit per unit after 30% commission.`,
          projectedDeltaRm: null,
          risks: [],
        }
      : {
          answer: `Tiada perangkap delivery dikesan dalam menu anda sekarang. Kalau nak masuk GrabFood, sasarkan item dengan margin sekurang-kurangnya RM3 seunit selepas komisyen 30%.`,
          projectedDeltaRm: null,
          risks: [],
        };
  }

  if (locale === 'en') {
    return {
      answer: `Your ${trap.itemName} on GrabFood only profits RM${trap.effectiveMarginRm.toFixed(2)} per order after the ${Math.round(trap.commission * 100)}% commission. Three options: (1) Raise the Grab price to RM${(trap.price + 1.5).toFixed(2)} — delivery customers typically pay 20-30% more for convenience, estimated impact +RM750/month. (2) Pull ${trap.itemName} from Grab and keep it dine-in only — no loss but no growth. (3) Bundle into a combo on Grab for better margin spread. Option 1 is fastest.`,
      projectedDeltaRm: 750,
      risks: ['Delivery customers may drop if the price feels too high'],
    };
  }

  return {
    answer: `${trap.itemName} anda di GrabFood sekarang untung cuma RM${trap.effectiveMarginRm.toFixed(2)} selepas komisyen ${Math.round(trap.commission * 100)}%. Tiga pilihan: (1) Naikkan harga di Grab jadi RM${(trap.price + 1.5).toFixed(2)} — pelanggan delivery biasanya sanggup bayar 20-30% lebih sebab convenience. Anggaran impact +RM750/bulan. (2) Keluarkan dari Grab, jual dine-in sahaja — tak rugi tapi tak tumbuh. (3) Buat combo bundled di Grab (margin lebih baik sebab sebaran kos). Pilihan 1 paling cepat.`,
    projectedDeltaRm: 750,
    risks: ['Pelanggan delivery mungkin kurang kalau rasa harga terlalu tinggi'],
  };
}

function varyRemoveSaltedEgg(report: FullReport, locale: Locale): WhatIfAnswer {
  const c = report.analytics.cannibalization;
  if (!c.detected) {
    return locale === 'en'
      ? {
          answer: `No clear cannibalization on salted egg in your data — removing it would just cost you its direct revenue. Only pull an item if you're certain the freed kitchen capacity goes to a higher-margin dish.`,
          projectedDeltaRm: null,
          risks: [],
        }
      : {
          answer: `Tiada tanda kanibalisasi yang jelas pada salted egg dalam data anda — buang akan rugi hasil terus. Keluarkan item hanya kalau anda pasti kapasiti dapur terbebas akan pergi ke hidangan margin lebih tinggi.`,
          projectedDeltaRm: null,
          risks: [],
        };
  }
  const net = c.netMonthlyImpactRm ?? 0;

  if (locale === 'en') {
    return {
      answer: `Hmm, if boss removes ${c.culpritItem}, three things happen: (1) Customers who currently buy ${c.culpritItem} may split — half return to ${c.victimItem}, half walk out. (2) Profit from ${c.culpritItem} disappears, but ${c.victimItem} recovers from ${c.volumeAfter}/day back to ${c.volumeBefore}/day. (3) Net: profit ${net >= 0 ? 'UP' : 'DOWN'} approximately RM${Math.abs(net).toLocaleString()}/month. My suggestion: don't remove it — raise ${c.culpritItem} by RM1 and keep ${c.victimItem} as the budget option. Premium buyers pay more; regulars don't leave.`,
      projectedDeltaRm: -Math.abs(net),
      risks: [
        `Losing new customers who love ${c.culpritItem}`,
        'Menu becomes less socially-shareable',
      ],
    };
  }

  return {
    answer: `Hmm, kalau boss buang ${c.culpritItem}, tiga perkara akan jadi: (1) Pelanggan yang sekarang order ${c.culpritItem} mungkin separuh balik order ${c.victimItem}, separuh lagi pergi tempat lain. (2) Untung dari ${c.culpritItem} hilang, tapi ${c.victimItem} naik balik dari ${c.volumeAfter}/hari ke ${c.volumeBefore}/hari. (3) Net: untung ${net >= 0 ? 'NAIK' : 'TURUN'} anggaran RM${Math.abs(net).toLocaleString()}/bulan. Cadangan saya: jangan buang — naikkan harga ${c.culpritItem} RM1 dan kekal ${c.victimItem} sebagai pilihan murah. Pelanggan premium bayar lebih, pelanggan biasa tak lari.`,
    projectedDeltaRm: -Math.abs(net),
    risks: [
      `Kehilangan pelanggan baru yang suka ${c.culpritItem}`,
      'Menu jadi kurang menarik di media sosial',
    ],
  };
}

function varyRemoveItem(
  itemName: string,
  report: FullReport,
  locale: Locale
): WhatIfAnswer {
  const item = report.analytics.items.find((i) => i.name === itemName);
  if (!item) {
    return locale === 'en'
      ? { answer: `Couldn't find that item in your menu.`, projectedDeltaRm: null, risks: [] }
      : { answer: `Tak jumpa item tu dalam menu anda.`, projectedDeltaRm: null, risks: [] };
  }

  if (locale === 'en') {
    return {
      answer: `If boss removes ${itemName}, you lose approximately RM${item.monthlyProfit.toLocaleString()}/month in profit from that item. The bigger question: are there customers who come SPECIFICALLY for ${itemName}? If yes, they may stop coming altogether. Suggestion: rather than removing it, try limiting effort — smaller portions, or time-limited availability (e.g. Thu-Sat only). If you really must remove it, make sure there's a high-margin replacement ready.`,
      projectedDeltaRm: -Math.round(item.monthlyProfit * 0.7),
      risks: [
        `Regulars who come specifically for ${itemName} may stop visiting`,
        'Smaller menu = fewer options = potentially less foot traffic',
      ],
    };
  }

  return {
    answer: `Kalau boss buang ${itemName}, anda akan hilang anggaran RM${item.monthlyProfit.toLocaleString()}/bulan untung dari item itu. Soal yang lagi penting: ada pelanggan yang datang KHUSUS untuk ${itemName}? Kalau ya, mereka mungkin tak datang langsung. Cadangan: daripada buang, cuba kekalkan tapi kurangkan effort — portion lebih kecil, atau masa jualan terhad (contoh: hari Khamis-Sabtu sahaja). Kalau benar-benar nak buang, pastikan ada item pengganti yang margin tinggi.`,
    projectedDeltaRm: -Math.round(item.monthlyProfit * 0.7),
    risks: [
      `Pelanggan tetap yang datang khusus untuk ${itemName} mungkin berhenti`,
      'Menu jadi lebih kecil — kurang pilihan boleh bermakna kurang trafik',
    ],
  };
}

function varyAddItem(q: string, locale: Locale): WhatIfAnswer {
  const wantsCombo = /combo|bundle/.test(q);

  if (locale === 'en') {
    if (wantsCombo) {
      return {
        answer: `Combo bundling is the best way to raise ticket size without major cannibalization risk. Example for your warung: nasi lemak + teh + roti bakar at RM10 (10% bundled discount vs buying separately). Spread ingredient costs; customer feels the value. Estimated impact: +RM1,800/month if 15 combos/day sell. Test during breakfast 7-10am first, then expand if it works.`,
        projectedDeltaRm: 1800,
        risks: [
          "Per-combo margin is lower than individual sales — need volume to justify",
          'Operational complexity: how does the kitchen handle bundled orders?',
        ],
      };
    }
    return {
      answer: `For a warung like yours, the highest-potential new items are: nasi kerabu (high margin, simple ingredients, doesn't cannibalize nasi lemak since flavors differ) or a breakfast combo set. Estimated impact: +RM1,800/month. But WATCH OUT: adding 2+ new items at once can cannibalize each other — exactly what happened with the salted egg launch. Test one at a time, study 2 weeks, then add more.`,
      projectedDeltaRm: 1800,
      risks: [
        'New cannibalization with existing menu',
        'Ingredient costs for items that never take off',
      ],
    };
  }

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

function varyReduceCost(locale: Locale): WhatIfAnswer {
  if (locale === 'en') {
    return {
      answer: `To cut costs, focus on the 3 most expensive items: (1) Nasi lemak salted egg (52% cost) — switch to regular salted egg (20% cheaper) but reduce portion slightly. (2) Kuih-muih (45% cost) — buy direct from wholesale rather than retail, saves 15%. (3) Milo Dinosaur on Grab (delivery trap — already discussed). Total potential: RM900/month cost savings. Just don't drop quality enough that customers notice — leave nasi lemak ayam alone.`,
      projectedDeltaRm: 900,
      risks: ['Customers may notice the quality drop', 'New suppliers might be unreliable'],
    };
  }
  return {
    answer: `Nak kurangkan kos? Fokus pada 3 item dengan kos tertinggi: (1) Nasi lemak salted egg (kos 52%) — boleh tukar ke salted egg telur ayam (lebih murah 20%) tapi kurangkan portion. (2) Kuih-muih (kos 45%) — beli terus dari pembekal borong bukan retail boleh jimat 15%. (3) Milo Dinosaur di Grab (perangkap delivery) — dah bincang. Total potensi: RM900/bulan kurangan kos. Cuma jangan turunkan kualiti sampai pelanggan perasan — nasi lemak ayam jangan ubah.`,
    projectedDeltaRm: 900,
    risks: ['Pelanggan perasan kualiti turun', 'Pembekal baru mungkin tak stabil'],
  };
}

function rm(n: number): string {
  return n.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
