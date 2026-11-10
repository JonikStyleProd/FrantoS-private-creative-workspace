import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { go } from '../route';
import { useWs, ws } from '../ws/store';
import type { Discipline } from '../ws/types';
import { Pane, lgEase } from '../glass/kit';
import { KITS, kitOf } from './disciplines';

const SKIP = 'frantos-kit-skip';
export const kitSkipped = () => {
  try {
    return localStorage.getItem(SKIP) === '1';
  } catch {
    return false;
  }
};

/** the six professions as cards; picking one saves it to the profile */
export function KitGrid({ value, onPick }: { value?: Discipline; onPick: (d: Discipline) => void }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t('Your profession')}>
      {KITS.map((k, i) => {
        const on = value === k.id;
        return (
          <motion.button
            key={k.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onPick(k.id)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: lgEase, delay: 0.05 + i * 0.04 }}
            className={`flex min-h-[76px] items-start gap-3 rounded-[18px] p-3 text-start transition-colors ${on ? 'bg-white text-[#11151a]' : 'lg-soft hover:bg-white/15'}`}
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${on ? 'bg-[#11151a] text-white' : 'bg-white/10'}`}>
              <k.icon size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-extrabold leading-tight">{t(k.label)}</span>
              <span className={`mt-0.5 block text-[12.5px] leading-snug ${on ? 'text-black/65' : 'text-white/70'}`}>{t(k.blurb)}</span>
            </span>
            {on && <Check size={16} className="mt-1 shrink-0" />}
          </motion.button>
        );
      })}
    </div>
  );
}

/** First visit: "who are you?" — once. Skipping is fine; it can be set later in Settings. */
export function KitPicker({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { state } = useWs();
  const pick = (d: Discipline) => {
    ws.setProfile({ discipline: d });
    window.setTimeout(() => {
      onClose();
      // right after the first choice: the five-step tour, once
      import('./Help').then((m) => !m.tourDone() && m.openTour());
    }, 260);
  };
  const skip = () => {
    try {
      localStorage.setItem(SKIP, '1');
    } catch {
      /* fine */
    }
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-3 sm:items-center" onClick={skip}>
      <Pane strong className="lg-pop max-h-[92vh] w-full max-w-[640px] overflow-y-auto rounded-[28px] p-5 sm:p-7" role="dialog" aria-modal aria-labelledby="kit-title" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="lg-label">{t('Make it yours')}</p>
            <h2 id="kit-title" className="mt-1 text-[clamp(24px,4vw,32px)] font-extrabold leading-tight tracking-[-0.03em]">
              {t('What do you make?')}
            </h2>
            <p className="mt-1.5 text-[14px] text-white/75">{t('Your templates, tools and demo come first. Everything else stays one click away, and you can change this in Settings.')}</p>
          </div>
          <button type="button" onClick={skip} className="lg-btn lg-btn-plain lg-icon shrink-0" aria-label={t('Close')}>
            <X size={17} />
          </button>
        </div>
        <div className="mt-5">
          <KitGrid value={state.profile?.discipline} onPick={pick} />
        </div>
        <button type="button" onClick={skip} className="lg-btn lg-btn-plain mt-4 w-full text-[13px]">
          {t('Skip for now')}
        </button>
      </Pane>
    </div>
  );
}

/** Home: the three tools of your profession, one tap away */
export function KitStrip() {
  const { t } = useI18n();
  const { state } = useWs();
  const kit = kitOf(state.profile?.discipline);
  if (!kit) return null;
  return (
    <Pane className="mt-6 rounded-[24px] p-2" delay={0.12}>
      <div className="flex flex-wrap items-center gap-2 px-2 pb-1 pt-1">
        <span className="lg-label flex items-center gap-1.5">
          <kit.icon size={13} /> {t(kit.label)}
        </span>
        <button type="button" onClick={() => go(`/p/${kit.demo}`)} className="ms-auto text-[12px] font-bold text-white/80 underline-offset-2 hover:text-white hover:underline">
          {t('Open the demo')}
        </button>
        <button type="button" onClick={() => go('/settings?kit=1')} className=" text-[12px] font-bold text-white/60 underline-offset-2 hover:text-white hover:underline">
          {t('Change')}
        </button>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-3">
        {kit.tools.map((tool) => (
          <button key={tool.label} type="button" onClick={() => go(tool.to)} className="group flex items-center gap-3 rounded-[18px] p-3 text-start hover:bg-white/10">
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-extrabold">{t(tool.label)}</span>
              <span className="block text-[12.5px] leading-snug text-white/70">{t(tool.hint)}</span>
            </span>
            <ArrowRight size={16} className="shrink-0 opacity-50 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100" />
          </button>
        ))}
      </div>
    </Pane>
  );
}
