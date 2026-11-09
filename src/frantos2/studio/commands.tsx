import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { go } from '../route';
import type { Project, StudioObject } from '../ws/types';
import { registerCommands } from '../daily/Palette';
import { setTheme, getTheme } from '../glass/theme';
import { Pane } from '../glass/kit';

/**
 * Studio commands: one list feeds ⌘K, the keyboard and the “?” sheet, so they never disagree.
 * Tools that live inside a mode listen for `studio:cmd` events.
 */
export type StudioCmd = 'view-render' | 'view-clay' | 'view-wire' | 'turntable' | 'reset-camera' | 'variant-prev' | 'variant-next' | 'variant-dup' | 'variations' | 'compare' | 'render-project' | 'render-png' | 'video-project' | 'video-download';

export const sendCmd = (c: StudioCmd) => window.dispatchEvent(new CustomEvent<StudioCmd>('studio:cmd', { detail: c }));
export function useCmd(handler: (c: StudioCmd) => void) {
  useEffect(() => {
    const f = (e: Event) => handler((e as CustomEvent<StudioCmd>).detail);
    window.addEventListener('studio:cmd', f);
    return () => window.removeEventListener('studio:cmd', f);
  });
}

type Mode = 'object' | 'image' | 'canvas' | 'motion';
type Def = { id: string; title: string; kbd?: string; modes?: Mode[]; run: () => void };

function defs(p: Project, o: StudioObject | undefined, setMode: (m: Mode) => void, t: (k: string) => string): Def[] {
  const obj: Mode[] = ['object'];
  return [
    { id: 'm-object', title: t('Studio: 3D · Object'), kbd: '1', run: () => setMode('object') },
    { id: 'm-image', title: t('Studio: Image'), kbd: '2', run: () => setMode('image') },
    { id: 'm-canvas', title: t('Studio: Canvas'), kbd: '3', run: () => setMode('canvas') },
    { id: 'm-motion', title: t('Studio: Motion'), kbd: '4', run: () => setMode('motion') },
    { id: 'v-render', title: t('Render view'), kbd: 'R', modes: obj, run: () => sendCmd('view-render') },
    { id: 'v-clay', title: t('Clay view'), kbd: 'C', modes: obj, run: () => sendCmd('view-clay') },
    { id: 'v-wire', title: t('Wireframe'), kbd: 'W', modes: obj, run: () => sendCmd('view-wire') },
    { id: 'turn', title: t('Turntable on / off'), kbd: 'T', modes: obj, run: () => sendCmd('turntable') },
    { id: 'cam', title: t('Reset camera'), kbd: '0', modes: obj, run: () => sendCmd('reset-camera') },
    { id: 'var-prev', title: t('Previous variant'), kbd: '[', modes: obj, run: () => sendCmd('variant-prev') },
    { id: 'var-next', title: t('Next variant'), kbd: ']', modes: obj, run: () => sendCmd('variant-next') },
    { id: 'var-dup', title: t('Duplicate variant'), kbd: 'N', modes: obj, run: () => sendCmd('variant-dup') },
    { id: 'var-ideas', title: t('Variations'), kbd: 'V', modes: obj, run: () => sendCmd('variations') },
    { id: 'compare', title: t('Compare A/B'), kbd: 'B', modes: obj, run: () => sendCmd('compare') },
    { id: 'r-project', title: t('Render to project'), kbd: '⇧R', modes: obj, run: () => sendCmd('render-project') },
    { id: 'r-png', title: t('Render PNG'), modes: obj, run: () => sendCmd('render-png') },
    { id: 'vid-proj', title: t('Turntable video to project'), modes: obj, run: () => sendCmd('video-project') },
    { id: 'vid-dl', title: t('Download turntable video'), modes: obj, run: () => sendCmd('video-download') },
    ...(o ? [{ id: 'room', title: t('Open the showroom'), kbd: 'O', run: () => go(`/o/${p.id}/${o.id}`) }] : []),
    { id: 'case', title: t('Open the case page'), run: () => go(`/p/${p.id}/case`) },
    { id: 'back', title: t('Back to the project'), run: () => go(`/p/${p.id}`) },
    { id: 'theme', title: t('Switch light / dark theme'), kbd: '⇧L', run: () => setTheme(getTheme() === 'dark' ? 'light' : 'dark') },
    { id: 'help', title: t('Keyboard shortcuts'), kbd: '?', run: () => window.dispatchEvent(new Event('studio:help')) },
  ];
}

