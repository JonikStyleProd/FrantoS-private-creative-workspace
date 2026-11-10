import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Download, Loader2, Music, Pause, Play, Upload, Wand2 } from 'lucide-react';
import { useI18n } from '../i18n';
import { go } from '../route';
import { useProject, useWs, ws } from '../ws/store';
import type { Asset, Project } from '../ws/types';
import { AssetThumb, toast } from '../ws/kit';
import { assetUrl, useAssetUrl } from '../ws/media';
import { FilePick, upload } from '../ws/uploads';
import { Pane } from '../glass/kit';
import { DEFAULT_BRAND, fontCss } from '../studio/brand';
import { canRecord, recordCanvas } from '../studio/record';
import { findBeats, fitToBeats } from './beats';
import '../glass/glass.css';

const SIZES = [
  { id: 'wide', label: '16:9', w: 1280, h: 720 },
  { id: 'tall', label: '9:16', w: 720, h: 1280 },
  { id: 'square', label: '1:1', w: 1080, h: 1080 },
] as const;

const DEFAULT_DUR = 2.5;

export function AnimaticPage({ id }: { id: string }) {
  const { t, dir } = useI18n();
  const { project: p, loading } = useProject(id);
  if (loading) return <div className="lg fixed inset-0" />;
  if (!p)
    return (
      <div className="lg fixed inset-0 flex items-center justify-center" dir={dir}>
        <p>{t('This project is not here.')}</p>
      </div>
    );
  return <Animatic p={p} />;
}

