import React from 'react';

const HUES = [18, 32, 200, 152, 268, 340, 44, 186];
/** a stable colour per name, so the same person always has the same circle */
function hue(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

/** A person: their photo, or their initial on a soft gradient. */
export function Avatar({ src, name, size = 40, ring, className = '' }: { src?: string | null; name: string; size?: number; ring?: boolean; className?: string }) {
  const initial = (name.trim() || '?').slice(0, 1).toUpperCase();
  const h = hue(name || '?');
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-extrabold text-white ${ring ? 'ring-2 ring-white/70' : ''} ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42), background: src ? '#222' : `linear-gradient(135deg, hsl(${h} 70% 58%), hsl(${(h + 40) % 360} 65% 40%))` }}
      aria-hidden
    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" draggable={false} /> : initial}
    </span>
  );
}

/** Square-crop and shrink a picked photo to a small WebP data URL (fits in the profile, ~10–20 KB). */
export async function avatarFromFile(file: File, px = 256): Promise<string> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const side = Math.min(bmp.width, bmp.height);
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const g = c.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, px, px);
  return c.toDataURL('image/webp', 0.82);
}
