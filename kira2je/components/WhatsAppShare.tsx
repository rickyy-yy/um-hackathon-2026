'use client';

import { useState } from 'react';
import type { FullReport } from '@/lib/schemas';
import { useT, useLocale } from '@/lib/i18n/client';

export function WhatsAppShare({ report, shopName }: { report: FullReport; shopName: string }) {
  const t = useT();
  const locale = useLocale();
  const [copied, setCopied] = useState(false);

  function buildSummary(): string {
    const a = report.analytics;
    const n = report.narration;
    const lines: string[] = [];

    const reportLabel = locale === 'en' ? 'Menu report' : 'Laporan menu';
    lines.push(`📊 ${reportLabel} — ${shopName}`);
    const dateLocale = locale === 'en' ? 'en-MY' : 'ms-MY';
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    const from = new Date(a.dateRangeFrom).toLocaleDateString(dateLocale, opts);
    const to = new Date(a.dateRangeTo).toLocaleDateString(dateLocale, opts);
    lines.push(`${from} – ${to}`);
    lines.push('');

    if (locale === 'en') {
      lines.push(`💰 Revenue: RM${a.totalRevenue.toLocaleString()}/month`);
      lines.push(
        `📈 Profit: RM${a.estimatedProfit.toLocaleString()}/month (${a.profitChangePct >= 0 ? '▲' : '▼'} ${Math.abs(a.profitChangePct).toFixed(1)}%)`
      );
    } else {
      lines.push(`💰 Jualan: RM${a.totalRevenue.toLocaleString()}/bulan`);
      lines.push(
        `📈 Untung: RM${a.estimatedProfit.toLocaleString()}/bulan (${a.profitChangePct >= 0 ? '▲' : '▼'} ${Math.abs(a.profitChangePct).toFixed(1)}%)`
      );
    }
    lines.push('');

    const top = [...a.items].sort((x, y) => y.monthlyProfit - x.monthlyProfit)[0];
    const topLabel = locale === 'en' ? 'Top item' : 'Item teratas';
    const perMonth = locale === 'en' ? '/month' : '/bulan';
    lines.push(`⭐ ${topLabel}: ${top.name} — RM${top.monthlyProfit.toLocaleString()}${perMonth}`);

    if (a.cannibalization.detected) {
      lines.push('');
      const perDay = locale === 'en' ? '/day' : '/hari';
      const cannLabel = locale === 'en' ? 'Cannibalization' : 'Kanibalisasi';
      const pullingFrom =
        locale === 'en' ? 'pulling sales from' : 'menarik jualan dari';
      lines.push(
        `⚠️ ${cannLabel}: ${a.cannibalization.culpritItem} ${pullingFrom} ${a.cannibalization.victimItem} (${a.cannibalization.volumeBefore}→${a.cannibalization.volumeAfter}${perDay})`
      );
    }

    if (a.deliveryTraps.length > 0) {
      lines.push('');
      const trap = a.deliveryTraps[0];
      const trapLabel = locale === 'en' ? 'Delivery trap' : 'Perangkap delivery';
      const onlyProfits = locale === 'en' ? 'profits only' : 'untung cuma';
      const afterComm = locale === 'en' ? 'after' : 'selepas komisyen';
      const commSuffix = locale === 'en' ? 'commission' : '';
      lines.push(
        `🚨 ${trapLabel}: ${trap.itemName} ${onlyProfits} RM${trap.effectiveMarginRm.toFixed(2)} ${afterComm} ${Math.round(trap.commission * 100)}% ${commSuffix}`.trim()
      );
    }

    lines.push('');
    const recsLabel =
      locale === 'en'
        ? `💡 Top recommendations (potential +RM${n.totalImpactRm.toLocaleString()}/month):`
        : `💡 Cadangan teratas (potensi +RM${n.totalImpactRm.toLocaleString()}/bulan):`;
    lines.push(recsLabel);
    n.recommendations.slice(0, 3).forEach((r) => {
      lines.push(`${r.rank}. ${r.title} — +RM${r.impactRm.toLocaleString()}${perMonth}`);
    });

    lines.push('');
    const taxLabel =
      locale === 'en' ? `🧾 Est. annual tax` : `🧾 Anggaran cukai tahunan`;
    lines.push(`${taxLabel}: RM${a.tax.annualTax.toLocaleString()}`);

    lines.push('');
    const footer = locale === 'en' ? '— Powered by Kira2 je' : '— Ditaja oleh Kira2 je';
    lines.push(footer);
    return lines.join('\n');
  }

  async function shareOrCopy() {
    const text = buildSummary();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;

    const isMobile = /android|iphone|ipad|mobile/i.test(
      typeof navigator !== 'undefined' ? navigator.userAgent : ''
    );
    if (isMobile) {
      window.open(url, '_blank');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      window.open(url, '_blank');
    }
  }

  return (
    <button
      onClick={shareOrCopy}
      className="btn-ghost w-full flex items-center justify-center gap-2"
    >
      <span className="text-lg">💬</span>
      <span>{copied ? t('whatsapp.copied') : t('whatsapp.share')}</span>
    </button>
  );
}
