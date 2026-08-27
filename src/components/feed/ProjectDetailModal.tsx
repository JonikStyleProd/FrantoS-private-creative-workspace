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
  Sparkles 
} from 'lucide-react';
import { frantosDB } from '../../services/supabaseClient';
import { LikeHeartButton } from '../common/LikeHeartButton';

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
  const [activeImage, setActiveImage] = useState(exhibit?.coverImage || '');
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<CommentItem[]>(
    exhibit ? frantosDB.getComments(exhibit.id) : []
  );
  const [copied, setCopied] = useState(false);
  const [pinnedSuccess, setPinnedSuccess] = useState(false);
  const [workspaceSuccess, setWorkspaceSuccess] = useState(false);

  useEffect(() => {
    if (exhibit) {
      setActiveImage(exhibit.coverImage);
      setComments(frantosDB.getComments(exhibit.id));
    }
  }, [exhibit]);

  // Escape key close
  useEffect(() => {
    if (!exhibit) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [exhibit, onClose]);

  if (!exhibit) return null;

  const currentUserId = activeUserId || activeProfile?.id;
  const isOwner = exhibit.isUserCreated || (currentUserId && exhibit.author.id === currentUserId);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment: CommentItem = {
      id: `comment-${Date.now()}`,
      projectId: exhibit.id,
      author: {
        name: activeProfile?.name || 'Elena Rostova',
        avatar: activeProfile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        handle: activeProfile?.handle || '@elena_spatial',
      },
      text: commentText.trim(),
      timestamp: 'Just now',
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
      tag: `${exhibit.discipline.toUpperCase()} Study`,
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
      title: `${exhibit.title} — Production Sprint`,
      discipline: exhibit.discipline,
      stage: 'production',
      assignee: {
        name: activeProfile?.name || exhibit.author.name,
        avatar: activeProfile?.avatar || exhibit.author.avatar,
      },
      dueDate: 'Oct 14, 2026',
      priority: 'high',
      assetCount: 6,
      progress: exhibit.wipProgress || 35,
      description: `Iterate on shader assets and material specs from exhibit: ${exhibit.title}`,
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
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        id="project-detail-modal-container"
        className="relative w-full max-w-5xl rounded-3xl overflow-hidden bg-white dark:bg-[#0D0F14] border border-black/10 dark:border-white/15 text-[#111317] dark:text-white shadow-2xl my-auto max-h-[92vh] flex flex-col frantos-animated-frame"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-6 border-b border-black/10 dark:border-white/10 flex items-center justify-between bg-[#F8F7F4]/90 dark:bg-black/40 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <img
              src={exhibit.author.avatar}
              alt={exhibit.author.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-cyan-500/40"
            />
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg tracking-tight text-[#111317] dark:text-[#F3F1EC]">
                {exhibit.title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-[#4A505C] dark:text-zinc-400 font-mono">
                <span>By {exhibit.author.name}</span>
                <span>•</span>
                <span className="capitalize text-cyan-600 dark:text-cyan-400 font-semibold">{exhibit.discipline}</span>
                <span>•</span>
                <span>{exhibit.year}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOwner && onEditExhibit && (
              <button
                onClick={() => {
                  onClose();
                  onEditExhibit(exhibit);
                }}
                className="px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}

            {isOwner && onDeleteExhibit && (
              <button
                onClick={handleDeletePost}
                className="p-2 rounded-full border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs transition-colors cursor-pointer"
                title="Delete Exhibit"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <LikeHeartButton
              isLiked={exhibit.isLiked}
              likesCount={exhibit.likesCount}
              onToggleLike={() => onToggleLike(exhibit.id)}
              size="md"
            />

            <button
              onClick={() => onToggleSave(exhibit.id)}
              className={`p-2.5 rounded-full border transition-all cursor-pointer ${
                exhibit.isSaved
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-700 dark:text-cyan-300'
                  : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
              }`}
              aria-label={exhibit.isSaved ? 'Unsave' : 'Save project'}
            >
              <Bookmark className={`w-4 h-4 ${exhibit.isSaved ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={handleShare}
              className="p-2.5 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/15 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-all cursor-pointer"
              aria-label="Share project"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2.5 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-all ml-2 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-8 overflow-y-auto space-y-8 flex-1">
          
          {/* Main Media Showcase */}
          <div className="relative rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-zinc-900 aspect-video max-h-[500px]">
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
                className="px-3 py-1.5 rounded-full bg-black/75 hover:bg-black text-white text-xs font-mono font-medium backdrop-blur-md border border-white/20 flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer shadow-lg"
              >
                {pinnedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Layers className="w-3.5 h-3.5 text-purple-400" />}
                <span>{pinnedSuccess ? 'Pinned to Board!' : 'Pin to Moodboard'}</span>
              </button>

              <button
                type="button"
                onClick={handleSendToWorkspace}
                className="px-3 py-1.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-mono font-bold backdrop-blur-md flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer shadow-lg"
              >
                {workspaceSuccess ? <Check className="w-3.5 h-3.5 text-black" /> : <FolderKanban className="w-3.5 h-3.5 text-black" />}
                <span>{workspaceSuccess ? 'Sprint Created!' : 'Send to Workspace'}</span>
              </button>
            </div>
          </div>

          {/* Gallery Thumbnail Strip */}
          {exhibit.galleryImages && exhibit.galleryImages.length > 0 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              <button
                onClick={() => setActiveImage(exhibit.coverImage)}
                className={`relative w-20 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all cursor-pointer ${
                  activeImage === exhibit.coverImage ? 'border-cyan-500 scale-105 shadow-md' : 'border-black/10 dark:border-white/10 opacity-70'
                }`}
              >
                <img src={exhibit.coverImage} alt="Main" className="w-full h-full object-cover" />
              </button>
              {exhibit.galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`relative w-20 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all cursor-pointer ${
                    activeImage === img ? 'border-cyan-500 scale-105 shadow-md' : 'border-black/10 dark:border-white/10 opacity-70'
                  }`}
                >
                  <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Project Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left 2 Cols: Description & Process Notes */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h4 className="text-xs font-mono uppercase tracking-widest text-[#4A505C] dark:text-zinc-400 mb-2 font-bold">
                  01 // Project Thesis & Overview
                </h4>
                <p className="text-sm sm:text-base text-[#111317] dark:text-zinc-300 leading-relaxed font-sans">
                  {exhibit.description}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-mono uppercase tracking-widest text-[#4A505C] dark:text-zinc-400 mb-2 font-bold">
                  02 // Spatial & Material Process
                </h4>
                <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs sm:text-sm text-[#111317] dark:text-zinc-300 leading-relaxed font-mono">
                  {exhibit.processNotes}
                </div>
              </div>

              {/* Live Interactive Comments */}
              <div className="pt-6 border-t border-black/10 dark:border-white/10">
                <h4 className="text-xs font-mono uppercase tracking-widest text-[#4A505C] dark:text-zinc-400 mb-4 flex items-center justify-between font-bold">
                  <span>03 // Studio Discussions ({comments.length})</span>
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold">Encrypted Studio Thread</span>
                </h4>

                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} className="flex gap-2 mb-6">
                  <input
                    type="text"
                    placeholder="Contribute spatial feedback, shader questions, or notes..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#111317] dark:text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-sans"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Post</span>
                  </button>
                </form>

                {/* Comments List with Delete own comment */}
                <div className="space-y-3">
                  {comments.map((c) => {
                    const isOwnComment = c.author.name === activeProfile?.name || c.author.handle === '@studio_member';
                    return (
                      <div key={c.id} className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-1.5 group">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <img src={c.author.avatar} alt={c.author.name} className="w-4 h-4 rounded-full object-cover" />
                            <span className="font-semibold text-[#111317] dark:text-white">{c.author.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500 font-mono text-[10px]">{c.timestamp}</span>
                            {isOwnComment && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(c.id)}
                                className="p-1 text-zinc-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                title="Delete your comment"
                                aria-label="Delete comment"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-[#4A505C] dark:text-zinc-300 leading-relaxed font-sans">{c.text}</p>
                      </div>
                    );
                  })}
                  {comments.length === 0 && (
                    <p className="text-xs font-mono text-zinc-500 italic">No studio comments yet. Be the first to start the thread.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Col: Technical Specifications */}
            <div className="space-y-6 p-6 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 h-fit">
              <h4 className="text-xs font-mono uppercase tracking-widest text-cyan-600 dark:text-cyan-400 font-bold">
                Technical Specifications
              </h4>

              {/* Color Swatches */}
              <div>
                <div className="text-[11px] font-mono text-[#4A505C] dark:text-zinc-400 mb-2 font-semibold">Color Spectrum Index</div>
                <div className="flex items-center gap-2">
                  {exhibit.colorPalette.map((hex, idx) => (
                    <div key={idx} className="group relative">
                      <span
                        className="block w-7 h-7 rounded-lg border border-black/10 dark:border-white/20 shadow-sm"
                        style={{ backgroundColor: hex }}
                      />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-black text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {hex}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Typography Specs */}
              <div>
                <div className="text-[11px] font-mono text-[#4A505C] dark:text-zinc-400 mb-1 font-semibold">Typography Architecture</div>
                <div className="text-xs text-[#111317] dark:text-white font-mono font-medium">{exhibit.typographySpec.headingFont}</div>
                <div className="text-[11px] text-[#4A505C] dark:text-zinc-400 font-mono">{exhibit.typographySpec.bodyFont}</div>
              </div>

              {/* Tools Used */}
              <div>
                <div className="text-[11px] font-mono text-[#4A505C] dark:text-zinc-400 mb-2 font-semibold">Software & Engine Stack</div>
                <div className="flex flex-wrap gap-1.5">
                  {exhibit.toolsUsed.map((tool, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md bg-black/5 dark:bg-white/10 text-zinc-800 dark:text-zinc-300 text-[11px] font-mono border border-black/5 dark:border-transparent"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              {/* Performance Metrics */}
              {exhibit.metrics && (
                <div className="pt-4 border-t border-black/10 dark:border-white/10 space-y-1.5 font-mono text-xs text-[#4A505C] dark:text-zinc-400">
                  <div className="flex justify-between">
                    <span>Framerate / Draw:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{exhibit.metrics.renderTime || '60 FPS'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mesh Density:</span>
                    <span className="text-[#111317] dark:text-white font-semibold">{exhibit.metrics.polygons || 'N/A'}</span>
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
