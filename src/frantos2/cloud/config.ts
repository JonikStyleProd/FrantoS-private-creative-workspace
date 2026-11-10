/**
 * The studio server. The publishable key is meant for browsers (row-level security decides what it can reach),
 * so it ships in the code: the site works even when the host has no environment variables set.
 * Environment variables still win, e.g. for a staging project.
 */
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://huxbleibnvdzskdrlaac.supabase.co';
export const SUPABASE_KEY = ((import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined) || 'sb_publishable_Gig007CpfVuA-1UUY3KO6g_3pyBaQtK';
/** the sign-in wall: on with a studio server, off only for end-to-end test builds */
export const AUTH_GATE = !!SUPABASE_URL && import.meta.env.VITE_AUTH_GATE !== 'off';
