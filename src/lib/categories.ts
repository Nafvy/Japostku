import type { CategoryItem, PostCategory } from './types';

export const DEFAULT_CATEGORIES: readonly CategoryItem[] = [
  { slug: 'elektronik', label: 'Elektronik' },
  { slug: 'kendaraan', label: 'Kendaraan' },
  { slug: 'properti', label: 'Properti' },
  { slug: 'fashion', label: 'Fashion' },
  { slug: 'rumah_tangga', label: 'Rumah Tangga' },
  { slug: 'hobi', label: 'Hobi' },
  { slug: 'jasa', label: 'Jasa' },
  { slug: 'lainnya', label: 'Lainnya' },
] as const;

export const POST_CATEGORIES: readonly PostCategory[] = DEFAULT_CATEGORIES.map((c) => c.slug);

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  DEFAULT_CATEGORIES.map((c) => [c.slug, c.label])
);

export function slugifyCategory(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
}

export function getCategoryLabel(
  slug: string,
  categories?: readonly CategoryItem[]
): string {
  if (categories) {
    const found = categories.find((c) => c.slug === slug);
    if (found) return found.label;
  }
  if (CATEGORY_LABELS[slug]) {
    return CATEGORY_LABELS[slug];
  }
  return slug
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Lainnya';
}
