import React from 'react';
import { Story, StoryType } from '../../types';
import { Plus } from 'lucide-react';

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
  const typeBadgeColors: Record<StoryType, { bg: string; text: string }> = {
    wip: { bg: 'bg-rose-500/20 border-rose-500/30', text: 'text-rose-300' },
    sketch: { bg: 'bg-amber-500/20 border-amber-500/30', text: 'text-amber-300' },
    process: { bg: 'bg-cyan-500/20 border-cyan-500/30', text: 'text-cyan-300' },
    inspiration: { bg: 'bg-purple-500/20 border-purple-500/30', text: 'text-purple-300' },
    studio_note: { bg: 'bg-emerald-500/20 border-emerald-500/30', text: 'text-emerald-300' },
    behind_the_scenes: { bg: 'bg-orange-500/20 border-orange-500/30', text: 'text-orange-300' },
  };

  return (
    <section 
      id="frantos-stories-rail"
      className="w-full max-w-7xl mx-auto px-4 md:px-8 my-8"
      aria-label="Studio Process Moments & Stories"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <h3 className="font-display font-bold text-lg text-[#111317] dark:text-[#F3F1EC] tracking-tight">
            Process Moments & WIP Stories
          </h3>
        </div>
        <span className="font-mono text-xs text-[#4A505C] dark:text-zinc-400">
          {stories.length} Live Studio Streams
        </span>
      </div>

      <div className="flex items-center gap-4 overflow-x-auto pb-4 pt-1 no-scrollbar">
        
        {/* Create Process Moment Card */}
        <button
          id="btn-add-moment-card"
          onClick={onOpenNewStory}
          className="group relative flex-shrink-0 w-36 sm:w-44 h-56 rounded-2xl overflow-hidden border-2 border-dashed border-black/20 dark:border-white/20 hover:border-cyan-500 bg-white/70 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 transition-all flex flex-col items-center justify-center p-4 text-center cursor-pointer shadow-sm"
          aria-label="Post a new studio process moment"
        >
          <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-xs font-display font-bold text-[#111317] dark:text-[#F3F1EC]">
            Post Moment
          </span>
          <span className="text-[10px] font-mono text-[#4A505C] dark:text-zinc-400 mt-1">
            WIP, Sketch or Note
          </span>
        </button>

        {/* Dynamic Stories List */}
        {stories.map((story) => {
          const badge = typeBadgeColors[story.type] || typeBadgeColors.wip;
          return (
            <div
              key={story.id}
              onClick={() => onSelectStory(story)}
              className={`group relative flex-shrink-0 w-36 sm:w-44 h-56 rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer shadow-md hover:shadow-xl ${
                story.unread
                  ? 'border-cyan-500/80 ring-2 ring-cyan-500/30'
                  : 'border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'
              }`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectStory(story); }}
              aria-label={`View story: ${story.title} by ${story.author.name}`}
            >
              {/* Media Background */}
              <img
                src={story.previewImage}
                alt={story.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />

              {/* Scrim Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/60" />

              {/* Header: Author Avatar & Time */}
              <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <img
                    src={story.author.avatar}
                    alt={story.author.name}
                    className="w-6 h-6 rounded-full object-cover ring-1 ring-white/30"
                  />
                  <span className="text-[10px] font-semibold text-white truncate max-w-[70px]">
                    {story.author.name.split(' ')[0]}
                  </span>
                </div>
                <span className="text-[9px] font-mono text-zinc-300">{story.timestamp}</span>
              </div>

              {/* Footer: Type Badge & Title */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 space-y-1">
                <span className={`inline-block text-[9px] font-mono px-2 py-0.5 rounded-full border uppercase ${badge.bg} ${badge.text}`}>
                  {story.type.replace('_', ' ')}
                </span>
                <p className="text-[11px] font-medium text-white line-clamp-2 leading-tight drop-shadow-sm">
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
