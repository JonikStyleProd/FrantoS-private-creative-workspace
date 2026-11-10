import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Box, FolderOpen, Images, LayoutTemplate, Menu, Search, Settings, Sparkles, UserRound, X } from 'lucide-react';
import './glass.css';
import { useI18n } from '../i18n';
import { go, useHash } from '../route';
import { ensureLoaded, useWs } from '../ws/store';
import { openPalette } from '../daily/Palette';
import { GlassAccount } from './account';
import { InstallButton } from './install';
import { Backdrop, Credits, GlassLang, Mark, Pane, ThemeSwitch } from './kit';
import { NEWS } from '../pages/news';
import { SyncBadge } from './SyncBadge';

/** Sections of the workspace, in the order a creator moves through them. */
export const SECTIONS = [
  { path: '/app', label: 'Projects', icon: FolderOpen },
  { path: '/library', label: 'Library', icon: Images },
  { path: '/objects', label: 'Objects', icon: Box },
  { path: '/templates', label: 'Templates', icon: LayoutTemplate },
  { path: '/portfolio', label: 'Portfolio', icon: UserRound },
  { path: '/settings', label: 'Settings', icon: Settings },
] as const;

/** The glass header every workspace page shares: logo, sections, search, sync, theme, account. */
export function AppHeader({ action }: { action?: React.ReactNode }) {
  const { t } = useI18n();
  const hash = useHash();
  const { state } = useWs();
  const [menu, setMenu] = useState(false);
  const here = '/' + (hash.replace(/^#\/?/, '').split(/[/?]/)[0] ?? '');
  const unseen = NEWS[0] && (state.seenNews ?? 0) < NEWS[0].n;
  useEffect(() => setMenu(false), [hash]);
  const nav = (vertical = false) =>
    SECTIONS.map((s) => {
      const on = here === s.path;
      return (
        <button
          key={s.path}
          type="button"
          onClick={() => go(s.path)}
          aria-current={on ? 'page' : undefined}
          title={t(s.label)}
          aria-label={t(s.label)}
          className={`flex h-10 shrink-0 items-center gap-2 rounded-full text-[13.5px] font-bold transition-colors ${vertical ? 'w-full justify-start px-3.5' : 'w-10 justify-center min-[1720px]:w-auto min-[1720px]:px-3.5'} ${on ? 'bg-white text-[#11151a]' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
        >
          <s.icon size={16} className="shrink-0" /> <span className={vertical ? '' : 'hidden whitespace-nowrap min-[1720px]:inline'}>{t(s.label)}</span>
        </button>
      );
    });
  return (
    <>
      <Pane as="header" className="relative z-40 flex h-[60px] items-center gap-2 rounded-full pe-2 ps-4 sm:ps-5">
        <span className="shrink-0">
          <Mark onClick={() => go('/')} />
        </span>
        <nav aria-label={t('Sections')} className="mx-auto hidden min-w-0 items-center gap-1 lg:flex">
          {nav()}
        </nav>
        <div className="ms-auto flex shrink-0 items-center gap-1 lg:ms-0">
          <span className="max-sm:hidden">
            <SyncBadge />
          </span>
          <button type="button" onClick={openPalette} className="lg-btn lg-btn-plain lg-icon max-md:!hidden" aria-label={t('Search or run a command')} title={`${t('Search or run a command')} (⌘K)`}>
            <Search size={17} />
          </button>
          <span className="max-sm:hidden">
            <ThemeSwitch />
          </span>
          <span className="max-sm:hidden">
            <InstallButton compact />
          </span>
          <GlassAccount />
          {action}
          <button type="button" onClick={() => setMenu((v) => !v)} aria-expanded={menu} className="lg-btn lg-btn-plain lg-icon relative" aria-label={t('Menu')} title={t('Menu')}>
            {menu ? <X size={18} /> : <Menu size={18} />}
            {unseen && !menu && <span className="absolute end-2 top-2 h-2 w-2 rounded-full bg-[var(--lg-accent)]" />}
          </button>
        </div>
      </Pane>
      <AnimatePresence>
        {menu && (
          <Pane strong key="menu" className="absolute end-3 top-[72px] z-50 flex w-[min(360px,calc(100vw-24px))] flex-col gap-1 rounded-[26px] p-2 sm:end-6">
            <div className="flex flex-col gap-1 lg:hidden">{nav(true)}</div>
            <button type="button" onClick={() => go('/new')} className="flex h-11 items-center gap-2 rounded-full px-3.5 text-[13.5px] font-bold hover:bg-white/10">
              <Sparkles size={16} /> {t("What's new")}
              {unseen && <span className="ms-auto h-2 w-2 rounded-full bg-[var(--lg-accent)]" />}
            </button>
            <button type="button" onClick={openPalette} className="flex h-11 items-center gap-2 rounded-full px-3.5 text-[13.5px] font-bold hover:bg-white/10">
              <Search size={16} /> {t('Search or run a command')} <kbd className="ms-auto text-[11.5px] text-white/50">⌘K</kbd>
            </button>
            <div className="mt-1 flex items-center justify-between gap-2 border-t border-white/15 px-1.5 pt-2">
              <GlassLang />
              <span className="flex items-center gap-1 sm:hidden">
                <ThemeSwitch />
                <InstallButton compact />
              </span>
            </div>
          </Pane>
        )}
      </AnimatePresence>
    </>
  );
}

/** A workspace page: the backdrop, the header, a title block, the content, the credits. */
export function GlassPage({ title, kicker, lead, action, bg, children, wide }: { title: string; kicker?: string; lead?: React.ReactNode; action?: React.ReactNode; bg?: string; children: React.ReactNode; wide?: boolean }) {
  const { dir } = useI18n();
  useEffect(() => void ensureLoaded(), []);
  return (
    <div className="lg min-h-full" dir={dir}>
      <div className="fixed inset-0">
        <Backdrop src={bg} tint={0.55} blur />
      </div>
      <div className={`relative z-10 mx-auto ${wide ? 'max-w-[1600px]' : 'max-w-[1360px]'} px-3 pb-16 pt-3 sm:px-6 sm:pt-5`}>
        <AppHeader />
        <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            {kicker && <p className="lg-label lg-shadow-text">{kicker}</p>}
            <h1 className="lg-shadow-text mt-2 text-[clamp(34px,4.6vw,64px)] font-extrabold leading-[0.98] tracking-[-0.045em]">{title}</h1>
            {lead && <div className="lg-shadow-text mt-3 max-w-[60ch] text-[15.5px] leading-[1.55] text-white/80">{lead}</div>}
          </div>
          {action}
        </div>
        <div className="mt-8">{children}</div>
        <Credits className="mt-12 border-t border-white/15 pt-6" />
      </div>
    </div>
  );
}
