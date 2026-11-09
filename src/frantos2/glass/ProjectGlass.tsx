import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Columns2,
  Copy,
  Crosshair,
  Box,
  Eye,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  Link2,
  MessageSquare,
  Play,
  Plus,
  Search,
  Upload,
  Wand2,
  X,
  PanelRightClose,
  PanelRightOpen,
  CalendarDays,
  Mic,
  Square as StopIcon,
  BookOpen,
  Presentation,
} from 'lucide-react';
import './glass.css';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { GlassAccount } from './account';
import { useI18n } from '../i18n';
import { go } from '../route';
import { ws, useProject, ensureLoaded } from '../ws/store';
import { Asset, Comment, Project, Work } from '../ws/types';
import { useAssetUrl } from '../ws/media';
import { FilePick, upload, useDropZone } from '../ws/uploads';
import { toast, ago, useMedia } from '../ws/kit';
import { WorkCanvas, Anchor, PinView, Tool } from '../ws/WorkCanvas';
import { VideoWork, VideoHandle } from '../ws/VideoWork';
import { autoStory } from '../tell/autoStory';
import { openPalette } from '../daily/Palette';
import { cloudEnabled, getAuth, sb, useAuth } from '../cloud/client';
import { createReviewLink, moveToStudio } from '../cloud/sync';
import { useStudioId } from '../cloud/Account';
import { Backdrop, GlassLang, Pane, ThemeSwitch, lgEase } from './kit';
import { Item, STAGES, STAGE_LABEL, Stage, assetById, defaultStage, itemImage, itemsOf, latest } from './stages';

/**
 * One project, one screen. The selected piece of work fills the window;
 * the rail (left), the panel (right) and the stage dock (bottom) are glass.
 *   #/p/:id?s=review&i=hero-render&v=hero-v2&c=c-shadow
 */
export function ProjectGlass({ id, q }: { id: string; q: URLSearchParams }) {
  const { t, dir } = useI18n();
  const { project: p, loading } = useProject(id);
  useEffect(() => void ensureLoaded(), []);
  useEffect(() => {
    if (p) ws.visit(p.id, 'glass');
  }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!p && loading) return <div className="lg fixed inset-0" />;
  if (!p)
    return (
      <div className="lg fixed inset-0 flex items-center justify-center" dir={dir}>
        <Backdrop />
        <Pane className="relative rounded-[26px] p-8 text-center">
          <p className="text-[18px] font-bold">{t('This project is not here')}</p>
          <p className="mt-2 text-[14px] text-white/75">{t('It may live in another browser or studio.')}</p>
          <button type="button" onClick={() => go('/app')} className="lg-btn lg-btn-primary mt-5">
            {t('All projects')}
          </button>
        </Pane>
      </div>
    );
  return <Screen p={p} q={q} />;
}

