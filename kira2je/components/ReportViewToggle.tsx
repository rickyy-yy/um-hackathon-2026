'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import type { MonthView, TrendsView } from '@/lib/schemas';

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}

function signedPct(n: number) {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="card flex flex-col gap-1">
      <p className="section-label">{label}</p>
      <p className={`text-2xl font-semibold number leading-tight ${valueClass ?? 'text-ink-primary'}`}>
        {value}
      </p>
    </div>
  );
}

// ─── This Month view ──────────────────────────────────────────────────────────

function MonthViewPanel({ data }: { data: MonthView }) {
  const { summary, topPerformers, costBreakdown, atRiskItems, recommendations } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Revenue', value: `RM ${fmt(summary.totalRevenue)}`, cls: undefined },
          { label: 'Expenses', value: `RM ${fmt(summary.totalExpenses)}`, cls: undefined },
          {
            label: 'Profit',
            value: `RM ${fmt(summary.estimatedProfit)}`,
            cls: summary.estimatedProfit >= 0 ? 'positive' : 'negative',
          },
          {
            label: 'Margin',
            value: fmtPct(summary.marginPct),
            cls: summary.marginPct >= 20 ? 'positive' : 'negative',
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            <StatCard label={card.label} value={card.value} valueClass={card.cls} />
          </motion.div>
        ))}
      </div>

      {/* Top performers */}
      <motion.div
        className="card space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
      >
        <p className="section-label">Top Performers</p>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-left border-b border-paper-200">
                <th className="pb-2 font-semibold text-ink-secondary text-xs pr-3">Item</th>
                <th className="pb-2 font-semibold text-ink-secondary text-xs pr-3 text-right">Revenue</th>
                <th className="pb-2 font-semibold text-ink-secondary text-xs pr-3 text-right">Cost</th>
                <th className="pb-2 font-semibold text-ink-secondary text-xs pr-3 text-right">Profit</th>
                <th className="pb-2 font-semibold text-ink-secondary text-xs text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {topPerformers
                .slice()
                .sort((a, b) => b.profit - a.profit)
                .map((p, i) => (
                  <motion.tr
                    key={p.item}
                    className="border-b border-paper-200 last:border-0"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.04, duration: 0.25 }}
                  >
                    <td className="py-2.5 pr-3 font-medium text-ink-primary">{p.item}</td>
                    <td className="py-2.5 pr-3 text-right number text-ink-primary">{fmt(p.revenue)}</td>
                    <td className="py-2.5 pr-3 text-right number text-ink-secondary">{fmt(p.estimatedCost)}</td>
                    <td className={`py-2.5 pr-3 text-right number font-semibold ${p.profit >= 0 ? 'positive' : 'negative'}`}>
                      {fmt(p.profit)}
                    </td>
                    <td className={`py-2.5 text-right number ${p.marginPct >= 30 ? 'positive' : 'text-ink-secondary'}`}>
                      {fmtPct(p.marginPct)}
                    </td>
                  </motion.tr>
                ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Cost breakdown */}
      <motion.div
        className="card space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.35 }}
      >
        <p className="section-label">Cost Breakdown</p>
        <div className="space-y-3">
          {costBreakdown.map((cb, i) => (
            <div key={cb.category}>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-sm text-ink-primary">{cb.category}</span>
                <span className="text-xs text-ink-secondary number">
                  RM {fmt(cb.amount)} · {cb.pctOfTotal}%
                </span>
              </div>
              <div className="bar-track">
                <motion.div
                  className="bar-fill bg-accent-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${cb.pctOfTotal}%` }}
                  transition={{ delay: 0.35 + i * 0.06, duration: 0.6, ease: 'easeOut' }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* At-risk items */}
      {atRiskItems.length > 0 && (
        <motion.div
          className="card space-y-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.35 }}
        >
          <p className="section-label flex items-center gap-1.5">
            <AlertTriangle size={13} className="text-amber-600" />
            At Risk
          </p>
          <div className="space-y-2.5">
            {atRiskItems.map((r) => (
              <div key={r.item} className="flex items-start gap-2.5">
                <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-ink-primary">{r.item}</p>
                  <p className="text-xs text-ink-secondary leading-relaxed">{r.reason}</p>
                </div>
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
            transition={{ delay: 0.45 + i * 0.06, duration: 0.3 }}
          >
            <div className="w-7 h-7 rounded-full bg-accent-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-accent-primary">{rec.rank}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-ink-primary">{rec.title}</p>
              <p className="text-xs text-ink-secondary mt-1 leading-relaxed">{rec.description}</p>
              <div className="mt-2">
                <span className="inline-flex items-center text-xs font-semibold bg-accent-secondary/10 text-accent-secondary rounded-full px-2.5 py-0.5">
                  Est. impact: +RM {fmt(rec.estimatedMonthlyImpactRm)}/month
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
            Need at least 2 months of data for trends. Upload next month&apos;s data to unlock.
          </p>
        </div>
      </div>
    );
  }

  const maxMargin = Math.max(...marginOverTime.map((m) => m.marginPct), 50);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Avg Margin', value: fmtPct(summary.avgMarginPct), cls: 'text-ink-primary' },
          {
            label: 'Margin trend',
            value: signedPct(summary.marginTrendPct),
            cls: summary.marginTrendPct >= 0 ? 'positive' : 'negative',
          },
          {
            label: 'Revenue trend',
            value: signedPct(summary.revenueTrendPct),
            cls: summary.revenueTrendPct >= 0 ? 'positive' : 'negative',
          },
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

      {/* Margin over time — animated bar chart */}
      <motion.div
        className="card space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
      >
        <p className="section-label">Margin Over Time</p>
        <div className="flex items-end gap-3 h-28 pt-2">
          {marginOverTime.map((pt, i) => {
            const heightPct = (pt.marginPct / maxMargin) * 100;
            return (
              <div key={pt.month} className="flex-1 flex flex-col items-center justify-end gap-1">
                <span className="text-[10px] font-semibold text-ink-secondary number">
                  {fmtPct(pt.marginPct)}
                </span>
                <motion.div
                  className="w-full bg-accent-primary rounded-t-sm"
                  style={{ minHeight: '4px' }}
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%` }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.5, ease: 'easeOut' }}
                />
                <div className="text-center">
                  <p className="text-[10px] font-medium text-ink-primary">{pt.month}</p>
                  <p className="text-[9px] text-ink-secondary number">
                    RM {(pt.revenue / 1000).toFixed(1)}k
                  </p>
                </div>
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
          transition={{ delay: 0.35, duration: 0.35 }}
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
                  transition={{ delay: 0.4 + i * 0.05, duration: 0.25 }}
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

      {/* Cannibalization alerts */}
      {cannibalization.detected && cannibalization.alerts.length > 0 && (
        <div className="space-y-2">
          <p className="section-label flex items-center gap-1.5">
            <AlertTriangle size={13} className="text-amber-600" />
            Cannibalization detected
          </p>
          {cannibalization.alerts.map((alert, i) => (
            <motion.div
              key={i}
              className="card border-amber-200 bg-amber-50/40 space-y-1.5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 + i * 0.06, duration: 0.3 }}
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

      {/* Month-over-month */}
      {monthOverMonth.length > 0 && (
        <motion.div
          className="card space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.35 }}
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
                  transition={{ delay: 0.55 + i * 0.05, duration: 0.25 }}
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

// ─── Toggle ───────────────────────────────────────────────────────────────────

type View = 'month' | 'trends';

export function ReportViewToggle({ monthView, trendsView }: { monthView: MonthView; trendsView: TrendsView }) {
  const [active, setActive] = useState<View>('month');

  return (
    <div className="space-y-5">
      {/* Animated sliding pill toggle */}
      <div className="flex bg-paper-200 rounded-btn p-1 w-fit">
        {(['month', 'trends'] as View[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className="relative px-5 py-1.5 text-sm font-medium rounded-[6px] min-h-0 transition-colors"
          >
            {active === tab && (
              <motion.div
                layoutId="tab-pill"
                className="absolute inset-0 bg-paper-50 rounded-[6px] shadow-sm"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className={`relative z-10 transition-colors ${active === tab ? 'text-ink-primary' : 'text-ink-secondary hover:text-ink-primary'}`}>
              {tab === 'month' ? 'This month' : 'Trends'}
            </span>
          </button>
        ))}
      </div>

      {/* Animated panel swap */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {active === 'month' ? (
            <MonthViewPanel data={monthView} />
          ) : (
            <TrendsViewPanel data={trendsView} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
