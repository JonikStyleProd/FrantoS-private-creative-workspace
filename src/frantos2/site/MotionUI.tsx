import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MousePointer2, Pause, Play, Plus, ScrollText, Sparkle, Trash2, WandSparkles, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { CURVES } from '../kits/curves';
import { Section, Seg } from '../studio/ui';
import type { SiteAnim, SiteHover, SiteKey, SiteNode, SiteTheme } from '../ws/types';
import { walk } from './model';
import { ENTERS, defaultAnim, spanOf, staggers } from './motion';
import { COLOR_ROLES, ROLE_LABEL } from './theme';

/* ───────── inspector: entrance, hover, depth ───────── */

function Range({ label, value, min, max, step = 50, unit = 'ms', onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number, done: boolean) => void }) {
  return (
    <label className="block text-[12px] text-white/75">
      <span className="flex justify-between">
        {label}
        <span className="tabular-nums font-bold">
          {value} {unit}
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value, false)} onPointerUp={(e) => onChange(+(e.target as HTMLInputElement).value, true)} onKeyUp={(e) => onChange(+(e.target as HTMLInputElement).value, true)} className="mt-1 w-full accent-[#4f8bff]" aria-label={label} />
    </label>
  );
}

function Swatches({ value, theme, onChange }: { value?: string; theme: SiteTheme; onChange: (c?: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-1.5">
      <button type="button" onClick={() => onChange(undefined)} aria-pressed={!value} aria-label={t('None')} title={t('None')} className={`h-6 w-6 rounded-full bg-[linear-gradient(135deg,transparent_45%,#ff4f4f_45%,#ff4f4f_55%,transparent_55%)] ring-1 ring-white/30 ${!value ? 'ring-2 ring-white' : ''}`} />
      {COLOR_ROLES.map((r) => (
        <button key={r} type="button" onClick={() => onChange(r)} aria-pressed={value === r} aria-label={t(ROLE_LABEL[r])} title={t(ROLE_LABEL[r])} className={`h-6 w-6 rounded-full ring-1 ring-white/30 ${value === r ? 'ring-2 ring-white ring-offset-2 ring-offset-black/40' : ''}`} style={{ background: theme[r] }} />
      ))}
    </div>
  );
}

const num = (v: string) => (v.trim() === '' || isNaN(+v) ? undefined : +v);

function KeysEditor({ keys, onChange }: { keys: SiteKey[]; onChange: (k: SiteKey[], done: boolean) => void }) {
  const { t } = useI18n();
  const sorted = [...keys].sort((a, b) => a.at - b.at);
  const set = (i: number, patch: Partial<SiteKey>) => onChange(sorted.map((k, j) => (j === i ? { ...k, ...patch } : k)), false);
  const fields: [keyof SiteKey, string, string][] = [
    ['x', 'X', 'px'],
    ['y', 'Y', 'px'],
    ['scale', t('Scale'), '×'],
    ['rotate', t('Turn'), '°'],
    ['opacity', t('Opacity'), '0–1'],
  ];
  return (
    <div className="space-y-2">
      {sorted.map((k, i) => (
        <div key={i} className="rounded-[14px] bg-white/[.07] p-2">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rotate-45 bg-[#ffb84f]" aria-hidden />
            <label className="flex items-center gap-1 text-[12px] font-bold">
              <input type="number" min={0} max={100} value={Math.round(k.at * 100)} onChange={(e) => set(i, { at: Math.max(0, Math.min(100, +e.target.value || 0)) / 100 })} onBlur={() => onChange(sorted, true)} className="lg-input h-7 min-h-0 w-[52px] px-1.5 text-[12px]" aria-label={t('Where on the timeline, %')} />%
            </label>
            {sorted.length > 2 && (
              <button type="button" onClick={() => onChange(sorted.filter((_, j) => j !== i), true)} className="lg-btn lg-btn-plain ms-auto h-7 min-h-0 w-7 lg-icon !p-0" aria-label={t('Remove keyframe')}>
                <Trash2 size={12} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-5 gap-1">
            {fields.map(([f, l, u]) => (
              <label key={f} className="block text-center text-[10.5px] text-white/60" title={`${l} · ${u}`}>
                {l}
                <input type="number" step={f === 'opacity' || f === 'scale' ? 0.05 : 1} value={(k[f] as number | undefined) ?? ''} placeholder={f === 'scale' || f === 'opacity' ? '1' : '0'} onChange={(e) => set(i, { [f]: num(e.target.value) })} onBlur={() => onChange(sorted, true)} className="lg-input mt-0.5 h-7 min-h-0 w-full px-1 text-center text-[11.5px]" />
              </label>
            ))}
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...sorted, { at: sorted.length > 1 ? (sorted[sorted.length - 2].at + sorted[sorted.length - 1].at) / 2 : 0.5 }], true)} className="lg-btn lg-btn-ghost min-h-[34px] w-full text-[12px]">
        <Plus size={13} /> {t('Add a keyframe')}
      </button>
    </div>
  );
}

export function MotionSection({ n, parent, theme, onNode, onPlay }: { n: SiteNode; parent?: SiteNode; theme: SiteTheme; onNode: (n: SiteNode, label: string, now?: boolean) => void; onPlay: () => void }) {
  const { t } = useI18n();
  const a = n.anim;
  const textual = n.type === 'heading' || n.type === 'text' || n.type === 'button';
  const box = n.type === 'section' || n.type === 'stack' || n.type === 'grid';
  const enters = ENTERS.filter((e) => !e.text || (textual && (e.id !== 'count' || /\d/.test(n.text ?? ''))));
  const setA = (patch: Partial<SiteAnim>, now = true) => a && onNode({ ...n, anim: { ...a, ...patch } }, 'Motion changed', now);
  const setH = (patch: Partial<SiteHover>, now = true) => {
    const h = { ...n.hover, ...patch };
    Object.keys(h).forEach((k) => h[k as keyof SiteHover] === undefined && delete h[k as keyof SiteHover]);
    onNode({ ...n, hover: Object.keys(h).length ? h : undefined }, 'Hover changed', now);
  };
  const inStagger = parent && staggers(parent);
  return (
    <Section title={t('Animation')} icon={<Sparkle size={15} />}>
      {inStagger ? (
        <p className="rounded-[12px] bg-white/[.07] px-2.5 py-2 text-[12px] leading-[1.4] text-white/75">{t('This element enters with its container, one after another. Change it on the container, or give it a hover below.')}</p>
      ) : (
        <>
          <Seg wrap label={t('Entrance')} value={a?.enter ?? 'none'} options={[{ id: 'none', label: t('None') }, ...enters.map((e) => ({ id: e.id, label: t(e.label) }))]} onChange={(v) => onNode({ ...n, anim: v === 'none' ? undefined : { ...defaultAnim(v as SiteAnim['enter'], n), ...(a ? { trigger: a.trigger, delay: a.delay } : {}) } }, 'Motion changed')} />
          {a && (
            <>
              <Seg label={t('Starts')} value={a.trigger} options={[{ id: 'load' as const, label: t('On load') }, { id: 'scroll' as const, label: t('When scrolled to') }]} onChange={(trigger) => setA({ trigger })} />
              <Range label={t('Duration')} value={a.dur} min={150} max={2400} onChange={(dur, done) => setA({ dur }, done)} />
              <Range label={t('Delay')} value={a.delay} min={0} max={3000} onChange={(delay, done) => setA({ delay }, done)} />
              <label className="block text-[12px] text-white/75">
                {t('Curve')}
                <select value={a.ease} onChange={(e) => setA({ ease: e.target.value })} className="lg-input mt-1.5 min-h-[36px] w-full px-2 text-[13px]">
                  {CURVES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {t(c.label)} · {t(c.use)}
                    </option>
                  ))}
                </select>
              </label>
              {(a.enter === 'rise' || a.enter === 'slide') && <Seg label={t('Distance')} value={a.dist ?? 32} options={[16, 32, 64, 120].map((d) => ({ id: d, label: String(d) }))} onChange={(dist) => setA({ dist })} />}
              {box && a.enter !== 'custom' && <Seg wrap label={t('Children one by one')} value={a.stagger ?? 0} options={[0, 60, 90, 140, 220].map((d) => ({ id: d, label: d ? `${d}` : t('Off') }))} onChange={(stagger) => setA({ stagger: stagger || undefined })} />}
              {a.enter === 'words' && <Seg label={t('Between words')} value={a.stagger ?? 60} options={[30, 60, 90, 140].map((d) => ({ id: d, label: String(d) }))} onChange={(stagger) => setA({ stagger })} />}
              {a.enter === 'custom' && (
                <>
                  <KeysEditor keys={a.keys ?? []} onChange={(keys, done) => setA({ keys }, done)} />
                  <Seg label={t('Repeat')} value={a.loop ? 'y' : 'n'} options={[{ id: 'n', label: t('Once') }, { id: 'y', label: t('Again and again') }]} onChange={(v) => setA({ loop: v === 'y' })} />
                </>
              )}
              <button type="button" onClick={onPlay} className="lg-btn lg-btn-ghost min-h-[36px] w-full text-[12.5px]">
                <Play size={13} /> {t('Play the page')}
              </button>
            </>
          )}
        </>
      )}
      <div className="border-t border-white/10 pt-3">
        <p className="mb-2 flex items-center gap-1.5 text-[12.5px] font-bold">
          <MousePointer2 size={13} /> {t('On hover')}
        </p>
        <div className="space-y-3">
          <Seg label={t('Lift')} value={n.hover?.lift ?? 0} options={[0, 2, 4, 8].map((d) => ({ id: d, label: d ? `${d}` : t('Off') }))} onChange={(lift) => setH({ lift: lift || undefined })} />
          <Seg label={t('Grow')} value={n.hover?.scale ?? 1} options={[1, 1.02, 1.04, 1.08].map((d) => ({ id: d, label: d === 1 ? t('Off') : `${Math.round((d - 1) * 100)}%` }))} onChange={(scale) => setH({ scale: scale === 1 ? undefined : scale })} />
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" aria-pressed={!!n.hover?.bright} onClick={() => setH({ bright: n.hover?.bright ? undefined : true })} className={`lg-btn min-h-[34px] text-[12px] ${n.hover?.bright ? 'lg-btn-primary' : 'lg-btn-ghost'}`}>
              {t('Brighten')}
            </button>
            <button type="button" aria-pressed={!!n.hover?.shadow} onClick={() => setH({ shadow: n.hover?.shadow ? undefined : true })} className={`lg-btn min-h-[34px] text-[12px] ${n.hover?.shadow ? 'lg-btn-primary' : 'lg-btn-ghost'}`}>
              {t('Shadow')}
            </button>
          </div>
          {(box || n.type === 'button' || textual) && (
            <>
              <div className="text-[12px] text-white/75">
                <p className="mb-1.5">{t('Background on hover')}</p>
                <Swatches value={n.hover?.bg} theme={theme} onChange={(bg) => setH({ bg })} />
              </div>
              <div className="text-[12px] text-white/75">
                <p className="mb-1.5">{t('Text colour on hover')}</p>
                <Swatches value={n.hover?.color} theme={theme} onChange={(color) => setH({ color })} />
              </div>
            </>
          )}
          {n.hover && <Range label={t('Hover speed')} value={n.hover.dur ?? 300} min={100} max={900} onChange={(dur, done) => setH({ dur }, done)} />}
        </div>
      </div>
      {(n.type === 'media' || n.type === 'object' || box || n.type === 'heading') && (
        <div className="border-t border-white/10 pt-3">
          <Seg label={t('Depth when scrolling')} value={n.depth ?? 0} options={[{ id: -0.12, label: t('Closer') }, { id: 0, label: t('Off') }, { id: 0.08, label: t('A little further') }, { id: 0.18, label: t('Further') }]} onChange={(depth) => onNode({ ...n, depth: depth || undefined }, 'Motion changed')} />
          <p className="mt-1.5 text-[11.5px] leading-[1.4] text-white/55">{t('Further moves slower than the page, closer moves faster. Shows in the preview.')}</p>
        </div>
      )}
    </Section>
  );
}

/* ───────── timeline ───────── */

export interface TimelineApi {
  head: (t: number) => void;
}

export function Timeline({
  root,
  sel,
  tr,
  playing,
  onSelect,
  onAnim,
  onScrub,
  onPlay,
  onPause,
  onClose,
  onAuto,
  api,
}: {
  root: SiteNode[];
  sel: string | null;
  tr?: (s: string) => string;
  playing: boolean;
  onSelect: (id: string) => void;
  onAnim: (id: string, patch: Partial<SiteAnim>, now: boolean) => void;
  onScrub: (t: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onClose: () => void;
  onAuto: () => void;
  api: React.MutableRefObject<TimelineApi | null>;
}) {
  const { t } = useI18n();
  const rows = useMemo(() => {
    const out: { n: SiteNode; depth: number }[] = [];
    walk(root, (n, _p, depth) => n.anim && out.push({ n, depth }));
    return out;
  }, [root]);
  const total = useMemo(() => Math.max(0, ...rows.map((r) => spanOf(r.n))), [rows]);
  const T = Math.max(2000, Math.ceil((total + 400) / 500) * 500);
  const track = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  useLayoutEffect(() => {
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const k = w / T;
  const last = useRef(0);
  useEffect(() => {
    api.current = {
      head: (ms) => {
        last.current = ms;
        if (head.current) head.current.style.transform = `translateX(${Math.min(T, ms) * k}px)`;
      },
    };
    api.current.head(last.current);
  }, [api, k, T]);

  const snap = (v: number) => Math.max(0, Math.round(v / 50) * 50);
  const drag = (e: React.PointerEvent, id: string, a: SiteAnim, what: 'move' | 'end') => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(id);
    const x0 = e.clientX;
    let last = what === 'move' ? a.delay : a.dur;
    const mv = (ev: PointerEvent) => {
      const dv = (ev.clientX - x0) / k;
      last = what === 'move' ? snap(a.delay + dv) : Math.max(100, snap(a.dur + dv));
      onAnim(id, what === 'move' ? { delay: last } : { dur: last }, false);
    };
    const up = () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      onAnim(id, what === 'move' ? { delay: last } : { dur: last }, true);
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  };
  const scrubAt = (e: React.PointerEvent) => {
    const r = track.current!.getBoundingClientRect();
    const at = (x: number) => Math.max(0, Math.min(T, (x - r.left) / k));
    onScrub(at(e.clientX));
    const mv = (ev: PointerEvent) => onScrub(at(ev.clientX));
    const up = () => (window.removeEventListener('pointermove', mv), window.removeEventListener('pointerup', up));
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  };
  const ticks = Array.from({ length: Math.floor(T / 250) + 1 }, (_, i) => i * 250);
  const label = (n: SiteNode) => (n.name ? t(n.name) : n.text ? (tr ? tr(n.text) : n.text).split('\n')[0].slice(0, 26) : t(n.type === 'media' ? 'Picture' : n.type === 'grid' ? 'Grid' : n.type === 'stack' ? 'Column' : n.type === 'section' ? 'Section' : n.type));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <button type="button" onClick={playing ? onPause : onPlay} className="lg-btn lg-btn-primary h-9 min-h-0 w-9 lg-icon !p-0" aria-label={playing ? t('Pause') : t('Play motion')} title={`${playing ? t('Pause') : t('Play motion')} · ${t('Space')}`}>
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <p className="text-[13.5px] font-extrabold">{t('Timeline')}</p>
        <p className="text-[11.5px] text-white/55 max-xl:hidden">{t('Drag a bar to delay it, its end to make it longer. Scroll entrances start when they come into view.')}</p>
        <button type="button" onClick={onAuto} className="lg-btn lg-btn-ghost ms-auto min-h-[32px] px-3 text-[12px]" title={t('Headline word by word, grids one by one, pictures zoom, buttons lift')}>
          <WandSparkles size={13} /> {t('Bring the page to life')}
        </button>
        <button type="button" onClick={onClose} className="lg-btn lg-btn-plain h-8 min-h-0 w-8 lg-icon !p-0" aria-label={t('Close the timeline')}>
          <X size={15} />
        </button>
      </div>
      <div className="lg-scroll relative min-h-0 flex-1 overflow-y-auto" dir="ltr">
        <div className="grid grid-cols-[150px_minmax(0,1fr)]">
          <div className="sticky top-0 z-10 h-7 border-b border-white/10 bg-black/10 backdrop-blur" />
          <div ref={track} className="sticky top-0 z-10 h-7 cursor-ew-resize touch-none border-b border-white/10 bg-black/10 backdrop-blur" onPointerDown={scrubAt}>
            {ticks.map((ms) => (
              <span key={ms} className="absolute bottom-0 border-s border-white/25" style={{ left: ms * k, height: ms % 500 ? 6 : 12 }}>
                {ms % 500 === 0 && <span className="absolute -top-[13px] start-1 text-[10px] tabular-nums text-white/60">{ms / 1000}s</span>}
              </span>
            ))}
          </div>
          {rows.map(({ n, depth }) => {
            const a = n.anim!;
            const sp = spanOf(n);
            return (
              <React.Fragment key={n.id}>
                <button type="button" onClick={() => onSelect(n.id)} className={`flex h-[30px] items-center gap-1.5 truncate border-b border-white/[.06] pe-2 text-start text-[12px] ${n.id === sel ? 'bg-white/15 font-bold' : 'hover:bg-white/[.07]'}`} style={{ paddingInlineStart: 10 + Math.min(depth, 4) * 10 }}>
                  {a.trigger === 'scroll' ? <ScrollText size={11} className="shrink-0 opacity-60" /> : <Sparkle size={11} className="shrink-0 opacity-60" />}
                  <span dir="auto" className="truncate">
                    {label(n)}
                  </span>
                </button>
                <div className={`relative h-[30px] border-b border-white/[.06] ${n.id === sel ? 'bg-white/[.08]' : ''}`}>
                  {sp > a.delay + a.dur && <div className="absolute top-[9px] h-3 rounded-full bg-white/20" style={{ left: (a.delay + a.dur) * k, width: (sp - a.delay - a.dur) * k }} title={t('Children or words, one after another')} />}
                  <div
                    role="slider"
                    tabIndex={0}
                    aria-label={`${label(n)} · ${t('Delay')}`}
                    aria-valuemin={0}
                    aria-valuemax={T}
                    aria-valuenow={a.delay}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                        e.preventDefault();
                        onAnim(n.id, { delay: Math.max(0, a.delay + (e.key === 'ArrowRight' ? 50 : -50)) }, true);
                      }
                    }}
                    onPointerDown={(e) => drag(e, n.id, a, 'move')}
                    className={`absolute top-[5px] flex h-5 cursor-grab touch-none items-center overflow-hidden rounded-full px-2 text-[10.5px] font-bold text-white shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${a.trigger === 'scroll' ? 'bg-[#e0559a]' : 'bg-[#4f8bff]'}`}
                    style={{ left: a.delay * k, width: Math.max(14, a.dur * k) }}
                  >
                    <span className="truncate">{t(ENTERS.find((e) => e.id === a.enter)?.label ?? '')}</span>
                    {a.enter === 'custom' &&
                      (a.keys ?? []).map((kf, i) => <span key={i} className="pointer-events-none absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#ffb84f]" style={{ left: `${kf.at * 100}%` }} />)}
                    <span onPointerDown={(e) => drag(e, n.id, a, 'end')} className="absolute inset-y-0 end-0 w-2.5 cursor-ew-resize bg-white/30" aria-hidden />
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
        {!rows.length && (
          <div className="flex flex-col items-center gap-2 px-4 py-5 text-center">
            <p className="text-[13px] text-white/75">{t('Nothing moves yet. Pick an element and choose how it enters, or let FrantoS suggest.')}</p>
            <button type="button" onClick={onAuto} className="lg-btn lg-btn-primary min-h-[36px] text-[12.5px]">
              <WandSparkles size={14} /> {t('Bring the page to life')}
            </button>
          </div>
        )}
        <div className="pointer-events-none absolute inset-y-0 start-[150px] end-0" aria-hidden>
          <div ref={head} className="absolute inset-y-0 start-0 w-px bg-[#ffb84f] shadow-[0_0_0_1px_rgba(0,0,0,.25)]" />
        </div>
      </div>
    </div>
  );
}
