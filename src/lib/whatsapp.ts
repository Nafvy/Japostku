const WA_PATTERN = /^62[0-9]{8,13}$/;

export function normalizeWhatsapp(raw: string): string | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }
  const stripped = raw.replace(/[\s\-().+]/g, '');
  if (!/^[0-9]+$/.test(stripped)) {
    return null;
  }

  let normalized = stripped;
  if (normalized.startsWith('0')) {
    normalized = `62${normalized.slice(1)}`;
  } else if (normalized.startsWith('8')) {
    normalized = `62${normalized}`;
  }

  if (!WA_PATTERN.test(normalized)) {
    return null;
  }
  return normalized;
}

export function waLink(phone: string, postTitle: string): string {
  const normalized = normalizeWhatsapp(phone) ?? phone;
  const text = `Halo, saya tertarik dengan postingan "${postTitle}" di Japostku.`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}
