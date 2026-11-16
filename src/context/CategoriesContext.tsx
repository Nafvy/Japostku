import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { DEFAULT_CATEGORIES, getCategoryLabel } from '../lib/categories';
import type { CategoryItem } from '../lib/types';

interface CategoriesContextValue {
  categories: CategoryItem[];
  loading: boolean;
  refreshCategories: () => Promise<void>;
  getLabel: (slug: string) => string;
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<CategoryItem[]>(() =>
    DEFAULT_CATEGORIES.map((c) => ({ ...c }))
  );
  const [loading, setLoading] = useState(true);

  const refreshCategories = useCallback(async () => {
    const res = await apiFetch<{ items: CategoryItem[] }>('/api/categories');
    if (res.ok && Array.isArray(res.data.items) && res.data.items.length > 0) {
      setCategories(res.data.items);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshCategories();
  }, [refreshCategories]);

  const getLabel = useCallback(
    (slug: string) => getCategoryLabel(slug, categories),
    [categories]
  );

  return (
    <CategoriesContext.Provider
      value={{
        categories,
        loading,
        refreshCategories,
        getLabel,
      }}
    >
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) {
    throw new Error('useCategories must be used inside CategoriesProvider');
  }
  return ctx;
}
