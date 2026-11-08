import React, { Suspense, lazy, useEffect } from 'react';
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'framer-motion';
import './f2.css';
import { parse, useHash } from './route';
import { useCopy } from './copy';
import { Landing } from './Landing';
import { Studio } from './Studio';
import { Present } from './Present';

// The original atelier (three.js, feeds, moodboard) stays reachable by direct link
// and is only downloaded when someone actually opens it.
const LegacyApp = lazy(() => import('../App').then((m) => ({ default: m.App })));

const TITLES: Record<string, string> = {
  landing: 'FrantoS — Collect the fragments. Shape the story.',
  story: 'After Hours / Tel Aviv — FrantoS',
  studio: 'Demo workspace · After Hours / Tel Aviv — FrantoS',
  present: 'After Hours / Tel Aviv — FrantoS',
  legacy: 'FrantoS — Private Creative Workspace',
};

export function Root() {
  const hash = useHash();
  const route = parse(hash);
  const { lang } = useCopy();

  useEffect(() => {
    document.title = TITLES[route.name];
    document.documentElement.lang = lang;
  }, [route.name, lang]);

  // FrantoS 2.0 screens own their background; the legacy app manages <html class="dark">
  useEffect(() => {
    if (route.name !== 'legacy') document.body.style.background = '#eee8dd';
    else document.body.style.background = '';
  }, [route.name]);

  if (route.name === 'legacy') {
    return (
      <Suspense fallback={<div className="fixed inset-0 bg-[#07080E]" />}>
        <LegacyApp />
      </Suspense>
    );
  }

  // Presentation is an overlay on top of the screen it was launched from,
  // so the editor stays mounted underneath and its cover tile can receive the cover back.
  const base = route.name === 'present' || route.name === 'studio' ? 'studio' : 'landing';
  const overlay = route.name === 'present' ? 'editor' : route.name === 'story' ? 'viewer' : null;
  const slide = route.name === 'present' || route.name === 'story' ? route.slide : 0;

  return (
    <MotionConfig reducedMotion="user">
      <div className="f2" lang={lang}>
        <LayoutGroup>
          <AnimatePresence initial={false}>
            <motion.div
              key={base}
              layoutScroll
              className="f2-scroll fixed inset-0 overflow-y-auto overflow-x-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.3, delay: 0.15 } }}
              transition={{ duration: 0.35 }}
              aria-hidden={overlay ? true : undefined}
              inert={overlay ? true : undefined}
            >
              {base === 'landing' ? <Landing receded={overlay === 'viewer'} /> : <Studio />}
            </motion.div>
          </AnimatePresence>
          <AnimatePresence>{overlay && <Present key="present" mode={overlay} slide={slide} />}</AnimatePresence>
        </LayoutGroup>
      </div>
    </MotionConfig>
  );
}
