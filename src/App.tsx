import React, { useState, useEffect } from 'react';
import { 
  CreativeDiscipline, 
  ProjectExhibit, 
  Story, 
  WorkspaceTask, 
  MoodboardItem, 
  CreatorProfile 
} from './types';
import { CREATOR_PROFILES, CREATIVE_DISCIPLINES } from './data/mockData';
import { frantosDB } from './services/supabaseClient';
import { Header, AtelierTab } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { CreativeCore3D } from './components/core/CreativeCore3D';
import { ProjectExhibitCard } from './components/feed/ProjectExhibitCard';
import { ProjectDetailModal } from './components/feed/ProjectDetailModal';
import { NewExhibitModal } from './components/feed/NewExhibitModal';
import { RecentlyViewedStrip } from './components/feed/RecentlyViewedStrip';
import { ContinueWorkingSection } from './components/feed/ContinueWorkingSection';
import { FeedFiltersToolbar, FilterStatus, SortOption } from './components/feed/FeedFiltersToolbar';
import { StoriesRail } from './components/stories/StoriesRail';
import { StoryViewerModal } from './components/stories/StoryViewerModal';
import { NewStoryModal } from './components/stories/NewStoryModal';
import { WorkspaceView } from './components/workspace/WorkspaceView';
import { MoodboardCanvas } from './components/moodboard/MoodboardCanvas';
import { CreativeWeatherWidget } from './components/weather/CreativeWeatherWidget';
import { CreatorProfileModal } from './components/profile/CreatorProfileModal';
import { AuthModal } from './components/auth/AuthModal';
import { SearchOverlayModal } from './components/search/SearchOverlayModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { 
  RotateCcw, 
  Plus, 
  Sparkles, 
  Compass, 
  FolderKanban, 
  Grid, 
  Layers, 
  Activity, 
  Send, 
  X,
  MoreHorizontal
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useLanguage } from './i18n/LanguageContext';

