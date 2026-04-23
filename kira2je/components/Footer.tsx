'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n/client';

type Status = {
  ok: boolean;
  configuredMode: 'mock' | 'live';
  effectiveMode: 'mock' | 'live' | 'degraded';
  model: string | null;
  provider: string | null;
  stats: {
    realCallCount: number;
    mockCallCount: number;
    fallbackCount: number;
    totalTokens: number;
    lastCallAt: number | null;
    lastStatus: number | null;
    lastErrorMessage: string | null;
    lastTask: string | null;
  };
};

export function Footer() {
  const t = useT();
  const [status, setStatus] = useState<Status | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch('/api/llm/status', { cache: 'no-store' });
        const j = (await r.json()) as Status;
        if (!cancelled) setStatus(j);
      } catch {
        // ignore — footer is best-effort
      }
    }
    load();
    // Refresh when the tab regains focus so a new LLM call shows up
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  if (!status) {
    return (
      <footer className="px-5 pb-8 pt-4 text-[11px] text-kira-muted/60 text-center" />
    );
  }

  const { effectiveMode, model, provider, stats } = status;

  const badgeColor =
    effectiveMode === 'live'
      ? 'bg-kira-teal/15 text-kira-teal'
      : effectiveMode === 'degraded'
        ? 'bg-kira-red/15 text-kira-red'
        : 'bg-kira-sage/40 text-kira-dark';

  const modeLabel =
    effectiveMode === 'live'
      ? t('footer.liveMode')
      : effectiveMode === 'degraded'
        ? t('footer.degradedMode')
        : t('footer.mockMode');

  const displayModel = model || 'mock';
  const displayProvider = provider ? `${provider} · ${displayModel}` : displayModel;

  return (
    <footer className="px-5 pb-8 pt-4 text-[11px] text-kira-muted text-center space-y-2">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <span>
          {t('footer.modelLabel')}:{' '}
          <span className="font-medium text-kira-dark">{displayProvider}</span>
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${badgeColor}`}>
          {modeLabel}
        </span>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="underline underline-offset-2 text-kira-muted hover:text-kira-dark"
        >
          {t('footer.details')}
        </button>
      </div>

      {expanded && (
        <div className="mx-auto max-w-xs bg-white/60 border border-kira-sage/60 rounded-btn px-3 py-2 text-left space-y-1">
          <div>
            {stats.realCallCount > 0 || stats.totalTokens > 0
              ? t('footer.tokensUsed', { n: stats.totalTokens.toLocaleString() })
              : t('footer.noCalls')}
          </div>
          {stats.lastTask && stats.lastStatus != null && (
            <div>
              {t('footer.lastCall', {
                task: stats.lastTask,
                status: stats.lastStatus,
              })}
            </div>
          )}
          {stats.lastErrorMessage && effectiveMode === 'degraded' && (
            <div className="text-kira-red">⚠ {stats.lastErrorMessage}</div>
          )}
          <div className="text-kira-muted/80 italic pt-1">
            {t('footer.balanceNote')}
          </div>
        </div>
      )}
    </footer>
  );
}
