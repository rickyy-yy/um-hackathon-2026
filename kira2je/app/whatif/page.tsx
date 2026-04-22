'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { WhatIfAnswer } from '@/lib/schemas';

type Turn = { id: string; question: string; answer: WhatIfAnswer };

const SUGGESTIONS = [
  'Kalau saya buang salted egg?',
  'Kalau saya naikkan semua harga 50 sen?',
  'Kalau saya keluarkan Milo dari GrabFood?',
  'Kalau saya tambah menu baru?',
];

function WhatIfInner() {
  const sp = useSearchParams();
  const reportId = sp.get('reportId') ?? '';
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!reportId) return;
    fetch(`/api/chat/whatif?reportId=${reportId}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setTurns(j.turns);
      });
  }, [reportId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns.length, loading]);

  async function ask(q: string) {
    if (!q.trim() || loading) return;
    setLoading(true);
    const res = await fetch('/api/chat/whatif', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reportId, question: q }),
    });
    const j = await res.json();
    setLoading(false);
    if (j.ok) {
      setTurns((t) => [
        ...t,
        { id: Math.random().toString(36).slice(2), question: q, answer: j.answer },
      ]);
      setQuestion('');
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="bg-kira-teal text-white px-5 py-4 flex items-center gap-3">
        <Link href={`/dashboard?reportId=${reportId}`} className="text-white/90 text-xl">
          ←
        </Link>
        <div>
          <h1 className="serif text-xl leading-tight">Kalau saya...?</h1>
          <p className="text-xs opacity-80">Kira2 je akan fikir untuk anda</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {turns.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-kira-muted text-center mb-3">
              Pilih soalan atau tulis sendiri:
            </p>
            {SUGGESTIONS.map((s) => (
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

        {turns.map((t) => (
          <div key={t.id} className="space-y-3">
            <div className="flex justify-end">
              <div className="bg-white rounded-card rounded-br-sm px-4 py-3 max-w-[85%] text-sm">
                {t.question}
              </div>
            </div>
            <div>
              <div className="bg-kira-sage rounded-card rounded-bl-sm px-4 py-3 text-sm leading-relaxed">
                {t.answer.answer}
              </div>
              {(t.answer.projectedDeltaRm != null || t.answer.risks.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {t.answer.projectedDeltaRm != null && (
                    <div
                      className={`text-xs font-semibold rounded-btn px-3 py-1.5 ${
                        t.answer.projectedDeltaRm >= 0
                          ? 'bg-kira-yellow text-kira-dark'
                          : 'bg-kira-red/15 text-kira-red'
                      }`}
                    >
                      {t.answer.projectedDeltaRm >= 0 ? '+' : '−'}RM
                      {Math.abs(t.answer.projectedDeltaRm).toLocaleString()}/bulan
                    </div>
                  )}
                  {t.answer.risks.map((r, i) => (
                    <div
                      key={i}
                      className="text-xs text-kira-muted bg-white rounded-btn px-3 py-1.5"
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
          <div className="flex items-center gap-2 text-sm text-kira-muted">
            <div className="w-2 h-2 rounded-full bg-kira-teal animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-kira-teal animate-pulse [animation-delay:0.2s]" />
            <div className="w-2 h-2 rounded-full bg-kira-teal animate-pulse [animation-delay:0.4s]" />
            <span className="ml-2">Kira2 je sedang fikir...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="p-3 border-t border-kira-sage/40 bg-kira-cream"
      >
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Kalau saya..."
            className="input flex-1"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || question.trim().length < 4}
            className="btn-primary disabled:opacity-50"
          >
            Tanya
          </button>
        </div>
      </form>
    </main>
  );
}

export default function WhatIfPage() {
  return (
    <Suspense fallback={<div className="p-8 text-kira-muted">Memuatkan...</div>}>
      <WhatIfInner />
    </Suspense>
  );
}
