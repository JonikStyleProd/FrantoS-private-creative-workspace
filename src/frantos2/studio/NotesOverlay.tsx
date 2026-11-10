import React, { useEffect, useState } from 'react';
import type { ObjectScene } from './scene';
import { useI18n } from '../i18n';

type Note = { id: string; p: [number, number, number]; text: string };

/**
 * Numbered dots that stay on their spot of the object as it turns; behind the object they fade.
 * While `placing`, a click on the object adds a point there. In the showroom (`readOnly`) a tap opens the note.
 */
export function NotesOverlay({ scene, notes, placing, onPlace, readOnly }: { scene: ObjectScene | null; notes: Note[]; placing?: boolean; onPlace?: (p: [number, number, number]) => void; readOnly?: boolean }) {
  const { t } = useI18n();
  const [, tick] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    if (!scene) return;
    return scene.onFrame(() => tick((n) => (n + 1) % 1e6));
  }, [scene]);
  if (!scene) return null;
  return (
    <div className={`absolute inset-0 z-10 ${placing ? 'cursor-crosshair' : 'pointer-events-none'}`} onClick={(e) => {
      if (!placing || !onPlace) return;
      const pt = scene.pick(e.clientX, e.clientY);
      if (pt) onPlace(pt);
    }}>
      {placing && <p className="lg-glass pointer-events-none absolute start-1/2 top-[84px] -translate-x-1/2 rounded-full px-4 py-2 text-[13px] font-bold rtl:translate-x-1/2">{t('Click a spot on the object…')}</p>}
      {notes.map((n, i) => {
        const at = scene.project(n.p);
        if (!at) return null;
        return (
          <div key={n.id} className="absolute" style={{ left: at.x, top: at.y, opacity: at.hidden ? 0.25 : 1, transition: 'opacity .2s' }}>
            <button
              type="button"
              onClick={(e) => (e.stopPropagation(), setOpen(open === n.id ? null : n.id))}
              className="pointer-events-auto -ms-3 -mt-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#ff9a6b] text-[12px] font-extrabold text-[#14171c] shadow-[0_0_0_4px_rgba(255,154,107,0.3)]"
              aria-label={t('Note {n}', { n: i + 1 })}
              aria-expanded={open === n.id}
            >
              {i + 1}
            </button>
            {(open === n.id || (!readOnly && n.text)) && n.text && (
              <p dir="auto" className="lg-glass pointer-events-none absolute start-4 top-[-6px] w-max max-w-[220px] rounded-[12px] px-3 py-1.5 text-[12.5px] font-semibold">
                {n.text}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
