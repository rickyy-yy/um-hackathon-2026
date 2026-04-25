import type { Locale } from './i18n/dictionary';

const SYSTEM = {
  en: 'You are Kira2 je, an AI financial analyst for Malaysian F&B businesses. You are professional but approachable — like a smart business advisor who genuinely wants the operator to succeed. Be specific with numbers. Always use RM. No financial jargon.',
  bm: 'Anda adalah Kira2 je, analis kewangan AI untuk perniagaan F&B Malaysia. Anda profesional tetapi mesra — seperti penasihat perniagaan yang bijak yang benar-benar mahu pengusaha berjaya. Spesifik dengan nombor. Sentiasa guna RM. Tiada jargon kewangan.',
};

export function systemPrompt(locale: Locale): string {
  return SYSTEM[locale] ?? SYSTEM.en;
}

export function invoiceOcrPrompt(locale: Locale, noisyOcr = false): string {
  const noiseNote = noisyOcr
    ? `\n\nNOTE: Text below is from Tesseract OCR on a physical invoice — expect noise. Apply corrections: 'o'→'0', 'l'→'1', 'B'→'8', 'S'→'5', 'é'→'6'. Extract all numeric rows even if supplier name is unclear.`
    : '';

  if (locale === 'bm') {
    return `Anda menganalisis gambar invois pembekal Malaysia (boleh dalam BM, Inggeris, atau campuran).

Ekstrak data dan kembalikan JSON:
{
  "supplierName": "...",
  "invoiceDate": "YYYY-MM-DD",
  "total": <number or null>,
  "lineItems": [{ "description": "...", "quantity": <number>, "unit": "kg/pcs/btl/etc", "unitPrice": <number>, "total": <number> }],
  "confidence": "high" | "medium" | "low",
  "missingInfo": ["..."]
}

Fokus: nama pembekal, tarikh, jumlah akhir, dan setiap item baris dengan harga. Jika sesuatu tidak jelas, masukkan dalam missingInfo.${noiseNote}`;
  }

  return `You are analyzing a photo of a Malaysian supplier invoice (may be in BM, English, or mixed).

Extract the data and return as JSON:
{
  "supplierName": "...",
  "invoiceDate": "YYYY-MM-DD",
  "total": <number or null>,
  "lineItems": [{ "description": "...", "quantity": <number>, "unit": "kg/pcs/btl/etc", "unitPrice": <number>, "total": <number> }],
  "confidence": "high" | "medium" | "low",
  "missingInfo": ["..."]
}

Focus on: supplier name, date, final total, and each line item with pricing. If something is unclear, note it in missingInfo.${noiseNote}`;
}

export function ingredientMappingPrompt(
  invoiceItems: unknown[],
  menuItems: string[],
  savedMappings: unknown[],
  locale: Locale
): string {
  if (locale === 'bm') {
    return `Anda adalah Kira2 je. Berdasarkan item invois dan item menu, infersikan bahan mana diperlukan untuk hidangan mana.

Item invois: ${JSON.stringify(invoiceItems)}
Item menu: ${JSON.stringify(menuItems)}
Pemetaan yang disimpan sebelumnya: ${JSON.stringify(savedMappings)}

Kembalikan JSON:
{
  "mappings": [
    {
      "ingredient": "nama bahan dari invois",
      "supplier": "nama pembekal",
      "quantity": "kuantiti dari invois",
      "menuItems": ["item menu 1", "item menu 2"],
      "confidence": "high" | "medium" | "low"
    }
  ],
  "unmappedIngredients": ["bahan yang tiada padanan"],
  "unmappedMenuItems": ["item menu yang tiada padanan bahan"]
}

Gunakan konteks M'sia: ayam = ayam goreng, nasi lemak, nasi ayam, dll. Santan = nasi lemak, laksa, dll.`;
  }

  return `You are Kira2 je. Given invoice line items and menu items, infer which ingredients are used in which dishes.

Invoice items: ${JSON.stringify(invoiceItems)}
Menu items: ${JSON.stringify(menuItems)}
Previously confirmed mappings: ${JSON.stringify(savedMappings)}

Return as JSON:
{
  "mappings": [
    {
      "ingredient": "ingredient name from invoice",
      "supplier": "supplier name",
      "quantity": "quantity from invoice",
      "menuItems": ["menu item 1", "menu item 2"],
      "confidence": "high" | "medium" | "low"
    }
  ],
  "unmappedIngredients": ["ingredients with no match"],
  "unmappedMenuItems": ["menu items with no ingredient match"]
}

Use Malaysian F&B context: chicken → ayam goreng, nasi lemak, nasi ayam, etc. Coconut milk → nasi lemak, laksa, etc.`;
}

