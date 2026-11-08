import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Play } from 'lucide-react';
import { COVER_CHOICES, FRAMES, FRAME_BY_ID, FrameId, STORY_META } from './data';
import { demo, useDemo } from './store';
import { go } from './route';
import { useCopy } from './copy';
import { CoverArt, CropMarks, FrameImg, FrameNo, Wordmark } from './ui';

const ease = [0.22, 1, 0.36, 1] as const;

export function Landing({ receded = false }: { receded?: boolean }) {
  const { c, lang, toggleLanguage } = useCopy();
  const { state } = useDemo();
  const cover = state.cover;
  const fragments = state.story.filter((id) => id !== cover).slice(0, 3);
  const meta = c.frames(state.story.length);

  return (
    <div className="f2-paper min-h-full">
      {/* NAV */}
      <motion.header
        exit={{ opacity: 0 }}
        className="mx-auto flex max-w-[1360px] items-center justify-between px-5 pt-5 md:px-10 md:pt-7"
      >
        <a href="#/" aria-label="FrantoS" className="rounded-sm">
          <Wordmark />
        </a>
        <nav className="flex items-center gap-2 md:gap-5">
          <span className="f2-mono hidden text-[var(--ink-2)] md:inline">{c.tagline}</span>
          <button
            onClick={toggleLanguage}
            className="f2-mono rounded-full px-3 py-2 text-[var(--ink-2)] hover:text-[var(--ink)]"
            aria-label={lang === 'ru' ? 'Switch to English' : 'Переключить на русский'}
          >
            <span className={lang === 'en' ? 'text-[var(--ink)]' : ''}>EN</span> / <span className={lang === 'ru' ? 'text-[var(--ink)]' : ''}>RU</span>
          </button>
          <button onClick={() => go('/studio')} className="f2-btn f2-btn-ghost hidden !min-h-[40px] !px-4 !text-[14px] sm:inline-flex">
            {c.openDemo}
          </button>
        </nav>
      </motion.header>

      {/* HERO */}
      <section className="mx-auto grid max-w-[1360px] grid-cols-1 gap-y-7 px-5 pb-16 pt-6 md:px-10 md:pt-8 lg:min-h-[calc(100dvh-90px)] lg:grid-cols-12 lg:items-center lg:gap-x-10 lg:pb-20 lg:pt-4">
        <motion.div
          className="lg:col-span-7"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -24, transition: { duration: 0.3 } }}
          transition={{ duration: 0.7, ease }}
        >
          <p className="f2-mono mb-5 flex items-center gap-3 text-[var(--ink-2)] md:mb-7">
            <span className="inline-block h-px w-8 bg-[var(--ink)]" />
            {STORY_META.title} · {STORY_META.year}
          </p>
          <h1 className={`f2-display ${lang === 'ru' ? 'text-[clamp(2.6rem,5.4vw,5.6rem)]' : 'text-[clamp(3.1rem,7.6vw,7.6rem)]'}`}>
            <span className="block">{c.heroTitle[0]}</span>
            <span className="block italic">
              {c.heroTitle[1].replace(/\.$/, '')}
              <span style={{ color: 'var(--signal)' }}>.</span>
            </span>
          </h1>
          <p className="mt-6 hidden max-w-[34rem] text-[17px] leading-relaxed text-[var(--ink-2)] md:block">{c.heroLead}</p>
          <div className="mt-8 hidden flex-wrap items-center gap-x-6 gap-y-4 lg:flex">
            <button onClick={() => go('/studio')} className="f2-btn f2-btn-signal">
              {c.openDemo}
              <ArrowRight size={18} strokeWidth={2} />
            </button>
            <button onClick={() => go('/story')} className="f2-link inline-flex items-center gap-2 text-[15px] font-medium">
              <Play size={14} fill="currentColor" /> {c.watchStory}
            </button>
          </div>
        </motion.div>

        {/* The work: cover = viewer path; fragments around it = raw material */}
        <div className="relative lg:col-span-5">
          <div className="relative mx-auto w-[min(68vw,300px,calc((100svh-390px)*0.8))] translate-x-[8%] sm:w-[340px] lg:w-full lg:max-w-[440px] lg:translate-x-0">
            {fragments.map((id, i) => (
              <Fragment key={id} id={id} i={i} receded={receded} />
            ))}
            <motion.button
              onClick={() => go('/story')}
              className="group relative z-10 block aspect-[4/5] w-full rounded-[4px] text-left text-[var(--ink)] shadow-[0_40px_80px_-30px_rgba(21,19,15,0.55)]"
              aria-label={`${c.watchStory}: ${STORY_META.title}`}
              initial={{ opacity: 0, y: 24, rotate: 1.5 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: 0.9, ease, delay: 0.1 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.985 }}
            >
              <CropMarks inset={-10} size={14} />
              <CoverArt id={cover} title={STORY_META.title} meta={meta} layoutId="cover" eager />
              <span className="pointer-events-none absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--signal)] text-[var(--signal-ink)] transition-transform duration-300 group-hover:scale-110">
                <Play size={16} fill="currentColor" />
              </span>
            </motion.button>
            <motion.p exit={{ opacity: 0 }} className="f2-mono relative z-10 mt-4 hidden text-right sm:block text-[var(--ink-2)]">
              {c.coverHint}
            </motion.p>
          </div>
        </div>

        {/* Mobile / tablet actions sit under the work */}
        <motion.div exit={{ opacity: 0 }} className="flex flex-col gap-4 lg:hidden">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <button onClick={() => go('/studio')} className="f2-btn f2-btn-signal w-full justify-center sm:w-auto">
              {c.openDemo}
              <ArrowRight size={18} />
            </button>
            <button onClick={() => go('/story')} className="f2-link inline-flex items-center gap-2 text-[15px] font-medium">
              <Play size={14} fill="currentColor" /> {c.watchStory}
            </button>
          </div>
          <p className="max-w-[34rem] text-[15px] leading-relaxed text-[var(--ink-2)] md:hidden">{c.heroLead}</p>
        </motion.div>
      </section>

      <motion.div exit={{ opacity: 0, transition: { duration: 0.2 } }}>
        <CoverChooser />
        <Series />
        <Closing />
      </motion.div>
    </div>
  );
}

