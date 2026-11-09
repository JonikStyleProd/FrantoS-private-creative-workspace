import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Box, Camera, Package, PenTool } from 'lucide-react';
import { useI18n } from '../i18n';
import { go } from '../route';
import { ws } from '../ws/store';
import { GlassPage } from '../glass/Shell';
import { Pane, lgEase } from '../glass/kit';
import { FORMATS, placeholderBoard } from '../studio/compose';

/** Four ways to start: each makes a project with a brief, the steps as notes on the board, and boards in the right formats. */
const TEMPLATES = [
  {
    id: 'launch',
    icon: Package,
    title: 'Product launch',
    brief: 'One product, one story: hero image, a short loop, posts and a launch deck.',
    steps: ['Collect: references for light and surface', 'Make: hero still and a 6-second loop', 'Review: one round with the client', 'Show: post, story and a launch slide'],
    tags: ['launch', 'product'],
    formats: ['post', 'story', 'slide'],
    colors: { bg: '#efe8dc', ink: '#17130f', accent: '#c4542a' },
    image: '/projects/form-01/form-poster-sm.webp',
  },
  {
    id: 'identity',
    icon: PenTool,
    title: 'Brand identity',
    brief: 'Logo, colour and type for a studio — with a guide to hand over at the end.',
    steps: ['Collect: what the brand should feel like', 'Make: mark, wordmark and palette', 'Review: three directions, then one', 'Show: the guide and a presentation'],
    tags: ['identity', 'brand'],
    formats: ['slide', 'square', 'a4'],
    colors: { bg: '#f3f1ec', ink: '#14171c', accent: '#2c45c9' },
    image: '/projects/form-01/ref-sketch-sm.webp',
  },
  {
    id: 'photo',
    icon: Camera,
    title: 'Photo series',
    brief: 'A series of pictures with one look: selects, grade, sequence and a portfolio page.',
    steps: ['Collect: mood and light references', 'Make: selects and the grade', 'Review: sequence with notes', 'Show: case page and posts'],
    tags: ['photo', 'series'],
    formats: ['post', 'slide'],
    colors: { bg: '#141618', ink: '#f3efe7', accent: '#ff9a6b' },
    image: '/series/after-hours/balcony-sm.webp',
  },
  {
    id: 'object',
    icon: Box,
    title: '3D product shot',
    brief: 'An object in 3D: materials, light, stills and a turntable for the shop and socials.',
    steps: ['Collect: material and light references', 'Make: the object and two materials', 'Review: A/B with the client', 'Show: stills, turntable video, showroom'],
    tags: ['3d', 'product'],
    formats: ['square', 'story'],
    colors: { bg: '#e7e3d8', ink: '#17130f', accent: '#9a4223' },
    image: '/projects/form-01/form-v2-sm.webp',
  },
];

export function TemplatesPage() {
  const { t } = useI18n();
  const start = (tp: (typeof TEMPLATES)[number]) => {
    const boards = tp.formats.map((fid) => {
      const f = FORMATS.find((x) => x.id === fid)!;
      return placeholderBoard(f, t(tp.title), t('Replace the frame with your picture'), tp.colors.bg, tp.colors.ink, tp.colors.accent);
    });
    const id = ws.createFromTemplate({ title: t(tp.title), brief: t(tp.brief), works: tp.steps.map((s) => t(s)), tags: tp.tags, boards });
    go(`/s/${id}?m=canvas`);
  };
  return (
    <GlassPage kicker={t('Templates')} title={t('Start with a shape')} lead={t('Each template makes a project with a brief, the steps as notes on its board, and boards in the formats you will need.')} bg="/projects/form-01/ref-window.webp">
      <ul className="grid gap-5 md:grid-cols-2">
        {TEMPLATES.map((tp, i) => (
          <motion.li key={tp.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: lgEase, delay: i * 0.06 }}>
            <Pane className="flex h-full flex-col overflow-hidden rounded-[28px] sm:flex-row">
              <img src={tp.image} alt="" className="aspect-[16/10] w-full object-cover sm:aspect-auto sm:w-[38%]" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
              <div className="flex flex-1 flex-col p-5">
                <p className="flex items-center gap-2 text-[20px] font-extrabold tracking-[-0.02em]">
                  <tp.icon size={18} /> {t(tp.title)}
                </p>
                <p className="mt-2 text-[14px] leading-[1.5] text-white/80">{t(tp.brief)}</p>
                <ol className="mt-3 space-y-1 text-[13px] text-white/75">
                  {tp.steps.map((s, k) => (
                    <li key={s} className="flex gap-2">
                      <span className="font-bold tabular-nums text-white/50">0{k + 1}</span> {t(s)}
                    </li>
                  ))}
                </ol>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tp.formats.map((fid) => (
                    <span key={fid} className="rounded-full px-2.5 py-1 text-[11.5px] font-bold lg-soft">
                      {t(FORMATS.find((x) => x.id === fid)!.label)}
                    </span>
                  ))}
                  <span className="flex gap-1 ps-1">
                    {Object.values(tp.colors).map((c) => (
                      <span key={c} className="h-5 w-5 rounded-full ring-1 ring-white/30" style={{ background: c }} />
                    ))}
                  </span>
                </div>
                <button type="button" onClick={() => start(tp)} className="lg-btn lg-btn-primary mt-5 self-start sm:mt-auto">
                  {t('Use this template')} <ArrowRight size={15} className="rtl:-scale-x-100" />
                </button>
              </div>
            </Pane>
          </motion.li>
        ))}
      </ul>
    </GlassPage>
  );
}
