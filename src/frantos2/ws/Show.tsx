import React, { useCallback, useEffect, useState } from 'react';
import { tr as t } from '../i18n';
import { AnimatePresence, motion, PanInfo } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Asset, Project } from './types';
import { assetOf, useProject, workOfAsset } from './store';
import { go, leave } from '../route';
import { useAssetUrl } from './media';
import { ease } from './kit';

/** Clean presentation (what a viewer gets) or a Story playback, for any project. */
export function Show({ id, mode, slide }: { id: string; mode: 'presentation' | 'story'; slide: number }) {
  const { project: p } = useProject(id);
  if (!p) return <motion.div className="fixed inset-0 bg-[#0e0e10]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />;
  return <ShowInner p={p} mode={mode} slide={slide} />;
}

function ShowInner({ p, mode, slide }: { p: Project; mode: 'presentation' | 'story'; slide: number }) {
  const items: { a: Asset; caption?: string }[] =
    mode === 'presentation'
      ? p.presentation.map((aid) => ({ a: assetOf(p, aid)! })).filter((x) => x.a)
      : p.story.map((s) => ({ a: assetOf(p, s.assetId)!, caption: s.caption })).filter((x) => x.a);
  const n = items.length;
  const i = Math.min(Math.max(slide, 0), n);
  const [dir, setDir] = useState(1);
  const base = mode === 'presentation' ? `/p/${p.id}/present` : `/p/${p.id}/stories/play`;
  const back = mode === 'presentation' ? `/p/${p.id}` : `/p/${p.id}/stories`;

  const to = useCallback(
    (j: number) => {
      const k = Math.min(Math.max(j, 0), n);
      if (k === i) return;
      setDir(k > i ? 1 : -1);
      go(`${base}/${k}`, { replace: true });
    },
    [i, n, base]
  );
  const exit = useCallback(() => leave(back), [back]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        to(i + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') to(i - 1);
      else if (e.key === 'Escape') exit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [i, to, exit]);

  const cover = assetOf(p, p.coverAssetId) ?? items[0]?.a;
  const cur = i > 0 ? items[i - 1] : undefined;

  return (
    <motion.div
      className="fixed inset-0 z-40 overflow-hidden bg-[#0e0e10] text-[#f3efe7]"
      initial={{ backgroundColor: 'rgba(14,14,16,0)' }}
      animate={{ backgroundColor: 'rgba(14,14,16,1)' }}
      exit={{ backgroundColor: 'rgba(14,14,16,0)', transition: { duration: 0.3 } }}
      transition={{ duration: 0.3 }}
      role="region"
      aria-roledescription="presentation"
      aria-label={p.title}
    >
      <motion.div
        className="absolute inset-0 touch-pan-y"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={(_: unknown, info: PanInfo) => {
          if (info.offset.x < -60) to(i + 1);
          else if (info.offset.x > 60) to(i - 1);
        }}
      >
        {i === 0 && cover && <TitleSlide p={p} cover={cover} mode={mode} count={n} />}
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          {cur && (
            <motion.figure
              key={cur.a.id}
              className="absolute inset-0 flex items-center justify-center px-4 pb-[118px] pt-[78px] md:px-16 md:pb-[124px] md:pt-[88px]"
              initial={{ opacity: 0, x: dir * 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -50 }}
              transition={{ duration: 0.42, ease }}
            >
              <SlideMedia a={cur.a} />
              <figcaption className="absolute inset-x-0 bottom-0 px-5 pb-[max(22px,env(safe-area-inset-bottom))] md:px-10 md:pb-9">
                <div className="mx-auto flex max-w-[1200px] flex-col gap-1 md:flex-row md:items-end md:justify-between md:gap-8">
                  <div>
                    <p className="f2-mono text-[var(--fog)]">
                      {String(i).padStart(2, '0')} / {String(n).padStart(2, '0')}
                      {(() => {
                        const wv = workOfAsset(p, cur.a.id);
                        return wv ? ` · ${wv.work.title} v${wv.version.n}` : '';
                      })()}
                    </p>
                    <p className="f2-display mt-1 text-[28px] leading-none md:text-[38px]">{cur.a.title}</p>
                  </div>
                  {cur.caption && <p className="max-w-[30rem] text-[14px] text-[var(--fog)] md:text-end md:text-[15px]">{cur.caption}</p>}
                </div>
              </figcaption>
            </motion.figure>
          )}
        </AnimatePresence>
        {n === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <p className="f2-display text-[36px]">{t('Nothing to show yet.')}</p>
            <p className="text-[var(--fog)]">{mode === 'presentation' ? t('Add works to the presentation from Review or Materials.') : t('Add frames from approved versions.')}</p>
          </div>
        )}
      </motion.div>

      {i > 0 && <button onClick={() => to(i - 1)} aria-label={t('Previous')} className="group absolute bottom-[110px] left-0 top-[70px] z-10 w-[26%] md:w-[16%]"><Chev side="l" /></button>}
      {i < n && <button onClick={() => to(i + 1)} aria-label={t('Next')} className="group absolute bottom-[110px] right-0 top-[70px] z-10 w-[40%] md:w-[16%]"><Chev side="r" /></button>}

      <div className="absolute inset-x-0 top-0 z-20 px-4 pt-[max(14px,env(safe-area-inset-top))] md:px-8 md:pt-6">
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: n + 1 }).map((_, k) => (
            <span key={k} className="h-[2px] flex-1 overflow-hidden rounded-full bg-white/20">
              <motion.span className="block h-full origin-left" style={{ background: k === i ? 'var(--signal)' : '#f3efe7' }} initial={false} animate={{ scaleX: k <= i ? 1 : 0 }} transition={{ duration: 0.3 }} />
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="f2-mono flex items-center gap-2 text-[#f3efe7]">
            <Eye size={12} /> {mode === 'presentation' ? <>{t('Viewer mode')}<span className="hidden sm:inline">&nbsp;· what a client sees</span></> : t('Story')}
          </p>
          <button onClick={exit} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3.5 text-[13.5px] font-medium backdrop-blur hover:bg-black/55">
            <ArrowLeft size={15} /> {t('Back to project')}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function Chev({ side }: { side: 'l' | 'r' }) {
  return (
    <span className={`absolute top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/30 opacity-60 backdrop-blur transition-opacity group-hover:opacity-100 md:flex ${side === 'l' ? 'left-4' : 'right-4'}`}>
      {side === 'l' ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}
    </span>
  );
}

function SlideMedia({ a }: { a: Asset }) {
  const { url } = useAssetUrl(a, 'full');
  const poster = useAssetUrl(a, 'thumb').url;
  if (a.kind === 'video') return url ? <video src={url} poster={poster} autoPlay muted loop playsInline className="max-h-full max-w-full rounded-[2px] object-contain" /> : null;
  return (
    <motion.img
      layoutId={`work-${a.id}`}
      src={url}
      alt={a.title}
      draggable={false}
      className="max-h-full max-w-full select-none rounded-[2px] object-contain shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]"
      transition={{ type: 'spring', stiffness: 240, damping: 32 }}
    />
  );
}

function TitleSlide({ p, cover, mode, count }: { p: Project; cover: Asset; mode: string; count: number }) {
  const { url } = useAssetUrl(cover, 'full');
  return (
    <div className="absolute inset-0">
      <motion.div layoutId={`cover-${p.id}`} className="absolute inset-0 overflow-hidden" transition={{ type: 'spring', stiffness: 220, damping: 32 }}>
        {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      </motion.div>
      <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,10,12,.5) 0%, rgba(10,10,12,0) 28%, rgba(10,10,12,0) 45%, rgba(10,10,12,.86) 100%)' }} />
      <motion.div className="absolute inset-x-0 bottom-0 px-5 pb-[max(28px,env(safe-area-inset-bottom))] md:px-12 md:pb-14" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5, ease }}>
        <p className="f2-mono text-[#f3efe7]/80">
          {mode === 'presentation' ? t('Presentation') : t('Story')} · {t('{n} frames', { n: count })}
        </p>
        <h1 className="f2-display mt-3 text-[clamp(3.2rem,10vw,9rem)] leading-[0.88]">{p.title}</h1>
        {p.brief && <p className="mt-4 max-w-[34rem] text-[15px] text-[#f3efe7]/80">{p.brief}</p>}
      </motion.div>
    </div>
  );
}
