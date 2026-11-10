import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, MessageSquare, MousePointer2 } from 'lucide-react';
import { useI18n } from '../i18n';
import { go } from '../route';
import { Pane, lgEase } from './kit';
import { isLite } from './perf';
import type { ObjectScene } from '../studio/scene';
import type { StudioObject } from '../ws/types';

/** true once the element has come near the screen: heavy things (WebGL) wait for it */
function useNear<T extends HTMLElement>(margin = '300px') {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setNear(true), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [near, margin]);
  return { ref, near };
}

/* ───────── a case told by scrolling: STRIDE from sketch to campaign ───────── */
const STEPS = [
  { img: '/projects/stride/sketch.webp', k: 'Sketch', title: 'A silhouette on paper', text: 'Marker on paper first: the shape has to read from across the street before it has a colour.' },
  { img: '/projects/stride/swatches.webp', k: 'Materials', title: 'One orange against grey', text: 'Mesh, suede, foam and reflective tape on one board — the orange was chosen against concrete.' },
  { img: '/projects/stride/obj/runner-orange.webp', k: '3D', title: 'The shoe as an object', text: 'Lifted into 3D: turn it, recolour it, put it on a plinth and render the stills for the launch.' },
  { img: '/projects/stride/hero.webp', k: 'Campaign', title: 'Launch: the shoe in mid-air', text: 'Hard noon sun, raw concrete. The client asked for louder — the second version shouted.' },
];

