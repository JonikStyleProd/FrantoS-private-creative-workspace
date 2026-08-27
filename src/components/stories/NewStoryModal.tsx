import React, { useState } from 'react';
import { Story, StoryType, CreativeDiscipline, CreatorProfile } from '../../types';
import { X, Sparkles, Send, Check } from 'lucide-react';
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

  const sampleImages = [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
  ];

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newStory: Story = {
      id: `story-${Date.now()}`,
      author: {
        id: activeProfile.id,
        name: activeProfile.name,
        handle: activeProfile.handle,
        avatar: activeProfile.avatar,
        role: activeProfile.role,
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
    onClose();
  };

  return (
    <div 
      id="new-story-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#0F1218] border border-black/10 dark:border-white/15 p-6 text-[#111317] dark:text-white shadow-2xl space-y-5 frantos-animated-frame"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h3 className="font-display font-bold text-lg text-[#111317] dark:text-[#F3F1EC]">
              Broadcast Process Moment
            </h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Real Photo Upload with Demo Support */}
          <div>
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
              label="Process Visual / Snapshot"
              aspectRatio="video"
              showAltInput={false}
            />
          </div>

          {/* Preset Alternatives */}
          <div>
            <span className="text-[10px] font-mono text-zinc-500 block mb-1.5">Or select a studio render preset:</span>
            <div className="flex items-center gap-2">
              {sampleImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setImageUrl(img)}
                  className={`relative w-14 h-10 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    imageUrl === img ? 'border-cyan-500 scale-105 shadow-md' : 'border-black/10 dark:border-white/10 opacity-70'
                  }`}
                >
                  <img src={img} alt="Preset" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Discipline Selector */}
          <div>
            <label className="block text-xs font-mono text-[#4A505C] dark:text-zinc-400 mb-1.5 uppercase font-semibold">
              Creative Discipline
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CREATIVE_DISCIPLINES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDiscipline(d.id as CreativeDiscipline)}
                  className={`p-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                    discipline === d.id
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-700 dark:text-cyan-300 font-bold'
                      : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/5 text-[#4A505C] dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-white/10'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Moment Type */}
          <div>
            <label className="block text-xs font-mono text-[#4A505C] dark:text-zinc-400 mb-1.5 uppercase font-semibold">
              Moment Archetype
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as StoryType)}
              className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#111317] dark:text-white focus:outline-none focus:border-cyan-500 font-medium"
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
          <div>
            <label className="block text-xs font-mono text-[#4A505C] dark:text-zinc-400 mb-1.5 uppercase font-semibold">
              Moment Title
            </label>
            <input
              type="text"
              placeholder="e.g. Subsurface caustics test on silica crystal..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#111317] dark:text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          {/* Caption */}
          <div>
            <label className="block text-xs font-mono text-[#4A505C] dark:text-zinc-400 mb-1.5 uppercase font-semibold">
              Notes & Parameters
            </label>
            <textarea
              placeholder="Brief description of the material experiment or technical insight..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#111317] dark:text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          {/* Submit */}
          <div className="pt-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-[#4A505C] dark:text-zinc-400 hover:text-black dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Broadcast Moment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