function Screen({ p, q }: { p: Project; q: URLSearchParams }) {
  const { t, dir } = useI18n();
  const narrow = useMedia('(max-width: 900px)');
  const items = useMemo(() => itemsOf(p), [p]);
  // a deep link to a piece wins over the stage in the URL: the piece may have moved on
  const wanted = q.get('i');
  const home = wanted ? STAGES.find((s) => items[s].some((x) => x.id === wanted)) : undefined;
  const stage = home ?? ((STAGES as string[]).includes(q.get('s') ?? '') ? (q.get('s') as Stage) : defaultStage(items));
  const list = items[stage];
  const item = list.find((i) => i.id === q.get('i')) ?? list[0];
  // the details panel: on wide screens it remembers whether you folded it away
  const [panelOpen, setPanelOpenRaw] = useState(() => (narrow ? !!q.get('c') : localStorage.getItem('frantos-panel') !== 'closed' || !!q.get('c')));
  const setPanelOpen = (v: boolean) => {
    setPanelOpenRaw(v);
    if (!narrow) localStorage.setItem('frantos-panel', v ? 'open' : 'closed');
  };
  // phone ↔ desktop: phones start with the panel closed; desktops keep what you chose
  useEffect(() => setPanelOpenRaw(narrow ? false : localStorage.getItem('frantos-panel') !== 'closed'), [narrow]);
  // a chosen note or a new mark always brings the panel back
  const noteId = q.get('c');
  useEffect(() => {
    if (noteId) setPanelOpen(true);
  }, [noteId]);
  useEffect(() => {
    const open = (e: Event) => (e as CustomEvent<DraftDetail>).detail?.anchor || (e as CustomEvent<DraftDetail>).detail?.t != null ? setPanelOpen(true) : undefined;
    draftBus.addEventListener('draft', open);
    return () => draftBus.removeEventListener('draft', open);
  }, []);

  const setQ = (patch: Record<string, string | undefined>, replace = true) => {
    const next = new URLSearchParams(q);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    go(`/p/${p.id}?${next.toString()}`, { replace });
  };
  const pickStage = (s: Stage) => setQ({ s, i: undefined, v: undefined, c: undefined });
  const pickItem = (i: Item) => setQ({ i: i.id, v: undefined, c: undefined });

  // drop files anywhere: references in Collect, new works elsewhere
  const addFiles = (files: FileList | File[]) => {
    if (stage === 'collect') upload(files, p.id, { isReference: true, then: (a) => setQ({ i: a.id }) });
    else
      upload(files, p.id, {
        isReference: false,
        then: (a) => {
          const wid = ws.workFromAsset(p.id, a.id);
          setQ({ s: 'make', i: wid });
        },
      });
  };
  const drop = useDropZone(addFiles);
  const img = item ? itemImage(item) : undefined;
  const bgAsset = useAssetUrl(img, img?.kind === 'video' ? 'thumb' : 'full').url;
  const bg = item?.kind === 'object' ? item.object.thumb : bgAsset;

  // keyboard: 1–4 stages, ↑/↓ items, Esc closes the panel on phones
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,[contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4) pickStage(STAGES[n - 1]);
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && list.length) {
        const i = Math.max(0, list.findIndex((x) => x.id === item?.id));
        const j = Math.min(list.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)));
        if (j !== i) (e.preventDefault(), pickItem(list[j]));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="lg fixed inset-0 overflow-hidden" dir={dir} {...drop.props}>
      <Backdrop src={bg} id={img?.id ?? stage} tint={0.42} blur />

      {/* top bar */}
      <header className="absolute inset-x-3 top-3 z-40 flex items-center gap-2 sm:inset-x-4 sm:top-4">
        <Pane className="flex min-w-0 items-center gap-1 rounded-full py-1 pe-4 ps-1">
          <button type="button" onClick={() => go('/app')} className="lg-btn lg-btn-plain lg-icon" aria-label={t('All projects')}>
            <ArrowLeft size={18} className="rtl:-scale-x-100" />
          </button>
          <span dir="auto" className="truncate text-[15px] font-bold">{p.title}</span>
          <span dir="auto" className="ms-2 hidden truncate text-[12.5px] text-white/70 2xl:inline">{p.brief ? p.brief.split('.')[0] : ''}</span>
        </Pane>
        <div className="ms-auto flex items-center gap-2">
          <Pane className="hidden items-center gap-1 rounded-full p-1 sm:flex">
            <button type="button" onClick={openPalette} className="lg-btn lg-btn-plain min-h-[40px] text-[13px]" aria-label={t('Search or run a command')}>
              <Search size={15} /> <span className="hidden lg:inline">{t('Search')}</span> <span className="text-white/60">⌘K</span>
            </button>
            <span className="hidden xl:block">
              <GlassLang />
            </span>
            <button type="button" onClick={() => go(`/p/${p.id}/deck`)} className="lg-btn lg-btn-plain lg-icon" aria-label={t('Present boards')} title={t('Present boards')}>
              <Presentation size={16} />
            </button>
            <button type="button" onClick={() => go(`/p/${p.id}/guide`)} className="lg-btn lg-btn-plain lg-icon" aria-label={t('Brand guide')} title={t('Brand guide')}>
              <BookOpen size={16} />
            </button>
            <ThemeSwitch />
          </Pane>
          <button type="button" onClick={() => go(`/s/${p.id}`)} className="lg-glass lg-btn">
            <Box size={15} /> <span className="hidden sm:inline">{t('Studio')}</span>
          </button>
          <ShareButton p={p} item={item} />
          <GlassAccount />
        </div>
      </header>

      <LayoutGroup>
        {/* rail */}
        <Rail p={p} stage={stage} list={list} active={item?.id} onPick={pickItem} onAdd={addFiles} narrow={narrow} />

        {/* the work */}
        <main className={`absolute z-10 ${narrow ? 'inset-x-0 bottom-[178px] top-[72px]' : 'bottom-[96px] top-[84px]'} ${!narrow ? (panelOpen ? 'start-[132px] end-[404px]' : 'start-[132px] end-4') : ''}`}>
          {item ? <Stagepiece key={item.id} p={p} item={item} q={q} setQ={setQ} /> : <Empty stage={stage} onAdd={addFiles} />}
        </main>

        {/* panel */}
        <AnimatePresence>
          {item && panelOpen && (
            <Pane
              as="aside"
              strong={narrow}
              key="panel"
              className={`z-30 flex flex-col overflow-hidden ${narrow ? 'fixed inset-x-2 bottom-[80px] top-[30%] rounded-[26px]' : 'absolute bottom-[96px] end-4 top-[84px] w-[372px] rounded-[26px]'}`}
              aria-label={t('Details')}
            >
              <Panel p={p} item={item} q={q} setQ={setQ} onClose={() => setPanelOpen(false)} collapse={!narrow} />
            </Pane>
          )}
        </AnimatePresence>
        {item && !panelOpen && (
          <button type="button" onClick={() => setPanelOpen(true)} className={`lg-glass lg-btn absolute z-20 ${narrow ? 'end-3 top-[76px]' : 'end-4 top-[84px]'}`} title={t('Show the panel')}>
            {narrow ? <MessageSquare size={15} /> : <PanelRightOpen size={16} className="rtl:-scale-x-100" />} {t('Details')}
          </button>
        )}

        {/* stage dock */}
        <Dock stage={stage} counts={items} onPick={pickStage} />
      </LayoutGroup>

      <AnimatePresence>
        {drop.over && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-black/30">
            <Pane className="rounded-[28px] px-8 py-6 text-center">
              <Upload className="mx-auto" />
              <p className="mt-3 text-[17px] font-bold">{stage === 'collect' ? t('Drop to add references') : t('Drop to add new work')}</p>
            </Pane>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────── stage dock ───────── */

function Dock({ stage, counts, onPick }: { stage: Stage; counts: Record<Stage, Item[]>; onPick: (s: Stage) => void }) {
  const { t } = useI18n();
  return (
    <nav aria-label={t('Stages of a project')} className="absolute inset-x-0 bottom-3 z-30 flex justify-center px-2 sm:bottom-4">
      <Pane className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full p-1.5 lg-scroll" role="tablist">
        {STAGES.map((s, i) => {
          const on = s === stage;
          const n = counts[s].length;
          const attention = s === 'review' && n > 0;
          return (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onPick(s)}
              className={`relative flex min-h-[48px] items-center gap-1.5 rounded-full px-3 text-[13.5px] font-bold transition-colors sm:gap-2 sm:px-5 sm:text-[14px] ${on ? 'text-[#11151a]' : 'text-white/85 hover:text-white'}`}
            >
              {on && <motion.span layoutId="lg-dock" className="absolute inset-0 rounded-full bg-white" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
              <span className="relative hidden text-[11px] opacity-60 sm:inline">0{i + 1}</span>
              <span className="relative">{t(STAGE_LABEL[s])}</span>
              <span className={`relative rounded-full px-1.5 text-[11.5px] ${on ? 'bg-black/10' : attention ? 'bg-[var(--lg-accent)] text-[var(--lg-accent-ink)]' : 'bg-white/15'}`}>{n}</span>
            </button>
          );
        })}
      </Pane>
    </nav>
  );
}

/* ───────── rail ───────── */

function Rail({ p, stage, list, active, onPick, onAdd, narrow }: { p: Project; stage: Stage; list: Item[]; active?: string; onPick: (i: Item) => void; onAdd: (f: FileList) => void; narrow: boolean }) {
  const { t } = useI18n();
  const canAdd = stage === 'collect' || stage === 'make';
  return (
    <Pane
      as="nav"
      key={`rail-${stage}`}
      aria-label={t(STAGE_LABEL[stage])}
      className={`z-20 overflow-auto lg-scroll ${narrow ? 'absolute inset-x-2 bottom-[84px] flex h-[86px] gap-2 rounded-[22px] p-2' : 'absolute bottom-[96px] start-4 top-[84px] flex w-[104px] flex-col gap-2 rounded-[26px] p-2'}`}
    >
      {list.map((i) => (
        <RailItem key={i.id} p={p} item={i} on={i.id === active} onClick={() => onPick(i)} narrow={narrow} />
      ))}
      {canAdd && (
        <FilePick onFiles={onAdd} label={stage === 'collect' ? t('Add references') : t('Add new work')} className={`flex shrink-0 flex-col items-center justify-center gap-1 rounded-[16px] border border-dashed border-white/40 text-[11px] font-semibold text-white/80 hover:bg-white/10 ${narrow ? 'h-[70px] w-[70px]' : 'h-[88px] w-full'}`}>
          <Plus size={18} />
          {t('Add')}
        </FilePick>
      )}
      {!list.length && !canAdd && <p className="p-2 text-center text-[11.5px] text-white/70">{t('Nothing here yet')}</p>}
    </Pane>
  );
}

function RailItem({ p, item, on, onClick, narrow }: { p: Project; item: Item; on: boolean; onClick: () => void; narrow: boolean }) {
  const { t } = useI18n();
  const a = itemImage(item);
  const assetThumb = useAssetUrl(a, 'thumb').url;
  const url = item.kind === 'object' ? item.object.thumb : assetThumb;
  const badge = item.kind === 'work' && item.open ? item.open : null;
  return (
    <button type="button" onClick={onClick} aria-current={on ? 'true' : undefined} title={t(item.title)} className={`group relative shrink-0 rounded-[16px] p-0.5 text-start transition-transform active:scale-[0.97] ${narrow ? 'h-[70px] w-[70px]' : 'w-full'}`}>
      <span className={`block overflow-hidden rounded-[16px] ${narrow ? 'h-full w-full' : 'aspect-[4/5] w-full'} ${on ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent' : 'opacity-80 group-hover:opacity-100'}`}>
        {url ? <img src={url} alt="" className="h-full w-full object-cover" draggable={false} /> : <span className="flex h-full w-full items-center justify-center bg-white/10">{item.kind === 'case' ? <FileText size={18} /> : <ImageIcon size={18} />}</span>}
      </span>
      {!narrow && <span className="mt-1 block truncate px-0.5 text-[11px] font-semibold text-white/85">{t(item.title)}</span>}
      {badge != null && <span className="absolute end-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--lg-accent)] px-1 text-[11px] font-extrabold text-[var(--lg-accent-ink)]">{badge}</span>}
      {item.kind === 'work' && item.work.approvedVersionId && <span className="absolute start-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#11151a]" aria-label={t('Approved')}><Check size={12} strokeWidth={3} /></span>}
    </button>
  );
}

function Empty({ stage, onAdd }: { stage: Stage; onAdd: (f: FileList) => void }) {
  const { t } = useI18n();
  const copy: Record<Stage, [string, string]> = {
    collect: ['Start with what inspires you', 'Drop images, video or screenshots anywhere on the screen.'],
    make: ['Nothing in the making', 'Add a file to start a work. New versions stack on it.'],
    review: ['No open notes', 'When someone pins a note on a work, it waits here.'],
    show: ['Nothing approved yet', 'Approve a version and it lands here, ready for the story.'],
  };
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Pane className="max-w-[420px] rounded-[28px] p-7 text-center">
        <p className="text-[20px] font-bold">{t(copy[stage][0])}</p>
        <p className="mt-2 text-[14.5px] leading-[1.5] text-white/80">{t(copy[stage][1])}</p>
        {(stage === 'collect' || stage === 'make') && (
          <FilePick onFiles={onAdd} className="lg-btn lg-btn-primary mt-5">
            <Upload size={16} /> {t('Choose files')}
          </FilePick>
        )}
      </Pane>
    </div>
  );
}

