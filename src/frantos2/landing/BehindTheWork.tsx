import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, animate } from 'framer-motion';
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Eye, LayoutPanelLeft, Play, RotateCcw, X } from 'lucide-react';
import { go } from '../route';
import { Wordmark } from '../ui';
import { FormPoster, POSTER_BG } from './FormPoster';
import { demoProject } from '../ws/seed';
import { WorkCanvas } from '../ws/WorkCanvas';
import { useReducedMotion } from '../ui';

const ease = [0.22, 1, 0.36, 1] as const;
const P = '/projects/form-01/';
const PROJECT_LINK = '/p/form-01/review/hero-render?v=hero-v2&cmp=hero-v1&c=c-highlight';

const STEPS = [
  { k: 'Final', title: 'The poster', text: 'FORM / 01, as the client saw it. Lift the corner.' },
  { k: '01', title: 'Form before material', text: 'Clay render. One soft light, no glaze — only the twist and its mass.' },
  { k: '02', title: 'What set the light', text: 'A satin cobalt glaze and a north window. Both are pinned to the decision they changed.' },
  { k: '03', title: 'The note that changed it', text: 'v1 under a hard spot: the highlight blew out on the upper twist. The AD pinned it right there.' },
  { k: '04', title: 'The project, in FrantoS', text: 'Same file, same note, now resolved in v2 — inside a real project you can open.' },
];

