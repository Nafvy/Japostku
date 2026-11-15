import type { ActionResult } from './types';

export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<ActionResult<T> & { status?: number; banned?: boolean }> {
  try {
    const res = await fetch(url, {
      credentials: 'include',
      ...options,
      headers: {
        ...(options?.body && !(options.body instanceof Blob)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(options?.headers || {}),
      },
    });
    const json = (await res.json().catch(() => null)) as
      | (ActionResult<T> & { banned?: boolean })
      | null;
    if (!json) {
      return {
        ok: false,
        status: res.status,
        error: 'Terjadi gangguan pada server. Coba lagi.',
      };
    }
    return { ...json, status: res.status };
  } catch {
    return {
      ok: false,
      error: 'Koneksi bermasalah. Periksa jaringan kamu lalu coba lagi.',
    };
  }
}
