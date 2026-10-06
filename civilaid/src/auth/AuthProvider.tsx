import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { isSupabaseConfigured } from '@/lib/config';
import { setDemoFullAccess } from '@/lib/demoContent';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { friendlyAuthError, type SignUpInput } from '@/lib/validation';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  profile: Profile | null;
  /** Set when signed in but the profile row couldn't be loaded. */
  profileError: string | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** Resolves to 'signedIn', or 'confirmEmail' when Supabase requires email confirmation. */
  signUp: (input: SignUpInput) => Promise<'signedIn' | 'confirmEmail'>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const PROFILE_SELECT =
  'id, email, full_name, cms_id, section, role, access_semester_id, created_at, ' +
  'access_semester:semesters (id, name, ends_at, is_current)';

/** Demo mode (no Supabase keys built in): a local, fake account so the UI can be previewed. */
function demoProfile(email: string, input?: SignUpInput): Profile {
  const name = input?.fullName.trim() || email.split('@')[0].replace(/[._-]+/g, ' ') || 'Demo Student';
  return {
    id: 'demo-user',
    email: email.trim(),
    full_name: name.replace(/\b\w/g, (c) => c.toUpperCase()),
    cms_id: input?.cmsId.trim() || '512345',
    section: input?.section || 'A',
    // Sign in with an email that starts with "admin" to preview the admin screens.
    role: email.trim().toLowerCase().startsWith('admin') ? 'admin' : 'student',
    access_semester_id: null,
    created_at: new Date().toISOString(),
    access_semester: null,
  };
}

async function fetchProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select(PROFILE_SELECT).eq('id', userId).single();
  return error
    ? { userId, profile: null, error: friendlyAuthError(error) }
    : { userId, profile: data as unknown as Profile, error: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(!isSupabaseConfigured);
  // Tagged with the user id so a stale result never shows for a different account.
  const [loaded, setLoaded] = useState<{ userId: string; profile: Profile | null; error: string | null } | null>(null);
  const userId = session?.user.id ?? null;
  const current = loaded && loaded.userId === userId ? loaded : null;
  const [demo, setDemo] = useState<Profile | null>(null);
  const profile = isSupabaseConfigured ? (current?.profile ?? null) : demo;
  const profileError = current?.error ?? null;

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });
    // Don't call other supabase methods inside this callback — it can deadlock auth.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setSessionLoaded(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchProfile(userId).then((result) => {
      if (!cancelled) setLoaded(result);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const startDemo = useCallback((p: Profile) => {
    setDemoFullAccess(p.role === 'admin');
    setDemo(p);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) return startDemo(demoProfile(email));
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(friendlyAuthError(error));
  }, [startDemo]);

  const signUp = useCallback(async (input: SignUpInput) => {
    if (!isSupabaseConfigured) {
      startDemo(demoProfile(input.email, input));
      return 'signedIn' as const;
    }
    const cmsId = input.cmsId.trim();
    const { data: available, error: checkError } = await supabase.rpc('cms_id_available', { p_cms_id: cmsId });
    if (checkError) throw new Error(friendlyAuthError(checkError));
    if (available === false) throw new Error('This CMS ID is already registered. Try signing in instead.');

    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      // Read by the handle_new_user trigger to create the profile row.
      options: { data: { full_name: input.fullName.trim(), cms_id: cmsId, section: input.section } },
    });
    if (error) throw new Error(friendlyAuthError(error));
    // Supabase returns a user with no identities when the email is already taken
    // (and email confirmation is on), instead of an error.
    if (data.user && data.user.identities?.length === 0) {
      throw new Error('An account with this email already exists. Try signing in.');
    }
    return data.session ? 'signedIn' : 'confirmEmail';
  }, [startDemo]);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return setDemo(null);
    const { error } = await supabase.auth.signOut();
    // If the server can't be reached, still clear the session on this device.
    if (error) await supabase.auth.signOut({ scope: 'local' });
  }, []);

  const refreshProfile = useCallback(async () => {
    if (userId) setLoaded(await fetchProfile(userId));
  }, [userId]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: !sessionLoaded ? 'loading' : session || demo ? 'signedIn' : 'signedOut',
      session,
      profile,
      profileError,
      isAdmin: profile?.role === 'admin',
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [sessionLoaded, session, demo, profile, profileError, signIn, signUp, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
