'use client';

import { useState, useRef } from 'react';
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
  invoiceDate: string;
  total: number;
  confidence: Confidence;
  lineItems: LineItem[];
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_INVOICES: MockInvoice[] = [
  {
    id: 'inv-1',
    supplierName: 'Syarikat Pembekal Segar Sdn Bhd',
    invoiceDate: '2026-04-20',
    total: 1420.50,
    confidence: 'high',
    lineItems: [
      { description: 'Ayam Segar (1kg)', quantity: 20, unitPrice: 12.50, total: 250.00 },
      { description: 'Beras Wangi (10kg)', quantity: 5, unitPrice: 45.00, total: 225.00 },
      { description: 'Minyak Masak (5L)', quantity: 8, unitPrice: 32.00, total: 256.00 },
      { description: 'Santan Peket (200ml)', quantity: 30, unitPrice: 2.80, total: 84.00 },
      { description: 'Cili Kering (500g)', quantity: 6, unitPrice: 18.00, total: 108.00 },
      { description: 'Bawang Merah (1kg)', quantity: 10, unitPrice: 7.50, total: 75.00 },
      { description: 'Bawang Putih (500g)', quantity: 10, unitPrice: 8.00, total: 80.00 },
      { description: 'Halia (1kg)', quantity: 5, unitPrice: 10.00, total: 50.00 },
      { description: 'Serai (bundle)', quantity: 10, unitPrice: 4.50, total: 45.00 },
      { description: 'Daun Pandan (bundle)', quantity: 15, unitPrice: 2.50, total: 37.50 },
    ],
  },
  {
    id: 'inv-2',
    supplierName: 'Premium Fresh Market',
    invoiceDate: '2026-04-18',
    total: 680.00,
    confidence: 'medium',
    lineItems: [
      { description: 'Daging Lembu (1kg)', quantity: 8, unitPrice: 42.00, total: 336.00 },
      { description: 'Udang Besar (500g)', quantity: 6, unitPrice: 38.00, total: 228.00 },
      { description: 'Ikan Siakap (1kg)', quantity: 3, unitPrice: 35.00, total: 105.00 },
      { description: 'Tauhu Putih', quantity: 20, unitPrice: 0.55, total: 11.00 },
      { description: 'Sayur Bayam (500g)', quantity: 10, unitPrice: 3.00, total: 30.00 },
    ],
  },
  {
    id: 'inv-3',
    supplierName: null,
    invoiceDate: '2026-04-15',
    total: 340.00,
    confidence: 'low',
    lineItems: [
      { description: 'Unknown item A', quantity: 10, unitPrice: 18.00, total: 180.00 },
      { description: 'Unknown item B', quantity: 8, unitPrice: 20.00, total: 160.00 },
    ],
  },
];

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
  onAdd,
}: {
  onClose: () => void;
  onAdd: (inv: MockInvoice) => void;
}) {
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1800));
    const today = new Date().toISOString().slice(0, 10);
    onAdd({
      id: `inv-${Date.now()}`,
      supplierName: 'New Supplier Sdn Bhd',
      invoiceDate: today,
      total: parseFloat((Math.random() * 800 + 200).toFixed(2)),
      confidence: 'medium',
      lineItems: [
        { description: 'Item A', quantity: 5, unitPrice: 20.00, total: 100.00 },
        { description: 'Item B', quantity: 3, unitPrice: 15.00, total: 45.00 },
      ],
    });
    setProcessing(false);
    onClose();
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
                <p className="text-sm font-semibold text-ink-primary">Reading invoice…</p>
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
  onConfirm,
  onDelete,
}: {
  invoice: MockInvoice;
  isNew: boolean;
  onConfirm: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);

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
          <p className="text-xs text-ink-secondary mt-0.5">{invoice.invoiceDate}</p>
        </div>
        <ConfidenceBadge conf={invoice.confidence} />
      </div>

      <div>
        <p className="text-xs text-ink-secondary">{t('queue.total')}</p>
        <p className="text-2xl font-bold text-ink-primary tabular mt-0.5">
          RM {invoice.total.toFixed(2)}
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
        <button onClick={() => onConfirm(invoice.id)} className="flex-1 btn-primary text-sm py-2.5">
          {t('queue.confirm')}
        </button>
        <button className="btn-secondary text-sm py-2.5 px-4">{t('queue.edit')}</button>
        <button onClick={() => onDelete(invoice.id)} className="text-sm text-danger hover:underline px-2 py-2.5">
          {t('queue.delete')}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConfirmationQueuePage() {
  const t = useT();
  const [invoices, setInvoices] = useState<MockInvoice[]>(MOCK_INVOICES);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [newId, setNewId] = useState<string | null>(null);

  function handleAdd(inv: MockInvoice) {
    setInvoices((prev) => [inv, ...prev]);
    setNewId(inv.id);
    setTimeout(() => setNewId(null), 2500);
  }

  function handleConfirm(id: string) {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  }

  function handleDelete(id: string) {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  }

  function confirmAllHigh() {
    setInvoices((prev) => prev.filter((inv) => inv.confidence !== 'high'));
  }

  const highCount = invoices.filter((i) => i.confidence === 'high').length;

  const addButton = (
    <button
      onClick={() => setSheetOpen(true)}
      className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-3 py-1.5 rounded-btn transition-colors"
    >
      <Plus size={15} />
      Add
    </button>
  );

  return (
    <main className="min-h-screen flex flex-col">
      <AppHeader title={t('queue.title')} backHref="/dashboard" action={addButton} />

      <div className="flex-1 px-5 pt-5 pb-28 max-w-2xl mx-auto w-full space-y-4">

        {/* WhatsApp shortcut */}
        <WhatsAppCard />

        {invoices.length === 0 ? (
          <div className="card flex flex-col items-center justify-center gap-4 py-16 text-center">
            <CheckCircle size={48} className="text-accent-secondary" />
            <div>
              <p className="font-semibold text-ink-primary text-lg">{t('queue.empty')}</p>
              <p className="text-sm text-ink-secondary mt-1">All invoices confirmed — great work.</p>
            </div>
            <Link href="/dashboard" className="btn-secondary text-sm">Back to dashboard</Link>
          </div>
        ) : (
          <>
            {highCount > 0 && (
              <button
                onClick={confirmAllHigh}
                className="w-full flex items-center justify-center gap-2 bg-accent-secondary/10 hover:bg-accent-secondary/20 text-accent-secondary border border-accent-secondary/30 rounded-btn px-5 py-3 font-medium text-sm transition-colors"
              >
                <CheckCircle size={16} />
                Confirm all high-confidence ({highCount})
              </button>
            )}

            <AnimatePresence initial={false}>
              {invoices.map((invoice) => (
                <InvoiceCard
                  key={invoice.id}
                  invoice={invoice}
                  isNew={invoice.id === newId}
                  onConfirm={handleConfirm}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </>
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
            onAdd={handleAdd}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
