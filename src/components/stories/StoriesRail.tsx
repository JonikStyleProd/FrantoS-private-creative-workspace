import React from 'react';
import { Story, StoryType } from '../../types';
import { Plus } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface StoriesRailProps {
  stories: Story[];
  onSelectStory: (story: Story) => void;
  onOpenNewStory: () => void;
}

export const StoriesRail: React.FC<StoriesRailProps> = ({
  stories,
  onSelectStory,
  onOpenNewStory,
}) => {
  const { t, formatNumber } = useLanguage();

  return (
    <section 
      id="frantos-stories-rail"
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-8"
      aria-label={t.overview.recentMoments}
    >
      <div className="flex items-center justify-between mb-4 border-b border-black/8 dark:border-white/8 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-ultramarine animate-pulse" />
          <h3 className="font-display font-bold text-lg text-[#121316] dark:text-[#F5F3EF] tracking-tight">
            {t.overview.recentMoments}
          </h3>
        </div>
        <span className="font-mono text-xs text-[#52555F] dark:text-[#A3A099]">
          {formatNumber(stories.length)} {t.overview.broadcastsCount}
        </span>
      </div>

      <div className="flex items-center gap-4 overflow-x-auto pb-4 pt-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        
        {/* Create Process Moment Card */}
        <button
          id="btn-add-moment-card"
          type="button"
          onClick={onOpenNewStory}
          className="group relative flex-shrink-0 w-36 sm:w-44 h-52 sm:h-60 rounded-2xl overflow-hidden border border-dashed border-black/20 dark:border-white/20 hover:border-ultramarine bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5 transition-all flex flex-col items-center justify-center p-4 text-center cursor-pointer shadow-xs min-h-[44px] touch-manipulation"
          aria-label={t.overview.postMoment}
        >
          <div className="w-10 h-10 rounded-xl bg-ultramarine/15 border border-ultramarine/30 text-ultramarine flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-xs font-display font-bold text-[#121316] dark:text-[#F5F3EF]">
            {t.overview.postMoment}
          </span>
          <span className="text-[10px] font-mono text-[#52555F] dark:text-[#A3A099] mt-1">
            {t.overview.postMomentSubtitle}
          </span>
        </button>

        {/* Dynamic Stories List */}
        {stories.map((story) => {
          return (
            <div
              key={story.id}
              onClick={() => onSelectStory(story)}
              className={`group relative flex-shrink-0 w-36 sm:w-44 h-52 sm:h-60 rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl touch-manipulation ${
                story.unread
                  ? 'border-ultramarine ring-1 ring-ultramarine/40'
                  : 'border-black/10 dark:border-white/10 hover:border-ultramarine/60'
              }`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectStory(story); }}
              aria-label={`${story.title} by ${story.author.name}`}
            >
              {/* Media Background */}
              <img
                src={story.previewImage}
                alt={story.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />

              {/* Scrim Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/60 pointer-events-none" />

              {/* Header: Author Avatar & Time */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <img
                    src={story.author.avatar}
                    alt={story.author.name}
                    className="w-6 h-6 rounded-full object-cover ring-1 ring-white/30 flex-shrink-0"
                  />
                  <span className="text-[10px] font-semibold text-white truncate max-w-[75px]">
                    {story.author.name.split(' ')[0]}
                  </span>
                </div>
                <span className="text-[9px] font-mono text-zinc-300 flex-shrink-0">{story.timestamp}</span>
              </div>

              {/* Footer: Unboxed Type Label & Title */}
              <div className="absolute bottom-3 left-3 right-3 space-y-1">
                <div className="font-mono text-[9px] text-ultramarine font-bold uppercase tracking-wider">
                  // {story.type.replace('_', ' ')}
                </div>
                <p className="text-[11px] font-semibold text-white line-clamp-2 leading-tight drop-shadow-xs">
                  {story.title}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
