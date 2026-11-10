import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FolderPlus, Palette, Pause, Play, Sparkles, SlidersHorizontal } from 'lucide-react';
import { useI18n } from '../i18n';
import type { Project } from '../ws/types';
import { toast, useMedia } from '../ws/kit';
import { upload } from '../ws/uploads';
import { useWs } from '../ws/store';
import { Pane } from '../glass/kit';
import { fileSlug, saveFile } from '../site/exportSite';
import { ColorField, PaletteRow, Section, Seg, Slider } from './ui';
import { cycleOf, defaultParams, LOTTIE_PRESETS, LottieKind, LottieParams, makeLottie, preset } from './lottieMaker';

/**
 * Studio · Motion · Lottie: pick a ready animation, give it your colours, tempo and weight,
 * and take it out as a Lottie file — or straight into the project, where it plays like any work.
 */

const KEY = (pid: string) => `frantos.lottie.${pid}`;
const load = (pid: string): LottieParams => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY(pid)) ?? 'null');
    if (v && LOTTIE_PRESETS.some((p) => p.id === v.kind)) return v;
  } catch {
    /* private mode or a broken value: start fresh */
  }
  return defaultParams('wave');
};

/** plays Lottie JSON with the same player apps use */
export function LottiePlayer({ data, playing = true, className, label }: { data: object; playing?: boolean; className?: string; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const anim = useRef<{ destroy: () => void; play: () => void; pause: () => void; goToAndStop: (v: number, f?: boolean) => void } | null>(null);
  const reduced = useMedia('(prefers-reduced-motion: reduce)');
  useEffect(() => {
    let live = true;
    import('lottie-web/build/player/lottie_light').then(({ default: lottie }) => {
      if (!live || !ref.current) return;
      anim.current?.destroy();
      const a = lottie.loadAnimation({ container: ref.current, renderer: 'svg', loop: true, autoplay: false, animationData: JSON.parse(JSON.stringify(data)) });
      anim.current = a;
      if (playing && !reduced) a.play();
      else a.goToAndStop(Math.round((data as { op: number }).op * 0.4), true);
    });
    return () => {
      live = false;
    };
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!anim.current) return;
    if (playing && !reduced) anim.current.play();
    else anim.current.pause();
  }, [playing, reduced]);
  useEffect(() => () => anim.current?.destroy(), []);
  return <div ref={ref} className={className} role="img" aria-label={label} />;
}

const CHECKER = { backgroundColor: '#e9e6e1', backgroundImage: 'conic-gradient(#d6d2cc 25%, transparent 0 50%, #d6d2cc 0 75%, transparent 0)', backgroundSize: '24px 24px' };

