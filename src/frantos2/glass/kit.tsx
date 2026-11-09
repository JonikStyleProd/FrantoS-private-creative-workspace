import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { LANGS, useI18n } from '../i18n';
import { useTheme } from './theme';
import { useQuality } from './perf';

export const lgEase = [0.22, 1, 0.36, 1] as const;

/** The FrantoS logo from the brand kit: white on dark glass, black on light glass. */
export function Mark({ onClick, size = 18, compact = false }: { onClick?: () => void; size?: number; compact?: boolean }) {
  const { theme } = useTheme();
  const h = Math.round(size * 1.35);
  const src = compact ? (theme === 'light' ? '/brand/mark-black.webp' : '/brand/mark-white.webp') : theme === 'light' ? '/brand/wordmark-black.webp' : '/brand/wordmark-white.webp';
  const inner = <img src={src} alt="FrantoS" style={{ height: h, width: 'auto' }} className="block select-none" draggable={false} />;
  return onClick ? (
    <button type="button" onClick={onClick} className="rounded-full px-1" aria-label="FrantoS">
      {inner}
    </button>
  ) : (
    inner
  );
}

/** Sun / moon: switches the glass between dark and light. */
export function ThemeSwitch() {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  const light = theme === 'light';
  return (
    <button type="button" onClick={toggle} aria-pressed={light} aria-label={light ? t('Dark theme') : t('Light theme')} title={light ? t('Dark theme') : t('Light theme')} className="lg-btn lg-btn-plain lg-icon">
      {light ? <Moon size={17} /> : <Sun size={17} />}
    </button>
  );
}

/** Credits: the JonikStyle mark at 40 px and the rights line. */
export function Credits({ className = '' }: { className?: string }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const year = new Date().getFullYear();
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-white/70 ${className}`}>
      <img src={theme === 'light' ? '/brand/jonikstyle-dark.webp' : '/brand/jonikstyle-light.webp'} alt="JonikStyle" style={{ height: 40, width: 'auto' }} draggable={false} />
      <span>
        © {year} FrantoS. {t('All rights reserved.')} {t('Created by JonikStyle Production.')}
      </span>
    </div>
  );
}

/**
 * The work behind the glass. Each change crossfades and settles with a slow
 * scale; under reduced motion it simply swaps.
 */
export function Backdrop({ src, alt = '', tint = 0.32, blur = false, fit = 'cover', id, shade }: { src?: string; alt?: string; tint?: number; blur?: boolean; fit?: 'cover' | 'contain'; id?: string; shade?: 'start' }) {
  const reduce = useReducedMotion();
  const { lite } = useQuality();
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[var(--lg-bg)]" aria-hidden={alt ? undefined : true}>
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
            {fit === 'contain' && !lite && <img src={src} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-[48px]" />}
            <img src={src} alt={alt} className={`absolute inset-0 h-full w-full ${fit === 'cover' || lite ? 'object-cover' : 'object-contain'} ${blur && !lite ? 'scale-105 blur-[30px]' : ''} ${blur && lite ? 'opacity-40' : ''}`} />
          </motion.div>
        )}
      </AnimatePresence>
      {shade && <div className="lg-shade absolute inset-0" />}
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(var(--lg-tint),${tint + 0.12}) 0%, rgba(var(--lg-tint),${tint * 0.5}) 38%, rgba(var(--lg-tint),${tint * 0.6}) 62%, rgba(var(--lg-tint),${tint + 0.22}) 100%)` }} />
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
  const { lite } = useQuality();
  const M = motion[as] as typeof motion.div;
  // without a GPU an animated blur costs a frame each step: panes then only fade and settle
  const soft = reduce || lite;
  return (
    <M
      initial={soft ? { opacity: 0, y: reduce ? 0 : 8 } : { opacity: 0, y: 14, scale: 0.97, filter: 'blur(6px)' }}
      animate={soft ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={soft ? { opacity: 0, pointerEvents: 'none' } : { opacity: 0, y: 8, scale: 0.98, filter: 'blur(4px)', pointerEvents: 'none' }}
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
