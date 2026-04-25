'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, TrendingUp, TrendingDown, Send, Sparkles } from 'lucide-react';
import type { MonthView, TrendsView, WhatIfAnswer, WaterfallItem, MenuMatrixItem } from '@/lib/schemas';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtPct(n: number) { return `${n.toFixed(1)}%`; }
function signedPct(n: number) { return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`; }

// ─── Cost breakdown card ──────────────────────────────────────────────────────

function CostBreakdownCard({ costBreakdown }: { costBreakdown: { category: string; amount: number; pctOfTotal: number }[] }) {
  const [visible, setVisible] = useState(5);
  const sorted = [...costBreakdown].sort((a, b) => b.amount - a.amount);
  const shown = sorted.slice(0, visible);
  const remaining = sorted.length - visible;

  return (
    <motion.div
      className="card space-y-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.35 }}
    >
      <p className="section-label">Ingredient Cost Breakdown</p>
      <div className="space-y-3">
        {shown.map((cb, i) => (
          <div key={cb.category}>
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-sm text-ink-primary">{cb.category}</span>
              <span className="text-xs text-ink-secondary number">RM {fmt(cb.amount)} · {cb.pctOfTotal}%</span>
            </div>
            <div className="bar-track">
              <motion.div
                className="bar-fill bg-accent-primary"
                initial={{ width: 0 }}
                animate={{ width: `${cb.pctOfTotal}%` }}
                transition={{ delay: 0.4 + i * 0.07, duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <button
          onClick={() => setVisible((v) => v + 5)}
          className="text-xs text-accent-primary hover:underline w-full text-center pt-1"
        >
          Show {Math.min(remaining, 5)} more ({remaining} remaining)
        </button>
      )}
    </motion.div>
  );
}

// ─── Profit waterfall chart ───────────────────────────────────────────────────

function WaterfallChart({ items }: { items: WaterfallItem[] }) {
  const maxAbs = Math.max(...items.map((it) => Math.abs(it.value)));
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => {
        const barPct = (Math.abs(item.value) / maxAbs) * 70 + 10;
        const isNeg = item.type === 'negative';
        const isPos = item.type === 'positive';
        const barColor =
          item.type === 'base' || item.type === 'total'
            ? 'bg-accent-primary'
            : isPos
            ? 'bg-accent-secondary'
            : 'bg-danger';
        return (
          <motion.div
            key={item.label}
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.07, duration: 0.25 }}
          >
            <span className="w-36 shrink-0 text-[11px] text-ink-secondary text-right leading-tight pr-1">
              {item.label}
            </span>
            <div className="flex-1 flex items-center h-6">
              <motion.div
                className={`h-full rounded-sm flex items-center px-2 ${barColor}`}
                initial={{ width: '0%' }}
                animate={{ width: `${barPct}%` }}
                transition={{ delay: 0.45 + i * 0.07, duration: 0.5, ease: 'easeOut' }}
              >
                <span className="text-[10px] font-semibold text-white whitespace-nowrap">
                  {isNeg ? '−' : isPos ? '+' : ''}RM {Math.abs(item.value).toLocaleString('en-MY')}
                </span>
              </motion.div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Menu performance matrix ──────────────────────────────────────────────────

function MenuMatrixGrid({ items }: { items: MenuMatrixItem[] }) {
  type Quad = 'star' | 'wildcard' | 'volume' | 'review';
  const byQ = (q: Quad) => items.filter((it) => it.quadrant === q);
  const quads: { id: Quad; label: string; desc: string; color: string; textColor: string }[] = [
    { id: 'wildcard', label: 'Wildcards', desc: 'High margin · Low volume', color: 'bg-accent-primary/10 border-accent-primary/25', textColor: 'text-accent-primary' },
    { id: 'star', label: 'Stars', desc: 'High margin · High volume', color: 'bg-accent-secondary/10 border-accent-secondary/30', textColor: 'text-accent-secondary' },
    { id: 'review', label: 'Review', desc: 'Low margin · Low volume', color: 'bg-danger/5 border-danger/20', textColor: 'text-danger' },
    { id: 'volume', label: 'Volume drivers', desc: 'Low margin · High volume', color: 'bg-amber-50 border-amber-200', textColor: 'text-amber-700' },
  ];
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[9px] text-ink-secondary px-1">
        <span>← Low revenue share</span>
        <span>High revenue share →</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {quads.map((q) => (
          <motion.div
            key={q.id}
            className={`border rounded-card p-3 space-y-1.5 ${q.color}`}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            <div>
              <p className={`text-xs font-bold ${q.textColor}`}>{q.label}</p>
              <p className="text-[9px] text-ink-secondary leading-tight">{q.desc}</p>
            </div>
            <div className="flex flex-col gap-1 mt-1">
              {byQ(q.id).length === 0 ? (
                <span className="text-[10px] text-ink-secondary italic">None</span>
              ) : (
                byQ(q.id).map((it) => (
                  <div key={it.item} className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-medium text-ink-primary leading-tight">{it.item}</span>
                    <span className="text-[10px] text-ink-secondary number shrink-0">{it.marginPct}%</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        ))}
      </div>
      <p className="text-[9px] text-ink-secondary">High margin ≥38% · High revenue share ≥15%</p>
    </div>
  );
}

// ─── This Month view ──────────────────────────────────────────────────────────

function MonthViewPanel({ data }: { data: MonthView }) {
  const { summary, topPerformers, costBreakdown, atRiskItems, recommendations, narrative, profitWaterfall, menuMatrix } = data;

  return (
    <div className="space-y-6">
      {/* Narrative summary */}
      {narrative && (
        <motion.div
          className="card bg-accent-primary/5 border-accent-primary/15"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <p className="text-sm text-ink-primary leading-relaxed">{narrative}</p>
        </motion.div>
      )}

      {/* 2×2 stat grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Revenue', value: `RM ${fmt(summary.totalRevenue)}`, cls: 'text-ink-primary' },
          { label: 'Expenses', value: `RM ${fmt(summary.totalExpenses)}`, cls: 'text-ink-primary' },
          { label: 'Profit', value: `RM ${fmt(summary.estimatedProfit)}`, cls: summary.estimatedProfit >= 0 ? 'positive' : 'negative' },
          { label: 'Margin', value: fmtPct(summary.marginPct), cls: summary.marginPct >= 20 ? 'positive' : 'negative' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            className="card flex flex-col gap-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: narrative ? 0.1 + i * 0.05 : i * 0.05, duration: 0.3 }}
          >
            <p className="section-label">{card.label}</p>
            <p className={`text-2xl font-semibold number leading-tight ${card.cls}`}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Top performers */}
      <motion.div
        className="card space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.35 }}
      >
        <p className="section-label">Top Performers — by profit</p>
        <div className="space-y-3">
          {topPerformers
            .slice()
            .sort((a, b) => (b.profit ?? 0) - (a.profit ?? 0))
            .map((p, i) => (
              <motion.div
                key={p.item}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05, duration: 0.25 }}
              >
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm font-medium text-ink-primary">{p.item}</span>
                  <div className="flex items-center gap-3 text-xs number text-ink-secondary">
                    <span>RM {fmt(p.revenue)} rev</span>
                    {p.profit != null ? (
                      <span className={`font-semibold ${p.profit >= 0 ? 'positive' : 'negative'}`}>
                        RM {fmt(p.profit)} profit
                      </span>
                    ) : (
                      <span className="text-ink-secondary">no cost data</span>
                    )}
                    {p.marginPct != null && (
                      <span className={p.marginPct >= 30 ? 'text-accent-secondary font-semibold' : 'text-ink-secondary'}>
                        {fmtPct(p.marginPct)}
                      </span>
                    )}
                  </div>
                </div>
                {p.profitContributionPct != null && (
                  <div className="flex items-center gap-2">
                    <div className="bar-track flex-1">
                      <motion.div
                        className="bar-fill bg-accent-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${p.profitContributionPct}%` }}
                        transition={{ delay: 0.35 + i * 0.06, duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-[10px] text-ink-secondary number w-10 text-right shrink-0">
                      {p.profitContributionPct.toFixed(1)}%
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
        </div>
        <p className="text-[10px] text-ink-secondary">Bar shows share of total month profit</p>
      </motion.div>

      {/* Cost breakdown */}
      <CostBreakdownCard costBreakdown={costBreakdown} />

      {/* Profit waterfall */}
      {profitWaterfall && profitWaterfall.length > 0 && (
        <motion.div
          className="card space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.35 }}
        >
          <p className="section-label">Profit waterfall — what drove the change</p>
          <WaterfallChart items={profitWaterfall} />
        </motion.div>
      )}

      {/* Menu performance matrix */}
      {menuMatrix && menuMatrix.length > 0 && (
        <motion.div
          className="card space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, duration: 0.35 }}
        >
          <p className="section-label">Menu performance matrix</p>
          <MenuMatrixGrid items={menuMatrix} />
        </motion.div>
      )}

      {/* At-risk items */}
      {atRiskItems.length > 0 && (
        <motion.div
          className="card space-y-2.5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.35 }}
        >
          <p className="section-label flex items-center gap-1.5">
            <AlertTriangle size={13} className="text-amber-600" />
            Items at risk
          </p>
          <div className="space-y-3">
            {atRiskItems.map((r) => (
              <div key={r.item} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                    <span className="text-sm font-semibold text-ink-primary truncate">{r.item}</span>
                  </div>
                  {r.revenue != null && (
                    <div className="flex items-center gap-3 text-xs number text-ink-secondary shrink-0">
                      <span>RM {fmt(r.revenue)} rev</span>
                      {r.profit != null && (
                        <span className={`font-semibold ${r.profit >= 0 ? 'positive' : 'negative'}`}>
                          RM {fmt(r.profit)} profit
                        </span>
                      )}
                      {r.marginPct != null && (
                        <span className={r.marginPct < 20 ? 'text-danger font-semibold' : 'text-ink-secondary'}>
                          {fmtPct(r.marginPct)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-ink-secondary leading-relaxed pl-5">{r.reason}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recommendations */}
      <div className="space-y-3">
        <p className="section-label">Recommendations</p>
        {recommendations.map((rec, i) => (
          <motion.div
            key={rec.rank}
            className="card flex gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.07, duration: 0.3 }}
          >
            <div className="w-7 h-7 rounded-full bg-accent-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-accent-primary">{rec.rank}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="font-semibold text-sm text-ink-primary">{rec.title}</p>
                {rec.riskLevel && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    rec.riskLevel === 'low'
                      ? 'bg-accent-secondary/15 text-accent-secondary'
                      : rec.riskLevel === 'medium'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-danger/10 text-danger'
                  }`}>
                    {rec.riskLevel} risk
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-secondary leading-relaxed">{rec.description}</p>
              <div className="mt-2">
                <span className="inline-flex items-center text-xs font-semibold bg-accent-secondary/10 text-accent-secondary rounded-full px-2.5 py-0.5">
                  Est. +RM {fmt(rec.estimatedMonthlyImpactRm)}/month
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Trends view ──────────────────────────────────────────────────────────────

function TrendsViewPanel({ data }: { data: TrendsView }) {
  const { summary, marginOverTime, supplierPriceChanges, cannibalization, monthOverMonth } = data;

  if (summary.monthsAnalysed < 2) {
    return (
      <div className="card bg-paper-100 flex items-start gap-3">
        <TrendingUp size={18} className="text-ink-secondary shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm text-ink-primary">Not enough data yet</p>
          <p className="text-xs text-ink-secondary mt-0.5 leading-relaxed">
            Keep uploading monthly data — after 2 months, you&apos;ll see margin trends, supplier price changes, and month-over-month comparisons here.
          </p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...marginOverTime.map((m) => m.revenue));
  const marginVals = marginOverTime.map((m) => m.marginPct);
  const marginFloor = Math.max(0, Math.min(...marginVals) - 4);
  const marginRange = Math.max(...marginVals) - marginFloor + 2;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Avg Margin', value: fmtPct(summary.avgMarginPct), cls: 'text-ink-primary' },
          { label: 'Margin trend', value: signedPct(summary.marginTrendPct), cls: summary.marginTrendPct >= 0 ? 'positive' : 'negative' },
          { label: 'Revenue trend', value: signedPct(summary.revenueTrendPct), cls: summary.revenueTrendPct >= 0 ? 'positive' : 'negative' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            className="card flex flex-col gap-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.3 }}
          >
            <p className="section-label text-[10px]">{card.label}</p>
            <p className={`text-xl font-semibold number ${card.cls}`}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Revenue & expense dual bar chart */}
      <motion.div
        className="card space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
      >
        <div className="flex items-center justify-between">
          <p className="section-label">Revenue vs Expenses</p>
          <div className="flex items-center gap-3 text-[10px] text-ink-secondary">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-accent-primary inline-block" />Revenue</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-accent-secondary inline-block" />Expenses</span>
          </div>
        </div>
        <div className="flex items-end gap-4 h-32 pt-2">
          {marginOverTime.map((pt, i) => {
            const revH = (pt.revenue / maxValue) * 100;
            const expH = (pt.expenses / maxValue) * 100;
            return (
              <div key={pt.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-1 h-24">
                  <motion.div
                    className="flex-1 bg-accent-primary rounded-t-sm min-h-[4px]"
                    initial={{ height: 0 }}
                    animate={{ height: `${revH}%` }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.5, ease: 'easeOut' }}
                  />
                  <motion.div
                    className="flex-1 bg-accent-secondary rounded-t-sm min-h-[4px]"
                    initial={{ height: 0 }}
                    animate={{ height: `${expH}%` }}
                    transition={{ delay: 0.35 + i * 0.1, duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-medium text-ink-primary">{pt.month}</p>
                  <p className="text-[9px] text-ink-secondary number">RM {(pt.revenue / 1000).toFixed(1)}k</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Margin over time */}
      <motion.div
        className="card space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.35 }}
      >
        <p className="section-label">Margin trajectory</p>
        <div className="flex items-end gap-3 h-24 pt-2">
          {marginOverTime.map((pt, i) => {
            const heightPct = ((pt.marginPct - marginFloor) / marginRange) * 80 + 10;
            return (
              <div key={pt.month} className="flex-1 flex flex-col items-center justify-end gap-1">
                <span className="text-[10px] font-semibold text-ink-secondary number">{fmtPct(pt.marginPct)}</span>
                <motion.div
                  className="w-full bg-accent-primary rounded-t-sm"
                  style={{ minHeight: '4px' }}
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%` }}
                  transition={{ delay: 0.35 + i * 0.1, duration: 0.5, ease: 'easeOut' }}
                />
                <p className="text-[10px] text-ink-primary">{pt.month}</p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Supplier price changes */}
      {supplierPriceChanges.length > 0 && (
        <motion.div
          className="card space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.35 }}
        >
          <p className="section-label">Supplier Price Changes</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-paper-200">
                <th className="pb-2 font-semibold text-ink-secondary text-xs pr-3">Supplier</th>
                <th className="pb-2 font-semibold text-ink-secondary text-xs pr-3">Item</th>
                <th className="pb-2 font-semibold text-ink-secondary text-xs pr-3">Period</th>
                <th className="pb-2 font-semibold text-ink-secondary text-xs text-right">Change</th>
              </tr>
            </thead>
            <tbody>
              {supplierPriceChanges.map((sc, i) => (
                <motion.tr
                  key={i}
                  className="border-b border-paper-200 last:border-0"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + i * 0.05, duration: 0.25 }}
                >
                  <td className="py-2.5 pr-3 text-xs text-ink-secondary">{sc.supplier}</td>
                  <td className="py-2.5 pr-3 text-sm font-medium text-ink-primary">{sc.item}</td>
                  <td className="py-2.5 pr-3 text-xs text-ink-secondary">{sc.period}</td>
                  <td className={`py-2.5 text-right font-semibold number text-sm ${sc.changePct > 0 ? 'negative' : 'positive'}`}>
                    {sc.changePct > 0 ? '+' : ''}{sc.changePct.toFixed(1)}%
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Cannibalization */}
      {cannibalization.detected && cannibalization.alerts.length > 0 && (
        <div className="space-y-2">
          <p className="section-label flex items-center gap-1.5">
            <AlertTriangle size={13} className="text-amber-600" />
            Cannibalization detected
          </p>
          {cannibalization.alerts.map((alert, i) => (
            <motion.div
              key={i}
              className="card border-amber-200 bg-amber-50/40 space-y-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.06, duration: 0.3 }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-ink-primary">{alert.newItem}</span>
                <span className="text-xs text-ink-secondary">affecting</span>
                <span className="text-sm font-semibold text-ink-primary">{alert.affectedItem}</span>
              </div>
              <div className="flex gap-4 flex-wrap">
                <div>
                  <p className="text-[10px] section-label">Sales drop</p>
                  <p className="text-sm font-semibold negative">{alert.salesDropPct}%</p>
                </div>
                <div>
                  <p className="text-[10px] section-label">Net category</p>
                  <p className={`text-sm font-semibold ${alert.netCategoryGrowthPct >= 0 ? 'positive' : 'negative'}`}>
                    {alert.netCategoryGrowthPct >= 0 ? '+' : ''}{alert.netCategoryGrowthPct}%
                  </p>
                </div>
              </div>
              <p className="text-xs text-ink-secondary leading-relaxed">{alert.detail}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Month-over-month table */}
      {monthOverMonth.length > 0 && (
        <motion.div
          className="card space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.35 }}
        >
          <p className="section-label">Month-over-Month</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-paper-200">
                <th className="pb-2 font-semibold text-ink-secondary text-xs pr-3">Metric</th>
                <th className="pb-2 font-semibold text-ink-secondary text-xs pr-3 text-right">Current</th>
                <th className="pb-2 font-semibold text-ink-secondary text-xs pr-3 text-right">Previous</th>
                <th className="pb-2 font-semibold text-ink-secondary text-xs text-right">Change</th>
              </tr>
            </thead>
            <tbody>
              {monthOverMonth.map((row, i) => (
                <motion.tr
                  key={row.metric}
                  className="border-b border-paper-200 last:border-0"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.05, duration: 0.25 }}
                >
                  <td className="py-2.5 pr-3 font-medium text-ink-primary">{row.metric}</td>
                  <td className="py-2.5 pr-3 text-right number text-ink-primary">
                    {row.metric === 'Margin %' ? fmtPct(row.current) : `RM ${fmt(row.current)}`}
                  </td>
                  <td className="py-2.5 pr-3 text-right number text-ink-secondary">
                    {row.metric === 'Margin %' ? fmtPct(row.previous) : `RM ${fmt(row.previous)}`}
                  </td>
                  <td className={`py-2.5 text-right number font-semibold ${row.changePct >= 0 ? 'positive' : 'negative'}`}>
                    {signedPct(row.changePct)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
}

// ─── What-if panel ────────────────────────────────────────────────────────────

type Turn = { id: string; question: string; answer: WhatIfAnswer };

const SUGGESTIONS = [
  'What if I raise Grilled Chicken Set by RM 2?',
  'What if I remove Laksa from the menu?',
  'What if I add a RM 0.50 packaging fee?',
  'What if I renegotiate chicken prices?',
];

function WhatIfPanel({ month }: { month: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns.length, loading]);

  async function ask(q: string) {
    if (!q.trim() || loading) return;
    setLoading(true);
    setQuestion('');
    try {
      const res = await fetch('/api/chat/whatif', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: q, locale: 'en' }),
      });
      const j = await res.json();
      if (j.ok && j.answer) {
        setTurns((prev) => [
          ...prev,
          { id: Math.random().toString(36).slice(2), question: q, answer: j.answer },
        ]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Intro */}
      {turns.length === 0 && (
        <motion.div
          className="card bg-accent-primary/5 border-accent-primary/15"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start gap-3">
            <Sparkles size={18} className="text-accent-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-ink-primary mb-1">What-if simulator</p>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Ask any business scenario — pricing changes, removing menu items, renegotiating suppliers. Kira2 je will model the projected impact using your actual data.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="text-left text-xs text-accent-primary bg-accent-primary/5 hover:bg-accent-primary/10 border border-accent-primary/20 rounded-btn px-3 py-2 transition-colors min-h-0"
              >
                {s}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Conversation */}
      <div className="space-y-4">
        <AnimatePresence>
          {turns.map((turn) => (
            <motion.div
              key={turn.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-3"
            >
              {/* Question bubble */}
              <div className="flex justify-end">
                <div className="bg-accent-primary text-white text-sm rounded-card rounded-br-sm px-4 py-2.5 max-w-[85%]">
                  {turn.question}
                </div>
              </div>
              {/* Answer */}
              <div className="card space-y-3">
                <p className="text-sm text-ink-primary leading-relaxed">{turn.answer.answer}</p>
                {turn.answer.projectedDeltaRm != null && (
                  <div className="inline-flex items-center text-xs font-semibold bg-accent-secondary/10 text-accent-secondary rounded-full px-3 py-1">
                    Est. impact: +RM {turn.answer.projectedDeltaRm.toLocaleString('en-MY')}/month
                  </div>
                )}
                {turn.answer.risks.length > 0 && (
                  <div>
                    <p className="text-[10px] section-label mb-1.5">Risks to consider</p>
                    <ul className="space-y-1">
                      {turn.answer.risks.map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-ink-secondary">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-ink-secondary/40 shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
            <div className="flex items-center gap-2 text-sm text-ink-secondary">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 bg-ink-secondary/50 rounded-full"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
                  />
                ))}
              </span>
              Thinking…
            </div>
          </motion.div>
        )}
      </div>

      {/* Suggestions after first turn */}
      {turns.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.filter((s) => !turns.some((t) => t.question === s)).slice(0, 3).map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="text-xs text-accent-primary bg-accent-primary/5 hover:bg-accent-primary/10 border border-accent-primary/20 rounded-full px-3 py-1.5 transition-colors min-h-0"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div ref={bottomRef} />

      {/* Input */}
      <div className="flex gap-2 items-end sticky bottom-4">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(question); }
          }}
          placeholder="e.g. What if I raise nasi lemak by RM 1?"
          rows={2}
          className="input flex-1 resize-none text-sm py-2.5"
        />
        <button
          onClick={() => ask(question)}
          disabled={!question.trim() || loading}
          className="btn-primary px-3 py-3 min-h-0 disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

type View = 'month' | 'trends' | 'whatif';

export function ReportViewToggle({
  monthView,
  trendsView,
  month,
}: {
  monthView: MonthView;
  trendsView: TrendsView;
  month: string;
}) {
  const [active, setActive] = useState<View>('month');

  const tabs: { id: View; label: string }[] = [
    { id: 'month', label: 'This month' },
    { id: 'trends', label: 'Trends' },
    { id: 'whatif', label: 'What if?' },
  ];

  return (
    <div className="space-y-5">
      {/* Animated sliding pill toggle */}
      <div className="flex bg-paper-200 rounded-btn p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className="relative px-4 py-1.5 text-sm font-medium rounded-[6px] min-h-0"
          >
            {active === tab.id && (
              <motion.div
                layoutId="tab-pill"
                className={`absolute inset-0 rounded-[6px] shadow-sm ${
                  tab.id === 'whatif' ? 'bg-accent-primary' : 'bg-paper-50'
                }`}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span
              className={`relative z-10 transition-colors ${
                active === tab.id
                  ? tab.id === 'whatif'
                    ? 'text-white'
                    : 'text-ink-primary'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {active === 'month' && <MonthViewPanel data={monthView} />}
          {active === 'trends' && <TrendsViewPanel data={trendsView} />}
          {active === 'whatif' && <WhatIfPanel month={month} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
