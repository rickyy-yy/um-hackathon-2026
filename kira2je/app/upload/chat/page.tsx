'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useT, useLocale } from '@/lib/i18n/client';
import { AppHeader } from '@/components/AppHeader';

type Msg = { from: 'ai' | 'user'; text: string };

const SCRIPT: { ms: string; en: string; key: 'items' | 'prices' | 'qty' | 'months' | 'done' }[] = [
  {
    ms: 'Hai boss! Jom kita kumpul data menu anda dengan cara mudah. Pertama, apa 5 item paling popular di kedai anda? Taip satu-satu, pisahkan dengan koma.',
    en: "Hi boss! Let's collect your menu data the easy way. First, what are the 5 most popular items at your shop? List them separated by commas.",
    key: 'items',
  },
  {
    ms: 'Okay. Berapa harga setiap satu? (Contoh: nasi lemak 5, teh tarik 2.50). Tak perlu tepat — anggaran pun boleh.',
    en: 'Okay. What are their prices? (e.g. nasi lemak 5, teh tarik 2.50). Estimates are fine — no need to be exact.',
    key: 'prices',
  },
  {
    ms: 'Dalam sehari biasa, berapa banyak setiap satu terjual? Anggaran je.',
    en: 'On a typical day, how many of each do you sell? Rough estimates are fine.',
    key: 'qty',
  },
  {
    ms: 'Terakhir — berapa bulan anda dah jual menu ni? Ada tambah item baru baru-baru ni?',
    en: "Last one — how many months have you been selling this menu? Added any new items recently?",
    key: 'months',
  },
  {
    ms: 'Terima kasih, boss. Kami akan guna maklumat ini untuk buat analisis awal. Untuk data yang lebih tepat, cuba upload fail POS atau gambar buku akaun bila-bila masa.',
    en: "Thanks, boss. We'll use this for an initial analysis. For more accurate data, try uploading a POS file or photos of your ledger anytime.",
    key: 'done',
  },
];

export default function ChatIntake() {
  const router = useRouter();
  const locale = useLocale();
  const t = useT();
  const [step, setStep] = useState(0);
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'ai', text: SCRIPT[0][locale] }]);
  const [input, setInput] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  async function submitChat(collectedAnswers: Record<string, string>) {
    const res = await fetch('/api/upload/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers: collectedAnswers }),
    });
    const j = await res.json();
    setTimeout(() => {
      if (j.ok) router.push(`/processing?reportId=${j.reportId}`);
      else router.push('/dashboard');
    }, 2000);
  }

  function advance() {
    if (!input.trim()) return;
    const userText = input.trim();
    const updatedAnswers = { ...answers, [SCRIPT[step].key]: userText };
    const next = step + 1;
    setAnswers(updatedAnswers);
    setMsgs((m) => [...m, { from: 'user', text: userText }]);
    setInput('');

    setTimeout(() => {
      if (next < SCRIPT.length) {
        setMsgs((m) => [...m, { from: 'ai', text: SCRIPT[next][locale] }]);
        setStep(next);
        if (SCRIPT[next].key === 'done') {
          submitChat(updatedAnswers);
        }
      }
    }, 500);
  }

  return (
    <main className="min-h-screen flex flex-col">
      <AppHeader title={t('upload.chatTitle')} backHref="/onboarding" />

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`rounded-card px-4 py-3 max-w-[85%] text-sm leading-relaxed ${
                m.from === 'user' ? 'bg-white rounded-br-sm' : 'bg-kira-sage rounded-bl-sm'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {SCRIPT[step]?.key !== 'done' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            advance();
          }}
          className="p-3 border-t border-kira-sage/40 bg-kira-cream"
        >
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('chat.placeholder')}
              className="input flex-1"
            />
            <button type="submit" className="btn-primary" disabled={!input.trim()}>
              {t('chat.sendLabel')}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
