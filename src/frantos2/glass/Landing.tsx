import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Cloud, Languages, Lock, LogIn, MessageSquare, Play, Sparkles } from 'lucide-react';

const CLOUD = AUTH_GATE;
/** a stored studio session (read without loading the cloud client on the landing) */
const signedIn = () => {
  try {
    return Object.keys(localStorage).some((k) => /^sb-.+-auth-token$/.test(k));
  } catch {
    return false;
  }
};
import './glass.css';
import { useI18n } from '../i18n';
import { AUTH_GATE } from '../cloud/config';
import { go } from '../route';
import { Backdrop, Credits, GlassLang, Mark, Pane, ThemeSwitch, lgEase } from './kit';
import { STAGES, STAGE_LABEL, Stage } from './stages';
import { InstallButton } from './install';
import { Assemble, LensStage, StudioModes } from './LandingFx';

const P = '/projects/form-01/';
const AH = '/series/after-hours/';

/** One project, four moments. The landing plays them in order behind the glass. */
const SCENES: Record<Stage, { src: string; alt: string }> = {
  collect: { src: `${P}ref-travertine.webp`, alt: 'Travertine plinth, a reference' },
  make: { src: `${P}form-clay.webp`, alt: 'Clay form study of the vessel' },
  review: { src: `${P}form-v2.webp`, alt: 'Vessel, second version, in review' },
  show: { src: `${P}form-poster.webp`, alt: 'FORM / 01 launch poster' },
};
const HOLD = 5200;

