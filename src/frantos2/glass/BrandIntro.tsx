import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useI18n } from '../i18n';
import { useTheme } from './theme';

/**
 * The FrantoS entrance: the blue mark grows from the centre the way it does after signing in,
 * then the curtain dissolves into the page. The full version greets every visit; a short one
 * marks the step into the studio, the 3D showroom and case pages. A tap or a key skips it.
 */

type Kind = 'studio' | 'case' | null;
const kindOf = (name: string): Kind => (name === 'editor' || name === 'showroom' ? 'studio' : name === 'case' || name === 'pcase' ? 'case' : null);
/** pages that are not ours to brand (a client's published site, its preview) or that animate on their own */
const QUIET = new Set(['web', 'site', 'login', 'legacy']);

const ease = [0.22, 1, 0.36, 1] as const;

function automated() {
  try {
    return navigator.webdriver && localStorage.getItem('frantos-intro-force') !== '1';
  } catch {
    return false;
  }
}

export function BrandIntro({ name }: { name: string }) {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const light = useTheme().theme === 'light';
  const [shot, setShot] = useState<{ k: number; full: boolean } | null>(() => (QUIET.has(name) || automated() || reduce ? null : { k: 1, full: true }));
  const prev = useRef(name);
  const last = useRef(0);

  useEffect(() => {
    const from = prev.current;
    prev.current = name;
    if (from === name || QUIET.has(name) || reduce || automated()) return;
    const into = kindOf(name);
    if (!into || kindOf(from) === into) return;
    if (Date.now() - last.current < 4000) return; // going back and forth does not replay it every time
    setShot({ k: Date.now(), full: false });
  }, [name, reduce]);

  useEffect(() => {
    if (!shot) return;
    last.current = Date.now();
    const id = window.setTimeout(() => setShot(null), shot.full ? 1650 : 820);
    const skip = () => setShot(null);
    window.addEventListener('keydown', skip, { once: true });
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('keydown', skip);
    };
  }, [shot]);

  return (
    <AnimatePresence>
      {shot && (
        <motion.div
          key={shot.k}
          style={{ background: light ? '#f3f1ec' : '#0b0d12', color: light ? '#14171c' : '#f4f1ec' }}
          className="fixed inset-0 z-[300] flex cursor-pointer items-center justify-center overflow-hidden"
          onPointerDown={() => setShot(null)}
          role="presentation"
          aria-hidden
          initial={{ opacity: shot.full ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(6px)' }}
          transition={{ duration: shot.full ? 0.5 : 0.18, ease }}
        >
          {/* the glow the mark rises out of */}
          <motion.span
            style={{ background: `radial-gradient(closest-side, rgba(40,70,255,${light ? 0.16 : 0.28}), rgba(40,70,255,${light ? 0.05 : 0.08}) 45%, transparent 70%)` }}
            className="pointer-events-none absolute h-[120vmax] w-[120vmax] shrink-0 rounded-full"
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: shot.full ? 1.2 : 0.6, ease }}
          />
          {/* the orbit rushing past, as on the sign-in screen */}
          <motion.span
            className="pointer-events-none absolute aspect-square w-[min(78vmin,560px)] rounded-full border border-[rgba(90,120,255,0.35)]"
            initial={{ scale: 0.3, opacity: 0, rotate: -30 }}
            animate={{ scale: [0.3, 1.25], opacity: [0, 0.9, 0], rotate: 0 }}
            transition={{ duration: shot.full ? 1.3 : 0.75, ease }}
          />
          <div className="relative flex flex-col items-center">
            <motion.img
              src="/brand/mark-gradient.webp"
              alt=""
              draggable={false}
              className="h-[clamp(84px,18vmin,132px)] w-auto select-none"
              style={{ filter: 'drop-shadow(0 18px 48px rgba(40,80,255,0.55))' }}
              initial={{ scale: 0.4, rotate: -40, opacity: 0 }}
              animate={{ scale: [0.4, 1.1, 1], rotate: 0, opacity: 1 }}
              exit={{ scale: 1.25, opacity: 0 }}
              transition={{ duration: shot.full ? 0.85 : 0.55, ease }}
            />
            {shot.full && (
              <motion.div className="mt-6 flex flex-col items-center gap-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.6, ease }}>
                <span className="text-[clamp(22px,4.4vmin,30px)] font-extrabold tracking-[-0.03em]">FrantoS</span>
                <span className="text-[10.5px] font-bold uppercase tracking-[0.32em]" style={{ opacity: 0.6 }}>{t('Private Creative Workspace')}</span>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
