'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Msg = { from: 'ai' | 'user'; text: string };

const SCRIPT: { ai: string; key: 'items' | 'prices' | 'qty' | 'months' | 'done' }[] = [
  {
    ai: 'Hai Mak Cik! Jom kita kumpul data menu Mak Cik dengan cara mudah. Pertama, apa 5 item paling popular di warung anda? Taip satu-satu, pisahkan dengan koma.',
    key: 'items',
  },
  {
    ai: 'Okay. Berapa harga setiap satu? (Contoh: nasi lemak 5, teh tarik 2.50). Tak perlu tepat — anggaran pun boleh.',
    key: 'prices',
  },
  {
    ai: 'Dalam sehari biasa, berapa banyak setiap satu terjual? Anggaran je.',
    key: 'qty',
  },
  {
    ai: 'Terakhir — berapa bulan anda dah jual menu ni? Ada tambah item baru baru-baru ni?',
    key: 'months',
  },
  {
    ai: 'Terima kasih, Mak Cik. Kami akan guna maklumat ini untuk buat analisis awal. Untuk data yang lebih tepat, cuba upload fail POS atau gambar buku akaun bila-bila masa.',
    key: 'done',
  },
];

export default function ChatIntake() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'ai', text: SCRIPT[0].ai }]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  function advance() {
    if (!input.trim()) return;
    const userText = input.trim();
    const next = step + 1;
    setMsgs((m) => [...m, { from: 'user', text: userText }]);
    setInput('');

    setTimeout(() => {
      if (next < SCRIPT.length) {
        setMsgs((m) => [...m, { from: 'ai', text: SCRIPT[next].ai }]);
        setStep(next);
        if (SCRIPT[next].key === 'done') {
          setTimeout(() => router.push('/dashboard'), 2500);
        }
      }
    }, 500);
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="bg-kira-teal text-white px-5 py-4 flex items-center gap-3">
        <Link href="/onboarding" className="text-white/90 text-xl">
          ←
        </Link>
        <h1 className="serif text-xl">Cerita je ikut ingatan</h1>
      </header>

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
              placeholder="Jawab..."
              className="input flex-1"
            />
            <button type="submit" className="btn-primary" disabled={!input.trim()}>
              Hantar
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
