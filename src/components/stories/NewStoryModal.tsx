import React, { useState, useEffect } from 'react';
import { Story, StoryType, CreativeDiscipline, CreatorProfile } from '../../types';
import { X, Sparkles, Send, Check, AlertCircle } from 'lucide-react';
import { CREATIVE_DISCIPLINES } from '../../data/mockData';
import { ImageUploader } from '../common/ImageUploader';

interface NewStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStory: (story: Story) => void;
  activeProfile: CreatorProfile;
}

export const NewStoryModal: React.FC<NewStoryModalProps> = ({
  isOpen,
  onClose,
  onAddStory,
  activeProfile,
}) => {
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [discipline, setDiscipline] = useState<CreativeDiscipline>('3d');
  const [type, setType] = useState<StoryType>('wip');
  const [imageUrl, setImageUrl] = useState(
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'
  );
  const [imageAlt, setImageAlt] = useState('Studio render snapshot');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sampleImages = [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
  ];

  // Lock background scroll, handle Escape and Android Back
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handlePopState = () => {
      onClose();
    };

    window.history.pushState({ modal: 'broadcast-moment' }, '');
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!title.trim()) {
      setErrorMsg('Please enter a moment title.');
      return;
    }
    if (!imageUrl.trim()) {
      setErrorMsg('Please provide an image or choose a preset.');
      return;
    }

    setIsSubmitting(true);

    const newStory: Story = {
      id: `story-${Date.now()}`,
      author: {
        id: activeProfile?.id || 'profile-elena',
        name: activeProfile?.name || 'Elena Rostova',
        handle: activeProfile?.handle || '@elena_spatial',
        avatar: activeProfile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: activeProfile?.role || 'Creative Director & Spatial Designer',
      },
      discipline,
      type,
      title: title.trim(),
      previewImage: imageUrl,
      mediaUrl: imageUrl,
      caption: caption.trim() || 'Studio process snapshot.',
      timestamp: 'Just now',
      unread: true,
      likesCount: 1,
      isLiked: false,
      isSaved: false,
    };

    onAddStory(newStory);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div 
      id="new-story-modal-overlay"
      className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-story-modal-title"
    >
      <div 
        id="new-story-modal-container"
        className="relative w-full max-w-lg rounded-3xl overflow-hidden bg-white dark:bg-[#0F1218] border border-black/10 dark:border-white/15 text-[#111317] dark:text-white shadow-2xl my-auto max-h-[92dvh] sm:max-h-[88dvh] flex flex-col frantos-animated-frame min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* LAYER 1: FIXED MODAL HEADER */}
        <div className="flex-shrink-0 p-3.5 sm:p-5 border-b border-black/10 dark:border-white/10 flex items-center justify-between bg-[#F8F7F4]/95 dark:bg-[#0F1218]/95 backdrop-blur-md sticky top-0 z-30 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 id="new-story-modal-title" className="font-display font-bold text-sm sm:text-base text-[#111317] dark:text-[#F3F1EC] truncate">
                Broadcast Process Moment
              </h3>
              <p className="text-[10px] text-[#4A505C] dark:text-zinc-400 font-mono truncate">
                Author: {activeProfile?.name || 'Elena Rostova'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="min-w-[40px] min-h-[40px] p-2 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-all cursor-pointer flex items-center justify-center flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LAYER 2: SCROLLABLE FORM BODY */}
        <form 
          id="new-story-form"
          onSubmit={handleSubmit} 
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 w-full p-4 sm:p-6 space-y-4"
        >
          {/* Error Alert */}
          {errorMsg && (
            <div className="w-full p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 min-w-0">{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Process Visual Upload */}
          <div className="w-full min-w-0">
            <label className="block text-xs font-mono text-[#4A505C] dark:text-zinc-400 mb-1.5 uppercase font-semibold">
              Process Visual / Snapshot *
            </label>
            <ImageUploader
              initialImageUrl={imageUrl}
              initialAlt={imageAlt}
              onImageUploaded={({ url, alt }) => {
                setImageUrl(url);
                setImageAlt(alt);
              }}
              onImageRemoved={() => {
                setImageUrl(sampleImages[0]);
              }}
              label="Select or drop snapshot"
              aspectRatio="video"
              showAltInput={false}
            />
          </div>

          {/* Preset Alternatives */}
          <div className="w-full min-w-0">
            <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 block mb-1.5">
              Or select a studio render preset:
            </span>
            <div className="grid grid-cols-4 gap-2 w-full min-w-0">
              {sampleImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setImageUrl(img)}
                  className={`relative w-full aspect-video rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    imageUrl === img 
                      ? 'border-cyan-500 scale-105 shadow-md ring-1 ring-cyan-500' 
                      : 'border-black/10 dark:border-white/10 opacity-70 hover:opacity-100'
                  }`}
                  aria-label={`Select preset image ${idx + 1}`}
                >
                  <img src={img} alt="Preset visual" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Discipline Selector */}
          <div className="w-full min-w-0">
            <label className="block text-xs font-mono text-[#4A505C] dark:text-zinc-400 mb-1.5 uppercase font-semibold">
              Creative Discipline
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full min-w-0">
              {CREATIVE_DISCIPLINES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDiscipline(d.id as CreativeDiscipline)}
                  className={`p-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer min-h-[38px] flex items-center justify-center text-center ${
                    discipline === d.id
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-700 dark:text-cyan-300 font-bold shadow-xs'
                      : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/5 text-[#4A505C] dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-white/10'
                  }`}
                >
                  <span className="truncate">{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Moment Archetype */}
          <div className="w-full min-w-0">
            <label className="block text-xs font-mono text-[#4A505C] dark:text-zinc-400 mb-1.5 uppercase font-semibold">
              Moment Archetype
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as StoryType)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#111317] dark:text-white focus:outline-none focus:border-cyan-500 font-medium cursor-pointer box-border"
            >
              <option value="wip" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Work in Progress (WIP)</option>
              <option value="sketch" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Concept Sketch</option>
              <option value="process" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Shader / Physics Process</option>
              <option value="inspiration" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Studio Inspiration</option>
              <option value="studio_note" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Studio Journal Note</option>
              <option value="behind_the_scenes" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Behind the Scenes</option>
            </select>
          </div>

          {/* Title */}
          <div className="w-full min-w-0">
            <label className="block text-xs font-mono text-[#4A505C] dark:text-zinc-400 mb-1.5 uppercase font-semibold">
              Moment Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Subsurface caustics test on silica crystal..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#111317] dark:text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-sans box-border"
            />
          </div>

          {/* Caption */}
          <div className="w-full min-w-0">
            <label className="block text-xs font-mono text-[#4A505C] dark:text-zinc-400 mb-1.5 uppercase font-semibold">
              Notes & Parameters
            </label>
            <textarea
              placeholder="Brief description of the material experiment or technical insight..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#111317] dark:text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-sans resize-none box-border"
            />
          </div>
        </form>

        {/* LAYER 3: FIXED MODAL FOOTER */}
        <div className="flex-shrink-0 p-3 sm:p-4 border-t border-black/10 dark:border-white/10 bg-[#F8F7F4]/95 dark:bg-[#0F1218]/95 backdrop-blur-md flex items-center justify-between sm:justify-end gap-3 z-20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono text-[#4A505C] dark:text-zinc-400 hover:text-black dark:hover:text-white cursor-pointer min-h-[40px] flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="new-story-form"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-xs font-mono flex items-center gap-2 transition-all shadow-md cursor-pointer min-h-[40px] justify-center flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Broadcast Moment</span>
          </button>
        </div>
      </div>
    </div>
  );
};
