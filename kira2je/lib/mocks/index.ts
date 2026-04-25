import type { InvoiceOcrResult, IngredientMappingResult, ReportData, WhatIfAnswer } from '../schemas';

// ─── Sample multi-month data (for demo / hackathon) ──────────────────────────

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
      {
        ingredient: 'Chicken breast (frozen)',
        supplier: 'Syarikat Pembekal Segar Sdn Bhd',
        quantity: '20kg',
        menuItems: ['Grilled Chicken Set', 'Chicken Rice', 'Chicken Chop'],
        confidence: 'high',
      },
      {
        ingredient: 'Basmati rice',
        supplier: 'Syarikat Pembekal Segar Sdn Bhd',
        quantity: '50kg',
        menuItems: ['Chicken Rice', 'Nasi Goreng Kampung', 'Nasi Lemak'],
        confidence: 'high',
      },
      {
        ingredient: 'Coconut milk (ready pack)',
        supplier: 'Syarikat Pembekal Segar Sdn Bhd',
        quantity: '24 packs',
        menuItems: ['Nasi Lemak', 'Laksa'],
        confidence: 'high',
      },
      {
        ingredient: 'Cooking oil',
        supplier: 'Syarikat Pembekal Segar Sdn Bhd',
        quantity: '20L',
        menuItems: ['Nasi Goreng Kampung', 'Chicken Chop', 'Grilled Chicken Set', 'Mee Goreng'],
        confidence: 'medium',
      },
      {
        ingredient: 'Mixed vegetables',
        supplier: 'Syarikat Pembekal Segar Sdn Bhd',
        quantity: '10kg',
        menuItems: ['Mee Goreng', 'Nasi Goreng Kampung'],
        confidence: 'medium',
      },
      {
        ingredient: 'Eggs (Grade A)',
        supplier: 'Syarikat Pembekal Segar Sdn Bhd',
        quantity: '120 pcs',
        menuItems: ['Nasi Goreng Kampung', 'Mee Goreng', 'Set Breakfast'],
        confidence: 'high',
      },
      {
        ingredient: 'Packaging boxes',
        supplier: 'Syarikat Pembekal Segar Sdn Bhd',
        quantity: '100 pcs',
        menuItems: ['Chicken Rice', 'Nasi Goreng Kampung', 'Takeaway orders'],
        confidence: 'low',
      },
      {
        ingredient: 'Beverages concentrate',
        supplier: 'Syarikat Pembekal Segar Sdn Bhd',
        quantity: '10 bottles',
        menuItems: ['Teh Tarik', 'Milo Dinosaur', 'Sirap'],
        confidence: 'medium',
      },
    ],
    unmappedIngredients: ['Spices & condiments (assorted)'],
    unmappedMenuItems: ['Laksa'],
  };
}

