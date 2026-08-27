import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Image as ImageIcon, 
  X, 
  RefreshCw, 
  AlertCircle, 
  Check, 
  Database,
  Eye
} from 'lucide-react';
import { frantosDB, UploadResult } from '../../services/supabaseClient';

interface ImageUploaderProps {
  initialImageUrl?: string;
  initialAlt?: string;
  onImageUploaded: (result: { url: string; alt: string; name?: string }) => void;
  onImageRemoved?: () => void;
  label?: string;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'wide' | 'auto';
  maxSizeMB?: number;
  showAltInput?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  initialImageUrl = '',
  initialAlt = '',
  onImageUploaded,
  onImageRemoved,
  label = 'Upload Spatial Media',
  aspectRatio = 'video',
  maxSizeMB = 10,
  showAltInput = true,
}) => {
  const [imageUrl, setImageUrl] = useState<string>(initialImageUrl);
  const [altText, setAltText] = useState<string>(initialAlt);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const aspectRatioClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
    wide: 'aspect-[21/9]',
    auto: 'min-h-[160px] max-h-[300px]',
  }[aspectRatio];

  const handleProcessFile = async (file: File) => {
    setErrorMessage(null);
    setIsLoading(true);
    setUploadProgress(10);
    setImgError(false);

    try {
      const result: UploadResult = await frantosDB.uploadFile(file, {
        maxSizeBytes: maxSizeMB * 1024 * 1024,
        onProgress: (p) => setUploadProgress(p),
      });

      const derivedAlt = altText.trim() || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setImageUrl(result.url);
      setAltText(derivedAlt);
      onImageUploaded({
        url: result.url,
        alt: derivedAlt,
        name: result.name,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process image file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleProcessFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleProcessFile(files[0]);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setAltText('');
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onImageRemoved) onImageRemoved();
  };

  const handleAltChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAltText(val);
    if (imageUrl) {
      onImageUploaded({
        url: imageUrl,
        alt: val,
      });
    }
  };

  return (
    <div className="w-full space-y-3">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono font-semibold uppercase tracking-wider text-[#4A505C] dark:text-zinc-400">
            {label}
          </label>
          <span className="text-[10px] font-mono text-zinc-500">
            Max {maxSizeMB}MB • JPG, PNG, WEBP, GIF, SVG
          </span>
        </div>
      )}

      {/* Upload Dropzone / Preview Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative w-full ${aspectRatioClasses} rounded-2xl overflow-hidden border-2 transition-all flex flex-col items-center justify-center ${
          isDragging
            ? 'border-cyan-500 bg-cyan-500/10 scale-[1.01]'
            : imageUrl
            ? 'border-black/10 dark:border-white/15 bg-zinc-950'
            : 'border-dashed border-black/20 dark:border-white/20 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
        }`}
      >
        {/* Hidden native file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/svg+xml"
          onChange={handleFileInputChange}
          className="hidden"
          id={`file-input-${label.replace(/\s+/g, '-').toLowerCase()}`}
          aria-label={label}
        />

        {/* State 1: Uploading In-Progress */}
        {isLoading && (
          <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white space-y-3">
            <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
            <div className="text-center space-y-1">
              <p className="text-xs font-mono font-semibold">Encoding & Storing Locally...</p>
              <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-150 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-zinc-400">{uploadProgress}% Complete</span>
            </div>
          </div>
        )}

        {/* State 2: Active Image Preview */}
        {imageUrl && !isLoading ? (
          <div className="relative w-full h-full group">
            {!imgError ? (
              <img
                src={imageUrl}
                alt={altText || 'Uploaded asset preview'}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-400 p-4 text-center">
                <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs font-mono">Image loaded in Demo Mode</p>
              </div>
            )}

            {/* Hover Actions Toolbar */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-xs">
              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-transform hover:scale-110 cursor-pointer"
                title="Zoom Preview"
                aria-label="Zoom image preview"
              >
                <Eye className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-transform hover:scale-105 flex items-center gap-1.5 cursor-pointer shadow-md"
                aria-label="Replace image"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Replace</span>
              </button>

              <button
                type="button"
                onClick={handleRemoveImage}
                className="p-2.5 rounded-full bg-rose-500/80 hover:bg-rose-500 text-white backdrop-blur-md transition-transform hover:scale-110 cursor-pointer"
                title="Remove Image"
                aria-label="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Demo Badge */}
            <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono text-cyan-400 border border-cyan-500/30">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Demo Stored Locally</span>
            </div>
          </div>
        ) : (
          /* State 3: Empty Dropzone Target */
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-full flex flex-col items-center justify-center p-6 text-center cursor-pointer space-y-2.5 select-none"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#111317] dark:text-[#F3F1EC]">
                Click or drag & drop media here
              </p>
              <p className="text-[11px] text-[#4A505C] dark:text-zinc-400 mt-0.5">
                Select high-resolution render, sketch, or photo
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Alert Box */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 font-mono">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Meaningful Alt Text & Supabase Metadata */}
      {showAltInput && imageUrl && (
        <div className="space-y-2 pt-1">
          <div>
            <label className="block text-[11px] font-mono text-[#4A505C] dark:text-zinc-400 mb-1 font-semibold">
              Accessibility Alt Text
            </label>
            <input
              type="text"
              placeholder="e.g. 3D procedural crystal caustics rendered in Octane..."
              value={altText}
              onChange={handleAltChange}
              className="w-full px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#111317] dark:text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 bg-black/[0.02] dark:bg-white/[0.02] p-2 rounded-xl border border-black/5 dark:border-white/5">
            <Database className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
            <span>
              <strong>Supabase Storage Bridge:</strong> In Demo Mode, assets are preserved in local storage. Connect Supabase in Auth to push to S3 bucket.
            </span>
          </div>
        </div>
      )}

      {/* Zoom Preview Modal */}
      {showPreviewModal && imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4"
          onClick={() => setShowPreviewModal(false)}
        >
          <div className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
            <img src={imageUrl} alt={altText} className="w-full h-full object-contain" />
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer"
              aria-label="Close zoom preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
