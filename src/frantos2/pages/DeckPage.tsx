import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Expand, LayoutTemplate, MonitorUp, Printer, StickyNote, Timer, X } from 'lucide-react';
import '../glass/glass.css';
import { useI18n } from '../i18n';
import { go } from '../route';
import { ensureLoaded, useProject, useWs } from '../ws/store';
import type { Board, BrandFont, Project } from '../ws/types';
import { LayerView } from '../studio/CanvasMode';
import { lgEase, Pane } from '../glass/kit';

/**
 * Boards from Canvas as a presentation. ← → or Space to move, F for full screen, P for presenter view
 * (notes, next slide, timer). The presenter window drives an audience window opened from it.
 */
export function DeckPage({ id, slide, presenter }: { id: string; slide: number; presenter: boolean }) {
  const { t, dir } = useI18n();
  const { project: p, loading } = useProject(id);
  useEffect(() => void ensureLoaded(), []);
  if (!p && loading) return <div className="fixed inset-0 bg-[#0b0b0d]" />;
  if (!p) return null;
  const boards = p.boards ?? [];
  if (!boards.length)
    return (
      <div className="lg fixed inset-0 flex items-center justify-center bg-[#0b0b0d] p-6" dir={dir}>
        <Pane className="max-w-[440px] rounded-[28px] p-7 text-center">
          <LayoutTemplate className="mx-auto" />
          <p className="mt-3 text-[19px] font-bold">{t('No boards to present yet')}</p>
          <p className="mt-2 text-[14px] text-white/75">{t('Compose boards in the studio’s Canvas mode; each board becomes a slide.')}</p>
          <button type="button" onClick={() => go(`/s/${p.id}?m=canvas`)} className="lg-btn lg-btn-primary mt-5">
            {t('Open Canvas')}
          </button>
        </Pane>
      </div>
    );
  return <Deck p={p} boards={boards} start={Math.min(slide, boards.length - 1)} presenter={presenter} />;
}

function Slide({ p, b, brandFont, maxW, maxH }: { p: Project; b: Board; brandFont?: BrandFont; maxW: number; maxH: number }) {
  const k = Math.min(maxW / b.w, maxH / b.h);
  return (
    <div className="relative overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,.55)]" style={{ width: b.w * k, height: b.h * k }} dir="ltr">
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: b.w, height: b.h, background: b.bg, transform: `scale(${k})` }}>
        {b.layers.map((l) => (
          <LayerView key={l.id} p={p} l={l} rtl={false} brandFont={brandFont} selected={false} scale={k} />
        ))}
      </div>
    </div>
  );
}

