import React, { useState } from 'react';
import { 
  Search, 
  Sun, 
  Moon, 
  Compass, 
  Layers, 
  FolderKanban, 
  CloudSun, 
  User, 
  Plus, 
  Check, 
  SlidersHorizontal,
  X
} from 'lucide-react';
import { CreativeDiscipline, CreatorProfile } from '../../types';
import { CREATOR_PROFILES } from '../../data/mockData';

interface HeaderProps {
  activeTab: 'feed' | 'workspace' | 'moodboard' | 'weather';
  onSelectTab: (tab: 'feed' | 'workspace' | 'moodboard' | 'weather') => void;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  activeDiscipline: CreativeDiscipline | 'all';
  onSelectDiscipline: (discipline: CreativeDiscipline | 'all') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeProfile: CreatorProfile;
  onSelectProfile: (profile: CreatorProfile) => void;
  onOpenNewStory: () => void;
  onOpenProfileModal: () => void;
  onOpenAuthModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  isDarkTheme,
  onToggleTheme,
  searchQuery,
  onSearchChange,
  activeProfile,
  onSelectProfile,
  onOpenNewStory,
  onOpenProfileModal,
  onOpenAuthModal,
}) => {
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  return (
    <header 
      id="frantos-main-header"
      className="sticky top-0 z-40 w-full backdrop-blur-xl border-b border-black/10 dark:border-white/10 bg-[#F8F7F4]/90 dark:bg-[#090B0E]/80 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* Brand Wordmark Lockup */}
        <div className="flex items-center gap-6">
          <button 
            id="brand-logo-btn"
            onClick={() => onSelectTab('feed')}
            className="text-left group focus:outline-none cursor-pointer"
            aria-label="FrantoS Home"
          >
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-2xl tracking-[0.25em] text-[#111317] dark:text-[#F3F1EC] group-hover:text-cyan-500 transition-colors">
                FRANTOS
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-400 font-semibold">
                PRO 2026
              </span>
            </div>
            <div className="text-[9px] font-mono tracking-widest uppercase text-[#4A505C] dark:text-zinc-500 mt-0.5">
              Private Creative Workspace
            </div>
          </button>

          {/* Primary Navigation Tabs (Desktop) */}
          <nav aria-label="Main studio workspace navigation" className="hidden lg:flex items-center gap-1 pl-4 border-l border-black/10 dark:border-white/10">
            <button
              id="nav-tab-feed"
              onClick={() => onSelectTab('feed')}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium tracking-tight transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'feed'
                  ? 'bg-black/10 dark:bg-white/15 text-[#111317] dark:text-white font-semibold shadow-sm'
                  : 'text-[#4A505C] dark:text-zinc-400 hover:text-[#111317] dark:hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Creative Feed</span>
            </button>

            <button
              id="nav-tab-workspace"
              onClick={() => onSelectTab('workspace')}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium tracking-tight transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'workspace'
                  ? 'bg-black/10 dark:bg-white/15 text-[#111317] dark:text-white font-semibold shadow-sm'
                  : 'text-[#4A505C] dark:text-zinc-400 hover:text-[#111317] dark:hover:text-white'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>Studio Workspace</span>
            </button>

            <button
              id="nav-tab-moodboard"
              onClick={() => onSelectTab('moodboard')}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium tracking-tight transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'moodboard'
                  ? 'bg-black/10 dark:bg-white/15 text-[#111317] dark:text-white font-semibold shadow-sm'
                  : 'text-[#4A505C] dark:text-zinc-400 hover:text-[#111317] dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Spatial Moodboard</span>
            </button>

            <button
              id="nav-tab-weather"
              onClick={() => onSelectTab('weather')}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium tracking-tight transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'weather'
                  ? 'bg-black/10 dark:bg-white/15 text-[#111317] dark:text-white font-semibold shadow-sm'
                  : 'text-[#4A505C] dark:text-zinc-400 hover:text-[#111317] dark:hover:text-white'
              }`}
            >
              <CloudSun className="w-3.5 h-3.5" />
              <span>Creative Weather</span>
            </button>
          </nav>
        </div>

        {/* Global Search & Action Controls */}
        <div className="flex items-center gap-3">
          
          {/* Live Search Input */}
          <div className="relative hidden md:block w-48 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <input
              id="input-global-search"
              type="text"
              placeholder="Search exhibits, WIPs..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-7 py-1.5 rounded-full text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[#111317] dark:text-[#F3F1EC] placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors font-sans"
            />
            {searchQuery && (
              <button 
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-[#111317] dark:hover:text-white"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* New Moment Button */}
          <button
            id="btn-new-story"
            onClick={onOpenNewStory}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post Moment</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            id="btn-theme-toggle"
            onClick={onToggleTheme}
            className="p-2 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/15 text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer"
            aria-label={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkTheme ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Demo Persona & Profile Switcher */}
          <div className="relative">
            <button
              id="btn-persona-menu"
              onClick={() => setShowPersonaMenu(!showPersonaMenu)}
              className="flex items-center gap-2 p-1 pr-2.5 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/15 transition-all cursor-pointer"
              aria-label="Active creator persona"
            >
              <img
                src={activeProfile.avatar}
                alt={activeProfile.name}
                className="w-7 h-7 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/20"
              />
              <span className="hidden sm:block text-xs font-medium text-[#111317] dark:text-[#F3F1EC]">
                {activeProfile.name.split(' ')[0]}
              </span>
            </button>

            {/* Persona Dropdown Menu */}
            {showPersonaMenu && (
              <div 
                id="persona-dropdown-menu"
                className="absolute right-0 mt-2 w-64 p-2 rounded-2xl bg-white/95 dark:bg-[#11141A]/95 backdrop-blur-xl border border-black/10 dark:border-white/15 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-[#111317] dark:text-[#F3F1EC]"
              >
                <div className="p-2 border-b border-black/10 dark:border-white/10 mb-1">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Active Demo Persona
                  </p>
                  <p className="text-xs font-semibold text-[#111317] dark:text-[#F3F1EC] mt-0.5">
                    {activeProfile.name}
                  </p>
                  <p className="text-[11px] text-[#4A505C] dark:text-zinc-400">{activeProfile.role}</p>
                </div>

                <div className="space-y-1">
                  {CREATOR_PROFILES.map((prof) => (
                    <button
                      key={prof.id}
                      onClick={() => {
                        onSelectProfile(prof);
                        setShowPersonaMenu(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                        activeProfile.id === prof.id
                          ? 'bg-black/10 dark:bg-white/15 text-[#111317] dark:text-white font-semibold'
                          : 'hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <img src={prof.avatar} alt={prof.name} className="w-5 h-5 rounded-full object-cover" />
                        <span>{prof.name}</span>
                      </div>
                      {activeProfile.id === prof.id && <Check className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />}
                    </button>
                  ))}
                </div>

                <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10 flex flex-col gap-1">
                  <button
                    onClick={() => {
                      onOpenProfileModal();
                      setShowPersonaMenu(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>View Full Studio Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      onOpenAuthModal();
                      setShowPersonaMenu(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 flex items-center gap-2 font-mono cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Supabase Auth & Session</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Navigation Menu Toggle */}
          <button
            id="btn-mobile-nav"
            onClick={() => setShowMobileNav(!showMobileNav)}
            className="lg:hidden p-2 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-[#111317] dark:text-white"
            aria-label="Toggle navigation menu"
          >
            <Compass className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {showMobileNav && (
        <div className="lg:hidden border-t border-black/10 dark:border-white/10 px-4 py-3 bg-[#F8F7F4]/98 dark:bg-[#090B0E]/95 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { onSelectTab('feed'); setShowMobileNav(false); }}
              className={`p-2.5 rounded-xl text-xs text-left ${activeTab === 'feed' ? 'bg-black/10 dark:bg-white/15 text-[#111317] dark:text-white font-semibold' : 'text-zinc-600 dark:text-zinc-400'}`}
            >
              Creative Feed
            </button>
            <button
              onClick={() => { onSelectTab('workspace'); setShowMobileNav(false); }}
              className={`p-2.5 rounded-xl text-xs text-left ${activeTab === 'workspace' ? 'bg-black/10 dark:bg-white/15 text-[#111317] dark:text-white font-semibold' : 'text-zinc-600 dark:text-zinc-400'}`}
            >
              Studio Workspace
            </button>
            <button
              onClick={() => { onSelectTab('moodboard'); setShowMobileNav(false); }}
              className={`p-2.5 rounded-xl text-xs text-left ${activeTab === 'moodboard' ? 'bg-black/10 dark:bg-white/15 text-[#111317] dark:text-white font-semibold' : 'text-zinc-600 dark:text-zinc-400'}`}
            >
              Spatial Moodboard
            </button>
            <button
              onClick={() => { onSelectTab('weather'); setShowMobileNav(false); }}
              className={`p-2.5 rounded-xl text-xs text-left ${activeTab === 'weather' ? 'bg-black/10 dark:bg-white/15 text-[#111317] dark:text-white font-semibold' : 'text-zinc-600 dark:text-zinc-400'}`}
            >
              Creative Weather
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
