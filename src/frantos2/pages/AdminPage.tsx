import React, { useEffect, useMemo, useState } from 'react';
import { Briefcase, Check, Copy, FolderLock, KeyRound, Lock, LockOpen, LogOut, RefreshCw, ShieldAlert, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { useI18n } from '../i18n';
import { go } from '../route';
import { useWs } from '../ws/store';
import { toast } from '../ws/kit';
import { GlassPage } from '../glass/Shell';
import { Pane } from '../glass/kit';
import { adminCall, cloudEnabled, useAuth } from '../cloud/client';
import { Avatar } from '../glass/Avatar';

interface Account {
  id: string;
  name: string;
  email: string;
  platform_role: 'admin' | 'developer' | 'client';
  must_change_password: boolean;
  disabled: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  mfa: boolean;
  projects: string[];
  avatar?: string | null;
}
interface Listing {
  me: string;
  mfa: boolean;
  users: Account[];
  log: { action: string; target: string | null; meta: Record<string, unknown>; at: string }[];
}

const AUDIT: Record<string, string> = {
  create: 'Created',
  reset_password: 'New temporary password',
  disable: 'Locked',
  enable: 'Unlocked',
  role: 'Role changed',
  grant: 'Opened a project to',
  revoke: 'Closed a project to',
  delete: 'Deleted',
  signout: 'Signed out everywhere',
};

/** The one-time temporary password, shown once with a copy button. */
function SecretOnce({ email, password, onDone }: { email: string; password: string; onDone: () => void }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const text = `FrantoS\n${window.location.origin}/#/app\nEmail: ${email}\n${t('Temporary password')}: ${password}`;
  return (
    <div role="status" className="rounded-[18px] border border-[#ffcf70]/60 bg-[#ffcf70]/10 p-4">
      <p className="flex items-center gap-2 text-[14px] font-bold">
        <KeyRound size={16} /> {t('Temporary password for {email}', { email })}
      </p>
      <code dir="ltr" className="mt-2 block select-all rounded-[10px] bg-black/30 px-3 py-2 font-mono text-[17px] tracking-wide">
        {password}
      </code>
      <p className="mt-2 text-[12.5px] leading-[1.5] text-white/75">{t('Shown only now. Send it privately (not in the same message as the email if you can). They will choose their own password at first sign-in.')}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="lg-btn lg-btn-primary min-h-[38px] text-[13px]"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? t('Copied') : t('Copy sign-in details')}
        </button>
        <button type="button" className="lg-btn lg-btn-ghost min-h-[38px] text-[13px]" onClick={onDone}>
          {t('Done')}
        </button>
      </div>
    </div>
  );
}

