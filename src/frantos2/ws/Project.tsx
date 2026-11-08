import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookImage,
  Check,
  Circle,
  Grid2x2,
  ImagePlus,
  MessageSquare,
  Orbit as OrbitIcon,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Project as P, Asset } from './types';
import { assetOf, openComments, useProject, versionOf, workOfAsset, ws } from './store';
import { ProjectTab, go } from '../route';
import { AssetThumb, PrivateChip, SaveBadge, ago, ease, toast, useMedia } from './kit';
import { Inspector, Act } from './Inspector';
import { Orbit } from './Orbit';
import { FilePick, upload, useDropZone } from './uploads';
import { ACCEPT } from './media';
import { Review } from './Review';
import { Wordmark } from '../ui';

const TABS: { id: ProjectTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'materials', label: 'Materials' },
  { id: 'moodboard', label: 'Moodboard' },
  { id: 'review', label: 'Review' },
  { id: 'stories', label: 'Stories' },
];

export function ProjectPage({ id, tab, sub, q }: { id: string; tab: ProjectTab; sub?: string; q: URLSearchParams }) {
  const { project: p, loading } = useProject(id);

  useEffect(() => {
    if (p) ws.visit(p.id, window.location.hash.slice(1));
  }, [p?.id, tab, sub, q.toString()]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="flex h-full items-center justify-center bg-[var(--paper)] text-[var(--ink-2)]">Opening project…</div>;
  if (!p)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[var(--paper)] px-6 text-center">
        <p className="f2-display text-[40px]">This project isn't here.</p>
        <p className="max-w-[28rem] text-[var(--ink-2)]">Projects live in the browser where they were created. It may have been deleted, or this link was opened on another device.</p>
        <button onClick={() => go('/app')} className="f2-btn f2-btn-signal">
          Back to workspace
        </button>
      </div>
    );

  return (
    <div className="flex min-h-full flex-col bg-[var(--paper)] lg:h-full lg:min-h-0">
      <ProjectHeader p={p} tab={tab} />
      <div className="flex min-h-0 flex-1 flex-col">
        {tab === 'overview' && <Overview p={p} q={q} />}
        {tab === 'materials' && <Materials p={p} q={q} />}
        {tab === 'moodboard' && <Moodboard p={p} />}
        {tab === 'review' && <Review p={p} workId={sub} q={q} />}
        {tab === 'stories' && <Stories p={p} />}
      </div>
    </div>
  );
}

/* ───────────────────────── header ───────────────────────── */

function ProjectHeader({ p, tab }: { p: P; tab: ProjectTab }) {
  const [title, setTitle] = useState(p.title);
  useEffect(() => setTitle(p.title), [p.title]);
  const open = openComments(p).length;
  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-[var(--rule)] bg-[var(--paper)]">
      <div className="flex h-[58px] items-center justify-between gap-3 px-3 md:px-5">
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <a href="#/app" className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-2 hover:bg-black/5" aria-label="Back to workspace">
            <ArrowLeft size={16} className="text-[var(--ink-2)]" />
            <span className="hidden sm:inline">
              <Wordmark small />
            </span>
          </a>
          <span className="hidden h-6 w-px bg-[var(--rule)] sm:block" />
          <div className="min-w-0">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() !== p.title && ws.renameProject(p.id, title)}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              aria-label="Project title"
              className="f2-display w-full min-w-0 max-w-[46vw] truncate rounded bg-transparent text-[20px] leading-tight outline-none focus:bg-black/[0.04] md:max-w-[360px] md:text-[23px]"
            />
            <div className="flex items-center gap-2">
              <SaveBadge />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden md:inline-flex">
            <PrivateChip />
          </span>
          {p.kind === 'demo' && (
            <button
              onClick={() => {
                ws.resetDemo();
                toast('Demo project reset', { undo: true });
              }}
              className="hidden h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-[var(--ink-2)] hover:bg-black/5 hover:text-[var(--ink)] lg:inline-flex"
              title="Restore FORM / 01 to its original state. Your own projects are not touched."
            >
              <RotateCcw size={14} /> Reset demo
            </button>
          )}
          <button onClick={() => go(`/p/${p.id}/present/0`)} disabled={!p.presentation.length} className="f2-btn f2-btn-signal !min-h-[40px] !px-4 !text-[14px] disabled:opacity-40" title={p.presentation.length ? 'Present' : 'Add works to the presentation first'}>
            <Play size={14} fill="currentColor" /> <span className="hidden sm:inline">Present</span>
          </button>
        </div>
      </div>
      <nav className="f2-noscrollbar flex gap-1 overflow-x-auto px-2 md:px-4" role="tablist" aria-label="Project">
        {TABS.map((t) => (
          <a
            key={t.id}
            href={`#/p/${p.id}${t.id === 'overview' ? '' : `/${t.id}`}`}
            role="tab"
            aria-selected={tab === t.id}
            className="relative shrink-0 px-3 py-2.5 text-[13.5px] font-semibold"
            style={{ color: tab === t.id ? 'var(--ink)' : 'var(--ink-2)' }}
          >
            {t.label}
            {t.id === 'review' && open > 0 && <span className="ml-1.5 rounded-full bg-[var(--signal)] px-1.5 py-[1px] text-[10.5px] font-bold text-[var(--signal-ink)]">{open}</span>}
            {t.id === 'materials' && <span className="ml-1 text-[11px] font-medium text-[var(--ink-2)]">{p.assets.length}</span>}
            {tab === t.id && <motion.span layoutId="ptab" className="absolute inset-x-2 bottom-0 h-[2px] bg-[var(--ink)]" transition={{ duration: 0.25, ease }} />}
          </a>
        ))}
      </nav>
    </header>
  );
}

