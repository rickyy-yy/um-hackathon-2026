'use client';

import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';

export function DeleteDataButton({ month, monthLabel }: { month: string; monthLabel: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!window.confirm(`Reset ${monthLabel} data?\n\nThis will permanently delete all invoices, POS uploads, and reports for ${monthLabel}. Ingredient mappings are kept.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/user/data?month=${month}`, { method: 'DELETE' });
      if (res.ok) {
        window.location.reload();
      } else {
        alert('Something went wrong. Please try again.');
        setLoading(false);
      }
    } catch {
      alert('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 text-sm text-danger/70 hover:text-danger disabled:opacity-50 transition-colors"
      title={`Reset ${monthLabel} data`}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
      <span className="hidden sm:inline">Reset monthly data</span>
    </button>
  );
}
