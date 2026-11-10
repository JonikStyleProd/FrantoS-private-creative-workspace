import React, { Suspense, lazy, useEffect } from 'react';
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'framer-motion';
import './f2.css';
import { go, parse, useHash } from './route';
import { AUTH_GATE } from './cloud/config';
import { useI18n } from './i18n';
import { useTheme } from './glass/theme';

// Every surface is its own chunk: the landing page loads only what it shows.
const LegacyShell = lazy(() => import('./LegacyShell').then((m) => ({ default: m.LegacyShell })));
const GlassLanding = lazy(() => import('./glass/Landing').then((m) => ({ default: m.GlassLanding })));
const AfterHoursLanding = lazy(() => import('./Landing').then((m) => ({ default: m.Landing })));
const Present = lazy(() => import('./Present').then((m) => ({ default: m.Present })));
const HomeGlass = lazy(() => import('./glass/HomeGlass').then((m) => ({ default: m.HomeGlass })));
const ProjectGlass = lazy(() => import('./glass/ProjectGlass').then((m) => ({ default: m.ProjectGlass })));
const StudioPage = lazy(() => import('./studio/StudioPage').then((m) => ({ default: m.StudioPage })));
const Showroom = lazy(() => import('./studio/Showroom').then((m) => ({ default: m.Showroom })));
const ProjectPage = lazy(() => import('./ws/Project').then((m) => ({ default: m.ProjectPage })));
const Show = lazy(() => import('./ws/Show').then((m) => ({ default: m.Show })));
const GuestReview = lazy(() => import('./cloud/GuestReview').then((m) => ({ default: m.GuestReview })));
const TeamPage = lazy(() => import('./pages/TeamGlass').then((m) => ({ default: m.TeamGlass })));
const JoinPage = lazy(() => import('./cloud/Account').then((m) => ({ default: m.JoinPage })));
const CasePage = lazy(() => import('./tell/CasePage').then((m) => ({ default: m.CasePage })));
const LibraryPage = lazy(() => import('./pages/LibraryPage').then((m) => ({ default: m.LibraryPage })));
const ObjectsPage = lazy(() => import('./pages/ObjectsPage').then((m) => ({ default: m.ObjectsPage })));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage').then((m) => ({ default: m.TemplatesPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const NewsPage = lazy(() => import('./pages/NewsPage').then((m) => ({ default: m.NewsPage })));
const PortfolioPage = lazy(() => import('./pages/Portfolio').then((m) => ({ default: m.PortfolioPage })));
const FolioPublic = lazy(() => import('./pages/Portfolio').then((m) => ({ default: m.FolioPublic })));
const SharePage = lazy(() => import('./pages/SharePage').then((m) => ({ default: m.SharePage })));
const DeckPage = lazy(() => import('./pages/DeckPage').then((m) => ({ default: m.DeckPage })));
const GuidePage = lazy(() => import('./pages/GuidePage').then((m) => ({ default: m.GuidePage })));
const FlowPage = lazy(() => import('./kits/FlowPage').then((m) => ({ default: m.FlowPage })));
const HandoffPage = lazy(() => import('./kits/HandoffPage').then((m) => ({ default: m.HandoffPage })));
const AnimaticPage = lazy(() => import('./kits/AnimaticPage').then((m) => ({ default: m.AnimaticPage })));
const SitePreview = lazy(() => import('./site/SiteView').then((m) => ({ default: m.SitePreview })));
const DecisionsPage = lazy(() => import('./kits/DecisionsPage').then((m) => ({ default: m.DecisionsPage })));
const PlanPage = lazy(() => import('./kits/PlanPage').then((m) => ({ default: m.PlanPage })));
const CloudLayer = lazy(() => import('./cloud/CloudLayer'));
const AuthGate = lazy(() => import('./cloud/AuthGate'));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));

/** pages anyone may open: the landing, demo story, guest review links, published cases and portfolios, sign-in */
const PUBLIC = new Set(['landing', 'afterhours', 'story', 'guest', 'case', 'folio', 'join', 'login']);
/** the sign-in wall is on whenever the build talks to the studio server (tests build with VITE_AUTH_GATE=off) */
const GATE = AUTH_GATE;
const AppChrome = lazy(() => import('./AppChrome'));
const Palette = lazy(() => import('./daily/Palette').then((m) => ({ default: m.Palette })));