export function LottieMaker({ p }: { p: Project }) {
  const { t } = useI18n();
  const narrow = useMedia('(max-width: 900px)');
  const { state: wsState } = useWs();
  const [par, setPar] = useState<LottieParams>(() => load(p.id));
  const [playing, setPlaying] = useState(true);
  const [name, setName] = useState('');
  const pre = preset(par.kind);
  const title = name.trim() || `${p.title} · ${t(pre.label)}`;
  useEffect(() => {
    try {
      localStorage.setItem(KEY(p.id), JSON.stringify(par));
    } catch {
      /* not stored: fine */
    }
  }, [p.id, par]);
  const data = useMemo(() => makeLottie(par, title), [par, title]);
  const thumbs = useMemo(() => Object.fromEntries(LOTTIE_PRESETS.map((x) => [x.id, makeLottie(defaultParams(x.id), x.label)])), []);
  const colors = [...new Set([...(p.palette ?? []), ...(wsState.brand?.palette ?? [])])].slice(0, 10);
  const [slot, setSlot] = useState(0);

  const pick = (k: LottieKind) => {
    setPar((v) => ({ ...defaultParams(k), speed: v.speed, weight: v.weight, bg: v.bg }));
    setPlaying(true);
  };
  const setColor = (i: number, c: string) => setPar((v) => ({ ...v, colors: v.colors.map((x, j) => (j === i ? c : x)) as LottieParams['colors'] }));
  const blob = () => new Blob([JSON.stringify(data)], { type: 'application/json' });
  const file = `${fileSlug(title)}.json`;
  const toProject = () => {
    upload([new File([blob()], file, { type: 'application/json' })], p.id, { isReference: false });
    toast(t('Added to the project: it opens in Review and can go on a page'));
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.code === 'Space' && !/INPUT|TEXTAREA|SELECT|BUTTON/.test(el.tagName) && !el.isContentEditable) {
        e.preventDefault();
        setPlaying((v) => !v);
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const gallery = (
    <div role="radiogroup" aria-label={t('Animations')} className={narrow ? 'flex gap-2 overflow-x-auto pb-1 lg-scroll' : 'grid grid-cols-2 gap-2'}>
      {LOTTIE_PRESETS.map((x) => (
        <button
          key={x.id}
          type="button"
          role="radio"
          aria-checked={x.id === par.kind}
          onClick={() => pick(x.id)}
          title={t(x.hint)}
          className={`group shrink-0 rounded-[18px] p-1.5 text-start transition-colors ${narrow ? 'w-[104px]' : ''} ${x.id === par.kind ? 'bg-white text-[#11151a]' : 'bg-white/[.08] hover:bg-white/15'}`}
        >
          <span className="block aspect-square overflow-hidden rounded-[13px] bg-[#f3f1ec]">
            <LottiePlayer data={thumbs[x.id]} playing className="h-full w-full" />
          </span>
          <span className="block truncate px-1 pb-0.5 pt-1.5 text-[12.5px] font-bold">{t(x.label)}</span>
        </button>
      ))}
    </div>
  );

  const stage = (
    <div className="relative aspect-square w-full overflow-hidden rounded-[26px] shadow-[0_30px_80px_-30px_rgba(0,0,0,.6)]" style={par.bg ? { background: par.bg } : CHECKER}>
      <LottiePlayer data={data} playing={playing} className="absolute inset-0" label={title} />
      <div className="absolute inset-x-3 bottom-3 flex items-center gap-2">
        <button type="button" onClick={() => setPlaying((v) => !v)} className="lg-btn lg-btn-primary lg-icon" aria-label={playing ? t('Pause') : t('Play')} title={`${playing ? t('Pause') : t('Play')} (Space)`}>
          {playing ? <Pause size={17} /> : <Play size={17} />}
        </button>
        <span className="lg-glass rounded-full px-3 py-1.5 text-[12px] font-bold tabular-nums">
          {t('Loop {s} s', { s: cycleOf(par).toFixed(1) })} · 512 × 512
        </span>
      </div>
    </div>
  );

  const settings = (
    <>
      <Section title={t(pre.label)} icon={<Sparkles size={16} />}>
        <p className="text-[12.5px] leading-[1.45] text-white/70">{t(pre.hint)}</p>
        <label className="block">
          <span className="lg-label mb-1.5 block">{t('Name')}</span>
          <input dir="auto" className="lg-input text-[14px]" value={name} placeholder={`${p.title} · ${t(pre.label)}`} onChange={(e) => setName(e.target.value)} />
        </label>
      </Section>
      <Section title={t('Colours')} icon={<Palette size={16} />}>
        <div className="space-y-1.5">
          {par.colors.map((c, i) => (
            <div key={i} onFocusCapture={() => setSlot(i)} onClick={() => setSlot(i)} className={`rounded-[13px] ${slot === i ? 'ring-2 ring-white/70' : ''}`}>
              <ColorField label={[t('Main'), t('Second'), t('Accent')][i]} value={c} onChange={(v) => setColor(i, v)} />
            </div>
          ))}
        </div>
        {colors.length > 0 && (
          <>
            <p className="text-[11.5px] text-white/60">{t('From the project: tap a colour to put it in the chosen place')}</p>
            <PaletteRow colors={colors} label={t('Project colours')} active={par.colors[slot]} onPick={(c) => setColor(slot, c)} />
          </>
        )}
        <button type="button" onClick={() => setPar((v) => ({ ...v, colors: [...pre.colors] }))} className="lg-btn lg-btn-plain min-h-[32px] px-2 text-[12px]">
          {t('Original colours')}
        </button>
      </Section>
      <Section title={t('Tempo and shape')} icon={<SlidersHorizontal size={16} />}>
        <Slider label={t('Tempo')} value={par.speed} min={0.5} max={2} step={0.05} fmt={(v) => `${v.toFixed(2).replace(/0$/, '')}×`} onChange={(v) => setPar((x) => ({ ...x, speed: v }))} />
        <Slider label={t('Thickness')} value={par.weight} min={0.6} max={1.6} step={0.05} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setPar((x) => ({ ...x, weight: v }))} />
        <Seg label={t('Background')} value={par.bg ? 'c' : 'none'} options={[{ id: 'none', label: t('Transparent') }, { id: 'c', label: t('Colour') }]} onChange={(v) => setPar((x) => ({ ...x, bg: v === 'c' ? x.bg ?? '#f3f1ec' : undefined }))} />
        {par.bg && <ColorField label={t('Background')} value={par.bg} onChange={(c) => setPar((x) => ({ ...x, bg: c }))} />}
      </Section>
      <Section title={t('Export')} icon={<Download size={16} />}>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => saveFile(blob(), file)} className="lg-btn lg-btn-ghost text-[13px]">
            <Download size={14} /> JSON
          </button>
          <button type="button" onClick={toProject} className="lg-btn lg-btn-primary text-[13px]">
            <FolderPlus size={14} /> {t('To project')}
          </button>
        </div>
        <p className="text-[11.5px] leading-[1.45] text-white/60">{t('Vector shapes, about {kb} KB. Plays in apps, on sites and on the pages you make in Site.', { kb: Math.max(1, Math.round(JSON.stringify(data).length / 1024)) })}</p>
      </Section>
    </>
  );

  if (narrow)
    return (
      <div className="absolute inset-0 overflow-y-auto px-3 pb-8 pt-[132px] lg-scroll">
        <div className="mx-auto max-w-[460px] space-y-3">
          {stage}
          {gallery}
          <Pane className="space-y-5 rounded-[24px] p-4">{settings}</Pane>
        </div>
      </div>
    );

  return (
    <>
      <Pane as="aside" aria-label={t('Animations')} className="absolute bottom-4 start-4 top-[140px] z-20 w-[280px] overflow-y-auto rounded-[24px] p-3 lg-scroll">
        <p className="lg-label mb-2 px-1">{t('Ready animations')}</p>
        {gallery}
      </Pane>
      <div className="absolute bottom-4 end-[344px] start-[304px] top-[84px] flex items-center justify-center p-4">
        <div className="w-full" style={{ maxWidth: 'min(560px, calc(100vh - 140px))' }}>
          {stage}
        </div>
      </div>
      <Pane as="aside" aria-label={t('Inspector')} className="absolute bottom-4 end-4 top-[84px] z-20 w-[312px] space-y-5 overflow-y-auto rounded-[24px] p-4 lg-scroll">
        {settings}
      </Pane>
    </>
  );
}
