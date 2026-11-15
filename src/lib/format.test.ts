import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, relativeTime, rupiah } from './format';

test('rupiah returns Gratis for 0 and formatted IDR for positive amounts', () => {
  assert.equal(rupiah(0), 'Gratis');
  assert.equal(rupiah(-500), 'Gratis');
  const formatted = rupiah(1500000);
  assert.ok(formatted.includes('1.500.000'));
  assert.ok(formatted.includes('Rp'));
});

test('relativeTime formats seconds, minutes, hours, and days in Indonesian', () => {
  const now = new Date('2026-11-15T12:00:00Z').getTime();
  assert.equal(relativeTime('2026-11-15T11:59:45Z', now), 'Baru saja');
  assert.equal(relativeTime('2026-11-15T11:45:00Z', now), '15 mnt lalu');
  assert.equal(relativeTime('2026-11-15T09:00:00Z', now), '3 jam lalu');
  assert.equal(relativeTime('2026-11-12T12:00:00Z', now), '3 hari lalu');
});

test('formatDate handles invalid ISO safely', () => {
  assert.equal(formatDate('not-a-date'), '-');
  assert.notEqual(formatDate('2026-11-15T12:00:00Z'), '-');
});
