import React, { useEffect, useState } from 'react';
import { Maximize2, Monitor, Smartphone, Tablet, X } from 'lucide-react';
import { useI18n } from '../i18n';
import type { Project, SitePage } from '../ws/types';
import { BPS } from './model';
import { SiteView, useSiteDir, useSiteTr } from './SiteView';

/** The live page of a review version, over the review: the client scrolls it, tries the phone width, closes it and pins notes on the picture. */
export default function LiveOverlay({ p, page, versionN, onClose }: { p: Project; page: Pick<SitePage, 'root' | 'theme' | 'dir' | 'title'>; versionN?: number; onClose: () => void }) {
  const { t } = useI18n();
  const tr = useSiteTr(p);
  const view = useSiteDir(p, page);
  const [w, setW] = useState<string>(() => (window.innerWidth < 700 ? 'full' : 'lg'));
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  const bp = BPS.find((b) => b.id === w);
  const [vw, setVw] = useState(window.innerWidth);
  useEffect(() => {
    const f = () => setVw(window.innerWidth);
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  const zoom = bp ? Math.min(1, (vw - 24) / bp.w) : 1;
  const opts = [{ id: 'full', label: 'Full width', icon: Maximize2 }, ...BPS.map((b) => ({ id: b.id, label: b.label, icon: b.id === 'sm' ? Smartphone : b.id === 'md' ? Tablet : Monitor }))];
  return (
    <div className="fixed inset-0 z-[95] flex flex-col bg-[#16171a]" role="dialog" aria-modal aria-label={t('Live page')}>
      <div className="flex h-[54px] shrink-0 items-center gap-2 border-b border-white/10 px-3 text-[#f3efe7]">
        <p dir="auto" className="min-w-0 flex-1 truncate text-[14px] font-semibold">
          {tr ? tr(page.title) : page.title}
          {versionN ? <span className="ms-2 text-white/55">v{versionN}</span> : null}
        </p>
        <div role="radiogroup" aria-label={t('Width')} className="flex items-center gap-0.5 rounded-full border border-white/15 p-0.5">
          {opts.map((o) => (
            <button key={o.id} type="button" role="radio" aria-checked={w === o.id} onClick={() => setW(o.id)} title={t(o.label)} aria-label={t(o.label)} className={`flex h-8 min-w-[34px] items-center justify-center gap-1.5 rounded-full px-2 text-[12px] font-semibold ${w === o.id ? 'bg-[#f3efe7] text-[#16171a]' : 'hover:bg-white/10'}`}>
              <o.icon size={14} /> <span className="hidden md:inline">{t(o.label)}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10" aria-label={t('Close')}>
          <X size={18} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto" style={bp ? undefined : { background: page.theme.bg }}>
        {bp ? (
          <div className="flex justify-center px-3 py-6" style={{ zoom }}>
            <SiteView p={p} page={view} width={bp.w} vh={`${bp.h}px`} tr={tr} className="shrink-0 overflow-hidden rounded-[14px]" />
          </div>
        ) : (
          <SiteView p={p} page={view} tr={tr} vh="calc(100vh - 54px)" />
        )}
      </div>
    </div>
  );
}
