import React, { useState } from 'react';
import { ProjectExhibit, WorkspaceTask, MoodboardItem } from '../../types';
import { 
  Bookmark, 
  MessageSquare, 
  ArrowUpRight, 
  Heart,
  Edit3,
  Trash2,
  Sparkles
} from 'lucide-react';
import { LikeHeartButton } from '../common/LikeHeartButton';
import { useLanguage } from '../../i18n/LanguageContext';

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
  const { t, formatNumber } = useLanguage();
  const [imgError, setImgError] = useState(false);
  const [showBurstHeart, setShowBurstHeart] = useState(false);

  const userId = activeUserId || currentUserId;
  const isOwner = exhibit.isUserCreated || (userId && (exhibit.author.id === userId || exhibit.author.name === 'Elena Rostova' || exhibit.author.name === 'Елена Ростова'));

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

  // Double click / double tap on media to like with heart burst animation
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowBurstHeart(true);
    if (!exhibit.isLiked) {
      onToggleLike(exhibit.id, e);
    }
    setTimeout(() => {
      setShowBurstHeart(false);
    }, 700);
  };

  const isWip = exhibit.format === 'wip-process' || (exhibit.wipProgress !== undefined && exhibit.wipProgress < 100);

  return (
    <article
      id={`catalog-item-${exhibit.id}`}
      onClick={() => onSelect(exhibit)}
      className="group cursor-pointer select-none space-y-3.5 transition-all duration-300"
      aria-label={`Catalog exhibit: ${exhibit.title}`}
    >
      {/* 1. DOMINANT ARTWORK COVER (Large natural plate without nested card container) */}
      <div 
        onDoubleClick={handleDoubleClick}
        className="relative w-full aspect-[16/10] sm:aspect-[16/10] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#0A0B0E] border border-black/8 dark:border-white/8 shadow-sm group-hover:shadow-xl group-hover:border-ultramarine/40 transition-all duration-500 ease-out"
      >
        {!imgError ? (
          <img
            src={exhibit.coverImage}
            alt={exhibit.coverAlt || exhibit.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-6 text-center bg-zinc-900">
            <span className="font-display font-bold text-base text-white/70">{exhibit.title}</span>
          </div>
        )}

        {/* Double-Click Heart Burst */}
        {showBurstHeart && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none text-rose-500 animate-heart-burst">
            <Heart className="w-16 h-16 fill-current drop-shadow-2xl" />
          </div>
        )}

        {/* Subtle Discipline / WIP Watermark in top corner */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 pointer-events-none">
          <span className="font-mono text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[#F5F3EF] border border-white/10">
            {exhibit.discipline}
          </span>
          {isWip && (
            <span className="font-mono text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-amber-500 text-black">
              WIP {exhibit.wipProgress || 60}%
            </span>
          )}
        </div>

        {/* Action Triggers in top right with 44px hitboxes */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          {isOwner && (
            <div className="flex items-center gap-1 bg-black/75 backdrop-blur-md p-0.5 rounded-full border border-white/15">
              <button
                type="button"
                onClick={handleEditClick}
                className="w-8 h-8 rounded-full hover:bg-white/20 text-ultramarine cursor-pointer flex items-center justify-center transition-colors"
                title={t.modals.editPostBtn}
                aria-label={t.modals.editPostBtn}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleDeleteClick}
                className="w-8 h-8 rounded-full hover:bg-rose-500/30 text-rose-400 cursor-pointer flex items-center justify-center transition-colors"
                title={t.modals.deletePostBtn}
                aria-label={t.modals.deletePostBtn}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={(e) => onToggleSave(exhibit.id, e)}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full backdrop-blur-md border transition-all cursor-pointer flex items-center justify-center ${
              exhibit.isSaved
                ? 'bg-ultramarine border-ultramarine text-white shadow-md'
                : 'bg-black/65 border-white/20 text-white hover:bg-black/90'
            }`}
            aria-label={exhibit.isSaved ? t.common.saved : t.common.save}
            title={exhibit.isSaved ? t.common.saved : t.common.save}
          >
            <Bookmark className={`w-4 h-4 ${exhibit.isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. EDITORIAL CAPTIONS DIRECTLY BENEATH THE ARTWORK */}
      <div className="space-y-1.5 px-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display font-bold text-lg sm:text-xl text-[#121316] dark:text-[#F5F3EF] group-hover:text-ultramarine transition-colors line-clamp-1">
            {exhibit.title}
          </h3>
          <span className="font-mono text-xs text-[#848792] dark:text-[#6B6861] flex-shrink-0">
            {exhibit.year || '2026'}
          </span>
        </div>

        <p className="text-xs text-[#52555F] dark:text-[#A3A099] line-clamp-2 leading-relaxed">
          {exhibit.subtitle || exhibit.description}
        </p>

        {/* Metadata line: Author, comments, and direct inspect CTA */}
        <div className="pt-2 flex items-center justify-between text-xs font-mono text-[#848792] dark:text-[#6B6861] border-t border-black/6 dark:border-white/6">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[#121316] dark:text-[#F5F3EF] font-medium truncate">
              {exhibit.author.name}
            </span>
            <span>/</span>
            <span className="uppercase text-[10px] tracking-wider text-ultramarine font-semibold">
              {exhibit.discipline}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <LikeHeartButton
              isLiked={exhibit.isLiked}
              likesCount={exhibit.likesCount}
              onToggleLike={(e) => onToggleLike(exhibit.id, e)}
              size="sm"
            />
            <span className="flex items-center gap-1 text-[#52555F] dark:text-[#A3A099]">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{exhibit.commentsCount || 0}</span>
            </span>
            <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-ultramarine group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        </div>
      </div>
    </article>
  );
};