export function BehindTheWork() {
  const [stage, setStage] = useState(0);
  const [auto, setAuto] = useState(false);
  const reduced = useReducedMotion();
  const max = STEPS.length - 1;

  // a slow, directed sequence: each layer holds long enough to read, then turns
  useEffect(() => {
    if (!auto || reduced || stage === 0 || stage >= max) return;
    const hold = stage === 3 ? 4600 : 3400;
    const t = setTimeout(() => setStage((s) => Math.min(max, s + 1)), hold);
    return () => clearTimeout(t);
  }, [auto, stage, reduced, max]);

  const open = () => {
    setStage(1);
    setAuto(true);
  };
  const goTo = (s: number) => {
    setAuto(false);
    setStage(Math.max(0, Math.min(max, s)));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea')) return;
      if (stage === 0) return;
      if (e.key === 'ArrowRight') goTo(stage + 1);
      if (e.key === 'ArrowLeft') goTo(stage - 1);
      if (e.key === 'Escape') goTo(0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="min-h-full" style={{ background: 'var(--paper)' }}>
      <header className="mx-auto flex max-w-[1440px] items-center justify-between px-5 pt-5 md:px-10 md:pt-6">
        <a href="#/" aria-label="FrantoS">
          <Wordmark />
        </a>
        <nav className="flex items-center gap-1 md:gap-3">
          <a href="#scenes" className="hidden rounded-full px-3 py-2 text-[14px] font-medium text-[var(--ink-2)] hover:text-[var(--ink)] md:inline">
            How it works
          </a>
          <button onClick={() => go('/app')} className="f2-btn f2-btn-ghost !min-h-[40px] !px-4 !text-[14px]">
            <span>
              Open demo<span className="hidden sm:inline"> workspace</span>
            </span>
          </button>
        </nav>
      </header>

      {/* HERO */}
      <section className="mx-auto grid max-w-[1440px] grid-cols-1 gap-x-12 gap-y-6 px-5 pb-14 pt-6 md:px-10 lg:min-h-[calc(100dvh-80px)] lg:grid-cols-12 lg:items-center lg:pb-10 lg:pt-2">
        <div className="order-2 lg:order-1 lg:col-span-5">
          <AnimatePresence mode="wait" initial={false}>
            {stage === 0 ? (
              <motion.div key="intro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, ease }}>
                <p className="f2-mono text-[var(--ink-2)]">Private workspace for designers, motion & 3D artists and small studios</p>
                <h1 className="f2-display mt-5 text-[clamp(2.9rem,5.6vw,5.6rem)]">
                  Every finished piece has a <em>reverse side</em>
                  <span style={{ color: 'var(--signal)' }}>.</span>
                </h1>
                <p className="mt-5 max-w-[30rem] text-[16.5px] leading-relaxed text-[var(--ink-2)]">
                  References, versions, the note that changed the light — FrantoS keeps the work and how it got there in one place, and shows only the finished side to your client.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <button onClick={() => go('/app')} className="f2-btn f2-btn-signal">
                    Open demo workspace <ArrowRight size={18} />
                  </button>
                  <button onClick={open} className="f2-btn f2-btn-ghost">
                    <RotateCcw size={16} className="-scale-x-100" /> Behind the work
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="credits" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, ease }}>
                <p className="f2-mono text-[var(--ink-2)]">FORM / 01 — behind the work</p>
                <ol className="mt-5 flex flex-col">
                  {STEPS.slice(1).map((s, i) => {
                    const n = i + 1;
                    const on = n === stage;
                    return (
                      <li key={s.k}>
                        <button onClick={() => goTo(n)} aria-current={on ? 'step' : undefined} className="group flex w-full gap-4 border-t border-[var(--rule)] py-3.5 text-left">
                          <span className="f2-mono w-6 pt-1.5 tabular-nums" style={{ color: on ? 'var(--signal)' : 'var(--ink-2)' }}>
                            {s.k}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`f2-display block leading-none transition-[font-size] duration-300 ${on ? 'text-[34px]' : 'text-[22px] text-[var(--ink-2)] group-hover:text-[var(--ink)]'}`}>{s.title}</span>
                            <AnimatePresence initial={false}>
                              {on && (
                                <motion.span className="block overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease }}>
                                  <span className="block pt-2 text-[15px] leading-relaxed text-[var(--ink-2)]">{s.text}</span>
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {stage === max ? (
                    <button onClick={() => go(PROJECT_LINK)} className="f2-btn f2-btn-signal">
                      Open this project <ArrowRight size={18} />
                    </button>
                  ) : (
                    <button onClick={() => goTo(stage + 1)} className="f2-btn f2-btn-signal">
                      Next layer <ArrowRight size={18} />
                    </button>
                  )}
                  <button onClick={() => goTo(0)} className="inline-flex h-12 items-center gap-2 rounded-full px-4 text-[14px] font-medium text-[var(--ink-2)] hover:text-[var(--ink)]">
                    <X size={15} /> Back to the poster
                  </button>
                </div>
                <p className="mt-4 text-[13px] text-[var(--ink-2)]">
                  or{' '}
                  <button onClick={() => go('/app')} className="f2-link font-medium text-[var(--ink)]">
                    open the demo workspace
                  </button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="order-1 lg:order-2 lg:col-span-7">
          <Stage stage={stage} onOpen={open} onGo={goTo} />
          {/* mobile step control: big, thumb-friendly */}
          {stage > 0 && (
            <div className="mt-4 flex items-center gap-2 lg:hidden">
              <button onClick={() => goTo(stage - 1)} aria-label="Previous layer" className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--rule)]">
                <ChevronLeft size={20} />
              </button>
              <div className="flex flex-1 gap-1.5" aria-hidden>
                {STEPS.slice(1).map((_, i) => (
                  <span key={i} className="h-[3px] flex-1 rounded-full" style={{ background: i + 1 <= stage ? 'var(--ink)' : 'var(--rule)' }} />
                ))}
              </div>
              {stage < max ? (
                <button onClick={() => goTo(stage + 1)} aria-label="Next layer" className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ink)] text-[var(--paper)]">
                  <ChevronRight size={20} />
                </button>
              ) : (
                <button onClick={() => go(PROJECT_LINK)} className="flex h-12 items-center gap-1.5 rounded-full bg-[var(--signal)] px-4 text-[14px] font-semibold text-[var(--signal-ink)]">
                  Open <ArrowRight size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <Scenes />
      <Closing />
    </div>
  );
}

/* ───────────────────────── the stage: a stack of layers that turn like pages ───────────────────────── */

function Stage({ stage, onOpen, onGo }: { stage: number; onOpen: () => void; onGo: (s: number) => void }) {
  const peel = useMotionValue(0); // 0–1 while the corner is pulled
  const dragging = useRef<{ x: number; w: number } | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  // the live object keeps rendering while the poster turns, then stops (hidden → no GPU work)
  const [liveOn, setLiveOn] = useState(stage === 0);
  useEffect(() => {
    if (stage === 0) setLiveOn(true);
    else {
      const t = setTimeout(() => setLiveOn(false), 1100);
      return () => clearTimeout(t);
    }
  }, [stage]);

  const layers = [
    { key: 'poster', node: <FormPoster live={liveOn} className="h-full w-full" /> },
    { key: 'clay', node: <ClayLayer /> },
    { key: 'refs', node: <RefsLayer /> },
    { key: 'review', node: <ReviewLayer active={stage === 3} /> },
    { key: 'project', node: <ProjectLayer active={stage === 4} /> },
  ];

  return (
    <div
      className="relative mx-auto w-full max-w-[min(100%,calc((100dvh-140px)*0.8))] lg:max-w-[min(100%,calc((100dvh-120px)*0.8))]"
      style={{ perspective: 2200, touchAction: 'pan-y' }}
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const t = touch.current;
        if (!t || stage === 0) return;
        const dx = e.changedTouches[0].clientX - t.x;
        const dy = e.changedTouches[0].clientY - t.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) onGo(stage + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="relative aspect-[4/5] w-full" style={{ transformStyle: 'preserve-3d' }}>
        {/* ground shadow gives the stack weight */}
        <div aria-hidden className="absolute -bottom-6 left-[6%] right-[6%] h-10 rounded-[50%] bg-black/25 blur-2xl" />
        {layers.map((l, i) => (
          <Leaf key={l.key} index={i} stage={stage} total={layers.length} peel={i === 0 ? peel : undefined}>
            {l.node}
          </Leaf>
        ))}

        {/* the lifted corner — pull it, tap it, or use the button */}
        {stage === 0 && (
          <motion.button
            aria-label="Behind the work: lift the poster"
            onClick={() => !dragging.current && onOpen()}
            onPointerDown={(e) => {
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              dragging.current = { x: e.clientX, w: (e.currentTarget.parentElement as HTMLElement).clientWidth };
            }}
            onPointerMove={(e) => {
              const d = dragging.current;
              if (!d) return;
              peel.set(Math.min(1, Math.max(0, (d.x - e.clientX) / (d.w * 0.7))));
            }}
            onPointerUp={() => {
              const v = peel.get();
              const moved = v > 0.02;
              dragging.current = null;
              if (v > 0.28) {
                animate(peel, 0, { duration: 0.01 });
                onOpen();
              } else animate(peel, 0, { type: 'spring', stiffness: 300, damping: 26 });
              if (!moved) onOpen();
            }}
            className="group absolute bottom-0 right-0 z-[60] h-[22%] w-[22%] cursor-grab touch-none active:cursor-grabbing"
            style={{ transform: 'translateZ(2px)' }}
          >
            <Corner peel={peel} />
          </motion.button>
        )}
      </div>
    </div>
  );
}

function Corner({ peel }: { peel: ReturnType<typeof useMotionValue<number>> }) {
  const size = useTransform(peel, [0, 1], [30, 62]);
  const s = useSpring(size, { stiffness: 400, damping: 30 });
  const clip = useTransform(s, (v) => `polygon(100% ${100 - v}%, 100% 100%, ${100 - v}% 100%)`);
  const back = useTransform(s, (v) => `polygon(${100 - v}% 100%, 100% ${100 - v}%, ${100 - v}% ${100 - v}%)`);
  return (
    <span className="absolute inset-0" aria-hidden>
      {/* hint of what's underneath */}
      <motion.span className="absolute inset-0 bg-[var(--graphite)] transition-[filter] duration-300" style={{ clipPath: clip }}>
        <img src={`${P}form-clay-sm.webp`} alt="" className="absolute bottom-0 right-0 h-[455%] w-[455%] max-w-none object-cover" style={{ objectPosition: '100% 100%' }} />
      </motion.span>
      {/* the folded-back paper */}
      <motion.span
        className="absolute inset-0 drop-shadow-[-6px_-6px_10px_rgba(0,0,0,0.25)] transition-transform duration-300 group-hover:scale-[1.06] group-focus-visible:scale-[1.06]"
        style={{ clipPath: back, background: `linear-gradient(135deg, ${POSTER_BG} 0%, #d6cdbd 55%, #c9bfae 100%)`, transformOrigin: '100% 100%' }}
      />
      <span className="f2-mono absolute bottom-[6%] right-[44%] whitespace-nowrap !text-[10px] text-[var(--ink-2)] opacity-0 transition-opacity duration-300 group-hover:opacity-100">pull ↖</span>
    </span>
  );
}

/** One layer of the stack. Turning a layer = rotate around its left edge, like lifting a print off a pile. */
function Leaf({ index, stage, total, peel, children }: { index: number; stage: number; total: number; peel?: ReturnType<typeof useMotionValue<number>>; children: React.ReactNode }) {
  const turned = index < stage;
  const current = index === stage;
  const depth = index - stage; // how far below the current layer
  const fallback = useMotionValue(0);
  const peelRot = useTransform(peel ?? fallback, [0, 1], [0, -38]);
  const shade = useTransform(peelRot, [0, -38], [0, 0.35]);
  return (
    <motion.div
      className="absolute inset-0 overflow-hidden rounded-[3px]"
      style={{
        zIndex: total - index,
        transformOrigin: '0% 50%',
        transformStyle: 'preserve-3d',
        rotateY: peel && !turned ? peelRot : undefined,
        boxShadow: current ? '0 50px 90px -40px rgba(21,19,15,0.65), 0 2px 0 rgba(0,0,0,0.04)' : '0 20px 40px -30px rgba(21,19,15,0.5)',
        pointerEvents: current ? 'auto' : 'none',
      }}
      initial={false}
      animate={
        turned
          ? { rotateY: -104, opacity: 0, x: '-4%', z: 4, transition: { rotateY: { duration: 1.35, ease: [0.5, 0, 0.2, 1] }, opacity: { duration: 0.35, delay: 1.0 }, x: { duration: 1.35 } } }
          : { rotateY: 0, z: -depth * 6, opacity: depth > 1 ? 0 : 1, x: 0, y: depth > 0 ? 10 : 0, scale: depth > 0 ? 0.985 : 1, transition: { duration: 0.9, ease } }
      }
      aria-hidden={!current}
    >
      {children}
      {/* light falls across the leaf as it turns */}
      {peel && <motion.div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-l from-black/40 to-transparent" style={{ opacity: shade }} />}
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 bg-black" initial={false} animate={{ opacity: depth > 0 ? 0.18 : 0 }} transition={{ duration: 0.8 }} />
    </motion.div>
  );
}

function LayerTag({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return <span className={`f2-mono absolute left-[4%] top-[3.5%] z-10 rounded px-2 py-1 !text-[10.5px] ${dark ? 'bg-black/55 text-white' : 'bg-white/70 text-[var(--ink)]'}`}>{children}</span>;
}

function ClayLayer() {
  return (
    <div className="relative h-full w-full" style={{ background: POSTER_BG }}>
      <img src={`${P}form-clay.webp`} srcSet={`${P}form-clay-sm.webp 640w, ${P}form-clay.webp 1600w`} sizes="50vw" alt="Clay render of the FORM / 01 object, no material" className="h-full w-full object-cover" />
      <LayerTag>Form study · clay · day 2</LayerTag>
    </div>
  );
}

const REFS = ['ref-sketch', 'ref-silk', 'ref-hotspot', 'ref-glaze', 'ref-window', 'ref-travertine'];
function RefsLayer() {
  const d = useMemo(() => demoProject(), []);
  return (
    <div className="relative h-full w-full p-[5%]" style={{ background: '#e3dccf' }}>
      <LayerTag>Moodboard · 6 references</LayerTag>
      <div className="mt-[9%] grid h-[86%] grid-cols-3 grid-rows-2 gap-[3%]">
        {REFS.map((id) => {
          const a = d.assets.find((x) => x.id === id)!;
          const key = id === 'ref-glaze' || id === 'ref-window';
          return (
            <figure key={id} className="relative flex min-h-0 flex-col">
              <div className="relative min-h-0 flex-1 overflow-hidden rounded-[2px] bg-white" style={{ outline: key ? '2px solid var(--signal)' : 'none', outlineOffset: 3 }}>
                <img src={a.thumb} alt={a.title} className="h-full w-full object-cover" />
              </div>
              <figcaption className="mt-[6%] flex items-center justify-between gap-1 text-[clamp(8px,0.8vw,11px)] font-medium">
                <span className="truncate">{a.title}</span>
                {key && <span className="shrink-0 rounded-full bg-[var(--signal)] px-1.5 text-[0.9em] font-bold text-[var(--signal-ink)]">→ v2</span>}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}

function ReviewLayer({ active }: { active: boolean }) {
  const split = useMotionValue(100);
  const [splitV, setSplitV] = useState(100);
  const [showFix, setShowFix] = useState(false);
  useEffect(() => split.on('change', (v) => setSplitV(v)), [split]);
  useEffect(() => {
    if (!active) {
      split.set(100);
      setShowFix(false);
      return;
    }
    // hold on the note, then let v2 slide in under the same camera
    const t = setTimeout(() => {
      animate(split, 46, { duration: 1.4, ease: [0.65, 0, 0.35, 1] });
      setTimeout(() => setShowFix(true), 1200);
    }, 1700);
    return () => clearTimeout(t);
  }, [active, split]);
  return (
    <div className="relative h-full w-full bg-[var(--graphite)]">
      <img src={`${P}form-v2.webp`} alt="v2: satin glaze, soft key" className="absolute inset-0 h-full w-full object-cover" />
      <img src={`${P}form-v1.webp`} alt="v1: lacquer under a hard spot" className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 ${100 - splitV}% 0 0)` }} />
      {splitV < 99 && <div className="absolute inset-y-0 w-px bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]" style={{ left: `${splitV}%` }} />}
      <LayerTag dark>Hero render · v1 {splitV < 99 ? '| v2' : ''}</LayerTag>
      {/* the pin sits on the clipped highlight, in the work's own coordinates */}
      <div className="absolute" style={{ left: '58.5%', top: '27%' }}>
        <motion.span className="absolute -left-6 -top-6 h-12 w-12 rounded-full border-2 border-[var(--signal)]" animate={active ? { scale: [0.6, 1.5], opacity: [1, 0] } : {}} transition={{ duration: 1.4, repeat: Infinity }} />
        <span className="absolute -left-3.5 -top-3.5 flex h-7 w-7 items-center justify-center rounded-full rounded-bl-[3px] text-[12px] font-bold shadow-lg" style={{ background: showFix ? '#f3efe7' : 'var(--signal)', color: 'var(--ink)' }}>
          {showFix ? '✓' : '1'}
        </span>
        <motion.div
          className="absolute right-[-30px] top-6 w-[min(250px,56vw)] rounded-[8px] sm:right-auto sm:left-5 sm:top-3 bg-[var(--paper)] p-3 text-[var(--ink)] shadow-[0_20px_40px_-16px_rgba(0,0,0,0.6)]"
          initial={false}
          animate={{ opacity: active ? 1 : 0, y: active ? 0 : 8 }}
          transition={{ delay: active ? 0.5 : 0, duration: 0.4, ease }}
        >
          <p className="f2-mono !text-[9.5px] text-[var(--ink-2)]">Mara K. · AD · on v1</p>
          <p className="mt-1 text-[clamp(11px,1.1vw,13.5px)] leading-snug">The highlight blows out on the upper twist — we lose the edge right where the form turns.</p>
          <AnimatePresence>
            {showFix && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 border-t border-[var(--rule)] pt-2 text-[clamp(11px,1.05vw,13px)] font-medium text-[#3c7a4a]">
                ✓ Resolved in v2 — satin glaze, one soft key
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      {splitV < 99 && (
        <>
          <span className="f2-mono absolute bottom-[3.5%] left-[4%] rounded bg-black/55 px-2 py-1 !text-[10px] text-white">A · v1 lacquer</span>
          <span className="f2-mono absolute bottom-[3.5%] right-[4%] rounded bg-black/55 px-2 py-1 !text-[10px] text-white">B · v2 satin</span>
        </>
      )}
    </div>
  );
}

/** The composition settles into a real FrantoS screen (miniature of Review). */
function ProjectLayer({ active }: { active: boolean }) {
  const d = useMemo(() => demoProject(), []);
  const v1 = d.assets.find((a) => a.id === 'render-v1')!;
  const v2 = d.assets.find((a) => a.id === 'render-v2')!;
  const c1 = d.comments.find((c) => c.id === 'c-highlight')!;
  const c2 = d.comments.find((c) => c.id === 'c-shadow')!;
  const [split, setSplit] = useState(46);
  return (
    <div className="flex h-full w-full flex-col bg-[var(--paper)] text-[var(--ink)]">
      <div className="flex items-center justify-between border-b border-[var(--rule)] px-[4%] py-[2.6%]">
        <span className="flex items-center gap-2">
          <span className="f2-display text-[clamp(13px,1.5vw,19px)]">FORM / 01</span>
          <span className="hidden text-[11px] text-[var(--ink-2)] sm:inline">· Saved just now</span>
        </span>
        <span className="rounded-full bg-[var(--signal)] px-2.5 py-1 text-[clamp(9px,0.9vw,11.5px)] font-semibold text-[var(--signal-ink)]">▶ Present</span>
      </div>
      <div className="flex gap-3 border-b border-[var(--rule)] px-[4%] text-[clamp(9.5px,0.95vw,12px)] font-semibold">
        {['Overview', 'Materials', 'Moodboard', 'Review', 'Stories'].map((t) => (
          <span key={t} className="relative py-[1.6%]" style={{ color: t === 'Review' ? 'var(--ink)' : 'var(--ink-2)' }}>
            {t}
            {t === 'Review' && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[var(--ink)]" />}
          </span>
        ))}
      </div>
      <div className="relative min-h-0 flex-[1.55] bg-[var(--graphite)] px-[3%] py-[3%]">
        <div className="relative h-full">
          {active && (
            <WorkCanvas
              a={v1}
              b={v2}
              split={split}
              onSplit={setSplit}
              pins={[
                { c: c1, n: 1, side: 'a' },
                { c: c2, n: 2, side: 'b' },
              ]}
              activeId="c-highlight"
              labelA="A · v1"
              labelB="B · v2 ✓"
            />
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-[4%] py-[3%]">
        <p className="text-[clamp(10px,1vw,12.5px)] font-semibold">
          Discussion <span className="font-medium text-[var(--ink-2)]">· 1 open</span>
        </p>
        <div className="mt-[2.5%] flex flex-col gap-[2.5%]">
          {[c1, c2].map((c, i) => (
            <div key={c.id} className="flex gap-2 rounded-[6px] border border-[var(--rule)] p-[2.2%]" style={{ borderColor: i === 0 ? 'var(--ink)' : 'var(--rule)' }}>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full rounded-bl-[3px] text-[10px] font-bold" style={{ background: c.resolved ? 'var(--paper-3)' : 'var(--signal)' }}>
                {c.resolved ? '✓' : i + 1}
              </span>
              <span className="min-w-0">
                <span className="f2-mono block !text-[9px] text-[var(--ink-2)]">
                  v{i === 0 ? 1 : 2} · {c.resolved ? 'resolved' : 'open'}
                </span>
                <span className="line-clamp-2 block text-[clamp(10px,1vw,12.5px)] leading-snug">{c.text}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── three short scenes ───────────────────────── */

function Scenes() {
  return (
    <div id="scenes">
      <Collect />
      <Refine />
      <PresentScene />
    </div>
  );
}

function SceneHead({ n, title, lead, dark }: { n: string; title: string; lead: string; dark?: boolean }) {
  return (
    <div className="max-w-[34rem]">
      <p className="f2-mono" style={{ color: dark ? 'var(--fog)' : 'var(--ink-2)' }}>
        {n}
      </p>
      <h2 className="f2-display mt-3 text-[clamp(2.4rem,4.6vw,4.2rem)]">{title}</h2>
      <p className="mt-4 text-[16px] leading-relaxed" style={{ color: dark ? 'var(--fog)' : 'var(--ink-2)' }}>
        {lead}
      </p>
    </div>
  );
}

function Collect() {
  const d = useMemo(() => demoProject(), []);
  const refs = d.assets.filter((a) => a.isReference && a.influences);
  const [sel, setSel] = useState('ref-glaze');
  const ref = refs.find((r) => r.id === sel)!;
  const target = d.assets.find((a) => a.id === ref.influences!.assetId)!;
  return (
    <section className="border-t border-[var(--rule)]">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 md:px-10 md:py-24 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SceneHead n="Collect" title="Keep the reference next to what it changed." lead="Choose a reference. FrantoS remembers which decision it shaped, so the why never gets lost between versions." />
          <div role="radiogroup" aria-label="References" className="mt-8 grid grid-cols-3 gap-3">
            {refs.map((r) => (
              <button key={r.id} role="radio" aria-checked={r.id === sel} onClick={() => setSel(r.id)} className="group text-left">
                <span className="relative block aspect-[4/5] overflow-hidden rounded-[3px] bg-[var(--graphite)]" style={{ outline: r.id === sel ? '2px solid var(--signal)' : 'none', outlineOffset: 3 }}>
                  <img src={r.thumb} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
                </span>
                <span className="mt-1.5 block truncate text-[12px] font-medium">{r.title}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-8">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[8px] bg-[var(--paper-2)] p-4 md:gap-6 md:p-8">
            <Card key={`r-${ref.id}`} src={ref.thumb!} label="Reference" title={ref.title} sub={ref.source} />
            <div className="flex flex-col items-center gap-2 text-center">
              <ArrowRight size={22} />
            </div>
            <Card key={`t-${target.id}`} src={target.thumb!} label="Decision" title={target.title} />
            <AnimatePresence mode="wait">
              <motion.p key={ref.id} className="col-span-3 border-t border-[var(--rule)] pt-4 text-[clamp(1.1rem,1.6vw,1.4rem)] leading-snug" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease }}>
                <span className="f2-mono mr-2 align-middle text-[var(--ink-2)]">Note ·</span>
                {ref.influences!.text}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function Card({ src, label, title, sub }: { src: string; label: string; title: string; sub?: string }) {
  return (
    <motion.figure initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease }}>
      <div className="aspect-[4/5] overflow-hidden rounded-[3px] bg-[var(--graphite)] shadow-[0_24px_40px_-26px_rgba(21,19,15,0.6)]">
        <img src={src} alt={title} className="h-full w-full object-cover" />
      </div>
      <figcaption className="mt-2">
        <span className="f2-mono block text-[var(--ink-2)]">{label}</span>
        <span className="block text-[14px] font-medium">{title}</span>
        {sub && <span className="block text-[12px] text-[var(--ink-2)]">{sub}</span>}
      </figcaption>
    </motion.figure>
  );
}

function Refine() {
  const d = useMemo(() => demoProject(), []);
  const v1 = d.assets.find((a) => a.id === 'render-v1')!;
  const v2 = d.assets.find((a) => a.id === 'render-v2')!;
  const c1 = d.comments.find((c) => c.id === 'c-highlight')!;
  const [split, setSplit] = useState(50);
  return (
    <section className="bg-[var(--graphite)] text-[#f3efe7]">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 md:px-10 md:py-24 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-4">
          <SceneHead dark n="Refine" title="The camera stays. Only the work changes." lead="Drag the divider between v1 and v2. Same object, same framing — you see the light and the glaze, nothing else. The note sits on the exact detail it was about." />
          <div className="mt-6 flex flex-wrap gap-2 text-[13px]">
            {[
              ['0', 'Only v2'],
              ['50', 'Half'],
              ['100', 'Only v1'],
            ].map(([v, l]) => (
              <button key={v} onClick={() => setSplit(+v)} className="rounded-full border border-[var(--line)] px-3 py-1.5 hover:bg-white/5">
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-8">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[640px] touch-pan-y">
            <WorkCanvas a={v1} b={v2} split={split} onSplit={setSplit} pins={[{ c: { ...c1, resolved: false }, n: 1, side: 'a' }]} labelA="A · v1 · lacquer, hard key" labelB="B · v2 · satin, soft key" />
          </div>
        </div>
      </div>
    </section>
  );
}

function PresentScene() {
  const [clean, setClean] = useState(false);
  return (
    <section className="border-b border-[var(--rule)]">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 md:px-10 md:py-24 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-4">
          <SceneHead n="Present" title="Your client sees the front. You keep the back." lead="Switch the working view to a clean presentation. The panels step aside; only the approved work and its caption remain." />
          <div role="radiogroup" aria-label="View" className="mt-6 inline-flex rounded-full border border-[var(--rule)] p-1">
            {[
              [false, 'Workspace', <LayoutPanelLeft key="w" size={14} />],
              [true, 'Presentation', <Eye key="p" size={14} />],
            ].map(([v, l, icon]) => (
              <button key={String(v)} role="radio" aria-checked={clean === v} onClick={() => setClean(v as boolean)} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-medium" style={{ background: clean === v ? 'var(--ink)' : 'transparent', color: clean === v ? 'var(--paper)' : 'var(--ink-2)' }}>
                {icon as React.ReactNode} {l as string}
              </button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-8">
          <div className="relative mx-auto aspect-[16/11] w-full max-w-[860px] overflow-hidden rounded-[8px] shadow-[0_40px_80px_-40px_rgba(21,19,15,0.6)]" style={{ background: clean ? '#0e0e10' : 'var(--paper)', transition: 'background 0.5s' }}>
            {/* chrome */}
            <motion.div className="absolute inset-x-0 top-0 flex h-[9%] items-center justify-between border-b border-[var(--rule)] bg-[var(--paper)] px-[3%]" animate={{ y: clean ? '-110%' : 0 }} transition={{ duration: 0.5, ease }}>
              <span className="f2-display text-[clamp(12px,1.5vw,18px)]">FORM / 01</span>
              <span className="text-[clamp(9px,0.9vw,11px)] text-[var(--ink-2)]">Overview · Materials · Moodboard · Review · Stories</span>
            </motion.div>
            <motion.div className="absolute bottom-0 left-0 top-[9%] w-[22%] border-r border-[var(--rule)] bg-[var(--paper)] p-[2%]" animate={{ x: clean ? '-105%' : 0 }} transition={{ duration: 0.5, ease }}>
              {['ref-glaze', 'ref-window', 'clay'].map((id) => (
                <div key={id} className="mb-[8%] aspect-[4/5] overflow-hidden rounded-[2px] bg-[var(--graphite)]">
                  <img src={`${P}${id === 'clay' ? 'form-clay' : id}-sm.webp`} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </motion.div>
            <motion.div className="absolute bottom-0 right-0 top-[9%] w-[26%] border-l border-[var(--rule)] bg-[var(--paper)] p-[2.2%]" animate={{ x: clean ? '105%' : 0 }} transition={{ duration: 0.5, ease }}>
              <p className="text-[clamp(9px,0.95vw,12px)] font-semibold">Discussion · 1 open</p>
              {['Shadow side could go one stop deeper here.', 'Tighten F–O on the poster.'].map((t) => (
                <div key={t} className="mt-[8%] rounded-[5px] border border-[var(--rule)] p-[6%] text-[clamp(8.5px,0.9vw,11.5px)] leading-snug">
                  <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[var(--signal)]" /> {t}
                </div>
              ))}
            </motion.div>
            {/* the work */}
            <motion.div className="absolute flex items-center justify-center" initial={false} animate={clean ? { left: '0%', right: '0%', top: '0%', bottom: '12%' } : { left: '22%', right: '26%', top: '9%', bottom: '0%' }} transition={{ duration: 0.6, ease }} style={{ background: clean ? 'transparent' : 'var(--graphite)' }}>
              <img src={`${P}form-poster.webp`} alt="FORM / 01 poster" className="h-[88%] w-auto rounded-[2px] object-contain shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)]" />
            </motion.div>
            <motion.div className="absolute inset-x-0 bottom-0 flex h-[12%] items-center justify-between px-[4%] text-[#f3efe7]" initial={false} animate={{ opacity: clean ? 1 : 0, y: clean ? 0 : 12 }} transition={{ duration: 0.4, delay: clean ? 0.3 : 0 }}>
              <span className="f2-display text-[clamp(14px,2vw,26px)]">FORM / 01 — launch poster</span>
              <span className="f2-mono text-[var(--fog)]">01 / 04</span>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section>
      <div className="mx-auto max-w-[1440px] px-5 py-20 md:px-10 md:py-28">
        <h2 className="f2-display max-w-[15ch] text-[clamp(2.6rem,6.4vw,6rem)]">Open the project behind the poster.</h2>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button onClick={() => go('/app')} className="f2-btn f2-btn-signal">
            Open demo workspace <ArrowRight size={18} />
          </button>
          <button onClick={() => go(PROJECT_LINK)} className="f2-btn f2-btn-ghost">
            Go straight to the review
          </button>
        </div>
        <p className="mt-5 text-[14px] text-[var(--ink-2)]">No sign-up. Your projects and files stay in this browser.</p>
      </div>
      <footer className="border-t border-[var(--rule)]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-6 text-[var(--ink-2)] md:flex-row md:items-center md:justify-between md:px-10">
          <Wordmark small />
          <p className="text-[12.5px]">FORM / 01 is a demo project: a procedural 3D object rendered for FrantoS; references are AI-generated.</p>
          <span className="flex gap-4 text-[13px]">
            <a href="#/after-hours" className="f2-link">
              After Hours (photo story)
            </a>
            <a href="#/overview" className="f2-link inline-flex items-center gap-1">
              Atelier v1 <ArrowUpRight size={13} />
            </a>
          </span>
        </div>
      </footer>
    </section>
  );
}