export function reportMonthViewPrompt(
  salesData: unknown,
  expenseData: unknown,
  mappings: unknown,
  locale: Locale,
  menuItemOverrides?: unknown
): string {
  const lang = locale === 'bm' ? 'Bahasa Malaysia (BM)' : 'English';
  const overrideNote = menuItemOverrides && JSON.stringify(menuItemOverrides) !== '[]'
    ? `\nMenu item overrides: ${JSON.stringify(menuItemOverrides).slice(0, 500)}
- type "service": fee/service item with no COGS — count revenue separately as "Other revenue", marginPct = 100
- type "manual": use manualCost (RM per unit) as COGS instead of invoice data\n`
    : '';
  return `You are Kira2 je, an AI financial analyst for Malaysian F&B businesses. Language: ${lang}

Sales data (current month): ${JSON.stringify(salesData).slice(0, 3000)}
Expense data (confirmed invoices): ${JSON.stringify(expenseData).slice(0, 2000)}
Ingredient-to-menu mappings: ${JSON.stringify(mappings).slice(0, 1000)}${overrideNote}

Return ONLY this JSON — no explanation:
{
  "summary": { "totalRevenue": number, "totalExpenses": number, "estimatedProfit": number, "marginPct": number },
  "topPerformers": [{ "item": string, "revenue": number, "estimatedCost": number, "profit": number, "marginPct": number }],
  "costBreakdown": [{ "category": string, "amount": number, "pctOfTotal": number }],
  "atRiskItems": [{ "item": string, "reason": string, "revenue": number | null, "profit": number | null, "marginPct": number | null }],
  "recommendations": [{ "rank": number, "title": string, "description": string, "estimatedMonthlyImpactRm": number }]
}

Rules:
- totalExpenses = sum of ALL confirmed invoice totals (ingredients AND non-ingredient costs)
- costBreakdown = one entry per individual ingredient, sorted by amount descending; use the ingredient name as "category"; pctOfTotal = that ingredient's cost as % of totalExpenses; exclude non-ingredient costs entirely from this list
- topPerformers and COGS allocation only apply to menu items with mapped ingredients; leave COGS null for unmapped items
- exact RM amounts, actual item names, all text in ${lang}

Recommendations must be SPECIFIC and ACTIONABLE — not generic advice. Each recommendation must:
1. Name the exact menu item, ingredient, or supplier from the data (never say "a popular item" — say the actual name)
2. Include real numbers calculated from the data: exact RM amounts, quantities sold, margins, percentages
3. State a concrete action the operator can take THIS WEEK (raise price by RM X, call supplier Y, remove item Z, bundle A with B)
4. Explain the "why" in one sentence using actual figures from the data
5. Give a realistic estimatedMonthlyImpactRm based on actual volume × price/cost delta

Good recommendation examples (follow this style):
- "Raise [Item Name] by RM 1.50 — it's your #2 seller at [X] orders/month with a [Y]% margin. Customers at this price point are not sensitive to small increases; a RM 1.50 raise on [X] orders = RM [X×1.50] extra/month."
- "Bundle [High-margin item] with [Popular item] at RM 1 off — your [item] margin is [Y]%. A bundled discount drives attachment without hurting profit: estimated +RM [Z]/month from higher ticket size."
- "Negotiate [ingredient] price — you bought [Xkg] from [Supplier] this month at RM [Y]/kg. At this volume, wholesale rate of RM [Y-2]/kg is achievable. Saves RM [(Y-Y+2)×X]/month."
- "Consider removing [Low-volume item] — only [N] orders this month, lowest in the menu. Ingredient [X] used only here costs RM [Y]/month in waste. Redirect prep time to [Top seller]."

Write 3 recommendations ranked by impact. Be a blunt advisor — tell them what to do, not what to "consider".`;

}

