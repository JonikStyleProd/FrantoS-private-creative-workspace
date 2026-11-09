import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { ArrowRight, Box, Film, Image as ImageIcon, Layers } from 'lucide-react';
import { useI18n } from '../i18n';
import { go } from '../route';
import { useQuality } from './perf';
import { lgEase } from './kit';

/* ─────────────────────────── the liquid lens ───────────────────────────
 * The hero image sits behind frosted glass. Where you look, a lens of clear glass passes over it:
 * the picture turns sharp and a little closer under it. On touch screens the lens drifts by itself.
 * Reduced motion or lite graphics: the lens rests over the object, nothing moves.
 */
export function LensStage({ src, alt, id }: { src: string; alt: string; id: string }) {
  const reduce = useReducedMotion();
  const { lite } = useQuality();
  const root = useRef<HTMLDivElement>(null);
  const still = reduce || lite;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const home = { x: 0.6, y: 0.46 };
    const cur = { ...home };
    const target = { ...home };
    let lastMove = 0;
    let raf = 0;
    const set = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      el.style.setProperty('--lx', `${cur.x * w}px`);
      el.style.setProperty('--ly', `${cur.y * h}px`);
      el.style.setProperty('--lr', `${Math.max(110, Math.min(200, w * 0.13))}px`);
    };
    set();
    if (still) {
      const ro = new ResizeObserver(set);
      ro.observe(el);
      return () => ro.disconnect();
    }
    const host = el.parentElement!;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      target.x = (e.clientX - r.left) / r.width;
      target.y = (e.clientY - r.top) / r.height;
      lastMove = performance.now();
    };
    host.addEventListener('pointermove', move);
    const tick = (now: number) => {
      // no pointer for a while: the lens wanders slowly around the object
      if (now - lastMove > 2600) {
        const s = now / 1000;
        target.x = home.x + Math.sin(s * 0.35) * 0.13;
        target.y = home.y + Math.sin(s * 0.53 + 1) * 0.12;
      }
      cur.x += (target.x - cur.x) * 0.12;
      cur.y += (target.y - cur.y) * 0.12;
      set();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      host.removeEventListener('pointermove', move);
    };
  }, [still]);

  return (
    <div ref={root} className="lens-stage pointer-events-none absolute inset-0 overflow-hidden bg-[var(--lg-bg)]" aria-hidden={alt ? undefined : true}>
      <AnimatePresence initial={false}>
        <motion.div key={id} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.1, ease: lgEase }}>
          {/* frosted: the whole picture behind glass */}
          <img src={src} alt={alt} className={`absolute inset-0 h-full w-full object-cover ${lite ? '' : 'lens-frost'}`} />
          {/* clear: what the lens shows */}
          <img src={src} alt="" className="lens-clear absolute inset-0 h-full w-full object-cover" />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,12,16,.62)_0%,rgba(10,12,16,.25)_45%,rgba(10,12,16,0)_70%)] rtl:bg-[linear-gradient(270deg,rgba(10,12,16,.62)_0%,rgba(10,12,16,.25)_45%,rgba(10,12,16,0)_70%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/50 to-transparent" />
      <span className="lens-ring" />
    </div>
  );
}

/* ─────────────────────────── assemble: references → board → object ───────────────────────────
 * A pinned scene driven by scroll. Eight references fall out of a pile into a moodboard,
 * the moodboard folds into the poster, the poster steps aside for the object turning in 3D.
 */
const P = '/projects/form-01/';
const TILES = ['ref-travertine', 'ref-glaze', 'ref-silk', 'ref-window', 'ref-sketch', 'ref-hotspot', 'form-clay', 'form-v1'].map((n) => `${P}${n}-sm.webp`);
const SCATTER = [
  [-0.42, -0.3, -14],
  [0.36, -0.36, 9],
  [-0.1, 0.42, 6],
  [0.46, 0.22, -8],
  [-0.46, 0.26, 12],
  [0.08, -0.46, -5],
  [0.24, 0.46, 15],
  [-0.24, -0.06, -10],
];

