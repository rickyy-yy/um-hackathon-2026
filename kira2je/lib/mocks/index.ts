import type { InvoiceOcrResult, IngredientMappingResult, ReportData, WhatIfAnswer } from '../schemas';

export const DEMO_MONTHS = ['2026-02', '2026-03', '2026-04'];

export function mockInvoiceOcr(): InvoiceOcrResult {
  return {
    supplierName: 'Syarikat Pembekal Segar Sdn Bhd',
    invoiceDate: '2026-04-15',
    total: 1420.50,
    lineItems: [
      { description: 'Chicken breast (frozen) 20kg', quantity: 20, unit: 'kg', unitPrice: 18.50, total: 370.00 },
      { description: 'Basmati rice 50kg', quantity: 50, unit: 'kg', unitPrice: 5.20, total: 260.00 },
      { description: 'Coconut milk (ready pack) 24x200ml', quantity: 24, unit: 'pkt', unitPrice: 3.80, total: 91.20 },
      { description: 'Cooking oil 5L x 4', quantity: 4, unit: 'btl', unitPrice: 32.50, total: 130.00 },
      { description: 'Mixed vegetables 10kg', quantity: 10, unit: 'kg', unitPrice: 6.50, total: 65.00 },
      { description: 'Eggs (Grade A) 30 pcs x 4', quantity: 4, unit: 'tray', unitPrice: 15.20, total: 60.80 },
      { description: 'Packaging boxes 100pcs', quantity: 100, unit: 'pcs', unitPrice: 0.85, total: 85.00 },
      { description: 'Disposable cups 500pcs', quantity: 500, unit: 'pcs', unitPrice: 0.20, total: 100.00 },
      { description: 'Spices & condiments (assorted)', quantity: 1, unit: 'lot', unitPrice: 158.50, total: 158.50 },
      { description: 'Beverages concentrate x 10', quantity: 10, unit: 'btl', unitPrice: 10.00, total: 100.00 },
    ],
    confidence: 'high',
    missingInfo: [],
  };
}

export function mockMappingResult(): IngredientMappingResult {
  return {
    mappings: [
      { ingredient: 'Chicken breast (frozen)', supplier: 'Syarikat Pembekal Segar Sdn Bhd', quantity: '20kg', menuItems: ['Grilled Chicken Set', 'Chicken Rice', 'Chicken Chop'], confidence: 'high' },
      { ingredient: 'Basmati rice', supplier: 'Syarikat Pembekal Segar Sdn Bhd', quantity: '50kg', menuItems: ['Chicken Rice', 'Nasi Goreng Kampung', 'Nasi Lemak'], confidence: 'high' },
      { ingredient: 'Coconut milk (ready pack)', supplier: 'Syarikat Pembekal Segar Sdn Bhd', quantity: '24 packs', menuItems: ['Nasi Lemak', 'Laksa'], confidence: 'high' },
      { ingredient: 'Cooking oil', supplier: 'Syarikat Pembekal Segar Sdn Bhd', quantity: '20L', menuItems: ['Nasi Goreng Kampung', 'Chicken Chop', 'Grilled Chicken Set', 'Mee Goreng'], confidence: 'medium' },
      { ingredient: 'Mixed vegetables', supplier: 'Syarikat Pembekal Segar Sdn Bhd', quantity: '10kg', menuItems: ['Mee Goreng', 'Nasi Goreng Kampung'], confidence: 'medium' },
      { ingredient: 'Eggs (Grade A)', supplier: 'Syarikat Pembekal Segar Sdn Bhd', quantity: '120 pcs', menuItems: ['Nasi Goreng Kampung', 'Mee Goreng', 'Set Breakfast'], confidence: 'high' },
      { ingredient: 'Packaging boxes', supplier: 'Syarikat Pembekal Segar Sdn Bhd', quantity: '100 pcs', menuItems: ['Chicken Rice', 'Nasi Goreng Kampung', 'Takeaway orders'], confidence: 'low' },
      { ingredient: 'Beverages concentrate', supplier: 'Syarikat Pembekal Segar Sdn Bhd', quantity: '10 bottles', menuItems: ['Teh Tarik', 'Milo Dinosaur', 'Sirap'], confidence: 'medium' },
    ],
    unmappedIngredients: ['Spices & condiments (assorted)'],
    unmappedMenuItems: ['Laksa'],
  };
}