/* ───────────────────────── overview ───────────────────────── */

function Overview({ p, q }: { p: P; q: URLSearchParams }) {
  const cover = assetOf(p, p.coverAssetId);
  const [view, setView] = useState<'orbit' | 'grid'>(() => (localStorage.getItem('frantos-overview-view') as 'orbit' | 'grid') || (window.innerWidth < 768 ? 'grid' : 'orbit'));
  const [sel, setSel] = useState<string | undefined>(q.get('a') ?? undefined);
  const selected = assetOf(p, sel);
  const open = openComments(p);
  const isDesktop = useMedia('(min-width: 1024px)');
  useEffect(() => localStorage.setItem('frantos-overview-view', view), [view]);

  if (!p.assets.length) return <EmptyProject p={p} />;

  const items = p.assets.slice(0, 14);
  const versions = p.works.reduce((s, w) => s + w.versions.length, 0);

  return (
    <div className="grid flex-1 gap-0 lg:min-h-0 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)_340px]">
      {/* the work */}
      <section className="border-b border-[var(--rule)] p-5 lg:overflow-y-auto lg:border-b-0 lg:border-r md:p-6">
        <motion.div layoutId={`cover-${p.id}`} className="relative aspect-[4/5] overflow-hidden rounded-[4px] bg-[var(--graphite)] shadow-[0_30px_60px_-30px_rgba(21,19,15,0.6)]" transition={{ type: 'spring', stiffness: 240, damping: 30 }}>
          {cover ? <AssetThumb asset={cover} size="full" className="h-full w-full" alt={cover.title} /> : null}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4, ease }}>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {(['wip', 'review', 'approved'] as const).map((s) => (
              <button
                key={s}
                onClick={() => ws.setStatus(p.id, s)}
                aria-pressed={p.status === s}
                className="rounded-full border px-2.5 py-1 text-[12px] font-medium"
                style={{ borderColor: p.status === s ? 'var(--ink)' : 'var(--rule)', background: p.status === s ? 'var(--ink)' : 'transparent', color: p.status === s ? 'var(--paper)' : 'var(--ink-2)' }}
              >
                {s === 'wip' ? 'In progress' : s === 'review' ? 'In review' : 'Approved'}
              </button>
            ))}
          </div>
          {p.brief && <p className="mt-4 text-[14.5px] leading-relaxed text-[var(--ink-2)]">{p.brief}</p>}
          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-[var(--rule)] pt-4">
            {[
              ['Materials', p.assets.length],
              ['Versions', versions],
              ['Open notes', open.length],
            ].map(([k, v]) => (
              <div key={k as string}>
                <dt className="f2-mono text-[var(--ink-2)]">{k}</dt>
                <dd className="f2-display mt-1 text-[30px] leading-none">{v}</dd>
              </div>
            ))}
          </dl>
        </motion.div>
      </section>

      {/* what it's made of */}
      <section className="flex min-h-[520px] flex-col lg:min-h-0">
        <div className="flex items-center justify-between px-5 pt-4 md:px-6">
          <h2 className="text-[13px] font-semibold">Related materials</h2>
          <div className="flex rounded-full border border-[var(--rule)] p-0.5" role="radiogroup" aria-label="View">
            {(['orbit', 'grid'] as const).map((v) => (
              <button key={v} role="radio" aria-checked={view === v} onClick={() => setView(v)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium" style={{ background: view === v ? 'var(--ink)' : 'transparent', color: view === v ? 'var(--paper)' : 'var(--ink-2)' }}>
                {v === 'orbit' ? <OrbitIcon size={13} /> : <Grid2x2 size={13} />} {v === 'orbit' ? 'Orbit' : 'Grid'}
              </button>
            ))}
          </div>
        </div>
        <div className="relative min-h-0 flex-1">
          {view === 'orbit' ? (
            <Orbit items={items} selected={sel ?? items[0]?.id} onSelect={setSel} />
          ) : (
            <div className="grid grid-cols-3 gap-4 p-5 sm:grid-cols-4 md:p-6 lg:overflow-y-auto xl:grid-cols-5">
              {p.assets.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03, duration: 0.3, ease }}>
                  <Tile a={a} p={p} on={sel === a.id} onClick={() => setSel(a.id)} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* attention + selected */}
      <aside className="border-t border-[var(--rule)] p-5 lg:overflow-y-auto lg:border-l lg:border-t-0">
        {selected && isDesktop ? (
          <Inspector p={p} asset={selected} onClose={() => setSel(undefined)} />
        ) : (
          <Attention p={p} />
        )}
        {selected && !isDesktop && (
          <Sheet onClose={() => setSel(undefined)}>
            <Inspector p={p} asset={selected} compact onClose={() => setSel(undefined)} />
          </Sheet>
        )}
        {selected && isDesktop && (
          <div className="mt-6 border-t border-[var(--rule)] pt-5">
            <Attention p={p} />
          </div>
        )}
      </aside>
    </div>
  );
}

