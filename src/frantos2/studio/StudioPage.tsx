import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Box, Camera, Download, Eye, Film, Grid3x3, Image as ImageIcon, Layers, Lock, Plus, RefreshCcw, RotateCw, Search, Sparkles, SunMedium, Trash2, Undo2, Upload, X } from 'lucide-react';
import '../glass/glass.css';
import { useI18n } from '../i18n';
import { go } from '../route';
import { ws, useProject, ensureLoaded, undo } from '../ws/store';
import type { LightPreset, MaterialVariant, Project, StudioObject } from '../ws/types';
import { useAssetUrl } from '../ws/media';
import { UploadError } from '../ws/media';
import { FilePick } from '../ws/uploads';
import { toast, useMedia } from '../ws/kit';
import { openPalette } from '../daily/Palette';
import { Pane, ThemeSwitch } from '../glass/kit';
import { GlassAccount } from '../glass/account';
import { createObjectScene, ObjectScene, ViewMode } from './scene';
import { blobToDataUrl, downscale, ingestModel, stillToAsset } from './models';
import { VESSEL_VARIANTS } from '../ws/seed';

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
  { id: 'object', label: '3D · Object', icon: Box, ready: true },
  { id: 'image', label: 'Image', icon: ImageIcon, ready: false },
  { id: 'canvas', label: 'Canvas', icon: Layers, ready: false },
  { id: 'motion', label: 'Motion', icon: Film, ready: false },
] as const;

