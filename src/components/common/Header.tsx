import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Compass, 
  Layers, 
  FolderKanban, 
  CloudSun, 
  Menu,
  X,
  Bookmark,
  MessageSquare,
  Flame
} from 'lucide-react';
import { CreatorProfile } from '../../types';
import { AccountMenu } from './AccountMenu';

interface HeaderProps {
  activeTab: 'feed' | 'workspace' | 'moodboard' | 'weather';
  onSelectTab: (tab: 'feed' | 'workspace' | 'moodboard' | 'weather') => void;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  activeProfile: CreatorProfile;
  onSelectProfile: (profile: CreatorProfile) => void;
  onOpenProfileModal: () => void;
  onOpenAuthModal: () => void;
  onOpenSearchModal: () => void;
  onSelectSavedWorks?: () => void;
  onOpenMessages?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  isDarkTheme,
  onToggleTheme,
  activeProfile,
  onSelectProfile,
  onOpenProfileModal,
  onOpenAuthModal,
  onOpenSearchModal,
  onSelectSavedWorks,
  onOpenMessages,
}) => {
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  const accountButtonRef = useRef<HTMLDivElement>(null);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);

  // Background scroll lock, Escape key, outside click & Android Back navigation
  useEffect(() => {
    if (!showMobileNav) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMobileNav(false);
      }
    };

    const handlePopState = () => {
      setShowMobileNav(false);
    };

    window.history.pushState({ modal: 'studio-mobile-nav' }, '');
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showMobileNav]);

  const mobileNavOverlayNode = showMobileNav ? (
    <div 
      id="mobile-nav-overlay-root"
      className="md:hidden fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Studio Navigation"
    >
      {/* 1. Viewport-covering Backdrop (Fixed, Full Viewport) */}
      <div 
        id="mobile-nav-backdrop"
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={() => setShowMobileNav(false)}
        aria-hidden="true"
      />

      {/* 2. Fixed Slide-out Drawer (Bound to viewport edge, responsive width) */}
      <aside
        ref={mobileDrawerRef}
        id="mobile-nav-drawer"
        className="relative z-10 w-[82vw] max-w-[340px] h-[100dvh] bg-[#F8F7F4] dark:bg-[#11141A] text-[#111317] dark:text-[#F3F1EC] border-l border-black/15 dark:border-white/15 shadow-2xl flex flex-col box-border pt-[env(safe-area-inset-top,0px)] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 dark:border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500" />
            <span className="font-display font-bold text-sm tracking-wide text-[#111317] dark:text-white">
              Studio Navigation
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowMobileNav(false)}
            className="min-w-[36px] min-h-[36px] p-2 rounded-full bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            aria-label="Close Studio Navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 min-h-0">
          {/* 1. Creative Feed */}
          <button
            type="button"
            onClick={() => {
              onSelectTab('feed');
              setShowMobileNav(false);
            }}
            className={`w-full p-3 rounded-2xl text-xs font-semibold flex items-center gap-3 min-h-[46px] cursor-pointer transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
              activeTab === 'feed'
                ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-800 dark:text-cyan-200 font-bold shadow-xs'
                : 'bg-black/[0.03] dark:bg-white/[0.03] text-[#4A505C] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Compass className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
            <span>Creative Feed</span>
          </button>

          {/* 2. Discover */}
          <button
            type="button"
            onClick={() => {
              onSelectTab('feed');
              setShowMobileNav(false);
            }}
            className="w-full p-3 rounded-2xl text-xs font-semibold flex items-center gap-3 min-h-[46px] cursor-pointer transition-colors text-left bg-black/[0.03] dark:bg-white/[0.03] text-[#4A505C] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <Flame className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>Discover</span>
          </button>

          {/* 3. Studio Workspace */}
          <button
            type="button"
            onClick={() => {
              onSelectTab('workspace');
              setShowMobileNav(false);
            }}
            className={`w-full p-3 rounded-2xl text-xs font-semibold flex items-center gap-3 min-h-[46px] cursor-pointer transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
              activeTab === 'workspace'
                ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-800 dark:text-cyan-200 font-bold shadow-xs'
                : 'bg-black/[0.03] dark:bg-white/[0.03] text-[#4A505C] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <FolderKanban className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>Studio Workspace</span>
          </button>

          {/* 4. Spatial Moodboard */}
          <button
            type="button"
            onClick={() => {
              onSelectTab('moodboard');
              setShowMobileNav(false);
            }}
            className={`w-full p-3 rounded-2xl text-xs font-semibold flex items-center gap-3 min-h-[46px] cursor-pointer transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
              activeTab === 'moodboard'
                ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-800 dark:text-cyan-200 font-bold shadow-xs'
                : 'bg-black/[0.03] dark:bg-white/[0.03] text-[#4A505C] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <span>Spatial Moodboard</span>
          </button>

          {/* 5. Creative Weather */}
          <button
            type="button"
            onClick={() => {
              onSelectTab('weather');
              setShowMobileNav(false);
            }}
            className={`w-full p-3 rounded-2xl text-xs font-semibold flex items-center gap-3 min-h-[46px] cursor-pointer transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
              activeTab === 'weather'
                ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-800 dark:text-cyan-200 font-bold shadow-xs'
                : 'bg-black/[0.03] dark:bg-white/[0.03] text-[#4A505C] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <CloudSun className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span>Creative Weather</span>
          </button>

          {/* 6. Saved Works */}
          <button
            type="button"
            onClick={() => {
              if (onSelectSavedWorks) onSelectSavedWorks();
              setShowMobileNav(false);
            }}
            className="w-full p-3 rounded-2xl text-xs font-semibold flex items-center gap-3 min-h-[46px] cursor-pointer transition-colors text-left bg-black/[0.03] dark:bg-white/[0.03] text-[#4A505C] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <Bookmark className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            <span>Saved Works</span>
          </button>

          {/* 7. Messages */}
          <button
            type="button"
            onClick={() => {
              if (onOpenMessages) onOpenMessages();
              setShowMobileNav(false);
            }}
            className="w-full p-3 rounded-2xl text-xs font-semibold flex items-center gap-3 min-h-[46px] cursor-pointer transition-colors text-left bg-black/[0.03] dark:bg-white/[0.03] text-[#4A505C] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <MessageSquare className="w-4 h-4 text-cyan-500 flex-shrink-0" />
            <span>Messages</span>
          </button>
        </div>

        {/* Drawer Footer info */}
        <div className="px-5 pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex-shrink-0">
          <span>FRANTOS v2.4</span>
          <span className="text-cyan-600 dark:text-cyan-400 font-semibold">ONLINE</span>
        </div>
      </aside>
    </div>
  ) : null;

  return (
    <>
      <header 
        id="frantos-main-header"
        className="sticky top-0 z-40 w-full max-w-full backdrop-blur-xl border-b border-black/10 dark:border-white/10 bg-[#F8F7F4]/95 dark:bg-[#090B0E]/90 transition-colors"
      >
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 md:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-6 min-w-0">
          
          {/* =========================================================================
              ZONE 1: FRANTOS LOGO (FLEX-SHRINK-0, RESPONSIVE, NEVER OVERLAPS)
              ========================================================================= */}
          <div className="flex items-center gap-2 sm:gap-6 flex-shrink-0 min-w-0">
            <button 
              id="brand-logo-btn"
              type="button"
              onClick={() => onSelectTab('feed')}
              className="text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-lg cursor-pointer flex-shrink-0"
              aria-label="FrantoS Home"
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-display font-black text-lg sm:text-2xl tracking-[0.16em] sm:tracking-[0.24em] text-[#111317] dark:text-[#F3F1EC] group-hover:text-cyan-500 transition-colors select-none">
                  FRANTOS
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono px-1 sm:px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-400 font-bold select-none">
                  PRO
                </span>
              </div>
              <div className="text-[8px] sm:text-[9px] font-mono tracking-widest uppercase text-[#4A505C] dark:text-zinc-500 hidden xs:block">
                Private Workspace
              </div>
            </button>
          </div>

          {/* =========================================================================
              ZONE 2: PRIMARY NAVIGATION (DESKTOP / LAPTOP / TABLET-WIDE)
              ========================================================================= */}
          <nav 
            aria-label="Main studio workspace navigation" 
            className="hidden md:flex items-center gap-1 sm:gap-1.5 pl-3 md:pl-4 border-l border-black/10 dark:border-white/10 flex-shrink min-w-0"
          >
            <button
              id="nav-tab-feed"
              type="button"
              onClick={() => onSelectTab('feed')}
              className={`px-2.5 lg:px-3.5 py-2 rounded-xl text-xs font-medium tracking-tight transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 flex-shrink-0 ${
                activeTab === 'feed'
                  ? 'bg-black/10 dark:bg-white/15 text-[#111317] dark:text-white font-semibold shadow-xs'
                  : 'text-[#4A505C] dark:text-zinc-400 hover:text-[#111317] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Compass className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">Creative Feed</span>
            </button>

            <button
              id="nav-tab-workspace"
              type="button"
              onClick={() => onSelectTab('workspace')}
              className={`px-2.5 lg:px-3.5 py-2 rounded-xl text-xs font-medium tracking-tight transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 flex-shrink-0 ${
                activeTab === 'workspace'
                  ? 'bg-black/10 dark:bg-white/15 text-[#111317] dark:text-white font-semibold shadow-xs'
                  : 'text-[#4A505C] dark:text-zinc-400 hover:text-[#111317] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">Studio Workspace</span>
            </button>

            <button
              id="nav-tab-moodboard"
              type="button"
              onClick={() => onSelectTab('moodboard')}
              className={`px-2.5 lg:px-3.5 py-2 rounded-xl text-xs font-medium tracking-tight transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 flex-shrink-0 ${
                activeTab === 'moodboard'
                  ? 'bg-black/10 dark:bg-white/15 text-[#111317] dark:text-white font-semibold shadow-xs'
                  : 'text-[#4A505C] dark:text-zinc-400 hover:text-[#111317] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">Spatial Moodboard</span>
            </button>

            <button
              id="nav-tab-weather"
              type="button"
              onClick={() => onSelectTab('weather')}
              className={`px-2.5 lg:px-3.5 py-2 rounded-xl text-xs font-medium tracking-tight transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 flex-shrink-0 ${
                activeTab === 'weather'
                  ? 'bg-black/10 dark:bg-white/15 text-[#111317] dark:text-white font-semibold shadow-xs'
                  : 'text-[#4A505C] dark:text-zinc-400 hover:text-[#111317] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <CloudSun className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">Creative Weather</span>
            </button>
          </nav>

          {/* =========================================================================
              ZONE 3: PROFILE / AVATAR BUTTON & MOBILE NAVIGATION TOGGLE
              ========================================================================= */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            
            {/* Profile / Avatar Control (Toggles unified Account Menu only) */}
            <div className="relative" ref={accountButtonRef}>
              <button
                id="btn-persona-avatar-toggle"
                type="button"
                onClick={() => {
                  setShowMobileNav(false);
                  setShowAccountMenu((prev) => !prev);
                }}
                className="min-h-[40px] flex items-center gap-2 p-1 sm:px-2 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/15 transition-all cursor-pointer justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 group flex-shrink-0"
                aria-label={`Open creator profile and account menu for ${activeProfile.name}`}
                aria-expanded={showAccountMenu}
                aria-haspopup="dialog"
              >
                <img
                  src={activeProfile.avatar}
                  alt={activeProfile.name}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full aspect-square object-cover flex-shrink-0 ring-1 ring-black/10 dark:ring-white/20 group-hover:ring-cyan-500 transition-all"
                />
                <span className="hidden sm:inline-block text-xs font-semibold text-[#111317] dark:text-[#F3F1EC] max-w-[110px] truncate">
                  {activeProfile.name.split(' ')[0]}
                </span>
              </button>

              {/* UNIFIED ACCOUNT MENU (Desktop dropdown & Mobile bottom sheet) */}
              <AccountMenu
                isOpen={showAccountMenu}
                onClose={() => setShowAccountMenu(false)}
                activeProfile={activeProfile}
                onSelectProfile={onSelectProfile}
                onOpenProfileModal={onOpenProfileModal}
                onOpenSearchModal={onOpenSearchModal}
                isDarkTheme={isDarkTheme}
                onToggleTheme={onToggleTheme}
                onOpenAuthModal={onOpenAuthModal}
              />
            </div>

            {/* Mobile Navigation Menu Toggle (Toggles site navigation overlay only) */}
            <button
              id="btn-mobile-nav"
              type="button"
              onClick={() => {
                setShowAccountMenu(false);
                setShowMobileNav((prev) => !prev);
              }}
              className="md:hidden min-w-[40px] min-h-[40px] p-2 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/15 text-[#111317] dark:text-white flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 flex-shrink-0"
              aria-label={showMobileNav ? 'Close site navigation' : 'Open site navigation'}
              aria-expanded={showMobileNav}
            >
              {showMobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* FIXED MOBILE NAVIGATION OVERLAY (PORTALED TO BODY) */}
      {typeof document !== 'undefined' && mobileNavOverlayNode ? createPortal(mobileNavOverlayNode, document.body) : null}
    </>
  );
};
