import React, { useState, useEffect } from 'react';
import { ProjectExhibit, CommentItem, CreatorProfile, WorkspaceTask, MoodboardItem } from '../../types';
import { 
  X, 
  Bookmark, 
  Share2, 
  Send, 
  Check, 
  Trash2, 
  Layers, 
  FolderKanban, 
  Edit3, 
  Sparkles,
  Copy,
  ExternalLink
} from 'lucide-react';
import { frantosDB } from '../../services/supabaseClient';
import { LikeHeartButton } from '../common/LikeHeartButton';
import { useLanguage } from '../../i18n/LanguageContext';

interface ProjectDetailModalProps {
  exhibit: ProjectExhibit | null;
  onClose: () => void;
  onToggleLike: (id: string) => void;
  onToggleSave: (id: string) => void;
  onEditExhibit?: (exhibit: ProjectExhibit) => void;
  onDeleteExhibit?: (id: string) => void;
  onPinToMoodboard?: (item: MoodboardItem) => void;
  onSendToWorkspace?: (task: WorkspaceTask) => void;
  activeProfile?: CreatorProfile;
  activeUserId?: string;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  exhibit,
  onClose,
  onToggleLike,
  onToggleSave,
  onEditExhibit,
  onDeleteExhibit,
  onPinToMoodboard,
  onSendToWorkspace,
  activeProfile,
  activeUserId,
}) => {
  const { t, language } = useLanguage();
  const [activeImage, setActiveImage] = useState(exhibit?.coverImage || '');
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<CommentItem[]>(
    exhibit ? frantosDB.getComments(exhibit.id) : []
  );
  const [copied, setCopied] = useState(false);
  const [pinnedSuccess, setPinnedSuccess] = useState(false);
  const [workspaceSuccess, setWorkspaceSuccess] = useState(false);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  useEffect(() => {
    if (exhibit) {
      setActiveImage(exhibit.coverImage);
      setComments(frantosDB.getComments(exhibit.id));
    }
  }, [exhibit]);

  // Body scroll lock & Escape key close
  useEffect(() => {
    if (!exhibit) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [exhibit, onClose]);

  if (!exhibit) return null;

  const currentUserId = activeUserId || activeProfile?.id;
  const isOwner = exhibit.isUserCreated || (currentUserId && (exhibit.author.id === currentUserId || exhibit.author.name === 'Elena Rostova'));

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment: CommentItem = {
      id: `comment-${Date.now()}`,
      projectId: exhibit.id,
      author: {
        name: activeProfile?.name || 'Елена Ростова',
        avatar: activeProfile?.avatar || '/images/avatar1.jpg',
        handle: activeProfile?.handle || '@elena_spatial',
      },
      text: commentText.trim(),
      timestamp: 'Только что',
      discipline: exhibit.discipline,
    };

    const updated = frantosDB.addComment(newComment);
    setComments(updated);
    setCommentText('');
  };

  const handleDeleteComment = (commentId: string) => {
    const updated = frantosDB.deleteComment(commentId, exhibit.id);
    setComments(updated);
  };

  const handlePinToMoodboard = () => {
    const newBoardItem: MoodboardItem = {
      id: `mb-${Date.now()}`,
      title: exhibit.title,
      type: 'image',
      content: activeImage || exhibit.coverImage,
      tag: `${exhibit.discipline.toUpperCase()}`,
      discipline: exhibit.discipline,
      x: 120 + Math.random() * 150,
      y: 120 + Math.random() * 100,
      width: 280,
      height: 240,
      zIndex: 10,
      rotation: Math.floor(Math.random() * 6) - 3,
    };

    if (onPinToMoodboard) {
      onPinToMoodboard(newBoardItem);
    } else {
      frantosDB.addMoodboardItem(newBoardItem);
    }

    setPinnedSuccess(true);
    setTimeout(() => setPinnedSuccess(false), 2500);
  };

  const handleSendToWorkspace = () => {
    const newTask: WorkspaceTask = {
      id: `task-${Date.now()}`,
      title: `${exhibit.title} — Спринт полировки`,
      discipline: exhibit.discipline,
      stage: 'production',
      assignee: {
        name: activeProfile?.name || exhibit.author.name,
        avatar: activeProfile?.avatar || exhibit.author.avatar,
      },
      dueDate: 'Окт 2026',
      priority: 'high',
      assetCount: 6,
      progress: exhibit.wipProgress || 40,
      description: `Итерация по шейдерам и материалам для проекта: ${exhibit.title}`,
    };

    if (onSendToWorkspace) {
      onSendToWorkspace(newTask);
    } else {
      frantosDB.addTask(newTask);
    }

    setWorkspaceSuccess(true);
    setTimeout(() => setWorkspaceSuccess(false), 2500);
  };

  const handleDeletePost = () => {
    if (onDeleteExhibit) {
      onDeleteExhibit(exhibit.id);
      onClose();
    }
  };

  return (
    <div 
      id="project-detail-modal-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-modal-title"
    >
      <div 
        id="project-detail-modal-container"
        className="relative w-full max-w-5xl rounded-3xl overflow-hidden bg-[#0A0C10] border border-white/10 text-[#F5F3EF] shadow-2xl my-auto max-h-[94dvh] sm:max-h-[88dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header Bar */}
        <div className="p-3.5 sm:p-5 border-b border-white/8 flex items-center justify-between bg-[#0E1015]/95 backdrop-blur-md sticky top-0 z-30 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={exhibit.author.avatar}
              alt={exhibit.author.name}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-ultramarine/40 flex-shrink-0"
            />
            <div className="min-w-0">
              <h3 id="project-modal-title" className="font-display font-bold text-sm sm:text-lg tracking-tight text-[#F5F3EF] truncate">
                {exhibit.title}
              </h3>
              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-[#A3A099] font-mono truncate">
                <span className="truncate">{exhibit.author.name}</span>
                <span>·</span>
                <span className="text-ultramarine font-semibold">{exhibit.discipline.toUpperCase()}</span>
                <span>·</span>
                <span>{exhibit.year}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {isOwner && onEditExhibit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditExhibit(exhibit);
                }}
                className="px-3 py-1.5 rounded-full border border-ultramarine/30 bg-ultramarine/10 hover:bg-ultramarine/20 text-white text-xs font-mono font-semibold flex items-center gap-1 transition-colors cursor-pointer touch-manipulation min-h-[40px]"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Изменить</span>
              </button>
            )}

            {isOwner && onDeleteExhibit && (
              <button
                type="button"
                onClick={handleDeletePost}
                className="w-10 h-10 rounded-full border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs transition-colors cursor-pointer flex items-center justify-center touch-manipulation"
                title="Удалить проект"
                aria-label="Удалить проект"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <LikeHeartButton
              isLiked={exhibit.isLiked}
              likesCount={exhibit.likesCount}
              onToggleLike={() => onToggleLike(exhibit.id)}
              size="md"
            />

            <button
              type="button"
              onClick={() => onToggleSave(exhibit.id)}
              className={`w-10 h-10 rounded-full border transition-all cursor-pointer flex items-center justify-center touch-manipulation ${
                exhibit.isSaved
                  ? 'bg-ultramarine/20 border-ultramarine text-ultramarine shadow-sm'
                  : 'bg-white/5 border-white/10 text-[#A3A099] hover:text-white'
              }`}
              aria-label={exhibit.isSaved ? t.common.saved : t.common.save}
            >
              <Bookmark className={`w-4 h-4 ${exhibit.isSaved ? 'fill-current' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/12 text-[#A3A099] hover:text-white transition-all cursor-pointer flex items-center justify-center touch-manipulation"
              aria-label={language === 'ru' ? 'Скопировать ссылку' : 'Copy link'}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/15 text-[#A3A099] hover:text-white transition-all ml-1 cursor-pointer flex items-center justify-center touch-manipulation"
              aria-label={t.common.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-7 overflow-y-auto space-y-6 flex-1">
          
          {/* Main Media Showcase */}
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black aspect-video max-h-[480px]">
            <img
              src={activeImage}
              alt={exhibit.coverAlt || exhibit.title}
              className="w-full h-full object-cover"
            />

            {/* Quick Actions Overlay (Pin to Moodboard, Send to Workspace) */}
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">
              <button
                type="button"
                onClick={handlePinToMoodboard}
                className="px-4 py-2.5 rounded-full bg-black/80 hover:bg-black text-white text-xs font-mono font-semibold backdrop-blur-md border border-white/20 flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer shadow-lg touch-manipulation min-h-[44px]"
              >
                {pinnedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Layers className="w-3.5 h-3.5 text-ultramarine" />}
                <span>{pinnedSuccess ? (language === 'ru' ? 'Прикреплено' : 'Pinned') : t.modals.pinToBoardBtn}</span>
              </button>

              <button
                type="button"
                onClick={handleSendToWorkspace}
                className="px-4 py-2.5 rounded-full bg-ultramarine hover:bg-ultramarine/90 text-white text-xs font-mono font-bold backdrop-blur-md flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer shadow-lg touch-manipulation min-h-[44px]"
              >
                {workspaceSuccess ? <Check className="w-3.5 h-3.5 text-white" /> : <FolderKanban className="w-3.5 h-3.5 text-white" />}
                <span>{workspaceSuccess ? (language === 'ru' ? 'Спринт создан' : 'Sprint Task Added') : t.modals.sendToSprintBtn}</span>
              </button>
            </div>
          </div>

          {/* Gallery Thumbnail Strip */}
          {exhibit.galleryImages && exhibit.galleryImages.length > 0 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveImage(exhibit.coverImage)}
                className={`relative w-20 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all cursor-pointer ${
                  activeImage === exhibit.coverImage ? 'border-ultramarine scale-105 shadow-md' : 'border-white/10 opacity-70'
                }`}
              >
                <img src={exhibit.coverImage} alt="Main" className="w-full h-full object-cover" />
              </button>
              {exhibit.galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(img)}
                  className={`relative w-20 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all cursor-pointer ${
                    activeImage === img ? 'border-ultramarine scale-105 shadow-md' : 'border-white/10 opacity-70'
                  }`}
                >
                  <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Project Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Left 2 Cols: Thesis & Overview, Process & Comments */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h4 className="text-xs font-mono uppercase tracking-widest text-ultramarine mb-2 font-bold">
                  {t.modals.thesisHeading}
                </h4>
                <p className="text-sm sm:text-base text-[#F5F3EF] leading-relaxed font-sans">
                  {exhibit.description}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-mono uppercase tracking-widest text-[#A3A099] mb-2 font-semibold">
                  {t.modals.materialsHeading}
                </h4>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 text-xs sm:text-sm text-[#F5F3EF] leading-relaxed font-mono">
                  {exhibit.processNotes}
                </div>
              </div>

              {/* Discussions & Notes */}
              <div className="pt-6 border-t border-white/8">
                <h4 className="text-xs font-mono uppercase tracking-widest text-[#A3A099] mb-3 flex items-center justify-between font-bold">
                  <span>{t.modals.discussionHeading} ({comments.length})</span>
                  <span className="text-[10px] text-ultramarine font-semibold">{language === 'ru' ? 'Внутренний канал' : 'Studio Channel'}</span>
                </h4>

                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder={t.modals.commentPlaceholder}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 px-3.5 py-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-ultramarine font-sans"
                  />
                  <button
                    type="submit"
                    className="min-h-[44px] px-5 py-3 rounded-xl bg-ultramarine hover:bg-ultramarine/90 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm touch-manipulation"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{t.modals.commentSendBtn}</span>
                  </button>
                </form>

                {/* Comments List */}
                <div className="space-y-2.5">
                  {comments.map((c) => {
                    const isOwnComment = c.author.name === activeProfile?.name;
                    return (
                      <div key={c.id} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <img src={c.author.avatar} alt={c.author.name} className="w-5 h-5 rounded-full object-cover" />
                            <span className="font-semibold text-white">{c.author.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500 font-mono text-[10px]">{c.timestamp}</span>
                            {isOwnComment && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(c.id)}
                                className="p-1 text-zinc-400 hover:text-rose-500 cursor-pointer"
                                title={language === 'ru' ? 'Удалить' : 'Delete'}
                                aria-label={language === 'ru' ? 'Удалить комментарий' : 'Delete comment'}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-[#A3A099] leading-relaxed font-sans">{c.text}</p>
                      </div>
                    );
                  })}
                  {comments.length === 0 && (
                    <p className="text-xs font-mono text-zinc-500 italic">{t.modals.discussionEmpty}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Col: Technical Specifications Passport */}
            <div className="space-y-5 p-5 rounded-3xl bg-white/[0.03] border border-white/8 h-fit">
              <h4 className="text-xs font-mono uppercase tracking-widest text-ultramarine font-bold">
                {t.modals.specsHeading}
              </h4>

              {/* Color Swatches */}
              <div>
                <div className="text-[11px] font-mono text-[#A3A099] mb-2 font-semibold">{t.modals.colorPaletteLabel}</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {exhibit.colorPalette.map((hex, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleCopyHex(hex)}
                      className="group relative cursor-pointer"
                      title={`${language === 'ru' ? 'Копировать' : 'Copy'} ${hex}`}
                    >
                      <span
                        className="block w-8 h-8 rounded-xl border border-white/20 shadow-sm"
                        style={{ backgroundColor: hex }}
                      />
                    </button>
                  ))}
                  {copiedHex && (
                    <span className="text-[10px] font-mono text-emerald-400">{language === 'ru' ? 'Скопировано' : 'Copied'} {copiedHex}!</span>
                  )}
                </div>
              </div>

              {/* Typography Specs */}
              <div>
                <div className="text-[11px] font-mono text-[#A3A099] mb-1 font-semibold">{t.modals.typographyLabel}</div>
                <div className="text-xs text-white font-mono font-medium">{exhibit.typographySpec.headingFont}</div>
                <div className="text-[11px] text-[#A3A099] font-mono">{exhibit.typographySpec.bodyFont}</div>
              </div>

              {/* Tools Used */}
              <div>
                <div className="text-[11px] font-mono text-[#A3A099] mb-2 font-semibold">{t.modals.toolsUsedLabel}</div>
                <div className="flex flex-wrap gap-1.5">
                  {exhibit.toolsUsed.map((tool, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-white/10 text-white text-[11px] font-mono"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              {/* Performance Metrics */}
              {exhibit.metrics && (
                <div className="pt-3 border-t border-white/8 space-y-1.5 font-mono text-xs text-[#A3A099]">
                  <div className="flex justify-between">
                    <span>{t.modals.framerateLabel}</span>
                    <span className="text-emerald-400 font-semibold">{exhibit.metrics.renderTime || '60 FPS'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.modals.polygonsLabel}</span>
                    <span className="text-white font-semibold">{exhibit.metrics.polygons || '240K'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
