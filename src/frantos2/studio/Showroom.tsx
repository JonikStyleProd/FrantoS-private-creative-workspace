import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Box, Copy, Pause, Play, Smartphone, Wand2 } from 'lucide-react';
import '../glass/glass.css';
import { useI18n } from '../i18n';
import { go } from '../route';
import { useProject, ensureLoaded } from '../ws/store';
import type { MaterialVariant, StudioObject } from '../ws/types';
import { useAssetUrl } from '../ws/media';
import { toast } from '../ws/kit';
import { Pane, ThemeSwitch } from '../glass/kit';
import { createObjectScene, ObjectScene } from './scene';

/**
 * 3D showroom: one object, full screen. Visitors orbit it, try the material variants
 * and place it in their room with AR. Nothing they do here changes the project.
 *   #/o/:projectId/:objectId
 */
export function Showroom({ pid, oid }: { pid: string; oid: string }) {
  const { t, dir } = useI18n();
  const { project: p, loading } = useProject(pid);
  useEffect(() => void ensureLoaded(), []);
  const o = p?.objects?.find((x) => x.id === oid);
  if (!p && loading) return <div className="lg lg-studio lg-studio-blank fixed inset-0" />;
  if (!p || !o)
    return (
      <div className="lg fixed inset-0 flex items-center justify-center p-6" dir={dir}>
        <Pane className="max-w-[420px] rounded-[26px] p-8 text-center">
          <p className="text-[18px] font-bold">{t('This object is not here')}</p>
          <p className="mt-2 text-[14px] text-white/75">{t('Showroom links open objects saved in this browser or in your studio.')}</p>
          <button type="button" onClick={() => go('/o/form-01/o-vessel')} className="lg-btn lg-btn-primary mt-5">
            {t('Open the demo object')}
          </button>
        </Pane>
      </div>
    );
  return <Room pid={pid} title={p.title} o={o} />;
}

