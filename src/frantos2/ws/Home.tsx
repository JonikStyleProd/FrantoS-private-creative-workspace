import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Cloud, FolderPlus, MessageSquare, Plus, Search, SquareCheck, Upload, X } from 'lucide-react';
import { Project } from './types';
import { assetOf, openComments, useWs, versionOf, ws } from './store';
import { go } from '../route';
import { AssetThumb, PrivateChip, SaveBadge, ease, toast } from './kit';
import { FilePick, upload } from './uploads';
import { ACCEPT } from './media';
import { DEMO_ID } from './seed';
import { Wordmark } from '../ui';
import { ago, tr as t } from '../i18n';
import { LangSwitch } from '../i18n/LangSwitch';
import { AccountButton, useStudioId } from '../cloud/Account';
import { cloudEnabled, useAuth } from '../cloud/client';
import { moveToStudio } from '../cloud/sync';

const STATUS = (s: Project['status']) => (s === 'wip' ? t('In progress') : s === 'review' ? t('In review') : t('Approved'));

function describeView(p: Project) {
  const v = p.lastView ?? '';
  const m = v.match(/\/review\/([^?]+)(?:\?(.*))?/);
  if (m) {
    const w = p.works.find((x) => x.id === m[1]);
    const q = new URLSearchParams(m[2] ?? '');
    const ver = q.get('v') ? versionOf(p, q.get('v')!)?.version : undefined;
    return `${t('Review')} · ${w?.title ?? ''}${ver ? ` v${ver.n}` : ''}${q.get('cmp') ? ` · ${t('comparing')}` : ''}`;
  }
  if (v.includes('/moodboard')) return t('Moodboard');
  if (v.includes('/materials')) return t('Materials');
  if (v.includes('/stories')) return t('Stories');
  if (v.includes('/case')) return t('Case page');
  return t('Overview');
}