/* ───────── the piece in the middle ───────── */

function currentVersion(w: Work, q: URLSearchParams, p?: Project) {
  const sorted = [...w.versions].sort((x, y) => x.n - y.n);
  const noteV = p && !q.get('v') ? p.comments.find((c) => c.id === q.get('c'))?.versionId : undefined;
  return sorted.find((v) => v.id === (q.get('v') ?? noteV)) ?? sorted.find((v) => v.id === w.approvedVersionId) ?? sorted[sorted.length - 1];
}

function Stagepiece({ p, item, q, setQ }: { p: Project; item: Item; q: URLSearchParams; setQ: (x: Record<string, string | undefined>, r?: boolean) => void }) {
  const { t } = useI18n();
  const video = useRef<VideoHandle>(null);
  if (item.kind === 'object') {
    return (
      <div className="relative flex h-full items-center justify-center p-4">
        {item.object.thumb && <img src={item.object.thumb} alt="" className="max-h-full max-w-full rounded-[6px] object-contain" />}
        <div className="absolute inset-x-0 bottom-6 flex justify-center">
          <Pane className="flex flex-wrap items-center justify-center gap-2 rounded-full p-1.5">
            <button type="button" onClick={() => go(`/o/${p.id}/${item.object.id}`)} className="lg-btn lg-btn-ghost">
              <Eye size={16} /> {t('Showroom')}
            </button>
            <button type="button" onClick={() => go(`/s/${p.id}?o=${item.object.id}`)} className="lg-btn lg-btn-primary">
              <Box size={16} /> {t('Edit in studio')}
            </button>
          </Pane>
        </div>
      </div>
    );
  }
  if (item.kind === 'story' || item.kind === 'case') {
    const a = itemImage(item);
    return (
      <div className="relative flex h-full items-center justify-center p-4">
        <PieceImage asset={a} />
        <div className="absolute inset-0 flex items-center justify-center">
          <Pane className="rounded-[26px] p-6 text-center">
            <p className="text-[22px] font-extrabold tracking-[-0.02em]">{item.kind === 'story' ? t('{n} frames', { n: item.frames }) : t('Case page')}</p>
            <button type="button" onClick={() => go(item.kind === 'story' ? `/p/${p.id}/stories/play/0` : `/p/${p.id}/case`)} className="lg-btn lg-btn-primary mt-4">
              {item.kind === 'story' ? <Play size={16} /> : <ExternalLink size={16} />} {item.kind === 'story' ? t('Play the story') : t('Open the case page')}
            </button>
          </Pane>
        </div>
      </div>
    );
  }
  if (item.kind === 'asset') {
    if (item.asset.kind === 'video') return <VideoWork ref={video} asset={item.asset} comments={[]} onMarker={() => {}} />;
    return (
      <div className="relative h-full">
        <WorkCanvas b={item.asset} split={50} pins={[]} layoutId={`lg-${item.asset.id}`} />
      </div>
    );
  }
  return <WorkPiece p={p} w={item.work} q={q} setQ={setQ} />;
}

function GridImg({ asset }: { asset?: Asset }) {
  const { url } = useAssetUrl(asset, 'full');
  return <span className="flex h-full w-full items-center justify-center bg-black/20">{url && <img src={url} alt="" className="max-h-full max-w-full object-contain" />}</span>;
}

function PieceImage({ asset }: { asset?: Asset }) {
  const { url } = useAssetUrl(asset, 'full');
  return url ? <img src={url} alt="" className="max-h-full max-w-full rounded-[6px] object-contain opacity-60" /> : null;
}

/** Shared state between the work on screen and the notes in the panel. */
const draftBus = new EventTarget();
type DraftDetail = { anchor: Anchor | null; t?: number };
/** the mark waiting for its text: survives the panel opening after the click */
let pending: DraftDetail | null = null;
draftBus.addEventListener('draft', (e) => {
  const d = (e as CustomEvent<DraftDetail>).detail;
  pending = d.anchor || d.t != null ? d : null;
});
draftBus.addEventListener('clear', () => (pending = null));