const FRAG_POS = [
  // left, top, width (in % of the cover), rotation
  { l: '-34%', t: '8%', w: '46%', r: -4 },
  { l: '74%', t: '58%', w: '46%', r: 3 },
  { l: '-26%', t: '70%', w: '36%', r: 2 },
];

function Fragment({ id, i, receded }: { id: FrameId; i: number; receded: boolean }) {
  const p = FRAG_POS[i];
  const f = FRAME_BY_ID[id];
  return (
    <motion.div
      aria-hidden
      className={`absolute z-0 ${i === 2 ? 'hidden lg:block' : ''}`}
      style={{ left: p.l, top: p.t, width: p.w }}
      initial={{ opacity: 0, scale: 0.9, rotate: 0 }}
      animate={receded ? { opacity: 0, scale: 0.86, rotate: p.r } : { opacity: 1, scale: 1, rotate: p.r }}
      exit={{ opacity: 0, scale: 0.86, filter: 'blur(6px)', transition: { duration: 0.35, ease } }}
      transition={{ duration: 0.9, ease, delay: 0.25 + i * 0.08 }}
    >
      <div className="overflow-hidden rounded-[3px] bg-[var(--graphite)] shadow-[0_24px_40px_-24px_rgba(21,19,15,0.6)]" style={{ aspectRatio: f.orientation === 'landscape' ? '3/2' : '4/5' }}>
        <FrameImg id={id} sizes="200px" />
      </div>
      <div className="mt-1.5 hidden justify-between text-[var(--ink-2)] sm:flex">
        <FrameNo n={f.n} className="!text-[9.5px]" />
        <span className="f2-mono !text-[9.5px]">{f.time}</span>
      </div>
    </motion.div>
  );
}

