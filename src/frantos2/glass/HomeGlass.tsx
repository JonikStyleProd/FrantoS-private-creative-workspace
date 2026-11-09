import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Cloud, Lock, Plus, RotateCcw, Search, X } from 'lucide-react';
import './glass.css';
import { GlassAccount } from './account';
import { InstallButton } from './install';
import { useI18n } from '../i18n';
import { go } from '../route';
import { ws, useWs, ensureLoaded } from '../ws/store';
import { Project } from '../ws/types';
import { useAssetUrl } from '../ws/media';
import { toast, ago } from '../ws/kit';
import { openPalette } from '../daily/Palette';
import { cloudEnabled, useAuth } from '../cloud/client';
import { moveToStudio } from '../cloud/sync';
import { useStudioId } from '../cloud/Account';
import { Backdrop, Credits, GlassLang, Mark, Pane, ThemeSwitch, lgEase } from './kit';
import { STAGES, STAGE_LABEL, assetById, itemsOf, latest } from './stages';

const DEMO_ID = 'form-01';

/** All projects on glass, over the cover of the one you touched last. */
export function HomeGlass() {
  const { t, dir } = useI18n();
  const { state, status } = useWs();
  const [creating, setCreating] = useState(false);
  useEffect(() => void ensureLoaded(), []);

  // something shared from another app (PWA share target) → a note on the last project's board
  useEffect(() => {
    if (status === 'loading') return;
    const shared = sessionStorage.getItem('frantos-share');
    if (!shared) return;
    sessionStorage.removeItem('frantos-share');
    const target = state.projects.find((p) => p.id === state.lastProjectId) ?? state.projects[0];
    if (!target) return;
    ws.addNote(target.id, 0.04, 0.06, shared);
    toast(t('Shared to FrantoS: added as a note on {name}', { name: target.title }));
    go(`/p/${target.id}/moodboard`);
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const on = () => setCreating(true);
    window.addEventListener('frantos:new', on);
    return () => window.removeEventListener('frantos:new', on);
  }, []);

  const projects = useMemo(() => [...state.projects].sort((a, b) => (b.lastOpenedAt ?? b.updatedAt) - (a.lastOpenedAt ?? a.updatedAt)), [state.projects]);
  const lead = projects[0];
  const cover = lead ? assetById(lead, lead.coverAssetId) ?? lead.assets.find((a) => !a.isReference && a.kind === 'image') ?? lead.assets[0] : undefined;
  const bg = useAssetUrl(cover, 'full').url;

  // what waits for you: open notes on the current version of every work
  const waiting = useMemo(
    () =>
      projects
        .flatMap((p) => p.comments.filter((c) => !c.resolved && p.works.some((w) => w.id === c.workId && latest(w)?.id === c.versionId)).map((c) => ({ p, c })))
        .sort((a, b) => b.c.createdAt - a.c.createdAt)
        .slice(0, 4),
    [projects]
  );

  return (
    <div className="lg min-h-full" dir={dir}>
      <div className="fixed inset-0">
        <Backdrop src={bg} id={cover?.id} tint={0.48} blur />
      </div>
      <div className="relative z-10 mx-auto max-w-[1360px] px-3 pb-16 pt-3 sm:px-6 sm:pt-5">
        <Pane as="header" className="flex items-center gap-2 rounded-full py-1.5 pe-1.5 ps-5">
          <Mark onClick={() => go('/')} />
          <div className="ms-auto flex items-center gap-1.5">
            <button type="button" onClick={openPalette} className="lg-btn lg-btn-plain hidden sm:inline-flex" aria-label={t('Search or run a command')}>
              <Search size={15} /> <span className="text-white/60">⌘K</span>
            </button>
            <span className="hidden md:block">
              <GlassLang />
            </span>
            <ThemeSwitch />
            <InstallButton compact />
            <GlassAccount />
            <button type="button" onClick={() => setCreating(true)} className="lg-btn lg-btn-primary">
              <Plus size={16} /> <span className="hidden sm:inline">{t('New project')}</span>
            </button>
          </div>
        </Pane>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: lgEase }}>
            <p className="lg-label lg-shadow-text">{t('Your projects')}</p>
            <h1 className="lg-shadow-text mt-2 text-[clamp(38px,5.4vw,72px)] font-extrabold leading-[0.98] tracking-[-0.045em]">
              {waiting.length ? t('{n} notes are waiting for you.', { n: waiting.length }) : t('Everything is answered.')}
            </h1>
          </motion.div>
          {waiting.length > 0 && (
            <Pane className="rounded-[26px] p-3" delay={0.1}>
              <p className="lg-label px-2 pb-1 pt-1">{t('Waiting for you')}</p>
              {waiting.map(({ p, c }) => (
                <button key={c.id} type="button" onClick={() => go(`/p/${p.id}?s=${p.works.find((w) => w.id === c.workId)?.approvedVersionId ? 'show' : 'review'}&i=${c.workId}&c=${c.id}`)} className="flex w-full items-start gap-3 rounded-[18px] p-2.5 text-start hover:bg-white/10">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--lg-accent)]" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-bold text-white/70">
                      {p.title} · {c.author} · {ago(c.createdAt)}
                    </span>
                    <span dir="auto" className="line-clamp-2 block text-start text-[14px] leading-[1.4]">{t(c.text)}</span>
                  </span>
                </button>
              ))}
            </Pane>
          )}
        </div>

        <section aria-label={t('Projects')} className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => (
            <ProjectCard key={p.id} p={p} i={i} />
          ))}
          <motion.button
            type="button"
            onClick={() => setCreating(true)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: lgEase, delay: 0.05 * projects.length }}
            className="lg-glass flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-[28px] border-dashed text-white/85 hover:bg-white/10"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full lg-soft">
              <Plus size={22} />
            </span>
            <span className="text-[16px] font-bold">{t('New project')}</span>
            <span className="text-[13px] text-white/70">{t('Start with a name. Drop files in later.')}</span>
          </motion.button>
        </section>

        <p className="mt-10 max-w-[720px] text-[13px] leading-[1.55] text-white/70">
          {cloudEnabled ? t('Local projects stay in this browser (IndexedDB). Projects moved to your studio sync to the server and work offline too.') : t('Everything here is stored in this browser (IndexedDB) and works offline. There is no account or server in this build, so there are no shared links or invites.')}
        </p>
        <Credits className="mt-8 border-t border-white/15 pt-6" />
      </div>
      <AnimatePresence>{creating && <NewProject onClose={() => setCreating(false)} />}</AnimatePresence>
    </div>
  );
}

