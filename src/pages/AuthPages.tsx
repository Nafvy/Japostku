import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Lock, LogIn, Mail, User, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import {
  loginSchema,
  registerSchema,
  sanitizeNextPath,
  zodFieldErrors,
} from '../lib/schemas';
import type { UserProfile } from '../lib/types';
import { Button, Input, Label } from '../components/ui/Primitives';

function GoogleMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z" />
    </svg>
  );
}

export function LoginPage() {
  const { search, navigate } = useRouter();
  const { user, setUser, bannedNotice, clearBannedNotice, loginWithGoogle } = useAuth();
  const params = new URLSearchParams(search);
  const rawNext = params.get('next');
  const nextPath = sanitizeNextPath(rawNext, '/akun/postingan');
  const registerHref = rawNext ? `/daftar?next=${encodeURIComponent(nextPath)}` : '/daftar';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    bannedNotice ? 'Akun ini diblokir. Hubungi admin.' : null
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      navigate(nextPath, { replace: true });
    }
  }, [user, nextPath, navigate]);

  useEffect(() => {
    if (bannedNotice) {
      setError('Akun ini diblokir. Hubungi admin.');
    }
  }, [bannedNotice]);

  const handleGoogleSubmit = async () => {
    clearBannedNotice();
    setError(null);
    setFieldErrors({});
    setGoogleBusy(true);
    try {
      const res = await loginWithGoogle();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      navigate(nextPath, { replace: true });
    } finally {
      setGoogleBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearBannedNotice();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      setError(null);
      return;
    }

    setFieldErrors({});
    setError(null);
    setSubmitting(true);

    const res = await apiFetch<{ user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });

    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      return;
    }

    setUser(res.data.user);
    navigate(nextPath, { replace: true });
  };

  return (
    <main className="flex flex-1 flex-col justify-center bg-grid-mono px-4 py-10">
      <motion.div
        initial={{ opacity: 0.96, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto w-full max-w-[420px] rounded-xl border border-zinc-200 bg-white p-6 sm:p-7 shadow-sm"
      >
        <span aria-hidden="true" className="absolute -left-1 -top-1 h-2 w-2 bg-zinc-950" />
        <span aria-hidden="true" className="absolute -right-1 -top-1 h-2 w-2 bg-zinc-950" />
        <span aria-hidden="true" className="absolute -bottom-1 -left-1 h-2 w-2 bg-zinc-950" />
        <span aria-hidden="true" className="absolute -bottom-1 -right-1 h-2 w-2 bg-zinc-950" />

        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          <LogIn className="h-3.5 w-3.5 text-zinc-950" aria-hidden="true" />
          <span>Autentikasi Akun</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">
          Masuk ke Japostku
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Kelola postingan atau pasang iklan baru dalam hitungan menit.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-zinc-950 bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-white"
          >
            {error}
          </div>
        )}

        <div className="mt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleGoogleSubmit()}
            disabled={googleBusy || submitting}
            className="w-full min-h-11 border-zinc-300 font-semibold hover:border-zinc-950"
          >
            <GoogleMark />
            <span>{googleBusy ? 'Menghubungkan Google...' : 'Masuk dengan Google'}</span>
          </Button>
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-zinc-400">
          <div className="h-px flex-1 bg-zinc-200" />
          <span>atau masuk dengan email</span>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login-email" className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
              <span>Email</span>
            </Label>
            <Input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email && (
              <p className="text-xs font-medium text-zinc-950">{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="login-password" className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
              <span>Kata sandi</span>
            </Label>
            <div className="relative">
              <Input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-11"
                aria-invalid={Boolean(fieldErrors.password)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-zinc-500 hover:text-zinc-950 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-xs font-medium text-zinc-950">{fieldErrors.password}</p>
            )}
          </div>

          <Button type="submit" disabled={submitting || googleBusy} className="w-full">
            {submitting ? 'Memeriksa...' : 'Masuk'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-600">
          Belum punya akun?{' '}
          <Link href={registerHref} className="font-semibold text-zinc-950 hover:underline">
            Daftar sekarang
          </Link>
        </p>
      </motion.div>
    </main>
  );
}

export function RegisterPage() {
  const { search, navigate } = useRouter();
  const { user, setUser, clearBannedNotice, loginWithGoogle } = useAuth();
  const params = new URLSearchParams(search);
  const rawNext = params.get('next');
  const nextPath = sanitizeNextPath(rawNext, '/akun/postingan');
  const loginHref = rawNext ? `/masuk?next=${encodeURIComponent(nextPath)}` : '/masuk';

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      navigate(nextPath, { replace: true });
    }
  }, [user, nextPath, navigate]);

  const handleGoogleSubmit = async () => {
    clearBannedNotice();
    setError(null);
    setFieldErrors({});
    setGoogleBusy(true);
    try {
      const res = await loginWithGoogle();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      navigate(nextPath, { replace: true });
    } finally {
      setGoogleBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearBannedNotice();
    const parsed = registerSchema.safeParse({ displayName, email, password });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      setError(null);
      return;
    }

    setFieldErrors({});
    setError(null);
    setSubmitting(true);

    const res = await apiFetch<{ user: UserProfile }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });

    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      return;
    }

    setUser(res.data.user);
    navigate(nextPath, { replace: true });
  };

  return (
    <main className="flex flex-1 flex-col justify-center bg-grid-mono px-4 py-10">
      <motion.div
        initial={{ opacity: 0.96, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto w-full max-w-[420px] rounded-xl border border-zinc-200 bg-white p-6 sm:p-7 shadow-sm"
      >
        <span aria-hidden="true" className="absolute -left-1 -top-1 h-2 w-2 bg-zinc-950" />
        <span aria-hidden="true" className="absolute -right-1 -top-1 h-2 w-2 bg-zinc-950" />
        <span aria-hidden="true" className="absolute -bottom-1 -left-1 h-2 w-2 bg-zinc-950" />
        <span aria-hidden="true" className="absolute -bottom-1 -right-1 h-2 w-2 bg-zinc-950" />

        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          <UserPlus className="h-3.5 w-3.5 text-zinc-950" aria-hidden="true" />
          <span>Buat Akun Baru</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">
          Daftar akun baru
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Gratis untuk mulai memasang barang atau jasa di Japostku.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-zinc-950 bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-white"
          >
            {error}
          </div>
        )}

        <div className="mt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleGoogleSubmit()}
            disabled={googleBusy || submitting}
            className="w-full min-h-11 border-zinc-300 font-semibold hover:border-zinc-950"
          >
            <GoogleMark />
            <span>{googleBusy ? 'Menghubungkan Google...' : 'Lanjutkan dengan Google'}</span>
          </Button>
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-zinc-400">
          <div className="h-px flex-1 bg-zinc-200" />
          <span>atau daftar dengan email</span>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reg-name" className="inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
              <span>Nama tampilan</span>
            </Label>
            <Input
              id="reg-name"
              name="displayName"
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              aria-invalid={Boolean(fieldErrors.displayName)}
            />
            {fieldErrors.displayName && (
              <p className="text-xs font-medium text-zinc-950">{fieldErrors.displayName}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-email" className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
              <span>Email</span>
            </Label>
            <Input
              id="reg-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email && (
              <p className="text-xs font-medium text-zinc-950">{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-password" className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
              <span>Kata sandi</span>
            </Label>
            <div className="relative">
              <Input
                id="reg-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-11"
                aria-invalid={Boolean(fieldErrors.password)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-zinc-500 hover:text-zinc-950 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password ? (
              <p className="text-xs font-medium text-zinc-950">{fieldErrors.password}</p>
            ) : (
              <p className="text-xs text-zinc-500">Minimal 8 karakter</p>
            )}
          </div>

          <Button type="submit" disabled={submitting || googleBusy} className="w-full">
            {submitting ? 'Mendaftarkan...' : 'Buat akun'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-600">
          Sudah punya akun?{' '}
          <Link href={loginHref} className="font-semibold text-zinc-950 hover:underline">
            Masuk di sini
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