export function ScrollCase() {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setI(Number((e.target as HTMLElement).dataset.i))),
      { rootMargin: '-45% 0px -45% 0px' }
    );
    refs.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, []);
  return (
    <section className="relative isolate bg-[#e9e6e1] text-[#1a1716]" aria-label={t('A case, scroll by scroll')}>
      <div className="mx-auto grid max-w-[1360px] gap-8 px-5 py-24 sm:px-10 lg:grid-cols-2">
        <div className="sticky top-3 z-10 lg:top-0 lg:flex lg:h-[100svh] lg:items-center">
          <div className="relative aspect-[4/3] w-full lg:aspect-[4/5] overflow-hidden rounded-[28px] bg-[#d9d6d0] shadow-[0_40px_80px_-40px_rgba(0,0,0,.45)]">
            {STEPS.map((s, k) => (
              <img key={s.img} src={s.img} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700" style={{ opacity: k === i ? 1 : 0, transform: k === i ? 'scale(1)' : 'scale(1.04)' }} />
            ))}
            <div className="absolute inset-x-4 bottom-4 flex gap-1.5">
              {STEPS.map((s, k) => (
                <span key={s.k} className={`h-1 flex-1 rounded-full transition-colors ${k <= i ? 'bg-[#ff5a1f]' : 'bg-[#ffffff80]'}`} />
              ))}
            </div>
          </div>
        </div>
        <div>
          <p className="text-[13px] font-extrabold tracking-[0.14em] text-[#ff5a1f]">STRIDE · RUN CLUB LAUNCH</p>
          <h2 className="mt-3 text-[clamp(36px,5vw,68px)] font-extrabold leading-[0.98] tracking-[-0.04em]">{t('One project, from the first line to the launch.')}</h2>
          {STEPS.map((s, k) => (
            <div key={s.k} ref={(el) => void (refs.current[k] = el)} data-i={k} className="flex min-h-[70svh] flex-col justify-center">
              <p className="text-[13px] font-extrabold tracking-[0.12em] text-[#8a8378]">
                {String(k + 1).padStart(2, '0')} · {t(s.k).toUpperCase()}
              </p>
              <h3 className={`mt-2 text-[clamp(28px,3.4vw,44px)] font-extrabold leading-[1.05] tracking-[-0.03em] transition-opacity duration-500 ${k === i ? 'opacity-100' : 'opacity-35'}`}>{t(s.title)}</h3>
              <p className={`mt-3 max-w-[46ch] text-[17px] leading-[1.55] text-[#4a453e] transition-opacity duration-500 ${k === i ? 'opacity-100' : 'opacity-40'}`}>{t(s.text)}</p>
            </div>
          ))}
          <button type="button" onClick={() => go('/p/stride')} className="mt-2 inline-flex min-h-[52px] items-center gap-2 rounded-full bg-[#1a1716] px-6 text-[15px] font-bold text-[#ffffff]">
            {t('Open STRIDE')} <ArrowRight size={17} className="rtl:-scale-x-100" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ───────── recolour a sneaker, live ───────── */
const COLOURS = [
  { c: '#ff5a1f', n: 'Signal orange' },
  { c: '#d7ff3a', n: 'Volt' },
  { c: '#8fd3ff', n: 'Ice' },
  { c: '#2b2b2e', n: 'Asphalt' },
  { c: '#efe8dc', n: 'Bone' },
  { c: '#7a5cff', n: 'Ultraviolet' },
];

export function Configurator() {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const { ref, near } = useNear<HTMLDivElement>();
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<ObjectScene | null>(null);
  const [colour, setColour] = useState(COLOURS[0]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const obj = (c: string): StudioObject => ({
    id: 'cfg',
    title: 'Runner',
    source: { kind: 'model', assetId: 'cfg' },
    variants: [{ id: 'v', name: 'Colour', base: 'clay', baseColor: '#f2efe9', topColor: c, blend: 0.5, softness: 0.3, roughness: 0.55, gloss: 0.2, finish: 'tint', tint: 1 }],
    variantId: 'v',
    light: { preset: 'softbox', angle: -30, intensity: 1.05 },
    camera: { lens: 70 },
    background: { kind: 'transparent', color: '#000000' },
    turntable: { seconds: 16 },
    createdAt: 0,
    updatedAt: 0,
  });
  useEffect(() => {
    if (!near || !canvas.current) return;
    let s: ObjectScene | null = null;
    let dead = false;
    import('../studio/scene')
      .then(({ createObjectScene }) => {
        if (dead) return;
        s = createObjectScene(canvas.current!, { pixelRatio: isLite() ? 0.75 : Math.min(window.devicePixelRatio, 1.5) });
        scene.current = s;
        return s.setObject(obj(colour.c), '/projects/stride/obj/runner-orange.glb').then(() => {
          if (dead) return;
          s!.setTurntable(!reduce, 16);
          setReady(true);
        });
      })
      .catch(() => setFailed(true));
    return () => {
      dead = true;
      s?.dispose();
      scene.current = null;
    };
  }, [near]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (ready) scene.current?.setVariant(obj(colour.c).variants[0]);
  }, [colour, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="lg-dark relative isolate overflow-hidden bg-[#121418]" aria-label={t('Recolour it yourself')}>
      <div className="mx-auto grid max-w-[1360px] items-center gap-8 px-5 py-24 sm:px-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div ref={ref} className="relative aspect-square w-full overflow-hidden rounded-[32px]" style={{ background: `radial-gradient(circle at 50% 45%, ${colour.c}55, #121418 70%)`, transition: 'background .6s' }}>
          <canvas ref={canvas} className="absolute inset-0 h-full w-full touch-none" aria-label={t('The runner in 3D: drag to turn it')} style={{ opacity: ready ? 1 : 0, transition: 'opacity .6s' }} />
          {(!ready || failed) && <img src="/projects/stride/obj/runner-orange.webp" alt="" className="absolute inset-0 h-full w-full object-contain p-10" style={{ opacity: failed ? 1 : 0.6 }} />}
          {ready && (
            <span className="lg-glass pointer-events-none absolute bottom-4 start-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold">
              <MousePointer2 size={13} /> {t('Drag to turn it')}
            </span>
          )}
        </div>
        <div>
          <p className="lg-label">{t('Try it')}</p>
          <h2 className="mt-2 text-[clamp(34px,4.4vw,60px)] font-extrabold leading-[0.98] tracking-[-0.04em]">{t('Recolour the runner. Every colourway, live.')}</h2>
          <p className="mt-4 max-w-[46ch] text-[16.5px] leading-[1.55] text-white/75">{t('This is the studio itself: the same 3D object, the same recolour that keeps the texture’s light and shade. In a project, each colourway is a version the client can compare and approve.')}</p>
          <div className="mt-7 flex flex-wrap gap-2.5" role="radiogroup" aria-label={t('Colourway')}>
            {COLOURS.map((x) => (
              <button key={x.c} type="button" role="radio" aria-checked={colour.c === x.c} onClick={() => setColour(x)} className={`flex min-h-[44px] items-center gap-2 rounded-full py-1.5 pe-4 ps-1.5 text-[13.5px] font-bold transition-colors ${colour.c === x.c ? 'bg-white text-[#11151a]' : 'lg-glass hover:bg-white/15'}`}>
                <span className="h-8 w-8 rounded-full ring-1 ring-black/10" style={{ background: x.c }} /> {t(x.n)}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => go('/s/stride')} className="lg-btn lg-btn-primary mt-8 min-h-[52px] px-6 text-[15px]">
            {t('Open it in the studio')} <ArrowRight size={17} className="rtl:-scale-x-100" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ───────── before → after, with the client's words between ───────── */
export function BeforeAfter() {
  const { t } = useI18n();
  const [x, setX] = useState(52);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const at = (cx: number) => {
    const r = box.current!.getBoundingClientRect();
    const v = ((cx - r.left) / r.width) * 100;
    setX(Math.max(2, Math.min(98, document.documentElement.dir === 'rtl' ? v : v)));
  };
  return (
    <section className="relative isolate bg-[#f4f0ea] text-[#1d1b18]" aria-label={t('Before and after')}>
      <div className="mx-auto max-w-[1360px] px-5 py-24 sm:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[13px] font-extrabold tracking-[0.14em] text-[#b8875a]">HALDEN · WEBSITE REDESIGN</p>
            <h2 className="mt-3 max-w-[760px] text-[clamp(34px,4.6vw,62px)] font-extrabold leading-[0.98] tracking-[-0.04em]">{t('Version one, version two — and what the client said in between.')}</h2>
          </div>
          <button type="button" onClick={() => go('/p/halden?s=review')} className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[#1d1b18] px-5 text-[14.5px] font-bold text-[#ffffff]">
            {t('Open the review')} <ArrowRight size={16} className="rtl:-scale-x-100" />
          </button>
        </div>
        <div
          ref={box}
          dir="ltr"
          className="relative mt-10 aspect-[16/10] w-full touch-none select-none overflow-hidden rounded-[28px] bg-[#ddd5ca] shadow-[0_40px_90px_-40px_rgba(0,0,0,.5)]"
          onPointerDown={(e) => {
            drag.current = true;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            at(e.clientX);
          }}
          onPointerMove={(e) => drag.current && at(e.clientX)}
          onPointerUp={() => (drag.current = false)}
        >
          <img src="/projects/halden/s-home.webp" alt={t('After: the redesign')} className="absolute inset-0 h-full w-full object-cover object-top" draggable={false} />
          <img src="/projects/halden/s-home-v1.webp" alt={t('Before: the 2014 site')} className="absolute inset-0 h-full w-full object-cover object-top" style={{ clipPath: `inset(0 ${100 - x}% 0 0)` }} draggable={false} />
          <div className="absolute inset-y-0 w-[3px] bg-[#ffffff] shadow-[0_0_0_1px_rgba(0,0,0,.15)]" style={{ left: `${x}%` }}>
            <span className="absolute top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffffff] shadow-[0_10px_30px_-8px_rgba(0,0,0,.5)]" style={{ left: 1.5 }}>
              <span className="absolute inset-0 flex items-center justify-center text-[18px] font-bold text-[#1d1b18]">⇆</span>
            </span>
          </div>
          <span className="absolute start-4 top-4 rounded-full bg-black/60 px-3 py-1 text-[12px] font-bold text-[#ffffff]">v1 · 2014</span>
          <span className="absolute end-4 top-4 rounded-full bg-[#ffffffe6] px-3 py-1 text-[12px] font-bold text-[#1d1b18]">v2</span>
          <input type="range" min={2} max={98} value={x} onChange={(e) => setX(+e.target.value)} aria-label={t('Compare the two versions')} className="absolute inset-x-0 bottom-0 h-8 w-full cursor-ew-resize opacity-0 focus:opacity-100" />
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {[
            { v: 'v1', who: 'Jens H. · Owner', text: 'This is what we have today. Customers say it looks like a discount store.' },
            { v: 'v2', who: 'Jens H. · Owner', text: 'Yes. That headline is us. Can "Visit the workshop" open the booking for Saturday tours?' },
          ].map((c) => (
            <div key={c.v} className="flex gap-3 rounded-[20px] bg-[#ffffff] p-4 text-[#1d1b18] shadow-[0_10px_30px_-20px_rgba(0,0,0,.35)]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1d1b18] text-[#ffffff]">
                <MessageSquare size={15} />
              </span>
              <div>
                <p className="text-[12.5px] font-bold text-[#7a7268]">
                  {c.who} · {c.v}
                </p>
                <p className="mt-0.5 text-[15.5px] leading-[1.45]">“{t(c.text)}”</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── eight demo projects ───────── */
const DEMOS = [
  { id: 'form-01', title: 'FORM / 01', kind: 'Object identity', frames: ['/projects/form-01/form-v2-sm.webp', '/projects/form-01/form-clay-sm.webp', '/projects/form-01/form-poster-sm.webp'] },
  { id: 'stride', title: 'STRIDE', kind: 'Sneaker launch', frames: ['/projects/stride/hero-sm.webp', '/projects/stride/obj/runner-orange.webp', '/projects/stride/obj/runner-mono.webp', '/projects/stride/obj/court-high.webp'] },
  { id: 'halo', title: 'HALO', kind: 'Audio product', frames: ['/projects/halo/hero-sm.webp', '/projects/halo/colorways-sm.webp', '/projects/halo/buds-sm.webp'] },
  { id: 'ritual', title: 'Ritual', kind: 'Coffee brand', frames: ['/projects/ritual/identity-sm.webp', '/projects/ritual/bag-sm.webp', '/projects/ritual/latte-sm.webp'] },
  { id: 'wavelength', title: 'Wavelength', kind: 'Mobile app', frames: ['/projects/wavelength/s-today-sm.webp', '/projects/wavelength/s-welcome-sm.webp', '/projects/wavelength/s-spot-sm.webp'] },
  { id: 'halden', title: 'Halden', kind: 'Website redesign', frames: ['/projects/halden/s-home-sm.webp', '/projects/halden/s-product-sm.webp', '/projects/halden/room-sm.webp'] },
  { id: 'velo', title: 'Velo', kind: 'Launch film', frames: ['/projects/velo/tunnel-sm.webp', '/projects/velo/street-sm.webp', '/projects/velo/bridge-sm.webp', '/projects/velo/wheel-sm.webp'] },
  { id: 'saltwater', title: 'Saltwater', kind: 'Bakery identity', frames: ['/projects/saltwater/shop-sm.webp', '/projects/saltwater/bag-sm.webp', '/projects/saltwater/cards-sm.webp'] },
];

function DemoTile({ d, i }: { d: (typeof DEMOS)[number]; i: number }) {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const [f, setF] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  const start = () => {
    if (reduce) return;
    window.clearInterval(timer.current);
    timer.current = window.setInterval(() => setF((n) => (n + 1) % d.frames.length), 650);
  };
  const stop = () => {
    window.clearInterval(timer.current);
    setF(0);
  };
  useEffect(() => () => window.clearInterval(timer.current), []);
  return (
    <motion.button
      type="button"
      onClick={() => go(`/p/${d.id}`)}
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocus={start}
      onBlur={stop}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: lgEase, delay: (i % 4) * 0.06 }}
      className="group relative block aspect-[4/5] overflow-hidden rounded-[24px] text-start ring-1 ring-white/10 focus-visible:ring-2 focus-visible:ring-white"
    >
      {d.frames.map((src, k) => (
        <img key={src} src={src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-500 group-hover:scale-[1.03]" style={{ opacity: k === f ? 1 : 0 }} />
      ))}
      <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
      <span className="absolute inset-x-4 bottom-4">
        <span className="block text-[20px] font-extrabold leading-tight text-white">{d.title}</span>
        <span className="block text-[13px] font-semibold text-white/75">{t(d.kind)}</span>
      </span>
      <span className="absolute end-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        {d.frames.map((_, k) => (
          <span key={k} className={`h-1.5 w-1.5 rounded-full ${k === f ? 'bg-white' : 'bg-white/40'}`} />
        ))}
      </span>
    </motion.button>
  );
}

export function DemoGallery() {
  const { t } = useI18n();
  return (
    <section className="lg-dark relative isolate bg-[#0f1114]" aria-label={t('Eight demo projects')}>
      <div className="mx-auto max-w-[1360px] px-5 py-24 sm:px-10">
        <Pane className="inline-flex rounded-full px-3 py-1.5 text-[12.5px] font-bold">{t('Eight demo projects')}</Pane>
        <h2 className="mt-4 max-w-[820px] text-[clamp(34px,4.6vw,62px)] font-extrabold leading-[0.98] tracking-[-0.04em]">{t('Products, spaces, apps, sites, films and brands — open any of them.')}</h2>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {DEMOS.map((d, i) => (
            <DemoTile key={d.id} d={d} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