function WorkPiece({ p, w, q, setQ }: { p: Project; w: Work; q: URLSearchParams; setQ: (x: Record<string, string | undefined>, r?: boolean) => void }) {
  const { t } = useI18n();
  const cur = currentVersion(w, q, p);
  const cmpId = q.get('cmp');
  const cmp = cmpId && cmpId !== cur.id ? w.versions.find((v) => v.id === cmpId) : undefined;
  const asset = assetById(p, cur.assetId);
  const cmpAsset = cmp ? assetById(p, cmp.assetId) : undefined;
  const [split, setSplit] = useState(50);
  const [tool, setTool] = useState<Tool>('none');
  const [draft, setDraft] = useState<Anchor | null>(null);
  const video = useRef<VideoHandle>(null);
  const all = p.comments.filter((c) => c.workId === w.id).sort((x, y) => x.createdAt - y.createdAt);
  const num = (id: string) => all.findIndex((c) => c.id === id) + 1;
  const activeId = q.get('c') ?? undefined;
  const pins: PinView[] = all.filter((c) => (c.pin || c.area || c.path) && (c.versionId === cur.id || (cmp && c.versionId === cmp.id)) && (!c.resolved || c.id === activeId)).map((c) => ({ c, n: num(c.id), side: cmp && c.versionId === cmp.id ? 'a' : 'b' }));

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ tool: Tool }>).detail;
      if (d?.tool) setTool((x) => (x === d.tool ? 'none' : d.tool));
    };
    const clear = () => (setDraft(null), setTool('none'));
    draftBus.addEventListener('tool', on);
    draftBus.addEventListener('clear', clear);
    return () => {
      draftBus.removeEventListener('tool', on);
      draftBus.removeEventListener('clear', clear);
    };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,[contenteditable]') || e.metaKey || e.ctrlKey) return;
      if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (w.kind === 'video') {
          video.current?.pause();
          draftBus.dispatchEvent(new CustomEvent<DraftDetail>('draft', { detail: { anchor: null, t: Math.round((video.current?.time() ?? 0) * 10) / 10 } }));
        } else setTool((x) => (x === 'pin' ? 'none' : 'pin'));
      }
      if (e.key === 'Escape') (setTool('none'), setDraft(null), draftBus.dispatchEvent(new CustomEvent<DraftDetail>('draft', { detail: { anchor: null } })));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  useEffect(() => {
    const c = all.find((x) => x.id === activeId);
    if (c?.t != null) video.current?.seek(c.t);
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!asset) return null;
  if (q.get('grid') && w.versions.length > 1) {
    const vs = [...w.versions].sort((x, y) => x.n - y.n);
    const cols = vs.length <= 2 ? 2 : vs.length <= 4 ? 2 : 3;
    return (
      <div className="grid h-full gap-3 p-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: 'minmax(0, 1fr)' }} dir="ltr">
        {vs.map((v) => {
          const a = assetById(p, v.assetId);
          const open = p.comments.filter((c) => c.versionId === v.id && !c.resolved).length;
          return (
            <button key={v.id} type="button" onClick={() => setQ({ v: v.id, grid: undefined })} className={`group relative min-h-0 overflow-hidden rounded-[18px] ring-1 ${v.id === cur.id ? 'ring-2 ring-white' : 'ring-white/20 hover:ring-white/60'}`} aria-label={t('Open v{n}', { n: v.n })}>
              <GridImg asset={a} />
              <span className="lg-glass absolute start-2 top-2 rounded-full px-3 py-1 text-[12.5px] font-bold">
                v{v.n}
                {w.approvedVersionId === v.id ? ' ✓' : ''}
                {v.label ? ` · ${t(v.label)}` : ''}
              </span>
              {open > 0 && <span className="absolute end-2 top-2 rounded-full bg-[var(--lg-accent)] px-2.5 py-1 text-[11.5px] font-bold text-white">{t('{n} open', { n: open })}</span>}
            </button>
          );
        })}
      </div>
    );
  }
  if (w.kind === 'video')
    return (
      <div className="relative h-full">
        <VideoWork
          ref={video}
          asset={asset}
          comments={all.filter((c) => c.versionId === cur.id && c.t != null).map((c) => ({ c, n: num(c.id) }))}
          activeId={activeId}
          onMarker={(cid) => setQ({ c: cid })}
        />
      </div>
    );
  return (
    <div className={`relative h-full ${tool !== 'none' ? 'cursor-crosshair' : ''}`}>
      <WorkCanvas
        b={asset}
        a={cmpAsset}
        split={split}
        onSplit={setSplit}
        pins={pins}
        activeId={activeId}
        onPin={(cid) => setQ({ c: cid })}
        tool={tool}
        draft={draft}
        onDraft={(an) => {
          setDraft(an);
          setTool('none');
          draftBus.dispatchEvent(new CustomEvent<DraftDetail>('draft', { detail: { anchor: an } }));
        }}
        labelA={cmp ? `v${cmp.n}` : undefined}
        labelB={`v${cur.n}`}
        layoutId={`lg-${asset.id}`}
      />
      <AnimatePresence>
        {tool !== 'none' && (
          <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="lg-glass pointer-events-none absolute bottom-2 start-1/2 max-w-[90%] -translate-x-1/2 rounded-full px-4 py-2 text-center text-[13px] font-semibold rtl:translate-x-1/2">
            {t('Click the spot your note is about · Esc to cancel')}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────── the panel ───────── */

function Panel({ p, item, q, setQ, onClose, collapse }: { p: Project; item: Item; q: URLSearchParams; setQ: (x: Record<string, string | undefined>, r?: boolean) => void; onClose?: () => void; collapse?: boolean }) {
  const { t } = useI18n();
  return (
    <>
      <div className="flex items-start gap-2 px-5 pb-3 pt-4">
        <div className="min-w-0 flex-1">
          <p className="lg-label">{item.kind === 'asset' ? (item.asset.isReference ? t('Reference') : t('File')) : item.kind === 'work' ? t('Work') : item.kind === 'story' ? t('Story') : item.kind === 'object' ? t('3D object') : t('Case page')}</p>
          <h2 dir="auto" className="mt-0.5 truncate text-start text-[20px] font-extrabold tracking-[-0.02em]">{t(item.title)}</h2>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="lg-btn lg-btn-plain lg-icon -me-2 -mt-1" aria-label={collapse ? t('Fold the panel away') : t('Close')} title={collapse ? t('Fold the panel away') : t('Close')}>
            {collapse ? <PanelRightClose size={18} className="rtl:-scale-x-100" /> : <X size={18} />}
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 lg-scroll">
        {item.kind === 'asset' && <AssetPanel p={p} a={item.asset} setQ={setQ} />}
        {item.kind === 'work' && <WorkPanel key={item.id} p={p} w={item.work} q={q} setQ={setQ} />}
        {item.kind === 'story' && <StoryPanel p={p} />}
        {item.kind === 'case' && <CasePanel p={p} />}
        {item.kind === 'object' && <ObjectPanel p={p} o={item.object} />}
      </div>
    </>
  );
}

function AssetPanel({ p, a, setQ }: { p: Project; a: Asset; setQ: (x: Record<string, string | undefined>) => void }) {
  const { t } = useI18n();
  const target = a.influences ? p.assets.find((x) => x.id === a.influences!.assetId) : undefined;
  const targetWork = target ? p.works.find((w) => w.versions.some((v) => v.assetId === target.id)) : undefined;
  return (
    <div className="space-y-5">
      {a.note && <p dir="auto" className="text-start text-[15px] leading-[1.55] text-white/90">{t(a.note)}</p>}
      {a.source && (
        <p className="text-[13px] text-white/70">
          {t('Source')}: {t(a.source)}
        </p>
      )}
      {a.palette?.length ? (
        <div>
          <p className="lg-label mb-2">{t('Palette')}</p>
          <div className="flex h-8 overflow-hidden rounded-[10px]">
            {a.palette.map((c) => (
              <span key={c} className="flex-1" style={{ background: c }} title={c} />
            ))}
          </div>
        </div>
      ) : null}
      {a.influences && target && (
        <div className="rounded-[18px] lg-soft p-4">
          <p className="lg-label">{t('Shaped')}</p>
          <button type="button" onClick={() => targetWork ? go(`/p/${p.id}?s=${targetWork.approvedVersionId ? 'show' : 'make'}&i=${targetWork.id}`) : setQ({ i: target.id })} className="mt-1 text-start text-[15px] font-bold underline-offset-4 hover:underline">
            {t(target.title)} →
          </button>
          <p className="mt-1.5 text-[14px] leading-[1.5] text-white/85">{t(a.influences.text)}</p>
        </div>
      )}
      {!a.isReference && (
        <button type="button" onClick={() => go(`/p/${p.id}?s=make&i=${ws.workFromAsset(p.id, a.id)}`)} className="lg-btn lg-btn-ghost w-full">
          <Wand2 size={15} /> {t('Turn into a work with versions')}
        </button>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => (ws.setCover(p.id, a.id), toast(t('Set as project cover')))} className="lg-btn lg-btn-ghost">
          {t('Use as cover')}
        </button>
        <button type="button" onClick={() => (ws.addToMoodboard(p.id, a.id), toast(t('Added to the board')))} className="lg-btn lg-btn-ghost">
          <LayoutGrid size={15} /> {t('Add to board')}
        </button>
      </div>
      <p className="text-[12px] text-white/60">{t('Added {when}', { when: ago(a.createdAt) })}</p>
    </div>
  );
}

function WorkPanel({ p, w, q, setQ }: { p: Project; w: Work; q: URLSearchParams; setQ: (x: Record<string, string | undefined>, r?: boolean) => void }) {
  const { t } = useI18n();
  const cur = currentVersion(w, q, p);
  const sorted = [...w.versions].sort((x, y) => x.n - y.n);
  const cmpId = q.get('cmp');
  const all = p.comments.filter((c) => c.workId === w.id).sort((x, y) => x.createdAt - y.createdAt);
  const num = (id: string) => all.findIndex((c) => c.id === id) + 1;
  const here = all.filter((c) => c.versionId === cur.id);
  const open = here.filter((c) => !c.resolved);
  const done = here.filter((c) => c.resolved);
  const activeId = q.get('c') ?? undefined;
  const [showDoneRaw, setShowDone] = useState(false);
  const showDone = showDoneRaw || done.some((c) => c.id === activeId);
  const [draft, setDraft] = useState<DraftDetail | null>(() => pending);
  const approved = w.approvedVersionId === cur.id;
  const influences = p.assets.filter((a) => a.influences && w.versions.some((v) => v.assetId === a.influences!.assetId));

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<DraftDetail>).detail;
      setDraft(d.anchor || d.t != null ? d : null);
    };
    draftBus.addEventListener('draft', on);
    return () => draftBus.removeEventListener('draft', on);
  }, []);

  const newVersion = (files: FileList) =>
    upload(files, p.id, {
      isReference: false,
      then: (a) => {
        const vid = ws.addVersion(p.id, w.id, a.id);
        setQ({ v: vid, cmp: cur.id, c: undefined });
        toast(t('New version added'));
      },
    });

  const due = w.due ? new Date(w.due) : null;
  const late = !!due && due.getTime() < Date.now() - 864e5 && w.status !== 'done' && !w.approvedVersionId;
  return (
    <div className="space-y-5">
      {/* plan: status and due date */}
      <div className="space-y-2">
        <p className="lg-label">{t('Plan')}</p>
        <div role="radiogroup" aria-label={t('Status')} className="grid grid-cols-4 gap-1 rounded-[14px] bg-white/10 p-1">
          {(['todo', 'doing', 'client', 'done'] as const).map((st) => {
            const on = (w.status ?? (w.approvedVersionId ? 'done' : 'doing')) === st;
            return (
              <button key={st} type="button" role="radio" aria-checked={on} onClick={() => ws.planWork(p.id, w.id, { status: st })} className={`min-h-[34px] rounded-[10px] px-1 text-[11.5px] font-bold ${on ? 'bg-white text-[#11151a]' : 'text-white/80 hover:bg-white/10'}`}>
                {t(st === 'todo' ? 'To do' : st === 'doing' ? 'In work' : st === 'client' ? 'With client' : 'Done')}
              </button>
            );
          })}
        </div>
        <label className={`flex min-h-[38px] items-center gap-2 rounded-[12px] px-3 text-[13px] lg-soft ${late ? 'ring-1 ring-[var(--lg-accent)]' : ''}`}>
          <CalendarDays size={14} />
          <span className="text-white/75">{t('Due')}</span>
          <input type="date" className="ms-auto bg-transparent text-[13px] font-semibold outline-none [color-scheme:dark]" value={due ? due.toISOString().slice(0, 10) : ''} onChange={(e) => ws.planWork(p.id, w.id, { due: e.target.value ? new Date(e.target.value + 'T18:00:00').getTime() : null })} aria-label={t('Due date')} />
        </label>
        {late && <p className="text-[12px] font-semibold text-[var(--lg-accent)]">{t('Past due')}</p>}
      </div>

      {/* versions */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="lg-label">{t('Versions')}</p>
          {sorted.length > 1 && (
            <span className="flex gap-1.5">
              <button type="button" onClick={() => setQ({ grid: q.get('grid') ? undefined : '1', cmp: undefined })} className={`lg-btn min-h-[34px] px-3 text-[12.5px] ${q.get('grid') ? 'lg-btn-primary' : 'lg-btn-ghost'}`} aria-pressed={!!q.get('grid')} title={t('All versions side by side')}>
                <LayoutGrid size={14} /> {t('All')}
              </button>
              <button type="button" onClick={() => setQ({ cmp: cmpId ? undefined : (sorted.filter((v) => v.n < cur.n).pop() ?? sorted.find((v) => v.id !== cur.id))?.id, grid: undefined })} className={`lg-btn min-h-[34px] px-3 text-[12.5px] ${cmpId ? 'lg-btn-primary' : 'lg-btn-ghost'}`} aria-pressed={!!cmpId}>
                <Columns2 size={14} /> {t('Compare')}
              </button>
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('Version')} dir="ltr">
          {sorted.map((v) => {
            const on = v.id === cur.id;
            return (
              <button key={v.id} role="radio" aria-checked={on} title={v.label} onClick={() => setQ({ v: v.id, c: undefined, cmp: cmpId === v.id ? cur.id : cmpId ?? undefined })} className={`relative min-h-[38px] rounded-full px-3.5 text-[13px] font-bold ${on ? 'text-[#11151a]' : 'lg-soft text-white/85'} ${cmpId === v.id ? 'ring-1 ring-white/80' : ''}`}>
                {on && <motion.span layoutId={`lg-v-${w.id}`} className="absolute inset-0 rounded-full bg-white" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
                <span className="relative">
                  v{v.n}
                  {w.approvedVersionId === v.id ? ' ✓' : ''}
                </span>
              </button>
            );
          })}
          <FilePick onFiles={newVersion} multiple={false} label={t('Upload a new version')} className="min-h-[38px] rounded-full border border-dashed border-white/45 px-3 text-[13px] font-semibold text-white/85 hover:bg-white/10">
            + v{sorted.length + 1}
          </FilePick>
        </div>
        {cur.label && <p className="mt-2 text-[13px] text-white/75">{t(cur.label)}</p>}
      </div>

      {/* notes */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="lg-label">{open.length ? t('{n} open notes', { n: open.length }) : t('No open notes')}</p>
          {w.kind === 'image' && (
            <button type="button" onClick={() => draftBus.dispatchEvent(new CustomEvent('tool', { detail: { tool: 'pin' } }))} className="lg-btn lg-btn-ghost min-h-[34px] px-3 text-[12.5px]">
              <Crosshair size={14} /> {t('Add note')} <span className="text-white/55">C</span>
            </button>
          )}
        </div>
        <AnimatePresence>
          {draft && <Composer key="composer" p={p} w={w} versionId={cur.id} draft={draft} onDone={(cid) => (setDraft(null), draftBus.dispatchEvent(new Event('clear')), cid && setQ({ c: cid }))} />}
        </AnimatePresence>
        <div className="space-y-2">
          {open.map((c) => (
            <Note key={c.id} p={p} c={c} n={num(c.id)} active={c.id === activeId} onSelect={() => setQ({ c: c.id })} />
          ))}
        </div>
        {done.length > 0 && (
          <button type="button" onClick={() => setShowDone((v) => !v)} className="mt-3 flex items-center gap-1 text-[12.5px] font-semibold text-white/70 hover:text-white" aria-expanded={showDone}>
            <ChevronDown size={14} className={showDone ? 'rotate-180' : ''} /> {t('{n} resolved', { n: done.length })}
          </button>
        )}
        {showDone && (
          <div className="mt-2 space-y-2 opacity-80">
            {done.map((c) => (
              <Note key={c.id} p={p} c={c} n={num(c.id)} active={c.id === activeId} onSelect={() => setQ({ c: c.id })} />
            ))}
          </div>
        )}
      </div>

      {influences.length > 0 && (
        <div>
          <p className="lg-label mb-2">{t('What shaped it')}</p>
          <div className="space-y-2">
            {influences.map((a) => (
              <button key={a.id} type="button" onClick={() => go(`/p/${p.id}?s=collect&i=${a.id}`)} className="flex w-full items-center gap-3 rounded-[16px] p-2 text-start lg-soft hover:bg-white/15">
                <Thumb a={a} />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-bold">{t(a.title)}</span>
                  <span className="line-clamp-2 block text-[12px] leading-[1.4] text-white/75">{t(a.influences!.text)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button type="button" onClick={() => go(`/p/${p.id}/review/${w.id}?v=${cur.id}`)} className="lg-btn lg-btn-ghost">
          {t('Full review')}
        </button>
        <button
          type="button"
          onClick={async () => {
            // a client's approval goes through the server, which checks the project was shared with them
            if (p.cloud && getAuth().role === 'client') {
              if (approved) return;
              const { error } = await sb!.rpc('client_approve', { p_project: p.id, p_work: w.id, p_version: cur.id });
              if (error) return toast(t('Could not approve. Ask the studio to check your access.'), { tone: 'error' });
            }
            ws.approve(p.id, w.id, approved ? undefined : cur.id);
            toast(approved ? t('Approval removed') : t('Approved — moved to Show'));
            if (!approved) setQ({ s: 'show', i: w.id, v: cur.id });
          }}
          className={`lg-btn ${approved ? 'lg-btn-ghost' : 'lg-btn-primary'}`}
        >
          <Check size={16} /> {approved ? t('Approved') : t('Approve v{n}', { n: cur.n })}
        </button>
      </div>
    </div>
  );
}

function Thumb({ a }: { a?: Asset }) {
  const { url } = useAssetUrl(a, 'thumb');
  return <span className="block h-12 w-12 shrink-0 overflow-hidden rounded-[12px] bg-white/10">{url && <img src={url} alt="" className="h-full w-full object-cover" />}</span>;
}

function Note({ p, c, n, active, onSelect }: { p: Project; c: Comment; n: number; active: boolean; onSelect: () => void }) {
  const { t } = useI18n();
  const [reply, setReply] = useState('');
  return (
    <div className={`rounded-[18px] p-3 transition-colors ${active ? 'bg-white/20 ring-1 ring-white/60' : 'lg-soft'}`}>
      <button type="button" onClick={onSelect} className="flex w-full items-start gap-3 text-start">
        <span className="lg-pin shrink-0" data-active={active}>
          {n}
        </span>
        <span className="min-w-0">
          <span className="block text-[12px] font-bold text-white/75">
            {c.author}
            {c.guest ? ` · ${t('guest')}` : ''} · {ago(c.createdAt)}
            {c.t != null ? ` · ${c.t.toFixed(1)}s` : ''}
          </span>
          <span dir="auto" className="mt-0.5 block text-[14.5px] leading-[1.45]">{t(c.text)}</span>
        </span>
      </button>
      {c.audio && <VoiceNote blobKey={c.audio.blobKey} />}
      {c.approval && p.works.find((x) => x.id === c.workId)?.approvedVersionId !== c.versionId && (
        <button type="button" onClick={() => (ws.approve(p.id, c.workId, c.versionId), ws.resolve(p.id, c.id, true), toast(t('Approved — moved to Show')))} className="lg-btn lg-btn-primary ms-[42px] mt-2 min-h-[34px] text-[12.5px]">
          <Check size={14} /> {t('The client approved — confirm')}
        </button>
      )}
      {c.replies.map((r) => (
        <p key={r.id} className="ms-[42px] mt-2 border-s border-white/25 ps-3 text-[13.5px] leading-[1.45] text-white/85">
          <span className="font-bold">{r.author === 'You' ? t('You') : r.author}:</span> {t(r.text)}
        </p>
      ))}
      {active && (
        <div className="ms-[42px] mt-3 space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!reply.trim()) return;
              ws.reply(p.id, c.id, reply.trim());
              setReply('');
            }}
          >
            <label className="sr-only" htmlFor={`r-${c.id}`}>
              {t('Reply')}
            </label>
            <input id={`r-${c.id}`} className="lg-input" placeholder={t('Reply…')} value={reply} onChange={(e) => setReply(e.target.value)} />
          </form>
          <button type="button" onClick={() => (ws.resolve(p.id, c.id, !c.resolved), toast(c.resolved ? t('Reopened') : t('Resolved'), { undo: true }))} className="lg-btn lg-btn-ghost min-h-[36px] px-3 text-[12.5px]">
            <Check size={14} /> {c.resolved ? t('Reopen') : t('Resolve')}
          </button>
        </div>
      )}
    </div>
  );
}

function VoiceNote({ blobKey }: { blobKey: string }) {
  const { t } = useI18n();
  const [url, setUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let u: string | null = null;
    idbGet(blobKey).then((b) => (b ? setUrl((u = URL.createObjectURL(b as Blob))) : setMissing(true)));
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [blobKey]);
  if (missing) return <p className="ms-[42px] mt-2 text-[12px] text-white/60">{t('Voice note recorded on another device')}</p>;
  return url ? <audio src={url} controls className="ms-[42px] mt-2 h-9 w-[calc(100%-42px)]" /> : null;
}

function Composer({ p, w, versionId, draft, onDone }: { p: Project; w: Work; versionId: string; draft: DraftDetail; onDone: (cid?: string) => void }) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.focus(), []);
  // a voice note: recorded here, stored in this browser like an upload
  const [voice, setVoice] = useState<{ blob: Blob; url: string; duration: number } | null>(null);
  const [recording, setRecording] = useState<number | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      const t0 = Date.now();
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
        setVoice({ blob, url: URL.createObjectURL(blob), duration: (Date.now() - t0) / 1000 });
        setRecording(null);
      };
      mr.start();
      recRef.current = mr;
      setRecording(Date.now());
      window.setTimeout(() => mr.state === 'recording' && mr.stop(), 120_000);
    } catch {
      toast(t('The microphone is not available. Allow it in the browser to record a voice note.'), { tone: 'error' });
    }
  };
  const [, tick] = useState(0);
  useEffect(() => {
    if (recording == null) return;
    const iv = setInterval(() => tick((x) => x + 1), 250);
    return () => clearInterval(iv);
  }, [recording]);
  const submit = async () => {
    if (!text.trim() && !voice) return;
    let audio: Comment['audio'];
    if (voice) {
      const key = `blob:vn-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      await idbSet(key, voice.blob);
      audio = { blobKey: key, duration: Math.round(voice.duration * 10) / 10 };
    }
    const cid = ws.addComment(p.id, { workId: w.id, versionId, text: text.trim() || t('Voice note'), ...(audio ? { audio } : {}), ...(draft.anchor ?? {}), ...(draft.t != null ? { t: draft.t } : {}) });
    onDone(cid);
  };
  return (
    <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: lgEase }} className="mb-3 overflow-hidden" onSubmit={(e) => (e.preventDefault(), submit())}>
      <div className="rounded-[18px] bg-white/15 p-3 ring-1 ring-white/50">
        <label htmlFor="lg-new-note" className="lg-label">
          {draft.t != null ? t('Note at {t}s', { t: draft.t.toFixed(1) }) : t('New note on this spot')}
        </label>
        <textarea
          id="lg-new-note"
          ref={ref}
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
            if (e.key === 'Escape') onDone();
          }}
          className="lg-input mt-1.5 resize-none"
          placeholder={t('What should change?')}
        />
        {voice && (
          <div className="mt-2 flex items-center gap-2">
            <audio src={voice.url} controls className="h-9 min-w-0 flex-1" />
            <button type="button" onClick={() => setVoice(null)} className="lg-btn lg-btn-plain lg-icon h-9 min-h-0 w-9" aria-label={t('Remove')}>
              <X size={14} />
            </button>
          </div>
        )}
        <div className="mt-2 flex items-center justify-end gap-2">
          {recording != null ? (
            <button type="button" onClick={() => recRef.current?.stop()} className="lg-btn lg-btn-ghost me-auto min-h-[38px] text-[12.5px]" aria-label={t('Stop recording')}>
              <StopIcon size={13} className="fill-[var(--lg-accent)] text-[var(--lg-accent)]" /> {Math.floor((Date.now() - recording) / 1000)} s
            </button>
          ) : (
            !voice && (
              <button type="button" onClick={startVoice} className="lg-btn lg-btn-plain lg-icon me-auto h-[38px] min-h-0 w-[38px]" aria-label={t('Record a voice note')} title={t('Record a voice note')}>
                <Mic size={16} />
              </button>
            )
          )}
          <button type="button" onClick={() => onDone()} className="lg-btn lg-btn-plain min-h-[38px]">
            {t('Cancel')}
          </button>
          <button type="submit" disabled={!text.trim() && !voice} className="lg-btn lg-btn-primary min-h-[38px] disabled:opacity-50">
            {t('Add note')}
          </button>
        </div>
      </div>
    </motion.form>
  );
}

function StoryPanel({ p }: { p: Project }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <p className="text-[14.5px] leading-[1.5] text-white/85">{t('The story plays full screen, frame by frame. Captions come from your notes.')}</p>
      <ol className="space-y-2">
        {p.story.map((f, i) => (
          <li key={f.id} className="flex items-center gap-3 rounded-[16px] p-2 lg-soft">
            <Thumb a={assetById(p, f.assetId)} />
            <span className="min-w-0">
              <span className="block text-[11px] font-bold text-white/60">{String(i + 1).padStart(2, '0')}</span>
              <span className="line-clamp-2 block text-[13px] leading-[1.4]">{f.caption ? t(f.caption) : t(assetById(p, f.assetId)?.title ?? '')}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => go(`/p/${p.id}/stories`)} className="lg-btn lg-btn-ghost">
          {t('Edit order')}
        </button>
        <button type="button" onClick={() => go(`/p/${p.id}/stories/play/0`)} className="lg-btn lg-btn-primary">
          <Play size={15} /> {t('Play')}
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          ws.setStory(p.id, autoStory(p));
          toast(t('Story rebuilt from the trail'), { undo: true });
        }}
        className="lg-btn lg-btn-plain w-full"
      >
        <Wand2 size={15} /> {t('Build from the trail')}
      </button>
    </div>
  );
}

function ObjectPanel({ p, o }: { p: Project; o: import('../ws/types').StudioObject }) {
  const { t } = useI18n();
  const v = o.variants.find((x) => x.id === o.variantId) ?? o.variants[0];
  return (
    <div className="space-y-4">
      {o.note && (
        <p dir="auto" className="text-[14.5px] leading-[1.5] text-white/85">
          {t(o.note)}
        </p>
      )}
      <div className="flex justify-between text-[13px]">
        <span className="text-white/70">{t('Material')}</span>
        <span className="font-semibold">{t(v.name)}</span>
      </div>
      <div className="flex justify-between text-[13px]">
        <span className="text-white/70">{t('Variants')}</span>
        <span className="font-semibold">{o.variants.length}</span>
      </div>
      <p className="text-[12.5px] leading-[1.5] text-white/65">{t('The showroom shows the object live: visitors turn it, try the variants and place it in their room with AR.')}</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => go(`/o/${p.id}/${o.id}`)} className="lg-btn lg-btn-ghost">
          {t('Showroom')}
        </button>
        <button type="button" onClick={() => go(`/s/${p.id}?o=${o.id}`)} className="lg-btn lg-btn-primary">
          {t('Edit in studio')}
        </button>
      </div>
    </div>
  );
}

function CasePanel({ p }: { p: Project }) {
  const { t } = useI18n();
  const pub = p.visibility === 'public' && p.publicSlug;
  const url = pub ? `${location.origin}/#/c/${p.publicSlug}` : '';
  return (
    <div className="space-y-4">
      <p className="text-[14.5px] leading-[1.5] text-white/85">{t('What shaped it, how it changed, the decisions and the final work — one page you can send.')}</p>
      <p className="flex items-center gap-2 text-[13px] font-semibold">
        <span className={`h-2.5 w-2.5 rounded-full ${pub ? 'bg-[#7fe0a1]' : 'bg-white/50'}`} />
        {pub ? t('Published — anyone with the link') : t('Private — only you')}
      </p>
      {pub && (
        <button type="button" onClick={() => navigator.clipboard?.writeText(url).then(() => toast(t('Link copied')))} className="lg-btn lg-btn-ghost w-full">
          <Copy size={15} /> {t('Copy link')}
        </button>
      )}
      <button type="button" onClick={() => go(`/p/${p.id}/case`)} className="lg-btn lg-btn-primary w-full">
        <ExternalLink size={15} /> {t('Open the case page')}
      </button>
    </div>
  );
}

/* ───────── share ───────── */

function ShareButton({ p, item }: { p: Project; item?: Item }) {
  const { t } = useI18n();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inStudio = !!p.cloud?.studioId;
  const studioId = useStudioId();
  const move = async () => {
    if (!studioId) return;
    setBusy(true);
    try {
      const nid = await moveToStudio(p.id, studioId);
      toast(t('Project is in your studio now'));
      if (nid !== p.id) go(`/p/${nid}`);
    } catch (e: unknown) {
      toast(t('Could not move the project: {msg}', { msg: (e as Error)?.message ?? '' }), { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };
  // closes on Esc and on a click anywhere outside it
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const down = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('keydown', key);
    window.addEventListener('pointerdown', down);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('pointerdown', down);
    };
  }, [open]);
  const workId = item?.kind === 'work' ? item.id : undefined;
  const make = async () => {
    setBusy(true);
    try {
      const { token } = await createReviewLink(p.id, workId);
      const url = `${location.origin}/#/r/${token}${workId ? `/${workId}` : ''}`;
      setLink(url);
      await navigator.clipboard?.writeText(url).catch(() => {});
      toast(t('Review link copied'));
    } catch {
      toast(t('Could not create a link. Try again.'), { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="relative" ref={box}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="lg-btn lg-btn-primary">
        <Link2 size={15} /> <span className="hidden sm:inline">{t('Share')}</span>
      </button>
      <AnimatePresence>
        {open && (
          <Pane strong className="absolute end-0 top-14 z-50 w-[320px] rounded-[22px] p-4">
            <p className="text-[16px] font-bold">{t('Ask for review')}</p>
            {!cloudEnabled || !auth.session ? (
              <p className="mt-2 text-[13.5px] leading-[1.5] text-white/80">{t('Review links need a studio. Sign in, move this project to your studio, and the client can leave notes without an account.')}</p>
            ) : !inStudio ? (
              <>
                <p className="mt-2 text-[13.5px] leading-[1.5] text-white/80">{p.kind === 'demo' ? t('Copy this demo into your studio to try client links.') : t('This project lives only in this browser. Move it to your studio: files upload once, then the client can leave notes.')}</p>
                <button type="button" disabled={busy || !studioId} onClick={move} className="lg-btn lg-btn-primary mt-3 w-full disabled:opacity-60">
                  {busy ? t('Uploading…') : p.kind === 'demo' ? t('Copy to studio') : t('Move to studio')}
                </button>
              </>
            ) : (
              <>
                <p className="mt-2 text-[13.5px] leading-[1.5] text-white/80">{workId ? t('The link opens this work. Guests can pin notes; they cannot edit or see other projects.') : t('The link opens the whole project for notes.')}</p>
                {link ? (
                  <div className="mt-3 flex gap-2">
                    <input readOnly value={link} className="lg-input text-[12px]" dir="ltr" onFocus={(e) => e.currentTarget.select()} aria-label={t('Review link')} />
                    <button type="button" onClick={() => navigator.clipboard?.writeText(link).then(() => toast(t('Link copied')))} className="lg-btn lg-btn-ghost lg-icon shrink-0" aria-label={t('Copy link')}>
                      <Copy size={15} />
                    </button>
                  </div>
                ) : (
                  <button type="button" disabled={busy} onClick={make} className="lg-btn lg-btn-primary mt-3 w-full disabled:opacity-60">
                    {busy ? t('Creating…') : t('Create review link')}
                  </button>
                )}
              </>
            )}
          </Pane>
        )}
      </AnimatePresence>
    </div>
  );
}
