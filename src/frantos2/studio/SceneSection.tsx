import React, { useRef, useState } from 'react';
import { Check, ImagePlus, MapPin, Trash2, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { useWs } from '../ws/store';
import type { Asset, MaterialVariant, Project, SceneExtras, StudioObject } from '../ws/types';
import { AssetThumb, toast } from '../ws/kit';
import { assetUrl } from '../ws/media';
import { FilePick } from '../ws/uploads';
import { Pane } from '../glass/kit';
import { Seg, Slider } from './ui';

/** The world around the object: environment, floor, a figure for scale, a logo on it, notes on it. */
export function SceneSection({ p, draft, edit, placing, onPlace }: { p: Project; draft: StudioObject; edit: (patch: Partial<StudioObject>, label?: string) => void; placing: boolean; onPlace: (on: boolean) => void }) {
  const { t } = useI18n();
  const { state } = useWs();
  const e: SceneExtras = draft.extras ?? {};
  const set = (patch: Partial<SceneExtras>, label = 'Scene changed') => edit({ extras: { ...e, ...patch } }, label);
  const logo = state.brand?.logo;
  const notes = draft.notes3d ?? [];
  const pickLogo = (files: FileList) => {
    const f = files[0];
    if (!f || !f.type.startsWith('image/')) return;
    const r = new FileReader();
    r.onload = () => set({ decal: { src: r.result as string, size: 0.3, angle: 0, y: 0.55 } }, 'Logo placed');
    r.readAsDataURL(f);
  };
  return (
    <div className="space-y-4">
      <div>
        <p className="lg-label mb-1.5">{t('Environment')}</p>
        <Seg
          wrap
          label={t('Environment')}
          value={e.env ?? 'room'}
          options={[
            { id: 'room', label: t('Studio room') },
            { id: 'sunset', label: t('Sunset') },
            { id: 'overcast', label: t('Overcast') },
            { id: 'neon', label: t('Neon') },
            { id: 'night', label: t('Night') },
          ]}
          onChange={(v) => set({ env: v })}
        />
      </div>
      <div>
        <p className="lg-label mb-1.5">{t('Floor')}</p>
        <Seg
          wrap
          label={t('Floor')}
          value={e.floor ?? 'shadow'}
          options={[
            { id: 'shadow', label: t('Shadow') },
            { id: 'mirror', label: t('Mirror') },
            { id: 'water', label: t('Water') },
          ]}
          onChange={(v) => set({ floor: v })}
        />
      </div>
      <div>
        <p className="lg-label mb-1.5">{t('For scale')}</p>
        <Seg
          wrap
          label={t('For scale')}
          value={e.scale ?? 'none'}
          options={[
            { id: 'none', label: t('Nothing') },
            { id: 'hand', label: t('A hand') },
            { id: 'person', label: t('A person') },
          ]}
          onChange={(v) => set({ scale: v })}
        />
        {e.scale && e.scale !== 'none' && (
          <label className="mt-2 flex items-center gap-2 text-[12.5px] text-white/80">
            {t('Real height of the object')}
            <input type="number" min={1} max={500} value={e.sizeCm ?? 30} onChange={(ev) => set({ sizeCm: Math.max(1, Math.min(500, +ev.target.value || 30)) })} className="lg-input h-8 w-20 px-2 text-[12.5px]" dir="ltr" />
            cm
          </label>
        )}
      </div>

      <div className="space-y-2">
        <p className="lg-label">{t('Logo on the surface')}</p>
        {e.decal ? (
          <>
            <div className="flex items-center gap-2">
              <img src={e.decal.src} alt="" className="h-10 w-10 rounded-[8px] bg-white/80 object-contain p-1" />
              <button type="button" onClick={() => set({ decal: null }, 'Logo removed')} className="lg-btn lg-btn-plain min-h-[32px] text-[12px]">
                <Trash2 size={13} /> {t('Remove')}
              </button>
            </div>
            <Slider label={t('Size')} value={e.decal.size} min={0.08} max={0.8} onChange={(v) => set({ decal: { ...e.decal!, size: v } })} />
            <Slider label={t('Around')} value={e.decal.angle} min={-180} max={180} step={1} fmt={(v) => `${Math.round(v)}°`} onChange={(v) => set({ decal: { ...e.decal!, angle: v } })} />
            <Slider label={t('Height')} value={e.decal.y} min={0.05} max={0.95} onChange={(v) => set({ decal: { ...e.decal!, y: v } })} />
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            {logo && (
              <button type="button" onClick={() => set({ decal: { src: logo, size: 0.3, angle: 0, y: 0.55 } }, 'Logo placed')} className="lg-btn lg-btn-ghost min-h-[36px] text-[12.5px]">
                {t('Brand kit logo')}
              </button>
            )}
            <FilePick onFiles={pickLogo} multiple={false} accept="image/png,image/svg+xml,image/webp" className="lg-btn lg-btn-ghost min-h-[36px] text-[12.5px]">
              <ImagePlus size={14} /> {t('A sticker file')}
            </FilePick>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="lg-label">{t('Notes on the object')}</p>
        <button type="button" onClick={() => onPlace(!placing)} aria-pressed={placing} className={`lg-btn min-h-[36px] w-full text-[12.5px] ${placing ? 'lg-btn-primary' : 'lg-btn-ghost'}`}>
          <MapPin size={14} /> {placing ? t('Click a spot on the object…') : t('Add a point')}
        </button>
        {notes.length > 0 && (
          <ol className="space-y-1">
            {notes.map((n, i) => (
              <li key={n.id} className="flex items-start gap-2 rounded-[12px] p-2 lg-soft">
                <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff9a6b] text-[11px] font-bold text-[#14171c]">{i + 1}</span>
                <input dir="auto" value={n.text} onChange={(ev) => edit({ notes3d: notes.map((x) => (x.id === n.id ? { ...x, text: ev.target.value } : x)) }, 'Note edited')} className="lg-input h-8 min-w-0 flex-1 px-2 text-[12.5px]" aria-label={t('Note {n}', { n: i + 1 })} />
                <button type="button" onClick={() => edit({ notes3d: notes.filter((x) => x.id !== n.id) }, 'Note removed')} className="lg-btn lg-btn-plain lg-icon min-h-[30px]" aria-label={t('Remove')}>
                  <X size={13} />
                </button>
              </li>
            ))}
          </ol>
        )}
        <p className="text-[11.5px] text-white/55">{t('Points show as numbered dots in the showroom; a tap opens the note.')}</p>
      </div>
    </div>
  );
}

/** Material from a photo: pick a reference, drag a square over the part to use, it becomes the surface. */
export function PhotoMaterialButton({ p, onPick, variant, editVariant }: { p: Project; onPick: () => void; variant?: MaterialVariant; editVariant?: (vp: Partial<MaterialVariant>) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (!editVariant) return null;
  return (
    <>
      <button type="button" onClick={() => (setOpen(true), onPick())} className={`lg-btn min-h-[38px] w-full text-[12.5px] ${variant?.finish === 'photo' ? 'lg-btn-primary' : 'lg-btn-ghost'}`}>
        <ImagePlus size={14} /> {variant?.finish === 'photo' ? t('Material from a photo · change') : t('Material from a photo')}
      </button>
      {open && <PhotoPicker p={p} onClose={() => setOpen(false)} onUse={(src) => (editVariant({ finish: 'photo', photo: src }), setOpen(false))} />}
    </>
  );
}

function PhotoPicker({ p, onClose, onUse }: { p: Project; onClose: () => void; onUse: (dataUrl: string) => void }) {
  const { t } = useI18n();
  const pics = p.assets.filter((a) => a.kind === 'image' && !a.format);
  const [a, setA] = useState<Asset | null>(pics.find((x) => x.isReference) ?? pics[0] ?? null);
  const [box, setBox] = useState({ x: 0.3, y: 0.3, s: 0.35 });
  const area = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const move = (ev: React.PointerEvent) => {
    if (!drag.current || !area.current) return;
    const r = area.current.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width - drag.current.dx;
    const y = (ev.clientY - r.top) / r.height - drag.current.dy;
    setBox((b) => ({ ...b, x: Math.max(0, Math.min(1 - b.s, x)), y: Math.max(0, Math.min(1 - b.s * (r.width / r.height), y)) }));
  };
  const use = async () => {
    if (!a || !area.current) return;
    try {
      const url = await assetUrl(a, 'full');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url!;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = c.height = 512;
      const sx = box.x * img.naturalWidth;
      const sy = box.y * img.naturalHeight;
      const ss = box.s * img.naturalWidth;
      c.getContext('2d')!.drawImage(img, sx, sy, ss, ss, 0, 0, 512, 512);
      onUse(c.toDataURL('image/jpeg', 0.86));
      toast(t('The surface now uses the photo'));
    } catch {
      toast(t('This picture could not be read.'), { tone: 'error' });
    }
  };
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-3" onClick={onClose}>
      <Pane strong className="lg-pop lg-scroll flex max-h-[92vh] w-full max-w-[760px] flex-col gap-3 overflow-y-auto rounded-[26px] p-4" role="dialog" aria-modal aria-label={t('Material from a photo')} onClick={(ev: React.MouseEvent) => ev.stopPropagation()}>
        <div className="flex items-center gap-2">
          <p className="flex-1 text-[17px] font-extrabold">{t('Material from a photo')}</p>
          <button type="button" onClick={onClose} className="lg-btn lg-btn-plain lg-icon" aria-label={t('Close')}>
            <X size={17} />
          </button>
        </div>
        <p className="text-[13px] text-white/70">{t('Pick a reference and drag the square over the part to use — travertine, fabric, metal. It wraps around the object.')}</p>
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
          {pics.slice(0, 24).map((x) => (
            <button key={x.id} type="button" onClick={() => setA(x)} aria-pressed={a?.id === x.id} className={`overflow-hidden rounded-[10px] ${a?.id === x.id ? 'ring-2 ring-white' : 'ring-1 ring-white/15'}`} aria-label={x.title}>
              <AssetThumb asset={x} className="aspect-square w-full" />
            </button>
          ))}
        </div>
        {a && (
          <div ref={area} className="relative mx-auto w-full max-w-[460px] touch-none select-none overflow-hidden rounded-[14px]" onPointerMove={move} onPointerUp={() => (drag.current = null)}>
            <AssetThumb asset={a} size="full" className="pointer-events-none w-full" />
            <div
              className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
              style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.s * 100}%`, aspectRatio: '1' }}
              onPointerDown={(ev) => {
                const r = area.current!.getBoundingClientRect();
                (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
                drag.current = { dx: (ev.clientX - r.left) / r.width - box.x, dy: (ev.clientY - r.top) / r.height - box.y };
              }}
            />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-w-[200px] flex-1 items-center gap-2 text-[12.5px]">
            {t('Size')}
            <input type="range" min={0.1} max={0.9} step={0.01} value={box.s} onChange={(ev) => setBox((b) => ({ ...b, s: +ev.target.value, x: Math.min(b.x, 1 - +ev.target.value) }))} className="flex-1" />
          </label>
          <button type="button" disabled={!a} onClick={use} className="lg-btn lg-btn-primary">
            <Check size={15} /> {t('Use as the material')}
          </button>
        </div>
      </Pane>
    </div>
  );
}
