import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  AlertCircle,
  Eye,
  Sliders,
  FileText,
  Palette,
  ArrowRight,
  ArrowLeft,
  Image as ImageIcon
} from 'lucide-react';
import { ProjectExhibit, CreativeDiscipline, ProjectFormat, CreatorProfile } from '../../types';
import { CREATIVE_DISCIPLINES } from '../../data/mockData';
import { ImageUploader } from '../common/ImageUploader';
import { useLanguage } from '../../i18n/LanguageContext';

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
  const { t, language } = useLanguage();
  const currentInitial = editingExhibit || initialExhibit;
  const isEditing = !!currentInitial;

  // 3 Clear Steps for Mobile & Desktop Inspector: 'media' | 'params' | 'confirm'
  const [activeStep, setActiveStep] = useState<'media' | 'params' | 'confirm'>('media');

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [discipline, setDiscipline] = useState<CreativeDiscipline>('3d');
  const [format, setFormat] = useState<ProjectFormat>('large-featured');
  const [coverImage, setCoverImage] = useState('/series/after-hours/kiosk-sm.webp');
  const [coverAlt, setCoverAlt] = useState('');
  const [description, setDescription] = useState('');
  const [processNotes, setProcessNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('3D, Шейдеры, Пространство');
  const [toolsInput, setToolsInput] = useState('Blender, Octane Render, Three.js');
  const [colorPalette, setColorPalette] = useState<string[]>(['#386BF6', '#0E1015', '#F5F3EF', '#10B981']);
  const [wipProgress, setWipProgress] = useState<number>(65);
  const [publicationState, setPublicationState] = useState<'draft' | 'wip' | 'finished'>('finished');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setColorPalette(currentInitial.colorPalette || ['#386BF6', '#0E1015', '#F5F3EF', '#10B981']);
      setWipProgress(currentInitial.wipProgress || 60);
      setPublicationState(
        currentInitial.format === 'wip-process' || (currentInitial.wipProgress !== undefined && currentInitial.wipProgress < 100)
          ? 'wip'
          : 'finished'
      );
    } else {
      setTitle('');
      setSubtitle('');
      setDiscipline('3d');
      setFormat('large-featured');
      setCoverImage('/series/after-hours/kiosk-sm.webp');
      setCoverAlt('');
      setDescription('');
      setProcessNotes('');
      setTagsInput('3D, Шейдеры, Пространство');
      setToolsInput('Blender, Octane Render, Three.js');
      setColorPalette(['#386BF6', '#0E1015', '#F5F3EF', '#10B981']);
      setWipProgress(65);
      setPublicationState('finished');
    }
    setActiveStep('media');
    setErrorMsg(null);
  }, [currentInitial, isOpen]);

  // Body scroll lock & Escape key
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

  const handleSubmit = (asDraft = false) => {
    if (isSubmitting) return;

    if (!title.trim()) {
      setErrorMsg(t.common.errorRequiredTitle);
      setActiveStep('params');
      return;
    }
    if (!coverImage.trim()) {
      setErrorMsg(t.common.errorRequiredMedia);
      setActiveStep('media');
      return;
    }

    setIsSubmitting(true);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const toolsUsed = toolsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const isWipMode = publicationState === 'wip';
    const finalWipProgress = asDraft ? 25 : isWipMode ? wipProgress : 100;

    const newExhibit: ProjectExhibit = {
      id: currentInitial ? currentInitial.id : `exhibit-user-${Date.now()}`,
      title: title.trim(),
      subtitle: subtitle.trim() || (language === 'ru' ? 'Пространственное исследование студии FrantoS' : 'Spatial exploration by FrantoS Atelier'),
      discipline,
      format: isWipMode || asDraft ? 'wip-process' : format,
      author: currentInitial?.author || {
        id: activeProfile?.id || 'profile-elena',
        name: activeProfile?.name || 'Елена Ростова',
        handle: activeProfile?.handle || '@elena_spatial',
        role: activeProfile?.role || 'Арт-директор и пространственный дизайнер',
        avatar: activeProfile?.avatar || '/images/avatar1.jpg',
      },
      coverImage,
      coverAlt: coverAlt.trim() || title.trim(),
      galleryImages: currentInitial?.galleryImages || [],
      tags: tags.length > 0 ? tags : [discipline, 'Atelier'],
      likesCount: currentInitial?.likesCount || 0,
      savesCount: currentInitial?.savesCount || 0,
      commentsCount: currentInitial?.commentsCount || 0,
      isLiked: currentInitial?.isLiked || false,
      isSaved: currentInitial?.isSaved || false,
      isUserCreated: true,
      wipProgress: finalWipProgress,
      year: currentInitial?.year || '2026',
      client: currentInitial?.client || 'FrantoS Studio Lab',
      description: description.trim() || (language === 'ru' ? 'Исследование формы, преломления света и тактильных цифровых материалов.' : 'Exploration of form finding, light refraction, and digital materials.'),
      processNotes: processNotes.trim() || (language === 'ru' ? 'Процедурные шейдеры и реальное время GPU.' : 'Procedural shaders and GPU realtime pipeline.'),
      colorPalette,
      typographySpec: currentInitial?.typographySpec || {
        headingFont: 'Syne (700)',
        bodyFont: 'JetBrains Mono (400)',
        scale: '1.333',
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
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div 
      id="new-exhibit-modal-overlay"
      className="fixed inset-0 z-50 overflow-hidden bg-black/85 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-exhibit-modal-title"
    >
      <div 
        id="new-exhibit-modal-container"
        className="relative w-full max-w-6xl rounded-3xl overflow-hidden bg-[#0A0C10] border border-black/15 dark:border-white/12 text-[#F5F3EF] shadow-2xl my-auto max-h-[96dvh] sm:max-h-[92dvh] flex flex-col min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header Bar */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between bg-[#0E1015]/95 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-ultramarine animate-pulse flex-shrink-0" />
            <div className="min-w-0">
              <h3 id="new-exhibit-modal-title" className="font-display font-bold text-base sm:text-lg tracking-tight text-[#F5F3EF] truncate">
                {isEditing ? t.modals.editExhibitTitle : t.modals.newExhibitTitle}
              </h3>
              <p className="text-[11px] text-[#A3A099] font-mono truncate">
                {language === 'ru' ? 'Арт-директор:' : 'Art Director:'} {activeProfile?.name || 'Елена Ростова'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all cursor-pointer flex items-center justify-center flex-shrink-0 touch-manipulation"
            aria-label={t.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Step Wizard Navigation for Mobile / Segmented Bar */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-2.5 border-b border-white/8 bg-[#07080B] flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2">
            {[
              { id: 'media', stepNum: '1', label: t.modals.stepMedia },
              { id: 'params', stepNum: '2', label: t.modals.stepParams },
              { id: 'confirm', stepNum: '3', label: t.modals.stepConfirm },
            ].map((st) => {
              const isActive = activeStep === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setActiveStep(st.id as any)}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer touch-manipulation whitespace-nowrap ${
                    isActive
                      ? 'bg-ultramarine text-white shadow-md shadow-ultramarine/25 font-bold'
                      : 'text-[#A3A099] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${isActive ? 'bg-white text-ultramarine font-bold' : 'bg-white/10 text-white'}`}>
                    {st.stepNum}
                  </span>
                  <span>{st.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Step Indicators */}
          <span className="hidden md:inline font-mono text-[11px] text-ultramarine font-semibold">
            {activeStep === 'media' && (language === 'ru' ? 'Шаг 1 из 3' : 'Step 1 of 3')}
            {activeStep === 'params' && (language === 'ru' ? 'Шаг 2 из 3' : 'Step 2 of 3')}
            {activeStep === 'confirm' && (language === 'ru' ? 'Шаг 3 из 3: Финальный просмотр' : 'Step 3 of 3: Final Delivery')}
          </span>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}

        {/* Desktop Split View: Dominant Live Preview on Left + Parameters on Right */}
        <div className="flex-1 overflow-y-auto min-h-0 w-full p-4 sm:p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT / CENTER (Dominant Live Plate Preview, cols 7) */}
            <div className={`lg:col-span-7 space-y-4 ${activeStep === 'params' ? 'hidden lg:block' : ''}`}>
              <div className="flex items-center justify-between text-xs font-mono text-[#A3A099]">
                <span className="uppercase tracking-widest font-semibold flex items-center gap-2 text-ultramarine">
                  <Eye className="w-3.5 h-3.5" /> {t.modals.livePreviewBadge}
                </span>
                <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded">
                  {publicationState === 'finished' ? t.modals.stateFinished : publicationState === 'wip' ? `${t.modals.stateWip} (${wipProgress}%)` : t.modals.stateDraft}
                </span>
              </div>

              {/* The Unboxed Exhibit Plate as it appears in the atelier catalog */}
              <div className="group rounded-3xl bg-[#0E1015] border border-white/10 overflow-hidden shadow-2xl p-4 sm:p-5 transition-all">
                {/* Visual Cover */}
                <div className="relative aspect-[16/10] sm:aspect-video rounded-2xl overflow-hidden bg-black/60 border border-white/5">
                  <img
                    src={coverImage || '/series/after-hours/kiosk-sm.webp'}
                    alt={coverAlt || title || (language === 'ru' ? 'Превью проекта' : 'Project Preview')}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Discipline Badge */}
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-[10px] font-mono uppercase font-bold text-ultramarine">
                    {CREATIVE_DISCIPLINES.find((d) => d.id === discipline)?.label || discipline}
                  </div>

                  {/* WIP Progress Bar */}
                  {publicationState === 'wip' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                      <div className="h-full bg-ultramarine" style={{ width: `${wipProgress}%` }} />
                    </div>
                  )}
                </div>

                {/* Editorial Caption Directly Under Artwork (No Card-in-Card nesting) */}
                <div className="pt-4 space-y-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <h4 className="font-display font-bold text-lg sm:text-xl text-[#F5F3EF] tracking-tight leading-snug">
                      {title || (language === 'ru' ? 'Без названия' : 'Untitled Project')}
                    </h4>
                    <span className="font-mono text-xs text-[#A3A099] flex-shrink-0">
                      2026
                    </span>
                  </div>

                  <p className="text-xs text-[#A3A099] line-clamp-2 leading-relaxed">
                    {subtitle || description || (language === 'ru' ? 'Описание проекта пока не заполнено.' : 'Project concept not specified yet.')}
                  </p>

                  {/* Metadata Row: Author & Tags */}
                  <div className="pt-2 flex items-center justify-between border-t border-white/5 text-[11px] font-mono text-[#A3A099]">
                    <div className="flex items-center gap-2">
                      <img
                        src={activeProfile?.avatar || '/images/avatar1.jpg'}
                        alt={activeProfile?.name || 'Author'}
                        className="w-5 h-5 rounded-full object-cover ring-1 ring-ultramarine/40"
                      />
                      <span>{activeProfile?.name || 'Елена Ростова'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {tagsInput.split(',').slice(0, 2).map((t, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-white/70">
                          #{t.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: Inspector & Parameters (cols 5) */}
            <div className={`lg:col-span-5 space-y-6 ${activeStep === 'confirm' ? 'hidden lg:block' : ''}`}>
              
              {/* STEP 1: MEDIA UPLOAD */}
              {activeStep === 'media' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#A3A099] mb-2">
                      {t.modals.coverVisualLabel}
                    </label>
                    <ImageUploader
                      initialImageUrl={coverImage}
                      initialAlt={coverAlt}
                      onImageUploaded={({ url, alt }) => {
                        setCoverImage(url);
                        if (alt) setCoverAlt(alt);
                      }}
                      onImageRemoved={() => {
                        setCoverImage('/series/after-hours/kiosk-sm.webp');
                        setCoverAlt('');
                      }}
                      aspectRatio="video"
                      label={language === 'ru' ? 'Загрузить или выбрать файл обложки' : 'Upload or select cover visual'}
                    />
                  </div>

                  {/* Quick Preset Selector for Studio Archetypes */}
                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#A3A099] mb-2">
                      {t.modals.coverPresetLabel}
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {['/series/after-hours/kiosk-sm.webp', '/series/after-hours/promenade-sm.webp', '/series/after-hours/reflections-sm.webp', '/series/after-hours/dawn-sm.webp'].map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCoverImage(img)}
                          className={`aspect-video rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                            coverImage === img ? 'border-ultramarine scale-105 shadow-md' : 'border-white/10 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt={`Asset ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={() => setActiveStep('params')}
                      className="w-full min-h-[48px] py-3 rounded-xl bg-ultramarine hover:bg-ultramarine/90 text-white font-mono text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                    >
                      <span>{t.modals.nextParamsBtn}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: PARAMETERS & CONCEPT */}
              {activeStep === 'params' && (
                <div className="space-y-4">
                  {/* Pipeline Status */}
                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#A3A099] mb-2">
                      {t.modals.stateLabel}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'draft', label: t.modals.stateDraft, desc: t.modals.stateDraftDesc },
                        { id: 'wip', label: t.modals.stateWip, desc: t.modals.stateWipDesc },
                        { id: 'finished', label: t.modals.stateFinished, desc: t.modals.stateFinishedDesc },
                      ].map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setPublicationState(st.id as any)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer touch-manipulation ${
                            publicationState === st.id
                              ? 'bg-ultramarine/20 border-ultramarine text-white shadow-xs'
                              : 'bg-white/5 border-white/8 text-[#A3A099] hover:border-white/20'
                          }`}
                        >
                          <span className="text-xs font-bold block">{st.label}</span>
                          <span className="text-[10px] font-mono block opacity-60">{st.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {publicationState === 'wip' && (
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/8 space-y-2">
                      <div className="flex justify-between text-xs font-mono text-[#A3A099]">
                        <span>{t.modals.sprintProgress}</span>
                        <span className="text-ultramarine font-bold">{wipProgress}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="90"
                        step="5"
                        value={wipProgress}
                        onChange={(e) => setWipProgress(Number(e.target.value))}
                        className="w-full accent-ultramarine cursor-pointer min-h-[36px]"
                      />
                    </div>
                  )}

                  {/* Title & Subtitle */}
                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#A3A099] mb-1.5">
                      {t.modals.projectTitle}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={language === 'ru' ? 'Например: Кинетический Монолит 04' : 'e.g. Kinetic Monolith 04'}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-ultramarine font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#A3A099] mb-1.5">
                      {t.modals.projectSubtitle}
                    </label>
                    <input
                      type="text"
                      placeholder={language === 'ru' ? 'Например: Пространственные эксперименты со стеклом' : 'e.g. Spatial refraction tests with optical silica'}
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-ultramarine font-sans"
                    />
                  </div>

                  {/* Discipline */}
                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#A3A099] mb-1.5">
                      {t.modals.disciplineLabel}
                    </label>
                    <select
                      value={discipline}
                      onChange={(e) => setDiscipline(e.target.value as CreativeDiscipline)}
                      className="w-full px-3.5 py-3 rounded-xl bg-[#12151C] border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-ultramarine cursor-pointer"
                    >
                      {CREATIVE_DISCIPLINES.map((d) => (
                        <option key={d.id} value={d.id} className="bg-[#12151C] text-white">
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#A3A099] mb-1.5">
                      {t.modals.descriptionLabel}
                    </label>
                    <textarea
                      rows={3}
                      placeholder={language === 'ru' ? 'Опишите художественное направление и контекст...' : 'Describe artistic direction, thesis, and context...'}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-sans text-white focus:outline-none focus:border-ultramarine resize-none"
                    />
                  </div>

                  {/* Tags & Tools */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-[#A3A099] mb-1">
                        {t.modals.tagsLabel}
                      </label>
                      <input
                        type="text"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-ultramarine"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-[#A3A099] mb-1">
                        {t.modals.toolsLabel}
                      </label>
                      <input
                        type="text"
                        value={toolsInput}
                        onChange={(e) => setToolsInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-ultramarine"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setActiveStep('media')}
                      className="min-h-[44px] px-4 py-2.5 rounded-xl border border-white/10 text-xs font-mono text-[#A3A099] hover:text-white cursor-pointer touch-manipulation flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{t.modals.backBtn}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveStep('confirm')}
                      className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-ultramarine hover:bg-ultramarine/90 text-white font-mono text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                    >
                      <span>{t.modals.nextConfirmBtn}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: CONFIRMATION & PUBLISH */}
              {activeStep === 'confirm' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/8 space-y-3">
                    <h5 className="font-mono text-xs uppercase tracking-wider text-ultramarine font-bold">
                      {t.modals.passportTitle}
                    </h5>
                    <div className="space-y-2 text-xs font-mono text-[#A3A099]">
                      <div className="flex justify-between">
                        <span>{language === 'ru' ? 'Название:' : 'Title:'}</span>
                        <span className="text-white font-semibold">{title || (language === 'ru' ? 'Не указано' : 'Not specified')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{language === 'ru' ? 'Дисциплина:' : 'Discipline:'}</span>
                        <span className="text-ultramarine font-semibold">{discipline}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{language === 'ru' ? 'Статус:' : 'Status:'}</span>
                        <span className="text-emerald-400 font-semibold">
                          {publicationState === 'finished' ? t.modals.stateFinished : t.modals.stateWip}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{language === 'ru' ? 'Автор:' : 'Author:'}</span>
                        <span className="text-white">{activeProfile?.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => handleSubmit(false)}
                      disabled={isSubmitting}
                      className="w-full min-h-[48px] py-3 rounded-full bg-ultramarine hover:bg-ultramarine/90 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-ultramarine/25 flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-98"
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>{isEditing ? t.modals.saveChangesBtn : t.modals.publishBtn}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSubmit(true)}
                      disabled={isSubmitting}
                      className="w-full min-h-[44px] py-2.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 font-mono text-xs cursor-pointer touch-manipulation"
                    >
                      {t.modals.saveDraftBtn}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fixed Footer with Step Controls */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3.5 border-t border-white/8 bg-[#0E1015]/95 backdrop-blur-md flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-mono text-[#A3A099] hover:text-white cursor-pointer touch-manipulation min-h-[44px]"
          >
            {t.modals.cancelBtn}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-full bg-ultramarine hover:bg-ultramarine/90 text-white font-mono text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px]"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">{isEditing ? t.modals.saveChangesBtn : t.modals.publishBtn}</span>
              <span className="sm:hidden">{isEditing ? t.common.save : (language === 'ru' ? 'Сдать проект' : 'Publish')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
