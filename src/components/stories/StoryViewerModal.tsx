import React, { useState, useEffect, useRef } from 'react';
import { Story, MoodboardItem } from '../../types';
import { X, Pause, Play, Bookmark, Layers, Check } from 'lucide-react';
import { LikeHeartButton } from '../common/LikeHeartButton';

interface StoryViewerModalProps {
  story: Story | null;
  stories: Story[];
  onClose: () => void;
  onSelectStory: (story: Story) => void;
  onToggleLikeStory?: (storyId: string) => void;
  onToggleSaveStory?: (storyId: string) => void;
  onPinToMoodboard?: (item: MoodboardItem) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  story,
  stories,
  onClose,
  onSelectStory,
  onToggleLikeStory,
  onToggleSaveStory,
  onPinToMoodboard,
}) => {
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pinnedSuccess, setPinnedSuccess] = useState(false);

  const currentIndex = story ? stories.findIndex((s) => s.id === story.id) : -1;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state when active story changes
  useEffect(() => {
    if (story) {
      setProgress(0);
    }
  }, [story?.id]);

  // Story progress timer
  useEffect(() => {
    if (!story || isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [story?.id, isPaused]);

  // Handle completion navigation outside the state updater
  useEffect(() => {
    if (!story) return;

    if (progress >= 100) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (currentIndex >= 0 && currentIndex < stories.length - 1) {
          onSelectStory(stories[currentIndex + 1]);
        } else {
          onClose();
        }
      }, 50);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [progress, story, currentIndex, stories, onSelectStory, onClose]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, stories, onClose]);

  if (!story) return null;

  const handlePrev = () => {
    if (currentIndex > 0) {
      onSelectStory(stories[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      onSelectStory(stories[currentIndex + 1]);
    } else {
      onClose();
    }
  };

  const handlePinMoment = () => {
    if (onPinToMoodboard) {
      const newBoardItem: MoodboardItem = {
        id: `mb-story-${Date.now()}`,
        title: story.title,
        type: 'image',
        content: story.mediaUrl,
        tag: `Story // ${story.type.toUpperCase()}`,
        discipline: story.discipline,
        x: 150 + Math.random() * 100,
        y: 150 + Math.random() * 80,
        width: 260,
        height: 220,
        zIndex: 12,
        rotation: Math.floor(Math.random() * 8) - 4,
      };
      onPinToMoodboard(newBoardItem);
      setPinnedSuccess(true);
      setTimeout(() => setPinnedSuccess(false), 2000);
    }
  };

  return (
    <div 
      id="story-viewer-modal"
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md h-[82vh] max-h-[720px] rounded-3xl overflow-hidden bg-[#0A0D12] border border-white/20 shadow-2xl flex flex-col justify-between frantos-animated-frame"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Progress Bar */}
        <div className="absolute top-3 left-4 right-4 z-30 flex items-center gap-1.5">
          {stories.map((s, idx) => (
            <div key={s.id} className="h-1 flex-1 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100 ease-linear"
                style={{
                  width:
                    idx < currentIndex
                      ? '100%'
                      : idx === currentIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Top Author Bar */}
        <div className="absolute top-7 left-4 right-4 z-30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={story.author.avatar}
              alt={story.author.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-white/40 shadow-md"
            />
            <div>
              <h4 className="text-xs font-semibold text-white leading-tight">
                {story.author.name}
              </h4>
              <p className="text-[10px] font-mono text-zinc-300">
                {story.author.role} • {story.timestamp}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md cursor-pointer"
              aria-label={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md cursor-pointer"
              aria-label="Close story"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Story Media Background */}
        <div className="relative w-full h-full bg-zinc-950 overflow-hidden flex items-center justify-center">
          <img
            src={story.mediaUrl}
            alt={story.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/60 pointer-events-none" />

          {/* Left/Right Click Navigators */}
          <button
            onClick={handlePrev}
            className="absolute left-0 top-0 bottom-0 w-1/3 z-20 focus:outline-none cursor-pointer"
            aria-label="Previous story moment"
          />
          <button
            onClick={handleNext}
            className="absolute right-0 top-0 bottom-0 w-1/3 z-20 focus:outline-none cursor-pointer"
            aria-label="Next story moment"
          />
        </div>

        {/* Bottom Caption & Interactions */}
        <div className="absolute bottom-0 left-0 right-0 p-5 z-30 space-y-3">
          <div>
            <span className="inline-block text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 mb-1.5 font-bold">
              {story.type.replace('_', ' ')}
            </span>
            <h3 className="text-sm font-semibold text-white">{story.title}</h3>
            <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{story.caption}</p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <LikeHeartButton
                isLiked={story.isLiked}
                likesCount={story.likesCount}
                onToggleLike={() => onToggleLikeStory && onToggleLikeStory(story.id)}
                size="sm"
              />

              <button
                type="button"
                onClick={() => onToggleSaveStory && onToggleSaveStory(story.id)}
                className={`p-2 rounded-full border backdrop-blur-md transition-all cursor-pointer ${
                  story.isSaved
                    ? 'bg-cyan-500 border-cyan-400 text-white'
                    : 'bg-black/40 border-white/20 text-white hover:bg-black/60'
                }`}
                aria-label={story.isSaved ? 'Unsave moment' : 'Save moment'}
              >
                <Bookmark className={`w-3.5 h-3.5 ${story.isSaved ? 'fill-current' : ''}`} />
              </button>

              <button
                type="button"
                onClick={handlePinMoment}
                className="px-2.5 py-1.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 text-white text-[11px] font-mono flex items-center gap-1 backdrop-blur-md cursor-pointer"
                title="Pin this visual moment to Moodboard"
              >
                {pinnedSuccess ? <Check className="w-3 h-3 text-emerald-400" /> : <Layers className="w-3 h-3 text-purple-400" />}
                <span>{pinnedSuccess ? 'Pinned!' : 'Pin'}</span>
              </button>
            </div>

            <span className="text-[10px] font-mono text-zinc-400">
              Studio Stream
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
