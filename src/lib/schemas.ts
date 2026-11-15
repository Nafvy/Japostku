import { z } from 'zod';
import { POST_CATEGORIES } from './categories';
import { normalizeWhatsapp } from './whatsapp';

export const registerSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Nama tampilan minimal 2 karakter.')
    .max(50, 'Nama tampilan maksimal 50 karakter.'),
  email: z
    .string()
    .trim()
    .min(1, 'Email wajib diisi.')
    .email('Format email tidak valid.'),
  password: z
    .string()
    .min(8, 'Kata sandi minimal 8 karakter.')
    .max(128, 'Kata sandi terlalu panjang.'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email wajib diisi.')
    .email('Format email tidak valid.'),
  password: z.string().min(1, 'Kata sandi wajib diisi.'),
});

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Nama tampilan minimal 2 karakter.')
    .max(50, 'Nama tampilan maksimal 50 karakter.'),
  whatsapp: z
    .string()
    .trim()
    .refine(
      (val) => val === '' || normalizeWhatsapp(val) !== null,
      'Nomor WhatsApp tidak valid. Gunakan format 08 atau 62.'
    ),
});

export const postInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Judul minimal 3 karakter.')
    .max(80, 'Judul maksimal 80 karakter.'),
  category: z.enum(POST_CATEGORIES, {
    message: 'Pilih kategori yang valid.',
  }),
  priceIdr: z.coerce
    .number({ message: 'Harga harus berupa angka bulat.' })
    .int('Harga harus berupa angka bulat.')
    .min(0, 'Harga tidak boleh negatif.')
    .max(999_999_999_999, 'Harga terlalu besar.'),
  description: z
    .string()
    .trim()
    .min(10, 'Deskripsi minimal 10 karakter.')
    .max(2000, 'Deskripsi maksimal 2000 karakter.'),
  images: z
    .array(z.string().min(1))
    .min(1, 'Unggah minimal 1 gambar.')
    .max(5, 'Maksimal 5 gambar per postingan.'),
  contactWhatsapp: z
    .string()
    .trim()
    .min(1, 'Nomor WhatsApp wajib diisi.')
    .refine(
      (val) => normalizeWhatsapp(val) !== null,
      'Nomor WhatsApp tidak valid. Gunakan format 08 atau 62.'
    ),
});

export const banSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Alasan pemblokiran minimal 3 karakter.')
    .max(300, 'Alasan maksimal 300 karakter.'),
});

export const roleChangeSchema = z.object({
  role: z.enum(['admin', 'moderator'], {
    message: 'Role tidak valid.',
  }),
});

export const deletePostAdminSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(300, 'Alasan maksimal 300 karakter.')
    .optional(),
});

export const ownerNoticeSchema = z.object({
  notice: z
    .string()
    .trim()
    .max(200, 'Pengumuman maksimal 200 karakter.'),
});

export function validateUserImagePaths(
  paths: readonly string[],
  userId: string,
  existingAllowedPaths: readonly string[] = [],
  extraOwnPrefixes: readonly string[] = []
): boolean {
  const ownPrefixes = [`/uploads/${userId}/`, ...extraOwnPrefixes.filter(Boolean)];
  const existingSet = new Set(existingAllowedPaths);
  return paths.every((p) => {
    if (p.includes('..') || p.includes('\\')) {
      return false;
    }
    return ownPrefixes.some((prefix) => p.startsWith(prefix)) || existingSet.has(p);
  });
}

export function sanitizeNextPath(
  next: string | null | undefined,
  fallback: string = '/akun/postingan'
): string {
  if (!next || typeof next !== 'string') {
    return fallback;
  }
  const trimmed = next.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return fallback;
  }
  return trimmed;
}

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}
