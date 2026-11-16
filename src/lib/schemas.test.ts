import test from 'node:test';
import assert from 'node:assert/strict';
import {
  categoryInputSchema,
  postInputSchema,
  registerSchema,
  sanitizeNextPath,
  validateUserImagePaths,
} from './schemas';
import { getCategoryLabel, slugifyCategory } from './categories';

test('registerSchema enforces display name and 8-char password', () => {
  assert.equal(
    registerSchema.safeParse({
      displayName: 'Budi',
      email: 'budi@contoh.id',
      password: 'password123',
    }).success,
    true
  );
  assert.equal(
    registerSchema.safeParse({
      displayName: 'B',
      email: 'budi@contoh.id',
      password: 'short',
    }).success,
    false
  );
});

test('postInputSchema validates bounds and image limits', () => {
  const valid = postInputSchema.safeParse({
    title: 'Kamera Mirrorless Sony',
    category: 'elektronik',
    priceIdr: 12500000,
    description: 'Kondisi mulus lengkap dus dan charger original.',
    images: ['/uploads/u1/abc.webp'],
    contactWhatsapp: '081234567890',
  });
  assert.equal(valid.success, true);

  const tooShortTitle = postInputSchema.safeParse({
    title: 'AB',
    category: 'elektronik',
    priceIdr: 0,
    description: 'Kondisi mulus lengkap dus.',
    images: ['/uploads/u1/abc.webp'],
    contactWhatsapp: '081234567890',
  });
  assert.equal(tooShortTitle.success, false);

  const tooManyImages = postInputSchema.safeParse({
    title: 'Sepeda Gravel',
    category: 'hobi',
    priceIdr: 5000000,
    description: 'Kondisi terawat siap gowes jauh.',
    images: ['1', '2', '3', '4', '5', '6'],
    contactWhatsapp: '081234567890',
  });
  assert.equal(tooManyImages.success, false);
});

test('validateUserImagePaths rejects paths belonging to other users or traversal', () => {
  assert.equal(validateUserImagePaths(['/uploads/user-1/a.webp'], 'user-1'), true);
  assert.equal(validateUserImagePaths(['/uploads/user-2/a.webp'], 'user-1'), false);
  assert.equal(validateUserImagePaths(['/uploads/user-1/../user-2/a.webp'], 'user-1'), false);
  assert.equal(
    validateUserImagePaths(['/seed-images/a.jpg'], 'user-1', ['/seed-images/a.jpg']),
    true
  );
  const supaPrefix = 'https://demo.supabase.co/storage/v1/object/public/post-images/user-1/';
  assert.equal(
    validateUserImagePaths([`${supaPrefix}abc.webp`], 'user-1', [], [supaPrefix]),
    true
  );
  assert.equal(
    validateUserImagePaths(
      ['https://demo.supabase.co/storage/v1/object/public/post-images/user-2/abc.webp'],
      'user-1',
      [],
      [supaPrefix]
    ),
    false
  );
});

test('sanitizeNextPath rejects external URLs and protocol-relative URLs', () => {
  assert.equal(sanitizeNextPath('/admin/pengguna'), '/admin/pengguna');
  assert.equal(sanitizeNextPath('/akun/postingan/baru?x=1'), '/akun/postingan/baru?x=1');
  assert.equal(sanitizeNextPath('https://evil.com'), '/akun/postingan');
  assert.equal(sanitizeNextPath('//evil.com'), '/akun/postingan');
  assert.equal(sanitizeNextPath(undefined), '/akun/postingan');
});

test('categoryInputSchema, slugifyCategory, and getCategoryLabel work cleanly', () => {
  assert.equal(categoryInputSchema.safeParse({ label: 'Alat Musik' }).success, true);
  assert.equal(categoryInputSchema.safeParse({ label: 'A' }).success, false);
  assert.equal(slugifyCategory('Alat Musik & Studio!'), 'alat_musik_studio');
  assert.equal(
    getCategoryLabel('alat_musik', [{ slug: 'alat_musik', label: 'Alat Musik' }]),
    'Alat Musik'
  );
  assert.equal(getCategoryLabel('buku_bekas'), 'Buku Bekas');
});
