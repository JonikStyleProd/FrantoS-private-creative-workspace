import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Archive, BookOpen, Clapperboard, Code2, Frame, LayoutGrid, Presentation, Printer, Scale, Workflow } from 'lucide-react';
import { toast } from '../ws/kit';
import { useI18n } from '../i18n';
import { go } from '../route';
import type { Project } from '../ws/types';
import { Pane } from '../glass/kit';

/** One menu for the project's tools across professions: flow and prototype, handoff, animatic, mockups, print, deck, guide. */
export function ProjectTools({ p }: { p: Project }) {
  const { t, dir } = useI18n();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', off);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointerdown', off);
      window.removeEventListener('keydown', esc);
    };
  }, [open]);
  // stays on screen whichever side of the bar the button is on (RTL, phones)
  const [place, setPlace] = useState<React.CSSProperties>({});
  useLayoutEffect(() => {
    if (!open || !box.current) return;
    const r = box.current.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const w = Math.min(330, vw - 24);
    const rtl = getComputedStyle(box.current).direction === 'rtl';
    const want = rtl ? r.left : r.right - w;
    setPlace({ left: Math.max(12, Math.min(vw - 12 - w, want)) - r.left, width: w });
  }, [open]);
  const screens = p.assets.filter((a) => a.format === 'screen').length;
  const items = [
    { icon: Workflow, label: 'Flow & prototype', hint: screens ? '{n} screens' : 'Screens, arrows and a clickable prototype', to: `/p/${p.id}/flow` },
    { icon: Code2, label: 'Handoff', hint: 'Colours, type, tokens and assets for the developer', to: `/p/${p.id}/handoff` },
    { icon: Clapperboard, label: 'Animatic', hint: 'The story as a film, cut on the beat', to: `/p/${p.id}/animatic` },
    { icon: Frame, label: 'Mockups', hint: 'Poster, box and card in 3D', to: `/s/${p.id}?m=mockup` },
    { icon: Printer, label: 'Print', hint: 'Boards as a print PDF with bleed', to: `/s/${p.id}?m=canvas&print=1` },
    { icon: Presentation, label: 'Present boards', hint: 'Full screen, with notes', to: `/p/${p.id}/deck` },
    { icon: BookOpen, label: 'Brand guide', hint: 'Logo, colour, type and voice', to: `/p/${p.id}/guide` },
    { icon: Scale, label: 'Decision wall', hint: 'Every approval and client line, dated', to: `/p/${p.id}/decisions` },
    { icon: Archive, label: 'Project capsule', hint: 'A ZIP: case PDF, every original, the project as JSON', to: '' },
  ];
  const capsule = async () => {
    toast(t('Packing the capsule…'));
    try {
      const { exportCapsule } = await import('./capsule');
      const blob = await exportCapsule(p, dir === 'rtl');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${p.title.replace(/[^\p{L}\p{N}]+/gu, '-')}-capsule.zip`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 8000);
      toast(t('Capsule saved'));
    } catch {
      toast(t('The capsule could not be made.'), { tone: 'error' });
    }
  };
  return (
    <div className="relative" ref={box}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu" className="lg-glass lg-btn" title={t('Tools')}>
        <LayoutGrid size={15} /> <span className="hidden md:inline">{t('Tools')}</span>
      </button>
      <AnimatePresence>
        {open && (
          <Pane strong className="lg-pop absolute top-[52px] z-50 rounded-[22px] p-1.5" style={place} role="menu">
            {items.map((it) => (
              <button key={it.label} type="button" role="menuitem" onClick={() => (setOpen(false), it.to ? go(it.to) : capsule())} className="flex w-full items-start gap-3 rounded-[16px] px-3 py-2.5 text-start hover:bg-white/10">
                <it.icon size={17} className="mt-0.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[14px] font-bold">{t(it.label)}</span>
                  <span className="block text-[12px] leading-snug text-white/65">{t(it.hint, { n: screens })}</span>
                </span>
              </button>
            ))}
          </Pane>
        )}
      </AnimatePresence>
    </div>
  );
}
