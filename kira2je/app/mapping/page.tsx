'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Circle, Edit2, ChevronRight, AlertTriangle, X, Check } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { mockMappingResult } from '@/lib/mocks';
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

// ─── Menu item chip ───────────────────────────────────────────────────────────

function MenuChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center text-xs font-medium bg-paper-100 text-ink-primary border border-paper-200 rounded-full px-2.5 py-0.5">
      {label}
    </span>
  );
}

// ─── Cost breakdown panel ─────────────────────────────────────────────────────

function CostBreakdownPanel({ mapping }: { mapping: MappingProposal }) {
  if (!mapping.unitCost || !mapping.portionsPerUnit || !mapping.costPerPortion) return null;

  const quantityUnit = mapping.quantity?.match(/\/(\w+)/)?.[1] ?? 'unit';

  return (
    <div className="mt-2 bg-paper-50 border border-paper-200 rounded-card p-3 space-y-2">
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
        <div>
          <span className="text-ink-secondary">Unit cost: </span>
          <span className="font-semibold text-ink-primary">RM {mapping.unitCost.toFixed(2)}/{quantityUnit}</span>
        </div>
        <div>
          <span className="text-ink-secondary">Portions per unit: </span>
          <span className="font-semibold text-ink-primary">{mapping.portionsPerUnit}</span>
        </div>
        <div>
          <span className="text-ink-secondary">Cost per portion: </span>
          <span className="font-semibold text-accent-primary">RM {mapping.costPerPortion.toFixed(2)}</span>
        </div>
      </div>

      {mapping.menuItemPortions && Object.keys(mapping.menuItemPortions).length > 0 && (
        <div className="space-y-1 pt-2 border-t border-paper-200">
          <p className="text-[10px] text-ink-secondary font-semibold uppercase tracking-wide">Ingredient cost per dish</p>
          {Object.entries(mapping.menuItemPortions).map(([dish, portions]) => {
            const cost = portions * (mapping.costPerPortion ?? 0);
            return (
              <div key={dish} className="flex items-center justify-between gap-2">
                <span className="text-xs text-ink-primary">{dish}</span>
                <span className="text-xs text-ink-secondary number whitespace-nowrap">
                  {portions} × RM {mapping.costPerPortion?.toFixed(2)} ={' '}
                  <span className="font-semibold text-ink-primary">RM {cost.toFixed(2)}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Inline edit panel ────────────────────────────────────────────────────────

const ALL_MENU_ITEMS = [
  'Grilled Chicken Set',
  'Chicken Rice',
  'Chicken Chop',
  'Nasi Goreng Kampung',
  'Nasi Lemak',
  'Mee Goreng',
  'Laksa',
  'Set Breakfast',
  'Teh Tarik',
  'Milo Dinosaur',
  'Sirap',
  'Takeaway orders',
];

function InlineEdit({
  current,
  onSave,
  onCancel,
}: {
  current: string[];
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

  return (
    <div className="mt-3 bg-paper-100 border border-paper-200 rounded-card p-4 space-y-3">
      <p className="section-label">Select menu items</p>
      <div className="flex flex-wrap gap-2">
        {ALL_MENU_ITEMS.map((item) => {
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
        <button
          onClick={onCancel}
          className="btn-secondary text-sm px-4 py-2 min-h-0"
        >
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
  onConfirm,
  onUpdateMenuItems,
}: {
  mapping: MappingProposal;
  confirmed: boolean;
  onConfirm: () => void;
  onUpdateMenuItems: (items: string[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [showCost, setShowCost] = useState(false);
  const hasCostData = !!(mapping.unitCost && mapping.portionsPerUnit);

  return (
    <div
      className={`card transition-colors ${
        confirmed ? 'border-accent-secondary/40 bg-paper-50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Confirm toggle */}
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

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Top row: ingredient + confidence + edit */}
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="font-semibold text-ink-primary text-sm leading-tight">
                {mapping.ingredient}
              </div>
              <div className="text-xs text-ink-secondary mt-0.5">
                {mapping.supplier && (
                  <span className="mr-2">{mapping.supplier}</span>
                )}
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

          {/* Menu items chips */}
          {!editing && (
            <div className="flex flex-wrap gap-1.5">
              {mapping.menuItems.length > 0 ? (
                mapping.menuItems.map((item) => (
                  <MenuChip key={item} label={item} />
                ))
              ) : (
                <span className="text-xs text-ink-secondary italic">No menu items assigned</span>
              )}
            </div>
          )}

          {/* Cost breakdown toggle */}
          {hasCostData && !editing && (
            <button
              onClick={() => setShowCost((v) => !v)}
              className="flex items-center gap-1 text-xs text-accent-primary hover:text-accent-primary/75 transition-colors mt-0.5"
            >
              <ChevronRight
                size={12}
                className={`transition-transform duration-200 ${showCost ? 'rotate-90' : ''}`}
              />
              {showCost ? 'Hide cost breakdown' : 'Show cost per dish'}
            </button>
          )}

          {showCost && !editing && <CostBreakdownPanel mapping={mapping} />}

          {/* Inline edit */}
          {editing && (
            <InlineEdit
              current={mapping.menuItems}
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

export default function MappingPage() {
  const initial = mockMappingResult();

  const [mappings, setMappings] = useState<MappingProposal[]>(initial.mappings);
  const [confirmed, setConfirmed] = useState<boolean[]>(
    () => initial.mappings.map(() => false)
  );
  const [allConfirmed, setAllConfirmed] = useState(false);
  const [showToast, setShowToast] = useState(false);

  function toggleConfirm(i: number) {
    setConfirmed((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  }

  function confirmAll() {
    setConfirmed(mappings.map(() => true));
    setAllConfirmed(true);
    setShowToast(true);
  }

  function updateMenuItems(i: number, items: string[]) {
    setMappings((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], menuItems: items };
      return next;
    });
  }

  const confirmedCount = confirmed.filter(Boolean).length;
  const hasUnmatched =
    initial.unmappedIngredients.length > 0 || initial.unmappedMenuItems.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-paper-100">
      <AppHeader
        title="Ingredient Mapping"
        backHref="/dashboard"
        subtitle="We matched your April invoice ingredients to your menu items."
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

          {/* Subtitle + actions */}
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
                className="btn-primary text-sm px-4 py-2.5 min-h-0 flex items-center gap-1.5"
              >
                <CheckCircle size={15} />
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
                  Generate report
                  <ChevronRight size={13} />
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

          {/* Mapping rows */}
          <div className="space-y-3">
            <p className="section-label">Matched ingredients ({mappings.length})</p>
            {mappings.map((m, i) => (
              <MappingRow
                key={m.ingredient}
                mapping={m}
                confirmed={confirmed[i]}
                onConfirm={() => toggleConfirm(i)}
                onUpdateMenuItems={(items) => updateMenuItems(i, items)}
              />
            ))}
          </div>

          {/* Unmatched section */}
          {hasUnmatched && (
            <div className="space-y-3">
              <p className="section-label flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-amber-600" />
                Unmatched
              </p>

              {initial.unmappedIngredients.length > 0 && (
                <div className="card">
                  <p className="text-xs font-semibold text-ink-secondary mb-2">
                    Ingredients without menu match
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {initial.unmappedIngredients.map((ing) => (
                      <span
                        key={ing}
                        className="inline-flex items-center text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1"
                      >
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {initial.unmappedMenuItems.length > 0 && (
                <div className="card">
                  <p className="text-xs font-semibold text-ink-secondary mb-2">
                    Menu items without ingredient data
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {initial.unmappedMenuItems.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center text-xs font-medium bg-danger/10 text-danger border border-danger/20 rounded-full px-3 py-1"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom action */}
          {allConfirmed && (
            <div className="pt-2">
              <Link
                href="/report/generate"
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
              >
                Generate report
                <ChevronRight size={16} />
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
