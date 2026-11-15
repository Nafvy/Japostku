const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function rupiah(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Gratis';
  }
  return idrFormatter.format(Math.round(amount));
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return dateFormatter.format(date);
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return dateTimeFormatter.format(date);
}

export function relativeTime(isoString: string, nowMs: number = Date.now()): string {
  const date = new Date(isoString);
  const targetMs = date.getTime();
  if (Number.isNaN(targetMs)) {
    return '-';
  }

  const diffSeconds = Math.max(0, Math.floor((nowMs - targetMs) / 1000));
  if (diffSeconds < 60) {
    return 'Baru saja';
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} mnt lalu`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} jam lalu`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays} hari lalu`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths} bln lalu`;
  }

  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} thn lalu`;
}
