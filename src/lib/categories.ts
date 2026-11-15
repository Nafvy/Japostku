import type { PostCategory } from './types';

export const POST_CATEGORIES: readonly PostCategory[] = [
  'elektronik',
  'kendaraan',
  'properti',
  'fashion',
  'rumah_tangga',
  'hobi',
  'jasa',
  'lainnya',
] as const;

export const CATEGORY_LABELS: Record<PostCategory, string> = {
  elektronik: 'Elektronik',
  kendaraan: 'Kendaraan',
  properti: 'Properti',
  fashion: 'Fashion',
  rumah_tangga: 'Rumah Tangga',
  hobi: 'Hobi',
  jasa: 'Jasa',
  lainnya: 'Lainnya',
};
