import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
const LiveOverlay = lazy(() => import('../site/LiveOverlay'));
import { AnimatePresence, motion } from 'framer-motion';
import {
  AppWindow,
  BookImage,
  Check,
  CheckCircle2,
  Columns2,
  Copy,
  Crosshair,
  Gavel,
  Link2,
  MessageSquarePlus,
  PenLine,
  Play,
  Presentation,
  RotateCcw,
  Square,
  SquareCheck,
  Star,
  Timer,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Comment, Project, Version, Work } from './types';
import { assetOf, ws } from './store';
import { go } from '../route';
import { AssetThumb, Kbd, ease, toast, useMedia } from './kit';
import { Anchor, CompareMode, PinView, Tool, WorkCanvas } from './WorkCanvas';
import { VideoHandle, VideoWork } from './VideoWork';
import { FilePick, upload } from './uploads';
import { ACCEPT, fmtTime } from './media';
import { Act } from './Inspector';
import { ago, useI18n } from '../i18n';
import { cloudEnabled, useAuth } from '../cloud/client';
import { createReviewLink, listReviewLinks, revokeReviewLink } from '../cloud/sync';

type Filter = 'open' | 'resolved' | 'all';
type NewComment = Omit<Comment, 'id' | 'createdAt' | 'resolved' | 'replies' | 'author'>;

/** What the review can do: a studio member gets everything, a guest only comments. */
export interface ReviewApi {
  role: 'editor' | 'guest';
  addComment: (c: NewComment) => string | Promise<string>;
  reply: (cid: string, text: string) => void | Promise<void>;
  resolve?: (cid: string, v: boolean) => void;
  setTask?: (cid: string, v: boolean) => void;
  deleteComment?: (cid: string) => void;
}

export function memberApi(pid: string): ReviewApi {
  return {
    role: 'editor',
    addComment: (c) => ws.addComment(pid, c),
    reply: (cid, text) => ws.reply(pid, cid, text),
    resolve: (cid, v) => ws.resolve(pid, cid, v),
    setTask: (cid, v) => ws.setTask(pid, cid, v),
    deleteComment: (cid) => ws.deleteComment(pid, cid),
  };
}

export function Review({ p, workId, q, api, basePath }: { p: Project; workId?: string; q: URLSearchParams; api?: ReviewApi; basePath?: string }) {
  const isDesktop = useMedia('(min-width: 1024px)');
  const work = p.works.find((w) => w.id === workId) ?? p.works[0];
  const a = api ?? memberApi(p.id);
  const base = basePath ?? `/p/${p.id}/review`;
  if (!work) return a.role === 'editor' ? <NoWorks p={p} /> : null;
  return <ReviewWork key={work.id} p={p} work={work} q={q} isDesktop={isDesktop} api={a} base={base} />;
}

