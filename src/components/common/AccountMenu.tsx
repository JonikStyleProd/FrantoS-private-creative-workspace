import React, { useEffect, useRef } from 'react';
import { User, Check, Cloud } from 'lucide-react';
import { CreatorProfile } from '../../types';
import { CREATOR_PROFILES } from '../../data/mockData';
import { useLanguage } from '../../i18n/LanguageContext';

export interface AccountMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfile: CreatorProfile;
  onSelectProfile: (profile: CreatorProfile) => void;
  onOpenProfileModal: () => void;
  onOpenSearchModal?: () => void;
  isDarkTheme?: boolean;
  onToggleTheme?: () => void;
  onOpenAuthModal: () => void;
}

export const AccountMenu: React.FC<AccountMenuProps> = ({
  isOpen,
  onClose,
  activeProfile,
  onSelectProfile,
  onOpenProfileModal,
  isDarkTheme,
  onOpenAuthModal,
}) => {
  const { t } = useLanguage();
  const menuRef = useRef<HTMLDivElement>(null);

  // Determine dark mode state accurately
  const isDark = isDarkTheme ?? (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  // Close on Escape key or clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
      if (menuRef.current && !menuRef.current.contains(target)) {
        // Let the trigger button handle its own toggle if clicked
        if (target.closest('[data-account-trigger="true"]')) {
          return;
        }
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      id="desktop-account-menu-dropdown"
      role="menu"
      aria-label={t.header.accountMenuAria}
      style={{
        backgroundColor: isDark ? '#151925' : '#FFFFFF',
        opacity: 1,
      }}
      className="hidden md:block absolute right-0 top-full mt-2.5 w-[310px] max-w-[calc(100vw-24px)] p-3 rounded-[16px] border border-black/10 dark:border-white/10 shadow-2xl z-50 text-[#121316] dark:text-[#F5F3EF] animate-in fade-in zoom-in-95 duration-150 box-border select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. ВЫБОР ДЕМО-ПЕРСОНЫ ИЗ СУЩЕСТВУЮЩЕГО СПИСКА */}
      <div className="space-y-1">
        <div className="px-2 pb-1 text-[11px] font-mono uppercase tracking-wider text-[#7A7E8A] dark:text-[#8E8B83] font-semibold">
          {t.accountMenu.switchPersona}
        </div>
        <div className="space-y-1" role="group" aria-label={t.accountMenu.switchPersona}>
          {CREATOR_PROFILES.map((prof) => {
            const isCurrent = activeProfile.id === prof.id;
            return (
              <button
                key={prof.id}
                type="button"
                role="menuitemradio"
                aria-checked={isCurrent}
                onClick={() => {
                  onSelectProfile(prof);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer min-h-[44px] box-border ${
                  isCurrent
                    ? 'bg-ultramarine/12 dark:bg-ultramarine/20 border border-ultramarine/35 text-ultramarine shadow-xs'
                    : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent text-[#52555F] dark:text-[#A3A099] hover:text-[#121316] dark:hover:text-[#F5F3EF]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={prof.avatar}
                    alt={prof.name}
                    className={`w-8 h-8 rounded-full object-cover flex-shrink-0 aspect-square ${
                      isCurrent ? 'ring-2 ring-ultramarine' : 'ring-1 ring-black/10 dark:ring-white/15'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className={`text-xs font-bold truncate leading-tight ${isCurrent ? 'text-ultramarine' : 'text-[#121316] dark:text-[#F5F3EF]'}`}>
                      {prof.name}
                    </div>
                    <div className={`text-[10px] truncate mt-0.5 leading-tight ${isCurrent ? 'text-ultramarine/80 font-medium' : 'text-[#7A7E8A] dark:text-[#8E8B83]'}`}>
                      {prof.role}
                    </div>
                  </div>
                </div>
                {isCurrent && (
                  <div className="w-5 h-5 rounded-full bg-ultramarine/20 text-ultramarine flex items-center justify-center flex-shrink-0 ml-2">
                    <Check className="w-3.5 h-3.5 stroke-[2.8]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* РАЗДЕЛИТЕЛЬ */}
      <div className="my-2 border-t border-black/8 dark:border-white/10" />

      {/* 2. «РЕДАКТИРОВАТЬ ПРОФИЛЬ» */}
      <div className="space-y-1.5">
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            onOpenProfileModal();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-mono font-medium text-[#121316] dark:text-[#F5F3EF] bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/8 dark:hover:bg-white/10 border border-black/8 dark:border-white/10 transition-colors cursor-pointer min-h-[44px]"
        >
          <User className="w-4 h-4 text-ultramarine flex-shrink-0" />
          <span className="font-semibold">{t.accountMenu.editProfile}</span>
        </button>

        {/* 3. «СИНХРОНИЗАЦИЯ С ОБЛАКОМ» */}
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            onOpenAuthModal();
          }}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-mono font-bold text-ultramarine bg-ultramarine/10 hover:bg-ultramarine/20 border border-ultramarine/25 transition-colors cursor-pointer min-h-[44px]"
        >
          <div className="flex items-center gap-2.5">
            <Cloud className="w-4 h-4 text-ultramarine flex-shrink-0" />
            <span>{t.accountMenu.cloudSync}</span>
          </div>
        </button>
      </div>
    </div>
  );
};
