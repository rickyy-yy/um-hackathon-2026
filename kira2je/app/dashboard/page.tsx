import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { llm } from '@/lib/llm';
import type { AnalyticsResult, FullReport, ReportNarration } from '@/lib/schemas';
import { ItemTable } from '@/components/ItemTable';
import { ProfitBars } from '@/components/ProfitBars';
import { CannibalizationAlert } from '@/components/CannibalizationAlert';
import { DeliveryTrapTable } from '@/components/DeliveryTrapTable';
import { TaxCard } from '@/components/TaxCard';
import { ActionCards } from '@/components/ActionCards';
import { BenchmarkCard } from '@/components/BenchmarkCard';

export const dynamic = 'force-dynamic';

async function loadReport(userId: string, reportId?: string): Promise<{ id: string; full: FullReport } | null> {
  const report = reportId
    ? await prisma.report.findUnique({ where: { id: reportId } })
    : await prisma.report.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
  if (!report || report.userId !== userId) return null;

  const parsed = JSON.parse(report.reportData) as {
    analytics: AnalyticsResult;
    narration: ReportNarration | null;
  };

  let narration = parsed.narration;
  if (!narration) {
    narration = await llm({ task: 'report', analytics: parsed.analytics });
    await prisma.report.update({
      where: { id: report.id },
      data: { reportData: JSON.stringify({ analytics: parsed.analytics, narration }) },
    });
  }

  return { id: report.id, full: { analytics: parsed.analytics, narration } };
}

function formatDateRange(fromIso: string, toIso: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  const from = new Date(fromIso).toLocaleDateString('ms-MY', opts);
  const to = new Date(toIso).toLocaleDateString('ms-MY', opts);
  return `${from} – ${to}`;
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: { reportId?: string };
}) {
  const session = await getSession();
  if (!session) redirect('/');

  const loaded = await loadReport(session.userId, searchParams.reportId);
  if (!loaded) redirect('/onboarding');

  const { id, full } = loaded;
  const { analytics: a, narration: n } = full;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const displayName = user?.name ?? 'anda';

  return (
    <main className="pb-20">
      {/* 5a Header */}
      <header className="bg-kira-teal text-white px-5 pt-6 pb-5 rounded-b-3xl">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">
              {displayName}
            </div>
            <h1 className="serif text-2xl leading-tight mt-1">Laporan menu</h1>
            <div className="text-sm opacity-90 mt-1">
              {formatDateRange(a.dateRangeFrom, a.dateRangeTo)}
            </div>
          </div>
          <Link
            href="/onboarding"
            className="text-xs bg-white/15 rounded-btn px-3 py-2"
          >
            Kemaskini data
          </Link>
        </div>
      </header>

      <div className="px-5 -mt-4 space-y-4">
        {/* Headline from LLM */}
        <p className="text-sm text-kira-dark leading-relaxed bg-white rounded-card p-4">
          {n.summary}
        </p>

        {/* 5b Summary stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card">
            <div className="text-xs text-kira-muted">Jumlah jualan</div>
            <div className="serif text-2xl mt-1">
              RM{a.totalRevenue.toLocaleString()}
            </div>
            <div
              className={`text-xs mt-1 ${a.revenueChangePct >= 0 ? 'text-kira-teal' : 'text-kira-red'}`}
            >
              {a.revenueChangePct >= 0 ? '▲' : '▼'} {Math.abs(a.revenueChangePct).toFixed(1)}% vs bulan lepas
            </div>
          </div>
          <div className="card">
            <div className="text-xs text-kira-muted">Anggaran untung</div>
            <div className="serif text-2xl mt-1">
              RM{a.estimatedProfit.toLocaleString()}
            </div>
            <div
              className={`text-xs mt-1 ${a.profitChangePct >= 0 ? 'text-kira-teal' : 'text-kira-red'}`}
            >
              {a.profitChangePct >= 0 ? '▲' : '▼'} {Math.abs(a.profitChangePct).toFixed(1)}% vs bulan lepas
            </div>
          </div>
        </div>

        {/* 5c Per-item table */}
        <div className="card">
          <h3 className="serif text-xl mb-3">Prestasi setiap item</h3>
          <ItemTable items={a.items} />
        </div>

        {/* 5d Profit bars */}
        <div className="card">
          <h3 className="serif text-xl mb-1">Sumbangan untung bulanan</h3>
          <p className="text-sm text-kira-muted mb-4">
            Susun ikut RM sebenar, bukan volum jualan.
          </p>
          <ProfitBars items={a.items} />
        </div>

        {/* 5e Cannibalization */}
        <CannibalizationAlert data={a.cannibalization} narrative={n.cannibalizationNarrative} />

        {/* 5f Delivery trap */}
        <DeliveryTrapTable traps={a.deliveryTraps} narrative={n.deliveryNarrative} />

        {/* 5g Tax */}
        <TaxCard
          initial={a.tax}
          annualProfit={a.estimatedProfit * 12}
          narrative={n.taxNarrative}
        />

        {/* 5h Actions */}
        <div>
          <h3 className="serif text-xl mb-3 px-1">Apa boss patut buat?</h3>
          <ActionCards recommendations={n.recommendations} totalImpactRm={n.totalImpactRm} />
        </div>

        {/* 5i Benchmark */}
        <BenchmarkCard rows={a.benchmarks} />

        {/* 5j CTA */}
        <Link
          href={`/whatif?reportId=${id}`}
          className="btn-primary w-full text-center block mt-2"
        >
          Tanya: Kalau saya...?
        </Link>

        <form action="/api/auth/logout" method="post" className="mt-4">
          <button className="w-full text-sm text-kira-muted underline">
            Log keluar
          </button>
        </form>
      </div>
    </main>
  );
}
