import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, Cloud, CloudOff, Copy, LogOut, Mail, Plus, Users, X } from 'lucide-react';
import { cloudEnabled, getAuth, refreshStudios, sb, signInWithEmail, signOut, useAuth } from './client';
import { getSyncState, onSync, pullAll } from './sync';
import { useI18n } from '../i18n';
import { LangSwitch } from '../i18n/LangSwitch';
export { LangSwitch };
import { ws, useWs, setStudio } from '../ws/store';
import { go } from '../route';
import { Wordmark } from '../ui';
import { toast } from '../ws/kit';

const ease = [0.22, 1, 0.36, 1] as const;

export function useSync() {
  const [s, setS] = useState(getSyncState());
  useEffect(() => {
    const off = onSync(() => setS(getSyncState()));
    return () => {
      off();
    };
  }, []);
  return s;
}

/** Pulls studio projects once a session exists. Mounted once at the root. */
export function CloudBoot() {
  const a = useAuth();
  const { state } = useWs();
  useEffect(() => {
    if (!a.session) return;
    if (!state.studioId && a.studios[0]) setStudio(a.studios[0].id);
    if (a.name && state.you === 'You') ws.setYou(a.name);
    pullAll();
  }, [a.session?.user.id, a.studios.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export function AccountButton() {
  const { t } = useI18n();
  const a = useAuth();
  const sync = useSync();
  const [open, setOpen] = useState(false);
  const [signin, setSignin] = useState(false);
  if (!cloudEnabled) return null;
  if (!a.ready) return <span className="h-9 w-9" />;
  if (!a.session)
    return (
      <>
        <button onClick={() => setSignin(true)} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--rule)] px-3 text-[13px] font-medium hover:bg-black/[0.04]">
          <Cloud size={14} /> {t('Sign in')}
        </button>
        <AnimatePresence>{signin && <SignIn onClose={() => setSignin(false)} />}</AnimatePresence>
      </>
    );
  const initial = (a.name || a.session.user.email || '?').slice(0, 1).toUpperCase();
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={t('Account')} className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ink)] text-[14px] font-semibold text-[var(--paper)]">
        {initial}
        <span
          className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full border-2 border-[var(--paper)]"
          style={{ background: sync === 'syncing' ? 'var(--signal)' : sync === 'offline' || sync === 'error' ? '#b0a89b' : '#4f8a5b' }}
          title={sync}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="absolute end-0 top-11 z-50 w-[270px] rounded-[10px] border border-[var(--rule)] bg-[#f7f2e9] p-2 shadow-[0_24px_50px_-24px_rgba(0,0,0,0.45)]"
            role="menu"
          >
            <div className="px-2 py-2">
              <p className="text-[14px] font-semibold">{a.name}</p>
              <p className="truncate text-[12px] text-[var(--ink-2)]" dir="ltr">
                {a.session.user.email}
              </p>
              <p className="mt-1 flex items-center gap-1 text-[11.5px] text-[var(--ink-2)]">
                {sync === 'offline' ? <CloudOff size={12} /> : <Cloud size={12} />}
                {sync === 'syncing' ? t('Syncing…') : sync === 'offline' ? t('Offline — changes wait here') : sync === 'error' ? t('Sync paused, retrying') : t('In sync with your studio')}
              </p>
            </div>
            <div className="my-1 h-px bg-[var(--rule)]" />
            <button role="menuitem" onClick={() => (setOpen(false), go('/team'))} className="flex w-full items-center gap-2 rounded-[6px] px-2 py-2 text-start text-[13.5px] hover:bg-black/5">
              <Users size={15} /> {t('Studio & team')}
            </button>
            <div className="px-2 py-2">
              <LangSwitch />
            </div>
            <button role="menuitem" onClick={() => (setOpen(false), signOut())} className="flex w-full items-center gap-2 rounded-[6px] px-2 py-2 text-start text-[13.5px] text-[var(--ink-2)] hover:bg-black/5">
              <LogOut size={15} /> {t('Sign out')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SignIn({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [err, setErr] = useState('');
  return (
    <motion.div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.form
        role="dialog"
        aria-modal
        aria-label={t('Sign in')}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 16 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.22, ease }}
        className="w-full max-w-[420px] rounded-[12px] bg-[var(--paper)] p-6 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.5)]"
        onSubmit={async (e) => {
          e.preventDefault();
          setState('sending');
          try {
            await signInWithEmail(email.trim());
            setState('sent');
          } catch (e: any) {
            setErr(e?.message ?? '');
            setState('error');
          }
        }}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="flex items-start justify-between">
          <h2 className="f2-display text-[32px] leading-none">{t('Sign in to your studio')}</h2>
          <button type="button" onClick={onClose} aria-label={t('Close')} className="rounded-full p-1.5 hover:bg-black/5">
            <X size={16} />
          </button>
        </div>
        {state === 'sent' ? (
          <div className="mt-5 flex gap-3 rounded-[8px] border border-[var(--rule)] p-4">
            <Mail size={18} className="mt-0.5 shrink-0" />
            <p className="text-[14px] leading-relaxed">{t('Check {email}: we sent a sign-in link. Open it on this device.', { email })}</p>
          </div>
        ) : (
          <>
            <p className="mt-3 text-[14px] leading-relaxed text-[var(--ink-2)]">{t('We will email you a one-time link. No password. Your local projects stay where they are until you move them to the studio.')}</p>
            <label className="mt-4 block">
              <span className="f2-mono text-[var(--ink-2)]">Email</span>
              <input autoFocus type="email" required dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@studio.com" className="mt-1.5 w-full rounded-[6px] border border-[var(--rule)] bg-white/50 px-3 py-2.5 text-[16px] outline-none focus:border-[var(--ink)]" />
            </label>
            {state === 'error' && <p className="mt-2 text-[13px] text-[var(--signal)]">{t('Could not send the link.')} {err}</p>}
            <button type="submit" disabled={state === 'sending'} className="f2-btn f2-btn-signal mt-5 w-full justify-center disabled:opacity-60">
              {state === 'sending' ? t('Sending…') : t('Email me a link')}
            </button>
          </>
        )}
      </motion.form>
    </motion.div>
  );
}