function ReviewWork({ p, work, q, isDesktop, api, base }: { p: Project; work: Work; q: URLSearchParams; isDesktop: boolean; api: ReviewApi; base: string }) {
  const { t } = useI18n();
  const editor = api.role === 'editor';
  const sorted = [...work.versions].sort((x, y) => x.n - y.n);
  const latest = sorted[sorted.length - 1];
  const cur: Version = sorted.find((v) => v.id === q.get('v')) ?? sorted.find((v) => v.id === work.approvedVersionId) ?? latest;
  const cmpParam = q.get('cmp');
  const cmp = cmpParam && cmpParam !== cur.id ? sorted.find((v) => v.id === cmpParam) : undefined;
  const activeId = q.get('c') ?? undefined;

  const asset = assetOf(p, cur.assetId)!;
  const cmpAsset = cmp ? assetOf(p, cmp.assetId) : undefined;
  const isVideo = work.kind === 'video';

  const [split, setSplit] = useState(50);
  const [mode, setMode] = useState<CompareMode>('slider');
  const [onion, setOnion] = useState(50);
  const [tool, setTool] = useState<Tool>('none');
  const [draft, setDraft] = useState<(Anchor & { t?: number; t2?: number; versionId: string }) | null>(null);
  const [filter, setFilter] = useState<Filter>('open');
  const [tab, setTab] = useState<'notes' | 'decisions' | 'share'>('notes');
  // a page from the constructor: its live version opens over the picture
  const sitePage = work.pageId ? (p.pages ?? []).find((x) => x.id === work.pageId) : undefined;
  const snap = sitePage?.snapshots?.find((s) => s.versionId === cur.id);
  const [live, setLive] = useState(false);
  const video = useRef<VideoHandle>(null);

  const setQ = (patch: Record<string, string | undefined>, replace = true) => {
    const next = new URLSearchParams(q);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!next.get('v')) next.set('v', cur.id);
    go(`${base}/${work.id}?${next.toString()}`, { replace });
  };

  const all = useMemo(() => [...p.comments.filter((c) => c.workId === work.id)].sort((x, y) => x.createdAt - y.createdAt), [p.comments, work.id]);
  const num = (id: string) => all.findIndex((c) => c.id === id) + 1;
  const shown = all.filter((c) => c.id === activeId || (filter === 'all' ? true : filter === 'open' ? !c.resolved : c.resolved));
  const openCount = all.filter((c) => !c.resolved).length;
  const tasks = all.filter((c) => c.isTask);
  const openTasks = tasks.filter((c) => !c.resolved);

  const pins: PinView[] = all
    .filter((c) => (c.pin || c.area || c.path) && (c.versionId === cur.id || (cmp && c.versionId === cmp.id)))
    .filter((c) => filter === 'all' || c.id === activeId || (filter === 'open' ? !c.resolved : c.resolved))
    .map((c) => ({ c, n: num(c.id), side: cmp && c.versionId === cmp.id ? 'a' : 'b' }));

  useEffect(() => {
    const c = all.find((x) => x.id === activeId);
    if (!c) return;
    if (c.resolved && filter === 'open') setFilter('all');
    if (c.t != null) video.current?.seek(c.t);
    const x = c.pin?.x ?? c.area?.x ?? c.path?.[0]?.[0];
    if (cmp && x != null && mode === 'slider') setSplit(c.versionId === cmp.id ? Math.min(96, Math.max(x * 100 + 18, 55)) : Math.max(4, Math.min(x * 100 - 18, 45)));
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectComment = (c: Comment) => {
    const patch: Record<string, string | undefined> = { c: c.id };
    if (c.versionId !== cur.id && (!cmp || c.versionId !== cmp.id)) patch.v = c.versionId;
    setQ(patch);
    if (c.t != null) video.current?.seek(c.t);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,[contenteditable]')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'c') {
        e.preventDefault();
        isVideo ? markTime() : pick('pin');
      } else if (k === 'a' && !isVideo) pick('area');
      else if (k === 'd' && !isVideo) pick('draw');
      else if (k === 'i' && isVideo) markTime();
      else if (k === 'o' && isVideo) markOut();
      else if (e.key === 'Escape') {
        setTool('none');
        setDraft(null);
      } else if (e.key === '[' || e.key === ']') {
        const i = sorted.findIndex((v) => v.id === cur.id);
        const j = Math.min(sorted.length - 1, Math.max(0, i + (e.key === ']' ? 1 : -1)));
        if (j !== i) setQ({ v: sorted[j].id, c: undefined, cmp: cmp?.id === sorted[j].id ? undefined : cmp?.id });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function pick(tl: Tool) {
    setDraft(null);
    setTool((cur0) => (cur0 === tl ? 'none' : tl));
  }
  function markTime() {
    const tt = video.current?.time() ?? 0;
    video.current?.pause();
    setDraft({ t: Math.round(tt * 10) / 10, versionId: cur.id });
  }
  function markOut() {
    const tt = Math.round((video.current?.time() ?? 0) * 10) / 10;
    setDraft((d) => (d?.t != null ? { ...d, t2: tt } : { t: tt, versionId: cur.id }));
  }

  const toggleCompare = () => {
    if (cmp) setQ({ cmp: undefined });
    else {
      const prev = [...sorted].reverse().find((v) => v.n < cur.n) ?? sorted.find((v) => v.id !== cur.id);
      if (prev) {
        setSplit(50);
        setQ({ cmp: prev.id });
      }
    }
  };

  const approved = work.approvedVersionId === cur.id;
  const inPres = p.presentation.includes(asset.id);
  const presIndex = p.presentation.indexOf(asset.id);
  const tools: { id: Tool; label: string; key: string; icon: React.ReactNode }[] = [
    { id: 'pin', label: t('Point'), key: 'C', icon: <Crosshair size={14} /> },
    { id: 'area', label: t('Area'), key: 'A', icon: <Square size={14} /> },
    { id: 'draw', label: t('Draw'), key: 'D', icon: <PenLine size={14} /> },
  ];

  const versionBar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-full bg-white/[0.06] p-1" role="radiogroup" aria-label={t('Version')} dir="ltr">
        {sorted.map((v) => {
          const on = v.id === cur.id;
          const isA = cmp?.id === v.id;
          return (
            <button key={v.id} role="radio" aria-checked={on} onClick={() => setQ({ v: v.id, c: undefined, cmp: isA ? cur.id : cmp?.id })} className="relative rounded-full px-3 py-1.5 text-[12.5px] font-semibold" style={{ color: on ? 'var(--ink)' : isA ? '#f3efe7' : 'var(--fog)' }} title={v.label}>
              {on && <motion.span layoutId={`vsel-${work.id}`} className="absolute inset-0 rounded-full bg-[#f3efe7]" transition={{ duration: 0.25, ease }} />}
              <span className="relative">
                {isA ? 'A · ' : cmp && on ? 'B · ' : ''}v{v.n}
                {work.approvedVersionId === v.id ? ' ✓' : ''}
              </span>
            </button>
          );
        })}
      </div>
      {!isVideo && sorted.length > 1 && (
        <button onClick={toggleCompare} aria-pressed={!!cmp} className="inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium" style={{ borderColor: cmp ? 'var(--signal)' : 'var(--line)', color: cmp ? 'var(--signal)' : '#f3efe7' }}>
          <Columns2 size={14} /> {cmp ? t('Comparing') : t('Compare A/B')}
        </button>
      )}
      {cmp && (
        <div className="flex items-center gap-1 rounded-full border border-[var(--line)] p-0.5" role="radiogroup" aria-label={t('Compare mode')}>
          {(
            [
              ['slider', t('Slider')],
              ['side', t('Side by side')],
              ['onion', t('Overlay')],
              ['diff', t('Difference')],
            ] as [CompareMode, string][]
          ).map(([m, l]) => (
            <button key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className="rounded-full px-2.5 py-1 text-[11.5px] font-medium" style={{ background: mode === m ? '#f3efe7' : 'transparent', color: mode === m ? 'var(--ink)' : 'var(--fog)' }}>
              {l}
            </button>
          ))}
          {mode === 'onion' && <input type="range" min={0} max={100} value={onion} onChange={(e) => setOnion(+e.target.value)} aria-label={t('Overlay opacity')} className="f2-range mx-2 w-20" />}
        </div>
      )}
    </div>
  );

  const toolBar = isVideo ? (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={markTime} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--line)] px-3 text-[12.5px] font-medium text-[#f3efe7] hover:bg-white/5">
        <Timer size={14} /> {t('Note at this frame')} <Kbd>I</Kbd>
      </button>
      {draft?.t != null && (
        <button onClick={markOut} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--signal)] px-3 text-[12.5px] font-medium text-[var(--signal)]">
          {t('End range here')} <Kbd>O</Kbd>
        </button>
      )}
    </div>
  ) : (
    <div className="flex items-center gap-1 rounded-full border border-[var(--line)] p-0.5" role="radiogroup" aria-label={t('Annotate')}>
      {tools.map((tl) => (
        <button key={tl.id} role="radio" aria-checked={tool === tl.id} onClick={() => pick(tl.id)} title={`${tl.label} (${tl.key})`} className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium" style={{ background: tool === tl.id ? 'var(--signal)' : 'transparent', color: tool === tl.id ? 'var(--signal-ink)' : '#f3efe7' }}>
          {tl.icon}
          <span className="hidden xl:inline">{tl.label}</span>
        </button>
      ))}
    </div>
  );

  const stage = (
    <div className="relative flex min-h-0 flex-col bg-[var(--graphite)] text-[#f3efe7]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 md:px-6">
        {versionBar}
        <div className="flex flex-wrap items-center gap-2">
          {sitePage && (
            <button type="button" onClick={() => setLive(true)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#f3efe7] px-3 text-[12.5px] font-semibold text-[#16171a]" title={t('Scroll the real page, at any width')}>
              <AppWindow size={14} /> {t('Live page')}
            </button>
          )}
          {sitePage && editor && (
            <button type="button" onClick={() => go(`/s/${p.id}?m=site&pg=${sitePage.id}`)} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--line)] px-3 text-[12.5px] font-medium hover:bg-white/5">
              <PenLine size={14} /> <span className="hidden sm:inline">{t('Edit the page')}</span>
            </button>
          )}
          {toolBar}
          {editor && (
            <FilePick
              accept={ACCEPT}
              multiple={false}
              onFiles={(f) =>
                upload(f, p.id, {
                  isReference: false,
                  then: (na) => {
                    const vid = ws.addVersion(p.id, work.id, na.id);
                    toast(t('New version added — comparing with v{n}', { n: cur.n }));
                    go(`${base}/${work.id}?v=${vid}&cmp=${cur.id}`, { replace: true });
                  },
                })
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--line)] px-3 text-[12.5px] font-medium hover:bg-white/5"
            >
              <Upload size={14} /> {t('New version')}
            </FilePick>
          )}
        </div>
      </div>

      <div className={`relative mx-3 mb-3 mt-3 md:mx-6 ${isDesktop ? 'min-h-0 flex-1' : isVideo ? 'h-[58vh]' : 'h-[54vh]'}`}>
        {isVideo ? (
          <VideoWork ref={video} asset={asset} comments={all.filter((c) => c.versionId === cur.id).map((c) => ({ c, n: num(c.id) }))} activeId={activeId} onMarker={(id) => selectComment(all.find((c) => c.id === id)!)} draft={draft?.t != null ? { t: draft.t, t2: draft.t2 } : null} />
        ) : (
          <WorkCanvas
            b={asset}
            a={cmpAsset}
            split={split}
            onSplit={setSplit}
            mode={mode}
            onion={onion}
            pins={pins}
            activeId={activeId}
            onPin={(id) => selectComment(all.find((c) => c.id === id)!)}
            tool={tool}
            onDraft={(anchor, side) => {
              setDraft({ ...anchor, versionId: side === 'a' && cmp ? cmp.id : cur.id });
              setTool('none');
            }}
            draft={draft}
            labelA={cmp ? `A · v${cmp.n}${cmp.label ? ` · ${cmp.label}` : ''}` : undefined}
            labelB={cmp ? `B · v${cur.n}${cur.label ? ` · ${cur.label}` : ''}` : undefined}
            layoutId={`work-${asset.id}`}
          />
        )}
        <AnimatePresence>
          {tool !== 'none' && (
            <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--signal)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--signal-ink)]">
              {tool === 'pin' ? t('Click the detail') : tool === 'area' ? t('Drag over an area') : t('Draw on the work')} · Esc
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-4 py-3 md:px-6">
        <p className="f2-mono text-[var(--fog)]">
          {work.title} · v{cur.n}
          {cur.label ? ` · ${cur.label}` : ''} · {ago(cur.createdAt)}
        </p>
        {editor && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                ws.approve(p.id, work.id, approved ? undefined : cur.id);
                if (!approved) {
                  toast(t('v{n} approved', { n: cur.n }));
                  setTab('decisions');
                }
              }}
              aria-pressed={approved}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold"
              style={{ borderColor: approved ? '#7fbf8e' : 'var(--line)', color: approved ? '#9ad3a6' : '#f3efe7', background: approved ? 'rgba(127,191,142,0.1)' : 'transparent' }}
            >
              <CheckCircle2 size={14} /> {approved ? t('v{n} approved', { n: cur.n }) : t('Approve v{n}', { n: cur.n })}
            </button>
            {inPres ? (
              <button onClick={() => go(`/p/${p.id}/present/${presIndex + 1}`)} className="f2-btn f2-btn-signal !min-h-[36px] !px-3.5 !text-[13px]">
                <Play size={13} fill="currentColor" /> {t('Present')}
              </button>
            ) : (
              <button onClick={() => (ws.togglePresentation(p.id, asset.id, true), toast(t('Added to presentation')))} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--line)] px-3 text-[12.5px] font-medium hover:bg-white/5">
                <Presentation size={14} /> {t('Add to presentation')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const composerLabel = draft
    ? draft.t != null
      ? draft.t2 != null
        ? t('Note on {a}–{b}, v{n}', { a: fmtTime(Math.min(draft.t, draft.t2)), b: fmtTime(Math.max(draft.t, draft.t2)), n: cur.n })
        : t('Note at {a}, v{n}', { a: fmtTime(draft.t), n: cur.n })
      : t('Note on v{n} · {kind}', { n: sorted.find((v) => v.id === draft.versionId)?.n ?? cur.n, kind: draft.area ? t('area') : draft.path ? t('drawing') : t('point') })
    : '';

  const notesPanel = (
    <>
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="text-[13px] font-semibold">
          {t('Discussion')} <span className="font-medium text-[var(--ink-2)]">· {t('{n} open', { n: openCount })}</span>
        </h2>
        <div className="flex gap-0.5" role="radiogroup" aria-label={t('Show')}>
          {(['open', 'resolved', 'all'] as Filter[]).map((f) => (
            <button key={f} role="radio" aria-checked={filter === f} onClick={() => setFilter(f)} className="rounded-full px-2.5 py-1 text-[12px] font-medium" style={{ background: filter === f ? 'var(--ink)' : 'transparent', color: filter === f ? 'var(--paper)' : 'var(--ink-2)' }}>
              {f === 'open' ? t('Open') : f === 'resolved' ? t('Resolved') : t('All')}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {draft && (
          <Composer
            key="composer"
            label={composerLabel}
            canTask={!!api.setTask}
            guest={!editor}
            onCancel={() => setDraft(null)}
            onSave={async (text, isTask) => {
              const { versionId, ...anchor } = draft;
              const id = await api.addComment({ workId: work.id, versionId, ...anchor, text, isTask });
              setDraft(null);
              setFilter('open');
              setQ({ c: id });
              toast(t('Note added'));
            }}
          />
        )}
      </AnimatePresence>

      {openTasks.length > 0 && (
        <div className="mx-3 mb-3 rounded-[8px] border border-[var(--rule)] p-3">
          <p className="f2-mono flex items-center gap-1.5 text-[var(--ink-2)]">
            <SquareCheck size={12} /> {t('For the next version · {n}', { n: openTasks.length })}
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {openTasks.map((c) => (
              <li key={c.id} className="flex items-start gap-2">
                <button onClick={() => api.resolve?.(c.id, true)} disabled={!api.resolve} aria-label={t('Mark done')} className="mt-0.5 h-4 w-4 shrink-0 rounded border border-[var(--ink)] disabled:opacity-40" />
                <button onClick={() => selectComment(c)} className="text-start text-[13px] leading-snug hover:underline">
                  {c.text}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className={`flex flex-col gap-2 px-3 pb-4 ${isDesktop ? 'f2-scroll min-h-0 flex-1 overflow-y-auto' : ''}`}>
        {shown.length === 0 && (
          <li className="rounded-[8px] border border-dashed border-[var(--rule)] p-4 text-[13px] leading-relaxed text-[var(--ink-2)]">
            {filter === 'open' ? (
              <>
                {t('Nothing open on this work.')}{' '}
                <button onClick={() => (isVideo ? markTime() : pick('pin'))} className="f2-link font-medium text-[var(--ink)]">
                  {isVideo ? t('Comment at the current frame') : t('Pin a note on the work')}
                </button>
              </>
            ) : (
              t('No notes here yet.')
            )}
          </li>
        )}
        {shown.map((c) => (
          <CommentCard key={c.id} api={api} c={c} n={num(c.id)} version={sorted.find((v) => v.id === c.versionId)} active={c.id === activeId} scroll={isDesktop} onSelect={() => selectComment(c)} />
        ))}
      </ul>
    </>
  );

  const side = (
    <div className="flex min-h-0 flex-col">
      <div className="border-b border-[var(--rule)] px-4 pb-3 pt-4">
        <div className="f2-noscrollbar flex gap-2 overflow-x-auto">
          {p.works.map((w) => {
            const v = w.versions.find((x) => x.id === w.approvedVersionId) ?? w.versions[w.versions.length - 1];
            const wa = assetOf(p, v.assetId);
            const open = p.comments.filter((c) => c.workId === w.id && !c.resolved).length;
            const on = w.id === work.id;
            return (
              <a key={w.id} href={`#${base}/${w.id}`} aria-current={on} className="w-[76px] shrink-0">
                <span className="relative block h-[90px] overflow-hidden rounded-[3px] bg-[var(--graphite)]" style={{ outline: on ? '2px solid var(--ink)' : 'none', outlineOffset: 2 }}>
                  <AssetThumb asset={wa} className="h-full w-full" />
                  {open > 0 && <span className="absolute right-1 top-1 rounded-full bg-[var(--signal)] px-1.5 text-[10px] font-bold text-[var(--signal-ink)]">{open}</span>}
                </span>
                <span className="mt-1 block truncate text-[11.5px] font-medium">{w.title}</span>
              </a>
            );
          })}
          {editor && (
            <FilePick
              accept={ACCEPT}
              multiple={false}
              onFiles={(f) =>
                upload(f, p.id, {
                  isReference: false,
                  then: (na) => {
                    const wid = ws.workFromAsset(p.id, na.id);
                    go(`${base}/${wid}`);
                  },
                })
              }
              className="flex h-[90px] w-[76px] shrink-0 flex-col items-center justify-center gap-1 rounded-[3px] border border-dashed border-[var(--rule)] text-[11px] font-medium text-[var(--ink-2)] hover:bg-black/[0.03]"
              label={t('New work')}
            >
              <Upload size={15} /> {t('New work')}
            </FilePick>
          )}
        </div>
      </div>

      {editor && (
        <div className="flex gap-1 border-b border-[var(--rule)] px-3 pt-2" role="tablist">
          {(
            [
              ['notes', t('Notes')],
              ['decisions', t('Decisions')],
              ['share', t('Share')],
            ] as const
          ).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className="relative px-3 py-2 text-[13px] font-semibold" style={{ color: tab === k ? 'var(--ink)' : 'var(--ink-2)' }}>
              {l}
              {k === 'decisions' && (p.decisions ?? []).filter((d) => d.workId === work.id).length > 0 && <span className="ms-1 text-[11px] text-[var(--ink-2)]">{(p.decisions ?? []).filter((d) => d.workId === work.id).length}</span>}
              {tab === k && <motion.span layoutId="rtab" className="absolute inset-x-2 bottom-0 h-[2px] bg-[var(--ink)]" />}
            </button>
          ))}
        </div>
      )}

      {tab === 'notes' || !editor ? notesPanel : tab === 'decisions' ? <Decisions p={p} work={work} cur={cur} approved={approved} /> : <SharePanel p={p} work={work} />}

      {editor && tab === 'notes' && (
        <div className="border-t border-[var(--rule)] px-4 py-4">
          <p className="f2-mono text-[var(--ink-2)]">{approved ? t('v{n} approved · use it', { n: cur.n }) : t('Use this version')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Act on={p.story.some((s) => s.assetId === asset.id)} onClick={() => (ws.addToStory(p.id, asset.id), toast(t('Added to Story')))} icon={<BookImage size={14} />}>
              {p.story.some((s) => s.assetId === asset.id) ? t('In Story') : t('Story frame')}
            </Act>
            <Act on={p.portfolio.includes(asset.id)} onClick={() => ws.togglePortfolio(p.id, asset.id)} icon={<Star size={14} fill={p.portfolio.includes(asset.id) ? 'currentColor' : 'none'} />}>
              {p.portfolio.includes(asset.id) ? t('Portfolio pick') : t('Pick for portfolio')}
            </Act>
          </div>
        </div>
      )}
    </div>
  );

  const liveView =
    live && sitePage ? (
      <Suspense fallback={null}>
        <LiveOverlay p={p} page={snap ? { ...sitePage, root: snap.root, theme: snap.theme } : sitePage} versionN={snap ? cur.n : undefined} onClose={() => setLive(false)} />
      </Suspense>
    ) : null;
  return isDesktop ? (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_380px]">
      {stage}
      <aside className="flex min-h-0 flex-col border-s border-[var(--rule)]">{side}</aside>
      {liveView}
    </div>
  ) : (
    <div className="flex flex-col">
      {stage}
      {side}
      {liveView}
    </div>
  );
}

/* ───────── decisions: what was decided and what it rests on ───────── */

function Decisions({ p, work, cur, approved }: { p: Project; work: Work; cur: Version; approved: boolean }) {
  const { t } = useI18n();
  const list = (p.decisions ?? []).filter((d) => d.workId === work.id).sort((a, b) => b.createdAt - a.createdAt);
  const [text, setText] = useState('');
  const [basis, setBasis] = useState<string[]>([]);
  const resolved = p.comments.filter((c) => c.workId === work.id && c.resolved);
  const refs = p.assets.filter((a) => a.isReference);
  return (
    <div className="f2-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <form
        className="rounded-[8px] border border-[var(--rule)] p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          ws.decide(p.id, {
            workId: work.id,
            versionId: cur.id,
            text: text.trim(),
            basedOn: basis.map((b) => ({ kind: b.startsWith('c:') ? 'comment' : 'asset', id: b.slice(2) })) as { kind: 'asset' | 'comment'; id: string }[],
          });
          setText('');
          setBasis([]);
          toast(t('Decision recorded'));
        }}
      >
        <p className="f2-mono flex items-center gap-1.5 text-[var(--ink-2)]">
          <Gavel size={12} /> {approved ? t('v{n} is approved — what did you decide?', { n: cur.n }) : t('Record a decision on v{n}', { n: cur.n })}
        </p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder={t('e.g. Satin glaze instead of lacquer; one soft key from the left.')} aria-label={t('Decision')} className="mt-2 w-full resize-none rounded-[6px] border border-[var(--rule)] bg-white/50 p-2 text-[13.5px] outline-none focus:border-[var(--ink)]" />
        {(resolved.length > 0 || refs.length > 0) && (
          <>
            <p className="mt-2 text-[12px] text-[var(--ink-2)]">{t('Based on')}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {resolved.map((c) => (
                <Chip key={c.id} on={basis.includes(`c:${c.id}`)} onClick={() => setBasis((b) => (b.includes(`c:${c.id}`) ? b.filter((x) => x !== `c:${c.id}`) : [...b, `c:${c.id}`]))}>
                  ✓ {c.text.slice(0, 38)}
                  {c.text.length > 38 ? '…' : ''}
                </Chip>
              ))}
              {refs.map((a) => (
                <Chip key={a.id} on={basis.includes(`a:${a.id}`)} onClick={() => setBasis((b) => (b.includes(`a:${a.id}`) ? b.filter((x) => x !== `a:${a.id}`) : [...b, `a:${a.id}`]))}>
                  ◧ {a.title}
                </Chip>
              ))}
            </div>
          </>
        )}
        <button type="submit" disabled={!text.trim()} className="mt-3 rounded-full bg-[var(--ink)] px-3.5 py-1.5 text-[12.5px] font-semibold text-[var(--paper)] disabled:opacity-35">
          {t('Record decision')}
        </button>
      </form>
      {list.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-[var(--ink-2)]">{t('Decisions build the reverse side of the work: they feed the Story and the case page.')}</p>
      ) : (
        <ol className="flex flex-col gap-3 border-s border-[var(--rule)] ps-4">
          {list.map((d) => {
            const v = work.versions.find((x) => x.id === d.versionId);
            return (
              <li key={d.id} className="relative">
                <span className="absolute -start-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--ink)]" />
                <p className="f2-mono !text-[10px] text-[var(--ink-2)]">
                  v{v?.n} · {d.author} · {ago(d.createdAt)}
                </p>
                <p className="mt-0.5 text-[14px] leading-snug">{d.text}</p>
                {d.basedOn.length > 0 && (
                  <p className="mt-1 text-[12px] text-[var(--ink-2)]">
                    {t('Based on')}:{' '}
                    {d.basedOn
                      .map((b) => (b.kind === 'asset' ? p.assets.find((a) => a.id === b.id)?.title : `“${p.comments.find((c) => c.id === b.id)?.text.slice(0, 40) ?? ''}…”`))
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                <button onClick={() => (ws.removeDecision(p.id, d.id), toast(t('Decision removed'), { undo: true }))} className="mt-1 text-[11.5px] text-[var(--ink-2)] hover:text-[var(--ink)]">
                  {t('Remove')}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function Chip({ children, on, onClick }: { children: React.ReactNode; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className="max-w-full truncate rounded-full border px-2 py-0.5 text-[11.5px]" style={{ borderColor: on ? 'var(--ink)' : 'var(--rule)', background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--paper)' : 'var(--ink)' }}>
      {children}
    </button>
  );
}

/* ───────── share for review (needs the studio server) ───────── */

function SharePanel({ p, work }: { p: Project; work: Work }) {
  const { t } = useI18n();
  const auth = useAuth();
  const [links, setLinks] = useState<Awaited<ReturnType<typeof listReviewLinks>>>([]);
  const [busy, setBusy] = useState(false);
  const can = cloudEnabled && !!auth.session && !!p.cloud;
  useEffect(() => {
    if (can) listReviewLinks(p.id).then(setLinks);
  }, [can, p.id]);
  const url = (token: string) => `${window.location.origin}/#/r/${token}`;

  if (!can)
    return (
      <div className="p-4 text-[13px] leading-relaxed text-[var(--ink-2)]">
        <p className="font-semibold text-[var(--ink)]">{t('Client review links')}</p>
        <p className="mt-1">
          {!cloudEnabled
            ? t('This build has no studio server, so links cannot be shared. Everything stays in this browser.')
            : !auth.session
              ? t('Sign in and move this project to your studio to share a review link.')
              : t('Move this project to your studio first: links work only for projects on the server.')}
        </p>
        {cloudEnabled && auth.session && !p.cloud && (
          <a href={`#/p/${p.id}`} className="f2-link mt-2 inline-block font-medium text-[var(--ink)]">
            {t('Go to overview → Move to studio')}
          </a>
        )}
      </div>
    );

  return (
    <div className="f2-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
      <p className="text-[13px] leading-relaxed text-[var(--ink-2)]">{t('Anyone with the link can see this work and leave notes — no account. They cannot edit, approve or see other projects. Revoke a link at any time.')}</p>
      <div className="flex flex-wrap gap-2">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const l = await createReviewLink(p.id, work.id, work.title);
              await navigator.clipboard?.writeText(url(l.token)).catch(() => {});
              toast(t('Link created and copied'));
              setLinks(await listReviewLinks(p.id));
            } catch (e) {
              toast(t('Could not create the link'), { tone: 'error' });
            } finally {
              setBusy(false);
            }
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--ink)] px-3.5 text-[13px] font-semibold text-[var(--paper)] disabled:opacity-50"
        >
          <Link2 size={14} /> {t('Link to this work')}
        </button>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const l = await createReviewLink(p.id, undefined, p.title);
              await navigator.clipboard?.writeText(url(l.token)).catch(() => {});
              toast(t('Link created and copied'));
              setLinks(await listReviewLinks(p.id));
            } finally {
              setBusy(false);
            }
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--rule)] px-3 text-[13px] font-medium"
        >
          <Link2 size={14} /> {t('Link to all works')}
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {links.map((l) => (
          <li key={l.id} className="rounded-[8px] border border-[var(--rule)] p-2.5">
            <p className="text-[13px] font-medium">{l.label ?? t('Review link')}</p>
            <p className="f2-mono mt-0.5 truncate !text-[10px] text-[var(--ink-2)]" dir="ltr">
              {url(l.token)}
            </p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => navigator.clipboard?.writeText(url(l.token)).then(() => toast(t('Copied')))} className="inline-flex items-center gap-1 rounded-full border border-[var(--rule)] px-2.5 py-1 text-[12px]">
                <Copy size={12} /> {t('Copy')}
              </button>
              <button
                onClick={async () => {
                  await revokeReviewLink(l.id);
                  setLinks((x) => x.filter((y) => y.id !== l.id));
                  toast(t('Link revoked — it no longer opens'));
                }}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] text-[var(--ink-2)] hover:bg-black/5"
              >
                <Trash2 size={12} /> {t('Revoke')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────── comments ───────── */

function CommentCard({ api, c, n, version, active, onSelect, scroll }: { api: ReviewApi; c: Comment; n: number; version?: Version; active: boolean; onSelect: () => void; scroll: boolean }) {
  const { t } = useI18n();
  const [reply, setReply] = useState('');
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (active && scroll) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [active, scroll]);
  const kind = c.t != null ? (c.t2 != null ? `▶ ${fmtTime(Math.min(c.t, c.t2))}–${fmtTime(Math.max(c.t, c.t2))}` : `▶ ${fmtTime(c.t)}`) : c.area ? t('area') : c.path ? t('drawing') : c.pin ? t('point') : t('general');
  return (
    <motion.li ref={ref} layout transition={{ duration: 0.25, ease }} className="rounded-[8px] border p-3" style={{ borderColor: active ? 'var(--ink)' : 'var(--rule)', background: active ? 'rgba(255,255,255,0.45)' : 'transparent', opacity: c.resolved && !active ? 0.75 : 1 }}>
      <button onClick={onSelect} className="flex w-full gap-2.5 text-start" aria-label={t('Go to note {n}', { n })}>
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full rounded-bl-[3px] text-[11px] font-bold" style={{ background: c.resolved ? 'var(--paper-3)' : 'var(--signal)', color: 'var(--ink)' }}>
          {c.resolved ? <Check size={12} strokeWidth={3} /> : n}
        </span>
        <span className="min-w-0 flex-1">
          <span className="f2-mono block !text-[10px] text-[var(--ink-2)]">
            v{version?.n} · {kind} · {c.author} · {ago(c.createdAt)}
            {c.isTask ? ` · ${t('task')}` : ''}
          </span>
          <span className="mt-1 block text-[13.5px] leading-snug">{c.text}</span>
        </span>
      </button>
      {c.replies.length > 0 && (
        <ul className="ms-8 mt-2 flex flex-col gap-1.5 border-s border-[var(--rule)] ps-3">
          {c.replies.map((r) => (
            <li key={r.id} className="text-[13px] leading-snug">
              <span className="f2-mono block !text-[10px] text-[var(--ink-2)]">
                {r.author} · {ago(r.createdAt)}
              </span>
              {r.text}
            </li>
          ))}
        </ul>
      )}
      {active && (
        <div className="ms-8 mt-3 flex flex-col gap-2">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!reply.trim()) return;
              await api.reply(c.id, reply.trim());
              setReply('');
            }}
          >
            <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t('Reply…')} aria-label={t('Reply')} className="w-full rounded-[6px] border border-[var(--rule)] bg-white/50 px-2.5 py-2 text-[13px] outline-none focus:border-[var(--ink)]" />
          </form>
          <div className="flex flex-wrap gap-2">
            {api.resolve && (
              <button
                onClick={() => {
                  api.resolve!(c.id, !c.resolved);
                  toast(c.resolved ? t('Note reopened') : t('Marked resolved'));
                }}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold"
                style={{ background: c.resolved ? 'transparent' : 'var(--ink)', color: c.resolved ? 'var(--ink)' : 'var(--paper)', border: '1px solid var(--ink)' }}
              >
                {c.resolved ? <RotateCcw size={13} /> : <Check size={13} />}
                {c.resolved ? t('Reopen') : t('Resolve')}
              </button>
            )}
            {api.setTask && (
              <button onClick={() => api.setTask!(c.id, !c.isTask)} aria-pressed={!!c.isTask} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--rule)] px-3 py-1.5 text-[12.5px] font-medium">
                <SquareCheck size={13} /> {c.isTask ? t('Not a task') : t('Make a task')}
              </button>
            )}
            {api.deleteComment && (
              <button
                onClick={() => {
                  api.deleteComment!(c.id);
                  toast(t('Note deleted'), { undo: true });
                }}
                className="rounded-full px-3 py-1.5 text-[12.5px] font-medium text-[var(--ink-2)] hover:bg-black/5"
              >
                {t('Delete')}
              </button>
            )}
          </div>
        </div>
      )}
    </motion.li>
  );
}

function Composer({ label, onSave, onCancel, canTask, guest }: { label: string; onSave: (t: string, isTask: boolean) => void; onCancel: () => void; canTask: boolean; guest: boolean }) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [task, setTask] = useState(false);
  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22, ease }}
      className="mx-3 mb-3 overflow-hidden rounded-[8px] border-2 border-[var(--signal)] bg-white/60"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSave(text.trim(), task);
      }}
    >
      <div className="p-3">
        <p className="f2-mono flex items-center gap-1.5 text-[var(--ink-2)]">
          <MessageSquarePlus size={12} /> {label}
        </p>
        <textarea
          autoFocus
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (text.trim()) onSave(text.trim(), task);
            }
            if (e.key === 'Escape') onCancel();
          }}
          placeholder={t('What should change here?')}
          aria-label={t('Note')}
          className="mt-2 w-full resize-none bg-transparent text-[14px] leading-snug outline-none"
        />
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          {canTask && !guest ? (
            <label className="inline-flex items-center gap-1.5 text-[12px]">
              <input type="checkbox" checked={task} onChange={(e) => setTask(e.target.checked)} /> {t('Task for the next version')}
            </label>
          ) : (
            <span className="text-[11px] text-[var(--ink-2)]">{t('Enter to post · Esc to cancel')}</span>
          )}
          <div className="flex gap-1.5">
            <button type="button" onClick={onCancel} aria-label={t('Cancel')} className="rounded-full p-1.5 hover:bg-black/5">
              <X size={15} />
            </button>
            <button type="submit" disabled={!text.trim()} className="rounded-full bg-[var(--ink)] px-3.5 py-1.5 text-[12.5px] font-semibold text-[var(--paper)] disabled:opacity-35">
              {t('Post')}
            </button>
          </div>
        </div>
      </div>
    </motion.form>
  );
}

function NoWorks({ p }: { p: Project }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-[520px] text-center">
        <p className="f2-mono text-[var(--ink-2)]">{t('Review')}</p>
        <h2 className="f2-display mt-3 text-[40px] leading-none">{t('Nothing to review yet.')}</h2>
        <p className="mt-3 text-[15px] text-[var(--ink-2)]">{t('Upload a render or a motion file. When the next version comes in, put them side by side and pin notes right on the detail.')}</p>
        <FilePick
          accept={ACCEPT}
          multiple={false}
          onFiles={(f) =>
            upload(f, p.id, {
              isReference: false,
              then: (a) => {
                const wid = ws.workFromAsset(p.id, a.id);
                go(`/p/${p.id}/review/${wid}`);
              },
            })
          }
          className="f2-btn f2-btn-signal mt-6"
        >
          <Upload size={16} /> {t('Upload first version')}
        </FilePick>
      </div>
    </div>
  );
}