export function App() {
  const { t, language } = useLanguage();
  // Theme state: dark mode default (ink graphite)
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  
  // Navigation tabs — Digital Atelier 2026 5 Primary Spaces
  const [activeTab, setActiveTab] = useState<AtelierTab>('overview');

  // Discipline Filter
  const [activeDiscipline, setActiveDiscipline] = useState<CreativeDiscipline | 'all'>('all');

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Catalog Filter Toolbar States
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortOption, setSortOption] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'dense'>('grid');

  // Active Demo Persona
  const [activeProfile, setActiveProfile] = useState<CreatorProfile>(() => {
    const override = frantosDB.getProfileOverride();
    return override || CREATOR_PROFILES[0];
  });

  // Data collections from persistent local storage
  const [exhibits, setExhibits] = useState<ProjectExhibit[]>(() => frantosDB.getExhibits());
  const [stories, setStories] = useState<Story[]>(() => frantosDB.getStories());
  const [tasks, setTasks] = useState<WorkspaceTask[]>(() => frantosDB.getTasks());
  const [moodboardItems, setMoodboardItems] = useState<MoodboardItem[]>(() => frantosDB.getMoodboard());
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => frantosDB.getRecentlyViewed());

  // Modals & Panels
  const [selectedExhibit, setSelectedExhibit] = useState<ProjectExhibit | null>(null);
  const [editingExhibit, setEditingExhibit] = useState<ProjectExhibit | null>(null);
  const [isNewExhibitOpen, setIsNewExhibitOpen] = useState(false);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [isNewStoryOpen, setIsNewStoryOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isMobilePublishSheetOpen, setIsMobilePublishSheetOpen] = useState(false);
  const [isMoreSpacesSheetOpen, setIsMoreSpacesSheetOpen] = useState(false);

  // Toast Action notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync theme with HTML document class
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkTheme) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [isDarkTheme]);

  // Handle URL hash routing & browser Back/Forward navigation
  useEffect(() => {
    const handleHashSync = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '').trim();
      if (hash === 'catalog') {
        setActiveTab('catalog');
      } else if (hash === 'workspace') {
        setActiveTab('workspace');
      } else if (hash === 'moodboard') {
        setActiveTab('moodboard');
      } else if (hash === 'atmosphere' || hash === 'weather') {
        setActiveTab('atmosphere');
      } else if (hash === 'overview' || hash === 'feed') {
        setActiveTab('overview');
      }
    };

    handleHashSync();
    window.addEventListener('popstate', handleHashSync);
    window.addEventListener('hashchange', handleHashSync);
    return () => {
      window.removeEventListener('popstate', handleHashSync);
      window.removeEventListener('hashchange', handleHashSync);
    };
  }, []);

  const handleSelectTab = (tab: AtelierTab) => {
    setActiveTab(tab);
    if (window.location.hash !== `#/${tab}`) {
      window.history.pushState(null, '', `#/${tab}`);
    }
    // Scroll to top on tab change for clean focus
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  // Select Exhibit & record recently viewed
  const handleSelectExhibit = (exhibit: ProjectExhibit) => {
    setSelectedExhibit(exhibit);
    const updatedRecent = frantosDB.addRecentlyViewed(exhibit.id);
    setRecentlyViewedIds(updatedRecent);
  };

  const handleToggleLike = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = frantosDB.toggleLike(id);
    setExhibits(updated);
    if (selectedExhibit && selectedExhibit.id === id) {
      const match = updated.find((ex) => ex.id === id);
      if (match) setSelectedExhibit(match);
    }
  };

  const handleToggleSave = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = frantosDB.toggleSave(id);
    setExhibits(updated);
    if (selectedExhibit && selectedExhibit.id === id) {
      const match = updated.find((ex) => ex.id === id);
      if (match) setSelectedExhibit(match);
    }

    try {
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { y: 0.85 },
        colors: ['#386BF6', '#F5F3EF', '#10B981'],
      });
    } catch {}
  };

  const handleSaveExhibit = (exhibit: ProjectExhibit) => {
    const updated = frantosDB.saveExhibit(exhibit);
    setExhibits(updated);
    if (selectedExhibit?.id === exhibit.id) {
      setSelectedExhibit(exhibit);
    }
    showToast(language === 'ru' ? `Проект «${exhibit.title}» опубликован в каталог студии` : `Project "${exhibit.title}" published to catalog`);
  };

  const handleDeleteExhibit = (id: string) => {
    const updated = frantosDB.deleteExhibit(id);
    setExhibits(updated);
    if (selectedExhibit?.id === id) {
      setSelectedExhibit(null);
    }
    showToast(language === 'ru' ? 'Проект удалён из архива' : 'Project removed from archive');
  };

  const handleEditExhibit = (exhibit: ProjectExhibit) => {
    setEditingExhibit(exhibit);
    setIsNewExhibitOpen(true);
  };

  const handlePinToMoodboard = (item: MoodboardItem) => {
    const updated = [...moodboardItems, item];
    setMoodboardItems(updated);
    frantosDB.saveMoodboard(updated);
    showToast(language === 'ru' ? `«${item.title}» закреплён на холсте мудборда` : `"${item.title}" pinned to canvas`);
  };

  const handleSendToWorkspace = (task: WorkspaceTask) => {
    const updated = [task, ...tasks];
    setTasks(updated);
    frantosDB.saveTasks(updated);
    showToast(language === 'ru' ? `Создана задача спринта: «${task.title}»` : `Sprint task created: "${task.title}"`);
  };

  const handleAddStory = (newStory: Story) => {
    const updated = frantosDB.addStory(newStory);
    setStories(updated);
    showToast(language === 'ru' ? 'Момент процесса опубликован' : 'Process moment broadcasted');
  };

  const handleToggleLikeStory = (storyId: string) => {
    const updated = frantosDB.toggleLikeStory(storyId);
    setStories(updated);
    if (activeStory?.id === storyId) {
      const match = updated.find((s: Story) => s.id === storyId);
      if (match) setActiveStory(match);
    }
  };

  const handleToggleSaveStory = (storyId: string) => {
    const updated = frantosDB.toggleSaveStory(storyId);
    setStories(updated);
    if (activeStory?.id === storyId) {
      const match = updated.find((s: Story) => s.id === storyId);
      if (match) setActiveStory(match);
    }
    showToast(language === 'ru' ? 'Момент сохранён в избранное' : 'Moment saved to vault');
  };

  const handleUpdateTasks = (newTasks: WorkspaceTask[]) => {
    setTasks(newTasks);
    frantosDB.saveTasks(newTasks);
  };

  const handleUpdateMoodboard = (newItems: MoodboardItem[]) => {
    setMoodboardItems(newItems);
    frantosDB.saveMoodboard(newItems);
  };

  const handleUpdateProfile = (updated: CreatorProfile) => {
    setActiveProfile(updated);
    showToast(language === 'ru' ? 'Профиль арт-директора обновлён' : 'Director profile updated');
  };

  // Recently inspected exhibit objects
  const recentlyViewedExhibits = recentlyViewedIds
    .map((id) => exhibits.find((ex) => ex.id === id))
    .filter((ex): ex is ProjectExhibit => Boolean(ex));

  // Filter & Sort Exhibits for Catalog View
  const filteredExhibits = exhibits
    .filter((ex) => {
      // Discipline filter
      const matchesDiscipline = activeDiscipline === 'all' || ex.discipline === activeDiscipline;
      
      // Search query
      const matchesSearch = 
        !searchQuery.trim() ||
        ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        ex.author.name.toLowerCase().includes(searchQuery.toLowerCase());

      // Pipeline status filter
      let matchesStatus = true;
      const isExhibitWip = ex.format === 'wip-process' || (ex.wipProgress !== undefined && ex.wipProgress < 100);
      if (filterStatus === 'wip') matchesStatus = isExhibitWip;
      if (filterStatus === 'finished') matchesStatus = !isExhibitWip;
      if (filterStatus === 'saved') matchesStatus = ex.isSaved === true;
      if (filterStatus === 'mine') matchesStatus = ex.author.id === activeProfile.id || ex.author.name === activeProfile.name || ex.isUserCreated === true;

      return matchesDiscipline && matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortOption === 'likes') return b.likesCount - a.likesCount;
      if (sortOption === 'saves') return b.savesCount - a.savesCount;
      if (sortOption === 'views') return (b.likesCount * 4 + b.savesCount * 6) - (a.likesCount * 4 + a.savesCount * 6);
      return 0;
    });

  return (
    <ErrorBoundary>
      <div className={`min-h-screen bg-transparent ${isDarkTheme ? 'text-[#F5F3EF]' : 'text-[#121316]'} transition-colors duration-300 font-sans selection:bg-ultramarine/30 selection:text-white`}>
        
        {/* Master Atelier Sticky Header */}
        <Header
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          isDarkTheme={isDarkTheme}
          onToggleTheme={handleToggleTheme}
          activeProfile={activeProfile}
          onSelectProfile={setActiveProfile}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenSearchModal={() => setIsSearchModalOpen(true)}
          onOpenPublishArtifact={() => {
            setEditingExhibit(null);
            setIsNewExhibitOpen(true);
          }}
          onOpenNewStory={() => setIsNewStoryOpen(true)}
        />

        {/* Main Atelier Spaces (No secondary sub-bars — zero wasted vertical height) */}
        <main className="w-full pb-24 md:pb-16 min-h-[calc(100vh-5rem)]">
          
          {/* SPACE 1: ОБЗОР ПРОСТРАНСТВА (OVERVIEW) — Centerpiece artwork + 3D Orbit + Stories + Wips */}
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              
              {/* Atelier Hero Stage (Featured Project Centerpiece + Orbit) */}
              <CreativeCore3D
                activeDiscipline={activeDiscipline}
                onSelectDiscipline={setActiveDiscipline}
                isDarkTheme={isDarkTheme}
                exhibits={exhibits}
                onSelectExhibit={handleSelectExhibit}
              />

              {/* Process Moments & WIP Stories Rail */}
              <StoriesRail
                stories={stories}
                onSelectStory={setActiveStory}
                onOpenNewStory={() => setIsNewStoryOpen(true)}
              />

              {/* Continue Working on Active Sprints */}
              <ContinueWorkingSection
                exhibits={exhibits}
                onSelectExhibit={handleSelectExhibit}
                onOpenWorkspace={() => handleSelectTab('workspace')}
                onOpenNewWip={() => {
                  setEditingExhibit(null);
                  setIsNewExhibitOpen(true);
                }}
              />

              {/* Recently Inspected History Strip */}
              <RecentlyViewedStrip
                recentExhibits={recentlyViewedExhibits}
                onSelectExhibit={handleSelectExhibit}
                onClearRecent={() => {
                  frantosDB.clearRecentlyViewed();
                  setRecentlyViewedIds([]);
                }}
              />
            </div>
          )}

          {/* SPACE 2: КАТАЛОГ ПРОЕКТОВ (CATALOG) — Visual Editorial Exhibition */}
          {activeTab === 'catalog' && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300 space-y-8">
              
              {/* Visual Catalogue Masthead */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-black/8 dark:border-white/8 pb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-ultramarine" />
                    <span className="font-mono text-xs uppercase tracking-widest text-ultramarine font-semibold">
                      {t.catalog.mastheadBadge}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-black tracking-tight text-[#121316] dark:text-[#F5F3EF]">
                    {activeDiscipline === 'all'
                      ? t.catalog.titleAll
                      : `${CREATIVE_DISCIPLINES.find((d) => d.id === activeDiscipline)?.label} ${t.catalog.titleDiscipline}`}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#52555F] dark:text-[#A3A099] mt-1.5 max-w-xl">
                    {t.catalog.subtitle}
                  </p>
                </div>

                {/* Reset Discipline Action */}
                {activeDiscipline !== 'all' && (
                  <button
                    onClick={() => setActiveDiscipline('all')}
                    className="min-h-[44px] px-4 py-2 rounded-full text-xs font-mono bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-[#121316] dark:text-white flex items-center gap-2 transition-colors cursor-pointer border border-black/8 dark:border-transparent self-start md:self-auto touch-manipulation"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t.catalog.allDisciplines}</span>
                  </button>
                )}
              </div>

              {/* Catalog Filter & Sort Toolbar */}
              <FeedFiltersToolbar
                activeStatus={filterStatus}
                onStatusChange={setFilterStatus}
                activeSort={sortOption}
                onSortChange={setSortOption}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                totalCount={filteredExhibits.length}
              />

              {/* Unboxed Project Exhibit Plates (1-2 columns on mobile, 3-4 on desktop) */}
              <div className="space-y-8">
                <div className={`grid gap-8 ${
                  viewMode === 'dense'
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                }`}>
                  {filteredExhibits.map((ex) => (
                    <ProjectExhibitCard
                      key={ex.id}
                      exhibit={ex}
                      onSelect={handleSelectExhibit}
                      onToggleLike={handleToggleLike}
                      onToggleSave={handleToggleSave}
                      onPinToMoodboard={handlePinToMoodboard}
                      onSendToWorkspace={handleSendToWorkspace}
                      onEditExhibit={handleEditExhibit}
                      onDeleteExhibit={handleDeleteExhibit}
                      activeUserId={activeProfile.id}
                    />
                  ))}
                </div>

                {/* Empty State */}
                {filteredExhibits.length === 0 && (
                  <div className="p-16 rounded-3xl border border-dashed border-black/15 dark:border-white/10 text-center space-y-4 bg-black/[0.02] dark:bg-white/[0.02]">
                    <p className="text-[#52555F] dark:text-[#A3A099] font-mono text-sm">
                      {t.catalog.emptyTitle}
                    </p>
                    <div className="flex flex-wrap justify-center gap-3 pt-2">
                      <button
                        onClick={() => {
                          setActiveDiscipline('all');
                          setFilterStatus('all');
                          setSearchQuery('');
                        }}
                        className="min-h-[44px] px-5 py-2.5 rounded-full bg-ultramarine hover:bg-ultramarine/90 text-white font-semibold text-xs font-mono cursor-pointer shadow-md touch-manipulation"
                      >
                        {t.catalog.resetFilters}
                      </button>
                      <button
                        onClick={() => {
                          setEditingExhibit(null);
                          setIsNewExhibitOpen(true);
                        }}
                        className="min-h-[44px] px-5 py-2.5 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-[#121316] dark:text-white font-mono text-xs cursor-pointer touch-manipulation transition-colors"
                      >
                        {t.catalog.publishFirst}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SPACE 3: СТОЛ СПРИНТОВ (WORKSPACE) — Art Director's Kanban Desk */}
          {activeTab === 'workspace' && (
            <WorkspaceView tasks={tasks} onUpdateTasks={handleUpdateTasks} />
          )}

          {/* SPACE 4: МУДБОРД (MOODBOARD) — Viewport Canvas with Floating Tools */}
          {activeTab === 'moodboard' && (
            <MoodboardCanvas items={moodboardItems} onUpdateItems={handleUpdateMoodboard} />
          )}

          {/* SPACE 5: АТМОСФЕРА (ATMOSPHERE) — Acoustic Field & Synthesizer */}
          {activeTab === 'atmosphere' && (
            <CreativeWeatherWidget />
          )}
        </main>

        {/* Global Studio Footer */}
        <Footer />

        {/* Global Modals */}
        {selectedExhibit && (
          <ProjectDetailModal
            exhibit={selectedExhibit}
            onClose={() => setSelectedExhibit(null)}
            onToggleLike={handleToggleLike}
            onToggleSave={handleToggleSave}
            onPinToMoodboard={handlePinToMoodboard}
            onSendToWorkspace={handleSendToWorkspace}
            onEditExhibit={handleEditExhibit}
            onDeleteExhibit={handleDeleteExhibit}
            activeProfile={activeProfile}
            activeUserId={activeProfile.id}
          />
        )}

        {isNewExhibitOpen && (
          <NewExhibitModal
            isOpen={isNewExhibitOpen}
            onClose={() => {
              setIsNewExhibitOpen(false);
              setEditingExhibit(null);
            }}
            onSaveExhibit={handleSaveExhibit}
            activeProfile={activeProfile}
            editingExhibit={editingExhibit}
          />
        )}

        {activeStory && (
          <StoryViewerModal
            story={activeStory}
            stories={stories}
            onClose={() => setActiveStory(null)}
            onSelectStory={setActiveStory}
            onToggleLikeStory={handleToggleLikeStory}
            onToggleSaveStory={handleToggleSaveStory}
            onPinToMoodboard={handlePinToMoodboard}
          />
        )}

        {isNewStoryOpen && (
          <NewStoryModal
            isOpen={isNewStoryOpen}
            onClose={() => setIsNewStoryOpen(false)}
            onAddStory={handleAddStory}
            activeProfile={activeProfile}
          />
        )}

        {isProfileModalOpen && (
          <CreatorProfileModal
            profile={activeProfile}
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            onUpdateProfile={handleUpdateProfile}
          />
        )}

        {isAuthModalOpen && (
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            activeProfile={activeProfile}
            onSelectProfile={setActiveProfile}
          />
        )}

        {isSearchModalOpen && (
          <SearchOverlayModal
            isOpen={isSearchModalOpen}
            onClose={() => setIsSearchModalOpen(false)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            exhibits={exhibits}
            onSelectExhibit={(ex) => {
              setSelectedExhibit(ex);
              setIsSearchModalOpen(false);
            }}
            onSelectDiscipline={(d) => {
              setActiveDiscipline(d);
              handleSelectTab('catalog');
              setIsSearchModalOpen(false);
            }}
            onSelectProfile={(p) => {
              setActiveProfile(p);
              setIsSearchModalOpen(false);
            }}
            onSelectTab={(tab) => {
              if (tab === 'feed') handleSelectTab('overview');
              else if (tab === 'workspace' || tab === 'moodboard') handleSelectTab(tab);
              else if (tab === 'weather') handleSelectTab('atmosphere');
              setIsSearchModalOpen(false);
            }}
          />
        )}

        {/* Stable Mobile Bottom Navigation Bar (Thumb friendly, all >= 44px) */}
        <nav
          id="mobile-bottom-navigation-bar"
          aria-label={language === 'ru' ? 'Навигация студии' : 'Studio Navigation'}
          className={`md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl border-t pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] px-2.5 pt-2 shadow-2xl transition-colors select-none ${
            isDarkTheme ? 'bg-[#090B10]/95 border-white/10' : 'bg-[#F8F7F4]/95 border-black/10'
          }`}
        >
          <div className="flex items-center justify-around max-w-lg mx-auto">
            {/* 1. Обзор */}
            <button
              type="button"
              onClick={() => handleSelectTab('overview')}
              className={`min-h-[44px] min-w-[50px] flex flex-col items-center justify-center gap-1 rounded-xl cursor-pointer transition-colors touch-manipulation ${
                activeTab === 'overview'
                  ? 'text-ultramarine font-bold'
                  : isDarkTheme ? 'text-[#8E929E] hover:text-white' : 'text-[#6B7280] hover:text-[#121316]'
              }`}
              aria-label={t.mobileNav.overview}
            >
              <Compass className="w-5 h-5 flex-shrink-0" />
              <span className="text-[10px] font-mono leading-none tracking-tight">{t.mobileNav.overview}</span>
            </button>

            {/* 2. Каталог */}
            <button
              type="button"
              onClick={() => handleSelectTab('catalog')}
              className={`min-h-[44px] min-w-[50px] flex flex-col items-center justify-center gap-1 rounded-xl cursor-pointer transition-colors touch-manipulation ${
                activeTab === 'catalog'
                  ? 'text-ultramarine font-bold'
                  : isDarkTheme ? 'text-[#8E929E] hover:text-white' : 'text-[#6B7280] hover:text-[#121316]'
              }`}
              aria-label={t.mobileNav.catalog}
            >
              <Grid className="w-5 h-5 flex-shrink-0" />
              <span className="text-[10px] font-mono leading-none tracking-tight">{t.mobileNav.catalog}</span>
            </button>

            {/* 3. Центральная кнопка создания (+) */}
            <button
              type="button"
              onClick={() => setIsMobilePublishSheetOpen(true)}
              className="min-h-[48px] min-w-[48px] w-12 h-12 rounded-full bg-ultramarine hover:bg-ultramarine/90 text-white flex items-center justify-center shadow-lg shadow-ultramarine/30 cursor-pointer -mt-5 active:scale-95 transition-transform touch-manipulation"
              aria-label={t.mobileNav.createAria}
              title={t.mobileNav.createAria}
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>

            {/* 4. Холст (Moodboard Canvas) */}
            <button
              type="button"
              onClick={() => handleSelectTab('moodboard')}
              className={`min-h-[44px] min-w-[50px] flex flex-col items-center justify-center gap-1 rounded-xl cursor-pointer transition-colors touch-manipulation ${
                activeTab === 'moodboard'
                  ? 'text-ultramarine font-bold'
                  : isDarkTheme ? 'text-[#8E929E] hover:text-white' : 'text-[#6B7280] hover:text-[#121316]'
              }`}
              aria-label={t.mobileNav.canvas}
            >
              <Layers className="w-5 h-5 flex-shrink-0" />
              <span className="text-[10px] font-mono leading-none tracking-tight">{t.mobileNav.canvas}</span>
            </button>

            {/* 5. Ещё (More / Sprints / Atmosphere) */}
            <button
              type="button"
              onClick={() => setIsMoreSpacesSheetOpen(true)}
              className={`min-h-[44px] min-w-[50px] flex flex-col items-center justify-center gap-1 rounded-xl cursor-pointer transition-colors touch-manipulation ${
                activeTab === 'workspace' || activeTab === 'atmosphere'
                  ? 'text-ultramarine font-bold'
                  : isDarkTheme ? 'text-[#8E929E] hover:text-white' : 'text-[#6B7280] hover:text-[#121316]'
              }`}
              aria-label={t.mobileNav.more}
            >
              {activeTab === 'workspace' ? (
                <FolderKanban className="w-5 h-5 flex-shrink-0 text-ultramarine" />
              ) : activeTab === 'atmosphere' ? (
                <Activity className="w-5 h-5 flex-shrink-0 text-ultramarine" />
              ) : (
                <MoreHorizontal className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="text-[10px] font-mono leading-none tracking-tight">
                {activeTab === 'workspace'
                  ? t.mobileNav.sprints
                  : activeTab === 'atmosphere'
                  ? t.mobileNav.atmosphere
                  : t.mobileNav.more}
              </span>
            </button>
          </div>
        </nav>

        {/* Mobile Additional Spaces Bottom Sheet («Ещё») */}
        {isMoreSpacesSheetOpen && (
          <div
            id="mobile-more-spaces-sheet-backdrop"
            className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-label={t.mobileNav.moreSpaces}
            onClick={() => setIsMoreSpacesSheetOpen(false)}
          >
            <div
              id="mobile-more-spaces-sheet-card"
              className={`w-full max-w-full rounded-t-3xl border-t p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl space-y-4 ${
                isDarkTheme ? 'bg-[#0E1015] border-white/15 text-white' : 'bg-[#FFFFFF] border-black/15 text-[#121316]'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
                <span className="text-[11px] font-mono uppercase tracking-widest text-ultramarine font-bold">
                  {t.mobileNav.moreSpaces}
                </span>
                <button
                  type="button"
                  onClick={() => setIsMoreSpacesSheetOpen(false)}
                  className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 text-[#121316]/80 dark:text-white/80 hover:text-black dark:hover:text-white flex items-center justify-center cursor-pointer touch-manipulation"
                  aria-label={t.common.close}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {/* 1. Спринты производства */}
                <button
                  type="button"
                  onClick={() => {
                    handleSelectTab('workspace');
                    setIsMoreSpacesSheetOpen(false);
                  }}
                  className={`w-full flex items-start gap-4 p-4 rounded-2xl border text-left active:scale-[0.99] transition-all min-h-[56px] cursor-pointer touch-manipulation ${
                    activeTab === 'workspace'
                      ? 'bg-ultramarine/15 border-ultramarine/40'
                      : isDarkTheme ? 'bg-[#141720] border-white/10' : 'bg-[#F4F3F0] border-black/10'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    activeTab === 'workspace'
                      ? 'bg-ultramarine text-white'
                      : 'bg-ultramarine/20 border border-ultramarine/40 text-ultramarine'
                  }`}>
                    <FolderKanban className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-[#121316] dark:text-white flex items-center justify-between">
                      <span>{t.nav.workspace}</span>
                      {activeTab === 'workspace' && <span className="text-[10px] font-mono text-ultramarine font-bold uppercase tracking-wider">Active</span>}
                    </div>
                    <p className="text-xs text-[#52555F] dark:text-[#A3A099] mt-0.5">
                      {language === 'ru' ? 'Канбан-доска стадий и производственный пайплайн' : 'Kanban desk and production sprint pipeline'}
                    </p>
                  </div>
                </button>

                {/* 2. Атмосфера и акустическое поле */}
                <button
                  type="button"
                  onClick={() => {
                    handleSelectTab('atmosphere');
                    setIsMoreSpacesSheetOpen(false);
                  }}
                  className={`w-full flex items-start gap-4 p-4 rounded-2xl border text-left active:scale-[0.99] transition-all min-h-[56px] cursor-pointer touch-manipulation ${
                    activeTab === 'atmosphere'
                      ? 'bg-indigo-500/15 border-indigo-500/40'
                      : isDarkTheme ? 'bg-[#141720] border-white/10' : 'bg-[#F4F3F0] border-black/10'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    activeTab === 'atmosphere'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-500 dark:text-indigo-400'
                  }`}>
                    <Activity className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-[#121316] dark:text-white flex items-center justify-between">
                      <span>{t.nav.atmosphere}</span>
                      {activeTab === 'atmosphere' && <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider">Active</span>}
                    </div>
                    <p className="text-xs text-[#52555F] dark:text-[#A3A099] mt-0.5">
                      {language === 'ru' ? 'Бинауральный тон 528 Гц и биометрия фокуса' : '528Hz acoustic field and flow focus biometrics'}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Publish Bottom Action Sheet (Central «+» button) */}
        {isMobilePublishSheetOpen && (
          <div
            id="mobile-publish-sheet-backdrop"
            className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-label={t.mobileNav.sheetTitle}
            onClick={() => setIsMobilePublishSheetOpen(false)}
          >
            <div
              id="mobile-publish-sheet-card"
              className={`w-full max-w-full rounded-t-3xl border-t p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl space-y-4 ${
                isDarkTheme ? 'bg-[#0E1015] border-white/15 text-white' : 'bg-[#FFFFFF] border-black/15 text-[#121316]'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
                <span className="text-[11px] font-mono uppercase tracking-widest text-ultramarine font-bold">
                  {t.mobileNav.sheetTitle}
                </span>
                <button
                  type="button"
                  onClick={() => setIsMobilePublishSheetOpen(false)}
                  className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 text-[#121316]/80 dark:text-white/80 hover:text-black dark:hover:text-white flex items-center justify-center cursor-pointer touch-manipulation"
                  aria-label={t.mobileNav.sheetClose}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {/* 1. Опубликовать проект в каталог */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobilePublishSheetOpen(false);
                    setEditingExhibit(null);
                    setIsNewExhibitOpen(true);
                  }}
                  className={`w-full flex items-start gap-4 p-4 rounded-2xl border text-left active:scale-[0.99] transition-all min-h-[56px] cursor-pointer touch-manipulation ${
                    isDarkTheme ? 'bg-[#141720] border-white/10' : 'bg-[#F4F3F0] border-black/10'
                  }`}
                >
                  <div className="w-11 h-11 rounded-xl bg-ultramarine/20 border border-ultramarine/40 text-ultramarine flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#121316] dark:text-white">
                      {t.mobileNav.publishProject}
                    </div>
                    <p className="text-xs text-[#52555F] dark:text-[#A3A099] mt-0.5">
                      {t.mobileNav.publishProjectDesc}
                    </p>
                  </div>
                </button>

                {/* 2. Транслировать момент процесса */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobilePublishSheetOpen(false);
                    setIsNewStoryOpen(true);
                  }}
                  className={`w-full flex items-start gap-4 p-4 rounded-2xl border text-left active:scale-[0.99] transition-all min-h-[56px] cursor-pointer touch-manipulation ${
                    isDarkTheme ? 'bg-[#141720] border-white/10' : 'bg-[#F4F3F0] border-black/10'
                  }`}
                >
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-500 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <Send className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#121316] dark:text-white">
                      {t.mobileNav.broadcastMoment}
                    </div>
                    <p className="text-xs text-[#52555F] dark:text-[#A3A099] mt-0.5">
                      {t.mobileNav.broadcastMomentDesc}
                    </p>
                  </div>
                </button>

                {/* 3. Добавить на холст */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobilePublishSheetOpen(false);
                    handleSelectTab('moodboard');
                  }}
                  className={`w-full flex items-start gap-4 p-4 rounded-2xl border text-left active:scale-[0.99] transition-all min-h-[56px] cursor-pointer touch-manipulation ${
                    isDarkTheme ? 'bg-[#141720] border-white/10' : 'bg-[#F4F3F0] border-black/10'
                  }`}
                >
                  <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-500 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                    <Layers className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#121316] dark:text-white">
                      {language === 'ru' ? 'Закрепить образ на холст' : 'Pin Asset to Canvas'}
                    </div>
                    <p className="text-xs text-[#52555F] dark:text-[#A3A099] mt-0.5">
                      {language === 'ru' ? 'Добавить референс, заметку или цветовую палитру' : 'Add reference, note, or color palette'}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Toast Feedback Bar */}
        {toastMessage && (
          <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 px-4 py-3 rounded-2xl bg-[#0E1015] border border-ultramarine/40 text-[#F5F3EF] text-xs font-mono shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-200">
            <Sparkles className="w-4 h-4 text-ultramarine flex-shrink-0" />
            <span className="truncate">{toastMessage}</span>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
