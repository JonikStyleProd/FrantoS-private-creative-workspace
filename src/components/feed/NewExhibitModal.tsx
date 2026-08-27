import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Layers, 
  Tag, 
  Palette, 
  Wrench, 
  Check, 
  AlertCircle,
  Clock,
  Eye
} from 'lucide-react';
import { ProjectExhibit, CreativeDiscipline, ProjectFormat, CreatorProfile } from '../../types';
import { CREATIVE_DISCIPLINES } from '../../data/mockData';
import { ImageUploader } from '../common/ImageUploader';

export interface NewExhibitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitExhibit?: (exhibit: ProjectExhibit) => void;
  onSaveExhibit?: (exhibit: ProjectExhibit) => void;
  activeProfile: CreatorProfile;
  initialExhibit?: ProjectExhibit | null;
  editingExhibit?: ProjectExhibit | null;
}

export const NewExhibitModal: React.FC<NewExhibitModalProps> = ({
  isOpen,
  onClose,
  onSubmitExhibit,
  onSaveExhibit,
  activeProfile,
  initialExhibit = null,
  editingExhibit = null,
}) => {
  const currentInitial = editingExhibit || initialExhibit;
  const isEditing = !!currentInitial;

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [discipline, setDiscipline] = useState<CreativeDiscipline>('3d');
  const [format, setFormat] = useState<ProjectFormat>('large-featured');
  const [coverImage, setCoverImage] = useState('');
  const [coverAlt, setCoverAlt] = useState('');
  const [description, setDescription] = useState('');
  const [processNotes, setProcessNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('3D, Shader, Spatial');
  const [toolsInput, setToolsInput] = useState('Blender, Octane Render, Three.js');
  const [colorPalette, setColorPalette] = useState<string[]>(['#06B6D4', '#F43F5E', '#10B981', '#11141A']);
  const [wipProgress, setWipProgress] = useState<number>(65);
  const [isWip, setIsWip] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (currentInitial) {
      setTitle(currentInitial.title);
      setSubtitle(currentInitial.subtitle);
      setDiscipline(currentInitial.discipline);
      setFormat(currentInitial.format);
      setCoverImage(currentInitial.coverImage);
      setCoverAlt(currentInitial.coverAlt || '');
      setDescription(currentInitial.description);
      setProcessNotes(currentInitial.processNotes || '');
      setTagsInput(currentInitial.tags.join(', '));
      setToolsInput(currentInitial.toolsUsed.join(', '));
      setColorPalette(currentInitial.colorPalette || ['#06B6D4', '#F43F5E', '#10B981', '#11141A']);
      setWipProgress(currentInitial.wipProgress || 60);
      setIsWip(currentInitial.format === 'wip-process' || (currentInitial.wipProgress !== undefined && currentInitial.wipProgress < 100));
    } else {
      // Defaults
      setTitle('');
      setSubtitle('');
      setDiscipline('3d');
      setFormat('large-featured');
      setCoverImage('');
      setCoverAlt('');
      setDescription('');
      setProcessNotes('');
      setTagsInput('3D, Shader, Spatial');
      setToolsInput('Blender, Octane Render, Three.js');
      setColorPalette(['#06B6D4', '#F43F5E', '#10B981', '#11141A']);
      setWipProgress(65);
      setIsWip(false);
    }
    setErrorMsg(null);
  }, [currentInitial, isOpen]);

  // Escape key close
  useEffect(() => {
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
    if (!title.trim()) {
      setErrorMsg('Project title is required.');
      return;
    }
    if (!coverImage.trim()) {
      setErrorMsg('Please select or upload a cover image.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const toolsUsed = toolsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const newExhibit: ProjectExhibit = {
      id: currentInitial ? currentInitial.id : `exhibit-user-${Date.now()}`,
      title: title.trim(),
      subtitle: subtitle.trim() || 'Experimental spatial artifact created in FrantoS Studio',
      discipline,
      format: isWip ? 'wip-process' : format,
      author: currentInitial?.author || {
        id: activeProfile?.id || 'profile-elena',
        name: activeProfile?.name || 'Elena Rostova',
        handle: activeProfile?.handle || '@elena_spatial',
        role: activeProfile?.role || 'Creative Director & Spatial Designer',
        avatar: activeProfile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      },
      coverImage,
      coverAlt: coverAlt.trim() || title.trim(),
      galleryImages: currentInitial?.galleryImages || [],
      tags: tags.length > 0 ? tags : [discipline, 'Spatial'],
      likesCount: currentInitial?.likesCount || 0,
      savesCount: currentInitial?.savesCount || 0,
      commentsCount: currentInitial?.commentsCount || 0,
      isLiked: currentInitial?.isLiked || false,
      isSaved: currentInitial?.isSaved || false,
      isUserCreated: true,
      wipProgress: isWip ? wipProgress : 100,
      year: currentInitial?.year || '2026',
      client: currentInitial?.client || 'FrantoS Studio Lab',
      description: description.trim() || 'A spatial design study pushing the boundaries of procedural geometry, lighting gradients, and tactile digital matter.',
      processNotes: processNotes.trim() || 'Generated with procedural mesh shaders, physical lighting models, and real-time GPU compute iterations.',
      colorPalette,
      typographySpec: currentInitial?.typographySpec || {
        headingFont: 'Syne (700)',
        bodyFont: 'JetBrains Mono (400)',
        scale: '1.333 Perfect Fourth',
      },
      toolsUsed: toolsUsed.length > 0 ? toolsUsed : ['Three.js', 'Blender', 'WebGL'],
      metrics: {
        renderTime: '60 FPS',
        polygons: '240K Poly',
        resolution: '4K Realtime',
      },
    };

    if (onSaveExhibit) {
      onSaveExhibit(newExhibit);
    } else if (onSubmitExhibit) {
      onSubmitExhibit(newExhibit);
    }
    onClose();
  };

  return (
    <div 
      id="new-exhibit-modal-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        id="new-exhibit-modal-container"
        className="relative w-full max-w-3xl rounded-3xl overflow-hidden bg-white dark:bg-[#0D0F14] border border-black/10 dark:border-white/15 text-[#111317] dark:text-white shadow-2xl my-auto max-h-[92vh] flex flex-col frantos-animated-frame"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-6 border-b border-black/10 dark:border-white/10 flex items-center justify-between bg-[#F8F7F4]/90 dark:bg-black/40 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg tracking-tight text-[#111317] dark:text-[#F3F1EC]">
                {isEditing ? 'Edit Creative Artifact' : 'Publish New Artifact'}
              </h3>
              <p className="text-xs text-[#4A505C] dark:text-zinc-400 font-mono">
                Author: {activeProfile?.name || 'Elena Rostova'} (Offline / Demo Mode Vault)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-8 overflow-y-auto space-y-6 flex-1">
          
          {/* Section 1: Image Upload / Cover */}
          <div>
            <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#4A505C] dark:text-zinc-400 mb-2">
              Artifact Media Upload (Device & Demo Mode) *
            </label>
            <ImageUploader
              initialImageUrl={coverImage}
              initialAlt={coverAlt}
              onImageUploaded={({ url, alt }) => {
                setCoverImage(url);
                if (alt) setCoverAlt(alt);
              }}
              onImageRemoved={() => {
                setCoverImage('');
                setCoverAlt('');
              }}
              aspectRatio="video"
              label="Select or drop cover image"
            />
          </div>

          {/* Section 2: Title & Subtitle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#4A505C] dark:text-zinc-400 mb-2">
                Project Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Kinetic Monolith 04"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm font-sans focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#4A505C] dark:text-zinc-400 mb-2">
                Subtitle / Thesis Line
              </label>
              <input
                type="text"
                placeholder="e.g. Spatial glass refraction experiments"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm font-sans focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Section 3: Discipline & Work Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#4A505C] dark:text-zinc-400 mb-2">
                Creative Discipline
              </label>
              <select
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value as CreativeDiscipline)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-mono focus:outline-none focus:border-cyan-500 cursor-pointer capitalize"
              >
                {CREATIVE_DISCIPLINES.map((d) => (
                  <option key={d.id} value={d.id} className="bg-white dark:bg-zinc-900 capitalize">
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#4A505C] dark:text-zinc-400 mb-2">
                Format / Grid Layout
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as ProjectFormat)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="large-featured" className="bg-white dark:bg-zinc-900">Large Featured</option>
                <option value="cinematic-portrait" className="bg-white dark:bg-zinc-900">Cinematic Portrait</option>
                <option value="horizontal-editorial" className="bg-white dark:bg-zinc-900">Horizontal Editorial</option>
                <option value="layered-glass" className="bg-white dark:bg-zinc-900">Layered Glass</option>
                <option value="compact-archive" className="bg-white dark:bg-zinc-900">Compact Archive</option>
                <option value="wip-process" className="bg-white dark:bg-zinc-900">WIP Process Card</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#4A505C] dark:text-zinc-400 mb-2">
                WIP / Production Stage
              </label>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isWipCheckbox"
                  checked={isWip}
                  onChange={(e) => setIsWip(e.target.checked)}
                  className="rounded border-black/20 text-cyan-500 focus:ring-cyan-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="isWipCheckbox" className="text-xs font-mono cursor-pointer">
                  Mark as WIP ({wipProgress}%)
                </label>
              </div>
            </div>
          </div>

          {/* WIP Progress slider if marked as WIP */}
          {isWip && (
            <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-cyan-700 dark:text-cyan-300 font-semibold">Sprint Progress</span>
                <span className="font-bold">{wipProgress}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="95"
                step="5"
                value={wipProgress}
                onChange={(e) => setWipProgress(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>
          )}

          {/* Section 4: Description */}
          <div>
            <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#4A505C] dark:text-zinc-400 mb-2">
              Project Description & Spatial Thesis
            </label>
            <textarea
              rows={3}
              placeholder="Describe the aesthetic direction, spatial narrative, and context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-sans focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          {/* Section 5: Process Notes */}
          <div>
            <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#4A505C] dark:text-zinc-400 mb-2">
              Technical Process Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Rendered with custom procedural volumetric noise, Octane ACES color space..."
              value={processNotes}
              onChange={(e) => setProcessNotes(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-mono focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          {/* Section 6: Tags & Software Tools */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#4A505C] dark:text-zinc-400 mb-2">
                Tags (Comma separated)
              </label>
              <input
                type="text"
                placeholder="3D, Refraction, Monolith, Unreal"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#4A505C] dark:text-zinc-400 mb-2">
                Software & Engine Stack
              </label>
              <input
                type="text"
                placeholder="Three.js, Blender, Houdini"
                value={toolsInput}
                onChange={(e) => setToolsInput(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Section 7: Spectral Color Palette */}
          <div>
            <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#4A505C] dark:text-zinc-400 mb-2">
              Spectral Palette Hex Codes
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {colorPalette.map((col, idx) => (
                <div key={idx} className="flex items-center gap-2 p-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
                  <input
                    type="color"
                    value={col}
                    onChange={(e) => {
                      const updated = [...colorPalette];
                      updated[idx] = e.target.value;
                      setColorPalette(updated);
                    }}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={col}
                    onChange={(e) => {
                      const updated = [...colorPalette];
                      updated[idx] = e.target.value;
                      setColorPalette(updated);
                    }}
                    className="w-20 text-[11px] font-mono bg-transparent focus:outline-none uppercase"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-black/10 dark:border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs font-mono transition-all shadow-md cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'Save Changes' : 'Publish Exhibit to Vault'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
