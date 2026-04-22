'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type ChatMsg = { from: 'ai' | 'user'; text: string };

function ProcessingInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const reportId = sp.get('reportId');
  const [turnIndex, setTurnIndex] = useState(0);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length, loading]);

  useEffect(() => {
    fetchNext(0, []);
  }, []);

  async function fetchNext(idx: number, asked: string[]) {
    setLoading(true);
    const res = await fetch('/api/chat/followup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ turnIndex: idx, askedSoFar: asked }),
    });
    const j = await res.json();
    setLoading(false);
    if (!j.ok) return;
    const q = j.turn.question as string;
    setMsgs((m) => [...m, { from: 'ai', text: q }]);
    if (j.turn.done) {
      setDone(true);
      setTimeout(() => {
        if (reportId) router.push(`/dashboard?reportId=${reportId}`);
        else router.push('/dashboard');
      }, 1400);
    }
  }

  async function send() {
    if (!input.trim() || done || loading) return;
    const userText = input.trim();
    setMsgs((m) => [...m, { from: 'user', text: userText }]);
    setInput('');
    const nextIdx = turnIndex + 1;
    setTurnIndex(nextIdx);
    fetchNext(nextIdx, msgs.filter((m) => m.from === 'ai').map((m) => m.text));
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="bg-kira-teal text-white px-5 py-4">
        <h1 className="serif text-xl">Beberapa soalan pendek</h1>
        <p className="text-xs opacity-80">Untuk kira margin dan cadangan dengan tepat</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`rounded-card px-4 py-3 max-w-[85%] text-sm leading-relaxed ${
                m.from === 'user'
                  ? 'bg-white rounded-br-sm'
                  : 'bg-kira-sage rounded-bl-sm'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-kira-muted">
            <div className="w-2 h-2 rounded-full bg-kira-teal animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-kira-teal animate-pulse [animation-delay:0.2s]" />
            <div className="w-2 h-2 rounded-full bg-kira-teal animate-pulse [animation-delay:0.4s]" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {!done && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="p-3 border-t border-kira-sage/40 bg-kira-cream"
        >
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Taip jawapan..."
              className="input flex-1"
              disabled={loading}
            />
            <button type="submit" className="btn-primary" disabled={loading || !input.trim()}>
              Hantar
            </button>
          </div>
        </form>
      )}

      {done && (
        <div className="p-4 text-center text-sm text-kira-teal">
          ✓ Cukup! Menyediakan laporan anda...
        </div>
      )}
    </main>
  );
}

export default function Processing() {
  return (
    <Suspense fallback={<div className="p-8 text-kira-muted">Memuatkan...</div>}>
      <ProcessingInner />
    </Suspense>
  );
}
