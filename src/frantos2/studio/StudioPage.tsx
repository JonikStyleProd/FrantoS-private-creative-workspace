import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Frame as FrameIcon } from 'lucide-react';
import { MockupMode } from '../kits/MockupMode';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Box, Camera, Columns2, Download, Eye, Film, Grid3x3, Image as ImageIcon, Layers, Lock, Plus, RefreshCcw, RotateCw, Search, Sparkles, SunMedium, Trash2, Undo2, Upload, Video, Wand2, X } from 'lucide-react';
import '../glass/glass.css';
import { useI18n } from '../i18n';
import { go } from '../route';
import { ws, useProject, ensureLoaded, undo } from '../ws/store';
import type { Asset, LightPreset, MaterialVariant, Project, StudioObject } from '../ws/types';
import { assetUrl, extractPalette, ingest, useAssetUrl } from '../ws/media';
import { UploadError } from '../ws/media';
import { FilePick, upload, useDropZone } from '../ws/uploads';
import { toast, useMedia } from '../ws/kit';
import { openPalette } from '../daily/Palette';
import { Pane, ThemeSwitch } from '../glass/kit';
import { GlassAccount } from '../glass/account';
import { createObjectScene, ObjectScene, ViewMode } from './scene';
import { blobToDataUrl, downscale, ingestHDRI, ingestModel, stillToAsset } from './models';
import { projectPalette, variations } from './palette';
import { canRecord, recordCanvas, recordGif, videoFormat } from './record';
import { VESSEL_VARIANTS } from '../ws/seed';
import { ColorField, PaletteRow, Section, Seg, Slider, Swatch } from './ui';
import { PhotoMaterialButton, SceneSection } from './SceneSection';
import { NotesOverlay } from './NotesOverlay';
import { Globe2 } from 'lucide-react';
import { ImageMode } from './ImageMode';
import { CanvasMode } from './CanvasMode';
import { MotionMode } from './MotionMode';
import { ShortcutsHelp, useCmd, useStudioCommands } from './commands';
import { GpuChip } from '../glass/GpuNotice';

/**
 * FrantoS Studio — editor. Phase 1: 3D · Object mode.
 *   #/s/:projectId?o=<objectId>
 */
export function StudioPage({ id, q }: { id: string; q: URLSearchParams }) {
  const { t, dir } = useI18n();
  const { project: p, loading } = useProject(id);
  useEffect(() => void ensureLoaded(), []);
  if (!p && loading) return <div className="lg lg-studio lg-studio-blank fixed inset-0" />;
  if (!p)
    return (
      <div className="lg fixed inset-0 flex items-center justify-center" dir={dir}>
        <Pane className="rounded-[26px] p-8 text-center">
          <p className="text-[18px] font-bold">{t('This project is not here')}</p>
          <button type="button" onClick={() => go('/app')} className="lg-btn lg-btn-primary mt-5">
            {t('All projects')}
          </button>
        </Pane>
      </div>
    );
  return <Editor p={p} q={q} />;
}

const MODES = [
  { id: 'object', label: '3D · Object', icon: Box, ready: true, key: '1' },
  { id: 'image', label: 'Image', icon: ImageIcon, ready: true, key: '2' },
  { id: 'canvas', label: 'Canvas', icon: Layers, ready: true, key: '3' },
  { id: 'motion', label: 'Motion', icon: Film, ready: true, key: '4' },
  { id: 'mockup', label: 'Mockups', icon: FrameIcon, ready: true, key: '5' },
] as const;
export type StudioMode = (typeof MODES)[number]['id'];

const LIGHTS: { id: LightPreset; label: string }[] = [
  { id: 'softbox', label: 'Softbox' },
  { id: 'window', label: 'Window' },
  { id: 'spot', label: 'Hard spot' },
  { id: 'rim', label: 'Rim' },
  { id: 'morning', label: 'Morning' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'hdri', label: 'HDRI' },
];
const LENSES = [35, 50, 85, 135];
const SIZES = [
  { id: '4:5', w: 1600, h: 2000 },
  { id: '1:1', w: 2048, h: 2048 },
  { id: '16:9', w: 1920, h: 1080 },
  { id: '9:16', w: 1080, h: 1920 },
];

function newVesselObject(): Omit<StudioObject, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    title: 'Vessel',
    source: { kind: 'vessel', twist: 0.62, height: 1.25, waist: 0.08 },
    variants: VESSEL_VARIANTS.map((v) => ({ ...v })),
    variantId: VESSEL_VARIANTS[0].id,
    light: { preset: 'softbox', angle: -35, intensity: 1 },
    camera: { lens: 85 },
    background: { kind: 'studio', color: '#e7e3d8' },
    turntable: { seconds: 12 },
  };
}

