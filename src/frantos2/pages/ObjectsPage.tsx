import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Box, Eye, Pencil, Plus } from 'lucide-react';
import { useI18n } from '../i18n';
import { go } from '../route';
import { useWs } from '../ws/store';
import type { MaterialVariant, Project, StudioObject } from '../ws/types';
import { GlassPage } from '../glass/Shell';
import { Pane, lgEase } from '../glass/kit';

/** All your 3D objects on one shelf. Point at a swatch to see the material's name; open the showroom or the studio. */
export function ObjectsPage() {
  const { t } = useI18n();
  const { state } = useWs();
  const items = state.projects.flatMap((p) => (p.objects ?? []).map((o) => ({ p, o })));
  return (
    <GlassPage kicker={t('Objects')} title={t('The shelf')} lead={t('Every object you made in the studio, with its materials. Open one in the showroom to turn it, or in the studio to change it.')} bg="/projects/form-01/form-v2.webp">
      {items.length === 0 ? (
        <Pane className="rounded-[26px] p-10 text-center">
          <Box className="mx-auto" />
          <p className="mt-3 text-[18px] font-bold">{t('No objects yet')}</p>
          <button type="button" onClick={() => go('/s/form-01')} className="lg-btn lg-btn-primary mt-4">
            <Plus size={15} /> {t('Open the studio')}
          </button>
        </Pane>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ p, o }, i) => (
            <motion.li key={p.id + o.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: lgEase, delay: i * 0.05 }}>
              <ObjectCard p={p} o={o} />
            </motion.li>
          ))}
        </ul>
      )}
    </GlassPage>
  );
}

const swatch = (v: MaterialVariant) => (v.blend >= 1 ? v.baseColor : `linear-gradient(0deg, ${v.baseColor} 0 ${Math.round((v.blend - v.softness / 2) * 100)}%, ${v.topColor} ${Math.round((v.blend + v.softness / 2) * 100)}% 100%)`);

function ObjectCard({ p, o }: { p: Project; o: StudioObject }) {
  const { t } = useI18n();
  const [hover, setHover] = useState<string | null>(null);
  const v = o.variants.find((x) => x.id === (hover ?? o.variantId)) ?? o.variants[0];
  const bg = o.background.kind === 'transparent' ? '#2a2d33' : o.background.color;
  return (
    <Pane className="overflow-hidden rounded-[28px]">
      <button type="button" onClick={() => go(`/o/${p.id}/${o.id}`)} className="group relative block w-full text-start" aria-label={t('Open {name} in the showroom', { name: t(o.title) })}>
        <div className="relative aspect-[4/5] overflow-hidden" style={{ background: `radial-gradient(ellipse at 50% 40%, ${bg} 0%, color-mix(in srgb, ${bg} 55%, #1a1612) 70%, #0e0c0b 100%)` }}>
          {o.thumb ? <img src={o.thumb} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" /> : <Box size={42} className="absolute inset-0 m-auto" />}
          <span className="lg-glass absolute start-3 top-3 rounded-full px-3 py-1 text-[11.5px] font-bold">{o.source.kind === 'vessel' ? t('Parametric vessel') : t('Imported GLB')}</span>
        </div>
      </button>
      <div className="p-4">
        <p dir="auto" className="truncate text-[17px] font-extrabold tracking-[-0.02em]">
          {t(o.title)}
        </p>
        <p dir="auto" className="truncate text-[12.5px] text-white/65">
          {p.title} · {t(v.name)}
        </p>
        <div className="mt-3 flex items-center gap-1.5" onMouseLeave={() => setHover(null)}>
          {o.variants.map((x) => (
            <button key={x.id} type="button" onMouseEnter={() => setHover(x.id)} onFocus={() => setHover(x.id)} onBlur={() => setHover(null)} onClick={() => go(`/o/${p.id}/${o.id}`)} title={t(x.name)} aria-label={t(x.name)} className={`h-7 w-7 rounded-full ring-1 ring-white/30 ${x.id === v.id ? 'ring-2 ring-white' : ''}`} style={{ background: swatch(x) }} />
          ))}
          <div className="ms-auto flex gap-1">
            <button type="button" onClick={() => go(`/s/${p.id}?o=${o.id}`)} className="lg-btn lg-btn-ghost lg-icon h-9 min-h-0 w-9" aria-label={t('Edit in the studio')} title={t('Edit in the studio')}>
              <Pencil size={14} />
            </button>
            <button type="button" onClick={() => go(`/o/${p.id}/${o.id}`)} className="lg-btn lg-btn-primary lg-icon h-9 min-h-0 w-9" aria-label={t('Showroom')} title={t('Showroom')}>
              <Eye size={14} />
            </button>
          </div>
        </div>
      </div>
    </Pane>
  );
}
