import React, { useState, useEffect, useRef } from 'react';
import { Plus, Sparkles, Send, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface PublishControlProps {
  onOpenPublishArtifact: () => void;
  onOpenNewStory: () => void;
  className?: string;
}

export const PublishControl: React.FC<PublishControlProps> = ({
  onOpenPublishArtifact,
  onOpenNewStory,
  className = '',
}) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const secondOptionRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on outside click or touch
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        toggleBtnRef.current?.focus();
      }
    };

    const handlePopState = () => {
      if (isOpen) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      window.addEventListener('popstate', handlePopState);
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Focus management when menu opens
  useEffect(() => {
    if (isOpen) {
      firstOptionRef.current?.focus();
    }
  }, [isOpen]);

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      secondOptionRef.current?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      firstOptionRef.current?.focus();
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative inline-block ${className}`} ref={menuRef}>
      {/* Primary Single Publish Button */}
      <button
        id="btn-primary-publish"
        ref={toggleBtnRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="primary-publish-dropdown-menu"
        aria-label={t.header.publishBtn}
        className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-mono text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-ultramarine/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ultramarine focus-visible:ring-offset-2 select-none touch-manipulation ${
          isOpen
            ? 'bg-ultramarine text-white ring-2 ring-ultramarine scale-[0.98]'
            : 'bg-ultramarine hover:bg-blue-600 active:scale-95 text-white'
        }`}
      >
        <Plus className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`} />
        <span>{t.header.publishBtn}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Backdrop overlay on mobile to dismiss cleanly */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-transparent" 
          onClick={() => setIsOpen(false)}
          aria-hidden="true" 
        />
      )}

      {/* Accessible 2-Option Menu - anchored to right-0 */}
      {isOpen && (
        <div
          id="primary-publish-dropdown-menu"
          role="menu"
          aria-label={t.header.publishBtn}
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] p-2.5 rounded-2xl bg-[#F8F7F4]/98 dark:bg-[#0E1015]/98 backdrop-blur-2xl border border-black/10 dark:border-white/15 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-[#121316] dark:text-[#F5F3EF]"
        >
          <div className="p-2 border-b border-black/10 dark:border-white/10 mb-1.5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-[#7A7E8A] dark:text-[#A3A099]">
              {t.header.publishBtn}
            </p>
          </div>

          <div className="space-y-1.5">
            {/* Option 1: Publish New Artifact */}
            <button
              id="btn-publish-artifact-option"
              type="button"
              ref={firstOptionRef}
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onOpenPublishArtifact();
              }}
              className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ultramarine group min-h-[48px] touch-manipulation"
            >
              <div className="w-9 h-9 rounded-xl bg-ultramarine/15 border border-ultramarine/30 text-ultramarine flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-bold text-[#121316] dark:text-white group-hover:text-ultramarine transition-colors">
                  {t.header.publishArtifact}
                </div>
                <p className="text-[11px] text-[#52555F] dark:text-[#A3A099] leading-tight mt-0.5">
                  {t.header.publishArtifactDesc}
                </p>
              </div>
            </button>

            {/* Option 2: Broadcast Process Moment */}
            <button
              id="btn-broadcast-moment-option"
              type="button"
              ref={secondOptionRef}
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onOpenNewStory();
              }}
              className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 group min-h-[48px] touch-manipulation"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <Send className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-bold text-[#121316] dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {t.header.publishStory}
                </div>
                <p className="text-[11px] text-[#52555F] dark:text-[#A3A099] leading-tight mt-0.5">
                  {t.header.publishStoryDesc}
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
