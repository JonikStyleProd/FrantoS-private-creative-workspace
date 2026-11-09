import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Circle, Move, Scissors, Columns2, Crop as CropIcon, Download, Image as ImageIcon, Pipette, Plus, RotateCcw, Sparkles, SunMedium, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { go } from '../route';
import { ws } from '../ws/store';
import type { Asset, Project } from '../ws/types';
import { extractPalette, useAssetUrl } from '../ws/media';
import { AssetThumb, toast, useMedia } from '../ws/kit';
import { Pane } from '../glass/kit';
import { ASPECTS, Adjust, LOOKS, NEUTRAL, apply, cropRect, cutout, type Crop, type Mask } from './imageOps';
import { downscale, stillToAsset } from './models';
import { projectPalette, rgbToHex } from './palette';
import { Section, Seg, Slider } from './ui';

/**
 * Studio · Image: crop to a format, correct, pick a look, compare before/after, pick colours into
 * the project palette, then save as a new version of the same work (or a new work).
 * Edits are non-destructive until you save: the original file is never changed.
 */
export function ImageMode({ p, q, setQ }: { p: Project; q: URLSearchParams; setQ: (patch: Record<string, string | undefined>) => void }) {
  const { t } = useI18n();
  const narrow = useMedia('(max-width: 900px)');
  const images = p.assets.filter((a) => a.kind === 'image');
  const asset = images.find((a) => a.id === q.get('a')) ?? images[0];
  const from = q.get('from') ? p.assets.find((a) => a.id === q.get('from')) : undefined;
  const [sheet, setSheet] = useState<null | 'images' | 'adjust'>(null);

  if (!asset)
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Pane className="max-w-[420px] rounded-[28px] p-7 text-center">
          <ImageIcon className="mx-auto" />
          <p className="mt-3 text-[19px] font-bold">{t('No images in this project yet')}</p>
          <p className="mt-2 text-[14px] text-white/75">{t('Add references or renders to the project, then edit them here.')}</p>
        </Pane>
      </div>
    );

  const list = (
    <>
      <p className="lg-label px-1">{t('Images')}</p>
      <div className="grid min-h-0 flex-1 auto-rows-[88px] grid-cols-2 gap-2 overflow-y-auto lg-scroll">
        {images.map((a) => (
          <button key={a.id} type="button" onClick={() => (setQ({ a: a.id }), setSheet(null))} aria-current={a.id === asset.id ? 'true' : undefined} title={a.title} className={`overflow-hidden rounded-[14px] ${a.id === asset.id ? 'ring-2 ring-white' : 'ring-1 ring-white/20 hover:ring-white/60'}`}>
            <AssetThumb asset={a} className="h-full w-full" />
          </button>
        ))}
      </div>
    </>
  );

  return <Editor key={asset.id + (from?.id ?? '')} p={p} asset={asset} from={from?.recipe?.sourceId === asset.id ? from : undefined} onReopen={(src, edited) => setQ({ a: src, from: edited })} list={list} narrow={narrow} sheet={sheet} setSheet={setSheet} />;
}

