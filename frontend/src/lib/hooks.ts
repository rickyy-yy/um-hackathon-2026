'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, getActiveShop, setActiveShop } from './api';

export type User = {
  id: string;
  phone_number: string;
  full_name: string | null;
  email: string | null;
  preferred_language: string;
  theme_preference: string;
  last_shop_id: string | null;
  has_password: boolean;
};

export type Shop = {
  id: string;
  shop_name: string;
  shop_type: string;
  address: string | null;
  ssm_registration_no: string | null;
  sst_registered: boolean;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const u = await api.get<User>('/api/auth/me');
      setUser(u);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setUser(null);
      else setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { user, loading, refresh };
}

export function useShops() {
  const [shops, setShops] = useState<Shop[] | null>(null);
  const [activeId, setActiveIdState] = useState<string | null>(getActiveShop());

  const refresh = useCallback(async () => {
    try {
      const list = await api.get<Shop[]>('/api/shops');
      setShops(list);
      // Default active shop = existing choice if still valid, else first shop.
      if (list.length === 0) {
        setActiveIdState(null);
        setActiveShop(null);
      } else {
        const current = activeId && list.find((s) => s.id === activeId);
        const next = current ? current.id : list[0].id;
        setActiveIdState(next);
        setActiveShop(next);
      }
    } catch {
      setShops([]);
    }
    // We intentionally exclude activeId from deps — refresh is invoked
    // explicitly when the user navigates or creates a shop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectShop = useCallback(async (id: string) => {
    setActiveIdState(id);
    setActiveShop(id);
    try {
      await api.post(`/api/shops/${id}/select`);
    } catch {
      /* non-fatal — local state is already updated */
    }
  }, []);

  return { shops, activeId, refresh, selectShop };
}
