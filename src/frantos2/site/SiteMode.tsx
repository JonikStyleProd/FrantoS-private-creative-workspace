import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  AppWindow,
  Box,
  ChevronDown,
  ChevronUp,
  Columns3,
  Copy,
  CornerLeftUp,
  Eye,
  EyeOff,
  FileText,
  Grid2x2,
  GripVertical,
  Heading,
  HelpCircle,
  History,
  Image as ImageIcon,
  Images,
  Layers,
  LayoutTemplate,
  Mail,
  Megaphone,
  Minus,
  Monitor,
  MousePointerClick,
  MoveVertical,
  Newspaper,
  PanelBottom,
  PanelTop,
  Pilcrow,
  Plus,
  Quote,
  RotateCcw,
  Rows3,
  Send,
  Smartphone,
  Sparkles,
  Tablet,
  Tag,
  TextCursorInput,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { go } from '../route';
import { useWs, ws } from '../ws/store';
import type { Project, SiteNode, SitePage, SiteStyle, SiteTheme } from '../ws/types';
import { AssetThumb, toast, useMedia } from '../ws/kit';
import { previewOnly } from '../ws/media';
import { FilePick, upload } from '../ws/uploads';
import { Pane } from '../glass/kit';
import { FONTS } from '../studio/brand';
import { projectPalette } from '../studio/palette';
import { ColorField, Section, Seg } from '../studio/ui';
import { BLOCKS, ELEMENTS, Env, PAGE_TEMPLATES, TemplateId, pageFrom } from './blocks';
import { BPS, Bp, clone, duplicate, find, hasText, insert, isContainer, locate, move, pathTo, remove, setStyle, slugify, sourceOf, styleAt, update, walk, wrap } from './model';
import { hydrate, renderPage } from './render';
import { makeCtx, useSiteMedia } from './media';
import { COLOR_ROLES, ColorRole, ROLE_LABEL, SPACE, TYPE, TYPE_PX, contrast, spacePx, themeColor, themeFrom } from './theme';
import { useSiteDir, useSiteTr } from './SiteView';
import { pageToReview } from './snapshot';

/**
 * Studio · Site: build a page from ready sections and elements. Everything is a tree styled with
 * tokens; the page answers to three widths, and one renderer draws it here, in the preview and on
 * review links. Sending to review adds a picture of the page as a version of its work.
 */

const TYPE_ICON: Record<SiteNode['type'], React.ComponentType<{ size?: number; className?: string }>> = {
  section: PanelTop,
  stack: Rows3,
  grid: Grid2x2,
  heading: Heading,
  text: Pilcrow,
  button: MousePointerClick,
  media: ImageIcon,
  object: Box,
  divider: Minus,
  spacer: MoveVertical,
  field: TextCursorInput,
};
const TYPE_LABEL: Record<SiteNode['type'], string> = { section: 'Section', stack: 'Column', grid: 'Grid', heading: 'Heading', text: 'Text', button: 'Button', media: 'Picture', object: '3D object', divider: 'Line', spacer: 'Space', field: 'Form field' };
const BLOCK_ICON: Record<string, React.ComponentType<{ size?: number }>> = { header: PanelTop, hero: Sparkles, split: Columns3, cards: Grid2x2, posts: Newspaper, article: FileText, quote: Quote, gallery: Images, prices: Tag, faq: HelpCircle, contact: Mail, cta: Megaphone, footer: PanelBottom };
const BP_ICON: Record<Bp, React.ComponentType<{ size?: number }>> = { sm: Smartphone, md: Tablet, lg: Monitor };

export function useEnv(p: Project): Env {
  const { t } = useI18n();
  const { state } = useWs();
  const pics = useMemo(() => {
    const ok = p.assets.filter((a) => a.ready !== false && (a.kind === 'image' || a.kind === 'video') && !previewOnly(a) && a.format !== 'screen');
    // finished work first, then the references
    return [...ok.filter((a) => !a.isReference), ...ok.filter((a) => a.isReference)].map((a) => a.id);
  }, [p.assets]);
  const name = state.brand?.name || p.title.split(/\s[·|—–-]\s/)[0].trim() || 'Studio';
  return { t, img: (i) => (pics.length ? pics[i % pics.length] : undefined), name };
}

const nodeLabel = (n: SiteNode, t: (s: string) => string, tr?: (s: string) => string) => n.name ? t(n.name) : n.text ? (tr ? tr(n.text) : n.text).split('\n')[0].slice(0, 28) : t(TYPE_LABEL[n.type]);

export function SiteMode({ p, q, setQ }: { p: Project; q: URLSearchParams; setQ: (patch: Record<string, string | undefined>) => void }) {
  const { t, dir } = useI18n();
  const { state } = useWs();
  const env = useEnv(p);
  const pages = p.pages ?? [];
  const page = pages.find((x) => x.id === q.get('pg')) ?? pages[0];
  const create = (tid: TemplateId) => {
    const tpl = PAGE_TEMPLATES.find((x) => x.id === tid)!;
    const title = pages.length ? t(tpl.label) : env.name;
    const id = ws.addPage(p.id, { title, slug: slugify(title), dir, theme: themeFrom(state.brand, projectPalette(p)), root: pageFrom(tid, env) });
    setQ({ pg: id });
  };
  if (!page)
    return (
      <div className="flex h-full items-center justify-center overflow-y-auto p-6 pt-[84px]">
        <Pane className="w-full max-w-[680px] rounded-[28px] p-7">
          <AppWindow className="mx-auto" />
          <p className="mt-3 text-center text-[21px] font-bold">{t('Build a page from ready sections')}</p>
          <p className="mx-auto mt-2 max-w-[460px] text-center text-[14.5px] leading-[1.5] text-white/80">{t('A site, a blog post or a landing page: pick a start, then change the words, swap the pictures and check it on a phone.')}</p>
          <TemplateGrid onPick={create} />
        </Pane>
      </div>
    );
  return <PageEditor key={page.id} p={p} stored={page} onPick={(id) => setQ({ pg: id })} onCreate={create} />;
}

