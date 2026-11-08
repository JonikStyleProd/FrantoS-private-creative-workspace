import React, { useState, useEffect } from 'react';
import { Story, StoryType, CreativeDiscipline, CreatorProfile } from '../../types';
import { X, Sparkles, Send, Check, AlertCircle } from 'lucide-react';
import { CREATIVE_DISCIPLINES } from '../../data/mockData';
import { ImageUploader } from '../common/ImageUploader';
import { useLanguage } from '../../i18n/LanguageContext';

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
  const { t, language } = useLanguage();
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [discipline, setDiscipline] = useState<CreativeDiscipline>('3d');
  const [type, setType] = useState<StoryType>('wip');
  const [imageUrl, setImageUrl] = useState('/series/after-hours/promenade-sm.webp');
  const [imageAlt, setImageAlt] = useState(language === 'ru' ? 'Снимок студийного рендера' : 'Studio render snapshot');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sampleImages = [
    '/series/after-hours/kiosk-sm.webp',
    '/series/after-hours/promenade-sm.webp',
    '/series/after-hours/reflections-sm.webp',
    '/series/after-hours/dawn-sm.webp',
  ];

  // Lock background scroll, handle Escape and Android Back
  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!title.trim()) {
      setErrorMsg(language === 'ru' ? 'Введите название момента процесса' : 'Please enter moment title');
      return;
    }
    if (!imageUrl.trim()) {
      setErrorMsg(language === 'ru' ? 'Выберите или загрузите изображение' : 'Please select or upload visual snapshot');
      return;
    }

    setIsSubmitting(true);

    const newStory: Story = {
      id: `story-${Date.now()}`,
      author: {
        id: activeProfile?.id || 'profile-elena',
        name: activeProfile?.name || 'Елена Ростова',
        handle: activeProfile?.handle || '@elena_spatial',
        avatar: activeProfile?.avatar || '/images/avatar1.jpg',
        role: activeProfile?.role || 'Арт-директор и пространственный дизайнер',
      },
      discipline,
      type,
      title: title.trim(),
      previewImage: imageUrl,
      mediaUrl: imageUrl,
      caption: caption.trim() || (language === 'ru' ? 'Студийный снимок процесса.' : 'Studio process snapshot.'),
      timestamp: t.common.justNow,
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
      className="fixed inset-0 z-50 overflow-hidden bg-black/85 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-story-modal-title"
    >
      <div 
        id="new-story-modal-container"
        className="relative w-full max-w-lg rounded-3xl overflow-hidden bg-[#0A0C10] border border-white/10 text-[#F5F3EF] shadow-2xl my-auto max-h-[92dvh] sm:max-h-[88dvh] flex flex-col min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* FIXED MODAL HEADER */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-b border-white/8 flex items-center justify-between bg-[#0E1015]/95 backdrop-blur-md sticky top-0 z-30 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-ultramarine animate-pulse flex-shrink-0" />
            <div className="min-w-0">
              <h3 id="new-story-modal-title" className="font-display font-bold text-sm sm:text-base text-[#F5F3EF] truncate">
                {t.modals.newStoryTitle}
              </h3>
              <p className="text-[10px] text-[#A3A099] font-mono truncate">
                {language === 'ru' ? 'Автор:' : 'Author:'} {activeProfile?.name || 'Елена Ростова'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/15 text-[#A3A099] hover:text-white transition-all cursor-pointer flex items-center justify-center flex-shrink-0 touch-manipulation"
            aria-label={t.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SCROLLABLE FORM BODY */}
        <form 
          id="new-story-form"
          onSubmit={handleSubmit} 
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 w-full p-4 sm:p-6 space-y-4"
        >
          {errorMsg && (
            <div className="w-full p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 min-w-0">{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Process Visual Upload */}
          <div className="w-full min-w-0">
            <label className="block text-xs font-mono text-[#A3A099] mb-1.5 uppercase font-semibold">
              {t.modals.storySnapshotLabel}
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
              label={language === 'ru' ? 'Загрузить или выбрать снимок' : 'Upload or select snapshot'}
              aspectRatio="video"
              showAltInput={false}
            />
          </div>

          {/* Preset Alternatives */}
          <div className="w-full min-w-0">
            <span className="text-[10px] font-mono text-[#A3A099] block mb-1.5">
              {language === 'ru' ? 'Или выбрать из студийных материалов:' : 'Or choose from studio presets:'}
            </span>
            <div className="grid grid-cols-4 gap-2 w-full min-w-0">
              {sampleImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setImageUrl(img)}
                  className={`relative w-full aspect-video rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    imageUrl === img 
                      ? 'border-ultramarine scale-105 shadow-md' 
                      : 'border-white/10 opacity-70 hover:opacity-100'
                  }`}
                  aria-label={`Preset ${idx + 1}`}
                >
                  <img src={img} alt="Preset" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Discipline Selector */}
          <div className="w-full min-w-0">
            <label className="block text-xs font-mono text-[#A3A099] mb-1.5 uppercase font-semibold">
              {t.modals.disciplineLabel}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full min-w-0">
              {CREATIVE_DISCIPLINES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDiscipline(d.id as CreativeDiscipline)}
                  className={`p-2.5 rounded-xl text-xs font-mono border transition-colors cursor-pointer min-h-[44px] flex items-center justify-center text-center touch-manipulation ${
                    discipline === d.id
                      ? 'bg-ultramarine text-white font-bold shadow-md shadow-ultramarine/25 border-ultramarine'
                      : 'bg-white/5 border-white/8 text-[#A3A099] hover:text-white'
                  }`}
                >
                  <span className="truncate">{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Moment Archetype */}
          <div className="w-full min-w-0">
            <label className="block text-xs font-mono text-[#A3A099] mb-1.5 uppercase font-semibold">
              {t.modals.storyArchetypeLabel}
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as StoryType)}
              className="w-full px-3.5 py-3 rounded-xl bg-[#12151C] border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-ultramarine cursor-pointer min-h-[44px]"
            >
              <option value="wip" className="bg-[#12151C] text-white">
                {language === 'ru' ? 'В процессе разработки (WIP)' : 'Active WIP Sprint'}
              </option>
              <option value="sketch" className="bg-[#12151C] text-white">
                {language === 'ru' ? 'Концептуальный эскиз' : 'Concept Sketch'}
              </option>
              <option value="process" className="bg-[#12151C] text-white">
                {language === 'ru' ? 'Шейдер / Физика процесса' : 'Shader / Process Physics'}
              </option>
              <option value="inspiration" className="bg-[#12151C] text-white">
                {language === 'ru' ? 'Студийное вдохновение' : 'Studio Inspiration'}
              </option>
              <option value="studio_note" className="bg-[#12151C] text-white">
                {language === 'ru' ? 'Заметка в рабочий журнал' : 'Logbook Note'}
              </option>
              <option value="behind_the_scenes" className="bg-[#12151C] text-white">
                {language === 'ru' ? 'За кадром' : 'Behind the Scenes'}
              </option>
            </select>
          </div>

          {/* Title */}
          <div className="w-full min-w-0">
            <label className="block text-xs font-mono text-[#A3A099] mb-1.5 uppercase font-semibold">
              {t.modals.storyTitleLabel}
            </label>
            <input
              type="text"
              placeholder={language === 'ru' ? 'Например: Тест подповерхностного рассеивания кварца...' : 'e.g. Subsurface silica refraction test...'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3.5 py-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-ultramarine font-sans min-h-[44px]"
            />
          </div>

          {/* Caption */}
          <div className="w-full min-w-0">
            <label className="block text-xs font-mono text-[#A3A099] mb-1.5 uppercase font-semibold">
              {t.modals.storyNotesLabel}
            </label>
            <textarea
              placeholder={language === 'ru' ? 'Краткое описание эксперимента с материалом или техническое наблюдение...' : 'Brief note on material test or technical observation...'}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-ultramarine font-sans resize-none"
            />
          </div>
        </form>

        {/* FIXED MODAL FOOTER */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3.5 border-t border-white/8 bg-[#0E1015]/95 backdrop-blur-md flex items-center justify-between sm:justify-end gap-3 z-20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono text-[#A3A099] hover:text-white cursor-pointer min-h-[44px] flex items-center justify-center transition-colors touch-manipulation"
          >
            {t.modals.cancelBtn}
          </button>
          <button
            type="submit"
            form="new-story-form"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-full bg-ultramarine hover:bg-ultramarine/90 disabled:opacity-50 text-white font-bold text-xs font-mono flex items-center gap-2 transition-all shadow-md cursor-pointer min-h-[44px] justify-center flex-shrink-0 touch-manipulation"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{t.modals.storyPublishBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
