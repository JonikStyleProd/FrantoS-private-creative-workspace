import React from 'react';
import { ProjectExhibit, WorkspaceTask } from '../../types';
import { Sparkles, FolderKanban } from 'lucide-react';

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
      className="max-w-7xl mx-auto px-4 md:px-8 pt-2 pb-6"
    >
      <div className="p-6 rounded-3xl bg-gradient-to-r from-cyan-500/10 via-purple-500/5 to-transparent border border-cyan-500/20 dark:border-cyan-500/20 shadow-md frantos-animated-frame">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                Active Studio Sprints // In Production
              </span>
            </div>
            <h3 className="text-xl font-display font-extrabold tracking-tight text-[#111317] dark:text-white">
              Continue Working
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenKanban}
              className="px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-[#111317] dark:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-black/10 dark:border-transparent"
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>Open Studio Kanban</span>
            </button>

            <button
              onClick={handleCreateNew}
              className="px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold bg-cyan-500 hover:bg-cyan-400 text-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>New Artifact</span>
            </button>
          </div>
        </div>

        {/* WIP Artifacts Carousel / Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {wips.slice(0, 3).map((wip) => (
            <div
              key={wip.id}
              onClick={() => onSelectExhibit(wip)}
              className="group p-4 rounded-2xl bg-white/90 dark:bg-[#11141A]/90 border border-black/10 dark:border-white/10 hover:border-cyan-500/40 transition-all cursor-pointer shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={wip.coverImage}
                  alt={wip.title}
                  className="w-12 h-12 rounded-xl object-cover ring-1 ring-black/10 dark:ring-white/10 group-hover:scale-105 transition-transform"
                />
                <div className="overflow-hidden">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold uppercase">
                    WIP • {wip.discipline}
                  </span>
                  <h4 className="text-xs font-bold text-[#111317] dark:text-white truncate mt-1 group-hover:text-cyan-500 transition-colors">
                    {wip.title}
                  </h4>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#4A505C] dark:text-zinc-400">
                  <span>Sprint Completion</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">
                    {wip.wipProgress || 60}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full transition-all"
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
