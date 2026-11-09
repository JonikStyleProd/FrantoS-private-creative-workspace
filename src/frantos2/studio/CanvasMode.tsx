import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Play, AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, Box, Copy, Download, Image as ImageIcon, Layers, LayoutTemplate, Palette as PaletteIcon, Plus, Square, Trash2, Type, Wand2, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { go } from '../route';
import { uid, useWs, ws } from '../ws/store';
import type { Board, BoardLayer, BrandFont, Project } from '../ws/types';
import { AssetThumb, toast, useMedia } from '../ws/kit';
import { Pane } from '../glass/kit';
import { FORMATS, autoBoard, reflow, renderBoard } from './compose';
import { upload, useDropZone } from '../ws/uploads';
import { FONTS, fontCss } from './brand';
import { downscale, stillToAsset } from './models';
import { projectPalette } from './palette';
import { ColorField, PaletteRow, Section, Seg, Slider } from './ui';

/**
 * Studio · Canvas: compose a board from the project — pictures, the 3D object, type, shapes, the palette —
 * at a real output size (post, story, slide, A4), then export a PNG or add it to the project as a work.
 */
export function CanvasMode({ p, q, setQ }: { p: Project; q: URLSearchParams; setQ: (patch: Record<string, string | undefined>) => void }) {
  const { t } = useI18n();
  const boards = p.boards ?? [];
  const board = boards.find((b) => b.id === q.get('b')) ?? boards[0];
  const narrow = useMedia('(max-width: 900px)');
  const create = (f = FORMATS[0], auto = true) => {
    const id = ws.addBoard(p.id, auto ? autoBoard(p, f) : { title: `${t('Board')} · ${t(f.label)}`, w: f.w, h: f.h, bg: '#efe9df', layers: [] });
    setQ({ b: id });
  };

  if (!board)
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Pane className="max-w-[520px] rounded-[28px] p-7 text-center">
          <LayoutTemplate className="mx-auto" />
          <p className="mt-3 text-[20px] font-bold">{t('Compose the project on one board')}</p>
          <p className="mt-2 text-[14.5px] leading-[1.5] text-white/80">{t('Pick a format. FrantoS lays out the cover, the title and the palette; everything stays editable.')}</p>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FORMATS.map((f) => (
              <button key={f.id} type="button" onClick={() => create(f)} className="lg-btn lg-btn-ghost min-h-[44px] text-[13px]">
                {t(f.label)}
              </button>
            ))}
          </div>
        </Pane>
      </div>
    );
  return <BoardEditor key={board.id} p={p} stored={board} narrow={narrow} onPick={(id) => setQ({ b: id })} onCreate={create} />;
}

type Handle = 'move' | 'se' | 'e' | 's';

