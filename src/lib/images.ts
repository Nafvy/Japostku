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

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
  });
}

export async function compressImage(file: File): Promise<Blob> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
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
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    const webpBlob = await canvasToBlob(canvas, 'image/webp', 0.84);
    if (webpBlob && isWithinMaxFileSize(webpBlob.size)) {
      return webpBlob;
    }
    const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', 0.86);
    if (jpegBlob && isWithinMaxFileSize(jpegBlob.size)) {
      return jpegBlob;
    }
    return file;
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
