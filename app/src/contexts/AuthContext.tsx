import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextValue {
  loading: boolean;
  configured: boolean;
  session: Session | null;
  user: User | null;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { ok: false, error: 'Auth is not configured.' };
    }
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return { ok: false, error: 'Enter an email.' };
    if (password.length < 8) {
      return { ok: false, error: 'Password must be at least 8 characters.' };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { ok: false, error: 'Auth is not configured.' };
    }
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return { ok: false, error: 'Enter an email.' };
    if (password.length < 8) {
      return { ok: false, error: 'Password must be at least 8 characters.' };
    }
    const { data, error } = await supabase.auth.signUp({
      email: trimmed,
      password,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    // If email confirmation is disabled, signUp returns a session immediately.
    // If still enabled, signUp succeeds but session is null until the user
    // confirms — we surface that as a friendly hint.
    if (!data.session) {
      return {
        ok: false,
        error:
          'Account created, but Supabase still requires email confirmation. ' +
          'Disable it in Authentication → Providers → Email.',
      };
    }
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      configured: isSupabaseConfigured,
      session,
      user: session?.user ?? null,
      signIn,
      signUp,
      signOut,
    }),
    [loading, session, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