export function AdminPage() {
  const { t, lang } = useI18n();
  const a = useAuth();
  const { state } = useWs();
  const [data, setData] = useState<Listing | null>(null);
  const [err, setErr] = useState<{ msg: string; code?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState<{ email: string; password: string } | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'client' as 'client' | 'developer', projects: [] as string[] });

  // projects that live in the studio (only those can be shared with a client)
  const cloudProjects = useMemo(() => state.projects.filter((p) => p.cloud).map((p) => ({ id: p.id, title: p.title })), [state.projects]);
  const title = (id: string) => cloudProjects.find((p) => p.id === id)?.title ?? id;
  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(lang === 'he' ? 'he-IL' : lang === 'ru' ? 'ru-RU' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : t('never'));

  const load = async () => {
    try {
      setData(await adminCall<Listing>('list'));
      setErr(null);
    } catch (e: any) {
      setErr({ msg: e.message, code: e.code });
    }
  };
  useEffect(() => {
    if (a.role === 'admin' && !a.needsCode) load();
  }, [a.role, a.needsCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (action: string, body: Record<string, unknown>, done?: string) => {
    setBusy(true);
    try {
      const r = await adminCall(action, body);
      if (r?.password) setSecret({ email: body.email as string ?? data?.users.find((u) => u.id === body.id)?.email ?? '', password: r.password });
      if (done) toast(done);
      await load();
      return r;
    } catch (e: any) {
      toast(t(e.message), { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (!cloudEnabled) return <GlassPage kicker={t('Admin')} title={t('Accounts & access')}>{t('This build has no studio server.')}</GlassPage>;
  if (!a.session || a.role !== 'admin')
    return (
      <GlassPage kicker={t('Admin')} title={t('Accounts & access')} lead={t('Only the studio admin can open this page.')}>
        <button type="button" className="lg-btn lg-btn-ghost" onClick={() => go('/app')}>
          {t('Back to the workspace')}
        </button>
      </GlassPage>
    );

  const users = data?.users ?? [];
  const people = (role: Account['platform_role']) => users.filter((u) => u.platform_role === role);

  const Row = ({ u }: { u: Account }) => {
    const self = u.id === data?.me;
    return (
      <li className={`rounded-[18px] p-3.5 ${u.disabled ? 'bg-white/[0.04] opacity-70' : 'bg-white/[0.08]'}`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Avatar src={u.avatar} name={u.name || u.email} size={38} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14.5px] font-bold" dir="auto">
              {u.name} {self && <span className="text-white/60">· {t('you')}</span>}
            </p>
            <p className="truncate text-[12.5px] text-white/65" dir="ltr">
              {u.email}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11.5px]">
            {u.mfa ? <span className="rounded-full bg-[#7fe0a1]/20 px-2 py-0.5 text-[#c9f5d6]">2FA</span> : <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/65">{t('no 2FA')}</span>}
            {u.must_change_password && <span className="rounded-full bg-[#ffcf70]/20 px-2 py-0.5 text-[#ffe3a8]">{t('temporary password')}</span>}
            {u.disabled && <span className="rounded-full bg-[#ff8a7a]/20 px-2 py-0.5 text-[#ffc4ba]">{t('locked')}</span>}
          </div>
        </div>
        <p className="mt-1.5 text-[11.5px] text-white/55">
          {t('Last sign-in')}: {when(u.last_sign_in_at)}
        </p>

        {u.platform_role === 'client' && (
          <div className="mt-2.5">
            <p className="lg-label mb-1">{t('Projects they can see')}</p>
            <div className="flex flex-wrap gap-1.5">
              {cloudProjects.length === 0 && <span className="text-[12px] text-white/60">{t('Move a project to the studio first (project menu → Move to studio).')}</span>}
              {cloudProjects.map((p) => {
                const on = u.projects.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={busy}
                    aria-pressed={on}
                    onClick={() => act(on ? 'revoke' : 'grant', { id: u.id, project: p.id })}
                    className={`min-h-[32px] whitespace-nowrap rounded-full px-3 text-[12px] font-bold ${on ? 'bg-white text-[#11151a]' : 'bg-white/10 hover:bg-white/15'}`}
                  >
                    {on && <Check size={12} className="me-1 inline" />}
                    {p.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!self && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button type="button" disabled={busy} className="lg-btn lg-btn-ghost min-h-[34px] px-3 text-[12px]" onClick={() => act('reset', { id: u.id }, t('New temporary password made'))}>
              <KeyRound size={13} /> {t('New temporary password')}
            </button>
            <button
              type="button"
              disabled={busy}
              className="lg-btn lg-btn-ghost min-h-[34px] px-3 text-[12px]"
              onClick={() => act('role', { id: u.id, role: u.platform_role === 'client' ? 'developer' : 'client' }, t('Role changed'))}
            >
              {u.platform_role === 'client' ? <Briefcase size={13} /> : <Users size={13} />} {u.platform_role === 'client' ? t('Make developer') : t('Make client')}
            </button>
            <button type="button" disabled={busy} className="lg-btn lg-btn-ghost min-h-[34px] px-3 text-[12px]" onClick={() => act('signout_everywhere', { id: u.id }, t('Signed out on every device'))}>
              <LogOut size={13} /> {t('Sign out everywhere')}
            </button>
            <button type="button" disabled={busy} className="lg-btn lg-btn-ghost min-h-[34px] px-3 text-[12px]" onClick={() => act(u.disabled ? 'enable' : 'disable', { id: u.id }, u.disabled ? t('Account unlocked') : t('Account locked'))}>
              {u.disabled ? <LockOpen size={13} /> : <Lock size={13} />} {u.disabled ? t('Unlock') : t('Lock')}
            </button>
            <button
              type="button"
              disabled={busy}
              className="lg-btn lg-btn-plain min-h-[34px] px-3 text-[12px] text-[#ffc4ba]"
              onClick={() => window.confirm(t('Delete {email} and everything only they could reach? This cannot be undone.', { email: u.email })) && act('delete', { id: u.id }, t('Account deleted'))}
            >
              <Trash2 size={13} /> {t('Delete')}
            </button>
          </div>
        )}
      </li>
    );
  };

  return (
    <GlassPage kicker={t('Admin')} title={t('Accounts & access')} lead={t('A private studio: nobody can sign up. You create every account, choose who is a developer and which projects each client sees.')} bg="/projects/casa-arca/handle.webp">
      {err?.code === 'aal2' && (
        <Pane className="mb-5 flex items-center gap-3 rounded-[22px] p-4">
          <ShieldAlert size={18} /> <p className="flex-1 text-[14px]">{t('Enter your 2FA code to manage accounts.')}</p>
        </Pane>
      )}
      {err && err.code !== 'aal2' && (
        <Pane className="mb-5 flex items-center gap-3 rounded-[22px] p-4">
          <ShieldAlert size={18} /> <p className="flex-1 text-[14px]">{t(err.msg)}</p>
          <button type="button" className="lg-btn lg-btn-ghost min-h-[36px] text-[13px]" onClick={load}>
            <RefreshCw size={14} /> {t('Try again')}
          </button>
        </Pane>
      )}
      {data && !data.mfa && (
        <Pane className="mb-5 flex flex-wrap items-center gap-3 rounded-[22px] p-4">
          <ShieldAlert size={18} className="text-[#ffcf70]" />
          <p className="min-w-0 flex-1 text-[14px]">{t('Turn on two-factor sign-in for the admin account: with it, a stolen password alone cannot manage accounts.')}</p>
          <button type="button" className="lg-btn lg-btn-primary min-h-[38px] text-[13px]" onClick={() => go('/settings?security=1')}>
            <ShieldCheck size={14} /> {t('Turn on 2FA')}
          </button>
        </Pane>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Pane className="space-y-3 rounded-[28px] p-5">
            <h2 className="flex items-center gap-2 text-[18px] font-extrabold">
              <UserPlus size={18} /> {t('New account')}
            </h2>
            {secret ? (
              <SecretOnce email={secret.email} password={secret.password} onDone={() => setSecret(null)} />
            ) : (
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const r = await act('create', { ...form, projects: form.role === 'client' ? form.projects : [] }, t('Account created'));
                  if (r) setForm({ name: '', email: '', role: form.role, projects: [] });
                }}
              >
                <div role="radiogroup" aria-label={t('Role')} className="flex gap-1 rounded-[14px] bg-white/10 p-1">
                  {(['client', 'developer'] as const).map((r) => (
                    <button key={r} type="button" role="radio" aria-checked={form.role === r} onClick={() => setForm({ ...form, role: r })} className={`min-h-[38px] flex-1 whitespace-nowrap rounded-[10px] px-3 text-[13px] font-bold ${form.role === r ? 'bg-white text-[#11151a]' : 'hover:bg-white/10'}`}>
                      {r === 'client' ? t('Client') : t('Developer')}
                    </button>
                  ))}
                </div>
                <p className="text-[12.5px] leading-[1.5] text-white/70">{form.role === 'client' ? t('Sees only the projects you pick, comments and approves. Cannot edit.') : t('Works on every studio project: edits, uploads, the studio and presentations.')}</p>
                <div>
                  <label className="lg-label" htmlFor="ad-name">
                    {t('Name')}
                  </label>
                  <input id="ad-name" dir="auto" className="lg-input mt-1 text-[14px]" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('Dana Levi')} />
                </div>
                <div>
                  <label className="lg-label" htmlFor="ad-email">
                    Email
                  </label>
                  <input id="ad-email" type="email" required dir="ltr" className="lg-input mt-1 text-[14px]" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="client@company.com" />
                </div>
                {form.role === 'client' && cloudProjects.length > 0 && (
                  <div>
                    <p className="lg-label mb-1">{t('Projects they can see')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cloudProjects.map((p) => {
                        const on = form.projects.includes(p.id);
                        return (
                          <button key={p.id} type="button" aria-pressed={on} onClick={() => setForm({ ...form, projects: on ? form.projects.filter((x) => x !== p.id) : [...form.projects, p.id] })} className={`min-h-[32px] whitespace-nowrap rounded-full px-3 text-[12px] font-bold ${on ? 'bg-white text-[#11151a]' : 'bg-white/10 hover:bg-white/15'}`}>
                            {p.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <button type="submit" disabled={busy} className="lg-btn lg-btn-primary w-full disabled:opacity-60">
                  <UserPlus size={15} /> {t('Create the account')}
                </button>
                <p className="text-[11.5px] leading-[1.5] text-white/60">{t('A temporary password is generated and shown once. No email is sent.')}</p>
              </form>
            )}
          </Pane>

          <Pane className="space-y-2 rounded-[28px] p-5">
            <h2 className="flex items-center gap-2 text-[16px] font-extrabold">
              <FolderLock size={16} /> {t('Recent admin actions')}
            </h2>
            {(data?.log ?? []).length === 0 && <p className="text-[12.5px] text-white/60">{t('Nothing yet.')}</p>}
            <ul className="space-y-1.5">
              {(data?.log ?? []).slice(0, 12).map((l, i) => (
                <li key={i} className="text-[12px] text-white/75">
                  <span className="text-white/50">{when(l.at)}</span> · {t(AUDIT[l.action] ?? l.action)} <span dir="ltr">{users.find((u) => u.id === l.target)?.email ?? l.target}</span>
                  {typeof l.meta?.project === 'string' && <> · {title(l.meta.project as string)}</>}
                </li>
              ))}
            </ul>
          </Pane>
        </div>

        <div className="space-y-5">
          {(['admin', 'developer', 'client'] as const).map((role) => (
            <Pane key={role} className="rounded-[28px] p-5">
              <h2 className="mb-3 flex items-center gap-2 text-[18px] font-extrabold">
                {role === 'client' ? <Users size={18} /> : role === 'developer' ? <Briefcase size={18} /> : <ShieldCheck size={18} />}
                {role === 'admin' ? t('Admin') : role === 'developer' ? t('Developers') : t('Clients')}
                <span className="text-[13px] font-semibold text-white/55">{people(role).length}</span>
              </h2>
              {people(role).length === 0 ? <p className="text-[13px] text-white/60">{role === 'client' ? t('No clients yet. Create one on the left and pick their projects.') : t('Nobody yet.')}</p> : <ul className="space-y-2">{people(role).map((u) => <Row key={u.id} u={u} />)}</ul>}
            </Pane>
          ))}
        </div>
      </div>
    </GlassPage>
  );
}
