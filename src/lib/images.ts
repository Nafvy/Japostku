export const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 1600;

export function isAllowedImageMime(mimeType: string): boolean {
  return (ALLOWED_IMAGE_MIMES as readonly string[]).includes(mimeType);
}

export function isWithinMaxFileSize(bytes: number): boolean {
  return Number.isFinite(bytes) && bytes > 0 && bytes <= MAX_IMAGE_BYTES;
}

export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!isAllowedImageMime(file.type)) {
    return 'Format gambar harus JPG, PNG, atau WebP.';
  }
  if (!isWithinMaxFileSize(file.size)) {
    return 'Ukuran gambar maksimal 5 MB.';
  }
  return null;
}

export async function compressImage(file: File): Promise<Blob> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = bitmap;
    const longestSide = Math.max(width, height);
    const scale = longestSide > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / longestSide : 1;
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Gagal memproses gambar di browser.');
    }
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', 0.84);
    });
    if (!blob) {
      throw new Error('Gagal mengompres gambar.');
    }
    if (!isWithinMaxFileSize(blob.size)) {
      throw new Error('Ukuran gambar setelah dikompres masih melebihi 5 MB.');
    }
    return blob;
  } finally {
    bitmap.close();
  }
}
