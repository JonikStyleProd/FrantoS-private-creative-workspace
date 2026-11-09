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
          className={`flex min-h-[38px] items-center gap-2 rounded-full text-[13.5px] font-bold transition-colors ${vertical ? 'w-full justify-start px-3.5' : 'min-w-[38px] justify-center px-2.5 2xl:px-3.5'} ${on ? 'bg-white text-[#11151a]' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
        >
          <s.icon size={15} /> <span className={vertical ? '' : 'hidden 2xl:inline'}>{t(s.label)}</span>
        </button>
      );
    });
  return (
    <>
      <Pane as="header" className="relative z-40 flex items-center gap-2 rounded-full py-1.5 pe-1.5 ps-4">
        <Mark onClick={() => go('/')} />
        <nav aria-label={t('Sections')} className="ms-3 hidden items-center gap-0.5 lg:flex">
          {nav()}
        </nav>
        <div className="ms-auto flex shrink-0 items-center gap-1.5">
          <SyncBadge />
          <button type="button" onClick={() => go('/new')} className="lg-btn lg-btn-plain lg-icon relative max-sm:!hidden" aria-label={t("What's new")} title={t("What's new")}>
            <Sparkles size={16} />
            {unseen && <span className="absolute end-2 top-2 h-2 w-2 rounded-full bg-[var(--lg-accent)]" />}
          </button>
          <button type="button" onClick={openPalette} className="lg-btn lg-btn-plain max-md:!hidden" aria-label={t('Search or run a command')}>
            <Search size={15} /> <span className="text-white/60">⌘K</span>
          </button>
          <span className="hidden 2xl:block">
            <GlassLang />
          </span>
          <ThemeSwitch />
          <InstallButton compact />
          <span className="max-sm:hidden">
            <GlassAccount />
          </span>
          {action}
          <button type="button" onClick={() => setMenu((v) => !v)} aria-expanded={menu} className="lg-btn lg-btn-plain lg-icon 2xl:!hidden" aria-label={t('Sections')}>
            {menu ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </Pane>
      <AnimatePresence>
        {menu && (
          <Pane strong key="menu" className="absolute inset-x-3 top-[72px] z-50 flex flex-col gap-1 rounded-[26px] p-2 sm:inset-x-6 2xl:hidden">
            {nav(true)}
            <div className="mt-1 flex items-center justify-between gap-2 border-t border-white/15 px-1 pt-2">
              <GlassLang />
              <button type="button" onClick={() => go('/new')} className="lg-btn lg-btn-plain min-h-[38px] text-[13px]">
                <Sparkles size={14} /> {t("What's new")}
              </button>
            </div>
            <div className="sm:hidden">
              <GlassAccount />
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
