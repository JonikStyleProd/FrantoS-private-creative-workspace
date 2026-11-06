import React from 'react';
import { ProjectExhibit, WorkspaceTask } from '../../types';
import { Sparkles, FolderKanban } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface ContinueWorkingSectionProps {
  exhibits?: ProjectExhibit[];
  wipExhibits?: ProjectExhibit[];
  activeTasks?: WorkspaceTask[];
  onSelectExhibit: (exhibit: ProjectExhibit) => void;
  onOpenWorkspace?: () => void;
  onNavigateToWorkspace?: () => void;
  onOpenNewWip?: () => void;
  onOpenNewExhibitModal?: () => void;
}

export const ContinueWorkingSection: React.FC<ContinueWorkingSectionProps> = ({
  exhibits = [],
  wipExhibits,
  activeTasks = [],
  onSelectExhibit,
  onOpenWorkspace,
  onNavigateToWorkspace,
  onOpenNewWip,
  onOpenNewExhibitModal,
}) => {
  const { t } = useLanguage();

  // Resolve WIP list
  const wips = wipExhibits && wipExhibits.length > 0 
    ? wipExhibits 
    : exhibits.filter((ex) => ex.format === 'wip-process' || (ex.wipProgress && ex.wipProgress < 100));

  if (wips.length === 0 && activeTasks.length === 0) return null;

  const handleOpenKanban = onOpenWorkspace || onNavigateToWorkspace || (() => {});
  const handleCreateNew = onOpenNewWip || onOpenNewExhibitModal || (() => {});

  return (
    <div
      id="continue-working-section"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8"
    >
      <div className="p-5 sm:p-6 rounded-3xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/8 dark:border-white/8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-ultramarine animate-ping" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-ultramarine">
                {t.overview.activeSprints}
              </span>
            </div>
            <h3 className="text-xl font-display font-bold tracking-tight text-[#121316] dark:text-[#F5F3EF]">
              {t.overview.continueWorking}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenKanban}
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-[#121316] dark:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-black/10 dark:border-transparent touch-manipulation"
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>{t.overview.studioKanban}</span>
            </button>

            <button
              type="button"
              onClick={handleCreateNew}
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-ultramarine hover:bg-ultramarine/90 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-ultramarine/20 touch-manipulation"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.overview.newProject}</span>
            </button>
          </div>
        </div>

        {/* WIP Artifacts Carousel / Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {wips.slice(0, 3).map((wip) => (
            <div
              key={wip.id}
              onClick={() => onSelectExhibit(wip)}
              className="group p-4 rounded-2xl bg-white dark:bg-[#0E1015] border border-black/8 dark:border-white/8 hover:border-ultramarine/60 transition-all cursor-pointer shadow-xs flex flex-col justify-between touch-manipulation"
            >
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={wip.coverImage}
                  alt={wip.title}
                  className="w-12 h-12 rounded-xl object-cover ring-1 ring-black/10 dark:ring-white/10 group-hover:scale-105 transition-transform flex-shrink-0"
                />
                <div className="overflow-hidden min-w-0">
                  <div className="text-[10px] font-mono text-ultramarine font-bold uppercase tracking-wider truncate">
                    // {wip.discipline}
                  </div>
                  <h4 className="text-xs font-bold text-[#121316] dark:text-[#F5F3EF] truncate mt-0.5 group-hover:text-ultramarine transition-colors">
                    {wip.title}
                  </h4>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#52555F] dark:text-[#A3A099]">
                  <span>{t.overview.sprintCompletion}</span>
                  <span className="font-bold text-ultramarine">
                    {wip.wipProgress || 60}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-ultramarine rounded-full transition-all"
                    style={{ width: `${wip.wipProgress || 60}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
