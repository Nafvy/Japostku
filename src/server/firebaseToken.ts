import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface VerifiedFirebaseIdentity {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
}

const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedCerts: { certs: Record<string, string>; expiresAtMs: number } | null = null;

function readFirebaseConfigField(field: 'apiKey' | 'projectId'): string {
  const candidates = [
    path.resolve(process.cwd(), 'firebase-applet-config.json'),
    new URL('../firebase-applet-config.json', import.meta.url),
    new URL('../../firebase-applet-config.json', import.meta.url),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8')) as Record<string, unknown>;
        const value = parsed[field];
        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      }
    } catch {
      // Try next candidate
    }
  }
  return '';
}

export function readFirebaseApiKey(): string {
  return (
    process.env.FIREBASE_API_KEY?.trim() ||
    process.env.VITE_FIREBASE_API_KEY?.trim() ||
    readFirebaseConfigField('apiKey')
  );
}

export function readFirebaseProjectId(): string {
  return (
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.VITE_FIREBASE_PROJECT_ID?.trim() ||
    readFirebaseConfigField('projectId') ||
    'plucky-emblem-3kpm1'
  );
}

function decodeBase64UrlJson<T>(segment: string): T | null {
  try {
    const json = Buffer.from(segment, 'base64url').toString('utf8');
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function verifyFirebaseJwtWithCertMap(
  idToken: string,
  certs: Record<string, string>,
  projectId: string,
  nowMs: number = Date.now()
): VerifiedFirebaseIdentity | null {
  if (!idToken || typeof idToken !== 'string' || !projectId) {
    return null;
  }
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [headerSeg, payloadSeg, sigSeg] = parts;
  const header = decodeBase64UrlJson<{ alg?: unknown; kid?: unknown }>(headerSeg);
  const payload = decodeBase64UrlJson<{
    aud?: unknown;
    iss?: unknown;
    sub?: unknown;
    exp?: unknown;
    iat?: unknown;
    email?: unknown;
    email_verified?: unknown;
    name?: unknown;
  }>(payloadSeg);

  if (!header || !payload) {
    return null;
  }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) {
    return null;
  }

  const pem = certs[header.kid];
  if (!pem) {
    return null;
  }

  const nowSec = Math.floor(nowMs / 1000);
  if (payload.aud !== projectId) {
    return null;
  }
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    return null;
  }
  if (typeof payload.sub !== 'string' || payload.sub.length === 0 || payload.sub.length > 128) {
    return null;
  }
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    return null;
  }
  if (typeof payload.iat !== 'number' || payload.iat > nowSec + 300) {
    return null;
  }
  if (typeof payload.email !== 'string' || !payload.email.trim()) {
    return null;
  }

  try {
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerSeg}.${payloadSeg}`);
    verifier.end();
    const signature = Buffer.from(sigSeg, 'base64url');
    if (!verifier.verify(pem, signature)) {
      return null;
    }
  } catch {
    return null;
  }

  const email = payload.email.trim().toLowerCase();
  const displayName =
    typeof payload.name === 'string' && payload.name.trim()
      ? payload.name.trim()
      : email.split('@')[0] || 'Pengguna';

  return {
    uid: payload.sub,
    email,
    displayName,
    emailVerified: payload.email_verified === true,
  };
}

async function fetchGoogleSecureTokenCerts(): Promise<Record<string, string> | null> {
  const now = Date.now();
  if (cachedCerts && now < cachedCerts.expiresAtMs) {
    return cachedCerts.certs;
  }
  try {
    const res = await fetch(GOOGLE_CERTS_URL);
    if (!res.ok) {
      return null;
    }
    const certs = (await res.json()) as Record<string, string>;
    const cc = res.headers.get('cache-control') || '';
    const maxAgeMatch = cc.match(/max-age=(\d+)/i);
    const maxAgeSec = maxAgeMatch ? Math.max(60, Number(maxAgeMatch[1])) : 3600;
    cachedCerts = {
      certs,
      expiresAtMs: now + maxAgeSec * 1000,
    };
    return certs;
  } catch {
    return null;
  }
}

export async function verifyFirebaseIdToken(
  idToken: string
): Promise<VerifiedFirebaseIdentity | null> {
  if (!idToken || typeof idToken !== 'string') {
    return null;
  }

  const projectId = readFirebaseProjectId();
  const certs = await fetchGoogleSecureTokenCerts();
  if (certs) {
    const jwtVerified = verifyFirebaseJwtWithCertMap(idToken, certs, projectId);
    if (jwtVerified) {
      return jwtVerified;
    }
  }

  const apiKey = readFirebaseApiKey();
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!response.ok) {
      console.error('Firebase accounts:lookup failed with status:', response.status);
      return null;
    }
    const data = (await response.json()) as {
      users?: Array<{
        localId?: string;
        email?: string;
        emailVerified?: boolean;
        displayName?: string;
      }>;
    };
    const fbUser = data.users?.[0];
    if (!fbUser?.localId || !fbUser?.email) {
      return null;
    }
    return {
      uid: fbUser.localId,
      email: fbUser.email.toLowerCase(),
      displayName: fbUser.displayName?.trim() || fbUser.email.split('@')[0] || 'Pengguna',
      emailVerified: Boolean(fbUser.emailVerified),
    };
  } catch {
    return null;
  }
}