function useSize() {
  const [s, setS] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const f = () => setS({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return s;
}

function Deck({ p, boards, start, presenter }: { p: Project; boards: Board[]; start: number; presenter: boolean }) {
  const { t, dir } = useI18n();
  const { state } = useWs();
  const brandFont = state.brand?.font;
  const reduce = useReducedMotion();
  const [i, setI] = useState(start);
  const [chrome, setChrome] = useState(true);
  const [t0] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const size = useSize();
  const chan = useMemo(() => (typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(`frantos-deck-${p.id}`) : null), [p.id]);

  const to = (n: number, from: 'me' | 'peer' = 'me') => {
    const next = Math.max(0, Math.min(boards.length - 1, n));
    setI(next);
    go(`/p/${p.id}/deck/${next}${presenter ? '?presenter=1' : ''}`, { replace: true });
    if (from === 'me') chan?.postMessage({ slide: next });
  };
  useEffect(() => {
    if (!chan) return;
    chan.onmessage = (e) => typeof e.data?.slide === 'number' && to(e.data.slide, 'peer');
    return () => chan.close();
  }, [chan]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!presenter) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [presenter]);
  // the cursor and controls fade away while you present
  const idle = useRef<number | undefined>(undefined);
  const wake = () => {
    setChrome(true);
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => setChrome(false), 2200);
  };
  useEffect(() => {
    wake();
    const k = (e: KeyboardEvent) => {
      const fwd = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
      const back = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
      if (e.key === fwd || e.key === ' ' || e.key === 'PageDown') (e.preventDefault(), to(i + 1));
      else if (e.key === back || e.key === 'PageUp') (e.preventDefault(), to(i - 1));
      else if (e.key === 'Home') to(0);
      else if (e.key === 'End') to(boards.length - 1);
      else if (e.key.toLowerCase() === 'f') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
      else if (e.key.toLowerCase() === 'p') go(`/p/${p.id}/deck/${i}${presenter ? '' : '?presenter=1'}`, { replace: true });
      else if (e.key === 'Escape' && !document.fullscreenElement) go(`/s/${p.id}?m=canvas&b=${boards[i].id}`);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }); // reads the current slide

  const b = boards[i];
  const next = boards[i + 1];
  const mins = Math.floor((now - t0) / 60000);
  const secs = Math.floor(((now - t0) / 1000) % 60);
  const audience = () => window.open(`${window.location.origin}/#/p/${p.id}/deck/${i}`, 'frantos-audience', 'popup');

  const swap = reduce ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } : { initial: { opacity: 0, scale: 0.985, filter: 'blur(6px)' }, animate: { opacity: 1, scale: 1, filter: 'blur(0px)' }, exit: { opacity: 0, scale: 1.01, filter: 'blur(4px)' } };

  return (
    <div className={`lg fixed inset-0 overflow-hidden bg-[#0b0b0d] ${chrome ? '' : 'cursor-none'}`} dir={dir} onMouseMove={wake}>
      {presenter ? (
        <div className="grid h-full grid-cols-1 gap-4 p-4 md:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-h-0 items-center justify-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={b.id} {...swap} transition={{ duration: 0.45, ease: lgEase }}>
                <Slide p={p} b={b} brandFont={brandFont} maxW={size.w - (size.w >= 768 ? 400 : 40)} maxH={size.h - 120} />
              </motion.div>
            </AnimatePresence>
          </div>
          <aside className="flex min-h-0 flex-col gap-3">
            <Pane className="flex items-center justify-between rounded-[20px] p-3">
              <span className="flex items-center gap-2 text-[22px] font-extrabold tabular-nums">
                <Timer size={18} /> {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </span>
              <span className="text-[14px] font-bold tabular-nums text-white/75">
                {i + 1} / {boards.length}
              </span>
            </Pane>
            <Pane className="rounded-[20px] p-3">
              <p className="lg-label mb-2">{t('Next')}</p>
              {next ? <Slide p={p} b={next} brandFont={brandFont} maxW={310} maxH={180} /> : <p className="text-[14px] text-white/65">{t('That was the last slide.')}</p>}
            </Pane>
            <Pane className="min-h-0 flex-1 overflow-y-auto rounded-[20px] p-4 lg-scroll">
              <p className="lg-label mb-2 flex items-center gap-1.5">
                <StickyNote size={13} /> {t('Speaker notes')}
              </p>
              <p dir="auto" className="whitespace-pre-wrap text-[17px] leading-[1.5]">
                {b.notes || <span className="text-white/50">{t('No notes for this slide. Add them in Canvas, in the board settings.')}</span>}
              </p>
            </Pane>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={audience} className="lg-btn lg-btn-ghost text-[13px]">
                <MonitorUp size={15} /> {t('Audience window')}
              </button>
              <button type="button" onClick={() => go(`/p/${p.id}/deck/${i}`, { replace: true })} className="lg-btn lg-btn-ghost text-[13px]">
                <Expand size={15} /> {t('Slides only')}
              </button>
            </div>
          </aside>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center" onClick={(e) => (e.clientX > window.innerWidth / 2) !== (dir === 'rtl') ? to(i + 1) : to(i - 1)}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={b.id} {...swap} transition={{ duration: 0.5, ease: lgEase }}>
              <Slide p={p} b={b} brandFont={brandFont} maxW={size.w - 48} maxH={size.h - 48} />
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* controls */}
      <motion.div animate={{ opacity: chrome || presenter ? 1 : 0 }} transition={{ duration: 0.3 }} className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center print:hidden">
        <Pane className="pointer-events-auto flex items-center gap-1 rounded-full p-1">
          <button type="button" onClick={() => go(`/s/${p.id}?m=canvas&b=${b.id}`)} className="lg-btn lg-btn-plain lg-icon" aria-label={t('Close')} title={`${t('Close')} (Esc)`}>
            <X size={17} />
          </button>
          <button type="button" onClick={() => to(i - 1)} disabled={i === 0} className="lg-btn lg-btn-plain lg-icon disabled:opacity-30" aria-label={t('Previous slide')}>
            <ArrowLeft size={17} className="rtl:-scale-x-100" />
          </button>
          <span className="px-2 text-[13px] font-bold tabular-nums">
            {i + 1} / {boards.length}
          </span>
          <button type="button" onClick={() => to(i + 1)} disabled={i === boards.length - 1} className="lg-btn lg-btn-plain lg-icon disabled:opacity-30" aria-label={t('Next slide')}>
            <ArrowRight size={17} className="rtl:-scale-x-100" />
          </button>
          {!presenter && (
            <button type="button" onClick={() => go(`/p/${p.id}/deck/${i}?presenter=1`, { replace: true })} className="lg-btn lg-btn-plain lg-icon" aria-label={t('Presenter view')} title={`${t('Presenter view')} (P)`}>
              <StickyNote size={16} />
            </button>
          )}
          <button type="button" onClick={() => document.documentElement.requestFullscreen?.()} className="lg-btn lg-btn-plain lg-icon" aria-label={t('Full screen')} title={`${t('Full screen')} (F)`}>
            <Expand size={16} />
          </button>
          <button type="button" onClick={() => window.print()} className="lg-btn lg-btn-plain lg-icon" aria-label={t('Save as PDF')} title={t('Save as PDF')}>
            <Printer size={16} />
          </button>
        </Pane>
      </motion.div>

      {/* print: every slide on its own page */}
      <div className="deck-print hidden" aria-hidden>
        {boards.map((x) => (
          <div key={x.id} className="deck-page">
            <Slide p={p} b={x} brandFont={brandFont} maxW={1100} maxH={760} />
          </div>
        ))}
      </div>
    </div>
  );
}