function Room({ pid, title, o }: { pid: string; title: string; o: StudioObject }) {
  const { t, dir } = useI18n();
  const ref = useRef<HTMLCanvasElement>(null);
  const scene = useRef<ObjectScene | null>(null);
  const [vid, setVid] = useState(o.variantId);
  const [spin, setSpin] = useState(true);
  const [ready, setReady] = useState(false);
  const [arBusy, setArBusy] = useState(false);
  const model = o.source.kind === 'model' ? o.source.assetId : undefined;
  const { project } = useProject(pid);
  const modelUrl = useAssetUrl(model ? project?.assets.find((a) => a.id === model) : undefined, 'full').url;
  const variant = o.variants.find((v) => v.id === vid) ?? o.variants[0];

  useEffect(() => {
    let s: ObjectScene;
    try {
      s = createObjectScene(ref.current!);
    } catch {
      return;
    }
    scene.current = s;
    s.onInteract(() => setSpin(false));
    return () => s.dispose();
  }, []);
  useEffect(() => {
    const s = scene.current;
    if (!s || (model && !modelUrl)) return;
    s.setObject({ ...o, variantId: vid }, modelUrl).then(() => setReady(true));
  }, [modelUrl]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (ready) scene.current?.setVariant(variant);
  }, [vid, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scene.current?.setTurntable(spin && !reduce, o.turntable.seconds);
  }, [spin, ready, o.turntable.seconds]);

  async function openAR() {
    const s = scene.current;
    if (!s) return;
    setArBusy(true);
    try {
      const glb = await s.exportGLB();
      await import('@google/model-viewer');
      const mv = document.createElement('model-viewer') as HTMLElement & { activateAR: () => Promise<void>; canActivateAR: boolean };
      mv.setAttribute('src', URL.createObjectURL(glb));
      mv.setAttribute('ar', '');
      mv.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
      mv.setAttribute('ar-scale', 'auto');
      mv.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;';
      document.body.appendChild(mv);
      await new Promise((r) => setTimeout(r, 600));
      if (mv.canActivateAR) await mv.activateAR();
      else toast(t('AR opens on a phone or tablet with ARCore (Android) or ARKit (iPhone, iPad).'));
      setTimeout(() => mv.remove(), 60000);
    } catch {
      toast(t('AR could not start in this browser.'), { tone: 'error' });
    } finally {
      setArBusy(false);
    }
  }

  const bg = o.background.kind === 'transparent' ? '#1a1d22' : o.background.color;
  return (
    <div className="lg lg-studio fixed inset-0 overflow-hidden" dir={dir} style={{ background: `radial-gradient(ellipse at 50% 40%, ${bg} 0%, color-mix(in srgb, ${bg} 50%, #15110e) 60%, #0c0a09 100%)` }}>
      <canvas ref={ref} className="absolute inset-0 h-full w-full touch-none" aria-label={t('{name}, 3D: drag to turn, pinch or scroll to zoom', { name: t(o.title) })} />

      <header className="absolute inset-x-3 top-3 z-20 flex items-center gap-2 sm:inset-x-4 sm:top-4">
        <Pane className="flex min-w-0 items-center gap-1 rounded-full py-1 pe-4 ps-1">
          <button type="button" onClick={() => go(`/p/${pid}`)} className="lg-btn lg-btn-plain lg-icon" aria-label={t('Back to the project')}>
            <ArrowLeft size={18} className="rtl:-scale-x-100" />
          </button>
          <span dir="auto" className="truncate text-[15px] font-bold">
            {title}
          </span>
        </Pane>
        <div className="ms-auto flex items-center gap-2">
          <span className="lg-glass rounded-full p-0.5">
            <ThemeSwitch />
          </span>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(location.href).then(() => toast(t('Link copied')))}
            className="lg-glass lg-btn"
            title={t('Opens for anyone who has this project — the demo, or your studio')}
          >
            <Copy size={15} /> <span className="hidden sm:inline">{t('Copy link')}</span>
          </button>
          <button type="button" onClick={() => go(`/s/${pid}?o=${o.id}`)} className="lg-btn lg-btn-primary">
            <Wand2 size={15} /> <span className="hidden sm:inline">{t('Edit in studio')}</span>
          </button>
        </div>
      </header>

      <Pane className="absolute start-4 top-[84px] z-10 hidden w-[320px] rounded-[26px] p-5 md:block">
        <p className="lg-label">{t('Object')}</p>
        <h1 dir="auto" className="mt-1 text-[26px] font-extrabold leading-[1.05] tracking-[-0.02em]">
          {t(o.title)}
        </h1>
        {o.note && (
          <p dir="auto" className="mt-3 text-[14px] leading-[1.55] text-white/85">
            {t(o.note)}
          </p>
        )}
        <div className="mt-4 flex justify-between border-t border-white/20 pt-3 text-[13px]">
          <span className="text-white/75">{t('Material')}</span>
          <span dir="auto" className="font-semibold">
            {t(variant.name)}
          </span>
        </div>
      </Pane>

      <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center px-3">
        <Pane className="flex max-w-full items-center gap-2 overflow-x-auto rounded-full p-1.5 ps-4 lg-scroll">
          <span className="hidden text-[12.5px] text-white/75 sm:inline">{t('Material')}</span>
          <div role="radiogroup" aria-label={t('Material')} className="flex items-center gap-1.5">
            {o.variants.map((v: MaterialVariant) => (
              <button key={v.id} type="button" role="radio" aria-checked={v.id === vid} aria-label={t(v.name)} title={t(v.name)} onClick={() => setVid(v.id)} className={`h-11 w-11 shrink-0 overflow-hidden rounded-full ${v.id === vid ? 'ring-2 ring-white ring-offset-2 ring-offset-black/40' : 'ring-1 ring-white/30'}`}>
                <span className="block h-full w-full" style={{ background: v.blend >= 1 ? v.baseColor : `linear-gradient(0deg, ${v.baseColor} 0 48%, ${v.topColor} 52% 100%)` }} />
              </button>
            ))}
          </div>
          <span className="mx-1 h-6 w-px bg-white/25" />
          <button type="button" onClick={() => setSpin((v) => !v)} aria-pressed={spin} className="lg-btn lg-btn-ghost lg-icon shrink-0" aria-label={spin ? t('Stop turning') : t('Turn')}>
            {spin ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button type="button" disabled={arBusy || !ready} onClick={openAR} className="lg-btn lg-btn-primary shrink-0 disabled:opacity-60">
            <Smartphone size={16} /> {arBusy ? t('Preparing…') : <><span className="sm:hidden">AR</span><span className="hidden sm:inline">{t('View in your room')}</span></>}
          </button>
        </Pane>
      </div>
      {!ready && (
        <p className="lg-glass absolute start-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full px-4 py-2 text-[13px] rtl:translate-x-1/2">
          <Box size={14} /> {t('Preparing the object…')}
        </p>
      )}
    </div>
  );
}
