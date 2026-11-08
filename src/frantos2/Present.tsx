import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, PanInfo } from 'framer-motion';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Pencil, RotateCcw, X } from 'lucide-react';
import { FRAME_BY_ID, STORY_META, frameSrc } from './data';
import { useDemo } from './store';
import { go, leave } from './route';
import { useCopy } from './copy';
import { FrameImg, FrameNo } from './ui';

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Full-screen story. Slide 0 is the cover (shares layoutId "cover" with the hero
 * and the editor's cover tile), slides 1…n are frames, n+1 is the end card.
 * mode "viewer" = opened from the landing; "editor" = launched from the studio.
 */
export function Present({ mode, slide }: { mode: 'viewer' | 'editor'; slide: number }) {
  const { c, lang } = useCopy();
  const { state } = useDemo();
  const n = state.story.length;
  const last = n + 1;
  const i = Math.min(Math.max(slide, 0), last);
  const [dir, setDir] = useState(1);
  const base = mode === 'viewer' ? '/story' : '/studio/present';
  const exitTo = mode === 'viewer' ? '/' : '/studio';

  const to = useCallback(
    (j: number) => {
      const k = Math.min(Math.max(j, 0), last);
      if (k === i) return;
      setDir(k > i ? 1 : -1);
      go(`${base}/${k}`, { replace: true });
    },
    [i, last, base]
  );
  const exit = useCallback(() => leave(exitTo), [exitTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !(e.target as HTMLElement).closest('button'))) {
        e.preventDefault();
        to(i + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        to(i - 1);
      } else if (e.key === 'Escape') {
        exit();
      } else if (e.key === 'Home') to(0);
      else if (e.key === 'End') to(last);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [i, to, exit, last]);

  // keep the slide index in the URL honest (e.g. after frames were removed)
  useEffect(() => {
    if (slide !== i) go(`${base}/${i}`, { replace: true });
  }, [slide, i, base]);

  // preload neighbours
  useEffect(() => {
    [i, i + 1].forEach((k) => {
      const id = k === 0 ? state.cover : state.story[k - 1];
      if (id) new Image().src = frameSrc(id);
    });
  }, [i, state.cover, state.story]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) to(i + 1);
    else if (info.offset.x > 60 || info.velocity.x > 400) to(i - 1);
  };

  const frameId = i >= 1 && i <= n ? state.story[i - 1] : null;
  const f = frameId ? FRAME_BY_ID[frameId] : null;

  return (
    <motion.div
      className="fixed inset-0 overflow-hidden bg-[#0e0e10] text-[#f3efe7]"
      initial={{ backgroundColor: 'rgba(14,14,16,0)' }}
      animate={{ backgroundColor: 'rgba(14,14,16,1)' }}
      exit={{ backgroundColor: 'rgba(14,14,16,0)', transition: { duration: 0.35 } }}
      transition={{ duration: 0.35 }}
      role="region"
      aria-roledescription="presentation"
      aria-label={STORY_META.title}
    >
      {/* Slides */}
      <motion.div className="absolute inset-0 touch-pan-y" drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.18} onDragEnd={onDragEnd}>
        {i === 0 && renderTitle()}
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          {f && frameId && (
            <motion.figure
              key={frameId}
              custom={dir}
              className="absolute inset-0 flex flex-col items-center justify-center px-4 pb-[120px] pt-[76px] md:px-16 md:pb-[132px] md:pt-[88px]"
              initial={{ opacity: 0, x: dir * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -60 }}
              transition={{ duration: 0.45, ease }}
            >
              <img
                src={frameSrc(frameId)}
                alt={`${f.title[lang]} — ${f.caption[lang]}`}
                draggable={false}
                className="max-h-full max-w-full select-none rounded-[2px] object-contain shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]"
              />
              <figcaption className="absolute inset-x-0 bottom-0 px-5 pb-[max(22px,env(safe-area-inset-bottom))] md:px-10 md:pb-9">
                <div className="mx-auto flex max-w-[1200px] flex-col gap-1 md:flex-row md:items-end md:justify-between md:gap-8">
                  <div>
                    <div className="flex gap-3 text-[var(--fog)]">
                      <FrameNo n={f.n} />
                      <span className="f2-mono">{f.time}</span>
                      <span className="f2-mono">{f.place[lang]}</span>
                    </div>
                    <p className="f2-display mt-1 text-[30px] leading-none md:text-[40px]">{f.title[lang]}</p>
                  </div>
                  <p className="max-w-[28rem] text-[14px] text-[var(--fog)] md:text-right md:text-[15px]">{f.caption[lang]}</p>
                </div>
              </figcaption>
            </motion.figure>
          )}
        </AnimatePresence>
        {i === last && <EndSlide mode={mode} onReplay={() => to(0)} onExit={exit} />}
      </motion.div>

      {/* Tap zones (mobile + desktop), visible arrows on desktop */}
      {i > 0 && (
        <button onClick={() => to(i - 1)} aria-label={c.prev} className="group absolute bottom-[110px] left-0 top-[70px] z-10 w-[28%] md:w-[18%]">
          <span className="absolute left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/30 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 md:flex">
            <ChevronLeft size={22} />
          </span>
        </button>
      )}
      {i < last && (
        <button onClick={() => to(i + 1)} aria-label={c.next} className="group absolute bottom-[110px] right-0 top-[70px] z-10 w-[40%] md:w-[18%]">
          <span className="absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/30 backdrop-blur transition-opacity md:flex md:opacity-60 md:group-hover:opacity-100">
            <ChevronRight size={22} />
          </span>
        </button>
      )}

      {/* Top bar: progress, counter, exit */}
      <div className="absolute inset-x-0 top-0 z-20 px-4 pt-[max(14px,env(safe-area-inset-top))] md:px-8 md:pt-6">
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: n + 1 }).map((_, k) => (
            <span key={k} className="h-[2px] flex-1 overflow-hidden rounded-full bg-white/20">
              <motion.span
                className="block h-full origin-left"
                style={{ background: k === i ? 'var(--signal)' : '#f3efe7' }}
                initial={false}
                animate={{ scaleX: k <= i ? 1 : 0 }}
                transition={{ duration: 0.35, ease }}
              />
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="f2-mono tabular-nums text-[#f3efe7]" aria-live="polite">
            {i === 0 ? c.cover : i === last ? c.end : `${String(i).padStart(2, '0')} / ${String(n).padStart(2, '0')}`}
            <span className="ml-3 hidden text-[var(--fog)] sm:inline">{STORY_META.title}</span>
          </p>
          <button
            onClick={exit}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3.5 text-[13.5px] font-medium backdrop-blur hover:bg-black/55"
          >
            {mode === 'editor' ? <ArrowLeft size={15} /> : <X size={15} />}
            {mode === 'editor' ? c.exitEditor : c.exitViewer}
          </button>
        </div>
      </div>
    </motion.div>
  );

  function renderTitle() {
    const cover = FRAME_BY_ID[state.cover];
    return (
      <div className="absolute inset-0">
        <motion.div layoutId="cover" className="absolute inset-0 overflow-hidden" style={{ borderRadius: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 32 }}>
          <FrameImg id={state.cover} sizes="100vw" eager />
        </motion.div>
        <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,10,12,.55) 0%, rgba(10,10,12,0) 30%, rgba(10,10,12,0) 45%, rgba(10,10,12,.85) 100%)' }} />
        <motion.div
          className="absolute inset-x-0 bottom-0 px-5 pb-[max(28px,env(safe-area-inset-bottom))] md:px-12 md:pb-14"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease, delay: 0.25 }}
        >
          <p className="f2-mono text-[#f3efe7]/80">
            {c.frames(n)} · {STORY_META.year} · <FrameNo n={cover.n} /> {cover.title[lang]}
          </p>
          <h1 className="f2-display mt-3 text-[clamp(3.2rem,11vw,10rem)] leading-[0.88]">
            After Hours
            <span className="block">
              <span style={{ color: 'var(--signal)' }}>/ </span>
              <em>Tel Aviv</em>
            </span>
          </h1>
          <p className="mt-4 max-w-[30rem] text-[15px] text-[#f3efe7]/80">{c.storyDek}</p>
          <p className="f2-mono mt-6 flex items-center gap-2 text-[#f3efe7]/70">
            {c.swipe} <ArrowRight size={13} />
          </p>
        </motion.div>
      </div>
    );
  }
}

