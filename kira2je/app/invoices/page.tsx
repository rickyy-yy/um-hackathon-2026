'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { useT } from '@/lib/i18n/client';

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

function confidenceBadge(conf: Confidence) {
  if (conf === 'high') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-accent-secondary/15 text-accent-secondary">
        <CheckCircle size={12} />
        High
      </span>
    );
  }
  if (conf === 'medium') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
        <AlertCircle size={12} />
        Medium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-danger/10 text-danger">
      <XCircle size={12} />
      Low — please verify
    </span>
  );
}

function InvoiceCard({
  invoice,
  onConfirm,
  onDelete,
}: {
  invoice: MockInvoice;
  onConfirm: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-ink-primary leading-tight truncate">
            {invoice.supplierName ?? 'Unknown supplier'}
          </p>
          <p className="text-xs text-ink-secondary mt-0.5">{invoice.invoiceDate}</p>
        </div>
        {confidenceBadge(invoice.confidence)}
      </div>

      {/* Total */}
      <div>
        <p className="text-xs text-ink-secondary">{t('queue.total')}</p>
        <p className="text-2xl font-bold text-ink-primary tabular mt-0.5">
          RM {invoice.total.toFixed(2)}
        </p>
      </div>

      {/* Line items toggle */}
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
                  <td className="px-3 py-2 text-right text-ink-secondary tabular">RM{item.unitPrice.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right text-ink-primary font-medium tabular">RM{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => onConfirm(invoice.id)}
          className="flex-1 btn-primary text-sm py-2.5"
        >
          {t('queue.confirm')}
        </button>
        <button className="btn-secondary text-sm py-2.5 px-4">
          {t('queue.edit')}
        </button>
        <button
          onClick={() => onDelete(invoice.id)}
          className="text-sm text-danger hover:underline px-2 py-2.5"
        >
          {t('queue.delete')}
        </button>
      </div>
    </div>
  );
}

export default function ConfirmationQueuePage() {
  const t = useT();
  const [invoices, setInvoices] = useState<MockInvoice[]>(MOCK_INVOICES);

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

  return (
    <main className="min-h-screen flex flex-col">
      <AppHeader title={t('queue.title')} backHref="/dashboard" />

      <div className="flex-1 px-5 pt-6 pb-16 max-w-2xl mx-auto w-full space-y-5">

        {invoices.length === 0 ? (
          /* Empty state */
          <div className="card flex flex-col items-center justify-center gap-4 py-16 text-center">
            <CheckCircle size={48} className="text-accent-secondary" />
            <div>
              <p className="font-semibold text-ink-primary text-lg">{t('queue.empty')}</p>
              <p className="text-sm text-ink-secondary mt-1">
                All invoices have been confirmed.
              </p>
            </div>
            <Link href="/dashboard" className="btn-secondary text-sm">
              Back to dashboard
            </Link>
          </div>
        ) : (
          <>
            {/* Confirm all high */}
            {highCount > 0 && (
              <button
                onClick={confirmAllHigh}
                className="w-full flex items-center justify-center gap-2 bg-accent-secondary/10 hover:bg-accent-secondary/20 text-accent-secondary border border-accent-secondary/30 rounded-btn px-5 py-3 font-medium text-sm transition-colors"
              >
                <CheckCircle size={16} />
                Confirm all high-confidence ({highCount})
              </button>
            )}

            {/* Invoice cards */}
            {invoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                onConfirm={handleConfirm}
                onDelete={handleDelete}
              />
            ))}
          </>
        )}
      </div>
    </main>
  );
}