function ProjectCard({ p, i }: { p: Project; i: number }) {
  const { t } = useI18n();
  const items = useMemo(() => itemsOf(p), [p]);
  const cover = assetById(p, p.coverAssetId) ?? p.assets.find((a) => !a.isReference && a.kind === 'image') ?? p.assets[0];
  const { url } = useAssetUrl(cover, 'thumb');
  const open = items.review.reduce((n, x) => n + (x.kind === 'work' ? x.open : 0), 0);
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: lgEase, delay: 0.05 * i }} className="lg-glass group relative overflow-hidden rounded-[28px]">
      <button type="button" onClick={() => go(`/p/${p.id}`)} className="block w-full text-start">
        <span className="relative block aspect-[16/10] overflow-hidden">
          {url ? <img src={url} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" /> : <span className="block h-full w-full bg-white/10" />}
          {open > 0 && <span className="absolute end-3 top-3 rounded-full bg-[var(--lg-accent)] px-2.5 py-1 text-[12px] font-extrabold text-[var(--lg-accent-ink)]">{t('{n} open', { n: open })}</span>}
        </span>
        <span className="block p-4">
          <span className="flex items-center gap-2">
            <span className="truncate text-[18px] font-extrabold tracking-[-0.02em]">{p.title}</span>
            {p.cloud ? <Cloud size={14} className="shrink-0 text-white/70" aria-label={t('Studio')} /> : <Lock size={13} className="shrink-0 text-white/70" aria-label={t('This browser only')} />}
          </span>
          <span className="mt-0.5 block text-[12.5px] text-white/70">{t('Updated {when}', { when: ago(p.updatedAt) })}</span>
          <span className="mt-3 grid grid-cols-4 gap-1.5" aria-label={t('Stages of a project')}>
            {STAGES.map((s) => {
              const n = items[s].filter((x) => x.kind !== 'case').length;
              return (
                <span key={s} className="block">
                  <span className={`block h-1.5 rounded-full ${n ? (s === 'review' ? 'bg-[var(--lg-accent)]' : 'bg-white') : 'bg-white/25'}`} />
                  <span className="mt-1 block truncate text-[11px] font-semibold text-white/75">
                    {t(STAGE_LABEL[s])} {n || ''}
                  </span>
                </span>
              );
            })}
          </span>
        </span>
      </button>
      {p.kind === 'demo' && (
        <button
          type="button"
          onClick={() => {
            ws.resetDemo(p.id);
            toast(t('Demo restored'));
          }}
          className="lg-glass lg-btn absolute start-3 top-3 min-h-[34px] px-3 text-[12px] opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
          title={t('Reset the demo to its original state')}
        >
          <RotateCcw size={13} /> {t('Reset')}
        </button>
      )}
    </motion.div>
  );
}

