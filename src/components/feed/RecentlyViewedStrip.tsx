import React from 'react';
import { ProjectExhibit } from '../../types';
import { History, X } from 'lucide-react';

interface RecentlyViewedStripProps {
  recentExhibits?: ProjectExhibit[];
  exhibits?: ProjectExhibit[];
  recentlyViewedIds?: string[];
  onSelectExhibit: (exhibit: ProjectExhibit) => void;
  onClearRecent?: () => void;
}

export const RecentlyViewedStrip: React.FC<RecentlyViewedStripProps> = ({
  recentExhibits,
  exhibits = [],
  recentlyViewedIds = [],
  onSelectExhibit,
  onClearRecent,
}) => {
  // Support both direct list and ID lookup
  let items: ProjectExhibit[] = [];
  if (recentExhibits && recentExhibits.length > 0) {
    items = recentExhibits;
  } else if (recentlyViewedIds.length > 0 && exhibits.length > 0) {
    items = recentlyViewedIds
      .map((id) => exhibits.find((ex) => ex.id === id))
      .filter((ex): ex is ProjectExhibit => Boolean(ex));
  }

  if (items.length === 0) return null;

  return (
    <div
      id="recently-viewed-strip"
      className="max-w-7xl mx-auto px-4 md:px-8 py-2 mb-2"
    >
      <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-mono text-[#4A505C] dark:text-zinc-400">
          <History className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span className="font-semibold uppercase tracking-wider">Recently Inspected</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {items.slice(0, 6).map((ex) => (
            <button
              key={ex.id}
              onClick={() => onSelectExhibit(ex)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#12151C] border border-black/10 dark:border-white/10 text-left text-xs hover:border-cyan-500/50 transition-all flex-shrink-0 cursor-pointer shadow-xs group"
            >
              <img
                src={ex.coverImage}
                alt={ex.title}
                className="w-5 h-5 rounded-md object-cover ring-1 ring-black/10 dark:ring-white/10"
              />
              <span className="truncate max-w-[120px] font-medium text-[#111317] dark:text-zinc-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                {ex.title}
              </span>
            </button>
          ))}

          {onClearRecent && (
            <button
              onClick={onClearRecent}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
              title="Clear recently viewed history"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
