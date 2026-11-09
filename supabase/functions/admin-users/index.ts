// Account management for the FrantoS super admin. The only place the service role touches accounts.
//
// Every call must carry the admin's own session (Authorization: Bearer <user JWT>). The function checks:
//   1. the token belongs to a signed-in user whose profile is `admin` and not disabled;
//   2. if that admin has a verified 2FA factor, the session is at aal2 (code entered this session).
// Every change is written to public.admin_audit.
import { createClient } from 'npm:@supabase/supabase-js@2';

const ORIGINS = [/^https:\/\/frantos-private-creative-workspace[a-z0-9-]*\.vercel\.app$/, /^http:\/\/localhost:\d+$/];

function cors(origin: string | null) {
  const ok = origin && ORIGINS.some((r) => r.test(origin));
  return {
    'Access-Control-Allow-Origin': ok ? origin! : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

const ROLES = ['developer', 'client', 'admin'] as const;
type Role = (typeof ROLES)[number];

/** 16 characters from an unambiguous alphabet, ~94 bits */
function tempPassword() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const b = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(b, (x) => abc[x % abc.length]).join('').replace(/(.{4})(?!$)/g, '$1-');
}

const emailOk = (e: unknown): e is string => typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

Deno.serve(async (req) => {
  const h = cors(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...h, 'Content-Type': 'application/json' } });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  // ── who is calling
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: who } = await admin.auth.getUser(jwt);
  const me = who?.user;
  if (!me) return json({ error: 'Sign in first' }, 401);
  const { data: prof } = await admin.from('profiles').select('platform_role, disabled').eq('id', me.id).maybeSingle();
  if (!prof || prof.platform_role !== 'admin' || prof.disabled) return json({ error: 'Admins only' }, 403);
  const aal = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))?.aal;
  const { data: factors } = await admin.auth.admin.mfa.listFactors({ userId: me.id });
  const hasMfa = (factors?.factors ?? []).some((f: { status: string }) => f.status === 'verified');
  if (hasMfa && aal !== 'aal2') return json({ error: 'Enter your 2FA code first', code: 'aal2' }, 403);

  const audit = (action: string, target: string | null, meta: Record<string, unknown> = {}) => admin.from('admin_audit').insert({ actor: me.id, action, target, meta });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad json' }, 400);
  }
  const action = body.action as string;

  try {
    switch (action) {
      case 'list': {
        const [{ data: users }, { data: profiles }, { data: access }, { data: log }] = await Promise.all([
          admin.auth.admin.listUsers({ perPage: 200 }),
          admin.from('profiles').select('id, name, email, platform_role, must_change_password, disabled, created_at'),
          admin.from('project_access').select('project_id, user_id, can_approve'),
          admin.from('admin_audit').select('action, target, meta, at').order('at', { ascending: false }).limit(40),
        ]);
        const byId = new Map((users?.users ?? []).map((u) => [u.id, u]));
        return json({
          me: me.id,
          mfa: hasMfa,
          users: (profiles ?? []).map((p) => {
            const u = byId.get(p.id);
            return { ...p, last_sign_in_at: u?.last_sign_in_at ?? null, mfa: (u?.factors ?? []).some((f) => f.status === 'verified'), projects: (access ?? []).filter((a) => a.user_id === p.id).map((a) => a.project_id) };
          }),
          log: log ?? [],
        });
      }

      case 'create': {
        const email = String(body.email ?? '').trim().toLowerCase();
        const role = body.role as Role;
        const name = String(body.name ?? '').trim().slice(0, 80) || email.split('@')[0];
        if (!emailOk(email)) return json({ error: 'Check the email address' }, 400);
        if (!['developer', 'client'].includes(role)) return json({ error: 'Role must be developer or client' }, 400);
        const password = tempPassword();
        const { error: e1 } = await admin.from('allowed_accounts').upsert({ email, role, name, created_by: me.id });
        if (e1) throw e1;
        const { data: made, error: e2 } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name, temp_password: true } });
        if (e2) {
          await admin.from('allowed_accounts').delete().eq('email', email);
          return json({ error: e2.message.includes('already') ? 'This email already has an account' : e2.message }, 400);
        }
        const projects = Array.isArray(body.projects) ? (body.projects as string[]).slice(0, 50) : [];
        if (role === 'client' && projects.length) await admin.from('project_access').insert(projects.map((project_id) => ({ project_id, user_id: made.user!.id, granted_by: me.id })));
        await audit('create', email, { role, projects });
        // the temporary password is shown once to the admin and never stored in plain text
        return json({ id: made.user!.id, email, password });
      }

      case 'reset': {
        const id = String(body.id);
        if (id === me.id) return json({ error: 'Change your own password in Settings' }, 400);
        const password = tempPassword();
        const { error } = await admin.auth.admin.updateUserById(id, { password });
        if (error) throw error;
        await admin.from('profiles').update({ must_change_password: true }).eq('id', id);
        await admin.rpc('admin_revoke_sessions', { p_user: id });
        await audit('reset_password', id);
        return json({ password });
      }

      case 'disable':
      case 'enable': {
        const id = String(body.id);
        if (id === me.id) return json({ error: 'You cannot lock yourself out' }, 400);
        const off = action === 'disable';
        const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: off ? '876000h' : 'none' });
        if (error) throw error;
        await admin.from('profiles').update({ disabled: off }).eq('id', id);
        if (off) await admin.rpc('admin_revoke_sessions', { p_user: id });
        await audit(action, id);
        return json({ ok: true });
      }

      case 'role': {
        const id = String(body.id);
        const role = body.role as Role;
        if (id === me.id) return json({ error: 'You stay the admin' }, 400);
        if (!['developer', 'client'].includes(role)) return json({ error: 'Role must be developer or client' }, 400);
        await admin.from('profiles').update({ platform_role: role }).eq('id', id);
        const { data: studios } = await admin.from('studios').select('id').eq('created_by', me.id);
        const sids = (studios ?? []).map((s) => s.id);
        if (role === 'developer') await admin.from('studio_members').upsert(sids.map((studio_id) => ({ studio_id, user_id: id, role: 'editor' })));
        else await admin.from('studio_members').delete().eq('user_id', id).in('studio_id', sids);
        await audit('role', id, { role });
        return json({ ok: true });
      }

      case 'grant':
      case 'revoke': {
        const id = String(body.id);
        const project = String(body.project);
        if (action === 'grant') await admin.from('project_access').upsert({ project_id: project, user_id: id, granted_by: me.id });
        else await admin.from('project_access').delete().eq('project_id', project).eq('user_id', id);
        await audit(action, id, { project });
        return json({ ok: true });
      }

      case 'delete': {
        const id = String(body.id);
        if (id === me.id) return json({ error: 'You cannot delete the admin' }, 400);
        const { data: p } = await admin.from('profiles').select('email').eq('id', id).maybeSingle();
        const { error } = await admin.auth.admin.deleteUser(id);
        if (error) throw error;
        if (p?.email) await admin.from('allowed_accounts').delete().eq('email', p.email);
        await audit('delete', p?.email ?? id);
        return json({ ok: true });
      }

      case 'signout_everywhere': {
        const id = String(body.id);
        await admin.rpc('admin_revoke_sessions', { p_user: id });
        await audit('signout', id);
        return json({ ok: true });
      }

      default:
        return json({ error: 'unknown action' }, 400);
    }
  } catch (e) {
    console.error('admin-users', action, e);
    return json({ error: 'Something went wrong' }, 500);
  }
});
