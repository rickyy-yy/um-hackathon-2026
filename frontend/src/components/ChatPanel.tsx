'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useI18n } from '@/i18n';

export type ChatMsg = {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
  streaming?: boolean;
};

export type ChatPanelProps = {
  messages: ChatMsg[];
  quickReplies?: string[];
  onSend: (content: string) => void | Promise<void>;
  busy?: boolean;
  emptyStateSuggestions?: string[];
  emptyStateTitle?: string;
  onAttach?: (file: File) => void | Promise<void>;
  placeholder?: string;
};

/**
 * ChatGPT-style single-column chat layout.
 *
 * - User messages right-aligned with a primary background.
 * - Assistant messages left-aligned with no bubble (Linear-ish restraint),
 *   rendered with markdown (including GFM tables, lists, code).
 * - Quick reply chips below the latest AI message.
 * - Empty state: centred tagline + tappable starter prompts.
 * - Auto-scroll to the latest turn only when the user is already near the
 *   bottom, so scrolling up to re-read doesn't get yanked away.
 */
export function ChatPanel(props: ChatPanelProps) {
  const { t, dict } = useI18n();
  const {
    messages,
    quickReplies = [],
    onSend,
    busy = false,
    emptyStateSuggestions,
    emptyStateTitle,
    onAttach,
    placeholder,
  } = props;

  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) < 80;
    if (nearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, busy]);

  async function submit() {
    const content = draft.trim();
    if (!content || busy) return;
    setDraft('');
    await onSend(content);
  }

  const safeSuggestions = emptyStateSuggestions ?? dict.chat.emptySuggestions ?? [];

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-[min(80vh,680px)] flex-col rounded-3xl border border-primary/10 bg-[rgb(var(--color-card))] shadow-card">
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {isEmpty ? (
          <EmptyState
            title={emptyStateTitle || t('chat.emptyStateTitle')}
            suggestions={safeSuggestions}
            onPick={(s) => onSend(s)}
          />
        ) : (
          <div className="mx-auto flex max-w-[720px] flex-col gap-4">
            {messages.map((m, i) => (
              <MessageRow key={m.id ?? i} msg={m} />
            ))}
            {busy && <TypingIndicator />}
          </div>
        )}
      </div>

      {quickReplies.length > 0 && !busy && (
        <div className="mx-auto flex w-full max-w-[720px] flex-wrap gap-2 px-4 pb-2 md:px-8">
          {quickReplies.map((q, i) => (
            <button key={`${q}-${i}`} type="button" className="chip" onClick={() => onSend(q)}>
              {q}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="border-t border-primary/10 px-4 py-3 md:px-8"
      >
        <div className="mx-auto flex max-w-[720px] items-end gap-2 rounded-2xl border border-primary/20 bg-[rgb(var(--color-card))] px-3 py-2 focus-within:border-primary transition">
          {onAttach && (
            <>
              <button
                type="button"
                className="nav-icon-btn shrink-0"
                aria-label={t('chat.attach')}
                onClick={() => fileInputRef.current?.click()}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49L13 2.51a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 1 1-2.83-2.83L14.37 7" />
                </svg>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv,.tsv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && onAttach) onAttach(f);
                  e.target.value = '';
                }}
              />
            </>
          )}
          <textarea
            value={draft}
            rows={1}
            onChange={(e) => {
              setDraft(e.target.value);
              const el = e.target;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 180) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={placeholder || t('chat.placeholder')}
            className="flex-1 resize-none bg-transparent px-2 py-2 text-ink placeholder:text-muted focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="btn-primary shrink-0 rounded-xl !px-3 !py-2 disabled:opacity-50"
            aria-label={t('chat.send')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageRow({ msg }: { msg: ChatMsg }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-white">
          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <AvatarBadge />
      <div className="prose-chat max-w-[85%]">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                {children}
              </a>
            ),
          }}
        >
          {msg.content}
        </ReactMarkdown>
        {msg.streaming && <span className="cursor-blink" />}
      </div>
    </div>
  );
}

function AvatarBadge() {
  return (
    <div
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-accent font-serif font-bold text-sm"
    >
      K
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <AvatarBadge />
      <div className="flex items-center gap-1 rounded-2xl bg-surface/60 px-4 py-3">
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

function EmptyState({
  title,
  suggestions,
  onPick,
}: {
  title: string;
  suggestions: string[];
  onPick: (s: string) => void;
}) {
  return (
    <div className="mx-auto flex h-full max-w-[640px] flex-col items-center justify-center px-2 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-accent font-serif text-2xl font-bold">
        K
      </div>
      <h2 className="font-serif text-2xl font-bold text-primary md:text-3xl">{title}</h2>
      {suggestions.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {suggestions.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => onPick(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