const LIGHTS: { id: LightPreset; label: string }[] = [
  { id: 'softbox', label: 'Softbox' },
  { id: 'window', label: 'Window' },
  { id: 'spot', label: 'Hard spot' },
  { id: 'rim', label: 'Rim' },
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

  return (
    <div className="lg lg-studio fixed inset-0 overflow-hidden" dir={dir}>
      {stored ? (
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
      <TopBar p={p} o={stored} />
    </div>
  );
}

/* ───────── top bar ───────── */

function TopBar({ p, o }: { p: Project; o?: StudioObject }) {
  const { t } = useI18n();
  return (
    <header className="absolute inset-x-3 top-3 z-30 flex items-center gap-2 sm:inset-x-4 sm:top-4">
      <Pane className="flex min-w-0 items-center gap-1 rounded-full py-1 pe-4 ps-1">
        <button type="button" onClick={() => go(`/p/${p.id}`)} className="lg-btn lg-btn-plain lg-icon" aria-label={t('Back to the project')}>
          <ArrowLeft size={18} className="rtl:-scale-x-100" />
        </button>
        <span dir="auto" className="truncate text-[15px] font-bold">
          {p.title}
        </span>
        <span className="ms-2 hidden text-[12.5px] text-white/65 lg:inline">{t('Studio')}</span>
      </Pane>
      <Pane as="nav" aria-label={t('Editor mode')} className="mx-auto hidden items-center gap-1 rounded-full p-1 md:flex">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={!m.ready}
            aria-pressed={m.id === 'object'}
            title={m.ready ? undefined : t('Coming next')}
            className={`relative flex min-h-[40px] items-center gap-1.5 rounded-full px-4 text-[13.5px] font-bold ${m.id === 'object' ? 'bg-white text-[#11151a]' : 'text-white/55'}`}
          >
            <m.icon size={15} /> {t(m.label)}
            {!m.ready && <Lock size={11} className="opacity-70" />}
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
            className="lg-btn lg-btn-plain lg-icon"
            aria-label={t('Undo')}
          >
            <Undo2 size={17} />
          </button>
          <button type="button" onClick={openPalette} className="lg-btn lg-btn-plain hidden min-h-[40px] text-[13px] sm:inline-flex" aria-label={t('Search or run a command')}>
            <Search size={15} /> <span className="text-white/60">⌘K</span>
          </button>
          <ThemeSwitch />
        </Pane>
        {o && (
          <button type="button" onClick={() => go(`/o/${p.id}/${o.id}`)} className="lg-btn lg-btn-primary">
            <Eye size={16} /> <span className="hidden sm:inline">{t('Showroom')}</span>
          </button>
        )}
        <GlassAccount />
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
    } catch {
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
  useEffect(() => sceneRef.current?.setLens(draft.camera.lens), [draft.camera.lens, ready]);
  useEffect(() => sceneRef.current?.setView(view), [view, ready]);
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
      onAddVariant={() => {
        flush();
        const vid = ws.addVariant(p.id, o.id, variant);
        setDraft((d) => ({ ...d, variants: [...d.variants, { ...variant, id: vid, name: variant.name + ' 2' }], variantId: vid }));
      }}
      onRemoveVariant={() => {
        flush();
        ws.removeVariant(p.id, o.id, variant.id);
      }}
    />
  );

  return (
    <>
      {/* the work: viewport fills the window */}
      <div className="absolute inset-0" style={bgStyle}>
        <canvas ref={canvasRef} style={{ opacity: ready ? 1 : 0, transition: 'opacity .35s ease' }} className="absolute inset-0 h-full w-full touch-none outline-none" aria-label={t('3D viewport: drag to orbit, pinch or scroll to zoom')} />
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
                <span dir="auto" className="block truncate text-[13.5px] font-bold">
                  {t(x.title)}
                </span>
                <span className="block text-[11.5px] text-white/65">{x.source.kind === 'vessel' ? t('Parametric vessel') : t('Imported GLB')}</span>
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
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-white/15 pt-4 first:border-0 first:pt-0">
      <h3 className="flex items-center gap-2 text-[15px] font-extrabold tracking-[-0.01em]">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function Slider({ label, value, min, max, step = 0.01, fmt, onChange }: { label: string; value: number; min: number; max: number; step?: number; fmt?: (v: number) => string; onChange: (v: number) => void }) {
  const id = useMemo(() => `s-${Math.random().toString(36).slice(2, 8)}`, []);
  return (
    <div>
      <div className="flex justify-between text-[12.5px]">
        <label htmlFor={id} className="text-white/75">
          {label}
        </label>
        <span className="font-semibold tabular-nums">{fmt ? fmt(value) : value.toFixed(2)}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="mt-1.5 w-full accent-white" />
    </div>
  );
}

function Seg<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-1 rounded-[14px] bg-white/10 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={String(o.id)} type="button" role="radio" aria-checked={o.id === value} onClick={() => onChange(o.id)} className={`min-h-[36px] rounded-[10px] px-1 text-[12.5px] font-bold ${o.id === value ? 'bg-white text-[#11151a]' : 'text-white/85 hover:bg-white/10'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Swatch({ v }: { v: MaterialVariant }) {
  const bg = v.blend >= 1 ? v.baseColor : `linear-gradient(0deg, ${v.baseColor} 0 ${Math.round((v.blend - v.softness / 2) * 100)}%, ${v.topColor} ${Math.round((v.blend + v.softness / 2) * 100)}% 100%)`;
  return <span className="block h-full w-full rounded-[inherit]" style={{ background: bg }} />;
}

function Inspector(props: InspectorProps) {
  const { draft, variant, edit, editVariant, size, setSize, busy, onRender, onAddVariant, onRemoveVariant, only } = props;
  const { t } = useI18n();
  const show = (k: 'material' | 'light' | 'shape' | 'render') => !only || only === k || (only === 'material' && k === 'shape');
  const vessel = draft.source.kind === 'vessel' ? draft.source : null;
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
          {draft.source.kind === 'model' && <p className="text-[12.5px] leading-[1.45] text-white/70">{t('Imported models keep their own materials. Variants apply to the parametric vessel.')}</p>}
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={t('Variants')}>
            {draft.variants.map((v) => (
              <button key={v.id} type="button" role="radio" aria-checked={v.id === variant.id} title={t(v.name)} aria-label={t(v.name)} onClick={() => edit({ variantId: v.id }, 'Variant changed')} className={`h-12 overflow-hidden rounded-[14px] ${v.id === variant.id ? 'ring-2 ring-white ring-offset-2 ring-offset-[#2a2420]' : 'ring-1 ring-white/25'}`}>
                <Swatch v={v} />
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
          <Slider label={t('Glaze starts at')} value={variant.blend} min={0} max={1} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => editVariant({ blend: v })} />
          <Slider label={t('Transition')} value={variant.softness} min={0.01} max={0.8} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => editVariant({ softness: v })} />
          <Slider label={t('Roughness')} value={variant.roughness} min={0.02} max={1} onChange={(v) => editVariant({ roughness: v })} />
          <Slider label={t('Gloss coat')} value={variant.gloss} min={0} max={1} onChange={(v) => editVariant({ gloss: v })} />
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
          <Seg label={t('Light')} value={draft.light.preset} options={LIGHTS.map((l) => ({ id: l.id, label: t(l.label) }))} onChange={(v) => edit({ light: { ...draft.light, preset: v } }, 'Light changed')} />
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
        </Section>
      )}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) {
  const id = useMemo(() => `c-${Math.random().toString(36).slice(2, 8)}`, []);
  return (
    <label htmlFor={id} className="flex min-h-[40px] cursor-pointer items-center gap-2 rounded-[12px] bg-white/10 px-2 text-[12px] font-semibold">
      <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0" />
      <span className="truncate">{label}</span>
    </label>
  );
}
