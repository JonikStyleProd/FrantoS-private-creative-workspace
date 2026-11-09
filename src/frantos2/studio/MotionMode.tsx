import React, { useEffect, useRef, useState } from 'react';
import { Box, Diamond, Download, Pause, Play, Plus, Trash2, Video } from 'lucide-react';
import { useI18n } from '../i18n';
import { go } from '../route';
import { uid, ws } from '../ws/store';
import type { CameraKey, Project, StudioObject } from '../ws/types';
import { ingest, useAssetUrl } from '../ws/media';
import { toast, useMedia } from '../ws/kit';
import { Pane } from '../glass/kit';
import { createObjectScene, ObjectScene, Pose } from './scene';
import { canRecord, recordCanvas, videoFormat } from './record';
import { Section, Slider, Swatch } from './ui';

/**
 * Studio · Motion: a camera move around the object, built from keyframes on a timeline.
 * Each key holds a camera pose (and optionally a material variant). Play it, then export a video.
 */
const DEFAULT_KEYS = (): CameraKey[] => [
  { id: uid('k-'), t: 0, az: -40, el: 10, zoom: 0.95 },
  { id: uid('k-'), t: 3, az: 50, el: 24, zoom: 1.3 },
  { id: uid('k-'), t: 6, az: 160, el: 8, zoom: 1 },
];

const ease = (x: number) => x * x * (3 - 2 * x);

/** the pose at time `t` (seconds), and the variant in effect */
export function poseAt(keys: CameraKey[], t: number): { pose: Pose; variantId?: string } {
  const ks = [...keys].sort((a, b) => a.t - b.t);
  if (!ks.length) return { pose: { az: 0, el: 15, zoom: 1 } };
  let variantId: string | undefined;
  for (const k of ks) if (k.t <= t && k.variantId) variantId = k.variantId;
  if (t <= ks[0].t) return { pose: ks[0], variantId: ks[0].variantId ?? variantId };
  const last = ks[ks.length - 1];
  if (t >= last.t) return { pose: last, variantId };
  const i = ks.findIndex((k) => k.t > t);
  const a = ks[i - 1];
  const b = ks[i];
  const f = ease((t - a.t) / Math.max(1e-6, b.t - a.t));
  return { pose: { az: a.az + (b.az - a.az) * f, el: a.el + (b.el - a.el) * f, zoom: a.zoom + (b.zoom - a.zoom) * f }, variantId };
}

export function MotionMode({ p, o }: { p: Project; o?: StudioObject }) {
  const { t } = useI18n();
  if (!o)
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Pane className="max-w-[420px] rounded-[28px] p-7 text-center">
          <Box className="mx-auto" />
          <p className="mt-3 text-[19px] font-bold">{t('Motion needs a 3D object')}</p>
          <p className="mt-2 text-[14px] text-white/75">{t('Make one in 3D · Object, then come back to animate the camera.')}</p>
        </Pane>
      </div>
    );
  return <Timeline key={o.id} p={p} o={o} />;
}