function Editor({ p, q }: { p: Project; q: URLSearchParams }) {
  const { t, dir } = useI18n();
  const narrow = useMedia('(max-width: 900px)');
  const objects = p.objects ?? [];
  const stored = objects.find((o) => o.id === q.get('o')) ?? objects[0];
  const setQ = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(q);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    go(`/s/${p.id}?${next.toString()}`, { replace: true });
  };

  const addVessel = () => {
    const oid = ws.addObject(p.id, newVesselObject());
    setQ({ o: oid });
  };
  const importModel = async (files: FileList) => {
    const f = files[0];
    if (!f) return;
    try {
      const a = await ingestModel(f);
      ws.addAsset(p.id, a);
      const oid = ws.addObject(p.id, { ...newVesselObject(), title: a.title, source: { kind: 'model', assetId: a.id } });
      setQ({ o: oid });
      toast(t('Model imported'));
    } catch (e) {
      toast(e instanceof UploadError ? e.message : t('This model could not be read.'), { tone: 'error' });
    }
  };

  // a project without a palette yet: take one from its cover (or first image), once
  useEffect(() => {
    if (projectPalette(p).length) return;
    const a = p.assets.find((x) => x.id === p.coverAssetId && x.kind === 'image') ?? p.assets.find((x) => x.kind === 'image');
    if (!a) return;
    let live = true;
    assetUrl(a, 'thumb')
      .then((u) => (u ? extractPalette(u, 6) : []))
      .then((cols) => live && cols.length && ws.setPalette(p.id, cols, undefined));
    return () => {
      live = false;
    };
  }, [p.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // drop files anywhere in the studio: GLB → a new object, .hdr → the light, pictures → the project
  const drop = useDropZone(async (files) => {
    for (const f of Array.from(files)) {
      if (/\.glb$/i.test(f.name)) {
        const dt = new DataTransfer();
        dt.items.add(f);
        await importModel(dt.files);
      } else if (/\.hdr$/i.test(f.name)) {
        try {
          const a = await ingestHDRI(f);
          ws.addAsset(p.id, a);
          if (stored) ws.patchObject(p.id, stored.id, { light: { ...stored.light, preset: 'hdri', hdriAssetId: a.id } }, 'Light changed');
          toast(t('Environment added'));
        } catch (e) {
          toast(e instanceof UploadError ? e.message : t('This environment could not be read.'), { tone: 'error' });
        }
      } else if (/^(image|video)\//.test(f.type)) {
        upload([f], p.id, { isReference: true, then: (a) => mode === 'image' && a.kind === 'image' && setQ({ a: a.id }) });
      }
    }
  });

  const mode: StudioMode = (MODES.find((m) => m.id === q.get('m'))?.id ?? 'object') as StudioMode;
  const setMode = (m: StudioMode) => setQ({ m: m === 'object' ? undefined : m });
  useStudioCommands(p, stored, mode, setMode);

  return (
    <div className="lg lg-studio fixed inset-0 overflow-hidden" dir={dir} {...(mode === 'canvas' ? {} : drop.props)}>
      {drop.over && mode !== 'canvas' && (
        <div className="pointer-events-none absolute inset-4 z-[60] flex items-center justify-center rounded-[30px] border-2 border-dashed border-white/80 bg-black/30 text-center text-[18px] font-bold">
          {t('Drop GLB, .hdr, pictures or video')}
        </div>
      )}
      {mode === 'image' ? (
        <ImageMode p={p} q={q} setQ={setQ} />
      ) : mode === 'canvas' ? (
        <CanvasMode p={p} q={q} setQ={setQ} />
      ) : mode === 'motion' ? (
        <MotionMode p={p} o={stored} />
      ) : mode === 'mockup' ? (
        <MockupMode p={p} />
      ) : stored ? (
        <ObjectEditor key={stored.id} p={p} o={stored} narrow={narrow} onImport={importModel} onAddVessel={addVessel} onPick={(oid) => setQ({ o: oid })} />
      ) : (
        <div className="flex h-full items-center justify-center p-6">
          <Pane className="max-w-[440px] rounded-[28px] p-7 text-center">
            <Box className="mx-auto" />
            <p className="mt-3 text-[20px] font-bold">{t('No objects in this project yet')}</p>
            <p className="mt-2 text-[14.5px] leading-[1.5] text-white/80">{t('Start from the parametric vessel or import your own GLB.')}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={addVessel} className="lg-btn lg-btn-primary">
                <Plus size={16} /> {t('New vessel')}
              </button>
              <FilePick onFiles={importModel} multiple={false} accept=".glb,model/gltf-binary" className="lg-btn lg-btn-ghost">
                <Upload size={16} /> {t('Import GLB')}
              </FilePick>
            </div>
          </Pane>
        </div>
      )}
      <TopBar p={p} o={stored} mode={mode} onMode={setMode} />
      <ShortcutsHelp mode={mode} />
    </div>
  );
}

/* ───────── top bar ───────── */

function TopBar({ p, o, mode, onMode }: { p: Project; o?: StudioObject; mode: StudioMode; onMode: (m: StudioMode) => void }) {
  const { t } = useI18n();
  return (
    <header className="absolute inset-x-3 top-3 z-30 flex items-center gap-2 sm:inset-x-4 sm:top-4">
      <Pane className="flex min-w-0 max-w-[340px] items-center gap-1 rounded-full py-1 ps-1 max-sm:pe-1 sm:pe-4">
        <button type="button" onClick={() => go(`/p/${p.id}`)} className="lg-btn lg-btn-plain lg-icon" aria-label={t('Back to the project')}>
          <ArrowLeft size={18} className="rtl:-scale-x-100" />
        </button>
        <span dir="auto" title={p.title} className="min-w-[72px] truncate text-[15px] font-bold max-sm:hidden">
          {p.title}
        </span>
        <span className="ms-2 hidden whitespace-nowrap text-[12.5px] text-white/65 2xl:inline">{t('Studio')}</span>
      </Pane>
      <Pane as="nav" aria-label={t('Editor mode')} className="mx-auto flex items-center gap-0.5 rounded-full p-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onMode(m.id)}
            aria-pressed={m.id === mode}
            title={`${t(m.label)} (${m.key})`}
            aria-label={t(m.label)}
            className={`relative flex min-h-[40px] min-w-[40px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[13.5px] font-bold transition-colors xl:px-4 ${m.id === mode ? 'bg-white text-[#11151a]' : 'text-white/75 hover:bg-white/10'}`}
          >
            <m.icon size={15} /> <span className="hidden xl:inline">{t(m.label)}</span>
          </button>
        ))}
      </Pane>
      <div className="ms-auto flex items-center gap-2 md:ms-0">
        <Pane className="flex items-center gap-1 rounded-full p-1">
          <button
            type="button"
            onClick={() => {
              const l = undo();
              toast(l ? t('Undone: {what}', { what: t(l) }) : t('Nothing to undo'));
            }}
            className="lg-btn lg-btn-plain lg-icon max-md:!hidden"
            aria-label={t('Undo')}
          >
            <Undo2 size={17} />
          </button>
          <button type="button" onClick={openPalette} className="lg-btn lg-btn-plain min-h-[40px] text-[13px] max-md:!hidden" aria-label={t('Search or run a command')}>
            <Search size={15} /> <span className="text-white/60">⌘K</span>
          </button>
          <GpuChip />
          <ThemeSwitch />
        </Pane>
        {o && (
          <button type="button" onClick={() => go(`/o/${p.id}/${o.id}`)} className="lg-btn lg-btn-primary max-md:w-11 max-md:px-0" aria-label={t('Showroom')}>
            <Eye size={16} /> <span className="hidden lg:inline">{t('Showroom')}</span>
          </button>
        )}
        <div className="max-md:hidden">
          <GlassAccount />
        </div>
      </div>
    </header>
  );
}

/* ───────── object editor ───────── */

type Draft = StudioObject;

