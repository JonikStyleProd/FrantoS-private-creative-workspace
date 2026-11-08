import React, { Suspense, lazy, useEffect } from 'react';
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'framer-motion';
import './f2.css';
import { parse, useHash } from './route';
import { useCopy } from './copy';
import { Landing as AfterHoursLanding } from './Landing';
import { Studio } from './Studio';
import { Present } from './Present';
import { Toaster } from './ws/kit';
import { UploadTray } from './ws/uploads';

// Each surface is loaded when someone opens it.
const LegacyApp = lazy(() => import('../App').then((m) => ({ default: m.App })));
const BehindTheWork = lazy(() => import('./landing/BehindTheWork').then((m) => ({ default: m.BehindTheWork })));
const Home = lazy(() => import('./ws/Home').then((m) => ({ default: m.Home })));
const ProjectPage = lazy(() => import('./ws/Project').then((m) => ({ default: m.ProjectPage })));
const Show = lazy(() => import('./ws/Show').then((m) => ({ default: m.Show })));

const TITLES: Record<string, string> = {
  landing: 'FrantoS — the private workspace behind the work',
  afterhours: 'After Hours / Tel Aviv — FrantoS',
  story: 'After Hours / Tel Aviv — FrantoS',
  studio: 'Demo story editor — FrantoS',
  present: 'After Hours / Tel Aviv — FrantoS',
  legacy: 'FrantoS — Private Creative Workspace (v1)',
  app: 'Workspace — FrantoS',
  project: 'Project — FrantoS',
  pshow: 'Presentation — FrantoS',
};

const Blank = ({ dark }: { dark?: boolean }) => <div className={`fixed inset-0 ${dark ? 'bg-[#0e0e10]' : 'bg-[#eee8dd]'}`} />;

export function Root() {
  const hash = useHash();
  const route = parse(hash);
  const { lang } = useCopy();

  useEffect(() => {
    document.title = TITLES[route.name];
    document.documentElement.lang = lang;
  }, [route.name, lang]);

  useEffect(() => {
    document.body.style.background = route.name === 'legacy' ? '' : '#eee8dd';
  }, [route.name]);

  if (route.name === 'legacy') {
    return (
      <Suspense fallback={<div className="fixed inset-0 bg-[#07080E]" />}>
        <LegacyApp />
      </Suspense>
    );
  }

  // Overlays (presentation, story playback) sit on top of the screen they belong to,
  // so the work can travel between the two and come back.
  let baseKey = '';
  let base: React.ReactNode = null;
  let overlay: React.ReactNode = null;
  switch (route.name) {
    case 'landing':
      baseKey = 'landing';
      base = <BehindTheWork />;
      break;
    case 'afterhours':
    case 'story':
      baseKey = 'afterhours';
      base = <AfterHoursLanding receded={route.name === 'story'} />;
      if (route.name === 'story') overlay = <Present key="ah-present" mode="viewer" slide={route.slide} />;
      break;
    case 'studio':
    case 'present':
      baseKey = 'studio';
      base = <Studio />;
      if (route.name === 'present') overlay = <Present key="ah-present" mode="editor" slide={route.slide} />;
      break;
    case 'app':
      baseKey = 'app';
      base = <Home />;
      break;
    case 'project':
      baseKey = `p-${route.id}`;
      base = <ProjectPage id={route.id} tab={route.tab} sub={route.sub} q={route.q} />;
      break;
    case 'pshow':
      baseKey = `p-${route.id}`;
      base = <ProjectPage id={route.id} tab={route.mode === 'story' ? 'stories' : 'overview'} q={new URLSearchParams()} />;
      overlay = <Show key="pshow" id={route.id} mode={route.mode} slide={route.slide} />;
      break;
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="f2" lang={lang}>
        <LayoutGroup>
          <AnimatePresence initial={false}>
            <motion.div
              key={baseKey}
              layoutScroll
              className="f2-scroll fixed inset-0 overflow-y-auto overflow-x-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.25, delay: 0.1 } }}
              transition={{ duration: 0.3 }}
              aria-hidden={overlay ? true : undefined}
              inert={overlay ? true : undefined}
            >
              <Suspense fallback={<Blank />}>{base}</Suspense>
            </motion.div>
          </AnimatePresence>
          <AnimatePresence>{overlay && <Suspense fallback={<Blank dark />}>{overlay}</Suspense>}</AnimatePresence>
        </LayoutGroup>
        <Toaster />
        <UploadTray />
      </div>
    </MotionConfig>
  );
}
