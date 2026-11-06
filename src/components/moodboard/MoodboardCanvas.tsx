import React, { useState } from 'react';
import { MoodboardItem, CreativeDiscipline } from '../../types';
import { 
  Plus, 
  RotateCw, 
  Trash2, 
  Sparkles, 
  X, 
  Copy, 
  Check, 
  Sliders,
  Layers,
  Palette,
  FileText,
  Image as ImageIcon,
  RotateCcw
} from 'lucide-react';
import { CREATIVE_DISCIPLINES } from '../../data/mockData';
import { ImageUploader } from '../common/ImageUploader';
import { useLanguage } from '../../i18n/LanguageContext';

interface MoodboardCanvasProps {
  items: MoodboardItem[];
  onUpdateItems: (items: MoodboardItem[]) => void;
}

export const MoodboardCanvas: React.FC<MoodboardCanvasProps> = ({ items, onUpdateItems }) => {
  const { t, language } = useLanguage();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [copiedHex, setCopiedHex] = useState(false);

  // New Pin Form state
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'image' | 'color' | 'note' | 'material'>('image');
  const [newContent, setNewContent] = useState('');
  const [newTag, setNewTag] = useState('Спатиальный материал');
  const [newDiscipline, setNewDiscipline] = useState<CreativeDiscipline>('3d');
  const [uploadedImageUrl, setUploadedImageUrl] = useState(
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'
  );

  const selectedItem = items.find((it) => it.id === selectedItemId) || null;

  const handleSelectItem = (id: string) => {
    setSelectedItemId(id);
    setIsMobileSheetOpen(true);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    let finalContent = newContent;
    if (newType === 'image') {
      finalContent = uploadedImageUrl || newContent || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
    } else if (newType === 'color') {
      finalContent = newContent || '#386BF6';
    } else {
      finalContent = newContent || 'Заметка о пространственной композиции и преломлении.';
    }

    const newItem: MoodboardItem = {
      id: `mb-${Date.now()}`,
      title: newTitle.trim(),
      type: newType,
      content: finalContent,
      tag: newTag || 'Материал',
      discipline: newDiscipline,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 150,
      width: newType === 'color' ? 220 : 280,
      height: newType === 'color' ? 160 : 240,
      zIndex: items.length + 1,
      rotation: Math.floor(Math.random() * 6) - 3,
    };

    onUpdateItems([...items, newItem]);
    setNewTitle('');
    setNewContent('');
    setIsAddingCard(false);
  };

  const handleDeleteItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onUpdateItems(items.filter((item) => item.id !== id));
    if (selectedItemId === id) {
      setSelectedItemId(null);
      setIsMobileSheetOpen(false);
    }
  };

  const handleRotate = (id: string, deg = 15, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onUpdateItems(
      items.map((it) => (it.id === id ? { ...it, rotation: ((it.rotation || 0) + deg) % 360 } : it))
    );
  };

  const handleAdjustZIndex = (id: string, delta: number) => {
    onUpdateItems(
      items.map((it) => (it.id === id ? { ...it, zIndex: Math.max(1, (it.zIndex || 1) + delta) } : it))
    );
  };

  const handleCopyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHex(true);
    setTimeout(() => setCopiedHex(false), 2000);
  };

  return (
    <section 
      id="frantos-moodboard-atelier"
      className="relative w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-4 select-none"
      aria-label="Atelier Moodboard & Material Field"
    >
      {/* Masthead Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-ultramarine animate-ping" />
            <span className="font-mono text-xs uppercase tracking-wider text-ultramarine font-semibold">
              {t.moodboard.badge}
            </span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-display font-extrabold tracking-tight text-[#121316] dark:text-[#F5F3EF]">
            {t.moodboard.title}
          </h2>
          <p className="text-xs sm:text-sm text-[#52555F] dark:text-[#A3A099] max-w-xl mt-0.5">
            {t.moodboard.subtitle}
          </p>
        </div>

        {/* Action Button: Add New Pin */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsAddingCard(!isAddingCard)}
            className="min-h-[44px] px-5 py-2.5 rounded-full font-mono text-xs font-semibold bg-ultramarine hover:bg-blue-600 text-white flex items-center gap-2 transition-all shadow-md shadow-ultramarine/25 cursor-pointer touch-target"
          >
            <Plus className="w-4 h-4" />
            <span>{isAddingCard ? (language === 'ru' ? 'Закрыть панель' : 'Close Panel') : t.moodboard.addNote}</span>
          </button>
        </div>
      </div>

      {/* Adding Pin Form Dropdown */}
      {isAddingCard && (
        <div className="mb-6 p-4 sm:p-6 rounded-3xl bg-white dark:bg-[#0E1015] border border-ultramarine/30 shadow-2xl animate-in zoom-in-95 duration-200 text-[#121316] dark:text-[#F5F3EF]">
          <div className="flex items-center justify-between pb-3 border-b border-black/8 dark:border-white/8 mb-4">
            <h3 className="font-display font-bold text-sm sm:text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-ultramarine" />
              <span>{language === 'ru' ? 'Закрепить новый творческий материал на холсте' : 'Pin New Material to Canvas'}</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsAddingCard(false)}
              className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center cursor-pointer text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-[#52555F] dark:text-zinc-400 mb-1 font-semibold">
                  {t.moodboard.itemTitle} *
                </label>
                <input
                  type="text"
                  placeholder={language === 'ru' ? 'Например: Каустика силикатного стекла...' : 'e.g. Caustic refraction sample...'}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#121316] dark:text-white placeholder-zinc-500 focus:outline-none focus:border-ultramarine"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#52555F] dark:text-zinc-400 mb-1 font-semibold">
                  {language === 'ru' ? 'Тип артефакта' : 'Item Type'}
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#121316] dark:text-white focus:outline-none focus:border-ultramarine font-mono cursor-pointer"
                >
                  <option value="image" className="bg-white dark:bg-zinc-900 text-[#121316] dark:text-white">
                    {language === 'ru' ? 'Изображение / Рендер' : 'Image / Render'}
                  </option>
                  <option value="color" className="bg-white dark:bg-zinc-900 text-[#121316] dark:text-white">
                    {language === 'ru' ? 'Цветовой токен' : 'Color Palette Token'}
                  </option>
                  <option value="note" className="bg-white dark:bg-zinc-900 text-[#121316] dark:text-white">
                    {language === 'ru' ? 'Заметка ателье' : 'Atelier Text Note'}
                  </option>
                  <option value="material" className="bg-white dark:bg-zinc-900 text-[#121316] dark:text-white">
                    {language === 'ru' ? 'Физический материал' : 'Physical Material'}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#52555F] dark:text-zinc-400 mb-1 font-semibold">
                  {language === 'ru' ? 'Дисциплина' : 'Discipline'}
                </label>
                <select
                  value={newDiscipline}
                  onChange={(e) => setNewDiscipline(e.target.value as CreativeDiscipline)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#121316] dark:text-white focus:outline-none focus:border-ultramarine font-mono cursor-pointer"
                >
                  {CREATIVE_DISCIPLINES.map((d) => (
                    <option key={d.id} value={d.id} className="bg-white dark:bg-zinc-900 text-[#121316] dark:text-white">{d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#52555F] dark:text-zinc-400 mb-1 font-semibold">
                  {language === 'ru' ? 'Метка / Спецификация' : 'Tag / Archetype'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Caustic, Prism, Shader"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#121316] dark:text-white placeholder-zinc-500 focus:outline-none focus:border-ultramarine"
                />
              </div>
            </div>

            {newType === 'image' && (
              <div className="pt-2">
                <ImageUploader
                  initialImageUrl={uploadedImageUrl}
                  onImageUploaded={({ url }) => setUploadedImageUrl(url)}
                  label={language === 'ru' ? 'Загрузить визуальный материал для мудборда' : 'Upload image asset for moodboard'}
                  aspectRatio="video"
                  showAltInput={false}
                />
              </div>
            )}

            {newType === 'color' && (
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="color"
                  value={newContent || '#386BF6'}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-12 h-12 rounded-xl cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  placeholder="#386BF6"
                  value={newContent || '#386BF6'}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-mono uppercase text-white"
                />
              </div>
            )}

            {newType === 'note' && (
              <div>
                <label className="block text-[11px] font-mono text-[#52555F] dark:text-zinc-400 mb-1 font-semibold">
                  {t.moodboard.itemContent}
                </label>
                <textarea
                  rows={2}
                  placeholder={language === 'ru' ? 'Запишите наблюдение по материалу или пространственному интерфейсу...' : 'Document a material observation or spatial finding...'}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#121316] dark:text-white placeholder-zinc-500 focus:outline-none focus:border-ultramarine font-sans"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/5">
              <button
                type="button"
                onClick={() => setIsAddingCard(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white cursor-pointer touch-target"
              >
                {t.modals.cancelBtn}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-ultramarine hover:bg-blue-600 text-white font-mono font-bold text-xs cursor-pointer shadow-md touch-target"
              >
                {language === 'ru' ? 'Закрепить на холсте' : 'Pin to Canvas'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          THE CANVAS OWNS THE ENTIRE PAGE VIEWPORT
          ========================================================================= */}
      <div 
        id="spatial-moodboard-infinite-surface"
        className="relative w-full min-h-[580px] sm:min-h-[680px] rounded-3xl border border-black/8 dark:border-white/8 bg-[#090B0E] p-4 sm:p-8 shadow-2xl overflow-hidden bg-grain"
      >
        {/* Subtle Spatial Orientation Grid */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#386bf6_1px,transparent_1px)] [background-size:32px_32px]" />

        {/* Spatial Pins Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 relative z-10">
          {items.map((item) => {
            const isSelected = selectedItemId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => handleSelectItem(item.id)}
                style={{
                  transform: `rotate(${item.rotation || 0}deg)`,
                  zIndex: isSelected ? 40 : item.zIndex || 10,
                }}
                className={`group relative rounded-2xl sm:rounded-3xl p-4 border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'border-ultramarine ring-2 ring-ultramarine/50 bg-[#121520] scale-[1.03] shadow-2xl'
                    : 'border-white/10 hover:border-ultramarine/40 bg-[#0E1015]/90 backdrop-blur-xl shadow-md'
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleSelectItem(item.id);
                }}
                aria-pressed={isSelected}
                aria-label={`Moodboard pin: ${item.title}`}
              >
                {/* Pin Header */}
                <div className="flex items-center justify-between mb-2.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 font-semibold truncate max-w-[130px]">
                    {item.tag}
                  </span>
                  <span className="font-mono text-[10px] text-ultramarine uppercase font-bold">
                    {item.discipline}
                  </span>
                </div>

                {/* Content based on type */}
                {item.type === 'image' && (
                  <div className="rounded-xl overflow-hidden mb-3 aspect-[16/10] bg-zinc-950 border border-white/10">
                    <img src={item.content} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                )}

                {item.type === 'color' && (
                  <div 
                    className="rounded-xl mb-3 h-24 border border-white/15 shadow-inner flex items-center justify-center" 
                    style={{ backgroundColor: item.content }}
                  >
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-black/75 text-white backdrop-blur-md">
                      {item.content}
                    </span>
                  </div>
                )}

                {item.type === 'note' && (
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 font-serif text-sm italic text-zinc-200 mb-3 leading-relaxed">
                    "{item.content}"
                  </div>
                )}

                {/* Pin Title */}
                <h4 className="font-display font-bold text-sm text-[#F5F3EF] line-clamp-1">
                  {item.title}
                </h4>
              </div>
            );
          })}
        </div>

        {/* DESKTOP FLOATING CONTEXT INSPECTOR (Cleanly docked in top-right without blocking screen) */}
        {selectedItem && (
          <aside className="hidden lg:block absolute top-6 right-6 w-80 p-4 rounded-3xl bg-[#0E1015]/95 backdrop-blur-2xl border border-white/15 shadow-2xl z-40 text-[#F5F3EF] animate-in fade-in zoom-in-95 duration-150 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-ultramarine" />
                <span className="font-mono text-xs uppercase tracking-wider font-bold">
                  {t.moodboard.inspector}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItemId(null)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
                aria-label={t.common.close}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <div className="text-sm font-bold truncate">{selectedItem.title}</div>
              <div className="text-[11px] font-mono text-ultramarine uppercase mt-0.5">// {selectedItem.tag}</div>
            </div>

            {/* Quick Touch Controls */}
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
              <button
                type="button"
                onClick={(e) => handleRotate(selectedItem.id, 15, e)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5 text-ultramarine" />
                <span>+15°</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleRotate(selectedItem.id, -15, e)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-ultramarine" />
                <span>-15°</span>
              </button>

              <button
                type="button"
                onClick={() => handleAdjustZIndex(selectedItem.id, 1)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{t.moodboard.bringForward}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteItem(selectedItem.id)}
                className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.moodboard.deleteItem}</span>
              </button>
            </div>

            {selectedItem.type === 'color' && (
              <button
                type="button"
                onClick={() => handleCopyContent(selectedItem.content)}
                className="w-full p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-mono text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedHex ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedHex ? (language === 'ru' ? 'Скопировано!' : 'Copied!') : `${language === 'ru' ? 'Копировать' : 'Copy'} ${selectedItem.content}`}</span>
              </button>
            )}
          </aside>
        )}
      </div>

      {/* =========================================================================
          MOBILE TOUCH BOTTOM SHEET FOR SELECTED MATERIAL
          Opens on demand, closing it retains selection and position!
          ========================================================================= */}
      {selectedItem && isMobileSheetOpen && (
        <div 
          id="mobile-material-sheet-backdrop"
          className="lg:hidden fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-150"
          onClick={() => setIsMobileSheetOpen(false)}
        >
          <div 
            id="mobile-material-sheet-content"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-full rounded-t-3xl bg-[#0E1015] border-t border-white/15 p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl text-[#F5F3EF] space-y-4 animate-in slide-in-from-bottom duration-200"
          >
            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="min-w-0">
                <span className="font-mono text-[10px] text-ultramarine uppercase font-bold tracking-wider">
                  // {selectedItem.tag}
                </span>
                <h3 className="font-display font-bold text-base truncate">{selectedItem.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSheetOpen(false)}
                className="min-w-[40px] min-h-[40px] p-2 rounded-full bg-white/10 flex items-center justify-center text-zinc-300 cursor-pointer"
                aria-label={t.moodboard.mobileSheetClose}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Touch Action Buttons (>=44px hitboxes) */}
            <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
              <button
                type="button"
                onClick={(e) => handleRotate(selectedItem.id, 15, e)}
                className="min-h-[48px] p-3 rounded-2xl bg-white/10 active:bg-white/20 border border-white/10 flex items-center justify-center gap-2 cursor-pointer touch-target"
              >
                <RotateCw className="w-4 h-4 text-ultramarine" />
                <span>+15°</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleRotate(selectedItem.id, -15, e)}
                className="min-h-[48px] p-3 rounded-2xl bg-white/10 active:bg-white/20 border border-white/10 flex items-center justify-center gap-2 cursor-pointer touch-target"
              >
                <RotateCcw className="w-4 h-4 text-ultramarine" />
                <span>-15°</span>
              </button>

              <button
                type="button"
                onClick={() => handleAdjustZIndex(selectedItem.id, 1)}
                className="min-h-[48px] p-3 rounded-2xl bg-white/10 active:bg-white/20 border border-white/10 flex items-center justify-center gap-2 cursor-pointer touch-target"
              >
                <Layers className="w-4 h-4" />
                <span>{t.moodboard.bringForward}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteItem(selectedItem.id)}
                className="min-h-[48px] p-3 rounded-2xl bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center justify-center gap-2 cursor-pointer touch-target"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t.moodboard.deleteItem}</span>
              </button>
            </div>

            {selectedItem.type === 'color' && (
              <button
                type="button"
                onClick={() => handleCopyContent(selectedItem.content)}
                className="w-full min-h-[44px] p-3 rounded-2xl bg-white/10 active:bg-white/20 border border-white/10 font-mono text-xs flex items-center justify-center gap-2 cursor-pointer touch-target"
              >
                {copiedHex ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedHex ? (language === 'ru' ? 'Скопировано!' : 'Copied!') : `${language === 'ru' ? 'Копировать' : 'Copy'} ${selectedItem.content}`}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsMobileSheetOpen(false)}
              className="w-full min-h-[44px] py-2.5 rounded-full bg-white/5 text-zinc-400 font-mono text-xs text-center cursor-pointer"
            >
              {t.moodboard.mobileSheetClose}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
