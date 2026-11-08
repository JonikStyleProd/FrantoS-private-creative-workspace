import React, { useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Asset, Comment } from './types';
import { useAssetUrl } from './media';
import { ease } from './kit';

/** Measures a container and fits a box of the given aspect inside it. */
export function useFit(aspect: number, pad = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  let w = Math.max(0, box.w - pad * 2);
  let h = w / aspect;
  const maxH = Math.max(0, box.h - pad * 2);
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }
  return { ref, w, h };
}

export interface PinView {
  c: Comment;
  n: number; // number shown in the pin
  side: 'a' | 'b';
}

/**
 * Image review surface. The camera never moves: A and B share one box,
 * the divider only changes which version is visible on each side.
 * Pins are stored in the work's own 0–1 coordinates, so they stay on the detail at any size.
 */
export function WorkCanvas({
  b,
  a,
  split,
  onSplit,
  pins,
  activeId,
  onPin,
  placing,
  onPlace,
  draft,
  labelA,
  labelB,
  layoutId,
}: {
  b: Asset; // current version
  a?: Asset; // compare-to version (left side)
  split: number; // 0–100, share of A
  onSplit?: (v: number) => void;
  pins: PinView[];
  activeId?: string;
  onPin?: (id: string) => void;
  placing?: boolean;
  onPlace?: (x: number, y: number) => void;
  draft?: { x: number; y: number } | null;
  labelA?: string;
  labelB?: string;
  layoutId?: string;
}) {
  const { ref, w, h } = useFit(b.w / b.h, 0);
  const box = useRef<HTMLDivElement>(null);
  const bu = useAssetUrl(b, 'full').url;
  const au = useAssetUrl(a, 'full').url;
  const dragging = useRef(false);
  const compare = !!a;
  const short = (l?: string) => (l && w < 460 ? l.split(' · ').slice(0, 2).join(' · ') : l);

  const rel = (e: React.PointerEvent | PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (placing) {
      const p = rel(e);
      onPlace?.(p.x, p.y);
      return;
    }
    if (compare && onSplit) {
      dragging.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      onSplit(rel(e).x * 100);
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging.current && onSplit) onSplit(rel(e).x * 100);
  };
  const end = () => (dragging.current = false);

  return (
    <div ref={ref} className="absolute inset-0 flex items-center justify-center">
      {w > 0 && (
        <motion.div
          layoutId={layoutId}
          ref={box}
          className="relative select-none"
          style={{ width: w, height: h, cursor: placing ? 'crosshair' : compare ? 'ew-resize' : 'default', touchAction: compare || placing ? 'none' : 'auto' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={end}
          onPointerCancel={end}
          transition={{ type: 'spring', stiffness: 260, damping: 32 }}
        >
          {bu && <img src={bu} alt={b.title} draggable={false} className="absolute inset-0 h-full w-full object-contain" />}
          {compare && au && (
            <img
              src={au}
              alt={a!.title}
              draggable={false}
              className="absolute inset-0 h-full w-full object-contain"
              style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
            />
          )}

          {compare && (
            <>
              <div className="pointer-events-none absolute inset-y-0 w-px bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.15)]" style={{ left: `${split}%` }} />
              <button
                role="slider"
                aria-label="Compare versions: drag or use arrow keys"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(split)}
                aria-valuetext={`${Math.round(split)}% ${labelA ?? 'A'}`}
                onKeyDown={(e) => {
                  if (!onSplit) return;
                  const step = e.shiftKey ? 10 : 2;
                  if (e.key === 'ArrowLeft') onSplit(Math.max(0, split - step));
                  if (e.key === 'ArrowRight') onSplit(Math.min(100, split + step));
                  if (e.key === 'Home') onSplit(0);
                  if (e.key === 'End') onSplit(100);
                }}
                className="absolute top-1/2 z-20 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-[var(--ink)]/80 text-[11px] font-semibold text-white backdrop-blur"
                style={{ left: `${split}%` }}
              >
                ⟷
              </button>
              <span className="f2-mono pointer-events-none absolute left-3 top-3 rounded bg-black/55 px-2 py-1 !text-[10.5px] text-white">{short(labelA) ?? 'A'}</span>
              <span className="f2-mono pointer-events-none absolute right-3 top-3 rounded bg-black/55 px-2 py-1 !text-[10.5px] text-white">{short(labelB) ?? 'B'}</span>
            </>
          )}

          {/* pins */}
          {pins.map(({ c, n, side }) => {
            if (!c.pin) return null;
            const visible = !compare || (side === 'a' ? c.pin.x * 100 <= split : c.pin.x * 100 > split);
            const on = c.id === activeId;
            return (
              <motion.button
                key={c.id}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onPin?.(c.id);
                }}
                aria-label={`Comment ${n}${c.resolved ? ' (resolved)' : ''}: ${c.text}`}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${c.pin.x * 100}%`, top: `${c.pin.y * 100}%`, pointerEvents: visible ? 'auto' : 'none' }}
                initial={false}
                animate={{ opacity: visible ? 1 : 0, scale: on ? 1.15 : 1 }}
                transition={{ duration: 0.2 }}
              >
                {on && (
                  <motion.span
                    className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--signal)]"
                    initial={{ scale: 0.5, opacity: 1 }}
                    animate={{ scale: 1.4, opacity: 0 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
                <span
                  className="relative flex h-7 w-7 items-center justify-center rounded-full rounded-bl-[3px] text-[12px] font-bold tabular-nums shadow-[0_6px_14px_-4px_rgba(0,0,0,0.6)]"
                  style={{
                    background: c.resolved ? '#f3efe7' : 'var(--signal)',
                    color: c.resolved ? 'var(--ink-2)' : 'var(--signal-ink)',
                    outline: on ? '2px solid #fff' : 'none',
                  }}
                >
                  {c.resolved ? '✓' : n}
                </span>
              </motion.button>
            );
          })}

          <AnimatePresence>
            {draft && (
              <motion.span
                key="draft"
                className="pointer-events-none absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full rounded-bl-[3px] border-2 border-white bg-[var(--signal)] text-[13px] font-bold text-[var(--signal-ink)]"
                style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%` }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.2, ease }}
              >
                +
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
