import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LANGS, useI18n } from '../i18n';

export const lgEase = [0.22, 1, 0.36, 1] as const;

/** The FrantoS wordmark: a word and a small glass bead. */
export function Mark({ onClick, size = 18 }: { onClick?: () => void; size?: number }) {
  const inner = (
    <span className="inline-flex items-center gap-2 font-extrabold tracking-[-0.03em]" style={{ fontSize: size }}>
      <span aria-hidden className="inline-block rounded-full border border-white/70 bg-white/25" style={{ width: size * 0.62, height: size * 0.62, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6)' }} />
      FrantoS
    </span>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="rounded-full px-1" aria-label="FrantoS">
      {inner}
    </button>
  ) : (
    inner
  );
}

/**
 * The work behind the glass. Each change crossfades and settles with a slow
 * scale; under reduced motion it simply swaps.
 */
export function Backdrop({ src, alt = '', tint = 0.32, blur = false, fit = 'cover', id, shade }: { src?: string; alt?: string; tint?: number; blur?: boolean; fit?: 'cover' | 'contain'; id?: string; shade?: 'start' }) {
  const reduce = useReducedMotion();
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#101418]" aria-hidden={alt ? undefined : true}>
      <AnimatePresence initial={false}>
        {src && (
          <motion.div
            key={id ?? src}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: reduce ? 1 : 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: reduce ? 0 : 0.9, ease: lgEase }, scale: { duration: reduce ? 0 : 2.4, ease: lgEase } }}
          >
            {fit === 'contain' && <img src={src} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-[48px]" />}
            <img src={src} alt={alt} className={`absolute inset-0 h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'} ${blur ? 'scale-105 blur-[30px]' : ''}`} />
          </motion.div>
        )}
      </AnimatePresence>
      {shade && <div className="absolute inset-0 bg-gradient-to-r from-[rgba(10,12,16,0.62)] via-[rgba(10,12,16,0.25)] to-transparent rtl:bg-gradient-to-l" />}
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(10,12,16,${tint + 0.12}) 0%, rgba(10,12,16,${tint * 0.5}) 38%, rgba(10,12,16,${tint * 0.6}) 62%, rgba(10,12,16,${tint + 0.22}) 100%)` }} />
    </div>
  );
}

/** A pane of glass that arrives like liquid settling: a little blur, a little scale. */
export function Pane({
  children,
  className = '',
  strong,
  delay = 0,
  as = 'div',
  ...rest
}: { children: React.ReactNode; className?: string; strong?: boolean; delay?: number; as?: 'div' | 'section' | 'aside' | 'nav' | 'header' } & Omit<React.HTMLAttributes<HTMLElement>, 'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'style'> & { style?: React.CSSProperties }) {
  const reduce = useReducedMotion();
  const M = motion[as] as typeof motion.div;
  return (
    <M
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={reduce ? { opacity: 0, pointerEvents: 'none' } : { opacity: 0, y: 8, scale: 0.98, filter: 'blur(4px)', pointerEvents: 'none' }}
      transition={{ duration: 0.55, ease: lgEase, delay }}
      className={`${strong ? 'lg-glass-strong' : 'lg-glass'} ${className}`}
      {...(rest as object)}
    >
      {children}
    </M>
  );
}

export function GlassLang() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="flex items-center rounded-full p-1 lg-soft" role="radiogroup" aria-label={t('Language')}>
      {LANGS.map((l) => (
        <button
          key={l.id}
          role="radio"
          aria-checked={lang === l.id}
          aria-label={l.name}
          onClick={() => setLang(l.id)}
          className={`min-h-[32px] rounded-full px-2.5 text-[12px] font-bold transition-colors ${lang === l.id ? 'bg-white text-[#11151a]' : 'text-white/80 hover:text-white'}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

export function useIsNarrow(px = 900) {
  const q = `(max-width: ${px}px)`;
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const f = () => setM(mq.matches);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, [q]);
  return m;
}
