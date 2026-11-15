import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAllowedImageMime,
  isWithinMaxFileSize,
  MAX_IMAGE_BYTES,
  validateImageFile,
} from './images';

test('image MIME validation allows only jpeg, png, webp', () => {
  assert.equal(isAllowedImageMime('image/jpeg'), true);
  assert.equal(isAllowedImageMime('image/png'), true);
  assert.equal(isAllowedImageMime('image/webp'), true);
  assert.equal(isAllowedImageMime('image/gif'), false);
  assert.equal(isAllowedImageMime('image/svg+xml'), false);
});

test('image size validation enforces 5MB hard cap', () => {
  assert.equal(isWithinMaxFileSize(1024), true);
  assert.equal(isWithinMaxFileSize(MAX_IMAGE_BYTES), true);
  assert.equal(isWithinMaxFileSize(MAX_IMAGE_BYTES + 1), false);
  assert.equal(isWithinMaxFileSize(0), false);
});

test('validateImageFile returns clear Indonesian error messages', () => {
  assert.equal(validateImageFile({ type: 'image/webp', size: 2048 }), null);
  assert.ok(validateImageFile({ type: 'application/pdf', size: 1024 })?.includes('JPG'));
  assert.ok(validateImageFile({ type: 'image/png', size: MAX_IMAGE_BYTES + 10 })?.includes('5 MB'));
});