/** The story as a film: frames with timings, a soundtrack, cuts on the beat, one video file out. */
function Animatic({ p }: { p: Project }) {
  const { t, dir } = useI18n();
  const { state } = useWs();
  const brand = { ...DEFAULT_BRAND, ...state.brand };
  const frames = p.story;
  const durs = frames.map((f) => f.duration ?? DEFAULT_DUR);
  const total = durs.reduce((a, b) => a + b, 0);
  const fade = p.animatic?.fade ?? 0.4;
  const sounds = p.assets.filter((a) => a.format === 'audio');
  const sound = sounds.find((a) => a.id === p.animatic?.audioAssetId);
  const soundUrl = useAssetUrl(sound, 'raw').url;
  const [size, setSize] = useState<(typeof SIZES)[number]['id']>('wide');
  const S = SIZES.find((x) => x.id === size)!;
  const canvas = useRef<HTMLCanvasElement>(null);
  const images = useRef(new Map<string, HTMLImageElement>());
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [beatBusy, setBeatBusy] = useState(false);
  const [every, setEvery] = useState(2);
  const [rec, setRec] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  // pictures for every frame, loaded once
  useEffect(() => {
    let live = true;
    setReady(false);
    Promise.all(
      frames.map(async (f) => {
        if (images.current.has(f.assetId)) return;
        const a = p.assets.find((x) => x.id === f.assetId);
        const url = a && (await assetUrl(a, 'full'));
        if (!url) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        await img.decode().catch(() => undefined);
        images.current.set(f.assetId, img);
      })
    ).then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, [frames.map((f) => f.assetId).join()]); // eslint-disable-line react-hooks/exhaustive-deps

  /** one frame of the film at time `tt` (seconds) */
  const draw = (x: CanvasRenderingContext2D, tt: number, W: number, H: number) => {
    x.fillStyle = '#0b0c0f';
    x.fillRect(0, 0, W, H);
    let start = 0;
    frames.forEach((f, i) => {
      const d = durs[i];
      const end = start + d;
      const fadeIn = i === 0 ? 0 : fade;
      if (tt >= start - fadeIn && tt < end) {
        const img = images.current.get(f.assetId);
        const local = (tt - start) / d;
        const alpha = fadeIn > 0 && tt < start ? 1 - (start - tt) / fadeIn : 1;
        if (img && img.naturalWidth) {
          // cover the frame, with a slow push-in
          const zoom = 1 + 0.06 * Math.max(0, local);
          const s = Math.max(W / img.naturalWidth, H / img.naturalHeight) * zoom;
          const w = img.naturalWidth * s;
          const h = img.naturalHeight * s;
          x.globalAlpha = Math.max(0, Math.min(1, alpha));
          x.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
          x.globalAlpha = 1;
        }
        const cap = f.caption ? t(f.caption) : '';
        if (cap && tt >= start) {
          const size = Math.round(Math.min(W, H) * 0.045);
          x.save();
          x.globalAlpha = Math.min(1, (tt - start) / 0.35, (end - tt) / 0.3);
          const g = x.createLinearGradient(0, H * 0.62, 0, H);
          g.addColorStop(0, 'rgba(0,0,0,0)');
          g.addColorStop(1, 'rgba(0,0,0,0.55)');
          x.fillStyle = g;
          x.fillRect(0, H * 0.62, W, H * 0.38);
          x.font = `700 ${size}px ${fontCss(brand.bodyFont ?? brand.font)}`;
          x.fillStyle = '#ffffff';
          x.textAlign = dir === 'rtl' ? 'right' : 'left';
          x.direction = dir;
          const pad = W * 0.06;
          const words = cap.split(/\s+/);
          const lines: string[] = [];
          let line = '';
          words.forEach((w) => {
            const next = line ? `${line} ${w}` : w;
            if (x.measureText(next).width > W - pad * 2 && line) {
              lines.push(line);
              line = w;
            } else line = next;
          });
          if (line) lines.push(line);
          lines.slice(-3).forEach((l, k, arr) => x.fillText(l, dir === 'rtl' ? W - pad : pad, H - pad - (arr.length - 1 - k) * size * 1.25));
          x.restore();
        }
      }
      start = end;
    });
  };

  // preview: the canvas follows the clock while playing, or shows the scrubbed time
  useEffect(() => {
    const c = canvas.current;
    if (!c || !ready) return;
    const x = c.getContext('2d')!;
    if (!playing) return void draw(x, time, c.width, c.height);
    let raf = 0;
    const t0 = performance.now() - time * 1000;
    if (audio.current) {
      audio.current.currentTime = time;
      audio.current.play().catch(() => undefined);
    }
    const tick = () => {
      const tt = (performance.now() - t0) / 1000;
      if (tt >= total) {
        setPlaying(false);
        setTime(0);
        audio.current?.pause();
        return;
      }
      draw(x, tt, c.width, c.height);
      setTime(tt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      audio.current?.pause();
    };
  }, [playing, ready, size, fade, durs.join(), frames.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (playing || !ready || !canvas.current) return;
    draw(canvas.current.getContext('2d')!, time, canvas.current.width, canvas.current.height);
  }, [time]); // eslint-disable-line react-hooks/exhaustive-deps

  const fitBeat = async () => {
    if (!sound) return;
    setBeatBusy(true);
    try {
      const url = await assetUrl(sound, 'raw');
      const blob = await fetch(url!).then((r) => r.blob());
      const { bpm, beats } = await findBeats(blob);
      ws.setAnimatic(p.id, { bpm, beats });
      ws.setFrameDurations(p.id, fitToBeats(frames.length, beats, every));
      toast(t('Cut on the beat · {bpm} BPM', { bpm }), { undo: true });
    } catch {
      toast(t('The beat could not be found in this track.'), { tone: 'error' });
    } finally {
      setBeatBusy(false);
    }
  };

  const exportVideo = async () => {
    const c = document.createElement('canvas');
    c.width = S.w;
    c.height = S.h;
    const x = c.getContext('2d')!;
    abort.current = new AbortController();
    setPlaying(false);
    setRec(0);
    try {
      const { blob, ext } = await recordCanvas(c, total, (f) => draw(x, f * total, S.w, S.h), abort.current.signal, (f) => setRec(f), soundUrl ? { audio: { url: soundUrl } } : {});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${p.title.replace(/[^\p{L}\p{N}]+/gu, '-')}-animatic.${ext}`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast(t('Animatic saved'));
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast(t('This browser cannot record video. Try Chrome or Safari.'), { tone: 'error' });
    } finally {
      setRec(null);
    }
  };

  const at = useMemo(() => {
    let s = 0;
    return durs.map((d) => {
      const r = s;
      s += d;
      return r;
    });
  }, [durs.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const curIndex = at.findIndex((s, i) => time >= s && time < s + durs[i]);

  return (
    <div className="lg fixed inset-0 flex flex-col overflow-hidden" dir={dir}>
      {soundUrl && <audio ref={audio} src={soundUrl} preload="auto" />}
      <header className="flex flex-wrap items-center gap-2 p-3 sm:p-4">
        <Pane className="flex min-w-0 items-center gap-1 rounded-full py-1 pe-4 ps-1">
          <button type="button" onClick={() => go(`/p/${p.id}`)} className="lg-btn lg-btn-plain lg-icon" aria-label={t('Back to the project')}>
            <ArrowLeft size={18} className="rtl:-scale-x-100" />
          </button>
          <span className="min-w-0">
            <span className="block text-[11px] font-bold text-white/60">{t('Animatic')}</span>
            <span dir="auto" className="block truncate text-[15px] font-bold">
              {p.title}
            </span>
          </span>
        </Pane>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <div className="flex rounded-full p-1 lg-glass" role="radiogroup" aria-label={t('Format')}>
            {SIZES.map((s) => (
              <button key={s.id} type="button" role="radio" aria-checked={size === s.id} onClick={() => setSize(s.id)} className={`min-h-[34px] rounded-full px-3 text-[12.5px] font-bold ${size === s.id ? 'bg-white text-[#11151a]' : 'text-white/80'}`}>
                {s.label}
              </button>
            ))}
          </div>
          {rec != null ? (
            <button type="button" onClick={() => abort.current?.abort()} className="lg-btn lg-btn-ghost">
              <Loader2 size={15} className="animate-spin" /> {Math.round(rec * 100)}% · {t('Cancel')}
            </button>
          ) : (
            <button type="button" disabled={!frames.length || !canRecord()} onClick={exportVideo} className="lg-btn lg-btn-primary" title={canRecord() ? undefined : t('This browser cannot record video. Try Chrome or Safari.')}>
              <Download size={15} /> {t('Export video')}
            </button>
          )}
        </div>
      </header>

      {frames.length === 0 ? (
        <div className="m-auto p-6">
          <Pane className="max-w-[440px] rounded-[28px] p-8 text-center">
            <p className="text-[18px] font-extrabold">{t('The story has no frames yet')}</p>
            <p className="mt-1 text-[14px] text-white/70">{t('Add frames to the story first: each one becomes a shot of the animatic.')}</p>
            <button type="button" onClick={() => go(`/p/${p.id}/stories`)} className="lg-btn lg-btn-primary mt-5">
              {t('Edit the story')}
            </button>
          </Pane>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-3 overflow-hidden p-3 pt-0 sm:p-4 sm:pt-0 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-h-0 flex-col gap-3">
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <canvas ref={canvas} width={S.w} height={S.h} className="max-h-full max-w-full rounded-[18px] bg-black shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]" style={{ aspectRatio: `${S.w} / ${S.h}` }} aria-label={t('Preview')} />
            </div>
            <Pane className="rounded-[22px] p-3">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setPlaying(!playing)} disabled={!ready || rec != null} className="lg-btn lg-btn-primary lg-icon" aria-label={playing ? t('Pause') : t('Play')}>
                  {playing ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <input type="range" min={0} max={total} step={0.01} value={time} onChange={(e) => (setPlaying(false), setTime(+e.target.value))} className="min-w-0 flex-1" aria-label={t('Time')} />
                <span className="w-[92px] text-end text-[12.5px] tabular-nums text-white/75">
                  {time.toFixed(1)} / {total.toFixed(1)} s
                </span>
              </div>
              {/* the timeline: one block per frame, as long as it lasts, beats as ticks */}
              <div className="relative mt-3 flex h-12 overflow-hidden rounded-[12px]" dir="ltr">
                {frames.map((f, i) => (
                  <button key={f.id} type="button" onClick={() => (setPlaying(false), setTime(at[i] + 0.01))} className={`relative h-full overflow-hidden border-e-2 border-black/40 ${i === curIndex ? 'ring-2 ring-inset ring-white' : ''}`} style={{ width: `${(durs[i] / total) * 100}%` }} aria-label={t('Frame {n}', { n: i + 1 })}>
                    <AssetThumb asset={p.assets.find((a) => a.id === f.assetId)} className="h-full w-full opacity-80" />
                  </button>
                ))}
                {(p.animatic?.beats ?? []).filter((b) => b < total).map((b) => (
                  <span key={b} className="pointer-events-none absolute bottom-0 h-2 w-px bg-[#ff9a6b]" style={{ left: `${(b / total) * 100}%` }} />
                ))}
                <span className="pointer-events-none absolute inset-y-0 w-0.5 bg-white" style={{ left: `${(time / total) * 100}%` }} />
              </div>
            </Pane>
          </div>

          <Pane className="lg-scroll flex min-h-0 flex-col gap-4 overflow-y-auto rounded-[26px] p-4">
            <div className="space-y-2">
              <p className="lg-label flex items-center gap-1.5">
                <Music size={13} /> {t('Sound')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => ws.setAnimatic(p.id, { audioAssetId: undefined, beats: undefined, bpm: undefined })} aria-pressed={!sound} className={`min-h-[34px] rounded-full px-3 text-[12.5px] font-bold ${!sound ? 'bg-white text-[#11151a]' : 'lg-soft'}`}>
                  {t('Silent')}
                </button>
                {sounds.map((a) => (
                  <button key={a.id} type="button" onClick={() => ws.setAnimatic(p.id, { audioAssetId: a.id, beats: undefined, bpm: undefined })} aria-pressed={sound?.id === a.id} className={`max-w-full truncate rounded-full px-3 py-1.5 text-[12.5px] font-bold ${sound?.id === a.id ? 'bg-white text-[#11151a]' : 'lg-soft'}`}>
                    {a.title}
                  </button>
                ))}
                <FilePick accept="audio/*" multiple={false} onFiles={(f) => upload(f, p.id, { isReference: true, then: (a) => ws.setAnimatic(p.id, { audioAssetId: a.id }) })} className="flex min-h-[34px] items-center gap-1 rounded-full px-3 text-[12.5px] font-bold lg-soft">
                  <Upload size={13} /> {t('Add a track')}
                </FilePick>
              </div>
              {sound && (
                <div className="space-y-2 rounded-[16px] p-3 lg-soft">
                  <p className="text-[13px] text-white/80">{p.animatic?.bpm ? t('{bpm} BPM · cuts land on the beat', { bpm: p.animatic.bpm }) : t('Find the beat and every cut lands on it.')}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[12px] text-white/70">{t('Beats per frame')}</span>
                    {[1, 2, 4, 8].map((n) => (
                      <button key={n} type="button" onClick={() => setEvery(n)} aria-pressed={every === n} className={`h-8 w-8 rounded-full text-[12px] font-bold ${every === n ? 'bg-white text-[#11151a]' : 'bg-white/10'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={fitBeat} disabled={beatBusy} className="lg-btn lg-btn-primary w-full">
                    {beatBusy ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />} {t('Cut on the beat')}
                  </button>
                </div>
              )}
            </div>

            <label className="block space-y-1">
              <span className="lg-label">{t('Crossfade')}</span>
              <span className="flex items-center gap-2">
                <input type="range" min={0} max={1.2} step={0.05} value={fade} onChange={(e) => ws.setAnimatic(p.id, { fade: +e.target.value })} className="min-w-0 flex-1" />
                <span className="w-12 text-end text-[12.5px] tabular-nums">{fade.toFixed(2)} s</span>
              </span>
            </label>

            <div className="space-y-1.5">
              <p className="lg-label">{t('Frames')}</p>
              {frames.map((f, i) => (
                <div key={f.id} className={`flex items-center gap-2 rounded-[14px] p-1.5 ${i === curIndex ? 'bg-white/15' : 'lg-soft'}`}>
                  <AssetThumb asset={p.assets.find((a) => a.id === f.assetId) as Asset | undefined} className="h-10 w-14 shrink-0 rounded-[8px]" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-bold text-white/55">{String(i + 1).padStart(2, '0')}</span>
                    <span dir="auto" className="block truncate text-[12.5px]">
                      {f.caption ? t(f.caption) : p.assets.find((a) => a.id === f.assetId)?.title}
                    </span>
                  </span>
                  <input type="number" min={0.25} max={30} step={0.25} value={Math.round(durs[i] * 100) / 100} onChange={(e) => ws.setFrameDuration(p.id, f.id, Math.max(0.25, Math.min(30, +e.target.value || DEFAULT_DUR)))} className="lg-input h-9 w-[68px] px-2 text-center text-[13px] tabular-nums" aria-label={t('Seconds for frame {n}', { n: i + 1 })} dir="ltr" />
                  <span className="text-[11px] text-white/55">s</span>
                </div>
              ))}
            </div>
          </Pane>
        </div>
      )}
    </div>
  );
}
