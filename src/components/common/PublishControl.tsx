import React, { useState, useEffect, useRef } from 'react';
import { Plus, Sparkles, Send, ChevronDown } from 'lucide-react';

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
        aria-label="Publish creative work"
        className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-mono text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 select-none ${
          isOpen
            ? 'bg-cyan-400 text-black ring-2 ring-cyan-500 scale-[0.98]'
            : 'bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-black hover:shadow-cyan-500/20'
        }`}
      >
        <Plus className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`} />
        <span>Publish</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Accessible 2-Option Menu */}
      {isOpen && (
        <div
          id="primary-publish-dropdown-menu"
          role="menu"
          aria-label="Publish options"
          onKeyDown={handleMenuKeyDown}
          className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] p-2.5 rounded-2xl bg-white dark:bg-[#11141A] backdrop-blur-2xl border border-black/10 dark:border-white/15 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-[#111317] dark:text-[#F3F1EC]"
        >
          <div className="p-2 border-b border-black/10 dark:border-white/10 mb-1.5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Publishing Actions
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
              className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 group min-h-[48px]"
            >
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-bold text-[#111317] dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  Publish New Artifact
                </div>
                <p className="text-[11px] text-[#4A505C] dark:text-zinc-400 leading-tight mt-0.5">
                  Create project, case study, or WIP post for Feed
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
              className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 group min-h-[48px]"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <Send className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-bold text-[#111317] dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Broadcast Process Moment
                </div>
                <p className="text-[11px] text-[#4A505C] dark:text-zinc-400 leading-tight mt-0.5">
                  Create Story or short creative process moment
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
