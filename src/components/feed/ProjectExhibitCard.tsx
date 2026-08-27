import React, { useState } from 'react';
import { ProjectExhibit, WorkspaceTask, MoodboardItem } from '../../types';
import { 
  Bookmark, 
  MessageSquare, 
  ArrowUpRight, 
  Maximize2,
  Heart,
  Edit3,
  Trash2,
  Share2,
  Layers,
  Sparkles
} from 'lucide-react';
import { LikeHeartButton } from '../common/LikeHeartButton';

export interface ProjectExhibitCardProps {
  exhibit: ProjectExhibit;
  onSelect: (exhibit: ProjectExhibit) => void;
  onToggleLike: (id: string, e?: React.MouseEvent) => void;
  onToggleSave: (id: string, e?: React.MouseEvent) => void;
  onEdit?: (exhibit: ProjectExhibit, e: React.MouseEvent) => void;
  onDelete?: (id: string, e: React.MouseEvent) => void;
  onEditExhibit?: (exhibit: ProjectExhibit) => void;
  onDeleteExhibit?: (id: string) => void;
  onPinToMoodboard?: (item: MoodboardItem) => void;
  onSendToWorkspace?: (task: WorkspaceTask) => void;
  currentUserId?: string;
  activeUserId?: string;
}

export const ProjectExhibitCard: React.FC<ProjectExhibitCardProps> = ({
  exhibit,
  onSelect,
  onToggleLike,
  onToggleSave,
  onEdit,
  onDelete,
  onEditExhibit,
  onDeleteExhibit,
  onPinToMoodboard,
  onSendToWorkspace,
  currentUserId,
  activeUserId,
}) => {
  const [imgError, setImgError] = useState(false);
  const [showBurstHeart, setShowBurstHeart] = useState(false);

  // Discipline accent colors
  const disciplineColorMap: Record<string, string> = {
    motion: '#F43F5E',
    '3d': '#06B6D4',
    brand: '#EAB308',
    ui: '#8B5CF6',
    web: '#10B981',
    sound: '#F97316',
  };

  const accentColor = disciplineColorMap[exhibit.discipline] || '#06B6D4';
  const fallbackGradient = `linear-gradient(135deg, ${accentColor}33 0%, #090B0E 100%)`;

  const userId = activeUserId || currentUserId;
  const isOwner = exhibit.isUserCreated || (userId && (exhibit.author.id === userId || exhibit.author.name === 'Elena Rostova'));

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEditExhibit) onEditExhibit(exhibit);
    else if (onEdit) onEdit(exhibit, e);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteExhibit) onDeleteExhibit(exhibit.id);
    else if (onDelete) onDelete(exhibit.id, e);
  };

  // Double click on media to like
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowBurstHeart(true);
    if (!exhibit.isLiked) {
      onToggleLike(exhibit.id, e);
    }
    setTimeout(() => {
      setShowBurstHeart(false);
    }, 750);
  };

  // Standard Gallery Card
  return (
    <article
      id={`exhibit-card-${exhibit.id}`}
      onClick={() => onSelect(exhibit)}
      className="group relative rounded-3xl overflow-hidden border border-black/10 dark:border-white/10 bg-white dark:bg-[#0E1117] shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between frantos-animated-frame"
      aria-label={`Exhibit: ${exhibit.title}`}
    >
      {/* Media Canvas Top */}
      <div 
        onDoubleClick={handleDoubleClick}
        className="relative h-60 sm:h-64 overflow-hidden bg-zinc-900 select-none"
      >
        {!imgError ? (
          <img
            src={exhibit.coverImage}
            alt={exhibit.coverAlt || exhibit.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center p-6"
            style={{ background: fallbackGradient }}
          >
            <span className="font-display font-bold text-lg text-white/60">{exhibit.title}</span>
          </div>
        )}

        {/* Double-Click Centered Heart Burst Animation */}
        {showBurstHeart && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none text-rose-500 animate-heart-burst">
            <Heart className="w-20 h-20 fill-current drop-shadow-2xl" />
          </div>
        )}

        {/* Top Discipline Badge */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
          <span 
            className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold backdrop-blur-md text-white border border-white/20 shadow-sm capitalize"
            style={{ backgroundColor: `${accentColor}dd` }}
          >
            {exhibit.discipline}
          </span>
          {(exhibit.wipProgress !== undefined && (exhibit.format === 'wip-process' || exhibit.wipProgress < 100)) && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/90 backdrop-blur-md text-black font-bold">
              WIP {exhibit.wipProgress}%
            </span>
          )}
        </div>

        {/* Owner Controls or Bookmark action on hover */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          {isOwner && (
            <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md p-1 rounded-full border border-white/20">
              <button
                type="button"
                onClick={handleEditClick}
                className="p-1.5 rounded-full hover:bg-white/20 text-cyan-300 cursor-pointer"
                title="Edit Post"
                aria-label="Edit post"
              >
                <Edit3 className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={handleDeleteClick}
                className="p-1.5 rounded-full hover:bg-rose-500/30 text-rose-400 cursor-pointer"
                title="Delete Post"
                aria-label="Delete post"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}

          <button
            onClick={(e) => onToggleSave(exhibit.id, e)}
            className={`p-2 rounded-full backdrop-blur-md border transition-all cursor-pointer ${
              exhibit.isSaved
                ? 'bg-cyan-500 border-cyan-400 text-white'
                : 'bg-black/60 border-white/20 text-white hover:bg-black/80'
            }`}
            aria-label={exhibit.isSaved ? 'Unsave' : 'Save to vault'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${exhibit.isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* Exhibit Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Author info */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <img
                src={exhibit.author.avatar}
                alt={exhibit.author.name}
                className="w-5 h-5 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10"
              />
              <span className="text-xs text-[#4A505C] dark:text-zinc-400 truncate">
                {exhibit.author.name}
              </span>
            </div>
            {exhibit.isUserCreated && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold">
                YOURS
              </span>
            )}
          </div>

          <h3 className="text-lg font-display font-bold tracking-tight text-[#111317] dark:text-[#F3F1EC] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-1">
            {exhibit.title}
          </h3>
          <p className="text-xs text-[#4A505C] dark:text-[#A0A6B2] mt-1 line-clamp-2 leading-relaxed">
            {exhibit.subtitle}
          </p>
        </div>

        {/* Footer info & Likes */}
        <div className="mt-4 pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-3">
            <LikeHeartButton
              isLiked={exhibit.isLiked}
              likesCount={exhibit.likesCount}
              onToggleLike={(e) => onToggleLike(exhibit.id, e)}
              size="sm"
            />
            <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{exhibit.commentsCount}</span>
            </span>
          </div>

          <span className="text-[11px] text-zinc-500">{exhibit.year}</span>
        </div>
      </div>
    </article>
  );
};