function TemplateGrid({ onPick }: { onPick: (id: TemplateId) => void }) {
  const { t } = useI18n();
  return (
    <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {PAGE_TEMPLATES.map((x) => (
        <button key={x.id} type="button" onClick={() => onPick(x.id)} className="flex items-start gap-3 rounded-[18px] bg-white/10 p-3 text-start transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-white/15">{x.id === 'blank' ? <Plus size={16} /> : x.id === 'blog' ? <Newspaper size={16} /> : x.id === 'article' ? <FileText size={16} /> : x.id === 'portfolio' ? <Images size={16} /> : <LayoutTemplate size={16} />}</span>
          <span className="min-w-0">
            <span className="block text-[14px] font-bold">{t(x.label)}</span>
            <span className="block text-[12.5px] leading-[1.35] text-white/70">{t(x.hint)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/* ───────── editor ───────── */

type Rect = { x: number; y: number; w: number; h: number };
type DragSrc = { kind: 'new'; make: () => SiteNode; label: string; section: boolean } | { kind: 'move'; id: string; label: string; section: boolean };
let clipboard: SiteNode | null = null;

function PageEditor({ p, stored, onPick, onCreate }: { p: Project; stored: SitePage; onPick: (id: string) => void; onCreate: (t: TemplateId) => void }) {
  const { t } = useI18n();
  const narrow = useMedia('(max-width: 900px)');
  const env = useEnv(p);
  const tr = useSiteTr(p);

  /* draft + commit (outside changes such as undo win when nothing is pending) */
  const [pg, setPg] = useState<SitePage>(stored);
  const pgRef = useRef(pg);
  pgRef.current = pg;
  const pending = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const firstLabel = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!pending.current) setPg(stored);
  }, [stored]);
  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    if (!pending.current) return;
    pending.current = false;
    const x = pgRef.current;
    ws.patchPage(p.id, x.id, { root: x.root, theme: x.theme, title: x.title, slug: x.slug, dir: x.dir }, firstLabel.current);
    firstLabel.current = undefined;
  }, [p.id]);
  const commit = useCallback(
    (patch: Partial<SitePage>, label = 'Page edited', now = true) => {
      const next = { ...pgRef.current, ...patch };
      pgRef.current = next;
      setPg(next);
      pending.current = true;
      firstLabel.current ??= label;
      window.clearTimeout(timer.current);
      if (now) flush();
      else timer.current = window.setTimeout(flush, 350);
    },
    [flush]
  );
  useEffect(() => () => flush(), [flush]);
  const setRoot = (root: SiteNode[], label: string, now = true) => commit({ root }, label, now);

  /* selection, width */
  const [sel, setSel] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [bp, setBpState] = useState<Bp>(() => (localStorage.getItem('frantos-site-bp') as Bp) || (window.innerWidth < 700 ? 'sm' : 'lg'));
  const setBp = (b: Bp) => (localStorage.setItem('frantos-site-bp', b), setBpState(b));
  const bpDef = BPS.find((b) => b.id === bp)!;
  const node = sel ? find(pg.root, sel) : undefined;
  useEffect(() => {
    if (sel && !node) setSel(null);
  }, [sel, node]);

  /* render */
  const media = useSiteMedia(p, pg.root);
  const view = useSiteDir(p, pg);
  const { css, html } = useMemo(() => renderPage(view, makeCtx(p, media, { mode: 'container', edit: true, vh: `${bpDef.h}px`, tr })), [view, p, media, bpDef.h, tr]);
  const scroller = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => (host.current ? hydrate(host.current) : undefined), [html]);

  // fit the width into the free area; follow the page height
  const [scale, setScale] = useState(1);
  const [frameH, setFrameH] = useState(900);
  const [tick, setTick] = useState(0);
  useLayoutEffect(() => {
    const sc = scroller.current;
    const fr = frame.current;
    if (!sc || !fr) return;
    const fit = () => setScale(Math.min(1, (sc.clientWidth - (narrow ? 16 : 48)) / bpDef.w));
    fit();
    const ro = new ResizeObserver(() => {
      fit();
      setFrameH(fr.offsetHeight);
      setTick((x) => x + 1);
    });
    ro.observe(sc);
    ro.observe(fr);
    return () => ro.disconnect();
  }, [bpDef.w, narrow]);

  const elOf = useCallback((id: string | null) => (id ? host.current?.querySelector<HTMLElement>(`[data-n="${CSS.escape(id)}"]`) ?? null : null), []);
  const rel = useCallback((el: Element): Rect => {
    const r = el.getBoundingClientRect();
    const s = stage.current!.getBoundingClientRect();
    return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
  }, []);
  const [boxes, setBoxes] = useState<{ sel?: Rect; hover?: Rect; pad?: { t: number; r: number; b: number; l: number } }>({});
  useLayoutEffect(() => {
    if (!stage.current) return;
    const se = elOf(sel);
    const he = hover && hover !== sel ? elOf(hover) : null;
    let pad;
    if (se && node && isContainer(node)) {
      const cs = getComputedStyle(se);
      pad = { t: parseFloat(cs.paddingTop) * scale, r: parseFloat(cs.paddingRight) * scale, b: parseFloat(cs.paddingBottom) * scale, l: parseFloat(cs.paddingLeft) * scale };
    }
    setBoxes({ sel: se && se.offsetParent !== null ? rel(se) : undefined, hover: he && he.offsetParent !== null ? rel(he) : undefined, pad });
  }, [sel, hover, html, scale, frameH, tick, bp, elOf, rel, node]);
  // bring a new or picked node into view
  const reveal = (id: string) =>
    requestAnimationFrame(() => {
      const el = elOf(id);
      const sc = scroller.current;
      if (!el || !sc) return;
      const r = el.getBoundingClientRect();
      const s = sc.getBoundingClientRect();
      if (r.top < s.top + 40 || r.top > s.bottom - 80) sc.scrollBy({ top: r.top - s.top - 120, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });

  /* inline text editing */
  const startEdit = (id: string) => {
    const n = find(pgRef.current.root, id);
    const el = elOf(id);
    if (!n || !el || !hasText(n)) return;
    const target = n.type === 'field' ? el.querySelector('span') ?? el : el;
    const shown = target.innerText;
    try {
      target.contentEditable = 'plaintext-only';
    } catch {
      /* older engines */
    }
    if (target.contentEditable !== 'plaintext-only') target.contentEditable = 'true';
    target.spellcheck = true;
    setEditing(id);
    setSel(id);
    target.focus();
    const r = document.createRange();
    r.selectNodeContents(target);
    const s = window.getSelection();
    s?.removeAllRanges();
    s?.addRange(r);
    const done = (save: boolean) => {
      target.removeEventListener('keydown', onKey);
      target.removeEventListener('blur', onBlur);
      target.removeEventListener('input', onInput);
      const text = target.innerText.replace(/\n+$/, '');
      target.removeAttribute('contenteditable');
      setEditing(null);
      if (save && text !== shown) setRoot(update(pgRef.current.root, id, (x) => ({ ...x, text })), 'Text changed');
      else if (!save) target.innerText = shown;
    };
    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Escape') (e.preventDefault(), done(true));
      else if (e.key === 'Enter' && (n.type !== 'text' || e.metaKey || e.ctrlKey) && !e.shiftKey) (e.preventDefault(), done(true));
    };
    const onBlur = () => done(true);
    const onInput = () => setTick((x) => x + 1);
    target.addEventListener('keydown', onKey);
    target.addEventListener('blur', onBlur);
    target.addEventListener('input', onInput);
  };

  /* tree actions */
  const select = (id: string | null) => {
    setSel(id);
    if (id) reveal(id);
  };
  const removeSel = () => {
    if (!sel) return;
    const at = locate(pg.root, sel);
    setRoot(remove(pg.root, sel), 'Element removed');
    toast(t('Removed'), { undo: true });
    const parent = at?.parent || null;
    setSel(parent);
  };
  const dupSel = () => {
    if (!sel) return;
    const r = duplicate(pg.root, sel);
    setRoot(r.nodes, 'Element duplicated');
    select(r.id);
  };
  const nudge = (d: -1 | 1) => {
    if (!sel) return;
    const at = locate(pg.root, sel);
    if (!at) return;
    const siblings = at.parent ? find(pg.root, at.parent)?.children ?? [] : pg.root;
    const j = at.index + d;
    if (j < 0 || j >= siblings.length) return;
    setRoot(move(pg.root, sel, at.parent, d > 0 ? j + 1 : j), 'Order changed');
    reveal(sel);
  };
  const parentOf = (id: string) => locate(pg.root, id)?.parent || null;

  /** where a new element goes on a click: into the picked container, after the picked element, or at the end */
  const placeNew = (n: SiteNode) => {
    const root = pgRef.current.root;
    if (n.type === 'section') {
      const top = sel ? pathTo(root, sel)[0] : undefined;
      const i = top ? root.findIndex((x) => x.id === top.id) + 1 : root.length;
      setRoot(insert(root, '', i, n), 'Section added');
      return select(n.id);
    }
    const cur = sel ? find(root, sel) : undefined;
    if (cur && isContainer(cur)) {
      setRoot(insert(root, cur.id, (cur.children ?? []).length, n), 'Element added');
    } else if (cur) {
      const at = locate(root, cur.id)!;
      setRoot(insert(root, at.parent, at.index + 1, n), 'Element added');
    } else if (root.length) {
      const last = root[root.length - 1];
      setRoot(insert(root, last.id, (last.children ?? []).length, n), 'Element added');
    } else {
      const sec: SiteNode = { id: n.id + 's', type: 'section', name: 'Section', children: [n] };
      setRoot([sec], 'Element added');
    }
    select(n.id);
  };
  const paste = () => {
    if (!clipboard) return;
    const c = clone(clipboard);
    placeNew(c);
  };

  /* keyboard */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing) return;
      const tgt = e.target as HTMLElement;
      if (tgt.closest('input,textarea,select,[contenteditable],[role="dialog"]')) return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && k === 'c' && node) return void (clipboard = node);
      if (mod && k === 'x' && node) return void ((clipboard = node), removeSel());
      if (mod && k === 'v' && clipboard) return void (e.preventDefault(), paste());
      if (!sel) return;
      if (mod && k === 'd') return void (e.preventDefault(), dupSel());
      if (mod && k === 'g') {
        e.preventDefault();
        const r = wrap(pg.root, sel);
        setRoot(r.nodes, 'Wrapped in a column');
        return select(r.id);
      }
      if (mod) return;
      if (e.key === 'Delete' || e.key === 'Backspace') return void (e.preventDefault(), removeSel());
      if (e.key === 'Escape') return void (e.preventDefault(), setSel(parentOf(sel)));
      if (e.key === 'Enter') {
        e.preventDefault();
        if (node && hasText(node)) return startEdit(sel);
        if (node?.children?.length) return select(node.children[0].id);
      }
      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) return void (e.preventDefault(), nudge(e.key === 'ArrowUp' ? -1 : 1));
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const at = locate(pg.root, sel)!;
        const sib = at.parent ? find(pg.root, at.parent)?.children ?? [] : pg.root;
        const nx = sib[at.index + (e.key === 'ArrowUp' ? -1 : 1)];
        if (nx) select(nx.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* drag: from the panel (new) or the handle (move) */
  const [ghost, setGhost] = useState<{ x: number; y: number; label: string } | null>(null);
  const [drop, setDrop] = useState<{ parent: string; index: number; line: Rect } | null>(null);
  const dropRef = useRef(drop);
  dropRef.current = drop;
  const computeDrop = (x: number, y: number, src: DragSrc) => {
    const hostEl = host.current;
    const st = stage.current;
    if (!hostEl || !st) return null;
    const root = pgRef.current.root;
    const dragged = src.kind === 'move' ? elOf(src.id) : null;
    const rtl = view.dir === 'rtl';
    const line = (r: Rect) => r;
    if (src.section) {
      const secs = Array.from(hostEl.querySelectorAll<HTMLElement>(':scope > .fs-page > [data-n]')).filter((s) => s !== dragged);
      const pageEl = hostEl.querySelector('.fs-page');
      const fr = frame.current!.getBoundingClientRect();
      if (x < fr.left - 40 || x > fr.right + 40) return null;
      let idx = secs.findIndex((s) => {
        const r = s.getBoundingClientRect();
        return y < r.top + r.height / 2;
      });
      if (idx < 0) idx = secs.length;
      const ref = secs[idx] ?? secs[secs.length - 1];
      const rr = ref ? rel(ref) : pageEl ? rel(pageEl) : { x: 0, y: 0, w: st.clientWidth, h: 0 };
      const yy = secs[idx] ? rr.y : rr.y + rr.h;
      const id = secs[idx]?.dataset.n;
      return { parent: '', index: id ? root.findIndex((n) => n.id === id) : root.length, line: line({ x: rr.x, y: yy - 2, w: rr.w, h: 4 }) };
    }
    let el = document.elementFromPoint(x, y) as HTMLElement | null;
    if (!el || !hostEl.contains(el)) return null;
    let c: HTMLElement | null = el.closest('[data-n]');
    let n: SiteNode | undefined;
    while (c) {
      n = find(root, c.dataset.n!);
      if (n && isContainer(n) && !(dragged && dragged.contains(c))) break;
      c = c.parentElement?.closest('[data-n]') ?? null;
    }
    if (!c || !n) return null;
    const box = n.type === 'section' ? (c.querySelector(':scope > .in') as HTMLElement) : c;
    const kids = Array.from(box.children).filter((k) => (k as HTMLElement).dataset?.n && k !== dragged) as HTMLElement[];
    const cs = getComputedStyle(box);
    const kind = cs.display === 'grid' ? 'grid' : cs.flexDirection.startsWith('row') ? 'row' : 'col';
    let idx = kids.findIndex((k) => {
      const r = k.getBoundingClientRect();
      const before = rtl ? x > r.left + r.width / 2 : x < r.left + r.width / 2;
      if (kind === 'col') return y < r.top + r.height / 2;
      if (kind === 'row') return before;
      return r.top > y || (r.bottom > y && before);
    });
    if (idx < 0) idx = kids.length;
    const br = rel(box);
    let ln: Rect;
    if (!kids.length) ln = { x: br.x + 8, y: br.y + br.h / 2 - 2, w: Math.max(20, br.w - 16), h: 4 };
    else if (kind === 'col') {
      const r = rel(kids[Math.min(idx, kids.length - 1)]);
      ln = { x: br.x, y: idx < kids.length ? r.y - 3 : r.y + r.h + 1, w: br.w, h: 4 };
    } else {
      const r = rel(kids[Math.min(idx, kids.length - 1)]);
      const startSide = idx < kids.length;
      const xx = rtl ? (startSide ? r.x + r.w + 1 : r.x - 3) : startSide ? r.x - 3 : r.x + r.w + 1;
      ln = { x: xx, y: r.y, w: 4, h: r.h };
    }
    const id = kids[idx]?.dataset.n;
    const children = n.children ?? [];
    return { parent: n.id, index: id ? children.findIndex((k) => k.id === id) : children.length, line: ln };
  };
  const startDrag = (e: React.PointerEvent, src: DragSrc, onClick?: () => void) => {
    if (e.button !== 0) return;
    const x0 = e.clientX;
    const y0 = e.clientY;
    let active = false;
    const mv = (ev: PointerEvent) => {
      if (!active && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 6) {
        active = true;
        document.body.style.userSelect = 'none';
        if (narrow) setSheet(null);
      }
      if (!active) return;
      setGhost({ x: ev.clientX, y: ev.clientY, label: src.label });
      setDrop(computeDrop(ev.clientX, ev.clientY, src));
    };
    const up = () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.body.style.userSelect = '';
      const d = dropRef.current;
      setGhost(null);
      setDrop(null);
      if (!active) return onClick?.();
      if (!d) return;
      const root = pgRef.current.root;
      if (src.kind === 'new') {
        const nn = src.make();
        setRoot(insert(root, d.parent, d.index, nn), src.section ? 'Section added' : 'Element added');
        select(nn.id);
      } else {
        setRoot(move(root, src.id, d.parent, d.index), 'Moved');
        select(src.id);
      }
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  /* canvas pointer */
  const onFrameMove = (e: React.PointerEvent) => {
    if (ghost) return;
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-n]')?.dataset.n ?? null;
    if (id !== hover) setHover(id);
  };
  const onFrameClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (editing) return;
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-n]')?.dataset.n ?? null;
    if (id && id === sel && node && hasText(node)) return startEdit(id);
    setSel(id);
  };
  const onFrameDouble = (e: React.MouseEvent) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-n]')?.dataset.n;
    const n = id ? find(pg.root, id) : undefined;
    if (id && n && hasText(n) && editing !== id) startEdit(id);
  };

  /* review */
  const [sending, setSending] = useState(false);
  const toReview = async () => {
    flush();
    setSending(true);
    try {
      const r = await pageToReview(p, pgRef.current, media, tr);
      toast(t('Sent to review as a new version'));
      return r;
    } catch (err) {
      console.warn(err);
      toast(t('The page could not be captured. Try again.'), { tone: 'error' });
    } finally {
      setSending(false);
    }
  };

  /* panels */
  const [tab, setTab] = useState<'add' | 'layers'>('add');
  const [sheet, setSheet] = useState<null | 'add' | 'layers' | 'props'>(null);
  const [pagesOpen, setPagesOpen] = useState(false);
  const objects = p.objects ?? [];

  const addList = (
    <div className="space-y-4">
      <div>
        <p className="lg-label mb-2 px-1">{t('Sections')}</p>
        <div className="grid grid-cols-1 gap-1.5">
          {BLOCKS.map((b) => {
            const Ic = BLOCK_ICON[b.id] ?? PanelTop;
            return (
              <button
                key={b.id}
                type="button"
                onPointerDown={(e) => startDrag(e, { kind: 'new', make: () => b.make(env), label: t(b.label), section: true }, () => (placeNew(b.make(env)), setSheet(null)))}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), placeNew(b.make(env)))}
                className="flex touch-none items-center gap-2.5 rounded-[14px] bg-white/[.07] p-2 text-start hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                title={t('Click to add after the picked section, or drag onto the page')}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white/15">
                  <Ic size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-bold">{t(b.label)}</span>
                  <span className="block truncate text-[11.5px] text-white/60">{t(b.hint)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="lg-label mb-2 px-1">{t('Elements')}</p>
        <div className="grid grid-cols-3 gap-1.5">
          {ELEMENTS.filter((x) => x.id !== 'object' || objects.length).map((x) => {
            const Ic = TYPE_ICON[x.id === 'image' ? 'media' : x.id === 'row' || x.id === 'column' ? 'stack' : (x.id as SiteNode['type'])] ?? Box;
            const make = () => x.make(env, objects[0]?.id);
            return (
              <button
                key={x.id}
                type="button"
                onPointerDown={(e) => startDrag(e, { kind: 'new', make, label: t(x.label), section: false }, () => (placeNew(make()), setSheet(null)))}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), placeNew(make()))}
                className="flex min-h-[62px] touch-none flex-col items-center justify-center gap-1 rounded-[14px] bg-white/[.07] px-1 text-center text-[11.5px] font-bold leading-tight hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                {x.id === 'row' ? <Columns3 size={16} /> : <Ic size={16} />}
                {t(x.label)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const layerRows: { n: SiteNode; depth: number }[] = [];
  walk(pg.root, (n, _p, depth) => layerRows.push({ n, depth }));
  const layersList = (
    <ol className="space-y-0.5" aria-label={t('Layers')}>
      {layerRows.map(({ n, depth }) => {
        const Ic = TYPE_ICON[n.type];
        const hidden = !!styleAt(n, bp).hide;
        return (
          <li key={n.id} className={`group flex items-center rounded-[10px] ${n.id === sel ? 'bg-white/20' : 'hover:bg-white/10'}`} onPointerEnter={() => setHover(n.id)} onPointerLeave={() => setHover(null)}>
            <button type="button" onClick={() => (select(n.id), setSheet(null))} aria-current={n.id === sel ? 'true' : undefined} className={`flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pe-1 text-start text-[12.5px] ${hidden ? 'opacity-45' : ''} ${n.type === 'section' ? 'font-bold' : ''}`} style={{ paddingInlineStart: 8 + depth * 14 }}>
              <Ic size={13} className="shrink-0 opacity-70" />
              <span dir="auto" className="truncate">
                {nodeLabel(n, t, tr)}
              </span>
            </button>
            <button type="button" onClick={() => setRoot(update(pg.root, n.id, (x) => setStyle(x, bp, { hide: hidden ? (bp === 'lg' ? undefined : false) : true })), hidden ? 'Shown' : 'Hidden')} className={`lg-btn lg-btn-plain h-7 min-h-0 w-7 p-0 ${hidden ? '' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'}`} aria-label={hidden ? t('Show at this width') : t('Hide at this width')} aria-pressed={hidden}>
              {hidden ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </li>
        );
      })}
      {!layerRows.length && <li className="px-2 py-3 text-[12.5px] text-white/60">{t('The page is empty. Add a section.')}</li>}
    </ol>
  );

  const pagesMenu = (
    <div className="relative">
      <button type="button" onClick={() => setPagesOpen((v) => !v)} aria-expanded={pagesOpen} className="flex w-full items-center gap-2 rounded-[14px] bg-white/10 px-3 py-2 text-start hover:bg-white/15">
        <FileText size={15} className="shrink-0" />
        <span dir="auto" className="min-w-0 flex-1 truncate text-[13.5px] font-bold">
          {tr ? tr(pg.title) : pg.title}
        </span>
        <span className="text-[11.5px] text-white/60">{(p.pages ?? []).length}</span>
        <ChevronDown size={14} className={pagesOpen ? 'rotate-180' : ''} />
      </button>
      {pagesOpen && (
        <Pane strong className="lg-pop absolute inset-x-0 top-full z-40 mt-1.5 max-h-[60vh] overflow-y-auto rounded-[18px] p-2 lg-scroll">
          {(p.pages ?? []).map((x) => (
            <button key={x.id} type="button" onClick={() => (flush(), onPick(x.id), setPagesOpen(false))} aria-current={x.id === pg.id ? 'true' : undefined} className={`flex w-full items-center gap-2 rounded-[12px] px-2.5 py-2 text-start text-[13px] ${x.id === pg.id ? 'bg-white/20 font-bold' : 'hover:bg-white/10'}`}>
              <FileText size={13} /> <span dir="auto" className="truncate">{tr ? tr(x.title) : x.title}</span>
            </button>
          ))}
          <p className="lg-label mt-2 px-2">{t('New page')}</p>
          {PAGE_TEMPLATES.map((x) => (
            <button key={x.id} type="button" onClick={() => (flush(), onCreate(x.id), setPagesOpen(false))} className="flex w-full items-center gap-2 rounded-[12px] px-2.5 py-1.5 text-start text-[12.5px] hover:bg-white/10">
              <Plus size={13} /> {t(x.label)}
            </button>
          ))}
        </Pane>
      )}
    </div>
  );

  const leftPanel = (
    <>
      {pagesMenu}
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-[14px] bg-white/10 p-1">
        {(
          [
            ['add', t('Add'), Plus],
            ['layers', t('Layers'), Layers],
          ] as const
        ).map(([k, l, Ic]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex min-h-[34px] items-center justify-center gap-1.5 rounded-[10px] text-[12.5px] font-bold ${tab === k ? 'bg-white text-[#11151a]' : 'text-white/85 hover:bg-white/10'}`}>
            <Ic size={14} /> {l}
          </button>
        ))}
      </div>
      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 lg-scroll">{tab === 'add' ? addList : layersList}</div>
    </>
  );

  const inspector = node ? (
    <NodeInspector key={node.id} p={p} n={node} bp={bp} theme={pg.theme} tr={tr} path={pathTo(pg.root, node.id)} onSelect={select} onNode={(nn, label, now) => setRoot(update(pgRef.current.root, nn.id, () => nn), label, now)} parentNode={(() => { const pid = parentOf(node.id); return pid ? find(pg.root, pid) : undefined; })()} />
  ) : (
    <PageInspector p={p} pg={pg} commit={commit} sending={sending} onReview={toReview} />
  );

  const toolbarPos = boxes.sel ? { left: Math.max(0, boxes.sel.x), top: boxes.sel.y > 40 ? boxes.sel.y - 38 : boxes.sel.y + 6 } : null;

  return (
    <>
      {/* canvas */}
      <div ref={scroller} className={`absolute overflow-auto lg-scroll ${narrow ? 'inset-x-0 bottom-[74px] top-[128px]' : 'bottom-0 end-[336px] start-[288px] top-[136px]'}`} onPointerDown={(e) => e.target === e.currentTarget && setSel(null)}>
        <div className="flex min-h-full justify-center pb-24 pt-2" onPointerDown={(e) => e.target === e.currentTarget && setSel(null)} dir="ltr">
          <div ref={stage} className="relative shrink-0" style={{ width: bpDef.w * scale, height: frameH * scale }}>
            <div
              ref={frame}
              className="absolute left-0 top-0 origin-top-left overflow-hidden rounded-[6px] shadow-[0_30px_90px_rgba(0,0,0,.4)]"
              style={{ width: bpDef.w, minHeight: bpDef.h, transform: `scale(${scale})`, containerType: 'inline-size', containerName: 'fs', background: pg.theme.bg }}
              onPointerMove={onFrameMove}
              onPointerLeave={() => setHover(null)}
              onClick={onFrameClick}
              onDoubleClick={onFrameDouble}
            >
              <style>{css}</style>
              <div ref={host} dangerouslySetInnerHTML={{ __html: html }} />
            </div>
            {/* overlays */}
            {boxes.hover && !ghost && <div className="pointer-events-none absolute rounded-[2px] outline outline-1 outline-[#4f8bff]/80" style={{ left: boxes.hover.x, top: boxes.hover.y, width: boxes.hover.w, height: boxes.hover.h }} />}
            {boxes.sel && !editing && (
              <>
                <div className="pointer-events-none absolute rounded-[2px] outline outline-2 outline-[#4f8bff]" style={{ left: boxes.sel.x, top: boxes.sel.y, width: boxes.sel.w, height: boxes.sel.h }} />
                {boxes.pad && (
                  <div className="pointer-events-none absolute" style={{ left: boxes.sel.x, top: boxes.sel.y, width: boxes.sel.w, height: boxes.sel.h }}>
                    <div className="absolute inset-x-0 top-0 bg-[#4f8bff]/15" style={{ height: boxes.pad.t }} />
                    <div className="absolute inset-x-0 bottom-0 bg-[#4f8bff]/15" style={{ height: boxes.pad.b }} />
                    <div className="absolute start-0 bg-[#4f8bff]/15" style={{ top: boxes.pad.t, bottom: boxes.pad.b, width: boxes.pad.l }} />
                    <div className="absolute end-0 bg-[#4f8bff]/15" style={{ top: boxes.pad.t, bottom: boxes.pad.b, width: boxes.pad.r }} />
                  </div>
                )}
              </>
            )}
            {node && toolbarPos && !editing && !ghost && (
              <div className="absolute z-10 flex items-center gap-0.5 rounded-full bg-[#4f8bff] p-0.5 text-white shadow-lg" style={toolbarPos}>
                <button type="button" onPointerDown={(e) => startDrag(e, { kind: 'move', id: node.id, label: nodeLabel(node, t, tr), section: node.type === 'section' })} className="flex h-7 w-7 cursor-grab touch-none items-center justify-center rounded-full hover:bg-white/20" aria-label={t('Drag to move')} title={t('Drag to move')}>
                  <GripVertical size={14} />
                </button>
                <span dir="auto" className="max-w-[160px] truncate px-1 text-[12px] font-bold">
                  {nodeLabel(node, t, tr)}
                </span>
                {parentOf(node.id) && (
                  <button type="button" onClick={() => select(parentOf(node.id))} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/20" aria-label={t('Select the parent (Esc)')} title={t('Select the parent (Esc)')}>
                    <CornerLeftUp size={14} />
                  </button>
                )}
                <button type="button" onClick={() => nudge(-1)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/20" aria-label={t('Move earlier (Alt ↑)')} title={t('Move earlier (Alt ↑)')}>
                  <ChevronUp size={15} />
                </button>
                <button type="button" onClick={() => nudge(1)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/20" aria-label={t('Move later (Alt ↓)')} title={t('Move later (Alt ↓)')}>
                  <ChevronDown size={15} />
                </button>
                <button type="button" onClick={dupSel} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/20" aria-label={t('Duplicate (⌘D)')} title={t('Duplicate (⌘D)')}>
                  <Copy size={13} />
                </button>
                <button type="button" onClick={removeSel} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/20" aria-label={t('Remove (Delete)')} title={t('Remove (Delete)')}>
                  <Trash2 size={13} />
                </button>
              </div>
            )}
            {drop && <div className="pointer-events-none absolute z-20 rounded-full bg-[#ff4fa3] shadow-[0_0_0_2px_rgba(255,255,255,.7)]" style={{ left: drop.line.x, top: drop.line.y, width: drop.line.w, height: drop.line.h }} />}
          </div>
        </div>
      </div>

      {/* width + actions */}
      <div className={`absolute z-20 ${narrow ? 'inset-x-3 top-[72px] flex justify-center' : 'start-1/2 top-[84px] -translate-x-1/2 rtl:translate-x-1/2'}`}>
        <Pane className="flex items-center gap-1 rounded-full p-1">
          <div role="radiogroup" aria-label={t('Width')} className="flex items-center gap-0.5">
            {BPS.map((b) => {
              const Ic = BP_ICON[b.id];
              return (
                <button key={b.id} type="button" role="radio" aria-checked={bp === b.id} onClick={() => setBp(b.id)} title={b.id === 'lg' ? `${t(b.label)} · ${b.w}` : `${t(b.label)} · ${b.w} — ${t('changes here apply to this width and narrower')}`} className={`flex min-h-[38px] items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-bold ${bp === b.id ? (b.id === 'lg' ? 'bg-white text-[#11151a]' : 'lg-dark bg-[#4f8bff] text-white') : 'text-white/80 hover:bg-white/10'}`}>
                  <Ic size={15} /> <span className={narrow ? 'sr-only' : 'hidden xl:inline'}>{t(b.label)}</span>
                  <span className="tabular-nums opacity-60 max-sm:hidden">{b.w}</span>
                </button>
              );
            })}
          </div>
          <span className="mx-0.5 h-5 w-px bg-white/20" />
          <button type="button" onClick={() => (flush(), go(`/site/${p.id}/${pg.id}?w=${bp}`))} className="lg-btn lg-btn-plain min-h-[38px] text-[12.5px]" aria-label={t('Preview')} title={t('Open the live page')}>
            <Eye size={15} /> <span className="max-lg:hidden">{t('Preview')}</span>
          </button>
          <button type="button" disabled={sending} onClick={toReview} aria-label={t('To review')} className="lg-btn lg-btn-primary min-h-[38px] text-[12.5px] disabled:opacity-60" title={t('A picture of the page becomes a new version for review')}>
            <Send size={14} /> <span className="max-sm:hidden">{sending ? t('Capturing…') : t('To review')}</span>
          </button>
        </Pane>
      </div>
      {!narrow ? (
        <>
          <Pane as="aside" aria-label={t('Sections and layers')} className="absolute bottom-4 start-4 top-[84px] z-20 flex w-[264px] flex-col gap-3 overflow-hidden rounded-[24px] p-3">
            {leftPanel}
          </Pane>
          <Pane as="aside" aria-label={t('Inspector')} className="absolute bottom-4 end-4 top-[84px] z-20 w-[304px] overflow-y-auto rounded-[24px] p-4 lg-scroll">
            {inspector}
          </Pane>
        </>
      ) : (
        <>
          <Pane as="nav" aria-label={t('Inspector')} className="absolute inset-x-3 bottom-3 z-20 flex gap-1 rounded-full p-1.5">
            {(
              [
                ['add', t('Add')],
                ['layers', t('Layers')],
                ['props', node ? t('Element') : t('Page')],
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setSheet(sheet === k ? null : k)} aria-expanded={sheet === k} className={`min-h-[44px] flex-1 rounded-full text-[13px] font-bold ${sheet === k ? 'bg-white text-[#11151a]' : 'text-white/85'}`}>
                {l}
              </button>
            ))}
          </Pane>
          <AnimatePresence>
            {sheet && (
              <Pane strong key="sheet" className="fixed inset-x-2 bottom-[74px] z-30 flex max-h-[58%] flex-col gap-3 overflow-y-auto rounded-[24px] p-4 lg-scroll">
                <div className="flex items-center justify-between">
                  <p className="text-[15px] font-extrabold">{sheet === 'add' ? t('Add') : sheet === 'layers' ? t('Layers') : node ? t('Element') : t('Page')}</p>
                  <button type="button" onClick={() => setSheet(null)} className="lg-btn lg-btn-plain lg-icon -me-2 h-9 min-h-0 w-9" aria-label={t('Close')}>
                    <X size={16} />
                  </button>
                </div>
                {sheet === 'add' ? (
                  <>
                    {pagesMenu}
                    {addList}
                  </>
                ) : sheet === 'layers' ? (
                  layersList
                ) : (
                  inspector
                )}
              </Pane>
            )}
          </AnimatePresence>
        </>
      )}
      {ghost && (
        <div className="pointer-events-none fixed z-[80] -translate-x-1/2 -translate-y-[130%] rounded-full bg-[#ff4fa3] px-3 py-1.5 text-[12.5px] font-bold text-white shadow-lg" style={{ left: ghost.x, top: ghost.y }}>
          {ghost.label}
        </div>
      )}
    </>
  );
}

/* ───────── inspector parts ───────── */

function Ctl({ label, over, onReset, children }: { label: string; over?: Bp | null; onReset?: () => void; children: React.ReactNode }) {
  const { t } = useI18n();
  const mark = over === 'md' || over === 'sm';
  return (
    <div>
      <div className="mb-1.5 flex min-h-[20px] items-center gap-1.5 text-[12px] text-white/75">
        <span>{label}</span>
        {mark && (
          <button type="button" onClick={onReset} className="ms-auto inline-flex items-center gap-1 rounded-full bg-[#4f8bff] px-2 py-0.5 text-[10.5px] font-bold text-white" title={t('Use the wider layout’s value')}>
            {t(over === 'sm' ? 'Phone' : 'Tablet')} <RotateCcw size={10} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Roles({ value, theme, onChange, allowNone }: { value?: string; theme: SiteTheme; onChange: (c: string | undefined) => void; allowNone?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-1.5">
      {allowNone && (
        <button type="button" onClick={() => onChange(undefined)} aria-pressed={!value} title={t('None')} aria-label={t('None')} className={`h-7 w-7 rounded-full bg-[linear-gradient(135deg,transparent_45%,#ff4f4f_45%,#ff4f4f_55%,transparent_55%)] ring-1 ring-white/30 ${!value ? 'ring-2 ring-white ring-offset-2 ring-offset-black/40' : ''}`} />
      )}
      {COLOR_ROLES.map((r) => (
        <button key={r} type="button" onClick={() => onChange(r)} aria-pressed={value === r} title={t(ROLE_LABEL[r])} aria-label={t(ROLE_LABEL[r])} className={`h-7 w-7 rounded-full ring-1 ring-white/30 transition-transform hover:scale-110 ${value === r ? 'ring-2 ring-white ring-offset-2 ring-offset-black/40' : ''}`} style={{ background: theme[r] }} />
      ))}
    </div>
  );
}

const spaceOpts = SPACE.map((s) => ({ id: s, label: String(spacePx(s)) }));

function NodeInspector({ p, n, bp, theme, tr, path, parentNode, onNode, onSelect }: { p: Project; n: SiteNode; bp: Bp; theme: SiteTheme; tr?: (s: string) => string; path: SiteNode[]; parentNode?: SiteNode; onNode: (n: SiteNode, label: string, now?: boolean) => void; onSelect: (id: string | null) => void }) {
  const { t } = useI18n();
  const st = styleAt(n, bp);
  const setS = (patch: Partial<SiteStyle>, now = true) => onNode(setStyle(n, bp, patch), 'Style changed', now);
  const set = (patch: Partial<SiteNode>, now = false) => onNode({ ...n, ...patch }, 'Content changed', now);
  const over = (k: keyof SiteStyle) => sourceOf(n, bp, k);
  const reset = (k: keyof SiteStyle) => () => onNode(setStyle(n, bp, { [k]: undefined }), 'Style changed');
  const C = (k: keyof SiteStyle, label: string, child: React.ReactNode) => (
    <Ctl label={label} over={over(k)} onReset={reset(k)}>
      {child}
    </Ctl>
  );
  const textish = hasText(n) || isContainer(n);
  const shown = (s?: string) => (s && tr ? tr(s) : s ?? '');
  const Ic = TYPE_ICON[n.type];

  return (
    <div className="space-y-5">
      <div>
        <nav aria-label={t('Where it is')} className="mb-2 flex flex-wrap items-center gap-1 text-[11.5px] text-white/60">
          <button type="button" onClick={() => onSelect(null)} className="hover:text-white">
            {t('Page')}
          </button>
          {path.slice(0, -1).map((x) => (
            <React.Fragment key={x.id}>
              <span>/</span>
              <button type="button" onClick={() => onSelect(x.id)} className="max-w-[90px] truncate hover:text-white">
                {nodeLabel(x, t, tr)}
              </button>
            </React.Fragment>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white/15">
            <Ic size={15} />
          </span>
          <input aria-label={t('Layer name')} value={n.name ? t(n.name) : ''} placeholder={t(TYPE_LABEL[n.type])} onChange={(e) => set({ name: e.target.value || undefined })} className="lg-input min-h-[36px] min-w-0 flex-1 px-2.5 text-[14px] font-bold" />
        </div>
      </div>

      {/* content */}
      {(hasText(n) || n.type === 'media' || n.type === 'object' || n.type === 'section') && (
        <Section title={t('Content')} icon={<Pilcrow size={15} />}>
          {hasText(n) && (
            <label className="block text-[12px] text-white/75">
              {n.type === 'field' ? t('Label') : t('Text')}
              <textarea dir="auto" rows={n.type === 'text' ? 4 : 2} value={shown(n.text)} onChange={(e) => set({ text: e.target.value })} className="lg-input mt-1.5 w-full resize-y px-2.5 py-2 text-[13.5px] leading-[1.45]" />
            </label>
          )}
          {n.type === 'heading' && <Seg label={t('Level')} value={n.level ?? 2} options={[1, 2, 3].map((l) => ({ id: l as 1 | 2 | 3, label: `H${l}` }))} onChange={(level) => set({ level }, true)} />}
          {n.type === 'button' && (
            <>
              <label className="block text-[12px] text-white/75">
                {t('Link')}
                <input dir="ltr" value={n.href ?? ''} placeholder="https://… · #contact · mailto:" onChange={(e) => set({ href: e.target.value })} className="lg-input mt-1.5 min-h-[38px] w-full px-2.5 text-[13px]" />
              </label>
              {C('variant', t('Look'), <Seg label={t('Look')} value={st.variant ?? 'solid'} options={[{ id: 'solid' as const, label: t('Solid') }, { id: 'outline' as const, label: t('Outline') }, { id: 'link' as const, label: t('Link') }]} onChange={(variant) => setS({ variant })} />)}
            </>
          )}
          {n.type === 'field' && (
            <>
              <label className="block text-[12px] text-white/75">
                {t('Hint inside the field')}
                <input dir="auto" value={shown(n.placeholder)} onChange={(e) => set({ placeholder: e.target.value })} className="lg-input mt-1.5 min-h-[38px] w-full px-2.5 text-[13px]" />
              </label>
              <Seg label={t('Field')} value={n.multiline ? 'long' : 'line'} options={[{ id: 'line', label: t('One line') }, { id: 'long', label: t('Long text') }]} onChange={(v) => set({ multiline: v === 'long' }, true)} />
            </>
          )}
          {n.type === 'media' && <MediaPicker p={p} value={n.assetId} onPick={(assetId) => set({ assetId }, true)} />}
          {n.type === 'media' && (
            <label className="block text-[12px] text-white/75">
              {t('Description for screen readers')}
              <input dir="auto" value={shown(n.alt)} placeholder={p.assets.find((a) => a.id === n.assetId)?.title ?? ''} onChange={(e) => set({ alt: e.target.value || undefined })} className="lg-input mt-1.5 min-h-[38px] w-full px-2.5 text-[13px]" />
            </label>
          )}
          {n.type === 'object' && (
            <div className="grid grid-cols-3 gap-1.5">
              {(p.objects ?? []).map((o) => (
                <button key={o.id} type="button" onClick={() => set({ objectId: o.id }, true)} aria-pressed={n.objectId === o.id} className={`aspect-square overflow-hidden rounded-[10px] bg-white/10 ${n.objectId === o.id ? 'ring-2 ring-white' : ''}`} title={o.title}>
                  {o.thumb ? <img src={o.thumb} alt={o.title} className="h-full w-full object-cover" /> : <Box className="m-auto" size={18} />}
                </button>
              ))}
            </div>
          )}
          {n.type === 'section' && (
            <label className="block text-[12px] text-white/75">
              {t('Kind of section')}
              <select value={n.tag ?? 'section'} onChange={(e) => set({ tag: e.target.value as SiteNode['tag'] }, true)} className="lg-input mt-1.5 min-h-[38px] w-full px-2 text-[13px]">
                {(['section', 'header', 'footer', 'article', 'nav', 'aside'] as const).map((x) => (
                  <option key={x} value={x}>
                    {t({ section: 'Section', header: 'Header', footer: 'Footer', article: 'Article', nav: 'Navigation', aside: 'Side note' }[x])}
                  </option>
                ))}
              </select>
            </label>
          )}
        </Section>
      )}

      {/* layout */}
      {isContainer(n) && (
        <Section title={t('Layout')} icon={<Rows3 size={15} />}>
          {n.type !== 'grid' && C('dir', t('Direction'), <Seg label={t('Direction')} value={st.dir ?? 'col'} options={[{ id: 'col' as const, label: t('Column') }, { id: 'row' as const, label: t('Row') }]} onChange={(dir) => setS({ dir })} />)}
          {n.type === 'grid' && C('cols', t('Columns'), <Seg label={t('Columns')} value={st.cols ?? 3} options={[1, 2, 3, 4, 5, 6].map((c) => ({ id: c, label: String(c) }))} onChange={(cols) => setS({ cols })} />)}
          {C('gap', t('Space between'), <Seg wrap label={t('Space between')} value={st.gap ?? (n.type === 'stack' ? '4' : '6')} options={spaceOpts} onChange={(gap) => setS({ gap })} />)}
          {C('align', t('Align across'), <Seg label={t('Align across')} value={st.align ?? 'stretch'} options={[{ id: 'start' as const, label: t('Start') }, { id: 'center' as const, label: t('Centre') }, { id: 'end' as const, label: t('End') }, { id: 'stretch' as const, label: t('Fill') }]} onChange={(align) => setS({ align })} />)}
          {n.type !== 'grid' && C('justify', t('Spread along'), <Seg label={t('Spread along')} value={st.justify ?? 'start'} options={[{ id: 'start' as const, label: t('Start') }, { id: 'center' as const, label: t('Centre') }, { id: 'end' as const, label: t('End') }, { id: 'between' as const, label: t('Apart') }]} onChange={(justify) => setS({ justify })} />)}
          {n.type !== 'grid' && st.dir === 'row' && C('wrap', t('When it does not fit'), <Seg label={t('When it does not fit')} value={st.wrap === false ? 'no' : 'yes'} options={[{ id: 'yes', label: t('Next line') }, { id: 'no', label: t('One line') }]} onChange={(v) => setS({ wrap: v === 'yes' })} />)}
          {C('py', n.type === 'section' ? t('Space above and below') : t('Inner space · vertical'), <Seg wrap label={t('Vertical')} value={st.py ?? (n.type === 'section' ? '16' : '0')} options={spaceOpts} onChange={(py) => setS({ py })} />)}
          {C('px', t('Inner space · sides'), <Seg wrap label={t('Sides')} value={st.px ?? (n.type === 'section' ? '6' : '0')} options={spaceOpts} onChange={(px) => setS({ px })} />)}
          {C('maxW', n.type === 'section' ? t('Content width') : t('Max width'), <Seg label={t('Width')} value={st.maxW ?? (n.type === 'section' ? 'wide' : 'full')} options={[{ id: 'narrow' as const, label: '480' }, { id: 'text' as const, label: '720' }, { id: 'wide' as const, label: '1200' }, { id: 'full' as const, label: t('Full') }]} onChange={(maxW) => setS({ maxW })} />)}
          {n.type === 'section' && C('minH', t('Height'), <Seg label={t('Height')} value={st.minH ?? 'none'} options={[{ id: 'none' as const, label: t('By content') }, { id: 'half' as const, label: t('Half screen') }, { id: 'screen' as const, label: t('Full screen') }]} onChange={(minH) => setS({ minH })} />)}
        </Section>
      )}

      {/* type */}
      {textish && (
        <Section title={t('Type')} icon={<Heading size={15} />}>
          {hasText(n) && C('size', t('Size'), <Seg wrap label={t('Size')} value={st.size ?? (n.type === 'heading' ? (['4xl', '2xl', 'xl'] as const)[(n.level ?? 2) - 1] : n.type === 'button' ? 'sm' : 'md')} options={TYPE.map((s) => ({ id: s, label: String(TYPE_PX[s][bp === 'lg' ? 0 : bp === 'md' ? 1 : 2]) }))} onChange={(size) => setS({ size })} />)}
          {hasText(n) && C('weight', t('Weight'), <Seg label={t('Weight')} value={st.weight ?? (n.type === 'button' ? 600 : 400)} options={[400, 500, 600, 700, 800].map((w) => ({ id: w as SiteStyle['weight'] & number, label: String(w) }))} onChange={(weight) => setS({ weight })} />)}
          {hasText(n) && C('font', t('Typeface'), <Seg label={t('Typeface')} value={st.font ?? (n.type === 'heading' ? 'heading' : 'body')} options={[{ id: 'heading' as const, label: FONTS.find((f) => f.id === theme.heading)?.label ?? t('Headings') }, { id: 'body' as const, label: FONTS.find((f) => f.id === theme.body)?.label ?? t('Text') }]} onChange={(font) => setS({ font })} />)}
          {hasText(n) && C('italic', t('Italic'), <Seg label={t('Italic')} value={st.italic ? 'y' : 'n'} options={[{ id: 'n', label: t('Upright') }, { id: 'y', label: t('Italic') }]} onChange={(v) => setS({ italic: v === 'y' })} />)}
          {C('text', t('Alignment'), <Seg label={t('Alignment')} value={st.text ?? 'start'} options={[{ id: 'start' as const, label: t('Start') }, { id: 'center' as const, label: t('Centre') }, { id: 'end' as const, label: t('End') }]} onChange={(text) => setS({ text })} />)}
          {C('color', t('Colour'), <Roles allowNone value={st.color} theme={theme} onChange={(color) => setS({ color })} />)}
          {st.color && st.bg && themeColor(theme, st.color) && themeColor(theme, st.bg) && contrast(themeColor(theme, st.color)!, themeColor(theme, st.bg)!) < 4.5 && <p className="rounded-[10px] bg-[#ffb020]/20 px-2.5 py-1.5 text-[12px]">{t('Low contrast: this text may be hard to read.')}</p>}
        </Section>
      )}

      {/* box */}
      <Section title={t('Look')} icon={<Sparkles size={15} />}>
        {n.type !== 'divider' && n.type !== 'spacer' && C('bg', t('Background'), <Roles allowNone value={st.bg} theme={theme} onChange={(bg) => setS({ bg })} />)}
        {(n.type === 'media' || n.type === 'object') && C('ratio', t('Proportions'), <Seg wrap label={t('Proportions')} value={st.ratio ?? '4/3'} options={(['1/1', '4/5', '3/4', '4/3', '3/2', '16/9', 'auto'] as const).map((r) => ({ id: r, label: r === 'auto' ? t('As is') : r.replace('/', ':') }))} onChange={(ratio) => setS({ ratio })} />)}
        {n.type === 'media' && C('fit', t('Fill'), <Seg label={t('Fill')} value={st.fit ?? 'cover'} options={[{ id: 'cover' as const, label: t('Crop to fill') }, { id: 'contain' as const, label: t('Whole picture') }]} onChange={(fit) => setS({ fit })} />)}
        {(isContainer(n) || n.type === 'media' || n.type === 'object' || n.type === 'button') && C('radius', t('Corners'), <Seg wrap label={t('Corners')} value={st.radius ?? (n.type === 'media' || n.type === 'button' ? 'md' : 'none')} options={(['none', 'sm', 'md', 'lg', 'xl', 'pill'] as const).map((r) => ({ id: r, label: t({ none: 'Square', sm: 'S', md: 'M', lg: 'L', xl: 'XL', pill: 'Pill' }[r]) }))} onChange={(radius) => setS({ radius })} />)}
        {isContainer(n) && C('border', t('Outline'), <Seg label={t('Outline')} value={st.border ? 'y' : 'n'} options={[{ id: 'n', label: t('None') }, { id: 'y', label: t('Thin line') }]} onChange={(v) => setS({ border: v === 'y' })} />)}
        {n.type === 'spacer' && C('py', t('Height'), <Seg wrap label={t('Height')} value={st.py ?? '8'} options={spaceOpts} onChange={(py) => setS({ py })} />)}
        {parentNode?.type === 'grid' && C('span', t('Columns it takes'), <Seg label={t('Columns it takes')} value={st.span ?? 1} options={Array.from({ length: Math.max(1, styleAt(parentNode, bp).cols ?? 3) }, (_, i) => ({ id: i + 1, label: String(i + 1) }))} onChange={(span) => setS({ span: span === 1 ? undefined : span })} />)}
        {parentNode && parentNode.type !== 'grid' && styleAt(parentNode, bp).dir === 'row' && C('grow', t('Width in the row'), <Seg label={t('Width in the row')} value={st.grow ? 'y' : 'n'} options={[{ id: 'n', label: t('By content') }, { id: 'y', label: t('Share the rest') }]} onChange={(v) => setS({ grow: v === 'y' })} />)}
      </Section>

      <Section title={t('At this width')} icon={bp === 'sm' ? <Smartphone size={15} /> : bp === 'md' ? <Tablet size={15} /> : <Monitor size={15} />}>
        <button type="button" onClick={() => setS({ hide: st.hide ? (bp === 'lg' ? undefined : false) : true })} aria-pressed={!!st.hide} className={`lg-btn min-h-[38px] w-full text-[12.5px] ${st.hide ? 'lg-btn-primary' : 'lg-btn-ghost'}`}>
          {st.hide ? <EyeOff size={14} /> : <Eye size={14} />} {st.hide ? t('Hidden here · show') : t('Hide at this width')}
        </button>
        <p className="text-[11.5px] leading-[1.4] text-white/60">{bp === 'lg' ? t('Desktop is the base. Switch to tablet or phone above to change only that width.') : t('Changes made now apply only to this width and narrower. Blue marks show them; click a mark to undo it.')}</p>
      </Section>
    </div>
  );
}

function MediaPicker({ p, value, onPick }: { p: Project; value?: string; onPick: (id: string) => void }) {
  const { t } = useI18n();
  const list = p.assets.filter((a) => a.ready !== false && (a.kind === 'image' || a.kind === 'video') && (!previewOnly(a) || a.format === 'lottie'));
  return (
    <div>
      <div className="grid max-h-[220px] grid-cols-4 gap-1.5 overflow-y-auto pe-0.5 lg-scroll">
        {list.map((a) => (
          <button key={a.id} type="button" onClick={() => onPick(a.id)} aria-pressed={value === a.id} title={a.title} aria-label={a.title} className={`relative aspect-square overflow-hidden rounded-[10px] bg-white/10 ${value === a.id ? 'ring-2 ring-white ring-offset-2 ring-offset-black/30' : ''}`}>
            <AssetThumb asset={a} className="h-full w-full" />
            {a.kind === 'video' && <span className="absolute bottom-1 end-1 rounded bg-black/60 px-1 text-[9px] font-bold text-white">VIDEO</span>}
            {a.format === 'lottie' && <span className="absolute bottom-1 end-1 rounded bg-black/60 px-1 text-[9px] font-bold text-white">LOTTIE</span>}
          </button>
        ))}
      </div>
      <FilePick onFiles={(f) => upload(f, p.id, { isReference: true, then: (a) => (a.kind === 'image' || a.kind === 'video') && onPick(a.id) })} accept="image/*,video/*,.json" className="lg-btn lg-btn-ghost mt-2 min-h-[36px] w-full text-[12.5px]">
        <Upload size={14} /> {t('Upload a picture')}
      </FilePick>
    </div>
  );
}

function PageInspector({ p, pg, commit, sending, onReview }: { p: Project; pg: SitePage; commit: (patch: Partial<SitePage>, label?: string, now?: boolean) => void; sending: boolean; onReview: () => void }) {
  const { t, locale } = useI18n();
  const { state } = useWs();
  const work = pg.workId ? p.works.find((w) => w.id === pg.workId) : undefined;
  const setTheme = (patch: Partial<SiteTheme>, now = false) => commit({ theme: { ...pg.theme, ...patch } }, 'Theme changed', now);
  return (
    <div className="space-y-5">
      <Section title={t('Page')} icon={<FileText size={15} />}>
        <label className="block text-[12px] text-white/75">
          {t('Title')}
          <input dir="auto" value={pg.title} onChange={(e) => commit({ title: e.target.value, slug: slugify(e.target.value) }, 'Page renamed', false)} className="lg-input mt-1.5 min-h-[38px] w-full px-2.5 text-[14px] font-bold" />
        </label>
        <p className="truncate text-[11.5px] text-white/55" dir="ltr">
          /{pg.slug}
        </p>
        <Seg label={t('Reading direction')} value={pg.dir} options={[{ id: 'ltr' as const, label: t('Left to right') }, { id: 'rtl' as const, label: t('Right to left') }]} onChange={(dir) => commit({ dir }, 'Page edited')} />
      </Section>
      <Section title={t('Colours and type')} icon={<Sparkles size={15} />}>
        <button type="button" onClick={() => (commit({ theme: { ...themeFrom(state.brand, projectPalette(p)), round: pg.theme.round } }, 'Theme changed'), toast(t('Colours and type taken from the brand kit')))} className="lg-btn lg-btn-ghost min-h-[36px] w-full text-[12.5px]">
          <RotateCcw size={13} /> {t('Take from the brand kit')}
        </button>
        <div className="grid grid-cols-2 gap-1.5">
          {COLOR_ROLES.map((r) => (
            <ColorField key={r} label={t(ROLE_LABEL[r as ColorRole])} value={pg.theme[r]} onChange={(c) => setTheme({ [r]: c } as Partial<SiteTheme>)} />
          ))}
        </div>
        {contrast(pg.theme.text, pg.theme.bg) < 4.5 && <p className="rounded-[10px] bg-[#ffb020]/20 px-2.5 py-1.5 text-[12px]">{t('Text and background are too close: hard to read.')}</p>}
        <div className="grid grid-cols-2 gap-2">
          {(['heading', 'body'] as const).map((k) => (
            <label key={k} className="block text-[12px] text-white/75">
              {k === 'heading' ? t('Headings') : t('Text')}
              <select value={pg.theme[k]} onChange={(e) => setTheme({ [k]: e.target.value } as Partial<SiteTheme>, true)} className="lg-input mt-1.5 min-h-[38px] w-full px-2 text-[13px]">
                {FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <Seg label={t('Corners')} value={pg.theme.round} options={[{ id: 'sharp' as const, label: t('Sharp') }, { id: 'soft' as const, label: t('Soft') }, { id: 'round' as const, label: t('Round') }]} onChange={(round) => setTheme({ round }, true)} />
      </Section>
      <Section title={t('Review and versions')} icon={<History size={15} />}>
        <p className="text-[12px] leading-[1.45] text-white/70">{t('Each time you send the page, a picture of it becomes a new version: the client pins notes on it, and the live page of that version stays one click away.')}</p>
        <button type="button" disabled={sending} onClick={onReview} className="lg-btn lg-btn-primary min-h-[40px] w-full text-[13px] disabled:opacity-60">
          <Send size={14} /> {sending ? t('Capturing…') : work ? t('Send version {n}', { n: work.versions.length + 1 }) : t('Send to review')}
        </button>
        {work && (
          <ol className="space-y-1">
            {[...work.versions].reverse().map((v) => {
              const snap = pg.snapshots?.find((s) => s.versionId === v.id);
              return (
                <li key={v.id} className="flex items-center gap-1 rounded-[12px] bg-white/[.07] py-1 pe-1 ps-2.5 text-[12.5px]">
                  <span className="font-bold">v{v.n}</span>
                  <span className="min-w-0 flex-1 truncate text-white/65">{new Date(v.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}</span>
                  <button type="button" onClick={() => go(`/p/${p.id}/review/${work.id}?v=${v.id}`)} className="lg-btn lg-btn-plain min-h-[30px] px-2 text-[11.5px]">
                    {t('Notes')}
                  </button>
                  {snap && (
                    <>
                      <button type="button" onClick={() => go(`/site/${p.id}/${pg.id}?v=${v.id}`)} className="lg-btn lg-btn-plain min-h-[30px] px-2 text-[11.5px]">
                        {t('Live')}
                      </button>
                      <button type="button" onClick={() => (commit({ root: snap.root, theme: snap.theme }, 'Version restored'), toast(t('Version {n} is back in the editor', { n: v.n }), { undo: true }))} className="lg-btn lg-btn-plain h-[30px] min-h-0 w-[30px] p-0" aria-label={t('Restore version {n}', { n: v.n })} title={t('Restore version {n}', { n: v.n })}>
                        <RotateCcw size={12} />
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </Section>
      <button
        type="button"
        onClick={() => {
          ws.removePage(p.id, pg.id);
          toast(t('Page removed'), { undo: true });
        }}
        className="lg-btn lg-btn-ghost min-h-[36px] w-full text-[12.5px]"
      >
        <Trash2 size={13} /> {t('Remove the page')}
      </button>
    </div>
  );
}