const TITLES: Record<string, string> = {
  landing: 'FrantoS — the private workspace behind the work',
  afterhours: 'After Hours / Tel Aviv — FrantoS',
  story: 'After Hours / Tel Aviv — FrantoS',
  legacy: 'FrantoS — Private Creative Workspace (v1)',
  app: 'Workspace — FrantoS',
  project: 'Project — FrantoS',
  pshow: 'Presentation — FrantoS',
  team: 'Studio — FrantoS',
  join: 'Join a studio — FrantoS',
  guest: 'Review — FrantoS',
  case: 'Case — FrantoS',
  editor: 'Studio — FrantoS',
  showroom: 'Showroom — FrantoS',
  pcase: 'Case — FrantoS',
  library: 'Library — FrantoS',
  objects: 'Objects — FrantoS',
  templates: 'Templates — FrantoS',
  settings: 'Settings — FrantoS',
  login: 'Sign in — FrantoS',
  admin: 'Accounts & access — FrantoS',
  news: "What's new — FrantoS",
  portfolio: 'Portfolio — FrantoS',
  folio: 'Portfolio — FrantoS',
  share: 'Shared to FrantoS',
  deck: 'Presentation — FrantoS',
  guide: 'Brand guide — FrantoS',
  flow: 'Flow & prototype — FrantoS',
  handoff: 'Handoff — FrantoS',
  site: 'Page — FrantoS',
  animatic: 'Animatic — FrantoS',
  decisions: 'Decision wall — FrantoS',
  plan: 'Plan — FrantoS',
};

function Redirect({ to }: { to: string }) {
  useEffect(() => go(to, { replace: true }), [to]);
  return null;
}

const Blank = ({ dark }: { dark?: boolean }) => <div className={`fixed inset-0 ${dark ? (document.documentElement.dataset.theme === 'light' ? 'bg-[#f3f1ec]' : 'bg-[#0e0e10]') : 'bg-[#eee8dd]'}`} />;
const APP_ROUTES = new Set(['app', 'project', 'pshow', 'team', 'join', 'editor', 'showroom', 'library', 'objects', 'templates', 'settings', 'admin', 'news', 'portfolio', 'share', 'deck', 'guide', 'flow', 'handoff', 'animatic', 'decisions', 'plan', 'site']);
const GLASS = new Set(['team', 'login', 'landing', 'app', 'project', 'editor', 'showroom', 'library', 'objects', 'templates', 'settings', 'admin', 'news', 'portfolio', 'folio', 'share', 'deck', 'flow', 'handoff', 'animatic', 'decisions', 'plan', 'site']);

