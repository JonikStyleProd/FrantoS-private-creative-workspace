import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Sparkles, 
  User, 
  Tag, 
  Wrench, 
  Layers, 
  ArrowRight, 
  Flame,
  Clock,
  Check
} from 'lucide-react';
import { ProjectExhibit, CreatorProfile, CreativeDiscipline } from '../../types';
import { CREATOR_PROFILES, CREATIVE_DISCIPLINES } from '../../data/mockData';
import { useLanguage } from '../../i18n/LanguageContext';

interface SearchOverlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  exhibits: ProjectExhibit[];
  onSelectExhibit: (ex: ProjectExhibit) => void;
  onSelectDiscipline: (d: CreativeDiscipline | 'all') => void;
  onSelectProfile: (profile: CreatorProfile) => void;
  onSelectTab: (tab: 'feed' | 'workspace' | 'moodboard' | 'weather') => void;
}

type SearchCategory = 'all' | 'projects' | 'wips' | 'creators' | 'tools' | 'disciplines';

export const SearchOverlayModal: React.FC<SearchOverlayModalProps> = ({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  exhibits,
  onSelectExhibit,
  onSelectDiscipline,
  onSelectProfile,
  onSelectTab,
}) => {
  const { t, language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external search query
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  // Lock background scroll, handle Escape and Android Back
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handlePopState = () => {
      onClose();
    };

    window.history.pushState({ modal: 'studio-search-overlay' }, '');
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);

    // Auto-focus search input
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalQuery(val);
    onSearchChange(val);
  };

  const handleClear = () => {
    setLocalQuery('');
    onSearchChange('');
    inputRef.current?.focus();
  };

  const queryTrimmed = localQuery.trim().toLowerCase();

  // 1. Matched Exhibits / Projects
  const matchedExhibits = exhibits.filter((ex) => {
    if (!queryTrimmed) return true;
    const inTitle = ex.title.toLowerCase().includes(queryTrimmed);
    const inDesc = ex.description.toLowerCase().includes(queryTrimmed);
    const inTags = ex.tags.some((t) => t.toLowerCase().includes(queryTrimmed));
    const inAuthor = ex.author.name.toLowerCase().includes(queryTrimmed);
    const inDiscipline = ex.discipline.toLowerCase().includes(queryTrimmed);
    return inTitle || inDesc || inTags || inAuthor || inDiscipline;
  });

  const matchedProjectsOnly = matchedExhibits.filter((ex) => ex.format !== 'wip-process' && (!ex.wipProgress || ex.wipProgress >= 100));
  const matchedWipsOnly = matchedExhibits.filter((ex) => ex.format === 'wip-process' || (ex.wipProgress !== undefined && ex.wipProgress < 100));

  // 2. Matched Creators
  const matchedCreators = CREATOR_PROFILES.filter((cp) => {
    if (!queryTrimmed) return true;
    const inName = cp.name.toLowerCase().includes(queryTrimmed);
    const inHandle = cp.handle.toLowerCase().includes(queryTrimmed);
    const inRole = cp.role.toLowerCase().includes(queryTrimmed);
    const inBio = cp.bio.toLowerCase().includes(queryTrimmed);
    const inTools = cp.tools?.some((t) => t.toLowerCase().includes(queryTrimmed));
    return inName || inHandle || inRole || inBio || inTools;
  });

  // 3. Matched Disciplines
  const matchedDisciplines = CREATIVE_DISCIPLINES.filter((cd) => {
    if (!queryTrimmed) return true;
    return cd.label.toLowerCase().includes(queryTrimmed) || cd.desc.toLowerCase().includes(queryTrimmed) || cd.id.toLowerCase().includes(queryTrimmed);
  });

  // 4. Extracted Tools
  const allUniqueTools = Array.from(
    new Set(
      CREATOR_PROFILES.flatMap((cp) => cp.tools || []).concat([
        'Three.js', 'Blender', 'Cinema 4D', 'Redshift', 'Figma', 'TouchDesigner', 'Houdini', 'Octane', 'Ableton', 'Unreal Engine'
      ])
    )
  );

  const matchedTools = allUniqueTools.filter((tool) => {
    if (!queryTrimmed) return true;
    return tool.toLowerCase().includes(queryTrimmed);
  });

  const popularSuggestions = [
    '3D Spatial',
    'TouchDesigner',
    'Motion Graphics',
    'Elena Rostova',
    'Kinetic Glass',
    'Spatial UI/UX',
    'Sound Architecture'
  ];

  return (
    <div
      id="studio-search-overlay-backdrop"
      className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-xl flex items-start sm:items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t.modals.searchPlaceholder}
    >
      <div
        id="studio-search-overlay-container"
        className="relative w-full max-w-3xl rounded-3xl overflow-hidden bg-white dark:bg-[#0F1218] border border-black/10 dark:border-white/15 text-[#111317] dark:text-white shadow-2xl my-2 sm:my-auto max-h-[92dvh] sm:max-h-[86dvh] flex flex-col min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP SEARCH BAR */}
        <div className="flex-shrink-0 p-3.5 sm:p-5 border-b border-black/10 dark:border-white/10 bg-[#F8F7F4]/95 dark:bg-[#0F1218]/95 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 flex-shrink-0">
              <Search className="w-4 h-4" />
            </div>
            
            <div className="relative flex-1 min-w-0">
              <input
                ref={inputRef}
                id="search-overlay-input"
                type="text"
                value={localQuery}
                onChange={handleInputChange}
                placeholder={language === 'ru' ? 'Поиск проектов, WIP, авторов, дисциплин...' : 'Search exhibits, WIPs, creators, tools, disciplines...'}
                className="w-full bg-transparent text-sm sm:text-base font-medium text-[#111317] dark:text-[#F3F1EC] placeholder-zinc-500 focus:outline-none pr-8 py-1 font-sans"
              />
              {localQuery && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-black dark:hover:text-white cursor-pointer"
                  aria-label={language === 'ru' ? 'Очистить запрос' : 'Clear search query'}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="min-w-[36px] min-h-[36px] p-2 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-all cursor-pointer flex items-center justify-center flex-shrink-0"
              aria-label={language === 'ru' ? 'Закрыть поиск' : 'Close search modal'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* CATEGORY FILTER CHIPS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-0.5 no-scrollbar min-w-0">
            {[
              { id: 'all', label: language === 'ru' ? 'Всё' : 'All Results' },
              { id: 'projects', label: `${language === 'ru' ? 'Проекты' : 'Projects'} (${matchedProjectsOnly.length})` },
              { id: 'wips', label: `${language === 'ru' ? 'В работе' : 'WIPs'} (${matchedWipsOnly.length})` },
              { id: 'creators', label: `${language === 'ru' ? 'Авторы' : 'Creators'} (${matchedCreators.length})` },
              { id: 'disciplines', label: `${language === 'ru' ? 'Дисциплины' : 'Disciplines'} (${matchedDisciplines.length})` },
              { id: 'tools', label: `${language === 'ru' ? 'Инструменты' : 'Tools'} (${matchedTools.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id as SearchCategory)}
                className={`px-3 py-1.5 rounded-full text-xs font-mono whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${
                  activeCategory === tab.id
                    ? 'bg-cyan-500 text-black font-bold shadow-xs'
                    : 'bg-black/5 dark:bg-white/5 text-[#4A505C] dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* SCROLLABLE RESULTS BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 min-h-0">
          
          {/* Quick Suggestions when empty query */}
          {!queryTrimmed && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>{language === 'ru' ? 'Популярные запросы и направления' : 'Suggested Searches & Disciplines'}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {popularSuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setLocalQuery(item);
                      onSearchChange(item);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/30 border border-black/5 dark:border-white/5 text-xs text-[#111317] dark:text-zinc-300 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Search className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                    <span>{item}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section: Creators */}
          {(activeCategory === 'all' || activeCategory === 'creators') && matchedCreators.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-cyan-500" />
                  {language === 'ru' ? 'Авторы и резиденты' : 'Creators & Personas'} ({matchedCreators.length})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {matchedCreators.map((creator) => (
                  <button
                    key={creator.id}
                    type="button"
                    onClick={() => {
                      onSelectProfile(creator);
                      onClose();
                    }}
                    className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/5 dark:border-white/5 transition-all text-left flex items-center gap-3 cursor-pointer group"
                  >
                    <img
                      src={creator.avatar}
                      alt={creator.name}
                      className="w-10 h-10 rounded-full aspect-square object-cover flex-shrink-0 ring-1 ring-cyan-500/40"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[#111317] dark:text-[#F3F1EC] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate">
                        {creator.name}
                      </div>
                      <p className="text-[11px] text-[#4A505C] dark:text-zinc-400 truncate">
                        {creator.role}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section: Disciplines */}
          {(activeCategory === 'all' || activeCategory === 'disciplines') && matchedDisciplines.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-500" />
                  {language === 'ru' ? 'Творческие дисциплины' : 'Creative Disciplines'} ({matchedDisciplines.length})
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {matchedDisciplines.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      onSelectDiscipline(d.id as CreativeDiscipline);
                      onSelectTab('feed');
                      onClose();
                    }}
                    className="p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/5 dark:border-white/5 text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-xs font-bold text-[#111317] dark:text-white truncate group-hover:text-cyan-500">
                        {d.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#4A505C] dark:text-zinc-400 line-clamp-1">
                      {d.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section: Projects & Finished Exhibits */}
          {(activeCategory === 'all' || activeCategory === 'projects') && matchedProjectsOnly.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                  {language === 'ru' ? 'Проекты и экспонаты' : 'Projects & Exhibits'} ({matchedProjectsOnly.length})
                </span>
              </div>

              <div className="space-y-2">
                {matchedProjectsOnly.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      onSelectExhibit(ex);
                      onClose();
                    }}
                    className="w-full p-2.5 sm:p-3 rounded-2xl bg-black/[0.03] dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/5 dark:border-white/5 transition-all text-left flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="w-12 sm:w-16 h-12 sm:h-12 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-800">
                      <img
                        src={ex.coverImage}
                        alt={ex.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs sm:text-sm font-bold text-[#111317] dark:text-[#F3F1EC] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate">
                          {ex.title}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 uppercase font-semibold flex-shrink-0">
                          {ex.discipline}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#4A505C] dark:text-zinc-400 line-clamp-1">
                        {language === 'ru' ? 'Автор:' : 'By'} {ex.author.name} — {ex.description}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section: WIP Posts */}
          {(activeCategory === 'all' || activeCategory === 'wips') && matchedWipsOnly.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  {language === 'ru' ? 'Проекты в работе (WIP)' : 'Work-in-Progress (WIP) Posts'} ({matchedWipsOnly.length})
                </span>
              </div>

              <div className="space-y-2">
                {matchedWipsOnly.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      onSelectExhibit(ex);
                      onClose();
                    }}
                    className="w-full p-2.5 sm:p-3 rounded-2xl bg-black/[0.03] dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/5 dark:border-white/5 transition-all text-left flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="w-12 sm:w-16 h-12 sm:h-12 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-800 relative">
                      <img
                        src={ex.coverImage}
                        alt={ex.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center font-mono text-[9px] font-bold text-white">
                        {ex.wipProgress || 65}%
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs sm:text-sm font-bold text-[#111317] dark:text-[#F3F1EC] group-hover:text-amber-500 transition-colors truncate">
                          {ex.title}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase font-semibold flex-shrink-0">
                          {language === 'ru' ? 'В работе' : 'WIP'} {ex.wipProgress || 65}%
                        </span>
                      </div>
                      <p className="text-[11px] text-[#4A505C] dark:text-zinc-400 line-clamp-1">
                        {language === 'ru' ? 'Автор:' : 'By'} {ex.author.name} — {ex.description}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section: Tools */}
          {(activeCategory === 'all' || activeCategory === 'tools') && matchedTools.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-emerald-500" />
                  {language === 'ru' ? 'Инструменты и технологии' : 'Tools & Technologies'} ({matchedTools.length})
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {matchedTools.map((tool) => (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => {
                      onSearchChange(tool);
                      onSelectTab('feed');
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/30 border border-black/5 dark:border-white/5 text-xs text-[#111317] dark:text-zinc-300 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Tag className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>{tool}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {matchedExhibits.length === 0 && matchedCreators.length === 0 && matchedDisciplines.length === 0 && matchedTools.length === 0 && (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto text-zinc-400">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#111317] dark:text-[#F3F1EC]">
                  {language === 'ru' ? 'Ничего не найдено' : 'No matching results found'}
                </p>
                <p className="text-xs text-[#4A505C] dark:text-zinc-400 mt-1">
                  {language === 'ru' ? 'Попробуйте изменить запрос, имя автора, дисциплину или инструмент.' : 'Try searching for a different keyword, creator name, discipline, or tool.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-mono font-bold hover:bg-cyan-500/20 cursor-pointer"
              >
                {language === 'ru' ? 'Сбросить поиск' : 'Reset Search'}
              </button>
            </div>
          )}
        </div>

        {/* FOOTER ACTION */}
        <div className="flex-shrink-0 p-3 sm:p-4 border-t border-black/10 dark:border-white/10 bg-[#F8F7F4]/95 dark:bg-[#0F1218]/95 backdrop-blur-md flex items-center justify-between text-[11px] font-mono text-[#4A505C] dark:text-zinc-400">
          <span>{language === 'ru' ? 'ESC или клик снаружи для закрытия' : 'Press ESC or tap outside to close'}</span>
          {localQuery && (
            <button
              type="button"
              onClick={() => {
                onSelectTab('feed');
                onClose();
              }}
              className="text-cyan-600 dark:text-cyan-400 hover:underline font-bold cursor-pointer"
            >
              {language === 'ru' ? `Искать в каталоге «${localQuery}» →` : `Filter Catalog with "${localQuery}" →`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