function BoardEditor({ p, stored, narrow, onPick, onCreate }: { p: Project; stored: Board; narrow: boolean; onPick: (id: string) => void; onCreate: (f?: (typeof FORMATS)[number], auto?: boolean) => void }) {
  const { t, dir } = useI18n();
  const [b, setB] = useState<Board>(stored);
  const bRef = useRef(b);
  bRef.current = b;
  const [sel, setSel] = useState<string | null>(null);
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const [adding, setAdding] = useState(false);
  const [sheet, setSheet] = useState<null | 'boards' | 'layer'>(null);
  const [busy, setBusy] = useState(false);
  const area = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(0.4);
  const { state } = useWs();
  const brandFont = state.brand?.font;
  const palette = [...new Set([...projectPalette(p), ...(state.brand?.palette ?? [])])];
  const layer = b.layers.find((l) => l.id === sel);

  // outside changes (undo) win when nothing is pending here
  const pending = useRef(false);
  useEffect(() => {
    if (!pending.current) setB(stored);
  }, [stored]);
  const timer = useRef<number | undefined>(undefined);
  const commit = (next: Board, label = 'Board edited', now = false) => {
    setB(next);
    pending.current = true;
    window.clearTimeout(timer.current);
    const go_ = () => {
      pending.current = false;
      ws.patchBoard(p.id, next.id, { title: next.title, bg: next.bg, w: next.w, h: next.h, layers: next.layers, notes: next.notes }, label);
    };
    if (now) go_();
    else timer.current = window.setTimeout(go_, 320);
  };
  useEffect(
    () => () => {
      if (pending.current) ws.patchBoard(p.id, bRef.current.id, { layers: bRef.current.layers, title: bRef.current.title, bg: bRef.current.bg }, 'Board edited');
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const patchLayer = (id: string, patch: Partial<BoardLayer>, now = false) => commit({ ...bRef.current, layers: bRef.current.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) }, 'Layer edited', now);
  const addLayer = (l: Omit<BoardLayer, 'id'>) => {
    const nl = { ...l, id: uid('l-') };
    commit({ ...b, layers: [...b.layers, nl] }, 'Layer added', true);
    setSel(nl.id);
    setAdding(false);
  };
  const removeLayer = (id: string) => {
    commit({ ...b, layers: b.layers.filter((l) => l.id !== id) }, 'Layer removed', true);
    setSel(null);
    toast(t('Layer removed'), { undo: true });
  };
  const order = (id: string, d: number) => {
    const i = b.layers.findIndex((l) => l.id === id);
    const j = Math.max(0, Math.min(b.layers.length - 1, i + d));
    if (i === j) return;
    const ls = [...b.layers];
    const [x] = ls.splice(i, 1);
    ls.splice(j, 0, x);
    commit({ ...b, layers: ls }, 'Layer order', true);
  };
  const duplicate = (id: string) => {
    const l = b.layers.find((x) => x.id === id);
    if (!l) return;
    addLayer({ ...l, x: l.x + 40, y: l.y + 40 });
  };

  // fit the board into the free area
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFit(Math.min(el.clientWidth / b.w, el.clientHeight / b.h)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [b.w, b.h]);

  // drag / resize with snapping to the board's edges and centre and to other layers
  const drag = useRef<{ id: string; h: Handle; sx: number; sy: number; o: BoardLayer } | null>(null);
  const SNAP = 10 / fit;
  const onDown = (e: React.PointerEvent, l: BoardLayer, h: Handle) => {
    e.stopPropagation();
    setSel(l.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id: l.id, h, sx: e.clientX, sy: e.clientY, o: l };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / fit;
    const dy = (e.clientY - d.sy) / fit;
    const o = d.o;
    let n: Partial<BoardLayer>;
    const v: number[] = [];
    const hz: number[] = [];
    if (d.h === 'move') {
      let x = o.x + dx;
      let y = o.y + dy;
      const xs = [0, b.w / 2, b.w, ...b.layers.filter((l) => l.id !== o.id).flatMap((l) => [l.x, l.x + l.w / 2, l.x + l.w])];
      const ys = [0, b.h / 2, b.h, ...b.layers.filter((l) => l.id !== o.id).flatMap((l) => [l.y, l.y + l.h / 2, l.y + l.h])];
      for (const [k, off] of [[0, 0], [1, o.w / 2], [2, o.w]] as const) {
        const hit = xs.find((s) => Math.abs(x + off - s) < SNAP);
        if (hit != null && !e.altKey) {
          x = hit - off;
          v.push(hit);
          break;
        }
        void k;
      }
      for (const off of [0, o.h / 2, o.h]) {
        const hit = ys.find((s) => Math.abs(y + off - s) < SNAP);
        if (hit != null && !e.altKey) {
          y = hit - off;
          hz.push(hit);
          break;
        }
      }
      n = { x: Math.round(x), y: Math.round(y) };
    } else {
      let w = d.h === 's' ? o.w : Math.max(24, o.w + dx);
      let h = d.h === 'e' ? o.h : Math.max(24, o.h + dy);
      if (e.shiftKey && d.h === 'se') h = (w * o.h) / o.w;
      const r = [b.w, b.w / 2].find((s) => Math.abs(o.x + w - s) < SNAP);
      if (r != null && d.h !== 's') (w = r - o.x), v.push(r);
      const bt = [b.h, b.h / 2].find((s) => Math.abs(o.y + h - s) < SNAP);
      if (bt != null && d.h !== 'e') (h = bt - o.y), hz.push(bt);
      n = { w: Math.round(w), h: Math.round(h) };
    }
    setGuides({ v, h: hz });
    setB((cur) => ({ ...cur, layers: cur.layers.map((l) => (l.id === o.id ? { ...l, ...n } : l)) }));
  };
  const onUp = () => {
    if (!drag.current) return;
    drag.current = null;
    setGuides({ v: [], h: [] });
    commit(bRef.current, 'Layer moved', true);
  };

  // keyboard: arrows nudge, Delete removes, ⌘D duplicates, [ ] change order, Esc deselects
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,select,[contenteditable]')) return;
      if (!sel) return;
      const l = bRef.current.layers.find((x) => x.id === sel);
      if (!l) return;
      const step = e.shiftKey ? 10 : 1;
      const m: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (m[e.key]) {
        e.preventDefault();
        patchLayer(l.id, { x: l.x + m[e.key][0], y: l.y + m[e.key][1] });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeLayer(l.id);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicate(l.id);
      } else if (e.key === ']') order(l.id, 1);
      else if (e.key === '[') order(l.id, -1);
      else if (e.key === 'Escape') setSel(null);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }); // re-bound each render: it reads the latest board

  async function exportBoard(target: 'download' | 'project') {
    setBusy(true);
    try {
      const blob = await renderBoard(p, bRef.current, dir === 'rtl', brandFont);
      if (target === 'download') {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${b.title.replace(/[^\w\- ]+/g, '').trim() || 'board'}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      } else {
        const asset = await stillToAsset(await downscale(blob, 4000, 'image/webp'), b.w, b.h, b.title);
        ws.addAsset(p.id, asset);
        const wid = ws.workFromAsset(p.id, asset.id);
        toast(t('Board added to the project as a new work'));
        go(`/p/${p.id}?s=make&i=${wid}`);
      }
    } catch {
      toast(t('Export failed.'), { tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const images = p.assets.filter((a) => a.kind === 'image');
  const objects = (p.objects ?? []).filter((o) => o.thumb);
  // drop pictures on the board: they are added to the project and placed where they fell
  const dropAt = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const drop = useDropZone((files) => {
    let i = 0;
    upload(files, p.id, {
      isReference: true,
      then: (a) => {
        if (a.kind !== 'image') return;
        const w = Math.round(bRef.current.w * 0.5);
        const h = Math.round((w * a.h) / Math.max(1, a.w));
        const c = dropAt.current;
        addLayer({ kind: 'image', assetId: a.id, x: Math.round(c.x * bRef.current.w - w / 2 + i * 30), y: Math.round(c.y * bRef.current.h - h / 2 + i * 30), w, h, fit: 'cover' });
        i++;
      },
    });
  });
  const S = Math.min(b.w, b.h);
  const addMenu = (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => addLayer({ kind: 'text', text: t('Title'), x: S * 0.08, y: S * 0.08, w: b.w * 0.6, h: S * 0.12, size: Math.round(S * 0.08), weight: 800, color: '#16130f', align: 'start' })} className="lg-btn lg-btn-ghost min-h-[40px] text-[12.5px]">
          <Type size={14} /> {t('Text')}
        </button>
        <button type="button" onClick={() => addLayer({ kind: 'rect', x: S * 0.1, y: S * 0.1, w: S * 0.4, h: S * 0.4, fill: palette[0] ?? '#c4542a', radius: 0 })} className="lg-btn lg-btn-ghost min-h-[40px] text-[12.5px]">
          <Square size={14} /> {t('Shape')}
        </button>
        <button type="button" disabled={!palette.length} onClick={() => addLayer({ kind: 'palette', colors: palette.slice(0, 5), x: S * 0.08, y: b.h - S * 0.16, w: b.w * 0.5, h: S * 0.07, radius: S * 0.035 })} className="lg-btn lg-btn-ghost min-h-[40px] text-[12.5px] disabled:opacity-40">
          <PaletteIcon size={14} /> {t('Palette')}
        </button>
      </div>
      {objects.length > 0 && (
        <div>
          <p className="lg-label mb-1.5">{t('3D objects')}</p>
          <div className="grid grid-cols-4 gap-2">
            {objects.map((o) => (
              <button key={o.id} type="button" onClick={() => addLayer({ kind: 'object', objectId: o.id, x: b.w * 0.2, y: b.h * 0.2, w: b.w * 0.6, h: b.w * 0.75, fit: 'contain' })} title={t(o.title)} className="aspect-[4/5] overflow-hidden rounded-[10px] ring-1 ring-white/25 hover:ring-white">
                <img src={o.thumb} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="lg-label mb-1.5">{t('Images')}</p>
        <div className="grid max-h-[260px] grid-cols-4 gap-2 overflow-y-auto lg-scroll">
          {images.map((a) => (
            <button key={a.id} type="button" onClick={() => addLayer({ kind: 'image', assetId: a.id, x: b.w * 0.1, y: b.h * 0.1, w: b.w * 0.8, h: Math.min(b.h * 0.8, (b.w * 0.8 * a.h) / Math.max(1, a.w)), fit: 'cover' })} title={a.title} className="aspect-square overflow-hidden rounded-[10px] ring-1 ring-white/25 hover:ring-white">
              <AssetThumb asset={a} className="h-full w-full" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const inspector = (
    <div className="space-y-5">
      {layer ? (
        <Section title={t(layer.kind === 'text' ? 'Text' : layer.kind === 'rect' ? 'Shape' : layer.kind === 'palette' ? 'Palette' : layer.kind === 'object' ? '3D object' : 'Image')} icon={<Layers size={16} />}>
          {layer.kind === 'text' && (
            <>
              <label className="sr-only" htmlFor="ly-text">
                {t('Text')}
              </label>
              <textarea id="ly-text" dir="auto" rows={3} className="lg-input text-[14px]" value={layer.text ?? ''} onChange={(e) => patchLayer(layer.id, { text: e.target.value })} />
              <Slider label={t('Size')} value={layer.size ?? 48} min={10} max={Math.round(S * 0.25)} step={1} fmt={(v) => `${v}px`} onChange={(v) => patchLayer(layer.id, { size: v })} />
              <Seg label={t('Weight')} value={layer.weight ?? 600} options={[400, 600, 800].map((w) => ({ id: w, label: w === 400 ? t('Regular') : w === 600 ? t('Semibold') : t('Bold') }))} onChange={(w) => patchLayer(layer.id, { weight: w })} />
              <label className="lg-label" htmlFor="ly-font">
                {t('Typeface')}
              </label>
              <select id="ly-font" className="lg-input min-h-[38px] py-1.5 text-[13.5px]" value={layer.font ?? ''} onChange={(e) => patchLayer(layer.id, { font: (e.target.value || undefined) as BrandFont | undefined }, true)}>
                <option value="">{t('Brand heading face')}</option>
                {FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
              <Seg
                label={t('Align')}
                value={layer.align ?? 'start'}
                options={[
                  { id: 'start', label: '⇤' },
                  { id: 'center', label: '↔' },
                  { id: 'end', label: '⇥' },
                ]}
                onChange={(a) => patchLayer(layer.id, { align: a })}
              />
              <ColorField label={t('Colour')} value={layer.color ?? '#000000'} onChange={(c) => patchLayer(layer.id, { color: c })} />
              <PaletteRow colors={palette} label={t('Project palette')} active={layer.color} onPick={(c) => patchLayer(layer.id, { color: c }, true)} />
            </>
          )}
          {layer.kind === 'rect' && (
            <>
              <ColorField label={t('Fill')} value={layer.fill ?? '#000000'} onChange={(c) => patchLayer(layer.id, { fill: c })} />
              <PaletteRow colors={palette} label={t('Project palette')} active={layer.fill} onPick={(c) => patchLayer(layer.id, { fill: c }, true)} />
            </>
          )}
          {layer.kind === 'palette' && (
            <button type="button" onClick={() => patchLayer(layer.id, { colors: palette.slice(0, 6) }, true)} className="lg-btn lg-btn-ghost min-h-[36px] w-full text-[12.5px]">
              {t('Use the current project palette')}
            </button>
          )}
          {(layer.kind === 'image' || layer.kind === 'object') && (
            <Seg
              label={t('Fit')}
              value={layer.fit ?? 'cover'}
              options={[
                { id: 'cover', label: t('Fill the frame') },
                { id: 'contain', label: t('Whole picture') },
              ]}
              onChange={(f) => patchLayer(layer.id, { fit: f }, true)}
            />
          )}
          {layer.kind !== 'text' && <Slider label={t('Corner radius')} value={layer.radius ?? 0} min={0} max={Math.round(Math.min(layer.w, layer.h) / 2)} step={1} fmt={(v) => `${v}px`} onChange={(v) => patchLayer(layer.id, { radius: v })} />}
          <Slider label={t('Opacity')} value={layer.opacity ?? 1} min={0.05} max={1} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => patchLayer(layer.id, { opacity: v })} />
          <div className="grid grid-cols-4 gap-2">
            <button type="button" onClick={() => order(layer.id, 1)} className="lg-btn lg-btn-ghost lg-icon min-h-[38px]" title={t('Bring forward')} aria-label={t('Bring forward')}>
              <ArrowUp size={15} />
            </button>
            <button type="button" onClick={() => order(layer.id, -1)} className="lg-btn lg-btn-ghost lg-icon min-h-[38px]" title={t('Send backward')} aria-label={t('Send backward')}>
              <ArrowDown size={15} />
            </button>
            <button type="button" onClick={() => duplicate(layer.id)} className="lg-btn lg-btn-ghost lg-icon min-h-[38px]" title={t('Duplicate')} aria-label={t('Duplicate')}>
              <Copy size={15} />
            </button>
            <button type="button" onClick={() => removeLayer(layer.id)} className="lg-btn lg-btn-ghost lg-icon min-h-[38px]" title={t('Delete')} aria-label={t('Delete')}>
              <Trash2 size={15} />
            </button>
          </div>
          <div className="flex gap-1.5">
            {(['start', 'center', 'end'] as const).map((a) => (
              <button key={a} type="button" onClick={() => patchLayer(layer.id, { x: Math.round(a === 'start' ? 0 : a === 'center' ? (b.w - layer.w) / 2 : b.w - layer.w) }, true)} className="lg-btn lg-btn-plain lg-icon min-h-[34px]" title={t(a === 'start' ? 'Align to the left edge' : a === 'center' ? 'Centre on the board' : 'Align to the right edge')} aria-label={t(a === 'start' ? 'Align to the left edge' : a === 'center' ? 'Centre on the board' : 'Align to the right edge')}>
                {a === 'start' ? <AlignLeft size={15} /> : a === 'center' ? <AlignCenter size={15} /> : <AlignRight size={15} />}
              </button>
            ))}
            <span className="ms-auto self-center text-[11.5px] tabular-nums text-white/60">
              {Math.round(layer.w)} × {Math.round(layer.h)}
            </span>
          </div>
        </Section>
      ) : (
        <Section title={t('Board')} icon={<LayoutTemplate size={16} />}>
          <label className="lg-label" htmlFor="bd-title">
            {t('Name')}
          </label>
          <input id="bd-title" dir="auto" className="lg-input text-[14px] font-bold" value={b.title} onChange={(e) => commit({ ...b, title: e.target.value }, 'Renamed')} />
          <ColorField label={t('Background')} value={b.bg} onChange={(c) => commit({ ...b, bg: c })} />
          <PaletteRow colors={palette} label={t('Project palette')} active={b.bg} onPick={(c) => commit({ ...b, bg: c }, 'Board edited', true)} />
          <p className="text-[12px] text-white/65">
            {b.w} × {b.h} px · {b.layers.length} {t('layers')}
          </p>
          <label className="lg-label" htmlFor="bd-notes">
            {t('Speaker notes')}
          </label>
          <textarea id="bd-notes" dir="auto" rows={3} className="lg-input text-[13.5px]" value={b.notes ?? ''} placeholder={t('What to say on this slide. Only you see it in presenter view.')} onChange={(e) => commit({ ...b, notes: e.target.value })} />
          <p className="text-[11.5px] leading-[1.45] text-white/60">{t('Click a layer to edit it. Drag to move, the corner to resize (Shift keeps proportions, Alt turns snapping off). Arrows nudge, Delete removes, ⌘D duplicates.')}</p>
        </Section>
      )}
      <Section title={t('Export')} icon={<Download size={16} />}>
        <button
          type="button"
          onClick={() => {
            const made = FORMATS.filter((f) => f.w !== b.w || f.h !== b.h).map((f) => ws.addBoard(p.id, reflow(bRef.current, f)));
            toast(t('{n} boards in other formats — adjust each, they start from this one', { n: made.length }));
          }}
          className="lg-btn lg-btn-ghost min-h-[38px] w-full text-[12.5px]"
        >
          <LayoutTemplate size={14} /> {t('Make all formats')}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={() => exportBoard('download')} className="lg-btn lg-btn-ghost disabled:opacity-50">
            <Download size={15} /> PNG
          </button>
          <button type="button" disabled={busy} onClick={() => exportBoard('project')} className="lg-btn lg-btn-primary disabled:opacity-50">
            {busy ? t('Rendering…') : t('To project')}
          </button>
        </div>
      </Section>
    </div>
  );

  const boardsList = (
    <>
      <p className="lg-label px-1">{t('Boards')}</p>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto lg-scroll">
        {(p.boards ?? []).map((x) => (
          <div key={x.id} className={`group flex items-center gap-1 rounded-[14px] ${x.id === b.id ? 'bg-white/20 ring-1 ring-white/60' : 'hover:bg-white/10'}`}>
            <button type="button" onClick={() => (onPick(x.id), setSheet(null))} aria-current={x.id === b.id ? 'true' : undefined} className="flex min-w-0 flex-1 items-center gap-2 p-2 text-start">
              <span className="block h-9 shrink-0 rounded-[6px] ring-1 ring-white/30" style={{ background: x.bg, width: Math.max(16, Math.round((36 * x.w) / x.h)) }} />
              <span className="min-w-0">
                <span dir="auto" className="block truncate text-[13px] font-bold">
                  {x.title}
                </span>
                <span className="block text-[11px] text-white/60">
                  {x.w} × {x.h}
                </span>
              </span>
            </button>
            <button type="button" onClick={() => (ws.removeBoard(p.id, x.id), toast(t('Board removed'), { undo: true }))} className="lg-btn lg-btn-plain h-8 min-h-0 w-8 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label={t('Remove {name}', { name: x.title })}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
      <p className="lg-label px-1">{t('New board')}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {FORMATS.map((f) => (
          <button key={f.id} type="button" onClick={() => (onCreate(f), setSheet(null))} className="lg-btn lg-btn-ghost min-h-[34px] px-1 text-[11.5px]" title={t('A composed first layout, ready to edit')}>
            <Wand2 size={12} /> {t(f.label)}
          </button>
        ))}
      </div>
    </>
  );

  const sorted = b.layers;
  return (
    <>
      <div ref={area} className={`absolute flex items-center justify-center ${narrow ? 'inset-x-3 bottom-[84px] top-[132px]' : 'bottom-8 end-[344px] start-[272px] top-[152px]'}`} onPointerDown={() => setSel(null)}>
        <div
          className={`relative shrink-0 shadow-[0_30px_90px_rgba(0,0,0,.45)] ${drop.over ? 'outline outline-2 outline-offset-4 outline-white/80' : ''}`}
          style={{ width: b.w * fit, height: b.h * fit }}
          dir="ltr"
          {...drop.props}
          onDragOver={(e) => {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            dropAt.current = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
            drop.props.onDragOver(e);
          }}
        >
          <div className="absolute left-0 top-0 origin-top-left overflow-hidden" style={{ width: b.w, height: b.h, background: b.bg, transform: `scale(${fit})` }} onPointerMove={onMove} onPointerUp={onUp}>
            {sorted.map((l) => (
              <LayerView key={l.id} p={p} l={l} brandFont={brandFont} rtl={dir === 'rtl'} selected={l.id === sel} scale={fit} onDown={(e, h) => onDown(e, l, h)} />
            ))}
            {guides.v.map((x) => (
              <div key={`v${x}`} className="pointer-events-none absolute inset-y-0 bg-[#ff4fa3]" style={{ left: x, width: 1 / fit }} />
            ))}
            {guides.h.map((y) => (
              <div key={`h${y}`} className="pointer-events-none absolute inset-x-0 bg-[#ff4fa3]" style={{ top: y, height: 1 / fit }} />
            ))}
          </div>
        </div>
      </div>

      {/* add bar */}
      <div className={`absolute z-20 ${narrow ? 'end-3 top-[76px]' : 'start-1/2 top-[84px] -translate-x-1/2 rtl:translate-x-1/2'}`}>
        <Pane className="flex items-center gap-1 rounded-full p-1">
          <button type="button" onClick={() => setAdding((v) => !v)} aria-expanded={adding} className={`lg-btn min-h-[38px] text-[13px] ${adding ? 'lg-btn-primary' : 'lg-btn-plain'}`}>
            <Plus size={15} /> {t('Add')}
          </button>
          <button type="button" onClick={() => addLayer({ kind: 'text', text: t('Title'), x: S * 0.08, y: S * 0.08, w: b.w * 0.6, h: S * 0.12, size: Math.round(S * 0.08), weight: 800, color: '#16130f', align: 'start' })} className="lg-btn lg-btn-plain lg-icon min-h-[38px]" aria-label={t('Text')} title={`${t('Text')} (T)`}>
            <Type size={16} />
          </button>
          <button type="button" onClick={() => setAdding(true)} className="lg-btn lg-btn-plain lg-icon min-h-[38px]" aria-label={t('Image')} title={t('Image')}>
            <ImageIcon size={16} />
          </button>
          <button type="button" onClick={() => go(`/p/${p.id}/deck/${Math.max(0, (p.boards ?? []).findIndex((x) => x.id === b.id))}`)} className="lg-btn lg-btn-primary min-h-[38px] text-[13px]" title={t('Present boards')}>
            <Play size={14} /> <span className="max-sm:hidden">{t('Present')}</span>
          </button>
          {objects.length > 0 && (
            <button type="button" onClick={() => addLayer({ kind: 'object', objectId: objects[0].id, x: b.w * 0.2, y: b.h * 0.2, w: b.w * 0.6, h: b.w * 0.75, fit: 'contain' })} className="lg-btn lg-btn-plain lg-icon min-h-[38px]" aria-label={t('3D object')} title={t('3D object')}>
              <Box size={16} />
            </button>
          )}
        </Pane>
        <AnimatePresence>
          {adding && (
            <Pane strong key="add" className="absolute start-1/2 top-14 w-[340px] max-w-[calc(100vw-24px)] -translate-x-1/2 rounded-[22px] p-3 rtl:translate-x-1/2">
              <div className="mb-2 flex justify-end">
                <button type="button" onClick={() => setAdding(false)} className="lg-btn lg-btn-plain lg-icon -my-1 h-8 min-h-0 w-8" aria-label={t('Close')}>
                  <X size={15} />
                </button>
              </div>
              {addMenu}
            </Pane>
          )}
        </AnimatePresence>
      </div>

      {!narrow ? (
        <>
          <Pane as="aside" aria-label={t('Boards')} className="absolute bottom-4 start-4 top-[84px] z-20 flex w-[248px] flex-col gap-3 overflow-hidden rounded-[24px] p-3">
            {boardsList}
          </Pane>
          <Pane as="aside" aria-label={t('Inspector')} className="absolute bottom-4 end-4 top-[84px] z-20 w-[312px] overflow-y-auto rounded-[24px] p-4 lg-scroll">
            {inspector}
          </Pane>
        </>
      ) : (
        <>
          <Pane as="nav" aria-label={t('Inspector')} className="absolute inset-x-3 bottom-3 z-20 flex gap-1 rounded-full p-1.5">
            {(
              [
                ['boards', t('Boards')],
                ['layer', layer ? t('Layer') : t('Board')],
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setSheet(sheet === k ? null : k)} aria-expanded={sheet === k} className={`min-h-[44px] flex-1 rounded-full text-[13px] font-bold ${sheet === k ? 'bg-white text-[#11151a]' : 'text-white/85'}`}>
                {l}
              </button>
            ))}
          </Pane>
          <AnimatePresence>
            {sheet && (
              <Pane strong key="sheet" className="fixed inset-x-2 bottom-[74px] z-30 flex max-h-[56%] flex-col gap-3 overflow-y-auto rounded-[24px] p-4 lg-scroll">
                {sheet === 'boards' ? boardsList : inspector}
              </Pane>
            )}
          </AnimatePresence>
        </>
      )}
    </>
  );
}

export function LayerView({ p, l, rtl, selected, scale, onDown, brandFont }: { p: Project; l: BoardLayer; rtl: boolean; brandFont?: BrandFont; selected: boolean; scale: number; onDown?: (e: React.PointerEvent, h: Handle) => void }) {
  const asset = l.kind === 'image' ? p.assets.find((a) => a.id === l.assetId) : undefined;
  const obj = l.kind === 'object' ? (p.objects ?? []).find((o) => o.id === l.objectId) : undefined;
  const k = 1 / scale;
  const style: React.CSSProperties = { left: l.x, top: l.y, width: l.w, height: l.h, opacity: l.opacity ?? 1, borderRadius: l.kind === 'text' || l.kind === 'palette' ? undefined : l.radius };
  const content = useMemo(() => {
    if (l.kind === 'image') return <AssetThumb asset={asset} size="full" fit={l.fit ?? 'cover'} className="pointer-events-none h-full w-full" />;
    if (l.kind === 'object') return obj?.thumb ? <img src={obj.thumb} alt="" draggable={false} className={`pointer-events-none h-full w-full ${l.fit === 'cover' ? 'object-cover' : 'object-contain'}`} /> : null;
    if (l.kind === 'rect') return <div className="h-full w-full" style={{ background: l.fill, borderRadius: l.radius }} />;
    if (l.kind === 'palette')
      return (
        <div className="flex h-full w-full" style={{ gap: l.h * 0.18 }}>
          {(l.colors ?? []).map((c, i) => (
            <span key={i} className="h-full flex-1" style={{ background: c, borderRadius: l.radius }} />
          ))}
        </div>
      );
    return (
      <div dir={rtl ? 'rtl' : 'ltr'} className="h-full w-full whitespace-pre-wrap break-words" style={{ fontFamily: fontCss(l.font ?? brandFont), fontSize: l.size, fontWeight: l.weight, color: l.color, lineHeight: 1.12, textAlign: l.align === 'center' ? 'center' : l.align === 'end' ? 'end' : 'start' }}>
        {l.text}
      </div>
    );
  }, [l, asset, obj?.thumb, rtl, brandFont]);
  return (
    <div className={`absolute select-none ${onDown ? 'cursor-move touch-none' : ''} ${l.kind === 'image' || l.kind === 'object' ? 'overflow-hidden' : ''}`} style={style} onPointerDown={onDown ? (e) => onDown(e, 'move') : undefined}>
      {content}
      {selected && (
        <>
          <div className="pointer-events-none absolute inset-0" style={{ outline: `${2 * k}px solid #4f8bff`, outlineOffset: k }} />
          {(['e', 's', 'se'] as const).map((h) => (
            <span
              key={h}
              onPointerDown={(e) => onDown?.(e, h)}
              className="absolute rounded-full border-white bg-[#4f8bff]"
              style={{
                width: 14 * k,
                height: 14 * k,
                borderWidth: 2 * k,
                right: h === 's' ? `calc(50% - ${7 * k}px)` : -7 * k,
                bottom: h === 'e' ? `calc(50% - ${7 * k}px)` : -7 * k,
                cursor: h === 'e' ? 'ew-resize' : h === 's' ? 'ns-resize' : 'nwse-resize',
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