/* ───────── studio & team ───────── */

export function TeamPage() {
  const { t } = useI18n();
  const a = useAuth();
  const { state } = useWs();
  const studio = a.studios.find((s) => s.id === state.studioId) ?? a.studios[0];
  const [members, setMembers] = useState<{ user_id: string; role: string; name?: string }[]>([]);
  const [invite, setInvite] = useState<string | null>(null);
  const [role, setRole] = useState<'editor' | 'client'>('editor');
  const [newName, setNewName] = useState('');
  const [rename, setRename] = useState(studio?.name ?? '');
  useEffect(() => setRename(studio?.name ?? ''), [studio?.id]);

  useEffect(() => {
    if (!sb || !studio) return;
    (async () => {
      const { data: m } = await sb.from('studio_members').select('user_id, role').eq('studio_id', studio.id);
      const ids = (m ?? []).map((x) => x.user_id);
      const { data: profs } = ids.length ? await sb.from('profiles').select('id, name').in('id', ids) : { data: [] as any[] };
      setMembers((m ?? []).map((x) => ({ ...x, name: profs?.find((pp) => pp.id === x.user_id)?.name })));
    })();
  }, [studio?.id]);

  if (!cloudEnabled) return <Shell>{t('This build has no studio server.')}</Shell>;
  if (!a.session)
    return (
      <Shell>
        <p>{t('Sign in to manage your studio.')}</p>
        <div className="mt-4">
          <AccountButton />
        </div>
      </Shell>
    );
  const owner = studio?.role === 'owner';

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="f2-mono text-[var(--ink-2)]">{t('Studio')}</p>
          {owner ? (
            <input
              value={rename}
              onChange={(e) => setRename(e.target.value)}
              onBlur={async () => {
                if (rename.trim() && rename !== studio?.name) {
                  await sb!.from('studios').update({ name: rename.trim() }).eq('id', studio!.id);
                  refreshStudios();
                  toast(t('Saved'));
                }
              }}
              aria-label={t('Studio name')}
              className="f2-display mt-2 w-full rounded bg-transparent text-[44px] leading-none outline-none focus:bg-black/[0.04]"
            />
          ) : (
            <h1 className="f2-display mt-2 text-[44px] leading-none">{studio?.name}</h1>
          )}
        </div>
        {a.studios.length > 1 && (
          <select value={studio?.id} onChange={(e) => setStudio(e.target.value)} aria-label={t('Switch studio')} className="rounded-full border border-[var(--rule)] bg-transparent px-3 py-2 text-[13.5px]">
            {a.studios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <section className="mt-10">
        <h2 className="text-[13px] font-semibold">{t('People')}</h2>
        <ul className="mt-3 divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center justify-between gap-3 py-3">
              <span className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ink)] text-[13px] font-semibold text-[var(--paper)]">{(m.name ?? '?').slice(0, 1).toUpperCase()}</span>
                <span className="text-[14.5px] font-medium">
                  {m.name ?? '—'}
                  {m.user_id === a.session!.user.id && <span className="text-[var(--ink-2)]"> · {t('you')}</span>}
                </span>
              </span>
              {owner && m.user_id !== a.session!.user.id ? (
                <select
                  value={m.role}
                  onChange={async (e) => {
                    await sb!.from('studio_members').update({ role: e.target.value }).eq('studio_id', studio!.id).eq('user_id', m.user_id);
                    setMembers((x) => x.map((y) => (y.user_id === m.user_id ? { ...y, role: e.target.value } : y)));
                  }}
                  className="rounded-full border border-[var(--rule)] bg-transparent px-2.5 py-1 text-[12.5px]"
                  aria-label={t('Role')}
                >
                  <option value="owner">{t('Owner')}</option>
                  <option value="editor">{t('Editor')}</option>
                  <option value="client">{t('Client')}</option>
                </select>
              ) : (
                <span className="text-[12.5px] text-[var(--ink-2)]">{t(m.role === 'owner' ? 'Owner' : m.role === 'editor' ? 'Editor' : 'Client')}</span>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--ink-2)]">{t('Owner: everything, including people. Editor: projects, files, review, publishing. Client: can see studio projects and leave notes.')}</p>
      </section>

      {owner && (
        <section className="mt-10">
          <h2 className="text-[13px] font-semibold">{t('Invite')}</h2>
          <p className="mt-1 text-[13px] text-[var(--ink-2)]">{t('Create a one-time link and send it yourself. The person signs in with their email and joins the studio.')}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select value={role} onChange={(e) => setRole(e.target.value as 'editor' | 'client')} className="rounded-full border border-[var(--rule)] bg-transparent px-3 py-2 text-[13.5px]" aria-label={t('Role')}>
              <option value="editor">{t('Editor')}</option>
              <option value="client">{t('Client')}</option>
            </select>
            <button
              onClick={async () => {
                const { data, error } = await sb!.from('invites').insert({ studio_id: studio!.id, role, created_by: a.session!.user.id }).select('token').single();
                if (error) return toast(t('Could not create the invite'), { tone: 'error' });
                const url = `${window.location.origin}/#/join/${data.token}`;
                setInvite(url);
                navigator.clipboard?.writeText(url).catch(() => {});
                toast(t('Invite link copied'));
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[var(--ink)] px-4 text-[13.5px] font-semibold text-[var(--paper)]"
            >
              <Plus size={15} /> {t('Create invite link')}
            </button>
          </div>
          {invite && (
            <div className="mt-3 flex items-center gap-2 rounded-[8px] border border-[var(--rule)] p-2.5">
              <span className="f2-mono min-w-0 flex-1 truncate !text-[11px]" dir="ltr">
                {invite}
              </span>
              <button onClick={() => navigator.clipboard?.writeText(invite).then(() => toast(t('Copied')))} className="inline-flex items-center gap-1 rounded-full border border-[var(--rule)] px-2.5 py-1 text-[12px]">
                <Copy size={12} /> {t('Copy')}
              </button>
            </div>
          )}
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-[13px] font-semibold">{t('New studio')}</h2>
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const { data, error } = await sb!.rpc('create_studio', { p_name: newName });
            if (error) return toast(t('Could not create the studio'), { tone: 'error' });
            await refreshStudios();
            setStudio(data as string);
            setNewName('');
            toast(t('Studio created'));
          }}
        >
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('Studio name')} className="rounded-full border border-[var(--rule)] bg-white/40 px-4 py-2 text-[14px] outline-none focus:border-[var(--ink)]" />
          <button type="submit" className="rounded-full border border-[var(--ink)] px-4 py-2 text-[13.5px] font-semibold">
            {t('Create')}
          </button>
        </form>
      </section>
    </Shell>
  );
}

export function JoinPage({ token }: { token: string }) {
  const { t } = useI18n();
  const a = useAuth();
  const [state, setState] = useState<'idle' | 'joining' | 'done' | 'error'>('idle');
  useEffect(() => {
    if (!a.session || state !== 'idle') return;
    setState('joining');
    sb!
      .rpc('accept_invite', { p_token: token })
      .then(async ({ data, error }) => {
        if (error) return setState('error');
        await refreshStudios();
        setStudio(data as string);
        setState('done');
        pullAll();
      });
  }, [a.session?.user.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Shell>
      <h1 className="f2-display text-[44px] leading-none">{t('Join a studio')}</h1>
      {!a.session ? (
        <>
          <p className="mt-3 text-[15px] text-[var(--ink-2)]">{t('Sign in with your email to accept the invite.')}</p>
          <div className="mt-5">
            <AccountButton />
          </div>
        </>
      ) : state === 'done' ? (
        <>
          <p className="mt-3 flex items-center gap-2 text-[15px]">
            <Check size={16} /> {t('You are in. Studio projects are loading into your workspace.')}
          </p>
          <button onClick={() => go('/app')} className="f2-btn f2-btn-signal mt-5">
            {t('Open workspace')}
          </button>
        </>
      ) : state === 'error' ? (
        <p className="mt-3 text-[15px] text-[var(--signal)]">{t('This invite is not valid or was already used.')}</p>
      ) : (
        <p className="mt-3 text-[15px] text-[var(--ink-2)]">{t('Joining…')}</p>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="f2-paper min-h-full">
      <header className="mx-auto flex h-[60px] max-w-[900px] items-center justify-between px-5">
        <a href="#/app" className="inline-flex items-center gap-2">
          <ArrowLeft size={16} className="text-[var(--ink-2)]" /> <Wordmark small />
        </a>
        <span className="text-[13px] font-semibold">{t('Studio & team')}</span>
      </header>
      <main className="mx-auto max-w-[900px] px-5 py-10">{children}</main>
    </div>
  );
}

export function useStudioId() {
  const a = useAuth();
  const { state } = useWs();
  return state.studioId ?? a.studios[0]?.id;
}
export { getAuth };