function Attention({ p }: { p: P }) {
  const open = openComments(p).sort((a, b) => b.createdAt - a.createdAt);
  return (
    <div>
      <h2 className="text-[13px] font-semibold">Needs attention</h2>
      {open.length === 0 ? (
        <p className="mt-2 text-[13px] text-[var(--ink-2)]">No open notes. Upload a version in Review to ask for feedback.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {open.map((c) => {
            const vv = versionOf(p, c.versionId);
            return (
              <li key={c.id}>
                <a href={`#/p/${p.id}/review/${c.workId}?v=${c.versionId}&c=${c.id}`} className="flex gap-3 rounded-[6px] border border-[var(--rule)] p-2.5 hover:bg-black/[0.03]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full rounded-bl-[3px] bg-[var(--signal)] text-[10px] font-bold text-[var(--signal-ink)]">
                    {c.t != null ? '▶' : '•'}
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-[13px] leading-snug">{c.text}</span>
                    <span className="f2-mono mt-1 block !text-[10px] text-[var(--ink-2)]">
                      {vv?.work.title} · v{vv?.version.n}
                      {c.t != null ? ` · ${c.t.toFixed(1)}s` : ''} · {ago(c.createdAt)}
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function Tile({ a, p, on, onClick }: { a: Asset; p: P; on?: boolean; onClick: () => void }) {
  const wv = workOfAsset(p, a.id);
  const open = wv ? p.comments.filter((c) => c.versionId === wv.version.id && !c.resolved).length : 0;
  return (
    <button onClick={onClick} aria-pressed={on} className="group block w-full text-left">
      <span className="relative block aspect-[4/5]">
        <span className="absolute inset-0 overflow-hidden rounded-[3px] bg-[var(--graphite)]">
          <AssetThumb asset={a} className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]" alt={a.title} />
        </span>
        {wv && (
          <span className="absolute left-1.5 top-1.5 rounded-[3px] bg-[var(--ink)] px-1.5 py-[2px] text-[10px] font-semibold text-[var(--paper)]">
            v{wv.version.n}
            {wv.work.approvedVersionId === wv.version.id ? ' ✓' : ''}
          </span>
        )}
        {open > 0 && <span className="absolute right-1.5 top-1.5 rounded-full bg-[var(--signal)] px-1.5 py-[1px] text-[10px] font-bold text-[var(--signal-ink)]">{open}</span>}
        {a.kind === 'video' && <span className="f2-mono absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1 !text-[9px] text-white">Motion</span>}
        {on && <motion.span layoutId="tile-sel" className="absolute -inset-[4px] rounded-[5px] border-2 border-[var(--signal)]" transition={{ duration: 0.2 }} />}
      </span>
      <span className="mt-1.5 block truncate text-[12.5px] font-medium">{a.title}</span>
      <span className="f2-mono block !text-[9.5px] text-[var(--ink-2)]">{a.isReference ? 'Reference' : wv ? wv.work.title : a.kind === 'video' ? 'Motion' : 'Work file'}</span>
    </button>
  );
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/30" onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal
        className="f2-scroll max-h-[86dvh] w-full overflow-y-auto rounded-t-[14px] bg-[var(--paper)] p-5 pb-[max(20px,env(safe-area-inset-bottom))]"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3, ease }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex justify-between">
          <span className="mx-auto h-1 w-10 rounded-full bg-black/15" />
          <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-full p-2 hover:bg-black/5">
            <X size={16} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function EmptyProject({ p }: { p: P }) {
  const drop = useDropZone((f) => upload(f, p.id, { isReference: false, then: () => toast('Added to materials') }));
  return (
    <div className="flex flex-1 items-center justify-center p-6" {...drop.props}>
      <div className={`w-full max-w-[640px] rounded-[10px] border-2 border-dashed p-10 text-center transition-colors ${drop.over ? 'border-[var(--signal)] bg-[rgba(255,75,43,0.05)]' : 'border-[var(--rule)]'}`}>
        <p className="f2-mono text-[var(--ink-2)]">Empty project</p>
        <h2 className="f2-display mt-3 text-[40px] leading-none">Start with one file.</h2>
        <p className="mx-auto mt-3 max-w-[30rem] text-[15px] text-[var(--ink-2)]">Drop a render, a frame of motion or a reference. Works get versions and review; references go to the moodboard.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <FilePick accept={ACCEPT} onFiles={(f) => upload(f, p.id, { isReference: false, then: () => toast('Work added') })} className="f2-btn f2-btn-signal">
            <Upload size={16} /> Add work
          </FilePick>
          <FilePick accept={ACCEPT} onFiles={(f) => upload(f, p.id, { isReference: true, then: () => toast('Reference added') })} className="f2-btn f2-btn-ghost">
            <ImagePlus size={16} /> Add references
          </FilePick>
        </div>
        <p className="mt-5 text-[12px] text-[var(--ink-2)]">Files stay in this browser (IndexedDB). Images up to 40 MB, video up to 250 MB.</p>
      </div>
    </div>
  );
}

/* ───────────────────────── materials ───────────────────────── */

function Materials({ p, q }: { p: P; q: URLSearchParams }) {
  const [filter, setFilter] = useState<'all' | 'works' | 'refs'>('all');
  const [sel, setSel] = useState<string | undefined>(q.get('a') ?? undefined);
  const isDesktop = useMedia('(min-width: 1024px)');
  const drop = useDropZone((f) => upload(f, p.id, { isReference: filter === 'refs', then: (a) => setSel(a.id) }));
  const list = p.assets.filter((a) => (filter === 'all' ? true : filter === 'refs' ? a.isReference : !a.isReference));
  const selected = assetOf(p, sel);

  return (
    <div className="grid flex-1 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_360px]" {...drop.props}>
      <section className="relative flex flex-col lg:min-h-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 md:px-6">
          <div className="flex gap-1" role="radiogroup" aria-label="Filter">
            {(
              [
                ['all', `All ${p.assets.length}`],
                ['works', `Works ${p.assets.filter((a) => !a.isReference).length}`],
                ['refs', `References ${p.assets.filter((a) => a.isReference).length}`],
              ] as const
            ).map(([k, l]) => (
              <button key={k} role="radio" aria-checked={filter === k} onClick={() => setFilter(k)} className="rounded-full px-3 py-1.5 text-[13px] font-medium" style={{ background: filter === k ? 'var(--ink)' : 'transparent', color: filter === k ? 'var(--paper)' : 'var(--ink-2)' }}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <FilePick accept={ACCEPT} onFiles={(f) => upload(f, p.id, { isReference: true, then: (a) => setSel(a.id) })} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--rule)] px-3 text-[13px] font-medium hover:bg-black/[0.04]">
              <ImagePlus size={14} /> References
            </FilePick>
            <FilePick accept={ACCEPT} onFiles={(f) => upload(f, p.id, { isReference: false, then: (a) => setSel(a.id) })} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--ink)] px-3.5 text-[13px] font-semibold text-[var(--paper)]">
              <Upload size={14} /> Add work
            </FilePick>
          </div>
        </div>
        {list.length === 0 ? (
          <div className="m-6 rounded-[10px] border-2 border-dashed border-[var(--rule)] p-10 text-center text-[var(--ink-2)]">
            Nothing here yet. Drop files anywhere on this page.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-x-4 gap-y-5 p-5 sm:grid-cols-4 md:p-6 lg:overflow-y-auto xl:grid-cols-6">
            {list.map((a) => (
              <Tile key={a.id} a={a} p={p} on={sel === a.id} onClick={() => setSel(a.id)} />
            ))}
          </div>
        )}
        <AnimatePresence>
          {drop.over && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-3 flex items-center justify-center rounded-[10px] border-2 border-dashed border-[var(--signal)] bg-[rgba(238,232,221,0.85)]">
              <p className="f2-display text-[34px]">Drop to add {filter === 'refs' ? 'references' : 'work'}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      {isDesktop ? (
        <aside className="border-l border-[var(--rule)] p-5 lg:overflow-y-auto">
          {selected ? <Inspector p={p} asset={selected} onClose={() => setSel(undefined)} /> : <p className="text-[13px] leading-relaxed text-[var(--ink-2)]">Select a file to see its tools. A render opens versions and comments; a reference shows its source, your note and “Add to moodboard”.</p>}
        </aside>
      ) : (
        selected && (
          <Sheet onClose={() => setSel(undefined)}>
            <Inspector p={p} asset={selected} compact onClose={() => setSel(undefined)} />
          </Sheet>
        )
      )}
    </div>
  );
}

/* ───────────────────────── moodboard ───────────────────────── */

function Moodboard({ p }: { p: P }) {
  const board = useRef<HTMLDivElement>(null);
  const [picker, setPicker] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const drag = useRef<{ id: string; sx: number; sy: number; x: number; y: number; moved: boolean } | null>(null);
  const [live, setLive] = useState<{ id: string; x: number; y: number } | null>(null);
  const items = [...p.moodboard].sort((a, b) => a.z - b.z);
  const available = p.assets.filter((a) => !p.moodboard.some((m) => m.assetId === a.id));

  const commitMove = () => {
    const d = drag.current;
    if (d && live && d.moved) ws.moveMood(p.id, d.id, { x: live.x, y: live.y }, 'Moved on moodboard');
    drag.current = null;
    setLive(null);
  };

  return (
    <div className="flex flex-1 flex-col lg:min-h-0">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 md:px-6">
        <p className="text-[13px] text-[var(--ink-2)]">
          {p.moodboard.length ? 'Drag to arrange. Select a card and use arrow keys to nudge, Delete to remove.' : 'Arrange references next to the work they shape.'}
        </p>
        <div className="flex shrink-0 gap-2">
          <FilePick accept={ACCEPT} onFiles={(f) => upload(f, p.id, { isReference: true, then: (a) => ws.addToMoodboard(p.id, a.id) })} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--rule)] px-3 text-[13px] font-medium hover:bg-black/[0.04]">
            <Upload size={14} /> <span className="hidden sm:inline">Upload</span>
          </FilePick>
          <button onClick={() => setPicker(true)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--ink)] px-3.5 text-[13px] font-semibold text-[var(--paper)]">
            <Plus size={14} /> From materials
          </button>
        </div>
      </div>
      <div className="relative flex-1 p-4 md:p-6 lg:min-h-0">
        <div
          ref={board}
          className="relative mx-auto w-full overflow-hidden rounded-[8px] bg-[var(--paper-2)] shadow-[inset_0_0_0_1px_var(--rule)]"
          style={{ aspectRatio: '16/10', maxHeight: '100%', backgroundImage: 'radial-gradient(rgba(21,19,15,0.12) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || !board.current) return;
            const r = board.current.getBoundingClientRect();
            const dx = (e.clientX - d.sx) / r.width;
            const dy = (e.clientY - d.sy) / r.height;
            if (Math.abs(dx) + Math.abs(dy) > 0.004) d.moved = true;
            setLive({ id: d.id, x: Math.min(0.95, Math.max(-0.05, d.x + dx)), y: Math.min(0.92, Math.max(-0.05, d.y + dy)) });
          }}
          onPointerUp={commitMove}
          onPointerCancel={commitMove}
          onPointerDown={(e) => e.target === e.currentTarget && setFocus(null)}
        >
          {items.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
              <p className="f2-display text-[32px]">An empty wall.</p>
              <p className="max-w-[24rem] text-[14px] text-[var(--ink-2)]">Pin references from Materials or upload new ones. Positions are saved as you go.</p>
              <button onClick={() => setPicker(true)} className="f2-btn f2-btn-ghost !min-h-[40px]">
                <Plus size={15} /> Add from materials
              </button>
            </div>
          )}
          {items.map((m) => {
            const a = assetOf(p, m.assetId);
            if (!a) return null;
            const pos = live?.id === m.id ? live : m;
            const isF = focus === m.id;
            return (
              <motion.div
                key={m.id}
                role="button"
                tabIndex={0}
                aria-label={`${a.title} on moodboard`}
                className="absolute cursor-grab touch-none select-none active:cursor-grabbing"
                style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, width: `${m.w * 100}%`, zIndex: m.z, rotate: m.rot }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: live?.id === m.id ? 1.03 : 1 }}
                transition={{ duration: 0.25, ease }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  (e.currentTarget.parentElement as HTMLElement).setPointerCapture(e.pointerId);
                  drag.current = { id: m.id, sx: e.clientX, sy: e.clientY, x: m.x, y: m.y, moved: false };
                  setFocus(m.id);
                  ws.bringToFront(p.id, m.id);
                }}
                onKeyDown={(e) => {
                  const step = e.shiftKey ? 0.05 : 0.01;
                  const map: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
                  if (map[e.key]) {
                    e.preventDefault();
                    ws.moveMood(p.id, m.id, { x: m.x + map[e.key][0], y: m.y + map[e.key][1] });
                  }
                  if (e.key === 'Delete' || e.key === 'Backspace') {
                    ws.removeFromMoodboard(p.id, m.id);
                    toast(`Removed “${a.title}” from moodboard`, { undo: true });
                  }
                }}
                onFocus={() => setFocus(m.id)}
              >
                <div className="overflow-hidden rounded-[2px] bg-white p-[5%] shadow-[0_14px_28px_-14px_rgba(21,19,15,0.55)]" style={{ outline: isF ? '2px solid var(--signal)' : 'none', outlineOffset: 3 }}>
                  <div style={{ aspectRatio: `${a.w}/${a.h}` }} className="overflow-hidden">
                    <AssetThumb asset={a} className="h-full w-full" alt={a.title} />
                  </div>
                  <p className="mt-[4%] truncate text-[clamp(8px,0.8vw,11px)] font-medium">{a.title}</p>
                </div>
                {isF && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      ws.removeFromMoodboard(p.id, m.id);
                      toast(`Removed “${a.title}” from moodboard`, { undo: true });
                    }}
                    aria-label={`Remove ${a.title} from moodboard`}
                    className="absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ink)] text-[var(--paper)] shadow"
                  >
                    <X size={13} />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
      <AnimatePresence>
        {picker && (
          <Sheet onClose={() => setPicker(false)}>
            <h2 className="f2-display text-[28px]">Add to moodboard</h2>
            {available.length === 0 ? (
              <p className="mt-3 text-[14px] text-[var(--ink-2)]">Every material is already on the board. Upload new references to add more.</p>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {available.map((a) => (
                  <Tile
                    key={a.id}
                    a={a}
                    p={p}
                    onClick={() => {
                      ws.addToMoodboard(p.id, a.id);
                      toast(`“${a.title}” pinned`);
                    }}
                  />
                ))}
              </div>
            )}
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────── stories ───────────────────────── */

function Stories({ p }: { p: P }) {
  const approved = p.works.filter((w) => w.approvedVersionId).map((w) => ({ w, v: w.versions.find((v) => v.id === w.approvedVersionId)! }));
  const candidates = approved.filter(({ v }) => !p.story.some((s) => s.assetId === v.assetId));
  return (
    <div className="mx-auto w-full max-w-[1100px] flex-1 p-5 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="f2-mono text-[var(--ink-2)]">Stories</p>
          <h2 className="f2-display mt-2 text-[38px] leading-none">The process, frame by frame.</h2>
          <p className="mt-2 max-w-[34rem] text-[14px] text-[var(--ink-2)]">A Story is built from files already in the project — no re-uploading. Approved versions are suggested first.</p>
        </div>
        <button onClick={() => go(`/p/${p.id}/stories/play/0`)} disabled={!p.story.length} className="f2-btn f2-btn-signal disabled:opacity-40">
          <Play size={15} fill="currentColor" /> Play story
        </button>
      </div>

      {candidates.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2 rounded-[8px] border border-[var(--rule)] p-3">
          <span className="f2-mono mr-1 text-[var(--ink-2)]">Approved, not in story</span>
          {candidates.map(({ w, v }) => (
            <Act key={v.id} onClick={() => ws.addToStory(p.id, v.assetId)} icon={<Plus size={13} />}>
              {w.title} v{v.n}
            </Act>
          ))}
        </div>
      )}

      {p.story.length === 0 ? (
        <div className="mt-8 rounded-[10px] border-2 border-dashed border-[var(--rule)] p-10 text-center text-[var(--ink-2)]">
          No frames yet. Approve a version in Review, or use “Add to Story” on any material.
        </div>
      ) : (
        <ol className="mt-8 grid gap-3">
          {p.story.map((s, i) => {
            const a = assetOf(p, s.assetId);
            return (
              <motion.li layout key={s.id} transition={{ duration: 0.3, ease }} className="flex items-center gap-4 rounded-[8px] border border-[var(--rule)] bg-white/30 p-3">
                <span className="w-6 text-right text-[13px] font-semibold tabular-nums text-[var(--ink-2)]">{String(i + 1).padStart(2, '0')}</span>
                <span className="h-[84px] w-[68px] shrink-0 overflow-hidden rounded-[3px] bg-[var(--graphite)]">
                  <AssetThumb asset={a} className="h-full w-full" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{a?.title}</p>
                  <StoryCaption value={s.caption ?? ''} onSave={(v) => ws.captionStory(p.id, s.id, v)} />
                </div>
                <div className="flex shrink-0 items-center">
                  <button onClick={() => ws.moveStory(p.id, s.id, -1)} disabled={i === 0} aria-label="Move earlier" className="rounded p-2 hover:bg-black/5 disabled:opacity-25">
                    <ArrowUp size={15} />
                  </button>
                  <button onClick={() => ws.moveStory(p.id, s.id, 1)} disabled={i === p.story.length - 1} aria-label="Move later" className="rounded p-2 hover:bg-black/5 disabled:opacity-25">
                    <ArrowDown size={15} />
                  </button>
                  <button
                    onClick={() => {
                      ws.removeFromStory(p.id, s.id);
                      toast('Frame removed from story', { undo: true });
                    }}
                    aria-label="Remove from story"
                    className="rounded p-2 hover:bg-black/5"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </motion.li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function StoryCaption({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onSave(v)}
      placeholder="Caption for this frame"
      aria-label="Caption"
      className="mt-1 w-full rounded bg-transparent text-[14px] text-[var(--ink-2)] outline-none focus:bg-black/[0.04] focus:text-[var(--ink)]"
    />
  );
}
