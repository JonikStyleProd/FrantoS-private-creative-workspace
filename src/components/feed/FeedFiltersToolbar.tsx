import React from 'react';
import { 
  Sparkles, 
  Hammer, 
  Bookmark, 
  User, 
  Layers, 
  Grid, 
  LayoutGrid,
  ArrowUpDown
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

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
  const { t, formatNumber } = useLanguage();

  const statusOptions: { id: FilterStatus; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'all', label: t.catalog.filterAll, icon: Layers },
    { id: 'finished', label: t.catalog.filterFinished, icon: Sparkles },
    { id: 'wip', label: t.catalog.filterWip, icon: Hammer },
    { id: 'saved', label: t.catalog.filterSaved, icon: Bookmark },
    { id: 'mine', label: t.catalog.filterMine, icon: User },
  ];

  return (
    <div
      id="catalog-filters-toolbar"
      className="w-full space-y-3 pb-2 select-none"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Real Segmented Controller */}
        <div className="inline-flex items-center p-1 rounded-full bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 overflow-x-auto no-scrollbar max-w-full">
          {statusOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = activeStatus === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onStatusChange(opt.id)}
                className={`min-h-[40px] px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-mono font-medium transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap touch-manipulation ${
                  isActive
                    ? 'bg-ultramarine text-white font-bold shadow-sm shadow-ultramarine/25'
                    : 'text-[#52555F] dark:text-[#A3A099] hover:text-[#121316] dark:hover:text-white'
                }`}
                aria-pressed={isActive}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right side: Sort + View Layout + Count */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
          {/* Sorting dropdown */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={activeSort}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="min-h-[40px] px-3 py-1.5 rounded-full bg-white dark:bg-[#0E1015] border border-black/10 dark:border-white/10 text-xs font-mono text-[#121316] dark:text-[#F5F3EF] focus:outline-none focus:border-ultramarine cursor-pointer shadow-xs"
            >
              <option value="recent" className="bg-white dark:bg-zinc-900">{t.catalog.sortRecent}</option>
              <option value="likes" className="bg-white dark:bg-zinc-900">{t.catalog.sortLikes}</option>
              <option value="saves" className="bg-white dark:bg-zinc-900">{t.catalog.sortSaves}</option>
              <option value="views" className="bg-white dark:bg-zinc-900">{t.catalog.sortViews}</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="hidden sm:flex items-center p-0.5 rounded-full bg-white dark:bg-[#0E1015] border border-black/10 dark:border-white/10 shadow-xs">
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`min-w-[36px] min-h-[36px] p-2 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                viewMode === 'grid'
                  ? 'bg-ultramarine text-white font-bold shadow-xs'
                  : 'text-zinc-500 hover:text-black dark:hover:text-white'
              }`}
              title={t.catalog.viewGrid}
              aria-label={t.catalog.viewGrid}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('dense')}
              className={`min-w-[36px] min-h-[36px] p-2 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                viewMode === 'dense'
                  ? 'bg-ultramarine text-white font-bold shadow-xs'
                  : 'text-zinc-500 hover:text-black dark:hover:text-white'
              }`}
              title={t.catalog.viewDense}
              aria-label={t.catalog.viewDense}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Total works count */}
          <span className="font-mono text-xs text-[#848792] dark:text-[#6B6861] hidden md:inline">
            {t.catalog.countLabel} {formatNumber(totalCount)}
          </span>
        </div>
      </div>
    </div>
  );
};
