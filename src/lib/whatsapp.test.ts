import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWhatsapp, waLink } from './whatsapp';

test('normalizeWhatsapp converts 08, +62, 62, spaces and hyphens to 62 format', () => {
  assert.equal(normalizeWhatsapp('081234567890'), '6281234567890');
  assert.equal(normalizeWhatsapp('+62 812-3456-7890'), '6281234567890');
  assert.equal(normalizeWhatsapp('628123456789'), '628123456789');
  assert.equal(normalizeWhatsapp('81234567890'), '6281234567890');
});

test('normalizeWhatsapp rejects invalid formats and lengths', () => {
  assert.equal(normalizeWhatsapp(''), null);
  assert.equal(normalizeWhatsapp('08123'), null);
  assert.equal(normalizeWhatsapp('abc123456789'), null);
  assert.equal(normalizeWhatsapp('1234567890'), null);
  assert.equal(normalizeWhatsapp('62812345678901234'), null);
});

test('waLink encodes post title into wa.me URL', () => {
  const link = waLink('081234567890', 'Kamera Sony A7 III');
  assert.ok(link.startsWith('https://wa.me/6281234567890?text='));
  assert.ok(link.includes(encodeURIComponent('Kamera Sony A7 III')));
});
