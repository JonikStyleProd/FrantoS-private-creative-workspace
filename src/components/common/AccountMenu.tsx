import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  User, 
  Search, 
  Sun, 
  Moon, 
  Globe, 
  Check, 
  X,
  Sparkles,
  Cloud
} from 'lucide-react';
import { CreatorProfile } from '../../types';
import { CREATOR_PROFILES } from '../../data/mockData';
import { useLanguage } from '../../i18n/LanguageContext';

export interface AccountMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfile: CreatorProfile;
  onSelectProfile: (profile: CreatorProfile) => void;
  onOpenProfileModal: () => void;
  onOpenSearchModal: () => void;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  onOpenAuthModal: () => void;
}

interface AccountMenuContentProps {
  activeProfile: CreatorProfile;
  onSelectProfile: (profile: CreatorProfile) => void;
  onOpenProfileModal: () => void;
  onOpenSearchModal: () => void;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  onOpenAuthModal: () => void;
  onClose: () => void;
  isMobileSheet?: boolean;
}

export const AccountMenuContent: React.FC<AccountMenuContentProps> = ({
  activeProfile,
  onSelectProfile,
  onOpenProfileModal,
  onOpenSearchModal,
  isDarkTheme,
  onToggleTheme,
  onOpenAuthModal,
  onClose,
  isMobileSheet = false,
}) => {
  const { t, language, setLanguage } = useLanguage();

  return (
    <div className="w-full space-y-3.5">
      {/* 1. ACTIVE DEMO PERSONA */}
      <div 
        id="account-menu-active-persona"
        className="p-3 sm:p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/8 dark:border-white/10"
      >
        <div className="flex items-center gap-3">
          <img 
            src={activeProfile.avatar} 
            alt={activeProfile.name} 
            className="w-11 h-11 rounded-full aspect-square object-cover flex-shrink-0 ring-2 ring-ultramarine/60 shadow-sm" 
          />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-ultramarine font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-ultramarine animate-pulse" />
              <span>{t.accountMenu.signedInAs}</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-[#121316] dark:text-[#F5F3EF] truncate">
              {activeProfile.name}
            </p>
            <p className="text-[11px] text-[#52555F] dark:text-[#A3A099] truncate">
              {activeProfile.role}
            </p>
          </div>
        </div>
      </div>

      {/* 2. EXPLICIT LANGUAGE SWITCHER (CRUCIAL FOR MOBILE & DESKTOP) */}
      <div id="account-menu-language-section" className="space-y-1.5">
        <div className="flex items-center justify-between px-1 text-[11px] font-mono uppercase tracking-wider text-[#52555F] dark:text-[#A3A099] font-semibold">
          <span className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-ultramarine" />
            <span>{t.accountMenu.languageSetting}</span>
          </span>
          <span className="text-[10px] text-ultramarine font-bold">
            {language.toUpperCase()}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setLanguage('ru')}
            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation ${
              language === 'ru'
                ? 'bg-ultramarine text-white shadow-md shadow-ultramarine/25 font-bold'
                : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#52555F] dark:text-[#A3A099]'
            }`}
            aria-pressed={language === 'ru'}
          >
            {language === 'ru' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
            <span>Русский (RU)</span>
          </button>

          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation ${
              language === 'en'
                ? 'bg-ultramarine text-white shadow-md shadow-ultramarine/25 font-bold'
                : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#52555F] dark:text-[#A3A099]'
            }`}
            aria-pressed={language === 'en'}
          >
            {language === 'en' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
            <span>English (EN)</span>
          </button>
        </div>
      </div>

      {/* 3. PERSONA SELECTION */}
      <div id="account-menu-persona-selection" className="space-y-1.5 pt-1">
        <p className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-[#52555F] dark:text-[#A3A099] px-1 font-semibold">
          {t.accountMenu.switchPersona}
        </p>
        <div className={`space-y-1.5 ${isMobileSheet ? 'max-h-48' : 'max-h-36'} overflow-y-auto pr-1`}>
          {CREATOR_PROFILES.map((prof) => {
            const isCurrent = activeProfile.id === prof.id;
            return (
              <button
                key={prof.id}
                type="button"
                onClick={() => onSelectProfile(prof)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer min-h-[42px] touch-manipulation ${
                  isCurrent
                    ? 'bg-ultramarine/15 border border-ultramarine/30 text-ultramarine font-bold'
                    : 'bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5 text-[#52555F] dark:text-[#A3A099]'
                }`}
                aria-label={`Select persona ${prof.name}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img 
                    src={prof.avatar} 
                    alt={prof.name} 
                    className="w-6 h-6 rounded-full aspect-square object-cover flex-shrink-0" 
                  />
                  <div className="min-w-0">
                    <span className="truncate block font-medium">{prof.name}</span>
                  </div>
                </div>
                {isCurrent && (
                  <Check className="w-4 h-4 text-ultramarine flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. ACTIONS: VIEW PROFILE & SEARCH */}
      <div className="space-y-1.5 pt-1">
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenProfileModal();
          }}
          className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#121316] dark:text-white bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center gap-2.5 cursor-pointer min-h-[44px] transition-colors touch-manipulation"
        >
          <User className="w-4 h-4 text-ultramarine flex-shrink-0" />
          <span>{t.accountMenu.editProfile}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenSearchModal();
          }}
          className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#121316] dark:text-white bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-between cursor-pointer min-h-[44px] transition-colors touch-manipulation"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-ultramarine flex-shrink-0" />
            <span>{t.header.searchAria}</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[#52555F] dark:text-[#A3A099] font-medium">
            Cmd+K
          </span>
        </button>
      </div>

      {/* 5. THEME SWITCH */}
      <div id="account-menu-theme-section" className="pt-2 border-t border-black/8 dark:border-white/8">
        <button
          type="button"
          onClick={onToggleTheme}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer min-h-[44px] text-[#121316] dark:text-white font-medium touch-manipulation"
        >
          <div className="flex items-center gap-2.5">
            {isDarkTheme ? (
              <Sun className="w-4 h-4 text-amber-400 flex-shrink-0" />
            ) : (
              <Moon className="w-4 h-4 text-ultramarine flex-shrink-0" />
            )}
            <span>{t.accountMenu.themeSetting}</span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-black/10 dark:bg-white/10 text-[#121316] dark:text-white">
            {isDarkTheme ? t.accountMenu.darkTheme : t.accountMenu.lightTheme}
          </span>
        </button>
      </div>

      {/* 6. CLOUD SYNC */}
      <div id="account-menu-supabase-section" className="pt-1">
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenAuthModal();
          }}
          className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs text-ultramarine bg-ultramarine/10 hover:bg-ultramarine/20 border border-ultramarine/20 flex items-center gap-2.5 font-mono font-bold cursor-pointer min-h-[44px] transition-colors touch-manipulation"
        >
          <Cloud className="w-4 h-4 text-ultramarine flex-shrink-0" />
          <span>{t.accountMenu.cloudSync}</span>
        </button>
      </div>
    </div>
  );
};

export const AccountMenu: React.FC<AccountMenuProps> = ({
  isOpen,
  onClose,
  activeProfile,
  onSelectProfile,
  onOpenProfileModal,
  onOpenSearchModal,
  isDarkTheme,
  onToggleTheme,
  onOpenAuthModal,
}) => {
  const { t } = useLanguage();
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const mobileSheetRef = useRef<HTMLDivElement>(null);

  // Background scroll lock, Escape key, outside click & Android Back navigation
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handlePopState = () => {
      onClose();
    };

    window.history.pushState({ modal: 'studio-account-menu' }, '');
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (desktopMenuRef.current && !desktopMenuRef.current.contains(target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const mobileBottomSheetNode = (
    <div 
      id="mobile-profile-sheet-backdrop"
      className="md:hidden fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end justify-center animate-in fade-in duration-200 box-border"
      role="dialog"
      aria-modal="true"
      aria-label="Profile and Account Settings Sheet"
      onClick={onClose}
    >
      <div 
        ref={mobileSheetRef}
        id="mobile-profile-sheet-container"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-full max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-[#F8F7F4] dark:bg-[#0E1015] border-t border-black/15 dark:border-white/15 p-4 sm:p-5 text-[#121316] dark:text-[#F5F3EF] shadow-2xl flex flex-col box-border pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
      >
        {/* Mobile Sheet Drag handle / Header */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-black/10 dark:border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-ultramarine" />
            <h3 className="font-display font-bold text-sm sm:text-base text-[#121316] dark:text-[#F5F3EF]">
              {t.accountMenu.signedInAs}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors touch-manipulation"
            aria-label={t.accountMenu.closeMenu}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Unified Content Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <AccountMenuContent
            activeProfile={activeProfile}
            onSelectProfile={onSelectProfile}
            onOpenProfileModal={onOpenProfileModal}
            onOpenSearchModal={onOpenSearchModal}
            isDarkTheme={isDarkTheme}
            onToggleTheme={onToggleTheme}
            onOpenAuthModal={onOpenAuthModal}
            onClose={onClose}
            isMobileSheet={true}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* DESKTOP DROPDOWN (VISIBLE ON >= MD BREAKPOINTS) */}
      <div 
        ref={desktopMenuRef}
        id="desktop-profile-menu-dropdown"
        role="dialog"
        aria-label="Profile and account menu"
        className="hidden md:block absolute right-0 top-full mt-2 w-84 max-w-[calc(100vw-2rem)] p-4 rounded-2xl bg-[#F8F7F4]/98 dark:bg-[#0E1015]/98 backdrop-blur-2xl border border-black/10 dark:border-white/12 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-[#121316] dark:text-[#F5F3EF]"
        onClick={(e) => e.stopPropagation()}
      >
        <AccountMenuContent
          activeProfile={activeProfile}
          onSelectProfile={onSelectProfile}
          onOpenProfileModal={onOpenProfileModal}
          onOpenSearchModal={onOpenSearchModal}
          isDarkTheme={isDarkTheme}
          onToggleTheme={onToggleTheme}
          onOpenAuthModal={onOpenAuthModal}
          onClose={onClose}
          isMobileSheet={false}
        />
      </div>

      {/* MOBILE VIEWPORT-SAFE BOTTOM SHEET */}
      {typeof document !== 'undefined' ? createPortal(mobileBottomSheetNode, document.body) : null}
    </>
  );
};
