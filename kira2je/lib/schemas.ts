import { z } from 'zod';

export const StatusPill = z.enum(['Top', 'Stabil', 'Bahaya', 'Rugi']);
export type StatusPill = z.infer<typeof StatusPill>;

export const ItemPerf = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  perDay: z.number(),
  costPercent: z.number(),
  marginRm: z.number(),
  monthlyRevenue: z.number(),
  monthlyProfit: z.number(),
  status: StatusPill,
  category: z.string().optional(),
});
export type ItemPerf = z.infer<typeof ItemPerf>;

export const DeliveryTrap = z.object({
  itemId: z.string(),
  itemName: z.string(),
  price: z.number(),
  commission: z.number(),
  effectiveMarginRm: z.number(),
  platform: z.string(),
});
export type DeliveryTrap = z.infer<typeof DeliveryTrap>;

export const Cannibalization = z.object({
  detected: z.boolean(),
  victimItem: z.string().optional(),
  culpritItem: z.string().optional(),
  correlation: z.number().optional(),
  volumeBefore: z.number().optional(),
  volumeAfter: z.number().optional(),
  netMonthlyImpactRm: z.number().optional(),
});
export type Cannibalization = z.infer<typeof Cannibalization>;

export const TaxBreakdown = z.object({
  annualProfit: z.number(),
  totalRelief: z.number(),
  chargeableIncome: z.number(),
  annualTax: z.number(),
  monthlyTax: z.number(),
  reliefsApplied: z.array(z.string()),
});
export type TaxBreakdown = z.infer<typeof TaxBreakdown>;

export const BenchmarkRow = z.object({
  itemName: z.string(),
  userPrice: z.number().nullable(),
  avgPrice: z.number(),
  minPrice: z.number(),
  maxPrice: z.number(),
  area: z.string(),
});
export type BenchmarkRow = z.infer<typeof BenchmarkRow>;

export const AnalyticsResult = z.object({
  userId: z.string(),
  dateRangeFrom: z.string(),
  dateRangeTo: z.string(),
  totalRevenue: z.number(),
  estimatedProfit: z.number(),
  revenueChangePct: z.number(),
  profitChangePct: z.number(),
  items: z.array(ItemPerf),
  cannibalization: Cannibalization,
  deliveryTraps: z.array(DeliveryTrap),
  tax: TaxBreakdown,
  benchmarks: z.array(BenchmarkRow),
});
export type AnalyticsResult = z.infer<typeof AnalyticsResult>;

export const Recommendation = z.object({
  rank: z.number(),
  title: z.string(),
  description: z.string(),
  impactRm: z.number(),
});
export type Recommendation = z.infer<typeof Recommendation>;

export const ReportNarration = z.object({
  headline: z.string(),
  summary: z.string(),
  cannibalizationNarrative: z.string().nullable(),
  deliveryNarrative: z.string().nullable(),
  taxNarrative: z.string(),
  recommendations: z.array(Recommendation),
  totalImpactRm: z.number(),
});
export type ReportNarration = z.infer<typeof ReportNarration>;

export const FullReport = z.object({
  analytics: AnalyticsResult,
  narration: ReportNarration,
});
export type FullReport = z.infer<typeof FullReport>;

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

export const FollowupTurn = z.object({
  question: z.string(),
  done: z.boolean(),
  field: z.enum(['costPercent', 'deliveryCommission', 'menuChanges', 'none']),
});
export type FollowupTurn = z.infer<typeof FollowupTurn>;

export const WhatIfAnswer = z.object({
  answer: z.string(),
  projectedDeltaRm: z.number().nullable(),
  risks: z.array(z.string()),
});
export type WhatIfAnswer = z.infer<typeof WhatIfAnswer>;