export function mockReportData(month: string = '2026-04'): ReportData {
  const isFeb = month === '2026-02';
  const isMar = month === '2026-03';

  const revenue = isFeb ? 28400 : isMar ? 31200 : 34850;
  const expenses = isFeb ? 19800 : isMar ? 21600 : 23900;
  const profit = revenue - expenses;
  const marginPct = Math.round((profit / revenue) * 1000) / 10;

  // Month-over-month changes
  const prevRevenue = isFeb ? null : isMar ? 28400 : 31200;
  const prevExpenses = isFeb ? null : isMar ? 19800 : 21600;
  const prevProfit = isFeb ? null : isMar ? 8600 : 9600;
  const prevMargin = isFeb ? null : isMar ? 30.3 : 30.8;

  const momRevenuePct = prevRevenue ? Math.round(((revenue - prevRevenue) / prevRevenue) * 1000) / 10 : null;
  const momExpensesPct = prevExpenses ? Math.round(((expenses - prevExpenses) / prevExpenses) * 1000) / 10 : null;
  const momProfitPct = prevProfit ? Math.round(((profit - prevProfit) / prevProfit) * 1000) / 10 : null;
  const momMarginPp = prevMargin ? Math.round((marginPct - prevMargin) * 10) / 10 : null;

  // Per-month top performers (slightly different mix to feel real)
  const topPerformers = isFeb
    ? [
        { item: 'Teh Tarik', revenue: 6800, estimatedCost: 2040, profit: 4760, marginPct: 70.0, profitContributionPct: 55.3 },
        { item: 'Chicken Rice', revenue: 5400, estimatedCost: 3240, profit: 2160, marginPct: 40.0, profitContributionPct: 25.1 },
        { item: 'Nasi Goreng Kampung', revenue: 4800, estimatedCost: 2976, profit: 1824, marginPct: 38.0, profitContributionPct: 21.2 },
        { item: 'Set Breakfast', revenue: 3800, estimatedCost: 2660, profit: 1140, marginPct: 30.0, profitContributionPct: 13.3 },
        { item: 'Mee Goreng', revenue: 2600, estimatedCost: 1612, profit: 988, marginPct: 38.0, profitContributionPct: 11.5 },
      ]
    : isMar
    ? [
        { item: 'Teh Tarik', revenue: 7200, estimatedCost: 2160, profit: 5040, marginPct: 70.0, profitContributionPct: 52.5 },
        { item: 'Grilled Chicken Set', revenue: 5600, estimatedCost: 3080, profit: 2520, marginPct: 45.0, profitContributionPct: 26.3 },
        { item: 'Chicken Rice', revenue: 5200, estimatedCost: 3120, profit: 2080, marginPct: 40.0, profitContributionPct: 21.7 },
        { item: 'Nasi Goreng Kampung', revenue: 4600, estimatedCost: 2852, profit: 1748, marginPct: 38.0, profitContributionPct: 18.2 },
        { item: 'Set Breakfast', revenue: 4000, estimatedCost: 2800, profit: 1200, marginPct: 30.0, profitContributionPct: 12.5 },
      ]
    : [
        { item: 'Grilled Chicken Set', revenue: 8400, estimatedCost: 4620, profit: 3780, marginPct: 45.0, profitContributionPct: 34.5 },
        { item: 'Chicken Rice', revenue: 6200, estimatedCost: 3720, profit: 2480, marginPct: 40.0, profitContributionPct: 22.6 },
        { item: 'Nasi Goreng Kampung', revenue: 5800, estimatedCost: 3596, profit: 2204, marginPct: 38.0, profitContributionPct: 20.1 },
        { item: 'Set Breakfast', revenue: 4600, estimatedCost: 3036, profit: 1564, marginPct: 34.0, profitContributionPct: 14.3 },
        { item: 'Mee Goreng', revenue: 3200, estimatedCost: 2240, profit: 960, marginPct: 30.0, profitContributionPct: 8.8 },
      ];

  const narrative = isFeb
    ? 'February set the baseline. Revenue came in at RM 28,400 with a 30.3% margin — healthy for a café at this stage. Teh Tarik anchored the beverage category at 70% margin, while Chicken Rice and Nasi Goreng drove dine-in volume. No major cost shocks this month; ingredient prices were stable across all suppliers. The kitchen ran efficiently, keeping overhead at 9% of expenses.'
    : isMar
    ? 'March was a growth month — revenue rose 9.9% to RM 31,200, and margin held at 30.8%. The new Grilled Chicken Set launched mid-month and immediately became a top seller, attracting higher-spending customers. However, Supplier Syarikat Pembekal Segar raised chicken breast prices 8.2% mid-month, which began compressing margins on protein-heavy dishes. The beverage category continued to carry strong margins and offset part of the ingredient cost increase.'
    : 'April was your strongest month yet. Revenue climbed 11.7% to RM 34,850, powered by Grilled Chicken Set demand and steady breakfast trade. Rising ingredient costs — chicken breast up 8.2% and cooking oil up 4.1% — put pressure on Mee Goreng, whose margin slipped from 38% to 30%. The good news: your overall margin improved to 31.4%, the best in three months, because the high-margin Grilled Chicken Set now makes up a larger share of sales. Laksa remains a drag at 8 orders per week — barely covering its prep cost.';

  const insightBanner = isFeb
    ? 'Strong baseline: 30.3% margin with no supplier cost pressure. Track ingredient prices monthly to catch increases early.'
    : isMar
    ? 'Chicken costs rose 8.2% mid-month — your chicken dishes collectively lost ~RM 380 in margin. Grilled Chicken Set launch offset the damage.'
    : 'Grilled Chicken Set generated 34.5% of your total profit this month. A RM 2 price increase could add RM 1,260/month with minimal volume risk.';

  return {
    monthView: {
      summary: {
        totalRevenue: revenue,
        totalExpenses: expenses,
        estimatedProfit: profit,
        marginPct,
        momRevenuePct,
        momExpensesPct,
        momProfitPct,
        momMarginPp,
      },
      topPerformers,
      costBreakdown: [
        { category: 'Ingredients', amount: Math.round(expenses * 0.68), pctOfTotal: 68 },
        { category: 'Packaging', amount: Math.round(expenses * 0.12), pctOfTotal: 12 },
        { category: 'Delivery commission', amount: Math.round(expenses * 0.11), pctOfTotal: 11 },
        { category: 'Overhead', amount: Math.round(expenses * 0.09), pctOfTotal: 9 },
      ],
      atRiskItems: isFeb
        ? [{ item: 'Laksa', reason: 'Low volume — 6 orders/week is not covering fixed prep and coconut milk spoilage' }]
        : isMar
        ? [
            { item: 'Chicken Chop', reason: 'Chicken price increase cut margin from 22% to 14% this month' },
            { item: 'Laksa', reason: 'Only 7 orders/week. Coconut milk spoilage alone costs RM 160/month' },
          ]
        : [
            { item: 'Mee Goreng', reason: 'Margin dropped from 38% to 30% — ingredient costs up 12% with no price adjustment' },
            { item: 'Laksa', reason: 'Only 8 orders/week. Coconut milk spoilage costs RM 180/month. Remove or set a minimum order day' },
          ],
      recommendations: isFeb
        ? [
            { rank: 1, title: 'Bundle Teh Tarik with meals', description: 'Your beverage margin is 70%. A RM 1 discount on Teh Tarik when bundled with any main increases attachment rate and overall ticket size.', estimatedMonthlyImpactRm: 580, riskLevel: 'low' },
            { rank: 2, title: 'Remove Laksa or set a Friday-only day', description: 'Only 6 orders/week at current pace. Coconut milk spoilage alone costs RM 160/month. Test removing it for one month and redirect prep time to Chicken Rice.', estimatedMonthlyImpactRm: 640, riskLevel: 'medium' },
          ]
        : isMar
        ? [
            { rank: 1, title: 'Raise Grilled Chicken Set by RM 1.50', description: 'Launched this month and already your #2 seller. Customers paying RM 22 are not price-sensitive. A RM 1.50 increase is unlikely to cause more than 5% volume drop.', estimatedMonthlyImpactRm: 840, riskLevel: 'low' },
            { rank: 2, title: 'Negotiate chicken price — you\'re buying 80kg/month', description: 'At RM 18.50/kg you\'re paying retail. 80kg/month is enough volume to negotiate RM 15–16/kg wholesale. Saves ~RM 200/month on protein alone.', estimatedMonthlyImpactRm: 640, riskLevel: 'low' },
            { rank: 3, title: 'Remove Laksa from the menu', description: 'Only 7 orders/week — barely covering ingredient cost. Remove it, redirect capacity to Chicken Rice.', estimatedMonthlyImpactRm: 480, riskLevel: 'medium' },
          ]
        : [
            { rank: 1, title: 'Raise Grilled Chicken Set by RM 2', description: 'Already your top performer at 45% margin and 34.5% of total profit. Customers ordering RM 22 sets are price-insensitive — a 10% volume drop still leaves you net positive. This is your single highest-leverage price move.', estimatedMonthlyImpactRm: 1260, riskLevel: 'low' },
            { rank: 2, title: 'Add RM 0.50 packaging fee on all takeaway', description: 'Packaging is 12% of your costs (RM 2,868/month). At ~120 takeaway orders/day, a RM 0.50 fee recovers RM 1,800/month. Frame it as "eco-packaging" — customers accept it.', estimatedMonthlyImpactRm: 1800, riskLevel: 'low' },
            { rank: 3, title: 'Renegotiate chicken price', description: 'You\'re buying 80kg/month at RM 18.50/kg — retail pricing. At this volume you should be at RM 15–16/kg. A 2-supplier comparison call is all it takes. Saves ~RM 200–280/month immediately.', estimatedMonthlyImpactRm: 640, riskLevel: 'low' },
            { rank: 4, title: 'Remove Laksa or set a Thursday-only day', description: 'Only 8 orders/week. Coconut milk spoilage alone costs RM 180/month. Remove it entirely or test a "Laksa Thursdays" campaign to push volume to 20+ orders. Anything below 15/week doesn\'t cover prep time.', estimatedMonthlyImpactRm: 840, riskLevel: 'medium' },
          ],
      narrative,
      insightBanner,
    },
    trendsView: {
      summary: {
        avgMarginPct: isFeb ? 30.3 : isMar ? 30.6 : 30.8,
        marginTrendPct: isFeb ? 0 : isMar ? 1.7 : 3.7,
        revenueTrendPct: isFeb ? 0 : isMar ? 9.9 : 22.7,
        monthsAnalysed: isFeb ? 1 : isMar ? 2 : 3,
      },
      marginOverTime: isFeb
        ? [{ month: 'Feb 2026', marginPct: 30.3, revenue: 28400, expenses: 19800 }]
        : isMar
        ? [
            { month: 'Feb 2026', marginPct: 30.3, revenue: 28400, expenses: 19800 },
            { month: 'Mar 2026', marginPct: 30.8, revenue: 31200, expenses: 21600 },
          ]
        : [
            { month: 'Feb 2026', marginPct: 30.3, revenue: 28400, expenses: 19800 },
            { month: 'Mar 2026', marginPct: 30.8, revenue: 31200, expenses: 21600 },
            { month: 'Apr 2026', marginPct: 31.4, revenue: 34850, expenses: 23900 },
          ],
      supplierPriceChanges:
        month >= '2026-03'
          ? [
              { supplier: 'Syarikat Pembekal Segar Sdn Bhd', item: 'Chicken breast', changePct: 8.2, period: 'Feb–Mar 2026' },
              { supplier: 'Syarikat Pembekal Segar Sdn Bhd', item: 'Cooking oil', changePct: 4.1, period: 'Mar–Apr 2026' },
            ]
          : [],
      cannibalization: {
        detected: month >= '2026-04',
        alerts:
          month >= '2026-04'
            ? [
                {
                  newItem: 'Grilled Chicken Set',
                  affectedItem: 'Chicken Rice',
                  salesDropPct: 22,
                  netCategoryGrowthPct: 18,
                  detail: 'Chicken Rice orders dropped 22% since Grilled Chicken Set launched in March. Net chicken category revenue is up 18% — the premium item attracts new customers but pulls some regulars away from the cheaper dish.',
                },
              ]
            : [],
      },
      monthOverMonth:
        month >= '2026-03'
          ? [
              { metric: 'Revenue', current: revenue, previous: isMar ? 28400 : 31200, changePct: isMar ? 9.9 : 11.7 },
              { metric: 'Expenses', current: expenses, previous: isMar ? 19800 : 21600, changePct: isMar ? 9.1 : 10.6 },
              { metric: 'Profit', current: profit, previous: isMar ? 8600 : 9600, changePct: isMar ? 11.6 : 14.1 },
              { metric: 'Margin %', current: marginPct, previous: isMar ? 30.3 : 30.8, changePct: isMar ? 1.7 : 2.0 },
            ]
          : [],
    },
  };
}

