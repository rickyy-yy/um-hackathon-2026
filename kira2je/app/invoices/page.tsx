'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Plus,
  Camera,
  Upload,
  MessageCircle,
  X,
  Loader2,
} from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { LoadingDots } from '@/components/LoadingDots';
import { useT } from '@/lib/i18n/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type Confidence = 'high' | 'medium' | 'low';

type MockInvoice = {
  id: string;
  supplierName: string | null;
  invoiceDate: string | null;
  total: number | null;
  confidence: Confidence;
  lineItems: LineItem[];
  status?: string;
};

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Confidence badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ conf }: { conf: Confidence }) {
  if (conf === 'high') return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-accent-secondary/15 text-accent-secondary">
      <CheckCircle size={12} /> High
    </span>
  );
  if (conf === 'medium') return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
      <AlertCircle size={12} /> Medium
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-danger/10 text-danger">
      <XCircle size={12} /> Low — verify
    </span>
  );
}

// ─── WhatsApp card ────────────────────────────────────────────────────────────

function WhatsAppCard() {
  return (
    <a
      href="https://wa.me/601234567890"
      target="_blank"
      rel="noopener noreferrer"
      className="card flex items-center gap-3 border-[#25D366]/25 bg-[#25D366]/5 hover:bg-[#25D366]/10 transition-colors"
    >
      <div className="w-9 h-9 rounded-full bg-[#25D366]/15 flex items-center justify-center shrink-0">
        <MessageCircle size={18} className="text-[#25D366]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink-primary">Forward invoices via WhatsApp</p>
        <p className="text-xs text-ink-secondary mt-0.5">
          Snap &amp; send to <span className="font-medium text-ink-primary">+60-1234-5678</span> — auto-queued here
        </p>
      </div>
      <ChevronRight size={16} className="text-ink-secondary shrink-0" />
    </a>
  );
}

// ─── Upload bottom sheet ──────────────────────────────────────────────────────