function CoverChooser() {
  const { c, lang } = useCopy();
  const { state } = useDemo();
  const choices = COVER_CHOICES;
  const active = state.cover;

  return (
    <section className="border-t border-[var(--rule)]">
      <div className="mx-auto grid max-w-[1360px] grid-cols-1 gap-10 px-5 py-16 md:px-10 md:py-24 lg:grid-cols-12 lg:gap-x-10">
        <div className="lg:col-span-6">
          <p className="f2-mono text-[var(--ink-2)]">{c.s1Kicker}</p>
          <h2 className="f2-display mt-4 max-w-[14ch] text-[clamp(2.4rem,5vw,4.4rem)]">{c.s1Title}</h2>
          <p className="mt-5 max-w-[30rem] text-[16px] leading-relaxed text-[var(--ink-2)]">{c.s1Lead}</p>

          <div role="radiogroup" aria-label={c.cover} className="mt-9 grid max-w-[520px] grid-cols-3 gap-3 sm:gap-5">
            {choices.map((id) => {
              const f = FRAME_BY_ID[id];
              const on = active === id;
              return (
                <button
                  key={id}
                  role="radio"
                  aria-checked={on}
                  onClick={() => demo.setCover(id)}
                  className="group text-left"
                >
                  <div className="relative aspect-[4/5] rounded-[3px] bg-[var(--graphite)] p-0">
                    <div className="absolute inset-0 overflow-hidden rounded-[3px]">
                      <FrameImg id={id} sizes="180px" className="transition-transform duration-500 group-hover:scale-[1.04]" />
                    </div>
                    <motion.span
                      aria-hidden
                      className="absolute -inset-[5px] rounded-[6px] border-2"
                      initial={false}
                      animate={{ borderColor: on ? 'rgba(255,75,43,1)' : 'rgba(255,75,43,0)', scale: on ? 1 : 0.97 }}
                      transition={{ duration: 0.25 }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <FrameNo n={f.n} className={on ? 'text-[var(--ink)]' : 'text-[var(--ink-2)]'} />
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-[var(--ink)] transition-colors"
                      style={{ background: on ? 'var(--signal)' : 'transparent', borderColor: on ? 'var(--signal)' : undefined }}
                    />
                  </div>
                  <p className="mt-1 truncate text-[14px] font-medium">{f.title[lang]}</p>
                </button>
              );
            })}
          </div>

          <button onClick={() => go('/studio')} className="f2-btn f2-btn-ghost mt-10">
            {c.s1Cta} <ArrowRight size={17} />
          </button>
        </div>

        {/* Result: the cover plus the sequence it opens */}
        <div className="lg:col-span-6">
          <div className="rounded-[6px] bg-[var(--graphite)] p-5 sm:p-8">
            <div className="mx-auto grid max-w-[520px] grid-cols-[1fr] gap-6 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] sm:items-end">
              <div className="relative aspect-[4/5] text-[var(--fog)]">
                <CropMarks inset={-8} />
                <AnimatePresence initial={false}>
                  <motion.div
                    key={active}
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 1.03 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease }}
                  >
                    <CoverArt id={active} title={STORY_META.title} meta={c.frames(state.story.length)} size="tile" sizes="300px" />
                  </motion.div>
                </AnimatePresence>
              </div>
              <div>
                <p className="f2-mono text-[var(--fog)]">{c.story}</p>
                <ol className="mt-3 grid grid-cols-5 gap-1.5 sm:grid-cols-3">
                  {state.story.map((id, i) => (
                    <motion.li layout key={id} className="relative aspect-[4/5] overflow-hidden rounded-[2px]" transition={{ duration: 0.35, ease }}>
                      <FrameImg id={id} sizes="90px" />
                      <span
                        className="absolute left-1 top-1 rounded-[2px] px-1 text-[9px] font-semibold tabular-nums"
                        style={{ background: id === active ? 'var(--signal)' : 'rgba(0,0,0,.55)', color: id === active ? 'var(--signal-ink)' : '#fff' }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </motion.li>
                  ))}
                </ol>
                <p className="mt-4 text-[13px] leading-snug text-[var(--fog)]">{c.storyDek}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Series() {
  const { c, lang } = useCopy();
  return (
    <section className="bg-[var(--graphite)] text-[#f3efe7]">
      <div className="mx-auto max-w-[1360px] px-5 pt-16 md:px-10 md:pt-24">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="f2-mono text-[var(--fog)]">{c.s2Kicker}</p>
            <h2 className="f2-display mt-4 text-[clamp(2.4rem,5vw,4.4rem)]">{c.s2Title}</h2>
          </div>
          <p className="max-w-[26rem] text-[15px] leading-relaxed text-[var(--fog)]">{c.s2Lead}</p>
        </div>
      </div>
      <ol className="f2-noscrollbar mt-10 flex snap-x snap-mandatory scroll-pl-5 gap-5 overflow-x-auto px-5 md:scroll-pl-10 pb-16 md:mt-14 md:gap-8 md:px-10 md:pb-24">
        {FRAMES.map((f) => (
          <li key={f.id} className="shrink-0 snap-start">
            <div className="h-[260px] overflow-hidden rounded-[3px] md:h-[400px]" style={{ aspectRatio: String(f.ratio) }}>
              <FrameImg id={f.id} crop={false} sizes="(max-width:768px) 400px, 620px" />
            </div>
            <div className="mt-3 flex items-baseline gap-4 text-[var(--fog)]">
              <FrameNo n={f.n} />
              <span className="f2-mono">{f.time}</span>
              <span className="f2-mono hidden sm:inline">{f.place[lang]}</span>
            </div>
            <p className="f2-display mt-1 text-[22px] leading-tight">{f.title[lang]}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Closing() {
  const { c } = useCopy();
  return (
    <section>
      <div className="mx-auto max-w-[1360px] px-5 py-20 md:px-10 md:py-28">
        <h2 className="f2-display max-w-[16ch] text-[clamp(2.6rem,6.4vw,6rem)]">{c.s3Title}</h2>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
          <button onClick={() => go('/studio')} className="f2-btn f2-btn-signal">
            {c.openDemo} <ArrowRight size={18} />
          </button>
          <span className="text-[15px] text-[var(--ink-2)]">{c.s3Lead}</span>
        </div>
      </div>
      <footer className="border-t border-[var(--rule)]">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-3 px-5 py-6 text-[var(--ink-2)] md:flex-row md:items-center md:justify-between md:px-10">
          <Wordmark small />
          <p className="text-[12.5px]">{c.credit}</p>
          <a href="#/overview" className="f2-link inline-flex items-center gap-1 text-[13px]">
            {c.legacy} <ArrowUpRight size={14} />
          </a>
        </div>
      </footer>
    </section>
  );
}
