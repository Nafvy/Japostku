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
      const message =
        err instanceof Error && err.message.includes('popup-closed-by-user')
          ? 'Jendela login Google ditutup sebelum selesai.'
          : err instanceof Error && err.message.includes('popup-blocked')
            ? 'Popup diblokir oleh peramban. Izinkan popup lalu coba lagi.'
            : 'Gagal masuk dengan akun Google. Silakan coba lagi.';
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