export function mockWhatIf(question: string): WhatIfAnswer {
  const q = question.toLowerCase();
  if (/raise|naik.*harga|harga.*naik|price|RM\s*\d/.test(q)) {
    return {
      answer: 'Based on your April data, a price increase on Grilled Chicken Set from RM 22 to RM 24 (+RM 2) would add approximately RM 1,260/month if volume drops by 10% — and likely less. Your regulars have been ordering it consistently for 2 months. For Mee Goreng, avoid raising price until you fix the cost structure — it already sells below category average margin.',
      projectedDeltaRm: 1260,
      risks: ['New delivery customers may filter by price', 'GrabFood ranking could dip slightly in the first week'],
    };
  }
  if (/remove|buang|laksa|stop/.test(q)) {
    return {
      answer: 'Removing Laksa would save RM 180/month in coconut milk spoilage and free up 45 minutes of daily prep time. The 8 customers/week who order it represent only 0.3% of total revenue. Redirect that prep time to Grilled Chicken Set or Chicken Rice — both have 3–5x the volume. Risk: you may lose a few loyal Laksa regulars, but the math is clear.',
      projectedDeltaRm: 840,
      risks: ['Lose Laksa-loyal customers', 'Slightly reduced menu diversity'],
    };
  }
  if (/packaging|kotak|fee|charge/.test(q)) {
    return {
      answer: 'A RM 0.50 packaging fee on takeaway recovers RM 1,800/month at 120 daily takeaway orders. Frame it as "eco-friendly packaging" — studies in Malaysian F&B show <5% order drop when framed this way. Your packaging cost is currently RM 2,868/month (12% of expenses), so this nearly halves the burden. Recommend testing on GrabFood first before dine-in.',
      projectedDeltaRm: 1800,
      risks: ['Some delivery customers may switch to competitors', 'Requires menu update on delivery platforms'],
    };
  }
  if (/deliver|grab|shopee|commission/.test(q)) {
    return {
      answer: 'Your delivery commission is 11% of revenue (RM 3,834/month). Strategy: raise all delivery menu prices by 15–20% above dine-in, and remove low-margin items (Set Breakfast, Mee Goreng) from delivery entirely. Estimated net gain after accounting for some volume drop: +RM 1,200/month. Your Grilled Chicken Set at 45% margin can absorb delivery commission and still be profitable.',
      projectedDeltaRm: 1200,
      risks: ["GrabFood's algorithm may deprioritize your listing", 'Some delivery customers won\'t convert to dine-in'],
    };
  }
  if (/chicken|ayam|supplier|pembekal/.test(q)) {
    return {
      answer: 'You\'re buying 80kg of chicken breast/month at RM 18.50/kg — that\'s retail pricing. At this volume, a wholesale contract should get you RM 15–16/kg. One comparison call to a second supplier could save RM 200–280/month permanently. Given that chicken costs rose 8.2% in March, locking in a wholesale rate now hedges against further increases.',
      projectedDeltaRm: 640,
      risks: ['New supplier may have inconsistent quality initially', 'Minimum order requirements may apply'],
    };
  }
  return {
    answer: `Good question. Your current position: RM 34,850 revenue, 31.4% margin, trending upward for 3 months. Any change should be tested for 2–3 weeks before committing. Could you be more specific? For example: "What if I raise Grilled Chicken Set by RM 2?" or "What if I remove Laksa?" — I can model the projected impact with your actual April numbers.`,
    projectedDeltaRm: null,
    risks: ['Changes without clear data often cost more than they save'],
  };
}