function UploadSheet({
  onClose,
  onRefresh,
  month,
}: {
  onClose: () => void;
  onRefresh: () => void;
  month: string;
}) {
  const [processing, setProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setProcessing(true);
    setUploadError(null);

    try {
      const images: { name: string; base64: string; mimeType: string }[] = [];

      for (const file of Array.from(fileList)) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const b64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(b64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        images.push({ name: file.name, base64, mimeType: file.type || 'image/jpeg' });
      }

      const res = await fetch('/api/upload/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, month }),
      });
      const data = await res.json() as { ok: boolean; error?: string; count?: number };

      if (res.ok && data.ok) {
        onRefresh();
        onClose();
      } else {
        setUploadError(data.error ?? 'Could not read the invoice. Please try a clearer photo.');
        setProcessing(false);
      }
    } catch (e) {
      setUploadError('Network error. Please try again.');
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <motion.div
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={!processing ? onClose : undefined}
      />
      <motion.div
        className="relative bg-paper-50 rounded-t-3xl px-5 pt-3 pb-10"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-paper-300 rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-ink-primary text-base">Add invoice</h2>
          {!processing && (
            <button onClick={onClose} className="p-1.5 rounded-btn text-ink-secondary hover:text-ink-primary transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {processing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-10"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 size={36} className="text-accent-primary" />
              </motion.div>
              <div className="text-center">
                <p className="text-sm font-semibold text-ink-primary flex items-center gap-1.5">
                  Reading invoice<LoadingDots />
                </p>
                <p className="text-xs text-ink-secondary mt-1">Extracting line items with AI</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="options"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 gap-3"
            >
              {/* Camera */}
              <label className="card flex flex-col items-center gap-3 py-7 cursor-pointer hover:bg-paper-100 active:bg-paper-200 transition-colors text-center select-none">
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <Camera size={30} className="text-accent-primary" />
                <div>
                  <p className="text-sm font-semibold text-ink-primary">Take photo</p>
                  <p className="text-xs text-ink-secondary mt-0.5">Use your camera</p>
                </div>
              </label>

              {/* File */}
              <label className="card flex flex-col items-center gap-3 py-7 cursor-pointer hover:bg-paper-100 active:bg-paper-200 transition-colors text-center select-none">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <Upload size={30} className="text-ink-secondary" />
                <div>
                  <p className="text-sm font-semibold text-ink-primary">Upload file</p>
                  <p className="text-xs text-ink-secondary mt-0.5">PDF or image</p>
                </div>
              </label>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ─── Invoice card ─────────────────────────────────────────────────────────────

function InvoiceCard({
  invoice,
  isNew,
  onDelete,
  onEdit,
  onConfirm,
}: {
  invoice: MockInvoice;
  isNew: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string, patch: Partial<MockInvoice>) => void;
  onConfirm: (id: string) => void;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  // Editable draft state
  const [draftSupplier, setDraftSupplier] = useState(invoice.supplierName ?? '');
  const [draftDate, setDraftDate] = useState(invoice.invoiceDate ?? '');
  const [draftTax, setDraftTax] = useState('0');
  const [draftItems, setDraftItems] = useState<LineItem[]>(invoice.lineItems);

  const subtotal = draftItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const taxAmt = parseFloat(draftTax) || 0;
  const computedTotal = subtotal + taxAmt;

  function startEdit() {
    setDraftSupplier(invoice.supplierName ?? '');
    setDraftDate(invoice.invoiceDate ?? '');
    setDraftTax('0');
    setDraftItems(invoice.lineItems.map((li) => ({ ...li })));
    setEditing(true);
  }

  async function saveEdit() {
    const items = draftItems.map((li) => ({
      ...li,
      total: li.quantity * li.unitPrice,
    }));
    const patch: Partial<MockInvoice> = {
      supplierName: draftSupplier.trim() || null,
      invoiceDate: draftDate,
      total: computedTotal,
      lineItems: items,
      confidence: 'high',
    };
    await fetch(`/api/invoices/${invoice.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierName: patch.supplierName,
        invoiceDate: draftDate,
        total: computedTotal,
        lineItems: items,
        confidence: 'high',
      }),
    });
    onEdit(invoice.id, patch);
    setEditing(false);
  }

  function updateItem(i: number, field: keyof LineItem, value: string) {
    setDraftItems((prev) => {
      const next = [...prev];
      const parsed = parseFloat(value) || 0;
      next[i] = {
        ...next[i],
        [field]: field === 'description' ? value : parsed,
      };
      return next;
    });
  }

  function addItem() {
    setDraftItems((prev) => [
      ...prev,
      { description: '', quantity: 1, unitPrice: 0, total: 0 },
    ]);
  }

  function removeItem(i: number) {
    setDraftItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  if (editing) {
    return (
      <motion.div
        layout
        className="card space-y-4 overflow-hidden ring-2 ring-accent-primary/40"
      >
        <p className="text-xs font-semibold text-accent-primary uppercase tracking-wide">Editing invoice</p>

        {/* Supplier + date */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-ink-secondary mb-1 block">Supplier</label>
            <input
              value={draftSupplier}
              onChange={(e) => setDraftSupplier(e.target.value)}
              placeholder="Supplier name"
              className="w-full border border-paper-200 rounded-btn px-3 py-2 text-sm text-ink-primary bg-paper-50 focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
            />
          </div>
          <div>
            <label className="text-xs text-ink-secondary mb-1 block">Date</label>
            <input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              className="w-full border border-paper-200 rounded-btn px-3 py-2 text-sm text-ink-primary bg-paper-50 focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
            />
          </div>
        </div>

        {/* Line items */}
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_56px_72px_28px] gap-1.5">
            <p className="text-xs text-ink-secondary font-medium">Line items</p>
            <p className="text-xs text-ink-secondary font-medium text-right">Qty</p>
            <p className="text-xs text-ink-secondary font-medium text-right">Price (RM)</p>
            <span />
          </div>
          {draftItems.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_56px_72px_28px] gap-1.5 items-center">
              <input
                value={item.description}
                onChange={(e) => updateItem(i, 'description', e.target.value)}
                placeholder="Description"
                className="border border-paper-200 rounded-btn px-2 py-1.5 text-xs text-ink-primary bg-paper-50 focus:outline-none focus:ring-1 focus:ring-accent-primary/30"
              />
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                className="border border-paper-200 rounded-btn px-2 py-1.5 text-xs text-ink-primary bg-paper-50 focus:outline-none focus:ring-1 focus:ring-accent-primary/30 text-right"
              />
              <input
                type="number"
                step="0.01"
                value={item.unitPrice}
                onChange={(e) => updateItem(i, 'unitPrice', e.target.value)}
                className="border border-paper-200 rounded-btn px-2 py-1.5 text-xs text-ink-primary bg-paper-50 focus:outline-none focus:ring-1 focus:ring-accent-primary/30 text-right"
              />
              <button
                onClick={() => removeItem(i)}
                className="text-danger hover:text-danger/70 transition-colors flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={addItem}
            className="text-xs text-accent-primary hover:underline flex items-center gap-1 mt-1"
          >
            <Plus size={12} /> Add item
          </button>
        </div>

        {/* Auto-calculated totals */}
        <div className="bg-paper-100 rounded-btn px-4 py-3 space-y-2 text-sm">
          <div className="flex justify-between text-ink-secondary">
            <span>Subtotal</span>
            <span className="tabular">RM {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-ink-secondary">Tax / SST / charges</span>
            <div className="flex items-center gap-1.5">
              <span className="text-ink-secondary text-xs">RM</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={draftTax}
                onChange={(e) => setDraftTax(e.target.value)}
                className="w-20 border border-paper-200 rounded-btn px-2 py-1 text-xs text-ink-primary bg-paper-50 focus:outline-none focus:ring-1 focus:ring-accent-primary/30 text-right"
              />
            </div>
          </div>
          <div className="flex justify-between font-semibold text-ink-primary border-t border-paper-200 pt-2 mt-1">
            <span>Total</span>
            <span className="tabular">RM {computedTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Save / Cancel */}
        <div className="flex gap-3 pt-1">
          <button onClick={saveEdit} className="flex-1 btn-primary text-sm py-2.5">
            Save changes
          </button>
          <button onClick={() => setEditing(false)} className="btn-secondary text-sm py-2.5 px-4">
            Cancel
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, y: -12, scale: 0.97 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.25 }}
      className={`card space-y-4 overflow-hidden ${isNew ? 'ring-2 ring-accent-primary/30' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-ink-primary leading-tight truncate">
            {invoice.supplierName ?? 'Unknown supplier'}
          </p>
          <p className="text-xs text-ink-secondary mt-0.5">{invoice.invoiceDate ?? '—'}</p>
        </div>
        <ConfidenceBadge conf={invoice.confidence} />
      </div>

      <div>
        <p className="text-xs text-ink-secondary">{t('queue.total')}</p>
        <p className="text-2xl font-bold text-ink-primary tabular mt-0.5">
          RM {(invoice.total ?? 0).toFixed(2)}
        </p>
      </div>

      <button
        onClick={() => setExpanded((o) => !o)}
        className="flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink-primary transition-colors"
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? 'Hide items' : `Show items (${invoice.lineItems.length})`}
      </button>

      {expanded && (
        <div className="bg-paper-100 rounded-btn overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-ink-secondary border-b border-paper-200">
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Unit</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item, i) => (
                <tr key={i} className="border-t border-paper-200/50">
                  <td className="px-3 py-2 text-ink-primary">{item.description}</td>
                  <td className="px-3 py-2 text-right text-ink-secondary tabular">{item.quantity}</td>
                  <td className="px-3 py-2 text-right text-ink-secondary tabular">RM {item.unitPrice.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right text-ink-primary font-medium tabular">RM {item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        {invoice.status === 'confirmed' ? (
          <button onClick={startEdit} className="flex-1 btn-secondary text-sm py-2.5">{t('queue.edit')}</button>
        ) : (
          <button
            onClick={() => onConfirm(invoice.id)}
            className="flex-1 btn-primary text-sm py-2.5"
          >
            Confirm
          </button>
        )}
        <button onClick={() => onDelete(invoice.id)} className="text-sm text-danger hover:underline px-2 py-2.5">
          {t('queue.delete')}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ConfirmationQueuePageInner() {
  const searchParams = useSearchParams();
  const CURRENT_MONTH = searchParams.get('month') ?? getCurrentMonth();

  const t = useT();
  const [invoices, setInvoices] = useState<MockInvoice[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [newId, setNewId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices?month=${CURRENT_MONTH}`);
      if (!res.ok) throw new Error('Failed to load invoices');
      const data = (await res.json()) as { ok: boolean; invoices: MockInvoice[] };
      setInvoices(data.invoices ?? []);
    } catch {
      setError('Failed to load invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [CURRENT_MONTH]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    }
  }

  function handleEdit(id: string, patch: Partial<MockInvoice>) {
    setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...patch } : inv)));
  }

  async function handleConfirm(id: string) {
    const res = await fetch(`/api/invoices/${id}`, { method: 'POST' });
    if (res.ok) {
      setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, status: 'confirmed' } : inv)));
    }
  }

  async function confirmAllHigh() {
    const highPending = invoices.filter((inv) => inv.status !== 'confirmed' && inv.confidence === 'high');
    await Promise.all(highPending.map((inv) => fetch(`/api/invoices/${inv.id}`, { method: 'POST' })));
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.confidence === 'high' && inv.status !== 'confirmed' ? { ...inv, status: 'confirmed' } : inv
      )
    );
  }

  function handleRefresh() {
    fetchInvoices();
  }

  const highPendingCount = invoices.filter((inv) => inv.status !== 'confirmed' && inv.confidence === 'high').length;

  const addButton = (
    <button
      onClick={() => setSheetOpen(true)}
      className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-3 py-1.5 rounded-btn transition-colors"
    >
      <Plus size={15} />
      Add
    </button>
  );

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col">
        <AppHeader title={t('queue.title')} backHref="/dashboard" action={addButton} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={36} className="animate-spin text-accent-primary" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col">
        <AppHeader title={t('queue.title')} backHref="/dashboard" action={addButton} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-5">
          <p className="text-sm text-danger text-center">{error}</p>
          <button onClick={fetchInvoices} className="btn-secondary text-sm">
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <AppHeader title={t('queue.title')} backHref="/dashboard" action={addButton} />

      <div className="flex-1 px-5 pt-5 pb-28 max-w-2xl mx-auto w-full space-y-4">

        {/* WhatsApp shortcut */}
        <WhatsAppCard />

        {/* All confirmed → prompt to generate report */}
        {invoices.length > 0 && highPendingCount === 0 && invoices.every(inv => inv.status === 'confirmed') && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-btn bg-accent-primary/10 border border-accent-primary/25">
            <p className="text-sm text-ink-primary">
              All invoices confirmed for this month.
            </p>
            <Link
              href={`/report/generate?month=${CURRENT_MONTH}`}
              className="text-sm font-semibold text-accent-primary hover:underline shrink-0 flex items-center gap-1"
            >
              Generate report <ChevronRight size={13} />
            </Link>
          </div>
        )}

        {/* Batch confirm high-confidence */}
        {highPendingCount > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-btn bg-accent-secondary/10 border border-accent-secondary/25">
            <p className="text-sm text-ink-primary">
              <span className="font-semibold">{highPendingCount}</span> high-confidence invoice{highPendingCount !== 1 ? 's' : ''} ready to confirm
            </p>
            <button
              onClick={confirmAllHigh}
              className="text-sm font-semibold text-accent-secondary hover:underline shrink-0"
            >
              Confirm all
            </button>
          </div>
        )}

        {invoices.length === 0 ? (
          <div className="card flex flex-col items-center justify-center gap-4 py-16 text-center">
            <CheckCircle size={48} className="text-accent-secondary" />
            <div>
              <p className="font-semibold text-ink-primary text-lg">{t('queue.empty')}</p>
              <p className="text-sm text-ink-secondary mt-1">No invoices submitted yet — tap + to add one.</p>
            </div>
            <Link href="/dashboard" className="btn-secondary text-sm">Back to dashboard</Link>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {invoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                isNew={invoice.id === newId}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onConfirm={handleConfirm}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* FAB */}
      <motion.button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-6 right-5 w-14 h-14 rounded-full bg-accent-primary shadow-lg flex items-center justify-center text-white z-40"
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
      >
        <Plus size={24} />
      </motion.button>

      {/* Upload sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <UploadSheet
            onClose={() => setSheetOpen(false)}
            onRefresh={handleRefresh}
            month={CURRENT_MONTH}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

export default function ConfirmationQueuePage() {
  return (
    <Suspense>
      <ConfirmationQueuePageInner />
    </Suspense>
  );
}
