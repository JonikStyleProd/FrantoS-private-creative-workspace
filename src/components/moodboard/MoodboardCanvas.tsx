import React, { useState } from 'react';
import { MoodboardItem, CreativeDiscipline } from '../../types';
import { 
  Plus, 
  RotateCw,
  Trash2,
  Sparkles,
  Layers
} from 'lucide-react';
import { CREATIVE_DISCIPLINES } from '../../data/mockData';
import { ImageUploader } from '../common/ImageUploader';

interface MoodboardCanvasProps {
  items: MoodboardItem[];
  onUpdateItems: (items: MoodboardItem[]) => void;
}

export const MoodboardCanvas: React.FC<MoodboardCanvasProps> = ({ items, onUpdateItems }) => {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'image' | 'color' | 'note' | 'material'>('image');
  const [newContent, setNewContent] = useState('');
  const [newTag, setNewTag] = useState('Spatial Texture');
  const [newDiscipline, setNewDiscipline] = useState<CreativeDiscipline>('3d');
  const [uploadedImageUrl, setUploadedImageUrl] = useState(
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'
  );

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    let finalContent = newContent;
    if (newType === 'image') {
      finalContent = uploadedImageUrl || newContent || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
    } else if (newType === 'color') {
      finalContent = newContent || '#06B6D4';
    } else {
      finalContent = newContent || 'Studio spatial study card.';
    }

    const newItem: MoodboardItem = {
      id: `mb-${Date.now()}`,
      title: newTitle.trim(),
      type: newType,
      content: finalContent,
      tag: newTag || 'Spatial Token',
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

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateItems(items.filter((item) => item.id !== id));
  };

  const handleRotate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateItems(
      items.map((it) => (it.id === id ? { ...it, rotation: ((it.rotation || 0) + 15) % 360 } : it))
    );
  };

  return (
    <section 
      id="frantos-moodboard-section"
      className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 animate-in fade-in duration-300"
      aria-label="Spatial Moodboard & Material Assembler"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-wider text-purple-600 dark:text-purple-400 font-semibold">
              Spatial Surface // Material Assembler
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-[#111317] dark:text-[#F3F1EC]">
            SPATIAL MOODBOARD
          </h2>
          <p className="text-xs sm:text-sm text-[#4A505C] dark:text-[#A0A6B2] max-w-xl mt-1">
            Pin materials, caustics samples, spectral hex codes, and architectural typography references in an open spatial field.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-add-pin"
            onClick={() => setIsAddingCard(!isAddingCard)}
            className="px-4 py-2.5 rounded-full text-xs font-mono font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all flex items-center gap-2 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAddingCard ? 'Close Panel' : 'Pin Artifact'}</span>
          </button>
        </div>
      </div>

      {/* Add Card Form Modal */}
      {isAddingCard && (
        <div className="mb-6 p-6 rounded-3xl bg-white dark:bg-[#11141A] border border-purple-500/40 shadow-2xl animate-in zoom-in-95 duration-200 text-[#111317] dark:text-white frantos-animated-frame">
          <h3 className="font-display font-bold text-base text-[#111317] dark:text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Pin New Creative Artifact</span>
          </h3>

          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-[#4A505C] dark:text-zinc-400 mb-1 font-semibold">Title *</label>
                <input
                  type="text"
                  placeholder="Artifact title..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#111317] dark:text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#4A505C] dark:text-zinc-400 mb-1 font-semibold">Artifact Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#111317] dark:text-white focus:outline-none focus:border-purple-500 font-mono"
                >
                  <option value="image" className="bg-white dark:bg-zinc-900 text-[#111317] dark:text-white">Render / Image</option>
                  <option value="note" className="bg-white dark:bg-zinc-900 text-[#111317] dark:text-white">Studio Note</option>
                  <option value="color" className="bg-white dark:bg-zinc-900 text-[#111317] dark:text-white">Color Swatch</option>
                  <option value="material" className="bg-white dark:bg-zinc-900 text-[#111317] dark:text-white">Physical Material</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#4A505C] dark:text-zinc-400 mb-1 font-semibold">Discipline</label>
                <select
                  value={newDiscipline}
                  onChange={(e) => setNewDiscipline(e.target.value as CreativeDiscipline)}
                  className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#111317] dark:text-white focus:outline-none focus:border-purple-500 font-mono"
                >
                  {CREATIVE_DISCIPLINES.map((d) => (
                    <option key={d.id} value={d.id} className="bg-white dark:bg-zinc-900 text-[#111317] dark:text-white">{d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#4A505C] dark:text-zinc-400 mb-1 font-semibold">Tag Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. Caustics, Specular"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#111317] dark:text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Type-specific inputs */}
            {newType === 'image' && (
              <div className="pt-2">
                <ImageUploader
                  initialImageUrl={uploadedImageUrl}
                  onImageUploaded={({ url }) => setUploadedImageUrl(url)}
                  label="Upload Moodboard Visual Asset"
                  aspectRatio="video"
                  showAltInput={false}
                />
              </div>
            )}

            {newType === 'color' && (
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={newContent || '#06B6D4'}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  placeholder="#06B6D4"
                  value={newContent || '#06B6D4'}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-mono uppercase"
                />
              </div>
            )}

            {newType === 'note' && (
              <div>
                <label className="block text-[11px] font-mono text-[#4A505C] dark:text-zinc-400 mb-1 font-semibold">Studio Thought / Quote</label>
                <textarea
                  rows={2}
                  placeholder="Write an architectural or shader note..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#111317] dark:text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 font-sans"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/5">
              <button
                type="button"
                onClick={() => setIsAddingCard(false)}
                className="px-4 py-2 rounded-xl text-xs text-[#4A505C] dark:text-zinc-400 hover:text-black dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs cursor-pointer shadow-sm"
              >
                Pin to Canvas
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Spatial Free-Form Board Container */}
      <div 
        id="spatial-moodboard-canvas"
        className="relative w-full min-h-[640px] rounded-3xl border border-black/10 dark:border-white/10 bg-gradient-to-b from-[#F5F3EC] via-[#EFECE6] to-[#EAE6DD] dark:from-[#0B0D12] dark:via-[#0E1118] dark:to-[#0A0C10] overflow-hidden p-6 shadow-xl bg-grain"
      >
        {/* Ambient Grid Lines */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:32px_32px]" />

        {/* Spatial Pins Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {items.map((item) => {
            const isSelected = selectedItem === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(isSelected ? null : item.id)}
                style={{
                  transform: `rotate(${item.rotation || 0}deg)`,
                }}
                className={`group relative rounded-3xl p-5 border transition-all duration-300 shadow-md hover:shadow-xl cursor-pointer frantos-animated-frame ${
                  isSelected
                    ? 'border-purple-500 ring-2 ring-purple-400/40 bg-white dark:bg-black/90 scale-105 z-20'
                    : 'border-black/10 dark:border-white/10 hover:border-purple-400 bg-white/90 dark:bg-[#12151D]/90 backdrop-blur-xl hover:scale-[1.02]'
                }`}
              >
                {/* Pin Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-purple-500/10 dark:bg-white/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 dark:border-white/10 font-semibold">
                    {item.tag}
                  </span>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleRotate(item.id, e)}
                      className="p-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                      title="Rotate"
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteItem(item.id, e)}
                      className="p-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-600 dark:text-rose-300 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Content based on type */}
                {item.type === 'image' && (
                  <div className="rounded-2xl overflow-hidden mb-3 aspect-video bg-zinc-900 border border-black/10 dark:border-white/10">
                    <img src={item.content} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                )}

                {item.type === 'color' && (
                  <div className="rounded-2xl mb-3 h-24 border border-black/10 dark:border-white/20 shadow-inner flex items-center justify-center" style={{ backgroundColor: item.content }}>
                    <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-black/70 text-white backdrop-blur-md">
                      {item.content}
                    </span>
                  </div>
                )}

                {item.type === 'note' && (
                  <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 font-serif text-sm italic text-[#111317] dark:text-zinc-200 mb-3 leading-relaxed">
                    "{item.content}"
                  </div>
                )}

                {/* Pin Title & Meta */}
                <h4 className="font-display font-bold text-sm text-[#111317] dark:text-[#F3F1EC]">
                  {item.title}
                </h4>
                {item.meta && (
                  <p className="text-[11px] font-mono text-[#4A505C] dark:text-zinc-400 mt-1">
                    {item.meta}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
