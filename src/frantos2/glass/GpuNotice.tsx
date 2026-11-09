import React, { useState } from 'react';
import { Cpu, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { useQuality } from './perf';
import { go } from '../route';

/**
 * Shown where 3D runs (studio, showroom) when the browser draws without a GPU:
 * says why it is slower and how to turn acceleration on. Dismissed for the session.
 */
export function GpuNotice({ className = '', force, onClose }: { className?: string; force?: boolean; onClose?: () => void }) {
  const { t } = useI18n();
  const { gpu, pref } = useQuality();
  const [hidden, setHidden] = useState(() => {
    try {
      return sessionStorage.getItem('frantos-gpu-notice') === '1';
    } catch {
      return false;
    }
  });
  const [open, setOpen] = useState(!!force);
  if (!gpu?.software || (hidden && !force) || pref === 'full') return null;
  const close = () => {
    onClose?.();
    setHidden(true);
    try {
      sessionStorage.setItem('frantos-gpu-notice', '1');
    } catch {
      /* private mode */
    }
  };
  return (
    <div className={`lg-glass-strong z-40 max-w-[380px] rounded-[20px] p-3 text-[13px] leading-[1.45] ${className}`} role="status">
      <div className="flex items-start gap-2">
        <Cpu size={16} className="mt-0.5 shrink-0 text-[var(--lg-accent)]" />
        <p className="flex-1">
          <b>{t('The browser is drawing without the graphics card.')}</b> {t('FrantoS switched to lite graphics so it stays responsive.')}{' '}
          <button type="button" onClick={() => setOpen((v) => !v)} className="font-bold underline underline-offset-2" aria-expanded={open}>
            {t('How to speed it up')}
          </button>
        </p>
        <button type="button" onClick={close} className="-m-1 rounded-full p-1 hover:bg-white/10" aria-label={t('Close')}>
          <X size={14} />
        </button>
      </div>
      {open && (
        <ol className="mt-2 list-decimal space-y-1 ps-9 text-white/85">
          <li>{t('Open chrome://settings/system and turn on “Use graphics acceleration when available”, then relaunch Chrome.')}</li>
          <li>{t('Check chrome://gpu — “WebGL: Hardware accelerated” means it worked.')}</li>
          <li>{t('Still “Basic Render Driver”? Update the graphics driver (Windows Update or the GPU maker’s site).')}</li>
          <li>
            <button type="button" onClick={() => go('/settings')} className="font-bold underline underline-offset-2">
              {t('Graphics quality in Settings')}
            </button>
          </li>
        </ol>
      )}
      <p className="mt-1.5 ps-6 font-mono text-[10.5px] opacity-50">{gpu.renderer}</p>
    </div>
  );
}

/** The compact form for top bars: a chip that opens the same explanation. */
export function GpuChip() {
  const { t } = useI18n();
  const { gpu, lite } = useQuality();
  const [open, setOpen] = useState(false);
  if (!gpu?.software || !lite) return null;
  return (
    <span className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="lg-btn lg-btn-plain h-10 min-h-0 gap-1.5 px-3 text-[12.5px] text-[var(--lg-accent)]" title={t('The browser is drawing without the graphics card.')}>
        <Cpu size={15} /> <span className="hidden xl:inline">{t('Lite graphics')}</span>
      </button>
      {open && <GpuNotice className="absolute end-0 top-12 w-[340px]" force onClose={() => setOpen(false)} />}
    </span>
  );
}
