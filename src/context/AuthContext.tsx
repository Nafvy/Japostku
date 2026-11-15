import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import {
  signInWithGooglePopup,
  signOutFirebase,
  syncSignedInUserToFirestore,
  testFirestoreConnection,
} from '../lib/firebase';
import type { ActionResult, UserProfile } from '../lib/types';

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  bannedNotice: boolean;
  clearBannedNotice: () => void;
  setUser: (user: UserProfile | null) => void;
  refreshUser: () => Promise<UserProfile | null>;
  loginWithGoogle: () => Promise<ActionResult<UserProfile>>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bannedNotice, setBannedNotice] = useState(false);

  const refreshUser = useCallback(async (): Promise<UserProfile | null> => {
    const res = await apiFetch<{ user: UserProfile | null; banned: boolean }>('/api/auth/me');
    if (res.ok) {
      setUser(res.data.user);
      if (res.data.banned) {
        setBannedNotice(true);
      }
      setLoading(false);
      return res.data.user;
    }
    setUser(null);
    setLoading(false);
    return null;
  }, []);

  useEffect(() => {
    void testFirestoreConnection();
    void refreshUser();
  }, [refreshUser]);

  const loginWithGoogle = useCallback(async (): Promise<ActionResult<UserProfile>> => {
    try {
      const credential = await signInWithGooglePopup();
      const idToken = await credential.user.getIdToken();
      const res = await apiFetch<{ user: UserProfile }>('/api/auth/firebase', {
        method: 'POST',
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        await signOutFirebase();
        return { ok: false, error: res.error };
      }

      setUser(res.data.user);
      void syncSignedInUserToFirestore(res.data.user.displayName, res.data.user.whatsapp).catch(
        () => undefined
      );
      return { ok: true, data: res.data.user };
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string'
          ? (err as { code: string }).code
          : '';
      const rawMessage = err instanceof Error ? err.message : '';
      let message = 'Gagal masuk dengan akun Google. Silakan coba lagi.';

      if (code === 'auth/popup-closed-by-user' || rawMessage.includes('popup-closed-by-user')) {
        message = 'Jendela login Google ditutup sebelum selesai.';
      } else if (code === 'auth/cancelled-popup-request') {
        message = 'Permintaan login dibatalkan. Silakan klik tombol sekali lagi.';
      } else if (code === 'auth/popup-blocked' || rawMessage.includes('popup-blocked')) {
        message = 'Popup diblokir oleh peramban. Izinkan popup lalu coba lagi.';
      } else if (code === 'auth/unauthorized-domain' || rawMessage.includes('unauthorized-domain')) {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'domain ini';
        message = `Domain ${host} belum didaftarkan pada Authorized domains di Firebase Authentication.`;
      } else if (code === 'auth/operation-not-allowed') {
        message = 'Login Google belum diaktifkan pada proyek Firebase.';
      } else if (code === 'auth/network-request-failed') {
        message = 'Koneksi ke layanan Google gagal. Periksa internet kamu lalu coba lagi.';
      } else if (code) {
        message = `Gagal masuk dengan akun Google, kode: ${code}.`;
      }

      return { ok: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    await Promise.allSettled([apiFetch('/api/auth/logout', { method: 'POST' }), signOutFirebase()]);
    setUser(null);
  }, []);

  const clearBannedNotice = useCallback(() => {
    setBannedNotice(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        bannedNotice,
        clearBannedNotice,
        setUser,
        refreshUser,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