export function mockReportData(month: string = '2026-04'): ReportData {
  // Build month-over-month for trends (fake 3 months)
  const isFeb = month === '2026-02';
  const isMar = month === '2026-03';

  const revenue = isFeb ? 28400 : isMar ? 31200 : 34850;
  const expenses = isFeb ? 19800 : isMar ? 21600 : 23900;
  const profit = revenue - expenses;
  const marginPct = Math.round((profit / revenue) * 100 * 10) / 10;

  return {
    monthView: {
      summary: {
        totalRevenue: revenue,
        totalExpenses: expenses,
        estimatedProfit: profit,
        marginPct,
      },
      topPerformers: [
        { item: 'Grilled Chicken Set', revenue: 8400, estimatedCost: 4620, profit: 3780, marginPct: 45.0 },
        { item: 'Chicken Rice', revenue: 6200, estimatedCost: 3720, profit: 2480, marginPct: 40.0 },
        { item: 'Nasi Goreng Kampung', revenue: 5800, estimatedCost: 3596, profit: 2204, marginPct: 38.0 },
        { item: 'Set Breakfast', revenue: 4600, estimatedCost: 3036, profit: 1564, marginPct: 34.0 },
        { item: 'Mee Goreng', revenue: 3200, estimatedCost: 2240, profit: 960, marginPct: 30.0 },
      ],
      costBreakdown: [
        { category: 'Ingredients', amount: Math.round(expenses * 0.68), pctOfTotal: 68 },
        { category: 'Packaging', amount: Math.round(expenses * 0.12), pctOfTotal: 12 },
        { category: 'Delivery commission', amount: Math.round(expenses * 0.11), pctOfTotal: 11 },
        { category: 'Overhead', amount: Math.round(expenses * 0.09), pctOfTotal: 9 },
      ],
      atRiskItems: [
        { item: 'Mee Goreng', reason: 'Margin dropped from 38% to 30% — ingredient costs up 12%' },
        { item: 'Laksa', reason: 'Low volume (8 orders/week) — not covering fixed prep cost' },
      ],
      recommendations: [
        {
          rank: 1,
          title: 'Raise Grilled Chicken Set by RM2',
          description: 'Already your top performer at 45% margin. Customers ordering RM22 sets are price-insensitive — even 10% drop in volume keeps you net positive.',
          estimatedMonthlyImpactRm: 1260,
        },
        {
          rank: 2,
          title: 'Remove Laksa or set a minimum order day',
          description: 'Only 8 orders/week. Coconut milk spoilage alone costs RM180/month. Either hit 20 orders/day or remove it and redirect that capacity to Chicken Rice.',
          estimatedMonthlyImpactRm: 840,
        },
        {
          rank: 3,
          title: 'Renegotiate chicken price — you\'re buying 80kg/month',
          description: 'At RM18.50/kg from Syarikat Pembekal Segar, you\'re paying retail. 80kg/month should get you RM15-16/kg wholesale. Saves ~RM200/month on protein alone.',
          estimatedMonthlyImpactRm: 640,
        },
        {
          rank: 4,
          title: 'Add packaging fee on takeaway orders',
          description: 'Packaging is 12% of your costs (RM2,868/month). RM0.50 per takeaway order at 120 orders/day = RM1,800/month recovered.',
          estimatedMonthlyImpactRm: 1800,
        },
      ],
    },
    trendsView: {
      summary: {
        avgMarginPct: isFeb ? 30.3 : isMar ? 30.8 : 31.4,
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
                  detail: 'Chicken Rice orders down 22% since Grilled Chicken Set launched in March. Net category revenue +18% — premium item attracts new customers but pulls some from Chicken Rice.',
                },
              ]
            : [],
      },
      monthOverMonth:
        month >= '2026-03'
          ? [
              { metric: 'Revenue', current: revenue, previous: isMar ? 28400 : 31200, changePct: isMar ? 9.9 : 11.7 },
              { metric: 'Expenses', current: expenses, previous: isMar ? 19800 : 21600, changePct: isMar ? 9.1 : 10.6 },
              { metric: 'Profit', current: profit, previous: isMar ? 8600 : 9600, changePct: isMar ? 11.6 : 14.6 },
              { metric: 'Margin %', current: marginPct, previous: isMar ? 30.3 : 30.8, changePct: isMar ? 1.7 : 2.0 },
            ]
          : [],
    },
  };
}

export function mockWhatIf(question: string): WhatIfAnswer {
  const q = question.toLowerCase();
  if (/raise|naik.*harga|harga.*naik/.test(q)) {
    return {
      answer: 'Based on your current margins, a price increase of RM1–2 on your top performers (Grilled Chicken Set, Chicken Rice) would add approximately RM800–1,200/month in profit. Volume drop risk is low for premium items — your regulars are loyal. Avoid raising Mee Goreng or Set Breakfast where customers are more price-sensitive.',
      projectedDeltaRm: 1000,
      risks: ['New customers may be deterred', 'Delivery platform ranking could drop slightly'],
    };
  }
  if (/remove|buang|laksa/.test(q)) {
    return {
      answer: 'Removing Laksa would save RM180/month in ingredient waste and free up kitchen prep time. The risk is losing the 8 customers/week who specifically come for it — but at current volume, the math says remove it. Redirect capacity to Chicken Rice which has a healthier margin and 5x the volume.',
      projectedDeltaRm: 840,
      risks: ['Lose Laksa loyalists', 'Menu appears less diverse'],
    };
  }
  if (/deliver|grab|foodpanda/.test(q)) {
    return {
      answer: 'Your delivery commission is eating 11% of revenue (RM3,834/month). Strategy: raise delivery prices by 15-20% above dine-in, and pull low-margin items (Set Breakfast) from apps. Estimated net gain after volume drop: +RM1,200/month.',
      projectedDeltaRm: 1200,
      risks: ['GrabFood ranking may drop', 'Some delivery customers won\'t convert to dine-in'],
    };
  }
  return {
    answer: `Interesting question. With your current margin at ${Math.round(31.4)}% and revenue trending up 22% over 3 months, any change should be tested for 2–3 weeks before committing. Could you be more specific? For example: "What if I remove Laksa?" or "What if I raise Grilled Chicken by RM2?"`,
    projectedDeltaRm: null,
    risks: ['Changes without data often cost more than they save'],
  };
}