function Editor({ p, asset, from, onReopen, list, narrow, sheet, setSheet }: { p: Project; asset: Asset; from?: Asset; onReopen: (sourceId: string, editedId: string) => void; list: React.ReactNode; narrow: boolean; sheet: null | 'images' | 'adjust'; setSheet: (s: null | 'images' | 'adjust') => void }) {
  const { t } = useI18n();
  const { url } = useAssetUrl(asset, 'full');
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const [bmp, setBmp] = useState<ImageBitmap | null>(null);
  const r0 = from?.recipe;
  const [adj, setAdj] = useState<Adjust>(() => (r0 ? ({ ...NEUTRAL, ...r0.adjust } as Adjust) : NEUTRAL));
  const [look, setLook] = useState(r0?.look ?? 'none');
  const [crop, setCrop] = useState<Crop>(r0?.crop ?? { aspect: null, zoom: 1, x: 0, y: 0 });
  const [mask, setMask] = useState<Mask | null>(() => (r0?.mask ? ({ ...r0.mask, adjust: { ...NEUTRAL, ...r0.mask.adjust } } as Mask) : null));
  const [cut, setCut] = useState<number | null>(r0?.cutout?.tolerance ?? null);
  const cutBase = useRef<ImageData | null>(null);
  const [split, setSplit] = useState<number | null>(null);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [boxSize, setBoxSize] = useState({ w: 800, h: 600 });
  const base = useRef<ImageData | null>(null);
  const palette = projectPalette(p);
  const changed = look !== 'none' || JSON.stringify(adj) !== JSON.stringify(NEUTRAL) || crop.aspect != null || crop.zoom !== 1 || !!mask || cut != null;

  useEffect(() => {
    if (!url) return;
    let off = false;
    fetch(url)
      .then((r) => r.blob())
      .then((b) => createImageBitmap(b))
      .then((b) => !off && setBmp(b))
      .catch(() => toast(t('This image could not be read.'), { tone: 'error' }));
    return () => {
      off = true;
    };
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // preview size: the crop's aspect, fitted to the free area, at most 1400 px on the long side
  const rect = bmp ? cropRect(bmp.width, bmp.height, crop) : null;
  const pv = useMemo(() => {
    if (!rect) return { w: 0, h: 0 };
    const s = Math.min(boxSize.w / rect.sw, boxSize.h / rect.sh, 1400 / Math.max(rect.sw, rect.sh));
    return { w: Math.max(1, Math.round(rect.sw * s)), h: Math.max(1, Math.round(rect.sh * s)) };
  }, [rect?.sw, rect?.sh, boxSize.w, boxSize.h]); // eslint-disable-line react-hooks/exhaustive-deps

  // the cropped base pixels: recomputed only when the crop or the size changes
  useEffect(() => {
    if (!bmp || !rect || !pv.w) return;
    const c = document.createElement('canvas');
    c.width = pv.w;
    c.height = pv.h;
    const x = c.getContext('2d', { willReadFrequently: true })!;
    x.drawImage(bmp, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, pv.w, pv.h);
    base.current = x.getImageData(0, 0, pv.w, pv.h);
    cutBase.current = cut != null ? cutout(base.current, cut) : null;
    draw();
  }, [bmp, pv.w, pv.h, rect?.sx, rect?.sy]); // eslint-disable-line react-hooks/exhaustive-deps

  // adjustments: one redraw per frame
  const raf = useRef(0);
  const draw = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const c = cv.current;
      if (!c || !base.current) return;
      c.width = base.current.width;
      c.height = base.current.height;
      const ctx = c.getContext('2d')!;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.putImageData(apply(cutBase.current ?? base.current, adj, split ?? 0, mask), 0, 0);
    });
  };
  useEffect(draw, [adj, split, mask]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!base.current) return;
    cutBase.current = cut != null ? cutout(base.current, cut) : null;
    draw();
  }, [cut]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Partial<Adjust>) => {
    setLook('custom');
    setAdj((a) => ({ ...a, ...patch }));
  };

  // drag the picture inside the crop; click with the pipette to take a colour
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const [maskEdit, setMaskEdit] = useState(false);
  const onDown = (e: React.PointerEvent) => {
    if (maskEdit && mask) {
      const r = cv.current!.getBoundingClientRect();
      setMask({ ...mask, x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      drag.current = { x: -2, y: 0, cx: 0, cy: 0 };
      return;
    }
    if (picker) {
      const c = cv.current!;
      const r = c.getBoundingClientRect();
      const px = c.getContext('2d')!.getImageData(Math.floor(((e.clientX - r.left) / r.width) * c.width), Math.floor(((e.clientY - r.top) / r.height) * c.height), 1, 1).data;
      const hex = rgbToHex(px[0], px[1], px[2]);
      addColour(hex);
      return;
    }
    if (split != null) {
      const r = cv.current!.getBoundingClientRect();
      setSplit(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      drag.current = { x: -1, y: 0, cx: 0, cy: 0 };
      return;
    }
    if (crop.zoom === 1 && crop.aspect == null) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, cx: crop.x, cy: crop.y };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !e.buttons) return;
    if (d.x === -2 && mask) {
      const r = cv.current!.getBoundingClientRect();
      setMask({ ...mask, x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) });
      return;
    }
    if (d.x === -1) {
      const r = cv.current!.getBoundingClientRect();
      setSplit(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
      return;
    }
    const k = 2 / Math.max(80, pv.w);
    setCrop((c) => ({ ...c, x: Math.max(-1, Math.min(1, d.cx - (e.clientX - d.x) * k * c.zoom)), y: Math.max(-1, Math.min(1, d.cy - (e.clientY - d.y) * k * c.zoom)) }));
  };

  const addColour = (hex: string) => {
    if (palette.includes(hex)) return;
    ws.setPalette(p.id, [...(p.palette ?? palette), hex].slice(-12));
    toast(t('{c} added to the project palette', { c: hex }));
  };
  const extract = async () => {
    const c = cv.current;
    if (!c) return;
    const b = await new Promise<Blob | null>((r) => c.toBlob(r));
    if (!b) return;
    const cols = await extractPalette(b, 6);
    ws.setPalette(p.id, [...new Set([...(p.palette ?? []), ...cols])].slice(-12));
    toast(t('Palette taken from the image'));
  };

  async function full(): Promise<{ blob: Blob; w: number; h: number }> {
    const r = rect!;
    // full resolution, capped so a phone can hold it in memory
    const s = Math.min(1, 6000 / Math.max(r.sw, r.sh));
    const w = Math.round(r.sw * s);
    const h = Math.round(r.sh * s);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true })!;
    x.drawImage(bmp!, r.sx, r.sy, r.sw, r.sh, 0, 0, w, h);
    let px = x.getImageData(0, 0, w, h);
    if (cut != null) px = cutout(px, cut);
    x.putImageData(apply(px, adj, 0, mask), 0, 0);
    const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), cut != null ? 'image/png' : 'image/jpeg', 0.92));
    return { blob, w, h };
  }
  const work = p.works.find((w) => w.versions.some((v) => v.assetId === (from?.id ?? asset.id))) ?? p.works.find((w) => w.versions.some((v) => v.assetId === asset.id));
  async function save(target: 'version' | 'work' | 'download') {
    if (!bmp || !rect) return;
    setBusy(true);
    try {
      const { blob, w, h } = await full();
      if (target === 'download') {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${asset.title.replace(/[^\w\- ]+/g, '').trim() || 'image'}-edit.${cut != null ? 'png' : 'jpg'}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        return;
      }
      const na = await stillToAsset(await downscale(blob, 6000, 'image/webp'), w, h, `${asset.title} · ${t('edit')}`);
      na.palette = await extractPalette(blob);
      na.recipe = { sourceId: asset.id, adjust: { ...adj }, look, crop, mask: mask ? { ...mask, adjust: { ...mask.adjust } } : null, cutout: cut != null ? { tolerance: cut } : null };
      ws.addAsset(p.id, na);
      if (target === 'version' && work) {
        ws.addVersion(p.id, work.id, na.id);
        toast(t('Saved as a new version of “{name}”', { name: work.title }));
        go(`/p/${p.id}?i=${work.id}`);
      } else {
        const wid = ws.workFromAsset(p.id, na.id);
        toast(t('Saved as a new work'));
        go(`/p/${p.id}?s=make&i=${wid}`);
      }
    } catch {
      toast(t('Saving failed. Try a smaller crop.'), { tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const panel = (
    <div className="space-y-5">
      {asset.recipe && (
        <div className="rounded-[16px] bg-white/10 p-3 text-[12.5px] leading-[1.45]">
          <p className="font-bold">{t('This is an edited copy')}</p>
          <p className="mt-1 text-white/70">{t('Its edits are saved with it. Continue from the original to change them without losing quality.')}</p>
          <button type="button" onClick={() => onReopen(asset.recipe!.sourceId, asset.id)} className="lg-btn lg-btn-primary mt-2 min-h-[34px] text-[12.5px]">
            {t('Continue editing')}
          </button>
        </div>
      )}
      {from && <p className="rounded-[16px] bg-white/10 p-3 text-[12.5px]">{t('Editing from the original with the saved settings of “{name}”.', { name: from.title })}</p>}
      <Section title={t('Format')} icon={<CropIcon size={16} />}>
        <Seg cols={3} label={t('Format')} value={ASPECTS.find((a) => a.r === crop.aspect)?.id ?? 'Original'} options={ASPECTS.map((a) => ({ id: a.id, label: a.id === 'Original' ? t('Original') : a.id }))} onChange={(id) => setCrop({ aspect: ASPECTS.find((a) => a.id === id)!.r, zoom: 1, x: 0, y: 0 })} />
        <Slider label={t('Zoom')} value={crop.zoom} min={1} max={4} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setCrop((c) => ({ ...c, zoom: v }))} />
        <p className="text-[11.5px] text-white/60">{t('Drag the picture to move it inside the frame.')}</p>
      </Section>
      <Section title={t('Look')} icon={<Sparkles size={16} />}>
        <div className="flex flex-wrap gap-1.5">
          {LOOKS.map((l) => (
            <button key={l.id} type="button" onClick={() => (setLook(l.id), setAdj(l.adjust))} aria-pressed={look === l.id} className={`min-h-[36px] flex-auto whitespace-nowrap rounded-[10px] px-3 text-[12px] font-bold ${look === l.id ? 'bg-white text-[#11151a]' : 'bg-white/10 hover:bg-white/15'}`}>
              {t(l.name)}
            </button>
          ))}
        </div>
      </Section>
      <Section title={t('Adjust')} icon={<SunMedium size={16} />}>
        <Slider label={t('Exposure')} value={adj.exposure} min={-1.5} max={1.5} fmt={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`} onChange={(v) => set({ exposure: v })} />
        <Slider label={t('Contrast')} value={adj.contrast} min={-1} max={1} onChange={(v) => set({ contrast: v })} />
        <Slider label={t('Saturation')} value={adj.saturation} min={-1} max={1} onChange={(v) => set({ saturation: v })} />
        <Slider label={t('Warmth')} value={adj.warmth} min={-1} max={1} onChange={(v) => set({ warmth: v })} />
        <Slider label={t('Tint')} value={adj.tint} min={-1} max={1} onChange={(v) => set({ tint: v })} />
        <Slider label={t('Fade')} value={adj.fade} min={0} max={1} onChange={(v) => set({ fade: v })} />
        <Slider label={t('Vignette')} value={adj.vignette} min={0} max={1} onChange={(v) => set({ vignette: v })} />
        <Slider label={t('Grain')} value={adj.grain} min={0} max={1} onChange={(v) => set({ grain: v })} />
        <button type="button" disabled={!changed} onClick={() => (setAdj(NEUTRAL), setLook('none'), setCrop({ aspect: null, zoom: 1, x: 0, y: 0 }))} className="lg-btn lg-btn-ghost min-h-[36px] w-full text-[12.5px] disabled:opacity-40">
          <RotateCcw size={14} /> {t('Reset all')}
        </button>
      </Section>
      <Section title={t('Local area')} icon={<Circle size={16} />}>
        {!mask ? (
          <button type="button" onClick={() => (setMask({ x: 0.5, y: 0.45, r: 0.28, feather: 0.6, invert: false, adjust: { ...NEUTRAL, exposure: 0.35 } }), setMaskEdit(true))} className="lg-btn lg-btn-ghost min-h-[36px] w-full text-[12.5px]">
            <Plus size={14} /> {t('Add a radial area')}
          </button>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setMaskEdit((v) => !v)} aria-pressed={maskEdit} className={`lg-btn min-h-[36px] text-[12.5px] ${maskEdit ? 'lg-btn-primary' : 'lg-btn-ghost'}`}>
                <Move size={14} /> {t('Place it')}
              </button>
              <button type="button" onClick={() => setMask({ ...mask, invert: !mask.invert })} aria-pressed={mask.invert} className={`lg-btn min-h-[36px] text-[12.5px] ${mask.invert ? 'lg-btn-primary' : 'lg-btn-ghost'}`}>
                {t('Outside')}
              </button>
            </div>
            <Slider label={t('Size')} value={mask.r} min={0.05} max={0.9} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setMask({ ...mask, r: v })} />
            <Slider label={t('Softness')} value={mask.feather} min={0.02} max={1} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setMask({ ...mask, feather: v })} />
            <Slider label={t('Exposure')} value={mask.adjust.exposure} min={-1.5} max={1.5} fmt={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`} onChange={(v) => setMask({ ...mask, adjust: { ...mask.adjust, exposure: v } })} />
            <Slider label={t('Contrast')} value={mask.adjust.contrast} min={-1} max={1} onChange={(v) => setMask({ ...mask, adjust: { ...mask.adjust, contrast: v } })} />
            <Slider label={t('Saturation')} value={mask.adjust.saturation} min={-1} max={1} onChange={(v) => setMask({ ...mask, adjust: { ...mask.adjust, saturation: v } })} />
            <Slider label={t('Warmth')} value={mask.adjust.warmth} min={-1} max={1} onChange={(v) => setMask({ ...mask, adjust: { ...mask.adjust, warmth: v } })} />
            <button type="button" onClick={() => (setMask(null), setMaskEdit(false))} className="lg-btn lg-btn-plain min-h-[32px] text-[12px]">
              <X size={13} /> {t('Remove the area')}
            </button>
          </>
        )}
      </Section>
      <Section title={t('Cut out')} icon={<Scissors size={16} />}>
        <p className="text-[11.5px] leading-[1.45] text-white/60">{t('Takes a plain background away (studio shots, renders). Busy backgrounds stay; the result saves as PNG with transparency.')}</p>
        {cut == null ? (
          <button type="button" onClick={() => setCut(0.07)} className="lg-btn lg-btn-ghost min-h-[36px] w-full text-[12.5px]">
            <Scissors size={14} /> {t('Remove the background')}
          </button>
        ) : (
          <>
            <Slider label={t('Tolerance')} value={cut} min={0.02} max={0.4} fmt={(v) => `${Math.round(v * 100)}%`} onChange={setCut} />
            <button type="button" onClick={() => setCut(null)} className="lg-btn lg-btn-plain min-h-[32px] text-[12px]">
              <X size={13} /> {t('Keep the background')}
            </button>
          </>
        )}
      </Section>
      <Section title={t('Palette')} icon={<Pipette size={16} />}>
        <div className="flex flex-wrap gap-1.5">
          {palette.map((c) => (
            <span key={c} className="group relative">
              <span className="block h-8 w-8 rounded-full ring-1 ring-white/30" style={{ background: c }} title={c} />
              <button type="button" onClick={() => ws.setPalette(p.id, palette.filter((x) => x !== c))} aria-label={t('Remove {name}', { name: c })} className="absolute -end-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-white text-[#11151a] group-hover:flex">
                <X size={10} />
              </button>
            </span>
          ))}
          {!palette.length && <p className="text-[12px] text-white/65">{t('No colours yet.')}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setPicker((v) => !v)} aria-pressed={picker} className={`lg-btn min-h-[36px] text-[12.5px] ${picker ? 'lg-btn-primary' : 'lg-btn-ghost'}`}>
            <Pipette size={14} /> {t('Pipette')}
          </button>
          <button type="button" onClick={extract} className="lg-btn lg-btn-ghost min-h-[36px] text-[12.5px]">
            <Plus size={14} /> {t('From image')}
          </button>
        </div>
        <p className="text-[11.5px] leading-[1.45] text-white/60">{t('The palette feeds the 3D materials, Variations and Canvas.')}</p>
      </Section>
      <Section title={t('Save')} icon={<Download size={16} />}>
        <div className="grid grid-cols-2 gap-2">
          {work && (
            <button type="button" disabled={busy || !changed} onClick={() => save('version')} className="lg-btn lg-btn-primary col-span-2 disabled:opacity-50">
              {busy ? t('Saving…') : t('Save as new version')}
            </button>
          )}
          <button type="button" disabled={busy || !changed} onClick={() => save('work')} className={`lg-btn ${work ? 'lg-btn-ghost' : 'lg-btn-primary'} min-h-[38px] text-[12.5px] disabled:opacity-50`}>
            {t('New work')}
          </button>
          <button type="button" disabled={busy} onClick={() => save('download')} className="lg-btn lg-btn-ghost min-h-[38px] text-[12.5px] disabled:opacity-50">
            <Download size={14} /> {cut != null ? 'PNG' : 'JPG'}
          </button>
        </div>
        <p className="text-[11.5px] leading-[1.45] text-white/60">{t('The original stays as it is. Saving adds a new file.')}</p>
      </Section>
    </div>
  );

  return (
    <>
      <div ref={box} className={`absolute flex items-center justify-center ${narrow ? 'inset-x-3 bottom-[84px] top-[76px]' : 'bottom-6 end-[340px] start-[268px] top-[96px]'}`}>
        {!bmp && <p className="lg-glass rounded-full px-4 py-2 text-[13px]">{t('Opening the image…')}</p>}
        <div className="relative" style={{ width: pv.w, height: pv.h, ...(cut != null ? { backgroundColor: '#ddd', backgroundImage: 'linear-gradient(45deg,#bbb 25%,transparent 25%,transparent 75%,#bbb 75%),linear-gradient(45deg,#bbb 25%,transparent 25%,transparent 75%,#bbb 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0,10px 10px' } : {}) }}>
          <canvas
            ref={cv}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={() => (drag.current = null)}
            className={`block h-full w-full touch-none rounded-[6px] shadow-[0_30px_80px_rgba(0,0,0,.45)] ${maskEdit && mask ? 'cursor-move' : picker ? 'cursor-crosshair' : split != null ? 'cursor-ew-resize' : crop.zoom > 1 || crop.aspect ? 'cursor-grab active:cursor-grabbing' : ''}`}
            aria-label={t('Image preview')}
          />
          {mask && maskEdit && (
            <span className="pointer-events-none absolute rounded-full border-2 border-dashed border-white shadow-[0_0_0_1px_rgba(0,0,0,.3)]" style={{ left: mask.x * pv.w - mask.r * Math.max(pv.w, pv.h), top: mask.y * pv.h - mask.r * Math.max(pv.w, pv.h), width: 2 * mask.r * Math.max(pv.w, pv.h), height: 2 * mask.r * Math.max(pv.w, pv.h) }} />
          )}
          {split != null && (
            <>
              <div className="pointer-events-none absolute inset-y-0 w-px bg-white" style={{ left: `${split * 100}%` }} />
              <span className="lg-glass pointer-events-none absolute start-2 top-2 rounded-full px-2.5 py-1 text-[11.5px] font-bold">{t('Before')}</span>
              <span className="lg-glass pointer-events-none absolute end-2 top-2 rounded-full px-2.5 py-1 text-[11.5px] font-bold">{t('After')}</span>
            </>
          )}
        </div>
      </div>

      {/* tool rail */}
      <Pane as="nav" aria-label={t('View')} className={`absolute z-20 flex flex-col gap-1 rounded-[22px] p-1.5 ${narrow ? 'start-3 top-[76px]' : 'start-4 top-[84px]'}`}>
        <button type="button" onClick={() => setSplit(split == null ? 0.5 : null)} aria-pressed={split != null} title={t('Before / after')} aria-label={t('Before / after')} className={`lg-btn lg-icon ${split != null ? 'lg-btn-primary' : 'lg-btn-plain'}`}>
          <Columns2 size={17} />
        </button>
        <button type="button" onClick={() => setPicker((v) => !v)} aria-pressed={picker} title={t('Pipette')} aria-label={t('Pipette')} className={`lg-btn lg-icon ${picker ? 'lg-btn-primary' : 'lg-btn-plain'}`}>
          <Pipette size={17} />
        </button>
      </Pane>

      {!narrow ? (
        <>
          <Pane as="aside" aria-label={t('Images')} className="absolute bottom-4 start-[84px] top-[84px] z-20 flex w-[168px] flex-col gap-3 overflow-hidden rounded-[24px] p-3">
            {list}
          </Pane>
          <Pane as="aside" aria-label={t('Inspector')} className="absolute bottom-4 end-4 top-[84px] z-20 w-[312px] overflow-y-auto rounded-[24px] p-4 lg-scroll">
            {panel}
          </Pane>
        </>
      ) : (
        <>
          <Pane as="nav" aria-label={t('Inspector')} className="absolute inset-x-3 bottom-3 z-20 flex gap-1 rounded-full p-1.5">
            {(
              [
                ['images', t('Images')],
                ['adjust', t('Edit')],
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
                {sheet === 'images' ? list : panel}
              </Pane>
            )}
          </AnimatePresence>
        </>
      )}
    </>
  );
}
