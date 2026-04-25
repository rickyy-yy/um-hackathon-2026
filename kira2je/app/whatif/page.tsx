'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useT, useLocale } from '@/lib/i18n/client';
import { AppHeader } from '@/components/AppHeader';
import type { WhatIfAnswer } from '@/lib/schemas';

type Turn = { id: string; question: string; answer: WhatIfAnswer };

function WhatIfInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const reportId = sp.get('reportId') ?? '';
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    t('whatif.suggestion1'),
    t('whatif.suggestion2'),
    t('whatif.suggestion3'),
    t('whatif.suggestion4'),
  ];

  useEffect(() => {
    if (!reportId) {
      fetch('/api/chat/whatif')
        .then((r) => r.json())
        .then((j) => {
          if (j.ok && j.reportId) router.replace(`/whatif?reportId=${j.reportId}`);
        });
      return;
    }
    fetch(`/api/chat/whatif?reportId=${reportId}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setTurns(j.turns);
      });
  }, [reportId, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns.length, loading]);

  async function ask(q: string) {
    if (!q.trim() || loading) return;
    setLoading(true);
    const res = await fetch('/api/chat/whatif', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reportId, question: q, locale }),
    });
    const j = await res.json();
    setLoading(false);
    if (j.ok) {
      setTurns((tr) => [
        ...tr,
        { id: Math.random().toString(36).slice(2), question: q, answer: j.answer },
      ]);
      setQuestion('');
    }
  }

  const monthSuffix = 'RM';

  return (
    <main className="min-h-screen flex flex-col">
      <AppHeader
        title={t('whatif.title')}
        subtitle={t('whatif.subtitle')}
        backHref={`/dashboard?reportId=${reportId}`}
      />

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {turns.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-ink-secondary text-center mb-3">
              {t('whatif.subtitle')}
            </p>
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="w-full text-left card-sage text-sm"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {turns.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-1">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                disabled={loading}
                className="text-xs card-sage py-1.5 px-3 rounded-btn disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {turns.map((tr) => (
          <div key={tr.id} className="space-y-3">
            <div className="flex justify-end">
              <div className="bg-white rounded-card rounded-br-sm px-4 py-3 max-w-[85%] text-sm">
                {tr.question}
              </div>
            </div>
            <div>
              <div className="bg-paper-200 rounded-card rounded-bl-sm px-4 py-3 text-sm leading-relaxed">
                {tr.answer.answer}
              </div>
              {(tr.answer.projectedDeltaRm != null || tr.answer.risks.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tr.answer.projectedDeltaRm != null && (
                    <div
                      className={`text-xs font-semibold rounded-btn px-3 py-1.5 ${
                        tr.answer.projectedDeltaRm >= 0
                          ? 'bg-accent-primary text-ink-primary'
                          : 'bg-danger/15 text-danger'
                      }`}
                    >
                      {tr.answer.projectedDeltaRm >= 0 ? '+' : '−'}RM
                      {Math.abs(tr.answer.projectedDeltaRm).toLocaleString()}
                      {monthSuffix}
                    </div>
                  )}
                  {tr.answer.risks.map((r, i) => (
                    <div
                      key={i}
                      className="text-xs text-ink-secondary bg-white rounded-btn px-3 py-1.5"
                    >
                      ⚠ {r}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-ink-secondary">
            <div className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-accent-primary animate-pulse [animation-delay:0.2s]" />
            <div className="w-2 h-2 rounded-full bg-accent-primary animate-pulse [animation-delay:0.4s]" />
            <span className="ml-2">{t('whatif.thinking')}</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="p-3 border-t border-paper-200/40 bg-paper-50"
      >
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t('whatif.placeholder')}
            className="input flex-1"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || question.trim().length < 4}
            className="btn-primary disabled:opacity-50"
          >
            {t('whatif.ask')}
          </button>
        </div>
      </form>
    </main>
  );
}

export default function WhatIfPage() {
  return (
    <Suspense fallback={<div className="p-8 text-ink-secondary">Loading...</div>}>
      <WhatIfInner />
    </Suspense>
  );
}
