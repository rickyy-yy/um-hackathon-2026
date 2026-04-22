'use client';

import { useState } from 'react';
import type { FullReport } from '@/lib/schemas';

export function WhatsAppShare({ report, shopName }: { report: FullReport; shopName: string }) {
  const [copied, setCopied] = useState(false);

  function buildSummary(): string {
    const a = report.analytics;
    const n = report.narration;
    const lines: string[] = [];

    lines.push(`📊 Laporan menu — ${shopName}`);
    const from = new Date(a.dateRangeFrom).toLocaleDateString('ms-MY', {
      day: '2-digit',
      month: 'short',
    });
    const to = new Date(a.dateRangeTo).toLocaleDateString('ms-MY', {
      day: '2-digit',
      month: 'short',
    });
    lines.push(`${from} – ${to}`);
    lines.push('');

    lines.push(`💰 Jualan: RM${a.totalRevenue.toLocaleString()}/bulan`);
    lines.push(
      `📈 Untung: RM${a.estimatedProfit.toLocaleString()}/bulan (${a.profitChangePct >= 0 ? '▲' : '▼'} ${Math.abs(a.profitChangePct).toFixed(1)}%)`
    );
    lines.push('');

    const top = [...a.items].sort((x, y) => y.monthlyProfit - x.monthlyProfit)[0];
    lines.push(`⭐ Item teratas: ${top.name} — RM${top.monthlyProfit.toLocaleString()}/bulan`);

    if (a.cannibalization.detected) {
      lines.push('');
      lines.push(
        `⚠️ Kanibalisasi: ${a.cannibalization.culpritItem} menarik jualan dari ${a.cannibalization.victimItem} (${a.cannibalization.volumeBefore}→${a.cannibalization.volumeAfter}/hari)`
      );
    }

    if (a.deliveryTraps.length > 0) {
      lines.push('');
      const trap = a.deliveryTraps[0];
      lines.push(
        `🚨 Perangkap delivery: ${trap.itemName} untung RM${trap.effectiveMarginRm.toFixed(2)} je selepas komisyen ${Math.round(trap.commission * 100)}%`
      );
    }

    lines.push('');
    lines.push(`💡 Cadangan teratas (potensi +RM${n.totalImpactRm.toLocaleString()}/bulan):`);
    n.recommendations.slice(0, 3).forEach((r) => {
      lines.push(`${r.rank}. ${r.title} — +RM${r.impactRm.toLocaleString()}/bulan`);
    });

    lines.push('');
    lines.push(`🧾 Anggaran cukai tahunan: RM${a.tax.annualTax.toLocaleString()}`);

    lines.push('');
    lines.push('— Ditaja oleh Kira2 je');
    return lines.join('\n');
  }

  async function shareOrCopy() {
    const text = buildSummary();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;

    // On mobile, open wa.me directly (opens WhatsApp app or web)
    const isMobile = /android|iphone|ipad|mobile/i.test(
      typeof navigator !== 'undefined' ? navigator.userAgent : ''
    );
    if (isMobile) {
      window.open(url, '_blank');
      return;
    }

    // On desktop, copy the text and offer wa.me as a fallback
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
      <span>{copied ? 'Disalin! Tampal di WhatsApp' : 'Hantar ringkasan ke WhatsApp'}</span>
    </button>
  );
}