export function GlassLanding() {
  const { t, dir } = useI18n();
  const reduce = useReducedMotion();
  const [stage, setStage] = useState<Stage>('collect');
  const [paused, setPaused] = useState(false);
  const auto = !reduce && !paused;

  useEffect(() => {
    if (!auto) return;
    const id = window.setTimeout(() => setStage((s) => STAGES[(STAGES.indexOf(s) + 1) % STAGES.length]), HOLD);
    return () => window.clearTimeout(id);
  }, [stage, auto]);

  // warm the cache so the crossfades never flash
  useEffect(() => {
    Object.values(SCENES).forEach((s) => {
      const i = new Image();
      i.src = s.src;
    });
  }, []);

  const scene = SCENES[stage];
  const openDemo = () => go('/p/form-01');

  return (
    <div className="lg min-h-full" dir={dir}>
      {/* ───────── hero: the work is the page ───────── */}
      <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
        <LensStage src={scene.src} alt={t(scene.alt)} id={stage} />

        <header className="relative z-10 px-4 pt-4 sm:px-6 sm:pt-5">
          <Pane as="nav" className="mx-auto flex min-w-0 max-w-[1360px] items-center gap-2 rounded-full py-1.5 pe-1.5 ps-4 sm:ps-5" aria-label={t('Main')}>
            <Mark />
            <div className="ms-auto hidden items-center gap-1 md:flex">
              <a href="#how" className="lg-btn lg-btn-plain">
                {t('How it works')}
              </a>
              <a href="#studio" className="lg-btn lg-btn-plain">
                {t('For studios')}
              </a>
              <button type="button" onClick={() => go('/s/form-01')} className="lg-btn lg-btn-plain">
                {t('Studio')}
              </button>
            </div>
            <div className="ms-auto flex min-w-0 shrink-0 items-center gap-1.5 md:ms-2">
              <span className="hidden sm:block">
                <GlassLang />
              </span>
              <span className="hidden sm:contents">
                <ThemeSwitch />
                <InstallButton />
              </span>
              {CLOUD && !signedIn() && (
                <button type="button" onClick={() => go('/login?next=%2Fapp')} className="lg-btn lg-btn-ghost max-sm:!px-2.5" aria-label={t('Sign in')}>
                  <LogIn size={15} /> <span className="max-sm:hidden">{t('Sign in')}</span>
                </button>
              )}
              <button type="button" onClick={() => go('/app')} className="lg-btn lg-btn-primary whitespace-nowrap max-sm:!px-3.5 max-sm:text-[13px]">
                {t('Open workspace')}
              </button>
            </div>
          </Pane>
        </header>

        <div className="relative z-10 mx-auto grid w-full max-w-[1360px] flex-1 grid-cols-1 items-end gap-8 px-5 pb-6 pt-16 sm:px-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:pb-10">
          <div className="max-w-[760px]">
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: lgEase }} className="lg-shadow-text mb-5 inline-flex items-center gap-2 rounded-full lg-soft px-3 py-1.5 text-[12.5px] font-semibold text-white/90">
              <Lock size={13} /> {t('Private creative workspace')}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.9, ease: lgEase, delay: 0.05 }}
              className="lg-shadow-text text-[clamp(42px,6.6vw,96px)] font-extrabold leading-[0.95] tracking-[-0.045em]"
            >
              {t('Your work stays in front.')}
              <br />
              <span className="text-white/80">{t('Everything else is glass.')}</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: lgEase, delay: 0.15 }} className="lg-shadow-text mt-6 max-w-[540px] text-[clamp(16px,1.5vw,19px)] leading-[1.5] text-white/90">
              {t('Collect references, make the piece, hear the client and show the story — on one screen where the image always comes first.')}
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: lgEase, delay: 0.25 }} className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={openDemo} className="lg-btn lg-btn-primary min-h-[52px] px-6 text-[15px]">
                {t('Open the demo project')} <ArrowRight size={17} className="rtl:-scale-x-100" />
              </button>
              <button type="button" onClick={() => go('/o/form-01/o-vessel')} className="lg-btn lg-btn-ghost min-h-[52px] px-6 text-[15px]">
                {t('The object in 3D')}
              </button>
              <button type="button" onClick={() => go('/app')} className="lg-btn lg-btn-plain min-h-[52px] px-5 text-[15px]">
                {t('Start your own')}
              </button>
            </motion.div>
          </div>

          {/* the card changes with the moment behind it */}
          <div className="hidden lg:block">
            <AnimatePresence mode="wait">
              <Pane key={stage} className="rounded-[28px] p-5">
                <SceneCard stage={stage} onOpen={openDemo} />
              </Pane>
            </AnimatePresence>
          </div>
        </div>

        {/* the four moments: click to hold one */}
        <div className="relative z-10 mx-auto w-full max-w-[1360px] px-4 pb-5 sm:px-10 sm:pb-8">
          <div className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-4 sm:gap-3" role="tablist" aria-label={t('Stages of a project')}>
            {STAGES.map((s, i) => {
              const on = s === stage;
              return (
                <button
                  key={s}
                  role="tab"
                  aria-selected={on}
                  onClick={() => (setStage(s), setPaused(true))}
                  className={`relative overflow-hidden min-w-0 rounded-[20px] px-3 py-2.5 text-start transition-colors sm:px-5 sm:py-4 ${on ? 'lg-glass-strong' : 'lg-glass hover:bg-white/10'}`}
                >
                  <span className="block text-[11px] font-bold text-white/70 sm:text-[12px]">0{i + 1}</span>
                  <span className="mt-0.5 block truncate text-[15px] font-bold sm:text-[20px]">{t(STAGE_LABEL[s])}</span>
                  {on && auto && <motion.span key={`bar-${stage}`} aria-hidden className="absolute bottom-0 start-0 h-[3px] bg-white" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: HOLD / 1000, ease: 'linear' }} />}
                  {on && !auto && <span aria-hidden className="absolute bottom-0 start-0 h-[3px] w-full bg-white" />}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────── references → board → object, driven by scroll ───────── */}
      <Assemble />

      {/* ───────── the studio, four modes ───────── */}
      <StudioModes />

      {/* ───────── how it works ───────── */}
      <section id="how" className="relative isolate overflow-hidden">
        <Backdrop src={`${AH}dawn.webp`} tint={0.45} blur />
        <div className="relative z-10 mx-auto max-w-[1360px] px-5 py-24 sm:px-10 sm:py-32">
          <h2 className="max-w-[820px] text-[clamp(34px,4.6vw,64px)] font-extrabold leading-[1] tracking-[-0.04em]">{t('One screen per project. Four moments. Nothing hidden in menus.')}</h2>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            <Feature icon={<Sparkles size={20} />} title={t('The image is the interface')} text={t('Your work fills the screen. References, versions and notes float above it on glass and step aside when you look.')} />
            <Feature icon={<MessageSquare size={20} />} title={t('Notes on the work itself')} text={t('Send a review link. The client pins a note on the exact spot — no account, no email chain. Answer the last note and the piece moves on.')} />
            <Feature icon={<Play size={20} />} title={t('A story you can send')} text={t('The trail of references, versions and decisions becomes a story and a case page. Private until you publish it.')} />
          </div>
        </div>
      </section>

      {/* ───────── for studios ───────── */}
      <section id="studio" className="relative isolate overflow-hidden">
        <Backdrop src={`${AH}reflections.webp`} tint={0.5} blur />
        <div className="relative z-10 mx-auto grid max-w-[1360px] gap-4 px-5 py-24 sm:px-10 md:grid-cols-3">
          <div className="md:col-span-3">
            <h2 className="text-[clamp(30px,3.6vw,48px)] font-extrabold tracking-[-0.035em]">{t('Yours first, your studio when you want.')}</h2>
          </div>
          <Feature icon={<Lock size={20} />} title={t('Private by default')} text={t('Projects live in this browser and work offline. Nothing is published until you choose to.')} />
          <Feature icon={<Cloud size={20} />} title={t('Sync with your studio')} text={t('Sign in with your email to keep projects in a private studio, with roles for owner, editor and viewer.')} />
          <Feature icon={<Languages size={20} />} title="English · Русский · עברית" text={t('Every screen in three languages, right-to-left included.')} />
          <div className="mt-8 flex flex-wrap items-center gap-3 md:col-span-3">
            <button type="button" onClick={openDemo} className="lg-btn lg-btn-primary min-h-[52px] px-6 text-[15px]">
              {t('Open the demo project')} <ArrowRight size={17} className="rtl:-scale-x-100" />
            </button>
            <span className="sm:hidden">
              <GlassLang />
            </span>
          </div>
        </div>
        <footer className="relative z-10 mx-auto max-w-[1360px] border-t border-white/15 px-5 py-8 sm:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4 text-[13px] text-white/75">
            <Mark size={16} />
            <span>{t('Collect. Make. Review. Show.')}</span>
            <a href="#/after-hours" className="underline-offset-4 hover:underline">
              After Hours / Tel Aviv
            </a>
          </div>
          <Credits className="mt-6" />
        </footer>
      </section>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.7, ease: lgEase }} className="lg-glass rounded-[26px] p-6">
      <span className="flex h-11 w-11 items-center justify-center rounded-full lg-soft">{icon}</span>
      <h3 className="mt-5 text-[20px] font-bold tracking-[-0.01em]">{title}</h3>
      <p className="mt-2 text-[15px] leading-[1.55] text-white/80">{text}</p>
    </motion.div>
  );
}

