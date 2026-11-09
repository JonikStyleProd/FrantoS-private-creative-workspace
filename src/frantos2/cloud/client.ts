import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useSyncExternalStore } from 'react';

/**
 * Supabase is optional: without env vars FrantoS runs fully local (the demo).
 * VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY (or legacy VITE_SUPABASE_ANON_KEY).
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

export const sb: SupabaseClient | null = url && key ? createClient(url, key, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } }) : null;
export const cloudEnabled = !!sb;
export const FUNCTIONS_URL = url ? `${url}/functions/v1` : '';

export interface Studio {
  id: string;
  name: string;
  role: 'owner' | 'editor' | 'client';
}

interface AuthState {
  ready: boolean;
  session: Session | null;
  name: string;
  studios: Studio[];
}

let auth: AuthState = { ready: !sb, session: null, name: '', studios: [] };
const ls = new Set<() => void>();
const emit = (patch: Partial<AuthState>) => {
  auth = { ...auth, ...patch };
  ls.forEach((f) => f());
};

async function loadProfile(session: Session | null) {
  if (!sb || !session) {
    emit({ ready: true, session: null, name: '', studios: [] });
    return;
  }
  const [{ data: prof }, { data: mem }] = await Promise.all([
    sb.from('profiles').select('name').eq('id', session.user.id).maybeSingle(),
    sb.from('studio_members').select('role, studios(id, name)').eq('user_id', session.user.id),
  ]);
  const studios: Studio[] = (mem ?? []).map((m: any) => ({ id: m.studios.id, name: m.studios.name, role: m.role }));
  emit({ ready: true, session, name: prof?.name ?? session.user.email?.split('@')[0] ?? 'You', studios });
}

if (sb) {
  sb.auth.getSession().then(({ data }) => loadProfile(data.session));
  sb.auth.onAuthStateChange((_e, session) => {
    if (session?.user.id !== auth.session?.user.id) loadProfile(session);
    else emit({ session });
  });
}

export function refreshStudios() {
  return loadProfile(auth.session);
}

export function useAuth() {
  return useSyncExternalStore(
    (f) => (ls.add(f), () => ls.delete(f)),
    () => auth,
    () => auth
  );
}
export const getAuth = () => auth;

export async function signInWithEmail(email: string) {
  if (!sb) throw new Error('Cloud is not configured');
  const redirect = `${window.location.origin}/${window.location.hash || '#/app'}`;
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
  if (error) throw error;
}

export async function signOut() {
  await sb?.auth.signOut();
}

/* signed URLs for files in the private bucket, cached until shortly before expiry */
const signed = new Map<string, { url: string; exp: number }>();
const inflight = new Map<string, Promise<string | undefined>>();
export function signedUrl(path: string): Promise<string | undefined> {
  const hit = signed.get(path);
  if (hit && hit.exp > Date.now()) return Promise.resolve(hit.url);
  if (!sb) return Promise.resolve(undefined);
  if (!inflight.has(path)) {
    inflight.set(
      path,
      sb.storage
        .from('assets')
        .createSignedUrl(path, 3600)
        .then(({ data }) => {
          inflight.delete(path);
          if (!data?.signedUrl) return undefined;
          signed.set(path, { url: data.signedUrl, exp: Date.now() + 50 * 60 * 1000 });
          return data.signedUrl;
        })
    );
  }
  return inflight.get(path)!;
}
/** for guests and public pages: URLs come from the `files` edge function */
export function primeSigned(urls: Record<string, string>) {
  for (const [p, u] of Object.entries(urls)) signed.set(p, { url: u, exp: Date.now() + 50 * 60 * 1000 });
}

export async function guestFiles(body: { token?: string; slug?: string }) {
  if (!FUNCTIONS_URL || !key) return {};
  const r = await fetch(`${FUNCTIONS_URL}/files`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` }, body: JSON.stringify(body) });
  if (!r.ok) return {};
  const j = await r.json();
  primeSigned(j.urls ?? {});
  return j.urls as Record<string, string>;
}

export function useCloudReady(cb: () => void) {
  const a = useAuth();
  useEffect(() => {
    if (a.session) cb();
  }, [a.session?.user.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