const keyOf = (e: KeyboardEvent) => (e.shiftKey && e.key.length === 1 && /[a-z]/i.test(e.key) ? `⇧${e.key.toUpperCase()}` : e.key.length === 1 ? e.key.toUpperCase() : e.key);

export function useStudioCommands(p: Project, o: StudioObject | undefined, mode: Mode, setMode: (m: Mode) => void) {
  const { t } = useI18n();
  const list = defs(p, o, setMode, t).filter((d) => !d.modes || d.modes.includes(mode));
  useEffect(() => registerCommands('studio', list.map(({ id, title, kbd, run }) => ({ id: `s-${id}`, title, kbd, run }))));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement).closest('input,textarea,select,[contenteditable],[role="dialog"]')) return;
      const k = e.key === '?' ? '?' : keyOf(e);
      // Canvas and Motion use [ ] and arrows for their own layers and keys
      const d = list.find((x) => x.kbd === k);
      if (!d) return;
      e.preventDefault();
      d.run();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
}

export function ShortcutsHelp({ mode }: { mode: Mode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const f = () => setOpen((v) => !v);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('studio:help', f);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('studio:help', f);
      window.removeEventListener('keydown', esc);
    };
  }, []);
  const rows: [string, string][] = [
    ['1 · 2 · 3 · 4', t('3D · Image · Canvas · Motion')],
    ['⌘K', t('Search and commands')],
    ['⌘Z', t('Undo')],
    ['⇧L', t('Switch light / dark theme')],
    ['?', t('This list')],
  ];
  const per: Record<Mode, [string, string][]> = {
    object: [
      ['R · C · W', t('Render · clay · wireframe view')],
      ['T', t('Turntable on / off')],
      ['0', t('Reset camera')],
      ['[ · ]', t('Previous / next variant')],
      ['N', t('Duplicate variant')],
      ['V', t('Variations')],
      ['B', t('Compare A/B')],
      ['⇧R', t('Render to project')],
      ['O', t('Open the showroom')],
    ],
    image: [[t('Click'), t('With the pipette: add the colour to the palette')]],
    canvas: [
      ['← ↑ → ↓', t('Nudge the layer (⇧ = 10 px)')],
      ['Delete', t('Remove the layer')],
      ['⌘D', t('Duplicate the layer')],
      ['[ · ]', t('Send backward / bring forward')],
      ['⇧ + ' + t('corner'), t('Resize keeping proportions')],
      ['Alt', t('Move without snapping')],
    ],
    motion: [
      [t('Space'), t('Play / pause')],
      ['K', t('Key from the current view')],
      ['Delete', t('Remove the selected key')],
    ],
  };
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30 p-4" onClick={() => setOpen(false)}>
          <Pane strong className="w-full max-w-[460px] rounded-[26px] p-5" role="dialog" aria-modal aria-label={t('Keyboard shortcuts')} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-[17px] font-extrabold">
                <Keyboard size={18} /> {t('Keyboard shortcuts')}
              </p>
              <button type="button" onClick={() => setOpen(false)} className="lg-btn lg-btn-plain lg-icon -me-2" aria-label={t('Close')}>
                <X size={17} />
              </button>
            </div>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13.5px]">
              {[...rows, ...per[mode]].map(([k, v]) => (
                <React.Fragment key={k + v}>
                  <dt>
                    <kbd className="rounded-[8px] bg-white/15 px-2 py-0.5 font-mono text-[12px]">{k}</kbd>
                  </dt>
                  <dd className="text-white/85">{v}</dd>
                </React.Fragment>
              ))}
            </dl>
          </Pane>
        </div>
      )}
    </AnimatePresence>
  );
}
