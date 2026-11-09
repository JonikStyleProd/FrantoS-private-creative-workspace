import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { tr } from '../i18n';
import { Pause, Play } from 'lucide-react';
import { Asset, Comment } from './types';
import { fmtTime, useAssetUrl } from './media';
import { useFit } from './WorkCanvas';

export interface VideoHandle {
  seek: (t: number) => void;
  time: () => number;
  pause: () => void;
}

/** Motion review: comments live on the timeline; clicking one returns to that frame. */
export const VideoWork = forwardRef<VideoHandle, { asset: Asset; comments: { c: Comment; n: number }[]; activeId?: string; onMarker: (id: string) => void; layoutId?: string; draft?: { t: number; t2?: number } | null }>(
  function VideoWork({ asset, comments, activeId, onMarker, draft }, ref) {
    const { url } = useAssetUrl(asset, 'full');
    const poster = useAssetUrl(asset, 'thumb').url;
    const { ref: fitRef, w, h } = useFit(asset.w / asset.h, 0);
    const v = useRef<HTMLVideoElement>(null);
    const [t, setT] = useState(0);
    const [dur, setDur] = useState(asset.duration || 0);
    const [playing, setPlaying] = useState(false);
    const pending = useRef<number | null>(null);
    const [vel, setVel] = useState<HTMLVideoElement | null>(null);

    useImperativeHandle(ref, () => ({
      seek: (s) => {
        setT(s);
        if (!v.current || v.current.readyState < 1) {
          pending.current = s;
          return;
        }
        v.current.pause();
        v.current.currentTime = s;
        setT(s);
      },
      time: () => v.current?.currentTime ?? 0,
      pause: () => v.current?.pause(),
    }));

    useEffect(() => {
      const el = vel;
      if (!el) return;
      let raf = 0;
      const tick = () => {
        setT(el.currentTime);
        raf = requestAnimationFrame(tick);
      };
      const onPlay = () => {
        setPlaying(true);
        raf = requestAnimationFrame(tick);
      };
      const onPause = () => {
        setPlaying(false);
        cancelAnimationFrame(raf);
        setT(el.currentTime);
      };
      const onMeta = () => {
        if (isFinite(el.duration)) setDur(el.duration);
        if (pending.current != null) {
          el.currentTime = pending.current;
          pending.current = null;
        }
      };
      if (el.readyState >= 1) onMeta();
      el.addEventListener('play', onPlay);
      el.addEventListener('pause', onPause);
      el.addEventListener('loadedmetadata', onMeta);
      el.addEventListener('seeked', onPause);
      return () => {
        cancelAnimationFrame(raf);
        el.removeEventListener('play', onPlay);
        el.removeEventListener('pause', onPause);
        el.removeEventListener('loadedmetadata', onMeta);
        el.removeEventListener('seeked', onPause);
      };
    }, [vel]);

    const toggle = () => (v.current?.paused ? v.current.play() : v.current?.pause());

    return (
      <div className="absolute inset-0 flex flex-col" dir="ltr">
        <div ref={fitRef} className="relative min-h-0 flex-1">
          <div className="absolute inset-0 flex items-center justify-center">
            {w > 0 && (
              <div className="relative overflow-hidden rounded-[2px] bg-black" style={{ width: w, height: h }}>
                {url && <video ref={(n) => { v.current = n; setVel(n); }} src={url} poster={poster} playsInline muted loop className="h-full w-full object-contain" onClick={toggle} />}
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f3efe7] text-[var(--ink)]">
            {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
          <span className="f2-mono w-[92px] shrink-0 tabular-nums text-[#f3efe7]">
            {fmtTime(t)} <span className="text-[var(--fog)]">/ {fmtTime(dur)}</span>
          </span>
          <div className="relative h-10 flex-1">
            <input
              type="range"
              min={0}
              max={dur || 1}
              step={0.033}
              value={t}
              aria-label={tr('Timeline')}
              onChange={(e) => {
                const s = +e.target.value;
                if (v.current) {
                  v.current.currentTime = s;
                  v.current.pause();
                }
                setT(s);
              }}
              className="f2-range absolute inset-x-0 top-1/2 w-full -translate-y-1/2"
            />
            {comments.map(({ c }) =>
              c.t != null && c.t2 != null && dur ? (
                <span
                  key={`r-${c.id}`}
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 h-[6px] -translate-y-1/2 rounded-full"
                  style={{ left: `${(Math.min(c.t, c.t2) / dur) * 100}%`, width: `${(Math.abs(c.t2 - c.t) / dur) * 100}%`, background: c.resolved ? 'rgba(243,239,231,0.5)' : 'rgba(255,75,43,0.75)' }}
                />
              ) : null
            )}
            {draft && dur ? (
              <span aria-hidden className="pointer-events-none absolute top-1/2 h-[8px] -translate-y-1/2 rounded-full border border-white bg-[rgba(255,75,43,0.5)]" style={{ left: `${(Math.min(draft.t, draft.t2 ?? draft.t) / dur) * 100}%`, width: `max(4px, ${(Math.abs((draft.t2 ?? draft.t) - draft.t) / dur) * 100}%)` }} />
            ) : null}
            {comments.map(({ c, n }) =>
              c.t != null && dur ? (
                <button
                  key={c.id}
                  onClick={() => onMarker(c.id)}
                  aria-label={`Comment ${n} at ${fmtTime(c.t)}`}
                  className="absolute top-0 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full rounded-bl-[3px] text-[10px] font-bold"
                  style={{
                    left: `${(c.t / dur) * 100}%`,
                    background: c.resolved ? '#f3efe7' : 'var(--signal)',
                    color: 'var(--ink)',
                    outline: c.id === activeId ? '2px solid #fff' : 'none',
                  }}
                >
                  {c.resolved ? '✓' : n}
                </button>
              ) : null
            )}
          </div>
        </div>
      </div>
    );
  }
);