function Timeline({ p, o }: { p: Project; o: StudioObject }) {
  const { t } = useI18n();
  const narrow = useMedia('(max-width: 900px)');
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<ObjectScene | null>(null);
  const [ready, setReady] = useState(false);
  const [keys, setKeys] = useState<CameraKey[]>(() => o.motion?.keys ?? DEFAULT_KEYS());
  const [seconds, setSeconds] = useState(o.motion?.seconds ?? 6);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [rec, setRec] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);
  const model = o.source.kind === 'model' ? p.assets.find((a) => a.id === (o.source as { assetId: string }).assetId) : undefined;
  const modelUrl = useAssetUrl(model, 'full').url;
  const lastVariant = useRef<string | undefined>(undefined);

  // save the move (debounced) — it belongs to the object
  const timer = useRef<number | undefined>(undefined);
  const save = (k: CameraKey[], s: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => ws.patchObject(p.id, o.id, { motion: { seconds: s, keys: k } }, 'Motion edited'), 300);
  };
  useEffect(() => {
    if (!o.motion) ws.patchObject(p.id, o.id, { motion: { seconds, keys } });
    return () => window.clearTimeout(timer.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let s: ObjectScene;
    try {
      s = createObjectScene(canvas.current!);
    } catch {
      return;
    }
    scene.current = s;
    return () => s.dispose();
  }, []);
  useEffect(() => {
    const s = scene.current;
    if (!s || (model && !modelUrl)) return;
    s.setObject(o, modelUrl).then(() => {
      s.setLight(o.light);
      s.setLens(o.camera.lens);
      setReady(true);
    });
  }, [modelUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // show the pose at the playhead
  const show = (tm: number) => {
    const s = scene.current;
    if (!s) return;
    const { pose, variantId } = poseAt(keys, tm);
    s.setPose(pose);
    const vid = variantId ?? o.variantId;
    if (vid !== lastVariant.current) {
      const v = o.variants.find((x) => x.id === vid);
      if (v) s.setVariant(v);
      lastVariant.current = vid;
    }
  };
  useEffect(() => {
    if (ready && !playing && rec == null) show(time);
  }, [time, ready, keys]); // eslint-disable-line react-hooks/exhaustive-deps

  // playback
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const t0 = performance.now() - time * 1000;
    const tick = () => {
      const tm = ((performance.now() - t0) / 1000) % seconds;
      setTime(tm);
      show(tm);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps

  // space plays, K adds a key, Delete removes the selected one
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,select,[contenteditable]')) return;
      if (e.key === ' ') {
        e.preventDefault();
        setPlaying((v) => !v);
      } else if (e.key.toLowerCase() === 'k' && !e.metaKey && !e.ctrlKey) addKey();
      else if ((e.key === 'Delete' || e.key === 'Backspace') && sel) removeKey(sel);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const setAll = (k: CameraKey[], s = seconds) => {
    setKeys(k);
    save(k, s);
  };
  const addKey = () => {
    const s = scene.current;
    if (!s) return;
    setPlaying(false);
    const pose = s.getPose();
    const existing = keys.find((k) => Math.abs(k.t - time) < 0.05);
    if (existing) {
      setAll(keys.map((k) => (k.id === existing.id ? { ...k, ...pose } : k)));
      setSel(existing.id);
      toast(t('Key updated to the current view'));
      return;
    }
    const nk = { id: uid('k-'), t: Math.round(time * 10) / 10, ...pose };
    setAll([...keys, nk].sort((a, b) => a.t - b.t));
    setSel(nk.id);
  };
  const removeKey = (id: string) => {
    if (keys.length <= 2) {
      toast(t('A move needs at least two keys.'));
      return;
    }
    setAll(keys.filter((k) => k.id !== id));
    setSel(null);
  };
  const selected = keys.find((k) => k.id === sel);

  // drag keys along the track; click the track to move the playhead
  const track = useRef<HTMLDivElement>(null);
  const toTime = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    return Math.max(0, Math.min(seconds, ((clientX - r.left) / r.width) * seconds));
  };
  const dragKey = useRef<string | null>(null);

  async function exportVideo(target: 'download' | 'project') {
    const s = scene.current;
    if (!s || rec != null) return;
    if (!canRecord()) {
      toast(t('This browser cannot record video from the page. Try Chrome, Edge or Safari.'), { tone: 'error' });
      return;
    }
    setPlaying(false);
    const ac = new AbortController();
    abort.current = ac;
    s.setRecording(true, o.background);
    setRec(0);
    try {
      const { blob, ext } = await recordCanvas(
        s.canvas,
        seconds,
        (f) => {
          show(f * seconds);
          s.draw();
        },
        ac.signal,
        (f) => setRec(f)
      );
      const name = `${o.title.replace(/[^\w\- ]+/g, '').trim() || 'object'}-motion.${ext}`;
      if (target === 'download') {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      } else {
        const asset = await ingest(new File([blob], name, { type: blob.type }), { isReference: false });
        ws.addAsset(p.id, asset);
        const wid = ws.workFromAsset(p.id, asset.id);
        toast(t('Video added to the project as a new work'));
        go(`/p/${p.id}?s=make&i=${wid}`);
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast(t('Recording failed.'), { tone: 'error' });
    } finally {
      s.setRecording(false);
      setRec(null);
      abort.current = null;
      show(time);
    }
  }

  const bg = o.background.kind === 'transparent' ? '#1b1d21' : o.background.color;
  return (
    <>
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 40%, ${bg} 0%, color-mix(in srgb, ${bg} 55%, #1a1612) 62%, #0e0c0b 100%)` }}>
        <canvas ref={canvas} style={{ opacity: ready ? 1 : 0, transition: 'opacity .35s ease' }} className="absolute inset-0 h-full w-full touch-none outline-none" aria-label={t('3D viewport: drag to orbit, then add a key')} />
        {rec != null && (
          <p className="lg-glass absolute start-1/2 top-[84px] z-30 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold rtl:translate-x-1/2" role="status">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#ff5a4f]" /> {t('Recording')} · {Math.round(rec * 100)}%
          </p>
        )}
      </div>

      {/* timeline */}
      <Pane className={`absolute z-20 rounded-[24px] p-3 ${narrow ? 'inset-x-3 bottom-3' : 'bottom-4 end-[340px] start-4'}`} aria-label={t('Timeline')}>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPlaying((v) => !v)} className="lg-btn lg-btn-primary lg-icon" aria-label={playing ? t('Pause') : t('Play')} title={`${playing ? t('Pause') : t('Play')} (Space)`} disabled={rec != null}>
            {playing ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <button type="button" onClick={addKey} className="lg-btn lg-btn-ghost min-h-[40px] text-[13px]" title={`${t('Add a key from the current view')} (K)`} disabled={rec != null}>
            <Plus size={15} /> <span className="hidden sm:inline">{t('Key from view')}</span>
          </button>
          <span className="ms-auto text-[12.5px] tabular-nums text-white/75">
            {time.toFixed(1)} / {seconds.toFixed(1)} s
          </span>
        </div>
        <div
          ref={track}
          className="relative mt-3 h-12 cursor-pointer touch-none rounded-[12px] bg-white/10"
          dir="ltr"
          onPointerDown={(e) => {
            setPlaying(false);
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            if (!dragKey.current) setTime(toTime(e.clientX));
          }}
          onPointerMove={(e) => {
            if (!e.buttons) return;
            const tm = toTime(e.clientX);
            if (dragKey.current) {
              const id = dragKey.current;
              setKeys((ks) => ks.map((k) => (k.id === id ? { ...k, t: Math.round(tm * 10) / 10 } : k)));
            } else setTime(tm);
          }}
          onPointerUp={() => {
            if (dragKey.current) {
              dragKey.current = null;
              setAll([...keys].sort((a, b) => a.t - b.t));
            }
          }}
          role="slider"
          aria-label={t('Playhead')}
          aria-valuemin={0}
          aria-valuemax={seconds}
          aria-valuenow={Math.round(time * 10) / 10}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setTime((v) => Math.max(0, v - 0.1));
            if (e.key === 'ArrowRight') setTime((v) => Math.min(seconds, v + 0.1));
          }}
        >
          {Array.from({ length: Math.floor(seconds) + 1 }, (_, i) => (
            <span key={i} className="pointer-events-none absolute bottom-0 top-7 w-px bg-white/25" style={{ left: `${(i / seconds) * 100}%` }}>
              <span className="absolute start-1 top-0 text-[9.5px] text-white/50">{i}</span>
            </span>
          ))}
          {keys.map((k) => (
            <button
              key={k.id}
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                (e.currentTarget.parentElement as HTMLElement).setPointerCapture(e.pointerId);
                dragKey.current = k.id;
                setSel(k.id);
                setTime(k.t);
              }}
              className={`absolute top-1.5 -translate-x-1/2 ${k.id === sel ? 'text-white' : 'text-white/70'}`}
              style={{ left: `${(k.t / seconds) * 100}%` }}
              aria-label={t('Key at {t} s', { t: k.t.toFixed(1) })}
            >
              <Diamond size={18} fill="currentColor" />
            </button>
          ))}
          <span className="pointer-events-none absolute inset-y-0 w-0.5 bg-[#ff9a6b]" style={{ left: `${(time / seconds) * 100}%` }} />
        </div>
      </Pane>

      {/* inspector */}
      {!narrow && (
        <Pane as="aside" aria-label={t('Inspector')} className="absolute bottom-4 end-4 top-[84px] z-20 w-[312px] space-y-5 overflow-y-auto rounded-[24px] p-4 lg-scroll">
          <Section title={t('Move')} icon={<Video size={16} />}>
            <Slider
              label={t('Length')}
              value={seconds}
              min={2}
              max={20}
              step={0.5}
              fmt={(v) => `${v} s`}
              onChange={(v) => {
                const k = v / seconds;
                const next = keys.map((x) => ({ ...x, t: Math.round(x.t * k * 10) / 10 }));
                setSeconds(v);
                setTime((tm) => Math.min(v, tm * k));
                setAll(next, v);
              }}
            />
            <p className="text-[11.5px] leading-[1.45] text-white/60">{t('Orbit the object, move the playhead, press “Key from view”. Keys ease into each other. Space plays.')}</p>
          </Section>
          {selected ? (
            <Section title={t('Key at {t} s', { t: selected.t.toFixed(1) })} icon={<Diamond size={15} />}>
              <Slider label={t('Around')} value={selected.az} min={-360} max={720} step={1} fmt={(v) => `${Math.round(v)}°`} onChange={(v) => setAll(keys.map((k) => (k.id === selected.id ? { ...k, az: v } : k)))} />
              <Slider label={t('Height')} value={selected.el} min={-5} max={75} step={1} fmt={(v) => `${Math.round(v)}°`} onChange={(v) => setAll(keys.map((k) => (k.id === selected.id ? { ...k, el: v } : k)))} />
              <Slider label={t('Zoom')} value={selected.zoom} min={0.5} max={2.5} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setAll(keys.map((k) => (k.id === selected.id ? { ...k, zoom: v } : k)))} />
              {o.variants.length > 1 && (
                <div>
                  <p className="lg-label mb-1.5">{t('Switch material here')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => setAll(keys.map((k) => (k.id === selected.id ? { ...k, variantId: undefined } : k)))} aria-pressed={!selected.variantId} className={`h-9 rounded-[10px] px-2.5 text-[11.5px] font-bold ${!selected.variantId ? 'bg-white text-[#11151a]' : 'bg-white/10'}`}>
                      {t('Keep')}
                    </button>
                    {o.variants.map((v) => (
                      <button key={v.id} type="button" onClick={() => setAll(keys.map((k) => (k.id === selected.id ? { ...k, variantId: v.id } : k)))} aria-pressed={selected.variantId === v.id} title={t(v.name)} aria-label={t(v.name)} className={`h-9 w-9 overflow-hidden rounded-[10px] ${selected.variantId === v.id ? 'ring-2 ring-white' : 'ring-1 ring-white/25'}`}>
                        <Swatch v={v} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button type="button" onClick={() => removeKey(selected.id)} className="lg-btn lg-btn-ghost min-h-[36px] w-full text-[12.5px]">
                <Trash2 size={14} /> {t('Remove key')}
              </button>
            </Section>
          ) : null}
          <Section title={t('Export')} icon={<Download size={16} />}>
            {rec != null ? (
              <button type="button" onClick={() => abort.current?.abort()} className="lg-btn lg-btn-ghost w-full">
                {t('Stop')} · {Math.round(rec * 100)}%
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => exportVideo('download')} className="lg-btn lg-btn-ghost text-[13px]">
                  <Download size={14} /> {videoFormat()?.ext.toUpperCase() ?? t('Video')}
                </button>
                <button type="button" onClick={() => exportVideo('project')} className="lg-btn lg-btn-primary text-[13px]">
                  {t('To project')}
                </button>
              </div>
            )}
            <p className="text-[11.5px] leading-[1.45] text-white/60">{t('Records at the size of the view. Keep this tab in front while it records.')}</p>
          </Section>
        </Pane>
      )}
      {narrow && (
        <div className="absolute end-3 top-[76px] z-20 flex gap-2">
          <button type="button" onClick={() => exportVideo('download')} disabled={rec != null} className="lg-btn lg-btn-primary">
            <Download size={15} /> {rec != null ? `${Math.round(rec * 100)}%` : t('Video')}
          </button>
        </div>
      )}
    </>
  );
}