export function Root() {
  const hash = useHash();
  const route = parse(hash);
  const { lang, dir } = useI18n();
  const { theme } = useTheme();

  useEffect(() => {
    document.title = TITLES[route.name] ?? 'FrantoS';
  }, [route.name]);

  useEffect(() => {
    document.body.style.background = route.name === 'legacy' ? '' : GLASS.has(route.name) ? (theme === 'light' ? '#f3f1ec' : '#101418') : '#eee8dd';
  }, [route.name, theme]);

  if (route.name === 'legacy') {
    return (
      <Suspense fallback={<div className="fixed inset-0 bg-[#07080E]" />}>
        <LegacyShell />
      </Suspense>
    );
  }

  let baseKey = '';
  let base: React.ReactNode = null;
  let overlay: React.ReactNode = null;
  switch (route.name) {
    case 'landing':
      baseKey = 'landing';
      base = <GlassLanding />;
      break;
    case 'afterhours':
    case 'story':
      baseKey = 'afterhours';
      base = <AfterHoursLanding receded={route.name === 'story'} />;
      if (route.name === 'story') overlay = <Present key="ah-present" mode="viewer" slide={route.slide} />;
      break;
    case 'app':
      baseKey = 'app';
      base = <HomeGlass />;
      break;
    case 'project':
      baseKey = `p-${route.id}`;
      base = route.tab === 'overview' && !route.sub ? <ProjectGlass id={route.id} q={route.q} /> : <ProjectPage id={route.id} tab={route.tab} sub={route.sub} q={route.q} />;
      break;
    case 'pshow':
      baseKey = `p-${route.id}`;
      base = <ProjectPage id={route.id} tab={route.mode === 'story' ? 'stories' : 'overview'} q={new URLSearchParams()} />;
      overlay = <Show key="pshow" id={route.id} mode={route.mode} slide={route.slide} />;
      break;
    case 'editor':
      baseKey = `s-${route.id}`;
      base = <StudioPage id={route.id} q={route.q} />;
      break;
    case 'showroom':
      baseKey = `o-${route.id}-${route.oid}`;
      base = <Showroom pid={route.id} oid={route.oid} />;
      break;
    case 'pcase':
      baseKey = `case-${route.id}`;
      base = <CasePage projectId={route.id} />;
      break;
    case 'case':
      baseKey = `case-${route.slug}`;
      base = <CasePage slug={route.slug} />;
      break;
    case 'team':
      baseKey = 'team';
      base = <TeamPage />;
      break;
    case 'join':
      baseKey = 'join';
      base = <JoinPage token={route.token} />;
      break;
    case 'guest':
      baseKey = `r-${route.token}`;
      base = <GuestReview token={route.token} workId={route.workId} q={route.q} />;
      break;
    case 'library':
    case 'objects':
    case 'templates':
    case 'settings':
    case 'news':
    case 'portfolio':
      baseKey = route.name;
      base = route.name === 'library' ? <LibraryPage /> : route.name === 'objects' ? <ObjectsPage /> : route.name === 'templates' ? <TemplatesPage /> : route.name === 'settings' ? <SettingsPage /> : route.name === 'news' ? <NewsPage /> : <PortfolioPage />;
      break;
    case 'folio':
      baseKey = `u-${route.handle}`;
      base = <FolioPublic handle={route.handle} />;
      break;
    case 'share':
      baseKey = 'share';
      base = <SharePage q={route.q} />;
      break;
    case 'deck':
      baseKey = `deck-${route.id}`;
      base = <DeckPage id={route.id} slide={route.slide} presenter={route.presenter} />;
      break;
    case 'admin':
      baseKey = 'admin';
      base = <AdminPage />;
      break;
    case 'guide':
      baseKey = `guide-${route.id}`;
      base = <GuidePage id={route.id} />;
      break;
    case 'flow':
      baseKey = `flow-${route.id}-${route.proto ? 'p' : 'm'}`;
      base = <FlowPage id={route.id} proto={route.proto} screen={route.screen} />;
      break;
    case 'site':
      baseKey = `site-${route.id}-${route.page}`;
      base = <SitePreview id={route.id} pageId={route.page} q={route.q} />;
      break;
    case 'handoff':
      baseKey = `handoff-${route.id}`;
      base = <HandoffPage id={route.id} />;
      break;
    case 'animatic':
      baseKey = `animatic-${route.id}`;
      base = <AnimaticPage id={route.id} />;
      break;
    case 'decisions':
      baseKey = `decisions-${route.id}`;
      base = <DecisionsPage id={route.id} />;
      break;
    case 'plan':
      baseKey = 'plan';
      base = <PlanPage />;
      break;
    case 'login':
      baseKey = 'login';
      base = GATE ? <LoginPage next={route.next} /> : <Redirect to={route.next} />;
      break;
    default:
      baseKey = 'landing';
      base = <GlassLanding />;
  }
  const inApp = APP_ROUTES.has(route.name);
  const gated = GATE && !PUBLIC.has(route.name);
  if (gated) base = <AuthGate hash={hash}>{base}</AuthGate>;

  return (
    <MotionConfig reducedMotion="user">
      <div className="f2" lang={lang} dir={dir}>
        <LayoutGroup>
          {/* One page at a time: the new page fades in with CSS, the old one is gone at once.
              No two full-screen layers to blend — cheap without a GPU, and nothing can stall halfway. */}
          <motion.div
            key={baseKey}
            layoutScroll
            className="f2-scroll lg-route-in fixed inset-0 overflow-y-auto overflow-x-hidden"
            aria-hidden={overlay ? true : undefined}
            inert={overlay ? true : undefined}
          >
            <Suspense fallback={<Blank dark={GLASS.has(route.name)} />}>{base}</Suspense>
          </motion.div>
          <AnimatePresence>{overlay && <Suspense fallback={<Blank dark />}>{overlay}</Suspense>}</AnimatePresence>
        </LayoutGroup>
        {route.name !== 'landing' && route.name !== 'afterhours' && route.name !== 'story' && route.name !== 'login' && (
          <Suspense fallback={null}>
            <AppChrome />
          </Suspense>
        )}
        {inApp && (
          <Suspense fallback={null}>
            <CloudLayer />
            <Palette />
          </Suspense>
        )}
      </div>
    </MotionConfig>
  );
}