function SceneCard({ stage, onOpen }: { stage: Stage; onOpen: () => void }) {
  const { t } = useI18n();
  if (stage === 'collect')
    return (
      <div className="space-y-3">
        <p className="lg-label">{t('01 · Collect')}</p>
        <p className="text-[18px] font-bold">{t('Travertine plinth')}</p>
        <p className="text-[14px] leading-[1.5] text-white/85">{t('Warm stone with open pores — the base should feel quarried, not cast.')}</p>
        <div className="flex h-7 overflow-hidden rounded-[10px]" aria-label={t('Palette')}>
          {['#d9c6a8', '#c2a983', '#a8875f', '#e8ddc9', '#8a6b4a'].map((c) => (
            <span key={c} className="flex-1" style={{ background: c }} />
          ))}
        </div>
        <p className="text-[12.5px] text-white/70">{t('Shaped → the base of the vessel')}</p>
      </div>
    );
  if (stage === 'make')
    return (
      <div className="space-y-3">
        <p className="lg-label">{t('02 · Make')}</p>
        <p className="text-[18px] font-bold">{t('Form study · clay')}</p>
        <p className="text-[14px] leading-[1.5] text-white/85">{t('Form first: rounded square, 225° of twist, no material yet.')}</p>
        <div className="flex gap-2 text-[12.5px]">
          <span className="rounded-full lg-soft px-3 py-1.5">clay</span>
          <span className="rounded-full lg-soft px-3 py-1.5">v1</span>
          <span className="rounded-full bg-white px-3 py-1.5 font-bold text-[#11151a]">v2</span>
        </div>
      </div>
    );
  if (stage === 'review')
    return (
      <div className="space-y-3">
        <p className="lg-label">{t('03 · Review')}</p>
        <div className="flex items-start gap-3">
          <span className="lg-pin shrink-0" data-active="true">
            1
          </span>
          <div>
            <p className="text-[13px] font-bold text-white/80">Mara K. · AD</p>
            <p className="mt-1 text-[15px] leading-[1.45]">{t('Shadow side could go one stop deeper here — the mass is a bit polite.')}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onOpen} className="lg-btn lg-btn-ghost">
            {t('Reply')}
          </button>
          <button type="button" onClick={onOpen} className="lg-btn lg-btn-primary">
            {t('Open review')}
          </button>
        </div>
      </div>
    );
  return (
    <div className="space-y-3">
      <p className="lg-label">{t('04 · Show')}</p>
      <p className="text-[18px] font-bold">{t('FORM / 01 — the story')}</p>
      <p className="text-[14px] leading-[1.5] text-white/85">{t('Five frames from the first sketch to the launch poster, built from the trail.')}</p>
      <button type="button" onClick={() => go('/p/form-01/stories/play/0')} className="lg-btn lg-btn-primary w-full">
        <Play size={15} /> {t('Play the story')}
      </button>
    </div>
  );
}