export function reportTrendsViewPrompt(
  currentMonthSummary: unknown,
  historicalData: unknown,
  locale: Locale
): string {
  const lang = locale === 'bm' ? 'Bahasa Malaysia (BM)' : 'English';
  const hist = historicalData ? JSON.stringify(historicalData).slice(0, 3000) : 'null';
  return `You are Kira2 je, an AI financial analyst for Malaysian F&B businesses. Language: ${lang}

Current month summary: ${JSON.stringify(currentMonthSummary)}
Historical data (previous months, newest first): ${hist}

Return ONLY this JSON — no explanation:
{
  "summary": { "avgMarginPct": number, "marginTrendPct": number, "revenueTrendPct": number, "monthsAnalysed": number },
  "marginOverTime": [{ "month": string, "marginPct": number, "revenue": number, "expenses": number }],
  "supplierPriceChanges": [{ "supplier": string, "item": string, "changePct": number, "period": string }],
  "cannibalization": { "detected": boolean, "alerts": [{ "newItem": string, "affectedItem": string, "salesDropPct": number, "netCategoryGrowthPct": number, "detail": string }] },
  "monthOverMonth": [{ "metric": string, "current": number, "previous": number, "changePct": number }]
}

Rules:
- monthsAnalysed = number of months with ANY data (invoice or sales), even non-consecutive
- If only 1 data point total, return empty arrays for all time-series fields
- Months with ONLY expenses (no revenue): include in marginOverTime with revenue=0 and in supplierPriceChanges — these months still show cost trends
- Months with ONLY revenue (no expenses): include in marginOverTime with expenses=0 — still shows revenue movement
- Gaps between months are fine — calculate trends across whatever data points exist; in descriptions say "over the X months we have data for" not "monthly"
- revenueTrendPct and marginTrendPct: compare earliest vs latest available data point (not just last two months)
- supplierPriceChanges: only fill if the same supplier/item appears in multiple months
- Cannibalization only if 3+ months show correlated sales movement
- Never use financial jargon — say "your costs have risen X%" not "CAGR" or "compound growth"
- All text in ${lang}`;
}

/** @deprecated use reportMonthViewPrompt + reportTrendsViewPrompt in parallel */
export function reportPrompt(
  salesData: unknown,
  expenseData: unknown,
  mappings: unknown,
  historicalData: unknown,
  locale: Locale
): string {
  return reportMonthViewPrompt(salesData, expenseData, mappings, locale) +
    '\n\n---\n\n' +
    reportTrendsViewPrompt({}, historicalData, locale);
}

export function posColumnMappingPrompt(headers: string[], sampleRows: Record<string, unknown>[]): string {
  return `You are analysing a POS or sales data spreadsheet export from a Malaysian F&B business.

Column headers: ${JSON.stringify(headers)}

Sample rows (first ${sampleRows.length}):
${JSON.stringify(sampleRows, null, 2)}

Identify which column name contains each field. Use null if no column matches.
"isAggregated" should be true ONLY if each row is already a totalled summary per item (not individual transactions).

Return ONLY this JSON — no explanation:
{
  "itemNameCol":   "exact column name or null",
  "quantityCol":   "exact column name or null",
  "unitPriceCol":  "exact column name or null",
  "dateCol":       "exact column name or null",
  "categoryCol":   "exact column name or null",
  "channelCol":    "exact column name or null",
  "isRefundedCol": "exact column name or null",
  "isAggregated":  false,
  "confidence":    "high" | "medium" | "low"
}`;
}

export function whatIfPrompt(
  monthView: unknown,
  trendsView: unknown,
  question: string,
  locale: Locale
): string {
  const lang = locale === 'bm' ? 'Bahasa Malaysia (BM)' : 'English';

  return `You are Kira2 je. The operator is asking a "what if" question about their business.

Current month summary: ${JSON.stringify(monthView)}
Trends summary: ${JSON.stringify(trendsView)}

Question: "${question}"

Reason step by step:
1. How would this affect sales volume?
2. How would costs/margins change?
3. Is there a cannibalization risk?
4. Estimated RM impact per month?

Return JSON: { "answer": "...", "projectedDeltaRm": number or null, "risks": ["..."] }

Answer in ${lang}. Be specific with RM numbers. Be honest about uncertainty.`;
}
