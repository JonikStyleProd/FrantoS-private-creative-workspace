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
  n: number;
  side: 'a' | 'b';
}

export type CompareMode = 'slider' | 'side' | 'onion' | 'diff';
export type Tool = 'none' | 'pin' | 'area' | 'draw';
export interface Anchor {
  pin?: { x: number; y: number };
  area?: { x: number; y: number; w: number; h: number };
  path?: [number, number][];
}

/**
 * Image review surface. The camera never moves: A and B share one box.
 * Every mark (pin, area, drawing) is stored in the work's own 0–1 coordinates,
 * so it stays on the detail at any window size.
 */
export function WorkCanvas({
  b,
  a,
  split,
  onSplit,
  mode = 'slider',
  onion = 50,
  pins,
  activeId,
  onPin,
  tool = 'none',
  onDraft,
  draft,
  labelA,
  labelB,
  layoutId,
}: {
  b: Asset;
  a?: Asset;
  split: number;
  onSplit?: (v: number) => void;
  mode?: CompareMode;
  onion?: number;
  pins: PinView[];
  activeId?: string;
  onPin?: (id: string) => void;
  tool?: Tool;
  onDraft?: (anchor: Anchor, side: 'a' | 'b') => void;
  draft?: Anchor | null;
  labelA?: string;
  labelB?: string;
  layoutId?: string;
}) {
  const compare = !!a;
  const side = compare && mode === 'side';
  const aspect = (b.w / b.h) * (side ? 2 : 1);
  const { ref, w, h } = useFit(aspect, 0);
  const bu = useAssetUrl(b, 'full').url;
  const au = useAssetUrl(a, 'full').url;
  const short = (l?: string) => (l && w < 460 ? l.split(' · ').slice(0, 2).join(' · ') : l);

  if (side) {
    const gap = 8;
    const cw = (w - gap) / 2;
    return (
      <div ref={ref} className="absolute inset-0 flex items-center justify-center" dir="ltr">
        {w > 0 && (
          <div className="flex" style={{ gap, width: w, height: h }}>
            <Surface url={au} asset={a!} w={cw} h={h} pins={pins.filter((p) => p.side === 'a')} activeId={activeId} onPin={onPin} tool={tool} onDraft={(an) => onDraft?.(an, 'a')} draft={null} label={short(labelA)} />
            <Surface url={bu} asset={b} w={cw} h={h} pins={pins.filter((p) => p.side === 'b')} activeId={activeId} onPin={onPin} tool={tool} onDraft={(an) => onDraft?.(an, 'b')} draft={draft} label={short(labelB)} layoutId={layoutId} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="absolute inset-0 flex items-center justify-center" dir="ltr">
      {w > 0 && (
        <Surface
          url={bu}
          under={compare ? au : undefined}
          mode={compare ? mode : undefined}
          split={split}
          onSplit={onSplit}
          onion={onion}
          asset={b}
          w={w}
          h={h}
          pins={pins}
          activeId={activeId}
          onPin={onPin}
          tool={tool}
          onDraft={(an) => {
            const x = an.pin?.x ?? an.area?.x ?? an.path?.[0]?.[0] ?? 1;
            onDraft?.(an, compare && mode === 'slider' && x * 100 <= split ? 'a' : 'b');
          }}
          draft={draft}
          labelA={compare ? short(labelA) : undefined}
          labelB={compare ? short(labelB) : undefined}
          layoutId={layoutId}
        />
      )}
    </div>
  );
}

function Surface({
  url,
  under,
  mode,
  split = 50,
  onSplit,
  onion = 50,
  asset,
  w,
  h,
  pins,
  activeId,
  onPin,
  tool,
  onDraft,
  draft,
  label,
  labelA,
  labelB,
  layoutId,
}: {
  url?: string;
  under?: string;
  mode?: CompareMode;
  split?: number;
  onSplit?: (v: number) => void;
  onion?: number;
  asset: Asset;
  w: number;
  h: number;
  pins: PinView[];
  activeId?: string;
  onPin?: (id: string) => void;
  tool: Tool;
  onDraft: (a: Anchor) => void;
  draft?: Anchor | null;
  label?: string;
  labelA?: string;
  labelB?: string;
  layoutId?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<'split' | 'area' | 'draw' | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [live, setLive] = useState<Anchor | null>(null);
  const slider = mode === 'slider' && !!under;

  const rel = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };

  const down = (e: React.PointerEvent) => {
    const p = rel(e);
    if (tool === 'pin') return onDraft({ pin: p });
    if (tool === 'area' || tool === 'draw') {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      drag.current = tool;
      start.current = p;
      setLive(tool === 'area' ? { area: { x: p.x, y: p.y, w: 0, h: 0 } } : { path: [[p.x, p.y]] });
      return;
    }
    if (slider && onSplit) {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      drag.current = 'split';
      onSplit(p.x * 100);
    }
  };
  const move = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const p = rel(e);
    if (drag.current === 'split') onSplit?.(p.x * 100);
    else if (drag.current === 'area' && start.current) {
      const s = start.current;
      setLive({ area: { x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) } });
    } else if (drag.current === 'draw') {
      setLive((l) => {
        const path = l?.path ?? [];
        const last = path[path.length - 1];
        if (last && Math.hypot(last[0] - p.x, last[1] - p.y) < 0.004) return l;
        return { path: [...path, [p.x, p.y]] };
      });
    }
  };
  const up = () => {
    const kind = drag.current;
    drag.current = null;
    if (kind === 'area' && live?.area) {
      if (live.area.w > 0.01 && live.area.h > 0.01) onDraft({ area: round(live.area) });
      else onDraft({ pin: { x: live.area.x, y: live.area.y } });
    }
    if (kind === 'draw' && live?.path && live.path.length > 2) onDraft({ path: simplify(live.path) });
    setLive(null);
  };

  const shown = live ?? draft;
  const cursor = tool !== 'none' ? 'crosshair' : slider ? 'ew-resize' : 'default';

  return (
    <motion.div
      layoutId={layoutId}
      ref={box}
      className="relative shrink-0 select-none overflow-visible"
      style={{ width: w, height: h, cursor, touchAction: tool !== 'none' || slider ? 'none' : 'auto' }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      transition={{ type: 'spring', stiffness: 260, damping: 32 }}
    >
      {under && <img src={under} alt="" draggable={false} className="absolute inset-0 h-full w-full object-contain" />}
      {url && (
        <img
          src={url}
          alt={asset.title}
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain"
          style={
            under && mode === 'slider'
              ? { clipPath: `inset(0 0 0 ${split}%)` }
              : under && mode === 'onion'
                ? { opacity: onion / 100 }
                : under && mode === 'diff'
                  ? { mixBlendMode: 'difference' }
                  : undefined
          }
        />
      )}
      {slider && (
        <>
          <div className="pointer-events-none absolute inset-y-0 w-px bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.15)]" style={{ left: `${split}%` }} />
          <button
            role="slider"
            aria-label="A / B"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(split)}
            onKeyDown={(e) => {
              if (!onSplit) return;
              const step = e.shiftKey ? 10 : 2;
              if (e.key === 'ArrowLeft') onSplit(Math.max(0, split - step));
              if (e.key === 'ArrowRight') onSplit(Math.min(100, split + step));
              if (e.key === 'Home') onSplit(0);
              if (e.key === 'End') onSplit(100);
            }}
            className="absolute top-1/2 z-20 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-[var(--ink)]/80 text-[12px] font-semibold text-white backdrop-blur"
            style={{ left: `${split}%` }}
          >
            ⟷
          </button>
        </>
      )}
      {(labelA || label) && <span className="f2-mono pointer-events-none absolute left-3 top-3 z-10 rounded bg-black/55 px-2 py-1 !text-[10.5px] text-white">{labelA ?? label}</span>}
      {labelB && <span className="f2-mono pointer-events-none absolute right-3 top-3 z-10 rounded bg-black/55 px-2 py-1 !text-[10.5px] text-white">{labelB}</span>}

      {/* drawn marks */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden>
        {pins.map(({ c, side }) => {
          const vis = !slider || (side === 'a' ? anchorX(c) * 100 <= split : anchorX(c) * 100 > split);
          const on = c.id === activeId;
          const stroke = c.resolved ? '#f3efe7' : 'var(--signal)';
          if (!vis) return null;
          if (c.area)
            return <rect key={c.id} x={c.area.x} y={c.area.y} width={c.area.w} height={c.area.h} fill={on ? 'rgba(255,75,43,0.12)' : 'none'} stroke={stroke} strokeWidth={on ? 2.5 : 1.75} strokeDasharray={c.resolved ? '4 3' : undefined} vectorEffect="non-scaling-stroke" rx={0.004} />;
          if (c.path)
            return <polyline key={c.id} points={c.path.map((p) => p.join(',')).join(' ')} fill="none" stroke={stroke} strokeWidth={on ? 3.5 : 2.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={c.resolved ? 0.6 : 1} />;
          return null;
        })}
        {shown?.area && <rect x={shown.area.x} y={shown.area.y} width={shown.area.w} height={shown.area.h} fill="rgba(255,75,43,0.12)" stroke="var(--signal)" strokeWidth={2} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />}
        {shown?.path && <polyline points={shown.path.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--signal)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
      </svg>

      {/* numbered badges for every mark */}
      {pins.map(({ c, n, side }) => {
        const pos = badgePos(c);
        if (!pos) return null;
        const visible = !slider || (side === 'a' ? anchorX(c) * 100 <= split : anchorX(c) * 100 > split);
        const on = c.id === activeId;
        return (
          <motion.button
            key={c.id}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onPin?.(c.id);
            }}
            aria-label={`${n}${c.resolved ? ' ✓' : ''}: ${c.text}`}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, pointerEvents: visible ? 'auto' : 'none' }}
            initial={false}
            animate={{ opacity: visible ? 1 : 0, scale: on ? 1.15 : 1 }}
            transition={{ duration: 0.2 }}
          >
            {on && (
              <motion.span className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--signal)]" initial={{ scale: 0.5, opacity: 1 }} animate={{ scale: 1.4, opacity: 0 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }} />
            )}
            <span
              className="relative flex h-7 w-7 items-center justify-center rounded-full rounded-bl-[3px] text-[12px] font-bold tabular-nums shadow-[0_6px_14px_-4px_rgba(0,0,0,0.6)]"
              style={{ background: c.resolved ? '#f3efe7' : 'var(--signal)', color: c.resolved ? 'var(--ink-2)' : 'var(--signal-ink)', outline: on ? '2px solid #fff' : 'none' }}
            >
              {c.resolved ? '✓' : c.isTask ? '☐' : n}
            </span>
          </motion.button>
        );
      })}

      <AnimatePresence>
        {shown?.pin && (
          <motion.span
            key="draft"
            className="pointer-events-none absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full rounded-bl-[3px] border-2 border-white bg-[var(--signal)] text-[13px] font-bold text-[var(--signal-ink)]"
            style={{ left: `${shown.pin.x * 100}%`, top: `${shown.pin.y * 100}%` }}
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
  );
}

export function anchorX(c: { pin?: { x: number }; area?: { x: number; w: number }; path?: [number, number][] }) {
  if (c.pin) return c.pin.x;
  if (c.area) return c.area.x + c.area.w / 2;
  if (c.path?.length) return c.path[0][0];
  return 0.5;
}
function badgePos(c: Comment) {
  if (c.pin) return c.pin;
  if (c.area) return { x: c.area.x, y: c.area.y };
  if (c.path?.length) return { x: c.path[0][0], y: c.path[0][1] };
  return null;
}
const r4 = (v: number) => Math.round(v * 10000) / 10000;
function round(a: { x: number; y: number; w: number; h: number }) {
  return { x: r4(a.x), y: r4(a.y), w: r4(a.w), h: r4(a.h) };
}
/** drop points that add nothing, keep the stroke light to store */
function simplify(path: [number, number][]) {
  const out: [number, number][] = [path[0]];
  for (let i = 1; i < path.length - 1; i++) {
    const [x, y] = path[i];
    const [px, py] = out[out.length - 1];
    if (Math.hypot(x - px, y - py) > 0.008) out.push([r4(x), r4(y)]);
  }
  out.push(path[path.length - 1]);
  return out.slice(0, 400);
}
