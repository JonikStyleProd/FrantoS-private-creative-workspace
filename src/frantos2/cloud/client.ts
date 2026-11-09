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

export type PlatformRole = 'admin' | 'developer' | 'client';

interface AuthState {
  ready: boolean;
  session: Session | null;
  name: string;
  studios: Studio[];
  role: PlatformRole | null;
  /** the account still has the temporary password the admin gave out */
  mustChangePassword: boolean;
  /** signed in with a password but the account's 2FA code has not been entered yet */
  needsCode: boolean;
}

let auth: AuthState = { ready: !sb, session: null, name: '', studios: [], role: null, mustChangePassword: false, needsCode: false };
const ls = new Set<() => void>();
const emit = (patch: Partial<AuthState>) => {
  auth = { ...auth, ...patch };
  ls.forEach((f) => f());
};

async function loadProfile(session: Session | null) {
  if (!sb || !session) {
    emit({ ready: true, session: null, name: '', studios: [], role: null, mustChangePassword: false, needsCode: false });
    return;
  }
  const [{ data: prof }, { data: mem }, { data: aal }] = await Promise.all([
    sb.from('profiles').select('name, platform_role, must_change_password').eq('id', session.user.id).maybeSingle(),
    sb.from('studio_members').select('role, studios(id, name)').eq('user_id', session.user.id),
    sb.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  const studios: Studio[] = (mem ?? []).map((m: any) => ({ id: m.studios.id, name: m.studios.name, role: m.role }));
  emit({
    ready: true,
    session,
    name: prof?.name ?? session.user.email?.split('@')[0] ?? 'You',
    studios,
    role: (prof?.platform_role as PlatformRole) ?? null,
    mustChangePassword: !!prof?.must_change_password,
    needsCode: aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2',
  });
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

/* ───────── password sign-in, password change, 2FA ───────── */

export async function signInWithPassword(email: string, password: string) {
  if (!sb) throw new Error('Cloud is not configured');
  const { error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  await refreshStudios();
}

export async function sendPasswordReset(email: string) {
  if (!sb) throw new Error('Cloud is not configured');
  const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/#/settings?security=1` });
  if (error) throw error;
}

/** strong enough: 12+ characters, letters and digits, not the email */
export function passwordProblem(pw: string, email?: string): string | null {
  if (pw.length < 12) return 'At least 12 characters';
  if (!/[a-zA-Zа-яА-Яא-ת]/.test(pw) || !/\d/.test(pw)) return 'Use letters and digits';
  if (email && pw.toLowerCase().includes(email.split('@')[0].toLowerCase())) return 'Do not use your email in the password';
  return null;
}

export async function changePassword(pw: string) {
  if (!sb) throw new Error('Cloud is not configured');
  const { error } = await sb.auth.updateUser({ password: pw });
  if (error) throw error;
  await sb.rpc('password_changed');
  await refreshStudios();
}

/** end every session of this account, here and on other devices */
export async function signOutEverywhere() {
  await sb?.auth.signOut({ scope: 'global' });
}

export async function mfaFactors() {
  if (!sb) return [];
  const { data } = await sb.auth.mfa.listFactors();
  return (data?.totp ?? []).filter((f) => f.status === 'verified');
}

export async function mfaEnroll() {
  if (!sb) throw new Error('Cloud is not configured');
  // leftover unverified factors from an abandoned setup would block a new one
  const { data } = await sb.auth.mfa.listFactors();
  for (const f of data?.all ?? []) if (f.status !== 'verified') await sb.auth.mfa.unenroll({ factorId: f.id });
  const { data: e, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: `FrantoS ${new Date().toISOString().slice(0, 10)}` });
  if (error) throw error;
  return { factorId: e.id, qr: e.totp.qr_code, secret: e.totp.secret };
}

export async function mfaVerify(factorId: string, code: string) {
  if (!sb) throw new Error('Cloud is not configured');
  const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s/g, '') });
  if (error) throw error;
  await refreshStudios();
}

/** enter the 2FA code for this session (after the password) */
export async function mfaStepUp(code: string) {
  const [f] = await mfaFactors();
  if (!f) throw new Error('No 2FA on this account');
  await mfaVerify(f.id, code);
}

export async function mfaRemove(factorId: string) {
  if (!sb) throw new Error('Cloud is not configured');
  const { error } = await sb.auth.mfa.unenroll({ factorId });
  if (error) throw error;
  await sb.auth.refreshSession();
  await refreshStudios();
}

/** account management: only the admin, through the admin-users edge function */
export async function adminCall<T = any>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  if (!sb || !FUNCTIONS_URL) throw new Error('Cloud is not configured');
  const { data } = await sb.auth.getSession();
  const r = await fetch(`${FUNCTIONS_URL}/admin-users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key!, Authorization: `Bearer ${data.session?.access_token ?? ''}` },
    body: JSON.stringify({ action, ...body }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error ?? 'Request failed'), { code: j.code });
  return j as T;
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
