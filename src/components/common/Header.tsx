import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Compass, 
  Grid, 
  FolderKanban, 
  Layers, 
  Activity, 
  Search,
  Sun,
  Moon,
  ChevronDown,
  Sparkles,
  Send,
  SlidersHorizontal,
  Menu,
  X,
  Check,
  Globe,
  Cloud,
  User,
  Users
} from 'lucide-react';
import { CreatorProfile } from '../../types';
import { CREATOR_PROFILES } from '../../data/mockData';
import { AccountMenu } from './AccountMenu';
import { useLanguage } from '../../i18n/LanguageContext';

export type AtelierTab = 'overview' | 'catalog' | 'workspace' | 'moodboard' | 'atmosphere';
type DropdownType = 'spaces' | 'create' | 'settings' | 'account' | 'mobile' | null;

interface HeaderProps {
  activeTab: AtelierTab;
  onSelectTab: (tab: AtelierTab) => void;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  activeProfile: CreatorProfile;
  onSelectProfile: (profile: CreatorProfile) => void;
  onOpenProfileModal: () => void;
  onOpenAuthModal: () => void;
  onOpenSearchModal: () => void;
  onOpenPublishArtifact: () => void;
  onOpenNewStory: () => void;
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
  onOpenPublishArtifact,
  onOpenNewStory,
}) => {
  const { t, language, setLanguage } = useLanguage();
  const [openDropdown, setOpenDropdown] = useState<DropdownType>(null);
  const [headerBottom, setHeaderBottom] = useState<number>(64);
  const [isSwitchingPersona, setIsSwitchingPersona] = useState<boolean>(false);

  const headerRef = useRef<HTMLElement>(null);
  const mobileMenuBtnRef = useRef<HTMLButtonElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const wasMobileMenuOpen = useRef<boolean>(false);

  const isMobileMenuOpen = openDropdown === 'mobile';

  const toggleDropdown = (type: DropdownType) => {
    setOpenDropdown((prev) => (prev === type ? null : type));
  };

  const closeAll = () => {
    setOpenDropdown(null);
    setIsSwitchingPersona(false);
  };

  // Track header bottom position for accurate viewport anchoring
  const updateHeaderBottom = () => {
    if (headerRef.current) {
      const rect = headerRef.current.getBoundingClientRect();
      setHeaderBottom(rect.bottom);
    }
  };

  useEffect(() => {
    updateHeaderBottom();
    window.addEventListener('resize', updateHeaderBottom);
    window.addEventListener('scroll', updateHeaderBottom, { passive: true });
    return () => {
      window.removeEventListener('resize', updateHeaderBottom);
      window.removeEventListener('scroll', updateHeaderBottom);
    };
  }, []);

  // Update header bottom when opening mobile menu
  useEffect(() => {
    if (isMobileMenuOpen) {
      updateHeaderBottom();
    }
  }, [isMobileMenuOpen]);

  // Lock body scroll while mobile menu is open, and restore when closed
  useEffect(() => {
    if (isMobileMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalOverscroll = document.body.style.overscrollBehavior;
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'contain';

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.overscrollBehavior = originalOverscroll;
      };
    }
  }, [isMobileMenuOpen]);

  // Focus management: move focus into panel on open, return to menu button on close
  useEffect(() => {
    if (isMobileMenuOpen) {
      wasMobileMenuOpen.current = true;
      setTimeout(() => {
        mobilePanelRef.current?.focus();
      }, 50);
    } else if (wasMobileMenuOpen.current) {
      wasMobileMenuOpen.current = false;
      mobileMenuBtnRef.current?.focus();
    }
  }, [isMobileMenuOpen]);

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        openDropdown &&
        openDropdown !== 'mobile' &&
        headerRef.current &&
        !headerRef.current.contains(e.target as Node)
      ) {
        closeAll();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAll();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openDropdown]);

  // 5 Atelier Spaces definition for Desktop Navigation
  const spaceItems: { 
    id: AtelierTab; 
    label: string; 
    descRu: string; 
    descEn: string; 
    icon: React.FC<{ className?: string }> 
  }[] = [
    { 
      id: 'overview', 
      label: t.nav.overview, 
      descRu: 'Центральный арт-объект и орбита', 
      descEn: 'Hero centerpiece and 3D orbit', 
      icon: Compass 
    },
    { 
      id: 'catalog', 
      label: t.nav.catalog, 
      descRu: 'Экспозиция и архив кейсов', 
      descEn: 'Editorial archive & exhibitions', 
      icon: Grid 
    },
    { 
      id: 'workspace', 
      label: t.nav.workspace, 
      descRu: 'Стол задач и пайплайн спринтов', 
      descEn: 'Art director kanban sprints', 
      icon: FolderKanban 
    },
    { 
      id: 'moodboard', 
      label: t.nav.moodboard, 
      descRu: 'Свободный рабочий холст материалов', 
      descEn: 'Infinite spatial canvas', 
      icon: Layers 
    },
    { 
      id: 'atmosphere', 
      label: t.nav.atmosphere, 
      descRu: 'Акустическое поле 528Hz и биометрия', 
      descEn: 'Acoustic field and focus metrics', 
      icon: Activity 
    },
  ];

  const currentSpace = spaceItems.find((s) => s.id === activeTab) || spaceItems[0];
  const CurrentSpaceIcon = currentSpace.icon;

  return (
    <>
      <header 
        ref={headerRef}
        id="frantos-atelier-header"
        className="sticky top-0 z-40 w-full bg-white/80 dark:bg-[#090d18]/85 backdrop-blur-xl border-b border-black/8 dark:border-white/10 transition-colors select-none"
      >
        {/* =====================================================================
            1. MOBILE HEADER BAR (< md: 768px):
               Matches the exact breakpoint of the bottom navigation bar.
               [Brand minmax(0, 1fr)] [Search 44x44] [Profile/Menu 44x44]
            ===================================================================== */}
        <div className="flex md:hidden items-center justify-between gap-2.5 w-full h-16 px-3 sm:px-4 box-border">
          
          {/* Brand Logo area: flexible with minmax(0, 1fr) */}
          <div className="min-w-0 flex-1 flex items-center">
            <button
              type="button"
              onClick={() => {
                onSelectTab('overview');
                closeAll();
              }}
              className="flex items-center gap-2 min-w-0 max-w-full text-left cursor-pointer group focus:outline-none touch-manipulation"
              aria-label="FrantoS Digital Atelier Home"
            >
              {/* Geometric Monogram */}
              <div className="w-8 h-8 rounded-xl bg-ultramarine text-white flex items-center justify-center font-display font-black text-sm shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                <svg 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  className="w-4 h-4" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M4 4h16v4H8v4h10v4H8v4H4z" fill="currentColor" stroke="none" />
                </svg>
              </div>

              {/* Wordmark with pulsing indicator */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-display font-black text-lg tracking-[0.14em] text-[#111317] dark:text-[#F5F3EF] truncate leading-none">
                  FRANTOS
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-ultramarine animate-pulse flex-shrink-0" />
              </div>
            </button>
          </div>

          {/* Action buttons: Search & Profile/Menu (both min 44x44px touch target, flex-shrink: 0) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Quick Search Button (min 44x44px) */}
            <button
              type="button"
              onClick={() => {
                closeAll();
                onOpenSearchModal();
              }}
              className="w-11 h-11 rounded-xl border border-black/8 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#52555F] dark:text-[#A3A099] hover:text-[#111317] dark:hover:text-[#F5F3EF] flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 touch-manipulation"
              aria-label={t.header.searchAria}
              title={t.header.search}
            >
              <Search className="w-4 h-4 stroke-[2.2]" />
            </button>

            {/* Compact Profile & Settings Menu Button (min 44x44px, toggles between Menu/Avatar and X) */}
            <button
              ref={mobileMenuBtnRef}
              type="button"
              onClick={() => toggleDropdown('mobile')}
              aria-expanded={isMobileMenuOpen}
              aria-controls="frantos-mobile-menu-panel"
              className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all cursor-pointer flex-shrink-0 touch-manipulation ${
                isMobileMenuOpen
                  ? 'bg-ultramarine text-white border-ultramarine shadow-sm'
                  : 'bg-black/5 dark:bg-white/5 border-black/8 dark:border-white/10 text-[#121316] dark:text-[#F5F3EF] hover:bg-black/10 dark:hover:bg-white/10'
              }`}
              aria-label={isMobileMenuOpen ? t.common.close : t.header.menu}
              title={t.header.settings}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 stroke-[2.4]" />
              ) : (
                <Menu className="w-5 h-5 stroke-[2.2]" />
              )}
            </button>
          </div>
        </div>

        {/* =====================================================================
            2. DESKTOP HEADER BAR (>= md: 768px):
               Full navigation preserved intact:
               [Brand Logo] [Пространство ▾] [Создать ▾] [Поиск] [Настройки ▾] [Avatar]
            ===================================================================== */}
        <div className="hidden md:flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 items-center justify-between gap-4">
          
          {/* Zone 1: Desktop Brand Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                onSelectTab('overview');
                closeAll();
              }}
              className="flex items-center gap-2.5 text-left cursor-pointer group focus:outline-none"
              aria-label="FrantoS Digital Atelier Home"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-ultramarine text-white flex items-center justify-center font-display font-black text-lg shadow-md shadow-ultramarine/25 flex-shrink-0 group-hover:scale-105 transition-transform">
                <svg 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  className="w-5 h-5" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                >
                  <path d="M4 4h16v4H8v4h10v4H8v4H4z" fill="currentColor" stroke="none" />
                </svg>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-black text-xl sm:text-2xl tracking-[0.16em] text-[#111317] dark:text-[#F5F3EF] group-hover:text-ultramarine transition-colors leading-none">
                    FRANTOS
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-ultramarine animate-pulse ml-0.5" />
                </div>
                <span className="font-mono text-[9px] tracking-widest uppercase text-ultramarine font-semibold mt-0.5">
                  ATELIER 2026
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Desktop Navigation Groups */}
          <nav aria-label="Atelier Navigation" className="flex items-center gap-2.5 flex-shrink">
            {/* Группа «Пространство ▾» */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('spaces')}
                aria-expanded={openDropdown === 'spaces'}
                aria-haspopup="true"
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-mono font-medium flex items-center gap-2 border transition-all cursor-pointer ${
                  openDropdown === 'spaces'
                    ? 'bg-black/10 dark:bg-white/15 border-ultramarine/60 text-ultramarine dark:text-white shadow-sm'
                    : 'bg-black/5 dark:bg-white/5 border-black/8 dark:border-white/10 text-[#2D3139] dark:text-[#E2DFD8] hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                <CurrentSpaceIcon className="w-4 h-4 text-ultramarine flex-shrink-0" />
                <span className="font-semibold">{currentSpace.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${openDropdown === 'spaces' ? 'rotate-180' : ''}`} />
              </button>

              {/* Spaces Dropdown Panel */}
              {openDropdown === 'spaces' && (
                <div 
                  className="absolute top-full left-0 mt-2 w-72 p-2 rounded-2xl bg-white/98 dark:bg-[#0E1017]/98 backdrop-blur-2xl border border-black/10 dark:border-white/15 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                  role="menu"
                >
                  <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#7A7E8A] dark:text-[#8E8B83] font-semibold border-b border-black/6 dark:border-white/8 mb-1">
                    {t.header.spaces}
                  </div>
                  <div className="space-y-1">
                    {spaceItems.map((space) => {
                      const Icon = space.icon;
                      const isActive = activeTab === space.id;
                      return (
                        <button
                          key={space.id}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            onSelectTab(space.id);
                            closeAll();
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left cursor-pointer transition-all ${
                            isActive
                              ? 'bg-ultramarine text-white shadow-sm'
                              : 'hover:bg-black/5 dark:hover:bg-white/5 text-[#121316] dark:text-[#F5F3EF]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isActive ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10 text-ultramarine'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-semibold font-mono leading-none">
                                {space.label}
                              </div>
                              <div className={`text-[10px] mt-1 line-clamp-1 ${
                                isActive ? 'text-white/80' : 'text-[#7A7E8A] dark:text-[#8E8B83]'
                              }`}>
                                {language === 'ru' ? space.descRu : space.descEn}
                              </div>
                            </div>
                          </div>
                          {isActive && <Check className="w-4 h-4 text-white flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Группа «Создать ▾» */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('create')}
                aria-expanded={openDropdown === 'create'}
                aria-haspopup="true"
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-mono font-medium flex items-center gap-2 border transition-all cursor-pointer ${
                  openDropdown === 'create'
                    ? 'bg-ultramarine text-white border-transparent shadow-md shadow-ultramarine/25'
                    : 'bg-ultramarine/10 dark:bg-ultramarine/20 border-ultramarine/30 text-ultramarine hover:bg-ultramarine hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-semibold">{t.header.create}</span>
                <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform duration-200 ${openDropdown === 'create' ? 'rotate-180' : ''}`} />
              </button>

              {/* Create Actions Dropdown Panel */}
              {openDropdown === 'create' && (
                <div 
                  className="absolute top-full left-0 mt-2 w-72 p-2 rounded-2xl bg-white/98 dark:bg-[#0E1017]/98 backdrop-blur-2xl border border-black/10 dark:border-white/15 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                  role="menu"
                >
                  <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#7A7E8A] dark:text-[#8E8B83] font-semibold border-b border-black/6 dark:border-white/8 mb-1">
                    {t.header.create}
                  </div>
                  <div className="space-y-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onOpenPublishArtifact();
                        closeAll();
                      }}
                      className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-left cursor-pointer transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-ultramarine/15 text-ultramarine flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#121316] dark:text-[#F5F3EF]">
                          {t.header.publishArtifact}
                        </div>
                        <div className="text-[10px] text-[#7A7E8A] dark:text-[#8E8B83] mt-0.5 leading-snug">
                          {t.header.publishArtifactDesc}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onOpenNewStory();
                        closeAll();
                      }}
                      className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-left cursor-pointer transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Send className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#121316] dark:text-[#F5F3EF]">
                          {t.header.publishStory}
                        </div>
                        <div className="text-[10px] text-[#7A7E8A] dark:text-[#8E8B83] mt-0.5 leading-snug">
                          {t.header.publishStoryDesc}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Быстрый поиск */}
            <button
              type="button"
              onClick={() => {
                closeAll();
                onOpenSearchModal();
              }}
              className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-mono font-medium flex items-center gap-2 border border-black/8 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#52555F] dark:text-[#A3A099] hover:text-[#111317] dark:hover:text-[#F5F3EF] transition-all cursor-pointer"
              aria-label={t.header.searchAria}
            >
              <Search className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{t.header.search}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/8 dark:bg-white/10 text-[#7A7E8A] dark:text-[#8E8B83]">
                ⌘K
              </span>
            </button>

            {/* Группа «Настройки ▾» (Язык и Тема) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('settings')}
                aria-expanded={openDropdown === 'settings'}
                aria-haspopup="true"
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-mono font-medium flex items-center gap-2 border transition-all cursor-pointer ${
                  openDropdown === 'settings'
                    ? 'bg-black/10 dark:bg-white/15 border-ultramarine/60 text-ultramarine dark:text-white shadow-sm'
                    : 'bg-black/5 dark:bg-white/5 border-black/8 dark:border-white/10 text-[#52555F] dark:text-[#A3A099] hover:text-[#111317] dark:hover:text-[#F5F3EF] hover:bg-black/10 dark:hover:bg-white/10'
                }`}
                aria-label={t.header.settings}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{t.header.settings}</span>
                <span className="text-[10px] uppercase font-bold text-ultramarine">
                  {language.toUpperCase()}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${openDropdown === 'settings' ? 'rotate-180' : ''}`} />
              </button>

              {/* Settings Dropdown Panel */}
              {openDropdown === 'settings' && (
                <div 
                  className="absolute top-full right-0 mt-2 w-64 p-3 rounded-2xl bg-white/98 dark:bg-[#0E1017]/98 backdrop-blur-2xl border border-black/10 dark:border-white/15 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3"
                  role="menu"
                >
                  {/* Language Section */}
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#7A7E8A] dark:text-[#8E8B83] font-semibold mb-2">
                      <Globe className="w-3 h-3 text-ultramarine" />
                      <span>{t.header.language}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/6 dark:border-white/8">
                      <button
                        type="button"
                        onClick={() => setLanguage('ru')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          language === 'ru'
                            ? 'bg-ultramarine text-white shadow-xs'
                            : 'text-[#52555F] dark:text-[#A3A099] hover:text-black dark:hover:text-white'
                        }`}
                      >
                        <span>RU</span>
                        <span className="text-[10px] font-normal opacity-80">Русский</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLanguage('en')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          language === 'en'
                            ? 'bg-ultramarine text-white shadow-xs'
                            : 'text-[#52555F] dark:text-[#A3A099] hover:text-black dark:hover:text-white'
                        }`}
                      >
                        <span>EN</span>
                        <span className="text-[10px] font-normal opacity-80">English</span>
                      </button>
                    </div>
                  </div>

                  {/* Theme Section */}
                  <div className="pt-2 border-t border-black/6 dark:border-white/8">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#7A7E8A] dark:text-[#8E8B83] font-semibold mb-2">
                      {t.header.themeLabel}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/6 dark:border-white/8">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isDarkTheme) onToggleTheme();
                        }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isDarkTheme
                            ? 'bg-ultramarine text-white shadow-xs font-bold'
                            : 'text-[#52555F] dark:text-[#A3A099] hover:text-black dark:hover:text-white'
                        }`}
                      >
                        <Moon className="w-3 h-3 text-amber-300" />
                        <span>{language === 'ru' ? 'Тёмная' : 'Dark'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (isDarkTheme) onToggleTheme();
                        }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          !isDarkTheme
                            ? 'bg-ultramarine text-white shadow-xs font-bold'
                            : 'text-[#52555F] dark:text-[#A3A099] hover:text-black dark:hover:text-white'
                        }`}
                      >
                        <Sun className="w-3 h-3 text-amber-500" />
                        <span>{language === 'ru' ? 'Светлая' : 'Light'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Zone 3: Desktop Avatar Trigger */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => toggleDropdown('account')}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border border-black/10 dark:border-white/10 hover:border-ultramarine/60 bg-black/5 dark:bg-white/5 transition-all cursor-pointer group"
              aria-label={`${t.header.accountMenuAria}: ${activeProfile.name}`}
              aria-expanded={openDropdown === 'account'}
            >
              <img
                src={activeProfile.avatar}
                alt={activeProfile.name}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-ultramarine/50"
              />
              <span className="text-xs font-mono font-medium text-[#111317] dark:text-[#F5F3EF] max-w-[90px] truncate">
                {activeProfile.name.split(' ')[0]}
              </span>
            </button>

            {/* Desktop Account Menu Dropdown */}
            <AccountMenu
              isOpen={openDropdown === 'account'}
              onClose={() => setOpenDropdown(null)}
              activeProfile={activeProfile}
              onSelectProfile={onSelectProfile}
              onOpenProfileModal={onOpenProfileModal}
              onOpenSearchModal={onOpenSearchModal}
              isDarkTheme={isDarkTheme}
              onToggleTheme={onToggleTheme}
              onOpenAuthModal={onOpenAuthModal}
            />
          </div>
        </div>
      </header>

      {/* =====================================================================
          3. SEPARATE COMPACT MOBILE USER & SETTINGS PANEL PORTAL (< md):
             - Removed «Пространство» and «Создать» entirely (handled by bottom bar)
             - Retained user profile, RU/EN language switcher, theme switcher,
               persona selector, and account actions.
             - Height by content (h-auto), equal 12px margins, non-transparent solid background.
             - Anchored to bottom of header with 8px gap.
          ===================================================================== */}
      {isMobileMenuOpen && createPortal(
        <div 
          id="frantos-mobile-menu-portal"
          className="md:hidden fixed inset-0 z-50 animate-in fade-in duration-200"
        >
          {/* Backdrop Scrim */}
          <div 
            className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={closeAll}
            aria-hidden="true"
          />

          {/* Solid Compact Floating Menu Card Panel */}
          <div
            ref={mobilePanelRef}
            id="frantos-mobile-menu-panel"
            role="dialog"
            aria-modal="true"
            aria-label={t.header.settings}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: '12px',
              right: '12px',
              width: 'auto',
              boxSizing: 'border-box',
              top: `${headerBottom + 8}px`,
              maxHeight: `calc(100dvh - ${headerBottom + 8 + 16}px)`,
            }}
            className="box-border p-3.5 sm:p-4 rounded-2xl border shadow-2xl overflow-y-auto overscroll-contain animate-in fade-in zoom-in-95 duration-150 focus:outline-none transition-colors space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-[#FCFCFA] dark:bg-[#0A0D15] border-black/12 dark:border-white/15 text-[#121316] dark:text-[#F5F3EF]"
          >
            {/* 1. Active Art Director Profile Card */}
            <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/8 dark:border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={activeProfile.avatar}
                  alt={activeProfile.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-ultramarine/50 flex-shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold font-mono text-[#121316] dark:text-[#F5F3EF] truncate">
                    {activeProfile.name}
                  </div>
                  <div className="text-[10px] text-ultramarine font-mono truncate">
                    {activeProfile.role}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  closeAll();
                  onOpenProfileModal();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-ultramarine/10 hover:bg-ultramarine/20 text-ultramarine text-xs font-mono font-semibold transition-colors cursor-pointer flex-shrink-0 touch-manipulation"
              >
                {language === 'ru' ? 'Профиль' : 'Profile'}
              </button>
            </div>

            {/* 2. Language Switcher (RU / EN) */}
            <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/8 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#52555F] dark:text-[#A3A099] font-semibold">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-ultramarine" />
                  <span>{t.accountMenu.languageSetting}</span>
                </span>
                <span className="text-[10px] font-bold text-ultramarine">
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
                >
                  {language === 'en' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  <span>English (EN)</span>
                </button>
              </div>
            </div>

            {/* 3. Theme Switcher (Dark / Light) */}
            <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/8 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#52555F] dark:text-[#A3A099] font-semibold">
                <span className="flex items-center gap-1.5">
                  {isDarkTheme ? <Moon className="w-3.5 h-3.5 text-amber-300" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                  <span>{t.accountMenu.themeSetting}</span>
                </span>
                <span className="text-[10px] text-ultramarine font-bold">
                  {isDarkTheme ? (language === 'ru' ? 'ТЁМНАЯ' : 'DARK') : (language === 'ru' ? 'СВЕТЛАЯ' : 'LIGHT')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!isDarkTheme) onToggleTheme();
                  }}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all cursor-pointer touch-manipulation ${
                    isDarkTheme
                      ? 'bg-ultramarine text-white shadow-md shadow-ultramarine/25 font-bold'
                      : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#52555F] dark:text-[#A3A099]'
                  }`}
                >
                  <Moon className="w-4 h-4 text-amber-300" />
                  <span>{language === 'ru' ? 'Тёмная' : 'Dark'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isDarkTheme) onToggleTheme();
                  }}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all cursor-pointer touch-manipulation ${
                    !isDarkTheme
                      ? 'bg-ultramarine text-white shadow-md shadow-ultramarine/25 font-bold'
                      : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#52555F] dark:text-[#A3A099]'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>{language === 'ru' ? 'Светлая' : 'Light'}</span>
                </button>
              </div>
            </div>

            {/* 4. Switch Demo Persona (Expandable/Collapsible list) */}
            <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/8 dark:border-white/10 space-y-1.5">
              <button
                type="button"
                onClick={() => setIsSwitchingPersona((prev) => !prev)}
                className="w-full flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#52555F] dark:text-[#A3A099] font-semibold cursor-pointer touch-manipulation"
              >
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-ultramarine" />
                  <span>{t.accountMenu.switchPersona}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isSwitchingPersona ? 'rotate-180' : ''}`} />
              </button>

              {isSwitchingPersona && (
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1 pt-1 border-t border-black/6 dark:border-white/6">
                  {CREATOR_PROFILES.map((prof) => {
                    const isCurrent = activeProfile.id === prof.id;
                    return (
                      <button
                        key={prof.id}
                        type="button"
                        onClick={() => {
                          onSelectProfile(prof);
                          closeAll();
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors cursor-pointer min-h-[40px] touch-manipulation ${
                          isCurrent
                            ? 'bg-ultramarine/15 text-ultramarine font-bold border border-ultramarine/30'
                            : 'hover:bg-black/5 dark:hover:bg-white/5 text-[#52555F] dark:text-[#A3A099]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img src={prof.avatar} alt={prof.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                          <span className="truncate">{prof.name}</span>
                        </div>
                        {isCurrent && <Check className="w-4 h-4 text-ultramarine flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 5. Cloud Sync Action */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => {
                  closeAll();
                  onOpenAuthModal();
                }}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-black/8 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-mono flex items-center justify-between transition-colors cursor-pointer touch-manipulation"
              >
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-ultramarine" />
                  <span>{t.accountMenu.cloudSync}</span>
                </div>
                <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                  Active
                </span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default Header;
