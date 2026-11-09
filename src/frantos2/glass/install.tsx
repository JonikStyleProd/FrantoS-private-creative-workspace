import React, { useState, useSyncExternalStore } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Download, Share, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { Pane } from './kit';

/**
 * Install as an app (PWA). Chrome/Edge/Android give us a prompt to show on demand;
 * iPhone/iPad Safari installs through Share → Add to Home Screen, so we explain that instead.
 */
type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: Prompt | null = null;
const ls = new Set<() => void>();
const emit = () => ls.forEach((f) => f());

export function captureInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as Prompt;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });
}

const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function InstallButton({ compact }: { compact?: boolean }) {
  const { t } = useI18n();
  const prompt = useSyncExternalStore(
    (f) => (ls.add(f), () => ls.delete(f)),
    () => deferred,
    () => null
  );
  const [help, setHelp] = useState(false);
  if (standalone()) return null;
  const ios = isIOS();
  if (!prompt && !ios) return null;
  const run = async () => {
    if (prompt) {
      await prompt.prompt();
      await prompt.userChoice.catch(() => undefined);
      deferred = null;
      emit();
    } else setHelp((v) => !v);
  };
  return (
    <div className="relative">
      <button type="button" onClick={run} className="lg-btn lg-btn-ghost" aria-expanded={ios ? help : undefined}>
        <Download size={15} /> {!compact && <span className="hidden sm:inline">{t('Install app')}</span>}
      </button>
      <AnimatePresence>
        {help && (
          <Pane strong className="absolute end-0 top-14 z-50 w-[290px] rounded-[22px] p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[15px] font-bold">{t('Install FrantoS')}</p>
              <button type="button" onClick={() => setHelp(false)} className="lg-btn lg-btn-plain lg-icon -me-2 -mt-2" aria-label={t('Close')}>
                <X size={16} />
              </button>
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-1 text-[13.5px] leading-[1.5] text-white/85">
              {t('In Safari tap')} <Share size={14} /> {t('Share, then “Add to Home Screen”.')}
            </p>
          </Pane>
        )}
      </AnimatePresence>
    </div>
  );
}