function NewProject({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const auth = useAuth();
  const studioId = useStudioId();
  const studio = auth.studios.find((s) => s.id === studioId);
  const [title, setTitle] = useState('');
  const [where, setWhere] = useState<'local' | 'studio'>(auth.session && studio ? 'studio' : 'local');
  const [busy, setBusy] = useState(false);
  const inp = useRef<HTMLInputElement>(null);
  useEffect(() => inp.current?.focus(), []);
  const create = async () => {
    setBusy(true);
    const id = ws.createProject(title);
    try {
      if (where === 'studio' && studioId) await moveToStudio(id, studioId);
    } catch {
      toast(t('Saved in this browser — the studio could not be reached. You can move it later.'), { tone: 'error' });
    }
    onClose();
    go(`/p/${id}?s=collect`);
  };
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <Pane strong className="w-full max-w-[460px] rounded-[28px] p-6" onClick={(e) => e.stopPropagation()}>
        <form
          role="dialog"
          aria-modal
          aria-label={t('New project')}
          onClick={(e) => e.stopPropagation()}
          onSubmit={(e) => (e.preventDefault(), create())}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
        >
          <div className="flex items-start justify-between">
            <h2 className="text-[26px] font-extrabold tracking-[-0.03em]">{t('New project')}</h2>
            <button type="button" onClick={onClose} aria-label={t('Close')} className="lg-btn lg-btn-plain lg-icon -me-2 -mt-1">
              <X size={18} />
            </button>
          </div>
          <label className="mt-5 block">
            <span className="lg-label">{t('Name')}</span>
            <input ref={inp} dir="auto" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('e.g. Halden — identity')} className="lg-input mt-1.5 text-[16px]" />
          </label>
          {auth.session && studio ? (
            <fieldset className="mt-4">
              <legend className="lg-label">{t('Where')}</legend>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(
                  [
                    ['studio', studio.name, t('Shared with the studio, synced')],
                    ['local', t('This browser'), t('Private, only on this device')],
                  ] as const
                ).map(([k, l, d]) => (
                  <label key={k} className={`cursor-pointer rounded-[16px] p-3 ${where === k ? 'bg-white/20 ring-1 ring-white' : 'lg-soft'}`}>
                    <input type="radio" name="where" className="sr-only" checked={where === k} onChange={() => setWhere(k)} />
                    <span className="block text-[14px] font-bold">{l}</span>
                    <span className="block text-[12px] text-white/75">{d}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <p className="mt-3 text-[13px] text-white/75">{t('Private to this browser. You can rename it any time.')}</p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="lg-btn lg-btn-plain">
              {t('Cancel')}
            </button>
            <button type="submit" disabled={busy} className="lg-btn lg-btn-primary disabled:opacity-60">
              {t('Create')} <ArrowRight size={16} className="rtl:-scale-x-100" />
            </button>
          </div>
        </form>
      </Pane>
    </motion.div>
  );
}

export { DEMO_ID };
