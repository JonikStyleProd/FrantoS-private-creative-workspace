import React, { useMemo } from 'react';
import type { MaterialVariant } from '../ws/types';

/** Inspector building blocks shared by every studio mode. */

export function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
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

export function Slider({ label, value, min, max, step = 0.01, fmt, onChange }: { label: string; value: number; min: number; max: number; step?: number; fmt?: (v: number) => string; onChange: (v: number) => void }) {
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

/**
 * A segmented choice. `wrap` lays the options out as chips that size to their label and flow onto
 * the next line, so long or translated labels never get cut or broken mid-word.
 */
export function Seg<T extends string | number>({ label, value, options, onChange, cols, wrap }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; cols?: number; wrap?: boolean }) {
  return (
    <div role="radiogroup" aria-label={label} className={`gap-1 rounded-[14px] bg-white/10 p-1 ${wrap ? 'flex flex-wrap' : 'grid'}`} style={wrap ? undefined : { gridTemplateColumns: `repeat(${cols ?? options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={String(o.id)} type="button" role="radio" aria-checked={o.id === value} onClick={() => onChange(o.id)} className={`min-h-[36px] whitespace-nowrap rounded-[10px] text-[12.5px] font-bold ${wrap ? 'flex-auto px-3' : 'min-w-0 px-1'} ${o.id === value ? 'bg-white text-[#11151a]' : 'text-white/85 hover:bg-white/10'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Swatch({ v, thumb }: { v: MaterialVariant; thumb?: string }) {
  if (v.finish === 'tint' || v.finish === 'solid') return <span className="block h-full w-full rounded-[inherit]" style={{ background: v.finish === 'solid' ? v.topColor : `linear-gradient(135deg, ${v.topColor}, ${v.topColor}aa)` }} />;
  if (thumb) return <img src={thumb} alt="" className="block h-full w-full rounded-[inherit] object-cover" />;
  const bg = v.blend >= 1 ? v.baseColor : `linear-gradient(0deg, ${v.baseColor} 0 ${Math.round((v.blend - v.softness / 2) * 100)}%, ${v.topColor} ${Math.round((v.blend + v.softness / 2) * 100)}% 100%)`;
  return <span className="block h-full w-full rounded-[inherit]" style={{ background: bg }} />;
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) {
  const id = useMemo(() => `c-${Math.random().toString(36).slice(2, 8)}`, []);
  return (
    <label htmlFor={id} className="flex min-h-[40px] cursor-pointer items-center gap-2 rounded-[12px] bg-white/10 px-2 text-[12px] font-semibold">
      <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0" />
      <span className="truncate">{label}</span>
    </label>
  );
}

export function PaletteRow({ colors, label, onPick, active }: { colors: string[]; label: string; onPick: (c: string, shift: boolean) => void; active?: string }) {
  if (!colors.length) return null;
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {colors.map((c) => (
        <button key={c} type="button" onClick={(e) => onPick(c, e.shiftKey)} title={c} aria-label={`${label}: ${c}`} className={`h-7 w-7 rounded-full ring-1 ring-white/30 transition-transform hover:scale-110 ${active?.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-white ring-offset-2 ring-offset-black/40' : ''}`} style={{ background: c }} />
      ))}
    </div>
  );
}
