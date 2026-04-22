'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, setActiveShop } from '@/lib/api';
import { useI18n, messageForApiError } from '@/i18n';
import type { Shop } from '@/lib/hooks';

const SHOP_TYPES = ['roadside_vendor', 'hawker_stall', 'cafe', 'small_restaurant', 'food_truck', 'other'] as const;

function NewShopInner() {
  const router = useRouter();
  const params = useSearchParams();
  const isFirstShop = params.get('first') === '1';
  const { t } = useI18n();

  const [form, setForm] = useState({
    shop_name: '',
    shop_type: 'hawker_stall',
    address: '',
    ssm_registration_no: '',
    sst_registered: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const shop = await api.post<Shop>('/api/shops', {
        shop_name: form.shop_name,
        shop_type: form.shop_type,
        address: form.address || undefined,
        ssm_registration_no: form.ssm_registration_no || undefined,
        sst_registered: form.sst_registered,
      });
      setActiveShop(shop.id);
      router.replace('/dashboard');
    } catch (err) {
      setError(messageForApiError(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell requireShop={false}>
      <div className="mx-auto max-w-lg">
        <h1 className="font-serif text-3xl font-bold text-primary">
          {isFirstShop ? t('shop.welcomeTitle') : t('shop.addAnother')}
        </h1>
        <p className="mt-1 text-ink/70 text-sm">{t('shop.welcomeSubtitle')}</p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <Field label={t('shop.shopName')}>
            <input
              className="input"
              value={form.shop_name}
              onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
              required
              maxLength={255}
            />
          </Field>

          <Field label={t('shop.shopType')}>
            <select
              className="input"
              value={form.shop_type}
              onChange={(e) => setForm({ ...form, shop_type: e.target.value })}
            >
              {SHOP_TYPES.map((v) => (
                <option key={v} value={v}>
                  {t(`shop.types.${v}`, v)}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t('shop.address')}>
            <input
              className="input"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              maxLength={500}
            />
          </Field>

          <Field label={t('shop.ssm')}>
            <input
              className="input"
              value={form.ssm_registration_no}
              onChange={(e) => setForm({ ...form, ssm_registration_no: e.target.value })}
              maxLength={64}
            />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.sst_registered}
              onChange={(e) => setForm({ ...form, sst_registered: e.target.checked })}
            />
            {t('shop.sst')}
          </label>

          {error && <p className="text-alert text-sm">{error}</p>}

          <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
            {busy ? '…' : t('shop.submitCreate')}
          </button>
        </form>
      </div>
    </AppShell>
  );
}

export default function NewShopPage() {
  return (
    <Suspense fallback={<div className="p-10">Loading…</div>}>
      <NewShopInner />
    </Suspense>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}