export function Home() {
  const { state, status } = useWs();
  const [creating, setCreating] = useState(false);
  const [tag, setTag] = useState<string | null>(null);
  // something shared from another app (PWA share target) → a note on the last project's canvas
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

  const projects = [...state.projects].sort((a, b) => (b.lastOpenedAt ?? b.updatedAt) - (a.lastOpenedAt ?? a.updatedAt));
  const last = state.lastProjectId ? state.projects.find((p) => p.id === state.lastProjectId) : undefined;
  const demo = state.projects.find((p) => p.id === DEMO_ID);
  const tags = Array.from(new Set(state.projects.flatMap((p) => p.tags ?? [])));
  const shown = tag ? projects.filter((p) => p.tags?.includes(tag)) : projects;

  const waiting = state.projects
    .flatMap((p) => openComments(p).filter((c) => !c.isTask && c.author !== state.you).map((c) => ({ p, c })))
    .sort((a, b) => b.c.createdAt - a.c.createdAt)
    .slice(0, 6);
  const tasks = state.projects
    .flatMap((p) => p.comments.filter((c) => c.isTask && !c.resolved).map((c) => ({ p, c })))
    .sort((a, b) => b.c.createdAt - a.c.createdAt)
    .slice(0, 6);

  if (status === 'loading') return <div className="flex h-full items-center justify-center bg-[var(--paper)] text-[var(--ink-2)]">{t('Opening your workspace…')}</div>;

  return (
    <div className="f2-paper min-h-full">
      <header className="sticky top-0 z-30 border-b border-[var(--rule)] bg-[var(--paper)]/95 backdrop-blur">
        <div className="mx-auto flex h-[60px] max-w-[1280px] items-center justify-between gap-3 px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <a href="#/" aria-label="FrantoS">
              <Wordmark small />
            </a>
            <span className="hidden h-5 w-px bg-[var(--rule)] sm:block" />
            <span className="hidden text-[13px] font-semibold sm:block">{t('Workspace')}</span>
            <span className="hidden lg:block">
              <SaveBadge />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.dispatchEvent(new Event('frantos:palette'))} className="hidden h-9 items-center gap-2 rounded-full border border-[var(--rule)] px-3 text-[13px] text-[var(--ink-2)] hover:text-[var(--ink)] md:inline-flex" aria-label={t('Search')}>
              <Search size={14} /> {t('Search')} <kbd className="rounded border border-[var(--rule)] px-1 text-[10.5px]">⌘K</kbd>
            </button>
            <span className="hidden lg:block">
              <LangSwitch />
            </span>
            {!cloudEnabled && (
              <span className="hidden md:block">
                <PrivateChip />
              </span>
            )}
            <AccountButton />
            <CreateMenu last={last} onNew={() => setCreating(true)} />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1280px] gap-10 px-4 py-8 md:px-8 md:py-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-10">
          {last ? <ContinueCard p={last} /> : demo && <WelcomeCard demo={demo} onNew={() => setCreating(true)} />}

          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[13px] font-semibold">{t('Active work')}</h2>
              <span className="f2-mono text-[var(--ink-2)]">{t('{n} projects', { n: shown.length })}</span>
            </div>
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button onClick={() => setTag(null)} className="rounded-full border px-2.5 py-1 text-[12px]" style={{ borderColor: !tag ? 'var(--ink)' : 'var(--rule)', background: !tag ? 'var(--ink)' : 'transparent', color: !tag ? 'var(--paper)' : 'var(--ink-2)' }}>
                  {t('All')}
                </button>
                {tags.map((tg) => (
                  <button key={tg} onClick={() => setTag(tg === tag ? null : tg)} className="rounded-full border px-2.5 py-1 text-[12px]" style={{ borderColor: tag === tg ? 'var(--ink)' : 'var(--rule)', background: tag === tg ? 'var(--ink)' : 'transparent', color: tag === tg ? 'var(--paper)' : 'var(--ink-2)' }}>
                    #{tg}
                  </button>
                ))}
              </div>
            )}
            <ul className="mt-3 divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
              {shown.map((p) => (
                <ProjectRow key={p.id} p={p} />
              ))}
            </ul>
          </section>
        </div>

        <aside className="flex flex-col gap-8">
          <section>
            <h2 className="text-[13px] font-semibold">{t('Today')}</h2>
            <p className="mt-0.5 text-[12.5px] text-[var(--ink-2)]">{new Intl.DateTimeFormat(document.documentElement.lang || 'en', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p>
          </section>
          <section>
            <h3 className="f2-mono text-[var(--ink-2)]">{t('Waiting for your answer')}</h3>
            {waiting.length === 0 ? (
              <p className="mt-2 rounded-[8px] border border-dashed border-[var(--rule)] p-4 text-[13px] text-[var(--ink-2)]">{t('No one is waiting on you. New feedback on any version shows up here.')}</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {waiting.map(({ p, c }) => (
                  <NoteRow key={c.id} p={p} c={c} />
                ))}
              </ul>
            )}
          </section>
          {tasks.length > 0 && (
            <section>
              <h3 className="f2-mono flex items-center gap-1.5 text-[var(--ink-2)]">
                <SquareCheck size={12} /> {t('For the next version')}
              </h3>
              <ul className="mt-2 flex flex-col gap-1.5">
                {tasks.map(({ p, c }) => (
                  <li key={c.id}>
                    <a href={`#/p/${p.id}/review/${c.workId}?v=${c.versionId}&c=${c.id}`} className="flex gap-2 rounded-[6px] px-2 py-1.5 text-[13px] leading-snug hover:bg-black/[0.04]">
                      <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border border-[var(--ink)]" />
                      <span>
                        {c.text}
                        <span className="block text-[11.5px] text-[var(--ink-2)]">{p.title}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p className="text-[12px] leading-relaxed text-[var(--ink-2)]">
            {cloudEnabled ? t('Local projects stay in this browser (IndexedDB). Projects moved to your studio sync to the server and work offline too.') : t('Everything here is stored in this browser (IndexedDB) and works offline. There is no account or server in this build, so there are no shared links or invites.')}
          </p>
        </aside>
      </main>

      <AnimatePresence>{creating && <NewProject onClose={() => setCreating(false)} />}</AnimatePresence>
    </div>
  );
}

function NoteRow({ p, c }: { p: Project; c: Project['comments'][number] }) {
  const vv = versionOf(p, c.versionId);
  const a = vv ? assetOf(p, vv.version.assetId) : undefined;
  return (
    <li>
      <a href={`#/p/${p.id}/review/${c.workId}?v=${c.versionId}&c=${c.id}`} className="group flex gap-3 rounded-[8px] border border-[var(--rule)] bg-white/30 p-2.5 transition-colors hover:bg-white/60">
        <span className="relative h-[64px] w-[52px] shrink-0 overflow-hidden rounded-[2px] bg-[var(--graphite)]">
          <AssetThumb asset={a} className="h-full w-full" />
          {(c.pin || c.area) && (
            <span className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-[var(--signal)]" style={{ left: `${((c.pin?.x ?? c.area!.x) * 100).toFixed(1)}%`, top: `${((c.pin?.y ?? c.area!.y) * 100).toFixed(1)}%` }} />
          )}
        </span>
        <span className="min-w-0">
          <span className="line-clamp-2 text-[13px] leading-snug">{c.text}</span>
          <span className="f2-mono mt-1 block !text-[10px] text-[var(--ink-2)]">
            {p.title} · {vv?.work.title} v{vv?.version.n}
            {c.t != null ? ` · ${c.t.toFixed(1)}s` : ''}
          </span>
          <span className="mt-0.5 block text-[11.5px] text-[var(--ink-2)]">
            {c.author} · {ago(c.createdAt)}
          </span>
        </span>
      </a>
    </li>
  );
}

function ContinueCard({ p }: { p: Project }) {
  const cover = assetOf(p, p.coverAssetId);
  const open = openComments(p).length;
  return (
    <section>
      <p className="f2-mono text-[var(--ink-2)]">{t('Continue where you left off')}</p>
      <a href={`#${p.lastView ?? `/p/${p.id}`}`} className="group mt-3 grid grid-cols-[120px_minmax(0,1fr)] items-end gap-5 sm:grid-cols-[180px_minmax(0,1fr)]">
        <motion.span layoutId={`cover-${p.id}`} className="block aspect-[4/5] overflow-hidden rounded-[4px] bg-[var(--graphite)] shadow-[0_30px_50px_-30px_rgba(21,19,15,0.7)]" transition={{ type: 'spring', stiffness: 240, damping: 30 }}>
          <AssetThumb asset={cover} className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]" />
        </motion.span>
        <span className="min-w-0 pb-1">
          <span className="f2-display block text-[clamp(2.4rem,5vw,3.8rem)] leading-[0.95]">{p.title}</span>
          <span className="mt-3 block text-[14px] text-[var(--ink-2)]">
            {describeView(p)} · {ago(p.lastOpenedAt ?? p.updatedAt)}
          </span>
          <span className="mt-4 flex flex-wrap items-center gap-3">
            <span className="f2-btn f2-btn-signal !min-h-[42px]">
              {t('Continue')} <ArrowRight size={16} />
            </span>
            {open > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium">
                <MessageSquare size={14} /> {t('{n} open notes', { n: open })}
              </span>
            )}
          </span>
        </span>
      </a>
    </section>
  );
}

function WelcomeCard({ demo, onNew }: { demo: Project; onNew: () => void }) {
  const cover = assetOf(demo, demo.coverAssetId);
  return (
    <section>
      <p className="f2-mono text-[var(--ink-2)]">{t('Welcome to FrantoS')}</p>
      <h1 className="f2-display mt-3 max-w-[16ch] text-[clamp(2.6rem,5.6vw,4.4rem)] leading-[0.95]">{t('Start inside a real project, or with a blank one.')}</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <a href={`#/p/${demo.id}`} className="group flex gap-4 rounded-[10px] border border-[var(--rule)] bg-white/30 p-3 hover:bg-white/60">
          <motion.span layoutId={`cover-${demo.id}`} className="block aspect-[4/5] w-[96px] shrink-0 overflow-hidden rounded-[3px] bg-[var(--graphite)]">
            <AssetThumb asset={cover} className="h-full w-full" />
          </motion.span>
          <span className="flex flex-col justify-between py-1">
            <span>
              <span className="f2-mono block text-[var(--ink-2)]">{t('Demo project')}</span>
              <span className="f2-display mt-1 block text-[28px] leading-none">{demo.title}</span>
              <span className="mt-2 block text-[13px] leading-snug text-[var(--ink-2)]">{t('Renders, versions, notes and a Story — ready to explore.')}</span>
            </span>
            <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold">
              {t('Open')} <ArrowRight size={14} />
            </span>
          </span>
        </a>
        <button onClick={onNew} className="flex flex-col justify-between rounded-[10px] border-2 border-dashed border-[var(--rule)] p-4 text-start hover:border-[var(--ink)]">
          <FolderPlus size={22} />
          <span>
            <span className="f2-display block text-[28px] leading-none">{t('Empty project')}</span>
            <span className="mt-2 block text-[13px] leading-snug text-[var(--ink-2)]">{t('Name it, drop your first file, pin references. It saves as you go.')}</span>
          </span>
        </button>
      </div>
    </section>
  );
}

function ProjectRow({ p }: { p: Project }) {
  const cover = assetOf(p, p.coverAssetId);
  const open = openComments(p);
  const first = [...open].sort((a, b) => b.createdAt - a.createdAt)[0];
  const versions = p.works.reduce((s, w) => s + w.versions.length, 0);
  return (
    <li className="flex items-center gap-4 py-3">
      <a href={`#/p/${p.id}`} className="flex min-w-0 flex-1 items-center gap-4">
        <span className="h-[60px] w-[48px] shrink-0 overflow-hidden rounded-[2px] bg-[var(--graphite)]">
          <AssetThumb asset={cover} className="h-full w-full" />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 truncate text-[14.5px] font-semibold">
            {p.title}
            {p.cloud && <Cloud size={13} className="shrink-0 text-[var(--ink-2)]" aria-label={t('In studio')} />}
          </span>
          <span className="block text-[12.5px] text-[var(--ink-2)]">
            {STATUS(p.status)} · {t('{n} files', { n: p.assets.length })} · {t('{n} versions', { n: versions })} · {ago(p.updatedAt)}
          </span>
        </span>
      </a>
      {first ? (
        <a href={`#/p/${p.id}/review/${first.workId}?v=${first.versionId}&c=${first.id}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--signal)] px-2.5 py-1 text-[12px] font-bold text-[var(--signal-ink)]" title={t('Go to the latest open note')}>
          <MessageSquare size={12} /> {open.length}
        </a>
      ) : (
        <span className="shrink-0 text-[12px] text-[var(--ink-2)]">—</span>
      )}
    </li>
  );
}

function CreateMenu({ last, onNew }: { last?: Project; onNew: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="f2-btn f2-btn-signal !min-h-[40px] !px-4 !text-[14px]">
        <Plus size={16} /> {t('Create')}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }} className="absolute end-0 top-12 z-40 w-[260px] overflow-hidden rounded-[10px] border border-[var(--rule)] bg-[#f7f2e9] p-1.5 shadow-[0_24px_50px_-24px_rgba(0,0,0,0.45)]" role="menu">
            <button role="menuitem" onClick={() => (setOpen(false), onNew())} className="flex w-full items-center gap-2.5 rounded-[6px] px-3 py-2.5 text-start text-[13.5px] font-medium hover:bg-black/5">
              <FolderPlus size={16} /> {t('New project')}
            </button>
            {last && (
              <FilePick
                accept={ACCEPT}
                onFiles={(f) => {
                  setOpen(false);
                  upload(f, last.id, { isReference: false, then: () => toast(t('Added to {name}', { name: last.title })) });
                }}
                className="flex w-full items-center gap-2.5 rounded-[6px] px-3 py-2.5 text-start text-[13.5px] font-medium hover:bg-black/5"
              >
                <Upload size={16} />
                <span className="min-w-0 truncate">{t('Add files to {name}', { name: last.title })}</span>
              </FilePick>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NewProject({ onClose }: { onClose: () => void }) {
  const auth = useAuth();
  const studioId = useStudioId();
  const studio = auth.studios.find((s) => s.id === studioId);
  const [title, setTitle] = useState('');
  const [where, setWhere] = useState<'local' | 'studio'>(auth.session && studio ? 'studio' : 'local');
  const [busy, setBusy] = useState(false);
  const inp = useRef<HTMLInputElement>(null);
  const create = async () => {
    setBusy(true);
    const id = ws.createProject(title);
    try {
      if (where === 'studio' && studioId) await moveToStudio(id, studioId);
    } catch {
      toast(t('Saved in this browser — the studio could not be reached. You can move it later.'), { tone: 'error' });
    }
    onClose();
    go(`/p/${id}`);
  };
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.form
        role="dialog"
        aria-modal
        aria-label={t('New project')}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
        initial={{ y: 16, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 8, opacity: 0 }}
        transition={{ duration: 0.22, ease }}
        className="w-full max-w-[460px] rounded-[12px] bg-[var(--paper)] p-6 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.5)]"
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="flex items-start justify-between">
          <h2 className="f2-display text-[32px] leading-none">{t('New project')}</h2>
          <button type="button" onClick={onClose} aria-label={t('Close')} className="rounded-full p-1.5 hover:bg-black/5">
            <X size={16} />
          </button>
        </div>
        <label className="mt-5 block">
          <span className="f2-mono text-[var(--ink-2)]">{t('Name')}</span>
          <input ref={inp} autoFocus dir="auto" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('e.g. Halden — identity')} className="mt-1.5 w-full rounded-[6px] border border-[var(--rule)] bg-white/50 px-3 py-2.5 text-[16px] outline-none focus:border-[var(--ink)]" />
        </label>
        {auth.session && studio ? (
          <fieldset className="mt-4">
            <legend className="f2-mono text-[var(--ink-2)]">{t('Where')}</legend>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(
                [
                  ['studio', studio.name, t('Shared with the studio, synced')],
                  ['local', t('This browser'), t('Private, only on this device')],
                ] as const
              ).map(([k, l, d]) => (
                <label key={k} className="cursor-pointer rounded-[8px] border p-3" style={{ borderColor: where === k ? 'var(--ink)' : 'var(--rule)' }}>
                  <input type="radio" name="where" className="sr-only" checked={where === k} onChange={() => setWhere(k)} />
                  <span className="block text-[13.5px] font-semibold">{l}</span>
                  <span className="block text-[12px] text-[var(--ink-2)]">{d}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <p className="mt-3 text-[12.5px] text-[var(--ink-2)]">{t('Private to this browser. You can rename it any time.')}</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-[14px] font-medium hover:bg-black/5">
            {t('Cancel')}
          </button>
          <button type="submit" disabled={busy} className="f2-btn f2-btn-signal !min-h-[42px] disabled:opacity-60">
            {busy ? t('Creating…') : t('Create project')}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
