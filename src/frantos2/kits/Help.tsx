import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { go } from '../route';
import { Pane, lgEase } from '../glass/kit';

const TOUR = [
  { img: '/projects/form-01/ref-travertine-sm.webp', title: 'Collect', text: 'Drop references, screens, fonts, code and sound into the library. Search them by name, #tag or colour.', to: '/library' },
  { img: '/projects/wavelength/s-today-sm.webp', title: 'Connect', text: 'Lay them out on a moodboard, draw what led to what, and compose boards in the formats you need.', to: '/p/wavelength' },
  { img: '/projects/form-01/form-v2-sm.webp', title: 'Make', text: 'The studio: 3D objects, pictures, canvas, motion and mockups — every version kept.', to: '/s/form-01' },
  { img: '/projects/stride/hero-sm.webp', title: 'Review', text: 'Send one link. The client leaves notes on the picture or the timecode and approves; you see it here.', to: '/p/stride?s=review' },
  { img: '/projects/velo/bridge-sm.webp', title: 'Show', text: 'The story plays full screen, the case page and portfolio publish only when you say so.', to: '/p/velo/animatic' },
];

const KEYS: [string, string][] = [
  ['⌘K · Ctrl K', 'Search or run a command'],
  ['?', 'This list'],
  ['Esc', 'Close a dialog or a viewer'],
  ['← →', 'Previous / next in a story, deck or prototype'],
  ['1 – 5', 'Studio modes: object, image, canvas, motion, mockups'],
  ['⌘Z', 'Undo the last change'],
  ['⇧L', 'Switch light / dark theme'],
];

export const openTour = () => window.dispatchEvent(new Event('frantos:tour'));
export const openKeys = () => window.dispatchEvent(new Event('frantos:keys'));
const DONE = 'frantos-tour-done';
export const tourDone = () => {
  try {
    return localStorage.getItem(DONE) === '1';
  } catch {
    return true;
  }
};

/** The first-visit tour and the keyboard list; both open from the menu, the list also from "?". */
export function GlobalHelp() {
  const [tour, setTour] = useState(false);
  const [keys, setKeys] = useState(false);
  useEffect(() => {
    const t = () => setTour(true);
    const k = () => setKeys(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '?' || (e.target as HTMLElement).closest('input,textarea,select,[contenteditable]')) return;
      if (/^#\/s\//.test(window.location.hash)) return; // the studio keeps its own list
      setKeys((v) => !v);
    };
    window.addEventListener('frantos:tour', t);
    window.addEventListener('frantos:keys', k);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('frantos:tour', t);
      window.removeEventListener('frantos:keys', k);
      window.removeEventListener('keydown', onKey);
    };
  }, []);
  return (
    <AnimatePresence>
      {tour && <Tour key="tour" onClose={() => (localStorage.setItem(DONE, '1'), setTour(false))} />}
      {keys && <Keys key="keys" onClose={() => setKeys(false)} />}
    </AnimatePresence>
  );
}

function Shell({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="lg fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-3" style={{ background: 'rgba(0,0,0,.5)' }} onClick={onClose}>
      <Pane strong className="lg-pop w-full max-w-[560px] overflow-hidden rounded-[28px]" role="dialog" aria-modal aria-label={label} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        {children}
      </Pane>
    </motion.div>
  );
}

function Tour({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  const s = TOUR[i];
  const last = i === TOUR.length - 1;
  return (
    <Shell onClose={onClose} label={t('Tour')}>
      <div className="relative aspect-[16/9] overflow-hidden bg-black/30">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.img key={s.img} src={s.img} alt="" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease: lgEase }} className="absolute inset-0 h-full w-full object-cover" />
        </AnimatePresence>
        <span className="lg-glass absolute start-3 top-3 rounded-full px-3 py-1 text-[12px] font-bold">
          {String(i + 1).padStart(2, '0')} / {String(TOUR.length).padStart(2, '0')}
        </span>
        <button type="button" onClick={onClose} className="lg-glass absolute end-3 top-3 flex h-9 w-9 items-center justify-center rounded-full" aria-label={t('Close')}>
          <X size={16} />
        </button>
      </div>
      <div className="p-5">
        <p className="text-[26px] font-extrabold tracking-[-0.02em]">{t(s.title)}</p>
        <p className="mt-1.5 min-h-[66px] text-[15px] leading-[1.5] text-white/80">{t(s.text)}</p>
        <div className="mt-4 flex items-center gap-2">
          <div className="flex gap-1.5" aria-hidden>
            {TOUR.map((_, k) => (
              <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-6 bg-white' : 'w-1.5 bg-white/30'}`} />
            ))}
          </div>
          <button type="button" onClick={() => (onClose(), go(s.to))} className="lg-btn lg-btn-plain ms-auto min-h-[40px] text-[13px]">
            {t('Show me')}
          </button>
          {i > 0 && (
            <button type="button" onClick={() => setI(i - 1)} className="lg-btn lg-btn-ghost lg-icon" aria-label={t('Back')}>
              <ArrowLeft size={16} className="rtl:-scale-x-100" />
            </button>
          )}
          <button type="button" onClick={() => (last ? onClose() : setI(i + 1))} className="lg-btn lg-btn-primary">
            {last ? t('Start working') : t('Next')} {!last && <ArrowRight size={15} className="rtl:-scale-x-100" />}
          </button>
        </div>
      </div>
    </Shell>
  );
}

function Keys({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Shell onClose={onClose} label={t('Keyboard shortcuts')}>
      <div className="p-5">
        <div className="flex items-center">
          <p className="flex-1 text-[20px] font-extrabold">{t('Keyboard shortcuts')}</p>
          <button type="button" onClick={onClose} className="lg-btn lg-btn-plain lg-icon" aria-label={t('Close')}>
            <X size={17} />
          </button>
        </div>
        <dl className="mt-3 divide-y divide-white/10">
          {KEYS.map(([k, d]) => (
            <div key={k} className="flex items-center gap-3 py-2.5">
              <dt className="w-[120px] shrink-0">
                <kbd className="rounded-[8px] bg-white/15 px-2 py-1 text-[12.5px] font-bold" dir="ltr">
                  {k}
                </kbd>
              </dt>
              <dd className="text-[14px] text-white/85">{t(d)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[12px] text-white/55">{t('In the studio, press ? for the keys of each mode.')}</p>
      </div>
    </Shell>
  );
}