export function Assemble() {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const [phase, setPhase] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  // pages scroll inside the route's own container, not the window
  const scroller = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    let el = ref.current?.parentElement ?? null;
    while (el && !/(auto|scroll)/.test(getComputedStyle(el).overflowY)) el = el.parentElement;
    scroller.current = el;
  }, []);
  const { scrollYProgress } = useScroll({ target: ref, container: scroller as React.RefObject<HTMLElement>, offset: ['start start', 'end end'] });
  useMotionValueEvent(scrollYProgress, 'change', (v) => setPhase(v < 0.36 ? 0 : v < 0.66 ? 1 : 2));
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (phase === 2 || reduce) v.play().catch(() => undefined);
    else v.pause();
  }, [phase, reduce]);

  const steps = [
    { k: t('Collect'), title: t('Pick up what caught your eye'), text: t('Pictures, stone, a sketch, a light you liked. They land in the project as references.') },
    { k: t('Compose'), title: t('Fold them into one board'), text: t('The palette comes from the references; the board takes the cover, the title and the colours.') },
    { k: t('Turn it in 3D'), title: t('Put the object in a showroom'), text: t('Materials from the same palette, a stand, a light, a turntable — and a link to send.') },
  ];

  if (reduce)
    return (
      <section className="relative mx-auto grid max-w-[1360px] gap-6 px-5 py-24 sm:px-10 md:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.k} className="lg-glass overflow-hidden rounded-[26px]">
            {i === 2 ? <video src={`${P}form-loop.mp4`} poster={`${P}form-loop-poster.webp`} muted loop playsInline className="aspect-[4/5] w-full object-cover" /> : <img src={i === 0 ? TILES[0] : `${P}form-poster-sm.webp`} alt="" className="aspect-[4/5] w-full object-cover" />}
            <div className="p-5">
              <p className="lg-label">0{i + 1} · {s.k}</p>
              <p className="mt-2 text-[20px] font-bold">{s.title}</p>
              <p className="mt-1 text-[14.5px] text-white/75">{s.text}</p>
            </div>
          </div>
        ))}
      </section>
    );

  const tile = Math.min(size.w * 0.17, size.h * 0.26, 220);
  const th = tile * 1.25;
  const gap = tile * 0.08;
  return (
    <section ref={ref} className="relative h-[340vh]" aria-label={t('From references to the object')}>
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_45%,#3a2a20_0%,#15110e_55%,#0b0a09_100%)]" />
        <div className="relative z-10 mx-auto grid h-full w-full max-w-[1360px] grid-cols-1 items-center gap-6 px-5 sm:px-10 lg:grid-cols-[360px_minmax(0,1fr)]">
          {/* the words follow the phase */}
          <div className="order-2 pb-8 lg:order-1 lg:pb-0">
            <ol className="flex gap-2 lg:mb-6" aria-hidden>
              {steps.map((s, i) => (
                <li key={s.k} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= phase ? 'bg-white' : 'bg-white/20'}`} />
              ))}
            </ol>
            <AnimatePresence mode="wait">
              <motion.div key={phase} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45, ease: lgEase }} className="mt-4">
                <p className="lg-label">
                  0{phase + 1} · {steps[phase].k}
                </p>
                <h3 className="mt-2 text-[clamp(26px,3vw,42px)] font-extrabold leading-[1.02] tracking-[-0.035em]">{steps[phase].title}</h3>
                <p className="mt-3 max-w-[40ch] text-[16px] leading-[1.55] text-white/78">{steps[phase].text}</p>
              </motion.div>
            </AnimatePresence>
          </div>
          <div ref={stage} className="relative order-1 h-[62svh] lg:order-2 lg:h-[82svh]">
            {TILES.map((src, i) => (
              <Tile key={src} src={src} i={i} p={scrollYProgress} size={size} tile={tile} th={th} gap={gap} />
            ))}
            <Poster p={scrollYProgress} size={size} th={th} />
            <Turntable p={scrollYProgress} size={size} th={th} video={video} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Tile({ src, i, p, size, tile, th, gap }: { src: string; i: number; p: MotionValue<number>; size: { w: number; h: number }; tile: number; th: number; gap: number }) {
  const [sx, sy, sr] = SCATTER[i];
  const col = i % 4;
  const row = Math.floor(i / 4);
  const gx = (col - 1.5) * (tile + gap);
  const gy = (row - 0.5) * (th + gap);
  const x = useTransform(p, [0, 0.3, 0.42, 0.55], [sx * size.w, gx, gx, 0]);
  const y = useTransform(p, [0, 0.3, 0.42, 0.55], [sy * size.h, gy, gy, 0]);
  const rotate = useTransform(p, [0, 0.3], [sr, 0]);
  const scale = useTransform(p, [0, 0.3, 0.42, 0.55], [1.15, 1, 1, 0.5]);
  const opacity = useTransform(p, [0, 0.04, 0.48, 0.56], [0, 1, 1, 0]);
  return (
    <motion.img
      src={src}
      alt=""
      loading="lazy"
      style={{ x, y, rotate, scale, opacity, width: tile, height: th, left: '50%', top: '50%', marginLeft: -tile / 2, marginTop: -th / 2 }}
      className="absolute rounded-[10px] object-cover shadow-[0_24px_60px_rgba(0,0,0,.45)] ring-1 ring-white/10"
    />
  );
}

function Poster({ p, size, th }: { p: MotionValue<number>; size: { w: number; h: number }; th: number }) {
  const h = Math.min(size.h * 0.86, th * 2.6);
  const w = h * 0.8;
  const scale = useTransform(p, [0.46, 0.6, 0.72, 0.86], [0.4, 1, 1, 0.62]);
  const x = useTransform(p, [0.72, 0.86], [0, -Math.min(size.w * 0.26, w * 0.62)]);
  const opacity = useTransform(p, [0.46, 0.56], [0, 1]);
  const rotate = useTransform(p, [0.72, 0.86], [0, -4]);
  return (
    <motion.img
      src={`${P}form-poster.webp`}
      alt=""
      style={{ scale, x, opacity, rotate, width: w, height: h, left: '50%', top: '50%', marginLeft: -w / 2, marginTop: -h / 2 }}
      className="absolute rounded-[8px] object-cover shadow-[0_40px_100px_rgba(0,0,0,.55)]"
    />
  );
}

function Turntable({ p, size, th, video }: { p: MotionValue<number>; size: { w: number; h: number }; th: number; video: React.RefObject<HTMLVideoElement | null> }) {
  const h = Math.min(size.h * 0.8, th * 2.4);
  const w = h * 0.8;
  const opacity = useTransform(p, [0.74, 0.86], [0, 1]);
  const x = useTransform(p, [0.74, 0.9], [w * 0.2, Math.min(size.w * 0.2, w * 0.5)]);
  const scale = useTransform(p, [0.74, 0.9], [0.86, 1]);
  return (
    <motion.div style={{ opacity, x, scale, width: w, height: h, left: '50%', top: '50%', marginLeft: -w / 2, marginTop: -h / 2 }} className="absolute overflow-hidden rounded-[22px] shadow-[0_40px_100px_rgba(0,0,0,.55)] ring-1 ring-white/15">
      <video ref={video} src={`${P}form-loop.mp4`} poster={`${P}form-loop-poster.webp`} muted loop playsInline preload="metadata" className="h-full w-full object-cover" />
      <span className="lg-glass absolute start-3 top-3 flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold">
        <Box size={13} /> 3D
      </span>
    </motion.div>
  );
}

/* ─────────────────────────── the studio, in four modes ─────────────────────────── */
export function StudioModes() {
  const { t } = useI18n();
  const modes = [
    { icon: Box, title: t('3D · Object'), text: t('Shape, materials, stands and light. Renders, turntable video, a showroom with AR.'), img: `${P}form-v2-sm.webp`, to: '/s/form-01?o=o-vessel' },
    { icon: ImageIcon, title: t('Image'), text: t('Crop to every format, grade with looks, cut the background, pick the palette.'), img: `${P}ref-window-sm.webp`, to: '/s/form-01?m=image' },
    { icon: Layers, title: t('Canvas'), text: t('Boards at real sizes, laid out from the project in one click — then present them.'), img: `${P}form-poster-sm.webp`, to: '/s/form-01?m=canvas' },
    { icon: Film, title: t('Motion'), text: t('Camera keyframes, titles and sound. Export MP4 or a GIF.'), img: `${P}form-loop-poster.webp`, to: '/s/form-01?m=motion', video: `${P}form-loop.mp4` },
  ];
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#0b0a09_0%,#16120f_100%)]" />
      <div className="relative z-10 mx-auto max-w-[1360px] px-5 py-24 sm:px-10 sm:py-32">
        <p className="lg-label">{t('The studio')}</p>
        <h2 className="mt-3 max-w-[900px] text-[clamp(34px,4.6vw,64px)] font-extrabold leading-[1] tracking-[-0.04em]">{t('Make it here, then show it from here.')}</h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modes.map((m, i) => (
            <ModeCard key={m.title} {...m} i={i} />
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-2">
          {[
            [t('Library'), '/library'],
            [t('Objects'), '/objects'],
            [t('Templates'), '/templates'],
            [t('Present boards'), '/p/form-01/deck'],
            [t('Brand guide'), '/p/form-01/guide'],
            [t('Portfolio'), '/portfolio'],
          ].map(([l, to]) => (
            <button key={to} type="button" onClick={() => go(to)} className="lg-btn lg-btn-ghost min-h-[42px] text-[14px]">
              {l} <ArrowRight size={14} className="rtl:-scale-x-100" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ModeCard({ icon: Icon, title, text, img, to, video, i }: { icon: React.ElementType; title: string; text: string; img: string; to: string; video?: string; i: number }) {
  const v = useRef<HTMLVideoElement>(null);
  return (
    <motion.button
      type="button"
      onClick={() => go(to)}
      onMouseEnter={() => v.current?.play().catch(() => undefined)}
      onMouseLeave={() => v.current?.pause()}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, ease: lgEase, delay: i * 0.08 }}
      className="group lg-glass overflow-hidden rounded-[26px] text-start focus-visible:ring-2 focus-visible:ring-white"
    >
      <span className="relative block aspect-[4/3] overflow-hidden">
        <img src={img} alt="" className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]" />
        {video && <video ref={v} src={video} muted loop playsInline preload="none" className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />}
      </span>
      <span className="block p-5">
        <span className="flex items-center gap-2 text-[18px] font-extrabold tracking-[-0.02em]">
          <Icon size={17} /> {title}
        </span>
        <span className="mt-2 block text-[14px] leading-[1.5] text-white/75">{text}</span>
      </span>
    </motion.button>
  );
}