function EndSlide({ mode, onReplay, onExit }: { mode: 'viewer' | 'editor'; onReplay: () => void; onExit: () => void }) {
  const { c } = useCopy();
  const { state } = useDemo();
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <p className="f2-mono text-[var(--fog)]">{c.end}</p>
      <h2 className="f2-display mt-4 text-[clamp(2.6rem,7vw,5.5rem)]">
        After Hours <span style={{ color: 'var(--signal)' }}>/</span> <em>Tel Aviv</em>
      </h2>
      <ol className="mt-8 flex max-w-full gap-1.5 overflow-hidden">
        {state.story.map((id) => (
          <li key={id} className="h-[64px] w-[52px] shrink-0 overflow-hidden rounded-[2px] md:h-[86px] md:w-[70px]">
            <FrameImg id={id} sizes="80px" />
          </li>
        ))}
      </ol>
      <div className="relative z-20 mt-10 flex flex-wrap items-center justify-center gap-3">
        {mode === 'viewer' ? (
          <button onClick={() => go('/studio')} className="f2-btn f2-btn-signal">
            <Pencil size={15} /> {c.editStory}
          </button>
        ) : (
          <button onClick={onExit} className="f2-btn f2-btn-signal">
            <ArrowLeft size={15} /> {c.exitEditor}
          </button>
        )}
        <button onClick={onReplay} className="f2-btn f2-btn-ghost-dark">
          <RotateCcw size={15} /> {c.replay}
        </button>
      </div>
    </motion.div>
  );
}
