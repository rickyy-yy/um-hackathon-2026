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
  quantity: z.string().optional(),
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
  estimatedCost: z.number(),
  profit: z.number(),
  marginPct: z.number(),
});

export const CostBreakdown = z.object({
  category: z.string(),
  amount: z.number(),
  pctOfTotal: z.number(),
});

export const AtRiskItem = z.object({
  item: z.string(),
  reason: z.string(),
});

export const Recommendation = z.object({
  rank: z.number(),
  title: z.string(),
  description: z.string(),
  estimatedMonthlyImpactRm: z.number(),
});

export const MonthSummary = z.object({
  totalRevenue: z.number(),
  totalExpenses: z.number(),
  estimatedProfit: z.number(),
  marginPct: z.number(),
});

export const MonthView = z.object({
  summary: MonthSummary,
  topPerformers: z.array(TopPerformer),
  costBreakdown: z.array(CostBreakdown),
  atRiskItems: z.array(AtRiskItem),
  recommendations: z.array(Recommendation),
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
