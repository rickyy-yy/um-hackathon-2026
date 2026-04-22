import type { TaxBreakdown } from './schemas';

interface TaxBracket {
  min: number;
  max: number;
  rate: number;
}

export const MALAYSIA_TAX_BRACKETS_YA2025: TaxBracket[] = [
  { min: 0, max: 5000, rate: 0 },
  { min: 5001, max: 20000, rate: 0.01 },
  { min: 20001, max: 35000, rate: 0.03 },
  { min: 35001, max: 50000, rate: 0.06 },
  { min: 50001, max: 70000, rate: 0.11 },
  { min: 70001, max: 100000, rate: 0.19 },
  { min: 100001, max: 400000, rate: 0.25 },
  { min: 400001, max: 600000, rate: 0.26 },
  { min: 600001, max: 2000000, rate: 0.28 },
  { min: 2000001, max: Infinity, rate: 0.30 },
];

export const PERSONAL_RELIEFS = {
  individual: 9000,
  epf: 4000,
  socso: 350,
  lifestyle: 2500,
  medical_insurance: 3000,
  education_insurance: 3000,
} as const;

export type ReliefKey = keyof typeof PERSONAL_RELIEFS;

export function calculateTax(
  annualProfit: number,
  reliefs: ReliefKey[] = []
): TaxBreakdown {
  const appliedReliefs: string[] = ['individual'];
  let totalRelief = PERSONAL_RELIEFS.individual;

  for (const r of reliefs) {
    if (r === 'individual') continue;
    if (PERSONAL_RELIEFS[r] !== undefined) {
      totalRelief += PERSONAL_RELIEFS[r];
      appliedReliefs.push(r);
    }
  }

  const chargeableIncome = Math.max(0, annualProfit - totalRelief);
  let tax = 0;

  for (const bracket of MALAYSIA_TAX_BRACKETS_YA2025) {
    if (chargeableIncome < bracket.min) break;
    const ceiling = Math.min(chargeableIncome, bracket.max);
    const taxableInBracket = Math.max(0, ceiling - bracket.min + 1);
    tax += taxableInBracket * bracket.rate;
    if (chargeableIncome <= bracket.max) break;
  }

  tax = Math.round(tax);
  return {
    annualProfit: Math.round(annualProfit),
    totalRelief,
    chargeableIncome: Math.round(chargeableIncome),
    annualTax: tax,
    monthlyTax: Math.round(tax / 12),
    reliefsApplied: appliedReliefs,
  };
}

export const RELIEF_LABELS_BM: Record<ReliefKey, string> = {
  individual: 'Pelepasan individu (RM9,000)',
  epf: 'KWSP (sehingga RM4,000)',
  socso: 'PERKESO (sehingga RM350)',
  lifestyle: 'Gaya hidup (sehingga RM2,500)',
  medical_insurance: 'Insurans perubatan (sehingga RM3,000)',
  education_insurance: 'Insurans pendidikan (sehingga RM3,000)',
};
