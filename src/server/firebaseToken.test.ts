import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyFirebaseJwtWithCertMap } from './firebaseToken';

function signTestJwt(
  payload: Record<string, unknown>,
  privateKey: string,
  kid: string = 'key-1'
): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${body}`);
  signer.end();
  const sig = signer.sign(privateKey).toString('base64url');
  return `${header}.${body}.${sig}`;
}

test('verifyFirebaseJwtWithCertMap accepts valid RS256 Firebase token', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

  const nowMs = 1_750_000_000_000;
  const nowSec = Math.floor(nowMs / 1000);
  const token = signTestJwt(
    {
      aud: 'plucky-emblem-3kpm1',
      iss: 'https://securetoken.google.com/plucky-emblem-3kpm1',
      sub: 'uid-google-123',
      iat: nowSec - 10,
      exp: nowSec + 3600,
      email: 'PaundraOktar@gmail.com',
      email_verified: true,
      name: 'Paundra Oktar',
    },
    privPem,
    'test-kid'
  );

  const verified = verifyFirebaseJwtWithCertMap(
    token,
    { 'test-kid': pubPem },
    'plucky-emblem-3kpm1',
    nowMs
  );
  assert.deepEqual(verified, {
    uid: 'uid-google-123',
    email: 'paundraoktar@gmail.com',
    displayName: 'Paundra Oktar',
    emailVerified: true,
  });
});

test('verifyFirebaseJwtWithCertMap rejects expired or wrong-audience tokens', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

  const nowMs = 1_750_000_000_000;
  const nowSec = Math.floor(nowMs / 1000);

  const expired = signTestJwt(
    {
      aud: 'plucky-emblem-3kpm1',
      iss: 'https://securetoken.google.com/plucky-emblem-3kpm1',
      sub: 'uid-1',
      iat: nowSec - 7200,
      exp: nowSec - 10,
      email: 'a@example.com',
      email_verified: true,
    },
    privPem,
    'k1'
  );
  assert.equal(verifyFirebaseJwtWithCertMap(expired, { k1: pubPem }, 'plucky-emblem-3kpm1', nowMs), null);

  const wrongAud = signTestJwt(
    {
      aud: 'other-project',
      iss: 'https://securetoken.google.com/plucky-emblem-3kpm1',
      sub: 'uid-1',
      iat: nowSec - 10,
      exp: nowSec + 300,
      email: 'a@example.com',
      email_verified: true,
    },
    privPem,
    'k1'
  );
  assert.equal(verifyFirebaseJwtWithCertMap(wrongAud, { k1: pubPem }, 'plucky-emblem-3kpm1', nowMs), null);
});