function ObjectEditor({ p, o, narrow, onImport, onAddVessel, onPick }: { p: Project; o: StudioObject; narrow: boolean; onImport: (f: FileList) => void; onAddVessel: () => void; onPick: (id: string) => void }) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ObjectScene | null>(null);
  const [draft, setDraft] = useState<Draft>(o);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [view, setView] = useState<ViewMode>('render');
  const [spin, setSpin] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<null | 'material' | 'light' | 'shape' | 'render' | 'objects'>(null);
  const pending = useRef<{ patch: Partial<StudioObject>; label: string } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const thumbTimer = useRef<number | undefined>(undefined);
  const modelAsset = draft.source.kind === 'model' ? p.assets.find((a) => a.id === (draft.source as { assetId: string }).assetId) : undefined;
  const modelUrl = useAssetUrl(modelAsset, 'full').url;
  const hdriAsset = draft.light.hdriAssetId ? p.assets.find((a) => a.id === draft.light.hdriAssetId) : undefined;
  const hdriUrl = useAssetUrl(hdriAsset, 'full').url;
  const [compareId, setCompareId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [split, setSplit] = useState(0.5);
  const [rec, setRec] = useState<number | null>(null);
  const recAbort = useRef<AbortController | null>(null);
  const [ideas, setIdeas] = useState<MaterialVariant[] | null>(null);
  const palette = projectPalette(p);
  /** colour ideas; on an imported model they become recolours of its texture */
  const ideasFor = () => variations(variant, palette).map((v) => (draft.source.kind === 'model' ? { ...v, finish: 'tint' as const, tint: 1, metal: variant.metal ?? 0 } : v));

  // outside changes (undo, sync) win when nothing is being edited here
  useEffect(() => {
    if (!pending.current) setDraft(o);
  }, [o]);

  // scene lifecycle
  useEffect(() => {
    const c = canvasRef.current!;
    let s: ObjectScene;
    try {
      s = createObjectScene(c);
    } catch (e) {
      console.warn('FrantoS: 3D could not start', e);
      setError(t('3D needs WebGL, and this browser has it turned off.'));
      return;
    }
    sceneRef.current = s;
    return () => {
      s.dispose();
      sceneRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // geometry / model
  // while a slider moves: a light mesh and half-size textures; full quality once it rests
  const sourceKey = JSON.stringify(draft.source);
  const firstLoad = useRef(true);
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    if (draft.source.kind === 'model' && !modelUrl) return;
    if (firstLoad.current) {
      firstLoad.current = false;
      s.setObject(draft, modelUrl)
        .then(() => setReady(true))
        .catch(() => setError(t('This model could not be read.')));
      return;
    }
    const raf = requestAnimationFrame(() => void s.setObject(draft, modelUrl, 'draft'));
    const full = window.setTimeout(() => void s.setObject(draftRef.current, modelUrl, 'full'), 280);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(full);
    };
  }, [sourceKey, modelUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const variant = draft.variants.find((v) => v.id === draft.variantId) ?? draft.variants[0];
  const variantKey = JSON.stringify(variant);
  const firstPaint = useRef(true);
  useEffect(() => {
    if (!ready) return;
    if (firstPaint.current) {
      firstPaint.current = false;
      return;
    }
    // one repaint per frame at most, however fast the slider moves
    const id = requestAnimationFrame(() => sceneRef.current?.setVariant(variant));
    return () => cancelAnimationFrame(id);
  }, [variantKey, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => sceneRef.current?.setLight(draft.light), [JSON.stringify(draft.light)]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!ready) return;
    sceneRef.current?.setHDRI(draft.light.preset === 'hdri' && hdriUrl ? hdriUrl : null).catch(() => toast(t('This environment could not be read.'), { tone: 'error' }));
  }, [hdriUrl, draft.light.preset === 'hdri', ready]); // eslint-disable-line react-hooks/exhaustive-deps
  // A/B: the left side keeps the variant you compare against
  const compareVariant = compareId ? draft.variants.find((v) => v.id === compareId && v.id !== variant.id) : undefined;
  useEffect(() => {
    if (!ready) return;
    const id = requestAnimationFrame(() => sceneRef.current?.setCompare(compareVariant ?? null, split));
    return () => cancelAnimationFrame(id);
  }, [compareVariant && JSON.stringify(compareVariant), split, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => sceneRef.current?.setLens(draft.camera.lens), [draft.camera.lens, ready]);
  const firstStage = useRef(true);
  useEffect(() => {
    if (!ready) return;
    if (firstStage.current) return void (firstStage.current = false);
    sceneRef.current?.setStage(draft.stage);
  }, [draft.stage, ready]);
  useEffect(() => sceneRef.current?.setView(view), [view, ready]);
  const firstExtras = useRef(true);
  useEffect(() => {
    if (!ready) return;
    if (firstExtras.current) return void (firstExtras.current = false);
    sceneRef.current?.setExtras(draft.extras);
  }, [JSON.stringify(draft.extras ?? null), ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => sceneRef.current?.setTurntable(spin, draft.turntable.seconds), [spin, draft.turntable.seconds]);

  // edits: live in the draft, saved shortly after (one undo step per pause)
  const edit = (patch: Partial<StudioObject>, label = 'Object edited') => {
    setDraft((d) => ({ ...d, ...patch }));
    pending.current = { patch: { ...(pending.current?.patch ?? {}), ...patch }, label };
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 380);
  };
  const flush = () => {
    const pc = pending.current;
    if (!pc) return;
    pending.current = null;
    ws.patchObject(p.id, o.id, pc.patch, pc.label);
    window.clearTimeout(thumbTimer.current);
    thumbTimer.current = window.setTimeout(saveThumb, 900);
  };
  useEffect(() => {
    // leaving the page: hand pending edits to the store before it writes its journal (pagehide)
    const now = () => flush();
    const hide = () => document.visibilityState === 'hidden' && flush();
    window.addEventListener('beforeunload', now);
    document.addEventListener('visibilitychange', hide);
    return () => {
      window.removeEventListener('beforeunload', now);
      document.removeEventListener('visibilitychange', hide);
      flush();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const editVariant = (vp: Partial<MaterialVariant>) => edit({ variants: draft.variants.map((v) => (v.id === variant.id ? { ...v, ...vp } : v)) }, 'Material edited');

  async function saveThumb() {
    const s = sceneRef.current;
    if (!s) return;
    try {
      const b = await s.snapshot(320, 400, { background: draft.background.kind === 'transparent' ? null : draft.background.color, type: 'image/webp', quality: 0.8 });
      ws.patchObject(p.id, o.id, { thumb: await blobToDataUrl(b) });
    } catch {
      /* a thumbnail is a nicety */
    }
  }

  async function recordTurntable(target: 'project' | 'download') {
    const s = sceneRef.current;
    if (!s || rec != null) return;
    if (!canRecord()) {
      toast(t('This browser cannot record video from the page. Try Chrome, Edge or Safari.'), { tone: 'error' });
      return;
    }
    const ac = new AbortController();
    recAbort.current = ac;
    const start = s.getPose();
    setSpin(false);
    s.setRecording(true, draft.background);
    setRec(0);
    try {
      const { blob, ext } = await recordCanvas(
        s.canvas,
        draft.turntable.seconds,
        (f) => {
          s.setPose({ ...start, az: start.az + 360 * f });
          s.draw();
        },
        ac.signal,
        (f) => setRec(f)
      );
      const name = `${draft.title.replace(/[^\w\- ]+/g, '').trim() || 'object'}-turntable.${ext}`;
      await deliverVideo(blob, name, target);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast(t('Recording failed.'), { tone: 'error' });
    } finally {
      s.setRecording(false);
      s.setPose(start);
      setRec(null);
      recAbort.current = null;
    }
  }
  async function recordTurntableGif() {
    const s = sceneRef.current;
    if (!s || rec != null) return;
    const start = s.getPose();
    setSpin(false);
    s.setRecording(true, draft.background);
    setRec(0);
    const ac = new AbortController();
    recAbort.current = ac;
    try {
      const blob = await recordGif(s.canvas, Math.min(draft.turntable.seconds, 8), (f) => (s.setPose({ ...start, az: start.az + 360 * f }), s.draw()), { signal: ac.signal, onProgress: (f) => setRec(f) });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${draft.title.replace(/[^\w\- ]+/g, '').trim() || 'object'}-turntable.gif`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast(t('Recording failed.'), { tone: 'error' });
    } finally {
      s.setRecording(false);
      s.setPose(start);
      setRec(null);
      recAbort.current = null;
    }
  }
  async function deliverVideo(blob: Blob, name: string, target: 'project' | 'download') {
    if (target === 'download') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      return;
    }
    const asset = await ingest(new File([blob], name, { type: blob.type }), { isReference: false });
    ws.addAsset(p.id, asset);
    const wid = ws.workFromAsset(p.id, asset.id);
    toast(t('Video added to the project as a new work'));
    go(`/p/${p.id}?s=make&i=${wid}`);
  }
  const addIdea = (v: MaterialVariant) => {
    flush();
    const nv = { ...v, id: v.id };
    const variants = [...draftRef.current.variants, nv];
    ws.patchObject(p.id, o.id, { variants, variantId: nv.id }, 'Variant added');
    setDraft((d) => ({ ...d, variants, variantId: nv.id }));
    setIdeas((xs) => xs?.filter((x) => x.id !== v.id) ?? null);
  };
  const importHDRI = async (files: FileList) => {
    const f = files[0];
    if (!f) return;
    try {
      const a = await ingestHDRI(f);
      ws.addAsset(p.id, a);
      edit({ light: { ...draft.light, preset: 'hdri', hdriAssetId: a.id } }, 'Light changed');
      toast(t('Environment added'));
    } catch (e) {
      toast(e instanceof UploadError ? e.message : t('This environment could not be read.'), { tone: 'error' });
    }
  };

  useCmd((c) => {
    const vs = draftRef.current.variants;
    const i = vs.findIndex((v) => v.id === draftRef.current.variantId);
    if (c === 'view-render') setView('render');
    else if (c === 'view-clay') setView('clay');
    else if (c === 'view-wire') setView('wire');
    else if (c === 'turntable') setSpin((v) => !v);
    else if (c === 'reset-camera') sceneRef.current?.resetCamera();
    else if (c === 'variant-prev' || c === 'variant-next') edit({ variantId: vs[(i + (c === 'variant-next' ? 1 : -1) + vs.length) % vs.length].id }, 'Variant changed');
    else if (c === 'variant-dup') addVariantNow();
    else if (c === 'variations') setIdeas(ideas ? null : ideasFor());
    else if (c === 'compare') setCompareId(compareId ? null : vs.find((v) => v.id !== variant.id)?.id ?? null);
    else if (c === 'render-project') void renderStill('project');
    else if (c === 'render-png') void renderStill('download');
    else if (c === 'video-project') void recordTurntable('project');
    else if (c === 'video-download') void recordTurntable('download');
  });
  const addVariantNow = () => {
    flush();
    // a model's first copy starts as a recolour, so the new variant visibly differs from the original
    const base = draft.source.kind === 'model' && (variant.finish ?? 'original') === 'original' ? { ...variant, finish: 'tint' as const, tint: 1, topColor: palette[0] ?? variant.topColor, name: 'Recolour' } : variant;
    const vid = ws.addVariant(p.id, o.id, base);
    setDraft((d) => ({ ...d, variants: [...d.variants, { ...base, id: vid, name: base.name + ' 2' }], variantId: vid }));
  };

  const [size, setSize] = useState(SIZES[0]);
  const [busy, setBusy] = useState(false);
  async function renderStill(target: 'project' | 'download') {
    const s = sceneRef.current;
    if (!s) return;
    setBusy(true);
    try {
      const bg = draft.background.kind === 'transparent' ? null : draft.background.color;
      const blob = await s.render(size.w, size.h, { background: bg });
      if (target === 'download') {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${draft.title.replace(/[^\w\- ]+/g, '').trim() || 'render'}-${variant.name.replace(/[^\w\- ]+/g, '').trim()}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      } else {
        const asset = await stillToAsset(await downscale(blob, 2400, 'image/webp'), size.w, size.h, `${draft.title} · ${t(variant.name)}`);
        ws.addAsset(p.id, asset);
        const wid = ws.workFromAsset(p.id, asset.id);
        toast(t('Render added to the project as a new work'));
        go(`/p/${p.id}?s=make&i=${wid}`);
      }
    } catch {
      toast(t('The render failed. Try a smaller size.'), { tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const bgStyle: React.CSSProperties =
    draft.background.kind === 'studio'
      ? { background: `radial-gradient(ellipse at 50% 40%, ${draft.background.color} 0%, color-mix(in srgb, ${draft.background.color} 55%, #1a1612) 62%, #0e0c0b 100%)` }
      : draft.background.kind === 'color'
        ? { background: draft.background.color }
        : { backgroundColor: '#1b1d21', backgroundImage: 'linear-gradient(45deg,#2a2d33 25%,transparent 25%,transparent 75%,#2a2d33 75%),linear-gradient(45deg,#2a2d33 25%,transparent 25%,transparent 75%,#2a2d33 75%)', backgroundSize: '24px 24px', backgroundPosition: '0 0,12px 12px' };

  const tools: { id: string; label: string; icon: React.ReactNode; on: boolean; run: () => void }[] = [
    { id: 'render', label: t('Render view'), icon: <Sparkles size={17} />, on: view === 'render', run: () => setView('render') },
    { id: 'clay', label: t('Clay view'), icon: <Box size={17} />, on: view === 'clay', run: () => setView('clay') },
    { id: 'wire', label: t('Wireframe'), icon: <Grid3x3 size={17} />, on: view === 'wire', run: () => setView('wire') },
    { id: 'spin', label: t('Turntable'), icon: <RotateCw size={17} />, on: spin, run: () => setSpin((v) => !v) },
    { id: 'reset', label: t('Reset camera'), icon: <RefreshCcw size={17} />, on: false, run: () => sceneRef.current?.resetCamera() },
  ];

  const inspector = (
    <Inspector
      p={p}
      draft={draft}
      variant={variant}
      edit={edit}
      editVariant={editVariant}
      size={size}
      setSize={setSize}
      busy={busy}
      onRender={renderStill}
      onAddVariant={addVariantNow}
      onRemoveVariant={() => {
        flush();
        ws.removeVariant(p.id, o.id, variant.id);
      }}
      x={{
        palette,
        ideas,
        onIdeas: () => setIdeas(ideas ? null : ideasFor()),
        onAddIdea: addIdea,
        compareId: compareVariant?.id ?? null,
        onCompare: (id) => setCompareId(id),
        rec,
        onRecord: recordTurntable,
        onGif: recordTurntableGif,
        onStopRecord: () => recAbort.current?.abort(),
        hdri: hdriAsset,
        envs: p.assets.filter((a) => a.kind === 'env'),
        onImportHDRI: importHDRI,
        project: p,
        placing,
        onPlace: setPlacing,
      }}
    />
  );

  return (
    <>
      {/* the work: viewport fills the window */}
      <div className="absolute inset-0" style={bgStyle}>
        <canvas ref={canvasRef} style={{ opacity: ready ? 1 : 0, transition: 'opacity .35s ease' }} className="absolute inset-0 h-full w-full touch-none outline-none" aria-label={t('3D viewport: drag to orbit, pinch or scroll to zoom')} />
        {compareVariant && <SplitHandle split={split} onSplit={setSplit} a={t(compareVariant.name)} b={t(variant.name)} />}
        {ready && (
          <NotesOverlay
            scene={sceneRef.current}
            notes={draft.notes3d ?? []}
            placing={placing}
            onPlace={(pt) => {
              setPlacing(false);
              edit({ notes3d: [...(draft.notes3d ?? []), { id: `n3-${Date.now().toString(36)}`, p: pt, text: '' }] }, 'Point added');
            }}
          />
        )}
        {rec != null && (
          <p className="lg-glass absolute start-1/2 top-[84px] z-30 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold rtl:translate-x-1/2" role="status">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#ff5a4f]" /> {t('Recording')} · {Math.round(rec * 100)}%
          </p>
        )}
        {!ready && !error && <p className="lg-glass absolute start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full px-4 py-2 text-[13px] rtl:translate-x-1/2">{t('Preparing the object…')}</p>}
        {error && (
          <Pane className="absolute start-1/2 top-1/2 max-w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-[22px] p-5 text-center rtl:translate-x-1/2">
            <p className="text-[15px] font-bold">{error}</p>
          </Pane>
        )}
      </div>

      {/* tool rail */}
      <Pane as="nav" aria-label={t('View')} className={`absolute z-20 flex gap-1 rounded-[22px] p-1.5 ${narrow ? 'start-3 top-[76px] flex-col' : 'start-4 top-[84px] flex-col'}`}>
        {tools.map((tl) => (
          <button key={tl.id} type="button" onClick={tl.run} aria-pressed={tl.on} title={tl.label} aria-label={tl.label} className={`flex h-11 w-11 items-center justify-center rounded-[14px] transition-colors ${tl.on ? 'bg-white text-[#11151a]' : 'text-white/85 hover:bg-white/10'}`}>
            {tl.icon}
          </button>
        ))}
      </Pane>

      {/* objects + scene */}
      {!narrow && (
        <Pane as="aside" aria-label={t('Objects')} className="absolute bottom-4 start-[84px] top-[84px] z-20 flex w-[232px] flex-col gap-3 overflow-hidden rounded-[24px] p-3">
          <ObjectsList p={p} active={o.id} onPick={onPick} onImport={onImport} onAddVessel={onAddVessel} />
        </Pane>
      )}

      {/* inspector */}
      {!narrow ? (
        <Pane as="aside" aria-label={t('Inspector')} className="absolute bottom-4 end-4 top-[84px] z-20 w-[312px] overflow-y-auto rounded-[24px] p-4 lg-scroll">
          {inspector}
        </Pane>
      ) : (
        <>
          <Pane as="nav" aria-label={t('Inspector')} className="absolute inset-x-3 bottom-3 z-20 flex justify-between gap-1 rounded-full p-1.5">
            {(
              [
                ['objects', t('Objects')],
                ['material', t('Material')],
                ['light', t('Light')],
                ['render', t('Render')],
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setSheet(sheet === k ? null : k)} aria-expanded={sheet === k} className={`min-h-[44px] flex-1 rounded-full text-[13px] font-bold ${sheet === k ? 'bg-white text-[#11151a]' : 'text-white/85'}`}>
                {l}
              </button>
            ))}
          </Pane>
          <AnimatePresence>
            {sheet && (
              <Pane strong key="sheet" className="fixed inset-x-2 bottom-[74px] z-30 max-h-[56%] overflow-y-auto rounded-[24px] p-4 lg-scroll" aria-label={t('Inspector')}>
                <div className="mb-2 flex justify-end">
                  <button type="button" onClick={() => setSheet(null)} className="lg-btn lg-btn-plain lg-icon -my-2 -me-2" aria-label={t('Close')}>
                    <X size={18} />
                  </button>
                </div>
                {sheet === 'objects' ? <ObjectsList p={p} active={o.id} onPick={onPick} onImport={onImport} onAddVessel={onAddVessel} /> : <Inspector {...(inspector.props as InspectorProps)} only={sheet} />}
              </Pane>
            )}
          </AnimatePresence>
        </>
      )}

      {!narrow && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center">
          <span className="lg-glass rounded-full px-4 py-2 text-[12.5px] text-white/85">{t('Drag to orbit · scroll to zoom · changes save automatically')}</span>
        </div>
      )}
    </>
  );
}

/** the A/B line over the viewport: drag, or use the arrow keys */
function SplitHandle({ split, onSplit, a, b }: { split: number; onSplit: (v: number) => void; a: string; b: string }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const move = (clientX: number) => {
    const r = ref.current!.parentElement!.getBoundingClientRect();
    onSplit(Math.max(0.05, Math.min(0.95, (clientX - r.left) / r.width)));
  };
  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 z-10" dir="ltr">
      <div className="absolute inset-y-0 w-px bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,.15)]" style={{ left: `${split * 100}%` }} />
      <span className="lg-glass absolute top-[84px] rounded-full px-3 py-1 text-[12px] font-bold" style={{ right: `calc(${(1 - split) * 100}% + 12px)` }}>
        A · {a}
      </span>
      <span className="lg-glass absolute top-[84px] rounded-full px-3 py-1 text-[12px] font-bold" style={{ left: `calc(${split * 100}% + 12px)` }}>
        B · {b}
      </span>
      <button
        type="button"
        role="slider"
        aria-label={t('Compare A/B')}
        aria-valuemin={5}
        aria-valuemax={95}
        aria-valuenow={Math.round(split * 100)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') onSplit(Math.max(0.05, split - 0.03));
          if (e.key === 'ArrowRight') onSplit(Math.min(0.95, split + 0.03));
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => e.buttons && move(e.clientX)}
        className="pointer-events-auto absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full bg-white text-[#11151a] shadow-lg"
        style={{ left: `${split * 100}%` }}
      >
        <Columns2 size={16} />
      </button>
    </div>
  );
}

function ObjectsList({ p, active, onPick, onImport, onAddVessel }: { p: Project; active: string; onPick: (id: string) => void; onImport: (f: FileList) => void; onAddVessel: () => void }) {
  const { t } = useI18n();
  return (
    <>
      <p className="lg-label px-1">{t('Objects')}</p>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto lg-scroll">
        {(p.objects ?? []).map((x) => (
          <div key={x.id} className={`group flex items-center gap-2 rounded-[16px] p-1.5 ${x.id === active ? 'bg-white/20 ring-1 ring-white/60' : 'hover:bg-white/10'}`}>
            <button type="button" onClick={() => onPick(x.id)} aria-current={x.id === active ? 'true' : undefined} className="flex min-w-0 flex-1 items-center gap-2 text-start">
              <span className="block h-12 w-12 shrink-0 overflow-hidden rounded-[12px] bg-white/10">{x.thumb ? <img src={x.thumb} alt="" className="h-full w-full object-cover" /> : <Box size={18} className="m-auto mt-3.5" />}</span>
              <span className="min-w-0">
                <span dir="auto" className="line-clamp-2 break-words text-[13px] font-bold leading-[1.25]">
                  {t(x.title)}
                </span>
                <span className="block truncate text-[11.5px] text-white/65">{x.source.kind === 'vessel' ? t('Vessel') : t('GLB model')}</span>
              </span>
            </button>
            {(p.objects ?? []).length > 1 && (
              <button
                type="button"
                onClick={() => {
                  ws.removeObject(p.id, x.id);
                  toast(t('Object removed'), { undo: true });
                }}
                className="lg-btn lg-btn-plain h-9 min-h-0 w-9 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label={t('Remove {name}', { name: t(x.title) })}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onAddVessel} className="lg-btn lg-btn-ghost min-h-[40px] px-2 text-[12.5px]">
          <Plus size={14} /> {t('Vessel')}
        </button>
        <FilePick onFiles={onImport} multiple={false} accept=".glb,model/gltf-binary" label={t('Import GLB')} className="lg-btn lg-btn-ghost min-h-[40px] px-2 text-[12.5px]">
          <Upload size={14} /> GLB
        </FilePick>
      </div>
    </>
  );
}

/* ───────── inspector ───────── */

interface InspectorProps {
  p: Project;
  draft: StudioObject;
  variant: MaterialVariant;
  edit: (patch: Partial<StudioObject>, label?: string) => void;
  editVariant: (vp: Partial<MaterialVariant>) => void;
  size: (typeof SIZES)[number];
  setSize: (s: (typeof SIZES)[number]) => void;
  busy: boolean;
  onRender: (target: 'project' | 'download') => void;
  onAddVariant: () => void;
  onRemoveVariant: () => void;
  only?: 'material' | 'light' | 'shape' | 'render';
  x: {
    palette: string[];
    ideas: MaterialVariant[] | null;
    onIdeas: () => void;
    onAddIdea: (v: MaterialVariant) => void;
    compareId: string | null;
    onCompare: (id: string | null) => void;
    rec: number | null;
    onRecord: (target: 'project' | 'download') => void;
    onGif: () => void;
    onStopRecord: () => void;
    hdri?: Asset;
    envs: Asset[];
    onImportHDRI: (f: FileList) => void;
    project: Project;
    placing: boolean;
    onPlace: (on: boolean) => void;
  };
}

function Inspector(props: InspectorProps) {
  const { draft, variant, edit, editVariant, size, setSize, busy, onRender, onAddVariant, onRemoveVariant, only, x } = props;
  const { t } = useI18n();
  const show = (k: 'material' | 'light' | 'shape' | 'render') => !only || only === k || (only === 'material' && k === 'shape');
  const vessel = draft.source.kind === 'vessel' ? draft.source : null;
  const isModel = draft.source.kind === 'model';
  return (
    <div className="space-y-5">
      {!only && (
        <div>
          <label htmlFor="obj-title" className="lg-label">
            {t('Object')}
          </label>
          <input id="obj-title" dir="auto" className="lg-input mt-1 text-[15px] font-bold" value={t(draft.title)} onChange={(e) => edit({ title: e.target.value }, 'Renamed')} />
        </div>
      )}

      {show('material') && (
        <Section title={t('Material')} icon={<Sparkles size={16} />}>
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={t('Variants')}>
            {draft.variants.map((v) => (
              <button key={v.id} type="button" role="radio" aria-checked={v.id === variant.id} title={t(v.name)} aria-label={t(v.name)} onClick={() => edit({ variantId: v.id }, 'Variant changed')} className={`h-12 overflow-hidden rounded-[14px] ${v.id === variant.id ? 'ring-2 ring-white ring-offset-2 ring-offset-[#2a2420]' : 'ring-1 ring-white/25'}`}>
                <Swatch v={v} thumb={isModel ? draft.thumb : undefined} />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="var-name" className="sr-only">
              {t('Variant name')}
            </label>
            <input id="var-name" dir="auto" className="lg-input min-h-[38px] py-1.5 text-[13.5px]" value={t(variant.name)} onChange={(e) => editVariant({ name: e.target.value })} />
            <button type="button" onClick={onAddVariant} className="lg-btn lg-btn-ghost lg-icon h-[38px] min-h-0 w-[38px] shrink-0" aria-label={t('Duplicate variant')} title={t('Duplicate variant')}>
              <Plus size={15} />
            </button>
            {draft.variants.length > 1 && (
              <button type="button" onClick={onRemoveVariant} className="lg-btn lg-btn-ghost lg-icon h-[38px] min-h-0 w-[38px] shrink-0" aria-label={t('Remove variant')} title={t('Remove variant')}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <PhotoMaterialButton p={x.project} onPick={() => undefined} variant={variant} editVariant={editVariant} />
          {isModel ? (
            <>
          <Seg
            label={t('Finish')}
            value={variant.finish ?? 'original'}
            options={[
              { id: 'original', label: t('Original') },
              { id: 'tint', label: t('Recolour') },
              { id: 'solid', label: t('Solid') },
            ]}
            onChange={(f) => editVariant(f === 'original' ? { finish: f } : { finish: f, tint: variant.tint ?? 1, ...(variant.name === 'As modelled' ? { name: f === 'solid' ? 'Solid colour' : 'Recolour' } : {}) })}
          />
          {(variant.finish ?? 'original') === 'original' ? (
            <p className="text-[12.5px] leading-[1.45] text-white/70">{t('The model’s own texture. Choose Recolour or Solid to change its colour.')}</p>
          ) : (
            <>
              <ColorField label={t('Colour')} value={variant.topColor} onChange={(c) => editVariant({ topColor: c })} />
              {x.palette.length > 0 && <PaletteRow colors={x.palette} label={t('Project palette')} active={variant.topColor} onPick={(c) => editVariant({ topColor: c })} />}
              {variant.finish === 'tint' && <Slider label={t('Strength')} value={variant.tint ?? 1} min={0} max={1} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => editVariant({ tint: v })} />}
              <Slider label={t('Roughness')} value={variant.roughness} min={0.02} max={1} onChange={(v) => editVariant({ roughness: v })} />
              <Slider label={t('Gloss')} value={variant.gloss} min={0} max={1} onChange={(v) => editVariant({ gloss: v })} />
              <Slider label={t('Metal')} value={variant.metal ?? 0} min={0} max={1} onChange={(v) => editVariant({ metal: v })} />
            </>
          )}
            </>
          ) : (
            <>
          <Seg
            label={t('Base')}
            value={variant.base}
            options={[
              { id: 'travertine', label: t('Stone') },
              { id: 'clay', label: t('Clay') },
              { id: 'glaze', label: t('Glaze') },
            ]}
            onChange={(b) => editVariant({ base: b })}
          />
          <div className="grid grid-cols-2 gap-2">
            <ColorField label={t('Base colour')} value={variant.baseColor} onChange={(c) => editVariant({ baseColor: c })} />
            <ColorField label={t('Glaze colour')} value={variant.topColor} onChange={(c) => editVariant({ topColor: c })} />
          </div>
          {x.palette.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[12px] text-white/70">{t('Project palette · click for glaze, Shift+click for base')}</p>
              <PaletteRow colors={x.palette} label={t('Project palette')} active={variant.topColor} onPick={(c, shift) => editVariant(shift ? { baseColor: c } : { topColor: c })} />
            </div>
          )}
          <Slider label={t('Glaze starts at')} value={variant.blend} min={0} max={1} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => editVariant({ blend: v })} />
          <Slider label={t('Transition')} value={variant.softness} min={0.01} max={0.8} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => editVariant({ softness: v })} />
          <Slider label={t('Roughness')} value={variant.roughness} min={0.02} max={1} onChange={(v) => editVariant({ roughness: v })} />
          <Slider label={t('Gloss coat')} value={variant.gloss} min={0} max={1} onChange={(v) => editVariant({ gloss: v })} />
            </>
          )}
          {(
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={x.onIdeas} aria-expanded={!!x.ideas} className={`lg-btn min-h-[38px] px-2 text-[12.5px] ${x.ideas ? 'lg-btn-primary' : 'lg-btn-ghost'}`}>
                <Wand2 size={14} /> {t('Variations')}
              </button>
              <button
                type="button"
                disabled={draft.variants.length < 2}
                onClick={() => x.onCompare(x.compareId ? null : (draft.variants.find((v) => v.id !== variant.id)?.id ?? null))}
                aria-pressed={!!x.compareId}
                className={`lg-btn min-h-[38px] px-2 text-[12.5px] disabled:opacity-40 ${x.compareId ? 'lg-btn-primary' : 'lg-btn-ghost'}`}
              >
                <Columns2 size={14} /> {t('Compare A/B')}
              </button>
            </div>
          )}
          {x.compareId && (
            <div>
              <p className="mb-1.5 text-[12px] text-white/70">{t('Left side (A) · drag the line in the view')}</p>
              <div className="flex flex-wrap gap-1.5">
                {draft.variants
                  .filter((v) => v.id !== variant.id)
                  .map((v) => (
                    <button key={v.id} type="button" onClick={() => x.onCompare(v.id)} aria-pressed={v.id === x.compareId} title={t(v.name)} aria-label={t(v.name)} className={`h-9 w-9 overflow-hidden rounded-[10px] ${v.id === x.compareId ? 'ring-2 ring-white' : 'ring-1 ring-white/25'}`}>
                      <Swatch v={v} thumb={isModel ? draft.thumb : undefined} />
                    </button>
                  ))}
              </div>
            </div>
          )}
          {x.ideas && (
            <div className="space-y-2">
              <p className="text-[12px] leading-[1.45] text-white/70">{x.palette.length >= 2 ? t('Built from the project palette and colour harmonies. Click to add as a variant.') : t('Built from colour harmonies of the current glaze. Click to add as a variant.')}</p>
              <div className="grid grid-cols-3 gap-2">
                {x.ideas.map((v) => (
                  <button key={v.id} type="button" onClick={() => x.onAddIdea(v)} className="group text-start" aria-label={t('Add {name}', { name: t(v.name) })}>
                    <span className="block h-14 overflow-hidden rounded-[12px] ring-1 ring-white/25 transition group-hover:ring-white">
                      <Swatch v={v} />
                    </span>
                    <span className="mt-1 block truncate text-[11px] text-white/80">{t(v.name)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {show('shape') && vessel && (
        <Section title={t('Form')} icon={<Box size={16} />}>
          <Slider label={t('Twist')} value={vessel.twist} min={0} max={1.4} fmt={(v) => `${Math.round(v * 180)}°`} onChange={(v) => edit({ source: { ...vessel, twist: v } }, 'Form edited')} />
          <Slider label={t('Height')} value={vessel.height} min={0.7} max={2.2} fmt={(v) => `×${v.toFixed(2)}`} onChange={(v) => edit({ source: { ...vessel, height: v } }, 'Form edited')} />
          <Slider label={t('Waist')} value={vessel.waist} min={0} max={0.35} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => edit({ source: { ...vessel, waist: v } }, 'Form edited')} />
        </Section>
      )}

      {show('light') && (
        <Section title={t('Light & camera')} icon={<SunMedium size={16} />}>
          <Seg wrap label={t('Light')} value={draft.light.preset} options={LIGHTS.map((l) => ({ id: l.id, label: t(l.label) }))} onChange={(v) => edit({ light: { ...draft.light, preset: v } }, 'Light changed')} />
          {draft.light.preset === 'hdri' && (
            <div className="space-y-2 rounded-[14px] bg-white/10 p-2.5">
              {x.envs.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {x.envs.map((a) => (
                    <button key={a.id} type="button" onClick={() => edit({ light: { ...draft.light, hdriAssetId: a.id } }, 'Light changed')} aria-pressed={a.id === x.hdri?.id} className={`max-w-full truncate rounded-full px-3 py-1.5 text-[12px] font-bold ${a.id === x.hdri?.id ? 'bg-white text-[#11151a]' : 'bg-white/10'}`}>
                      {a.title}
                    </button>
                  ))}
                </div>
              )}
              <FilePick onFiles={x.onImportHDRI} multiple={false} accept=".hdr" className="lg-btn lg-btn-ghost min-h-[36px] w-full text-[12.5px]">
                <Upload size={14} /> {t('Import .hdr')}
              </FilePick>
              {!x.hdri && <p className="text-[11.5px] leading-[1.45] text-white/65">{t('Without a file the studio room lights the object. Free .hdr environments: polyhaven.com')}</p>}
            </div>
          )}
          <div>
            <p className="lg-label mb-1.5">{t('Stand')}</p>
            <Seg
              wrap
              label={t('Stand')}
              value={draft.stage ?? 'none'}
              options={[
                { id: 'none', label: t('Floor') },
                { id: 'plinth', label: t('Plinth') },
                { id: 'block', label: t('Block') },
                { id: 'arch', label: t('Arch') },
              ]}
              onChange={(v) => edit({ stage: v }, 'Stand changed')}
            />
          </div>
          <Slider label={t('Light direction')} value={draft.light.angle} min={-180} max={180} step={1} fmt={(v) => `${Math.round(v)}°`} onChange={(v) => edit({ light: { ...draft.light, angle: v } }, 'Light changed')} />
          <Slider label={t('Intensity')} value={draft.light.intensity} min={0.2} max={2} onChange={(v) => edit({ light: { ...draft.light, intensity: v } }, 'Light changed')} />
          <div>
            <p className="lg-label mb-1.5 flex items-center gap-1.5">
              <Camera size={13} /> {t('Lens')}
            </p>
            <Seg label={t('Lens')} value={draft.camera.lens} options={LENSES.map((l) => ({ id: l, label: `${l} mm` }))} onChange={(v) => edit({ camera: { lens: v } }, 'Lens changed')} />
          </div>
          <div>
            <p className="lg-label mb-1.5">{t('Background')}</p>
            <Seg
              label={t('Background')}
              value={draft.background.kind}
              options={[
                { id: 'studio', label: t('Studio') },
                { id: 'color', label: t('Colour') },
                { id: 'transparent', label: t('None') },
              ]}
              onChange={(v) => edit({ background: { ...draft.background, kind: v } }, 'Background changed')}
            />
            {draft.background.kind !== 'transparent' && (
              <div className="mt-2">
                <ColorField label={t('Background colour')} value={draft.background.color} onChange={(c) => edit({ background: { ...draft.background, color: c } }, 'Background changed')} />
              </div>
            )}
          </div>
          <Slider label={t('Turntable, one turn')} value={draft.turntable.seconds} min={4} max={30} step={1} fmt={(v) => `${v} s`} onChange={(v) => edit({ turntable: { seconds: v } })} />
        </Section>
      )}

      {show('light') && (
        <Section title={t('Scene')} icon={<Globe2 size={16} />}>
          <SceneSection p={x.project} draft={draft} edit={edit} placing={x.placing} onPlace={x.onPlace} />
        </Section>
      )}

      {show('render') && (
        <Section title={t('Render')} icon={<Camera size={16} />}>
          <Seg label={t('Format')} value={size.id} options={SIZES.map((s) => ({ id: s.id, label: s.id }))} onChange={(id) => setSize(SIZES.find((s) => s.id === id)!)} />
          <p className="text-[12px] text-white/65">
            {size.w} × {size.h} px · {draft.background.kind === 'transparent' ? t('transparent PNG') : 'PNG'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={busy} onClick={() => onRender('download')} className="lg-btn lg-btn-ghost disabled:opacity-50">
              <Download size={15} /> PNG
            </button>
            <button type="button" disabled={busy} onClick={() => onRender('project')} className="lg-btn lg-btn-primary disabled:opacity-50">
              {busy ? t('Rendering…') : t('To project')}
            </button>
          </div>
          <p className="text-[12px] leading-[1.45] text-white/65">{t('“To project” adds the still as a new work, ready for notes and review.')}</p>
          <div className="space-y-2 border-t border-white/15 pt-3">
            <p className="flex items-center gap-1.5 text-[13px] font-bold">
              <Video size={14} /> {t('Turntable video')} <span className="font-normal text-white/65">· {draft.turntable.seconds} s · {videoFormat()?.ext.toUpperCase() ?? '—'}</span>
            </p>
            {x.rec != null ? (
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={Math.round(x.rec * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={t('Recording')}>
                  <div className="h-full bg-white" style={{ width: `${x.rec * 100}%` }} />
                </div>
                <button type="button" onClick={x.onStopRecord} className="lg-btn lg-btn-ghost min-h-[34px] px-3 text-[12.5px]">
                  {t('Stop')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => x.onRecord('download')} className="lg-btn lg-btn-ghost min-h-[38px] px-1 text-[12.5px]">
                  <Download size={14} /> {t('Video')}
                </button>
                <button type="button" onClick={x.onGif} className="lg-btn lg-btn-ghost min-h-[38px] px-1 text-[12.5px]">
                  GIF
                </button>
                <button type="button" onClick={() => x.onRecord('project')} className="lg-btn lg-btn-ghost min-h-[38px] px-1 text-[12.5px]" aria-label={t('Video to project')}>
                  {t('To project')}
                </button>
              </div>
            )}
            <p className="text-[11.5px] leading-[1.45] text-white/60">{t('One full turn at the size of the view. Keep this tab in front while it records.')}</p>
          </div>
        </Section>
      )}
    </div>
  );
}

