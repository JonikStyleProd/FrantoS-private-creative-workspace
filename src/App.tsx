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
import { Header } from './components/common/Header';
import { PublishControl } from './components/common/PublishControl';
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
import { RotateCcw, Plus, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export function App() {
  // Theme state: dark mode default
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'feed' | 'workspace' | 'moodboard' | 'weather'>('feed');

  // Discipline Filter
  const [activeDiscipline, setActiveDiscipline] = useState<CreativeDiscipline | 'all'>('all');

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Feed Filter Toolbar States
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

  // Modals
  const [selectedExhibit, setSelectedExhibit] = useState<ProjectExhibit | null>(null);
  const [editingExhibit, setEditingExhibit] = useState<ProjectExhibit | null>(null);
  const [isNewExhibitOpen, setIsNewExhibitOpen] = useState(false);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [isNewStoryOpen, setIsNewStoryOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Toast / Action notification
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

  // Handle URL hash routing & browser Back/Forward buttons
  useEffect(() => {
    const handleHashSync = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '').trim();
      if (hash === 'workspace' || hash === 'moodboard' || hash === 'weather' || hash === 'feed') {
        setActiveTab(hash);
      } else if (!hash) {
        setActiveTab('feed');
      }
    };

    // Initial check
    handleHashSync();

    window.addEventListener('popstate', handleHashSync);
    window.addEventListener('hashchange', handleHashSync);
    return () => {
      window.removeEventListener('popstate', handleHashSync);
      window.removeEventListener('hashchange', handleHashSync);
    };
  }, []);

  const handleSelectTab = (tab: 'feed' | 'workspace' | 'moodboard' | 'weather') => {
    setActiveTab(tab);
    if (window.location.hash !== `#/${tab}`) {
      window.history.pushState(null, '', `#/${tab}`);
    }
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

    // Trigger subtle confetti on save
    try {
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { y: 0.85 },
        colors: ['#06B6D4', '#F43F5E', '#8B5CF6'],
      });
    } catch {}
  };

  const handleSaveExhibit = (exhibit: ProjectExhibit) => {
    const updated = frantosDB.saveExhibit(exhibit);
    setExhibits(updated);
    if (selectedExhibit?.id === exhibit.id) {
      setSelectedExhibit(exhibit);
    }
    showToast(`Exhibit "${exhibit.title}" published to Demo Vault`);
  };

  const handleDeleteExhibit = (id: string) => {
    const updated = frantosDB.deleteExhibit(id);
    setExhibits(updated);
    if (selectedExhibit?.id === id) {
      setSelectedExhibit(null);
    }
    showToast('Exhibit removed from feed');
  };

  const handleEditExhibit = (exhibit: ProjectExhibit) => {
    setEditingExhibit(exhibit);
    setIsNewExhibitOpen(true);
  };

  const handlePinToMoodboard = (item: MoodboardItem) => {
    const updated = [...moodboardItems, item];
    setMoodboardItems(updated);
    frantosDB.saveMoodboard(updated);
    showToast(`Pinned "${item.title}" to Spatial Moodboard`);
  };

  const handleSendToWorkspace = (task: WorkspaceTask) => {
    const updated = [task, ...tasks];
    setTasks(updated);
    frantosDB.saveTasks(updated);
    showToast(`Created Workspace sprint task for "${task.title}"`);
  };

  const handleAddStory = (newStory: Story) => {
    const updated = frantosDB.addStory(newStory);
    setStories(updated);
    showToast('Story moment broadcasted');
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
    showToast('Story moment saved to collection');
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
    showToast('Profile updated');
  };

  // Get list of recently viewed exhibit objects
  const recentlyViewedExhibits = recentlyViewedIds
    .map((id) => exhibits.find((ex) => ex.id === id))
    .filter((ex): ex is ProjectExhibit => Boolean(ex));

  // Filter & Sort Exhibits
  const filteredExhibits = exhibits
    .filter((ex) => {
      // Discipline
      const matchesDiscipline = activeDiscipline === 'all' || ex.discipline === activeDiscipline;
      
      // Search
      const matchesSearch = 
        !searchQuery.trim() ||
        ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        ex.author.name.toLowerCase().includes(searchQuery.toLowerCase());

      // Status
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
      // Default recent
      return 0;
    });

  return (
    <ErrorBoundary>
      <div className={`min-h-screen ${isDarkTheme ? 'bg-[#090B0E] text-[#F3F1EC]' : 'bg-[#F8F7F4] text-[#111317]'} transition-colors duration-300 font-sans selection:bg-cyan-500/20 selection:text-cyan-600 dark:selection:text-cyan-200`}>
        
        {/* Sticky Global Architectural Header */}
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
          onSelectSavedWorks={() => {
            setActiveTab('feed');
            setFilterStatus('saved');
            showToast('Showing saved works collection');
          }}
          onOpenMessages={() => {
            showToast('Studio Dispatch Channel: 0 unread messages');
            setActiveTab('workspace');
          }}
        />

        {/* FRANTOS VAULT Status & Telemetry Sub-Banner */}
        <div 
          id="frantos-vault-status-row"
          className="w-full bg-black/[0.03] dark:bg-white/5 border-b border-black/5 dark:border-white/5 py-2 px-3 sm:px-6 md:px-8"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between text-[11px] font-mono text-[#4A505C] dark:text-zinc-400 gap-3 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping flex-shrink-0" />
              <span className="font-semibold tracking-wider text-[#111317] dark:text-zinc-200 truncate">
                FRANTOS VAULT // PERSISTENT DEMO MODE
              </span>
              <span className="hidden md:inline text-zinc-400 dark:text-zinc-600">•</span>
              <span className="hidden md:inline truncate">CREATOR: {activeProfile.name.toUpperCase()}</span>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
              <span className="hidden xs:inline-block px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold">
                LOCAL STORAGE ACTIVE
              </span>
              <span className="hidden xs:inline text-zinc-400 dark:text-zinc-600">|</span>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="text-[#4A505C] dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer text-[11px] font-semibold"
              >
                <span>Connect Cloud</span>
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Action Row directly below FRANTOS VAULT row: Single Primary Publish Control */}
        <div 
          id="frantos-secondary-action-row"
          className="w-full bg-white/75 dark:bg-[#0C0F14]/80 border-b border-black/5 dark:border-white/5 py-2.5 sm:py-3 px-3 sm:px-6 md:px-8 backdrop-blur-md sticky top-16 sm:top-20 z-30 transition-colors"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 min-w-0">
            {/* View Context & Discipline Info */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-xs uppercase tracking-wider text-[#4A505C] dark:text-zinc-400 font-semibold truncate hidden sm:inline">
                Workspace View:
              </span>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs px-2.5 py-1 rounded-xl bg-black/5 dark:bg-white/10 font-mono text-[#111317] dark:text-white font-semibold truncate">
                  {activeTab === 'feed' && 'Creative Feed Archive'}
                  {activeTab === 'workspace' && 'Studio Workspace & Tasks'}
                  {activeTab === 'moodboard' && 'Spatial Moodboard'}
                  {activeTab === 'weather' && 'Creative Weather Studio'}
                </span>
                {activeDiscipline !== 'all' && (
                  <span className="hidden md:inline-block text-[11px] px-2.5 py-1 rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-mono font-medium border border-cyan-500/20">
                    {CREATIVE_DISCIPLINES.find((d) => d.id === activeDiscipline)?.label}
                  </span>
                )}
              </div>
            </div>

            {/* The ONLY Visible Primary Publish Button Entry Point */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <PublishControl
                onOpenPublishArtifact={() => {
                  setEditingExhibit(null);
                  setIsNewExhibitOpen(true);
                }}
                onOpenNewStory={() => setIsNewStoryOpen(true)}
              />
            </div>
          </div>
        </div>

        {/* Main Application Views */}
        <main className="w-full pb-16">
          
          {/* TAB 1: CREATIVE FEED & EXHIBITS */}
          {activeTab === 'feed' && (
            <div className="space-y-12">
              
              {/* CORE VISUAL 3D ENGINE */}
              <CreativeCore3D
                activeDiscipline={activeDiscipline}
                onSelectDiscipline={setActiveDiscipline}
                isDarkTheme={isDarkTheme}
              />

              {/* STORIES & PROCESS MOMENTS RAIL */}
              <StoriesRail
                stories={stories}
                onSelectStory={setActiveStory}
                onOpenNewStory={() => setIsNewStoryOpen(true)}
              />

              {/* RECENTLY VIEWED STRIP */}
              <RecentlyViewedStrip
                recentExhibits={recentlyViewedExhibits}
                onSelectExhibit={handleSelectExhibit}
                onClearRecent={() => {
                  frantosDB.clearRecentlyViewed();
                  setRecentlyViewedIds([]);
                }}
              />

              {/* CONTINUE WORKING SECTION */}
              <ContinueWorkingSection
                exhibits={exhibits}
                onSelectExhibit={handleSelectExhibit}
                onOpenWorkspace={() => setActiveTab('workspace')}
                onOpenNewWip={() => {
                  setEditingExhibit(null);
                  setIsNewExhibitOpen(true);
                }}
              />

              {/* EXHIBITS STREAM SECTION */}
              <section 
                id="frantos-exhibits-stream"
                className="max-w-7xl mx-auto px-4 md:px-8 pt-4"
                aria-label="Creative Exhibits and Works in Progress"
              >
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 border-b border-black/10 dark:border-white/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-500" />
                      <span className="font-mono text-xs uppercase tracking-wider text-cyan-700 dark:text-cyan-400 font-bold">
                        Living Archive // Exhibition Feed
                      </span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-[#111317] dark:text-[#F3F1EC]">
                      {activeDiscipline === 'all'
                        ? 'All Creative Exhibits & Case Studies'
                        : `${CREATIVE_DISCIPLINES.find((d) => d.id === activeDiscipline)?.label} Exhibits`}
                    </h3>
                  </div>

                  {/* Clear discipline filter action */}
                  {activeDiscipline !== 'all' && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActiveDiscipline('all')}
                        className="px-3 py-1.5 rounded-full text-xs font-mono bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-[#111317] dark:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-black/10 dark:border-transparent"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Clear Discipline</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* FEED FILTERS & SORTING TOOLBAR */}
                <FeedFiltersToolbar
                  activeStatus={filterStatus}
                  onStatusChange={setFilterStatus}
                  activeSort={sortOption}
                  onSortChange={setSortOption}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  totalCount={filteredExhibits.length}
                />

                {/* Exhibits Masonry / Gallery Grid */}
                <div className="space-y-8 mt-6">
                  {/* Grid Display */}
                  <div className={`grid gap-6 ${
                    viewMode === 'dense'
                      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                  }`}>
                    {filteredExhibits.map((ex, index) => (
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

                  {/* Empty state */}
                  {filteredExhibits.length === 0 && (
                    <div className="p-16 rounded-3xl border border-dashed border-black/15 dark:border-white/10 text-center space-y-3 bg-black/[0.02] dark:bg-white/[0.02]">
                      <p className="text-[#4A505C] dark:text-zinc-400 font-mono text-sm">
                        No creative exhibits matched your filter criteria.
                      </p>
                      <div className="flex justify-center gap-3 pt-2">
                        <button
                          onClick={() => {
                            setActiveDiscipline('all');
                            setFilterStatus('all');
                            setSearchQuery('');
                          }}
                          className="px-4 py-2 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs font-mono cursor-pointer shadow-md"
                        >
                          Reset All Filters
                        </button>
                        <button
                          onClick={() => {
                            setEditingExhibit(null);
                            setIsNewExhibitOpen(true);
                          }}
                          className="px-4 py-2 rounded-full bg-black/10 dark:bg-white/10 text-[#111317] dark:text-white font-mono text-xs cursor-pointer"
                        >
                          Publish First Exhibit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: STUDIO WORKSPACE */}
          {activeTab === 'workspace' && (
            <WorkspaceView tasks={tasks} onUpdateTasks={handleUpdateTasks} />
          )}

          {/* TAB 3: SPATIAL MOODBOARD */}
          {activeTab === 'moodboard' && (
            <MoodboardCanvas items={moodboardItems} onUpdateItems={handleUpdateMoodboard} />
          )}

          {/* TAB 4: CREATIVE WEATHER */}
          {activeTab === 'weather' && <CreativeWeatherWidget />}
        </main>

        {/* Global Architectural Studio Footer */}
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
              setActiveTab('feed');
              setIsSearchModalOpen(false);
            }}
            onSelectProfile={(p) => {
              setActiveProfile(p);
              setIsSearchModalOpen(false);
            }}
            onSelectTab={(tab) => {
              setActiveTab(tab);
              setIsSearchModalOpen(false);
            }}
          />
        )}

        {/* Dynamic Toast Feedback Bar */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-[#0F1218] border border-cyan-500/40 text-white text-xs font-mono shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-5 duration-200">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
export default App;
