import { z } from 'zod';

// ─── Invoice OCR ─────────────────────────────────────────────────────────────

export const InvoiceLineItem = z.object({
  description: z.string(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  unitPrice: z.number().optional(),
  total: z.number().optional(),
});
export type InvoiceLineItem = z.infer<typeof InvoiceLineItem>;

export const InvoiceOcrResult = z.object({
  supplierName: z.string().nullable(),
  invoiceDate: z.string().nullable(), // "YYYY-MM-DD"
  total: z.number().nullable(),
  lineItems: z.array(InvoiceLineItem),
  confidence: z.enum(['high', 'medium', 'low']),
  missingInfo: z.array(z.string()),
});
export type InvoiceOcrResult = z.infer<typeof InvoiceOcrResult>;

// ─── POS / Sales ─────────────────────────────────────────────────────────────

export const SalesRow = z.object({
  itemName: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  date: z.string().optional(), // "YYYY-MM-DD"
  category: z.string().optional(),
  channel: z.string().optional(), // "dine-in" | "takeaway" | "grab" | etc.
});
export type SalesRow = z.infer<typeof SalesRow>;

// ─── Ingredient Mapping ───────────────────────────────────────────────────────

export const MappingProposal = z.object({
  ingredient: z.string(),
  supplier: z.string().optional(),
  quantity: z.union([z.string(), z.number()]).transform((v) => String(v)).optional(),
  unitCost: z.number().optional(),
  portionsPerUnit: z.number().optional(),
  costPerPortion: z.number().optional(),
  menuItemPortions: z.record(z.string(), z.number()).optional(),
  menuItems: z.array(z.string()),
  confidence: z.enum(['high', 'medium', 'low']),
});
export type MappingProposal = z.infer<typeof MappingProposal>;

export const IngredientMappingResult = z.object({
  mappings: z.array(MappingProposal),
  unmappedIngredients: z.array(z.string()),
  unmappedMenuItems: z.array(z.string()),
});
export type IngredientMappingResult = z.infer<typeof IngredientMappingResult>;

// ─── Report Views ─────────────────────────────────────────────────────────────

export const TopPerformer = z.object({
  item: z.string(),
  revenue: z.number(),
  estimatedCost: z.number().nullable(),
  profit: z.number().nullable(),
  marginPct: z.number().nullable(),
  profitContributionPct: z.number().optional(),
});

export const CostBreakdown = z.object({
  category: z.string(),
  amount: z.number(),
  pctOfTotal: z.number(),
});

export const AtRiskItem = z.object({
  item: z.string(),
  reason: z.string(),
  revenue: z.number().nullable().optional(),
  profit: z.number().nullable().optional(),
  marginPct: z.number().nullable().optional(),
});

export const WaterfallItem = z.object({
  label: z.string(),
  value: z.number(),
  type: z.enum(['base', 'positive', 'negative', 'total']),
});
export type WaterfallItem = z.infer<typeof WaterfallItem>;

export const MenuMatrixItem = z.object({
  item: z.string(),
  marginPct: z.number(),
  revenueShare: z.number(),
  quadrant: z.enum(['star', 'wildcard', 'volume', 'review']),
});
export type MenuMatrixItem = z.infer<typeof MenuMatrixItem>;

export const Recommendation = z.object({
  rank: z.number(),
  title: z.string(),
  description: z.string(),
  estimatedMonthlyImpactRm: z.number(),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
});

export const MonthSummary = z.object({
  totalRevenue: z.number(),
  totalExpenses: z.number(),
  estimatedProfit: z.number(),
  marginPct: z.number(),
  momRevenuePct: z.number().nullable().optional(),
  momExpensesPct: z.number().nullable().optional(),
  momProfitPct: z.number().nullable().optional(),
  momMarginPp: z.number().nullable().optional(),
});

export const MonthView = z.object({
  summary: MonthSummary,
  topPerformers: z.array(TopPerformer),
  costBreakdown: z.array(CostBreakdown),
  atRiskItems: z.array(AtRiskItem),
  recommendations: z.array(Recommendation),
  narrative: z.string().optional(),
  insightBanner: z.string().optional(),
  profitWaterfall: z.array(WaterfallItem).optional(),
  menuMatrix: z.array(MenuMatrixItem).optional(),
});
export type MonthView = z.infer<typeof MonthView>;

export const MonthDataPoint = z.object({
  month: z.string(),
  marginPct: z.number(),
  revenue: z.number(),
  expenses: z.number(),
});

export const SupplierPriceChange = z.object({
  supplier: z.string(),
  item: z.string(),
  changePct: z.number(),
  period: z.string(),
});

export const CannibalizationAlert = z.object({
  newItem: z.string(),
  affectedItem: z.string(),
  salesDropPct: z.number(),
  netCategoryGrowthPct: z.number(),
  detail: z.string(),
});

export const MoMComparison = z.object({
  metric: z.string(),
  current: z.number(),
  previous: z.number(),
  changePct: z.number(),
});

export const TrendsSummary = z.object({
  avgMarginPct: z.number(),
  marginTrendPct: z.number(),
  revenueTrendPct: z.number(),
  monthsAnalysed: z.number(),
});

export const TrendsView = z.object({
  summary: TrendsSummary,
  marginOverTime: z.array(MonthDataPoint),
  supplierPriceChanges: z.array(SupplierPriceChange),
  cannibalization: z.object({
    detected: z.boolean(),
    alerts: z.array(CannibalizationAlert),
  }),
  monthOverMonth: z.array(MoMComparison),
});
export type TrendsView = z.infer<typeof TrendsView>;

export const ReportData = z.object({
  monthView: MonthView,
  trendsView: TrendsView,
});
export type ReportData = z.infer<typeof ReportData>;

// ─── What-If ──────────────────────────────────────────────────────────────────

export const WhatIfAnswer = z.object({
  answer: z.string(),
  projectedDeltaRm: z.number().nullable(),
  risks: z.array(z.string()),
});
export type WhatIfAnswer = z.infer<typeof WhatIfAnswer>;

// ─── POS Column Mapping (LLM-detected) ───────────────────────────────────────

export const PosColumnMapping = z.object({
  itemNameCol:   z.string().nullable(),
  quantityCol:   z.string().nullable(),
  unitPriceCol:  z.string().nullable(),
  dateCol:       z.string().nullable(),
  categoryCol:   z.string().nullable(),
  channelCol:    z.string().nullable(),
  isRefundedCol: z.string().nullable(),
  isAggregated:  z.boolean(),
  confidence:    z.enum(['high', 'medium', 'low']),
});
export type PosColumnMapping = z.infer<typeof PosColumnMapping>;

// ─── Legacy (kept for backward compat with whatif route) ─────────────────────

export const OcrExtraction = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      price: z.number(),
      date: z.string(),
    })
  ),
  confidence: z.enum(['high', 'medium', 'low']),
  missingInfo: z.array(z.string()),
});
export type OcrExtraction = z.infer<typeof OcrExtraction>;
