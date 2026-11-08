import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, MotionValue } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Asset } from './types';
import { AssetThumb } from './kit';
import { useReducedMotion } from '../ui';

/**
 * The orbit from FrantoS v1, given one job: show what a project is made of.
 * Related materials sit on a ring around the work; dragging or ← → turns it,
 * choosing a card opens its tools. Grid stays one click away for daily work.
 * Rendering is plain CSS 3D (no WebGL), it stops when off-screen.
 */
export function Orbit({ items, selected, onSelect }: { items: Asset[]; selected?: string; onSelect: (id: string) => void }) {
  const n = items.length;
  const step = 360 / Math.max(n, 1);
  const rot = useMotionValue(0);
  const smooth = useSpring(rot, { stiffness: 120, damping: 22 });
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; r: number; moved: boolean } | null>(null);
  const reduced = useReducedMotion();
  const [radius, setRadius] = useState(360);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setRadius(Math.max(220, Math.min(460, e.contentRect.width * 0.36))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // bring the selected card to the front
  useEffect(() => {
    const i = items.findIndex((a) => a.id === selected);
    if (i < 0) return;
    const target = -i * step;
    const cur = rot.get();
    const delta = ((((target - cur) % 360) + 540) % 360) - 180;
    rot.set(cur + delta);
  }, [selected, items, step, rot]);

  const turn = (d: number) => {
    const i = Math.round(-rot.get() / step);
    const next = (((i + d) % n) + n) % n;
    onSelect(items[next].id);
  };

  return (
    <div
      ref={ref}
      className="relative h-full min-h-[420px] w-full overflow-hidden"
      style={{ perspective: 1400, touchAction: 'pan-y' }}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, r: rot.get(), moved: false };
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const dx = e.clientX - drag.current.x;
        if (Math.abs(dx) > 4) drag.current.moved = true;
        rot.set(drag.current.r + dx * 0.25);
      }}
      onPointerUp={() => {
        if (drag.current?.moved) {
          const i = Math.round(-rot.get() / step);
          onSelect(items[((i % n) + n) % n].id);
        }
        setTimeout(() => (drag.current = null), 0);
      }}
      onPointerLeave={() => (drag.current = null)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') turn(-1);
        if (e.key === 'ArrowRight') turn(1);
      }}
    >
      <motion.div className="absolute left-1/2 top-1/2 h-0 w-0" style={{ transformStyle: 'preserve-3d', rotateX: -6, rotateY: reduced ? rot : smooth }}>
        {items.map((a, i) => (
          <OrbitCard key={a.id} a={a} angle={i * step} radius={radius} rot={reduced ? rot : smooth} active={a.id === selected} onClick={() => !drag.current?.moved && onSelect(a.id)} />
        ))}
      </motion.div>
      <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-3">
        <button onClick={() => turn(-1)} aria-label="Previous material" className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--rule)] bg-[var(--paper)] hover:bg-white/60">
          <ChevronLeft size={18} />
        </button>
        <span className="f2-mono text-[var(--ink-2)]">Drag or ← →</span>
        <button onClick={() => turn(1)} aria-label="Next material" className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--rule)] bg-[var(--paper)] hover:bg-white/60">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

function OrbitCard({ a, angle, radius, rot, active, onClick }: { a: Asset; angle: number; radius: number; rot: MotionValue<number>; active: boolean; onClick: () => void }) {
  // cards facing away fade and stop taking clicks
  const facing = useTransform(rot, (r) => Math.cos(((r + angle) * Math.PI) / 180));
  const opacity = useTransform(facing, [-1, -0.2, 1], [0.12, 0.35, 1]);
  const w = a.w / a.h > 1.1 ? 190 : 140;
  return (
    <motion.button
      onClick={onClick}
      aria-label={a.title}
      aria-current={active}
      className="absolute text-left"
      style={{
        width: w,
        left: -w / 2,
        top: -110,
        transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
        opacity,
        backfaceVisibility: 'hidden',
      }}
    >
      <span
        className="block overflow-hidden rounded-[3px] bg-[var(--graphite)] shadow-[0_24px_40px_-24px_rgba(21,19,15,0.7)] transition-[outline] duration-200"
        style={{ aspectRatio: `${a.w}/${a.h}`, maxHeight: 200, outline: active ? '2px solid var(--signal)' : 'none', outlineOffset: 4 }}
      >
        <AssetThumb asset={a} className="h-full w-full" />
      </span>
      <span className="mt-2 block truncate text-[12px] font-medium">{a.title}</span>
      <span className="f2-mono block !text-[9.5px] text-[var(--ink-2)]">{a.isReference ? 'Reference' : a.kind === 'video' ? 'Motion' : 'Work'}</span>
    </motion.button>
  );
}
