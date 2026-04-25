'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  Circle,
  Edit2,
  ChevronRight,
  AlertTriangle,
  X,
  Check,
  Loader2,
  RefreshCw,
  Tag,
  DollarSign,
} from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import type { MappingProposal } from '@/lib/schemas';

// ─── Confidence badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const styles = {
    high: 'bg-accent-secondary/15 text-accent-secondary',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-danger/10 text-danger',
  };
  const labels = { high: 'High', medium: 'Medium', low: 'Low' };
  return (
    <span className={`pill text-xs font-semibold px-2 py-0.5 rounded-full ${styles[level]}`}>
      {labels[level]}
    </span>
  );
}

function MenuChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center text-xs font-medium bg-paper-100 text-ink-primary border border-paper-200 rounded-full px-2.5 py-0.5">
      {label}
    </span>
  );
}

// ─── Inline edit panel ────────────────────────────────────────────────────────

function InlineEdit({
  current,
  options,
  onSave,
  onCancel,
}: {
  current: string[];
  options: string[];
  onSave: (items: string[]) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(current));

  function toggle(item: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  const allOptions = [...new Set([...options, ...current])].sort();

  return (
    <div className="mt-3 bg-paper-100 border border-paper-200 rounded-card p-4 space-y-3">
      <p className="section-label">Select menu items</p>
      <div className="flex flex-wrap gap-2">
        {allOptions.map((item) => {
          const active = selected.has(item);
          return (
            <button
              key={item}
              onClick={() => toggle(item)}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                active
                  ? 'bg-accent-primary text-white border-accent-primary'
                  : 'bg-paper-50 text-ink-primary border-paper-200 hover:border-ink-secondary'
              }`}
            >
              {active ? <Check size={11} /> : null}
              {item}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(Array.from(selected))}
          className="btn-primary text-sm px-4 py-2 min-h-0"
        >
          Save
        </button>
        <button onClick={onCancel} className="btn-secondary text-sm px-4 py-2 min-h-0">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Mapping row ──────────────────────────────────────────────────────────────

function MappingRow({
  mapping,
  confirmed,
  menuOptions,
  onConfirm,
  onUpdateMenuItems,
  autoEdit = false,
}: {
  mapping: MappingProposal;
  confirmed: boolean;
  menuOptions: string[];
  onConfirm: () => void;
  onUpdateMenuItems: (items: string[]) => void;
  autoEdit?: boolean;
}) {
  const [editing, setEditing] = useState(autoEdit);

  return (
    <div className={`card transition-colors ${confirmed ? 'border-accent-secondary/40 bg-paper-50' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={onConfirm}
          className="mt-0.5 shrink-0 text-ink-secondary hover:text-accent-secondary transition-colors"
          aria-label={confirmed ? 'Confirmed' : 'Confirm this mapping'}
        >
          {confirmed ? (
            <CheckCircle size={20} className="text-accent-secondary" />
          ) : (
            <Circle size={20} />
          )}
        </button>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="font-semibold text-ink-primary text-sm leading-tight">
                {mapping.ingredient}
              </div>
              <div className="text-xs text-ink-secondary mt-0.5">
                {mapping.supplier && <span className="mr-2">{mapping.supplier}</span>}
                {mapping.quantity && (
                  <span className="font-medium text-ink-primary">{mapping.quantity}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ConfidenceBadge level={mapping.confidence} />
              <button
                onClick={() => setEditing((v) => !v)}
                className="p-1.5 rounded-btn hover:bg-paper-100 text-ink-secondary hover:text-ink-primary transition-colors"
                aria-label="Edit mapping"
              >
                <Edit2 size={14} />
              </button>
            </div>
          </div>

          {!editing && (
            <div className="flex flex-wrap gap-1.5">
              {mapping.menuItems.length > 0 ? (
                mapping.menuItems.map((item) => <MenuChip key={item} label={item} />)
              ) : (
                <span className="text-xs text-ink-secondary italic">No menu items assigned</span>
              )}
            </div>
          )}

          {editing && (
            <InlineEdit
              current={mapping.menuItems}
              options={menuOptions}
              onSave={(items) => {
                onUpdateMenuItems(items);
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type ItemOverride = { type: 'service' | 'manual'; manualCost?: number };

type ApiData = {
  proposals: MappingProposal[];
  confirmedIngredients: string[];
  unmappedIngredients: string[];
  unmappedMenuItems: string[];
  menuItems: string[];
  hasInvoices: boolean;
  hasPos: boolean;
  overrides?: { itemName: string; type: 'service' | 'manual'; manualCost?: number }[];
  llmError?: string | null;
};

export default function MappingPage() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const [mappings, setMappings] = useState<MappingProposal[]>([]);
  const [confirmed, setConfirmed] = useState<boolean[]>([]);
  const [overrides, setOverrides] = useState<Record<string, ItemOverride>>({});
  const [autoEditIdx, setAutoEditIdx] = useState<number | null>(null);
  const [matchedOver, setMatchedOver] = useState(false);
  const [unmatchedOver, setUnmatchedOver] = useState(false);
  const matchedEnterRef = useRef(0);
  const unmatchedEnterRef = useRef(0);

  async function fetchMappings() {
    setLoading(true);
    setError(null);
    setLlmError(null);
    try {
      const res = await fetch('/api/mapping');
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'Failed to load mappings.');
        return;
      }
      const d = json as ApiData;
      setData(d);
      setMappings(d.proposals);
      setLlmError(d.llmError ?? null);
      const confirmedSet = new Set(d.confirmedIngredients);
      setConfirmed(d.proposals.map((p) => confirmedSet.has(p.ingredient)));
      const overrideMap: Record<string, ItemOverride> = {};
      for (const o of d.overrides ?? []) overrideMap[o.itemName] = { type: o.type, manualCost: o.manualCost };
      setOverrides(overrideMap);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchMappings(); }, []);

  function toggleConfirm(i: number) {
    setConfirmed((prev) => { const n = [...prev]; n[i] = !n[i]; return n; });
  }

  async function saveConfirmed(confirmedMappings: MappingProposal[]) {
    setSaving(true);
    try {
      await fetch('/api/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mappings: confirmedMappings.map((m) => ({
            ingredient: m.ingredient,
            supplier: m.supplier,
            menuItems: m.menuItems,
          })),
          overrides: Object.entries(overrides).map(([itemName, o]) => ({
            itemName,
            type: o.type,
            manualCost: o.manualCost,
          })),
        }),
      });
    } catch {
      // non-blocking — UI still shows toast
    } finally {
      setSaving(false);
    }
  }

  async function confirmAll() {
    setConfirmed(mappings.map(() => true));
    setShowToast(true);
    await saveConfirmed(mappings);
  }

  function updateMenuItems(i: number, items: string[]) {
    setMappings((prev) => {
      const n = [...prev];
      n[i] = { ...n[i], menuItems: items };
      return n;
    });
  }

  function dropToMatched(ingredient: string) {
    setMappings((prev) => {
      const next = [...prev, { ingredient, menuItems: [], confidence: 'low' as const }];
      setAutoEditIdx(next.length - 1);
      return next;
    });
    setConfirmed((prev) => [...prev, false]);
    setData((prev) => prev ? { ...prev, unmappedIngredients: prev.unmappedIngredients.filter((i) => i !== ingredient) } : prev);
    matchedEnterRef.current = 0;
    setMatchedOver(false);
  }

  function dropToUnmatched(ingredient: string, idx: number) {
    setMappings((prev) => prev.filter((_, i) => i !== idx));
    setConfirmed((prev) => prev.filter((_, i) => i !== idx));
    setData((prev) => prev ? { ...prev, unmappedIngredients: [...prev.unmappedIngredients, ingredient] } : prev);
    setAutoEditIdx(null);
    unmatchedEnterRef.current = 0;
    setUnmatchedOver(false);
  }

  const confirmedCount = confirmed.filter(Boolean).length;
  const allConfirmed = mappings.length > 0 && confirmedCount === mappings.length;

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-paper-100">
        <AppHeader title="Ingredient Mapping" backHref="/dashboard" />
        <div className="flex-1 flex items-center justify-center gap-3 text-ink-secondary">
          <Loader2 className="w-5 h-5 animate-spin" />
          <p className="text-sm">Matching your invoices to menu items…</p>
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-paper-100">
        <AppHeader title="Ingredient Mapping" backHref="/dashboard" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-5">
          <p className="text-sm text-danger">{error}</p>
          <button onClick={fetchMappings} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  // ── No invoices or POS ──────────────────────────────────────────────────────
  if (data && (!data.hasInvoices || !data.hasPos)) {
    return (
      <div className="min-h-screen flex flex-col bg-paper-100">
        <AppHeader title="Ingredient Mapping" backHref="/dashboard" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-5 text-center max-w-sm mx-auto">
          <AlertTriangle size={32} className="text-amber-500" />
          <p className="font-medium text-ink-primary">
            {!data.hasInvoices && !data.hasPos
              ? 'Upload invoices and POS data first'
              : !data.hasInvoices
              ? 'No confirmed invoices for April'
              : 'No POS sales data for April'}
          </p>
          <p className="text-sm text-ink-secondary">
            {!data.hasInvoices
              ? 'Confirm at least one invoice so we know what ingredients you bought.'
              : 'Upload your POS export so we know which menu items to map to.'}
          </p>
          <div className="flex gap-3">
            {!data.hasInvoices && (
              <Link href="/invoices" className="btn-primary text-sm">Go to Invoices</Link>
            )}
            {!data.hasPos && (
              <Link href="/upload/pos" className="btn-primary text-sm">Upload POS Data</Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const menuOptions = data?.menuItems ?? [];
  const mappedMenuItems = new Set(mappings.flatMap((m) => m.menuItems));
  const unmappedMenuItems = (data?.unmappedMenuItems ?? []).filter((item) => !mappedMenuItems.has(item));
  const hasUnmatched =
    (data?.unmappedIngredients.length ?? 0) > 0 ||
    unmappedMenuItems.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-paper-100">
      <AppHeader
        title="Ingredient Mapping"
        backHref="/dashboard"
        subtitle="We matched your April invoice ingredients to your menu items."
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

          {/* LLM degraded warning */}
          {llmError && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
              <span>{llmError}</span>
            </div>
          )}

          {/* Header row */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <p className="text-sm text-ink-secondary max-w-lg leading-relaxed">
              Correct any mistakes — these are saved and reused next month.
            </p>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-ink-secondary">
                {confirmedCount}/{mappings.length} confirmed
              </span>
              <button
                onClick={confirmAll}
                disabled={saving}
                className="btn-primary text-sm px-4 py-2.5 min-h-0 flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={15} />}
                Confirm all
              </button>
            </div>
          </div>

          {/* Success toast */}
          {showToast && (
            <div className="flex items-center justify-between gap-3 bg-accent-secondary/10 border border-accent-secondary/30 rounded-card px-4 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-accent-secondary shrink-0" />
                <span className="text-sm font-medium text-accent-secondary">
                  All mappings confirmed! Ready to generate your report.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/report/generate"
                  className="btn-primary text-xs px-3 py-1.5 min-h-0 inline-flex items-center gap-1"
                >
                  Generate report <ChevronRight size={13} />
                </Link>
                <button
                  onClick={() => setShowToast(false)}
                  className="text-ink-secondary hover:text-ink-primary p-1"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Matched ingredients — drop zone for unmatched pills */}
          <div
            className="space-y-3"
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={() => { matchedEnterRef.current++; setMatchedOver(true); }}
            onDragLeave={() => { matchedEnterRef.current--; if (matchedEnterRef.current <= 0) setMatchedOver(false); }}
            onDrop={(e) => {
              e.preventDefault();
              try {
                const { ingredient, source } = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (source === 'unmatched') dropToMatched(ingredient);
              } catch { /* ignore drops from outside */ }
            }}
          >
            <p className="section-label">Matched ingredients ({mappings.length})</p>

            <div className={`rounded-card border-2 border-dashed transition-all duration-150 overflow-hidden ${matchedOver ? 'border-accent-primary bg-accent-primary/5 py-3 px-4' : 'border-transparent h-0 py-0'}`}>
              {matchedOver && <p className="text-sm text-accent-primary text-center font-medium">Drop here to add to matched</p>}
            </div>

            {mappings.map((m, i) => (
              <div
                key={m.ingredient}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', JSON.stringify({ ingredient: m.ingredient, source: 'matched', idx: i }));
                  e.dataTransfer.effectAllowed = 'move';
                }}
              >
                <MappingRow
                  mapping={m}
                  confirmed={confirmed[i] ?? false}
                  menuOptions={menuOptions}
                  onConfirm={() => toggleConfirm(i)}
                  onUpdateMenuItems={(items) => updateMenuItems(i, items)}
                  autoEdit={autoEditIdx === i}
                />
              </div>
            ))}
          </div>

          {/* Unmatched — also a drop zone for matched cards being moved back */}
          {hasUnmatched && (
            <div className="space-y-3">
              <p className="section-label flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-amber-600" />
                Unmatched
              </p>
              {(data?.unmappedIngredients.length ?? 0) > 0 && (
                <div
                  className={`card transition-colors duration-150 ${unmatchedOver ? 'border-amber-400 bg-amber-50/60' : ''}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnter={() => { unmatchedEnterRef.current++; setUnmatchedOver(true); }}
                  onDragLeave={() => { unmatchedEnterRef.current--; if (unmatchedEnterRef.current <= 0) setUnmatchedOver(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    try {
                      const { ingredient, source, idx } = JSON.parse(e.dataTransfer.getData('text/plain'));
                      if (source === 'matched') dropToUnmatched(ingredient, idx);
                    } catch { /* ignore */ }
                  }}
                >
                  <p className="text-xs font-semibold text-ink-secondary mb-1">
                    Ingredients without menu match
                  </p>
                  <p className="text-xs text-ink-secondary mb-3">Drag to the matched list above to assign menu items. Drag a matched card here to unmatch it.</p>
                  <div className="flex flex-wrap gap-2">
                    {data!.unmappedIngredients.map((ing) => (
                      <span
                        key={ing}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', JSON.stringify({ ingredient: ing, source: 'unmatched' }));
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        className="inline-flex items-center text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1 cursor-grab active:cursor-grabbing select-none"
                      >
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {unmappedMenuItems.length > 0 && (
                <div className="card space-y-3">
                  <p className="text-xs font-semibold text-ink-secondary">
                    Menu items without ingredient data
                  </p>
                  {unmappedMenuItems.map((item) => {
                    const ov = overrides[item];
                    return (
                      <div key={item} className="space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-sm font-medium text-ink-primary">{item}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setOverrides((o) => {
                                const next = { ...o };
                                if (next[item]?.type === 'service') delete next[item];
                                else next[item] = { type: 'service' };
                                return next;
                              })}
                              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                                ov?.type === 'service'
                                  ? 'bg-accent-primary text-white border-accent-primary'
                                  : 'bg-paper-50 text-ink-secondary border-paper-200 hover:border-accent-primary/50'
                              }`}
                            >
                              <Tag size={11} /> Service / fee item
                            </button>
                            <button
                              onClick={() => setOverrides((o) => {
                                const next = { ...o };
                                if (next[item]?.type === 'manual') delete next[item];
                                else next[item] = { type: 'manual', manualCost: undefined };
                                return next;
                              })}
                              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                                ov?.type === 'manual'
                                  ? 'bg-accent-primary text-white border-accent-primary'
                                  : 'bg-paper-50 text-ink-secondary border-paper-200 hover:border-accent-primary/50'
                              }`}
                            >
                              <DollarSign size={11} /> Enter cost
                            </button>
                          </div>
                        </div>
                        {ov?.type === 'service' && (
                          <p className="text-xs text-ink-secondary pl-1">Counted as &quot;Other revenue&quot; in report — no COGS.</p>
                        )}
                        {ov?.type === 'manual' && (
                          <div className="flex items-center gap-2 pl-1">
                            <span className="text-xs text-ink-secondary">Cost per unit:</span>
                            <div className="flex items-center gap-1 bg-paper-100 border border-paper-200 rounded-lg px-2 py-1">
                              <span className="text-xs text-ink-secondary">RM</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={ov.manualCost ?? ''}
                                onChange={(e) => setOverrides((o) => ({
                                  ...o,
                                  [item]: { type: 'manual', manualCost: parseFloat(e.target.value) || undefined },
                                }))}
                                className="w-20 text-xs bg-transparent outline-none text-ink-primary font-medium"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Regenerate */}
          <div className="flex justify-center pt-2">
            <button
              onClick={fetchMappings}
              className="flex items-center gap-2 text-xs text-ink-secondary hover:text-ink-primary transition-colors"
            >
              <RefreshCw size={12} /> Re-run AI mapping
            </button>
          </div>

          {allConfirmed && (
            <div className="pt-2">
              <Link
                href="/report/generate"
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
              >
                Generate report <ChevronRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
