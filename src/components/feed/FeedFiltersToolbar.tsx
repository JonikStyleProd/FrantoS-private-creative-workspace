import React from 'react';
import { 
  CreativeDiscipline, 
  ProjectStatusFilter 
} from '../../types';
import { 
  Sparkles, 
  Hammer, 
  Bookmark, 
  User, 
  Layers, 
  Grid, 
  ListFilter, 
  ArrowUpDown,
  RotateCcw
} from 'lucide-react';

export type FilterStatus = 'all' | 'finished' | 'wip' | 'saved' | 'mine';
export type SortOption = 'recent' | 'likes' | 'saves' | 'views';

export interface FeedFiltersToolbarProps {
  activeStatus: FilterStatus;
  onStatusChange: (status: FilterStatus) => void;
  activeSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: 'grid' | 'dense';
  onViewModeChange: (mode: 'grid' | 'dense') => void;
  totalCount: number;
}

export const FeedFiltersToolbar: React.FC<FeedFiltersToolbarProps> = ({
  activeStatus,
  onStatusChange,
  activeSort,
  onSortChange,
  viewMode,
  onViewModeChange,
  totalCount,
}) => {
  const statusOptions: { id: FilterStatus; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'all', label: 'All Artifacts', icon: Layers },
    { id: 'finished', label: 'Finished Case Studies', icon: Sparkles },
    { id: 'wip', label: 'WIP & Sprints', icon: Hammer },
    { id: 'saved', label: 'Saved Vault', icon: Bookmark },
    { id: 'mine', label: 'My Creations', icon: User },
  ];

  return (
    <div
      id="feed-filters-toolbar"
      className="w-full space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {statusOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = activeStatus === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => onStatusChange(opt.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500 text-black font-bold shadow-sm'
                    : 'bg-black/5 dark:bg-white/5 text-[#4A505C] dark:text-zinc-300 hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right side: Sort + View Mode + Count */}
        <div className="flex items-center gap-3">
          {/* Sorting dropdown */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={activeSort}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-mono text-[#111317] dark:text-[#F3F1EC] focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="recent" className="bg-white dark:bg-zinc-900">Sort: Recent First</option>
              <option value="likes" className="bg-white dark:bg-zinc-900">Sort: Most Liked</option>
              <option value="saves" className="bg-white dark:bg-zinc-900">Sort: Most Saved</option>
              <option value="views" className="bg-white dark:bg-zinc-900">Sort: Most Viewed</option>
            </select>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center p-0.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 shadow-xs'
                  : 'text-zinc-500 hover:text-black dark:hover:text-white'
              }`}
              title="Editorial Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange('dense')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'dense'
                  ? 'bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 shadow-xs'
                  : 'text-zinc-500 hover:text-black dark:hover:text-white'
              }`}
              title="Compact Gallery View"
            >
              <ListFilter className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Count */}
          <span className="font-mono text-xs text-[#4A505C] dark:text-zinc-400 hidden sm:inline">
            {totalCount} Items
          </span>
        </div>
      </div>
    </div>
  );
};
