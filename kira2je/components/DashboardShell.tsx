'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useT, useLocale } from '@/lib/i18n/client';
import type { FullReport } from '@/lib/schemas';
import { ItemTable } from './ItemTable';
import { ProfitBars } from './ProfitBars';
import { CannibalizationAlert } from './CannibalizationAlert';
import { DeliveryTrapTable } from './DeliveryTrapTable';
import { TaxCard } from './TaxCard';
import { ActionCards } from './ActionCards';
import { BenchmarkCard } from './BenchmarkCard';

type Section = 'overview' | 'tax' | 'recommendations' | 'benchmarks';

export function DashboardShell({
  report,
  reportId,
  shopName,
}: {
  report: FullReport;
  reportId: string;
  shopName: string;
}) {
  const t = useT();
  const locale = useLocale();
  const [active, setActive] = useState<Section>('overview');
  const [exported, setExported] = useState(false);
  const { analytics: a, narration: n } = report;

  const l = (en: string, ms: string) => (locale === 'en' ? en : ms);

  const navItems: { key: Section; label: string; icon: string }[] = [
    { key: 'overview',        label: l('Overview',        'Ringkasan'),    icon: '📊' },
    { key: 'tax',             label: l('Tax',             'Cukai'),         icon: '🧾' },
    { key: 'recommendations', label: l('Recommendations', 'Cadangan'),      icon: '💡' },
    { key: 'benchmarks',      label: l('Area Prices',     'Harga Kawasan'), icon: '📍' },
  ];

  async function handleExport() {
    const pm = l('/month', '/bulan');
    const dFmt: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    const dloc = locale === 'en' ? 'en-MY' : 'ms-MY';
    const from = new Date(a.dateRangeFrom).toLocaleDateString(dloc, dFmt);
    const to   = new Date(a.dateRangeTo).toLocaleDateString(dloc, dFmt);
    const top  = [...a.items].sort((x, y) => y.monthlyProfit - x.monthlyProfit)[0];

    const lines: string[] = [
      `📊 ${l('Menu report', 'Laporan menu')} — ${shopName}`,
      `${from} – ${to}`,
      '',
      l(`💰 Revenue: RM${a.totalRevenue.toLocaleString()}/month`,
        `💰 Jualan: RM${a.totalRevenue.toLocaleString()}/bulan`),
      l(`📈 Profit: RM${a.estimatedProfit.toLocaleString()}/month (${a.profitChangePct >= 0 ? '▲' : '▼'} ${Math.abs(a.profitChangePct).toFixed(1)}%)`,
        `📈 Untung: RM${a.estimatedProfit.toLocaleString()}/bulan (${a.profitChangePct >= 0 ? '▲' : '▼'} ${Math.abs(a.profitChangePct).toFixed(1)}%)`),
      '',
      `⭐ ${l('Top item', 'Item teratas')}: ${top.name} — RM${top.monthlyProfit.toLocaleString()}${pm}`,
    ];

    if (a.cannibalization.detected) {
      lines.push('', `⚠️ ${l('Cannibalization', 'Kanibalisasi')}: ${a.cannibalization.culpritItem} → ${a.cannibalization.victimItem}`);
    }
    if (a.deliveryTraps.length > 0) {
      const trap = a.deliveryTraps[0];
      lines.push('', `🚨 ${l('Delivery trap', 'Perangkap delivery')}: ${trap.itemName} — RM${trap.effectiveMarginRm.toFixed(2)} ${l('after', 'selepas')} ${Math.round(trap.commission * 100)}% ${l('commission', 'komisyen')}`);
    }

    lines.push(
      '',
      l(`💡 Top recommendations (potential +RM${n.totalImpactRm.toLocaleString()}/month):`,
        `💡 Cadangan teratas (potensi +RM${n.totalImpactRm.toLocaleString()}/bulan):`),
      ...n.recommendations.slice(0, 3).map(r => `${r.rank}. ${r.title} — +RM${r.impactRm.toLocaleString()}${pm}`),
      '',
      `🧾 ${l('Est. annual tax', 'Anggaran cukai tahunan')}: RM${a.tax.annualTax.toLocaleString()}`,
      '',
      `— ${l('Powered by', 'Ditaja oleh')} Kira2 je`,
    );

    const text = lines.join('\n');
    const isMobile = /android|iphone|ipad|mobile/i.test(
      typeof navigator !== 'undefined' ? navigator.userAgent : ''
    );
    if (isMobile) {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setExported(true);
      setTimeout(() => setExported(false), 2500);
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  }

  return (
    <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 bg-white border-r border-kira-sage/40 flex flex-col overflow-y-auto">
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActive(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm font-medium transition-colors text-left ${
                active === item.key
                  ? 'bg-kira-teal text-white'
                  : 'text-kira-dark hover:bg-kira-sage/30'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}

          <div className="my-2 border-t border-kira-sage/40" />

          <Link
            href={`/whatif?reportId=${reportId}`}
            className="flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm font-medium text-kira-dark hover:bg-kira-sage/30 transition-colors"
          >
            <span className="text-base leading-none">🤔</span>
            <span>{l('What-If Chat', 'Kalau Saya...?')}</span>
            <span className="ml-auto text-kira-muted text-xs">↗</span>
          </Link>

          <button
            onClick={handleExport}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm font-medium transition-colors text-left ${
              exported ? 'text-kira-teal' : 'text-kira-dark hover:bg-kira-sage/30'
            }`}
          >
            <span className="text-base leading-none">{exported ? '✓' : '📤'}</span>
            <span>{exported ? l('Copied!', 'Disalin!') : l('Export', 'Kongsi')}</span>
          </button>
        </nav>

        <div className="p-3 border-t border-kira-sage/40">
          <form action="/api/auth/logout" method="post">
            <button className="w-full text-sm text-kira-muted hover:text-kira-dark transition-colors text-left px-3 py-2 rounded-btn hover:bg-kira-sage/20">
              {t('nav.logout')}
            </button>
          </form>
        </div>
      </aside>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {active === 'overview' && (
          <>
            <p className="text-sm text-kira-dark leading-relaxed bg-white rounded-card p-4">
              {n.summary}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="card min-w-0">
                <div className="text-xs text-kira-muted truncate">{t('dashboard.revenue')}</div>
                <div className="serif text-lg sm:text-xl lg:text-2xl mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                  RM{a.totalRevenue.toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div
                  className={`text-xs mt-1 ${
                    a.revenueChangePct >= 0 ? 'text-kira-teal' : 'text-kira-red'
                  }`}
                >
                  {a.revenueChangePct >= 0 ? '▲' : '▼'}{' '}
                  {Math.abs(a.revenueChangePct).toFixed(1)}% {t('dashboard.vsLastMonth')}
                </div>
              </div>
              <div className="card min-w-0">
                <div className="text-xs text-kira-muted truncate">{t('dashboard.profit')}</div>
                <div className="serif text-lg sm:text-xl lg:text-2xl mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                  RM{a.estimatedProfit.toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div
                  className={`text-xs mt-1 ${
                    a.profitChangePct >= 0 ? 'text-kira-teal' : 'text-kira-red'
                  }`}
                >
                  {a.profitChangePct >= 0 ? '▲' : '▼'}{' '}
                  {Math.abs(a.profitChangePct).toFixed(1)}% {t('dashboard.vsLastMonth')}
                </div>
              </div>
            </div>
            <div className="card">
              <h3 className="serif text-xl mb-3">{t('dashboard.itemsTitle')}</h3>
              <ItemTable items={a.items} />
            </div>
            <div className="card">
              <h3 className="serif text-xl mb-1">{t('dashboard.profitBarsTitle')}</h3>
              <p className="text-sm text-kira-muted mb-4">{t('dashboard.profitBarsDesc')}</p>
              <ProfitBars items={a.items} />
            </div>
            <CannibalizationAlert
              data={a.cannibalization}
              narrative={n.cannibalizationNarrative}
            />
            <DeliveryTrapTable traps={a.deliveryTraps} narrative={n.deliveryNarrative} />
          </>
        )}

        {active === 'tax' && (
          <TaxCard
            initial={a.tax}
            annualProfit={a.estimatedProfit * 12}
            narrative={n.taxNarrative}
          />
        )}

        {active === 'recommendations' && (
          <>
            <h3 className="serif text-xl mb-3">{t('dashboard.actionsTitle')}</h3>
            <ActionCards
              recommendations={n.recommendations}
              totalImpactRm={n.totalImpactRm}
            />
          </>
        )}

        {active === 'benchmarks' && <BenchmarkCard rows={a.benchmarks} />}
      </div>
    </div>
  );
}
