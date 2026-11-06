import React from 'react';
import { ProjectExhibit } from '../../types';
import { History, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

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
  const { t } = useLanguage();

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
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 mb-2"
    >
      <div className="p-3 sm:p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/8 dark:border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-mono text-[#52555F] dark:text-[#A3A099]">
          <History className="w-3.5 h-3.5 text-ultramarine" />
          <span className="font-semibold uppercase tracking-wider">{t.overview.recentlyInspected}</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-2 px-2 sm:mx-0 sm:px-0">
          {items.slice(0, 6).map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => onSelectExhibit(ex)}
              className="min-h-[44px] flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#12151C] border border-black/10 dark:border-white/10 text-left text-xs hover:border-ultramarine transition-all flex-shrink-0 cursor-pointer shadow-xs group touch-manipulation"
            >
              <img
                src={ex.coverImage}
                alt={ex.title}
                className="w-6 h-6 rounded-md object-cover ring-1 ring-black/10 dark:ring-white/10 flex-shrink-0"
              />
              <span className="truncate max-w-[140px] font-medium text-[#121316] dark:text-[#F5F3EF] group-hover:text-ultramarine">
                {ex.title}
              </span>
            </button>
          ))}

          {onClearRecent && (
            <button
              type="button"
              onClick={onClearRecent}
              className="min-w-[40px] min-h-[40px] p-2 rounded-xl text-[#A3A099] hover:text-rose-500 transition-colors cursor-pointer flex items-center justify-center flex-shrink-0 touch-manipulation"
              title={t.overview.clearRecent}
              aria-label={t.overview.clearRecent}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
