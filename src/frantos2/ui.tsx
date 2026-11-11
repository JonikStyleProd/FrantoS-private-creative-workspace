import React from 'react';
import { motion } from 'framer-motion';
import { FRAME_BY_ID, FrameId, frameSrc, frameThumb } from './data';

/** Recurring motif: contact-sheet crop marks in the four corners. */
export function CropMarks({ color = 'currentColor', inset = -7, size = 12 }: { color?: string; inset?: number; size?: number }) {
  const s: React.CSSProperties = { position: 'absolute', width: size, height: size, borderColor: color, pointerEvents: 'none' };
  return (
    <>
      <span aria-hidden style={{ ...s, top: inset, left: inset, borderTopWidth: 1, borderLeftWidth: 1 }} />
      <span aria-hidden style={{ ...s, top: inset, right: inset, borderTopWidth: 1, borderRightWidth: 1 }} />
      <span aria-hidden style={{ ...s, bottom: inset, left: inset, borderBottomWidth: 1, borderLeftWidth: 1 }} />
      <span aria-hidden style={{ ...s, bottom: inset, right: inset, borderBottomWidth: 1, borderRightWidth: 1 }} />
    </>
  );
}

/** Image of a frame. `crop` fills the box using the frame's focal point; otherwise the whole frame is shown. */
export function FrameImg({
  id,
  crop = true,
  sizes = '(max-width: 768px) 50vw, 640px',
  eager = false,
  className = '',
  alt,
}: {
  id: FrameId;
  crop?: boolean;
  sizes?: string;
  eager?: boolean;
  className?: string;
  alt?: string;
}) {
  const f = FRAME_BY_ID[id];
  return (
    <img
      src={frameThumb(id)}
      srcSet={`${frameThumb(id)} 640w, ${frameSrc(id)} 1800w`}
      sizes={sizes}
      alt={alt ?? ''}
      draggable={false}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={`block h-full w-full select-none ${crop ? 'object-cover' : 'object-contain'} ${className}`}
      style={crop ? { objectPosition: f.focus } : undefined}
    />
  );
}

export function FrameNo({ n, className = '' }: { n: number; className?: string }) {
  return <span className={`f2-mono tabular-nums ${className}`}>FR {String(n).padStart(2, '0')}</span>;
}

export function Wordmark({ small = false }: { dark?: boolean; small?: boolean }) {
  // the blue FrantoS wordmark, the same logo as the rest of the app
  return <img src="/brand/wordmark-gradient.webp" alt="FrantoS" draggable={false} className="inline-block w-auto select-none" style={{ height: small ? 24 : 28 }} />;
}

/**
 * The story cover — the signature object of FrantoS 2.0.
 * Only the image box carries `layoutId`, so it can fly between screens
 * (hero → editor tile → presentation title) without distorting the type.
 */
export function CoverArt({
  id,
  title,
  meta,
  layoutId,
  size = 'hero',
  eager,
  sizes,
}: {
  id: FrameId;
  title: string;
  meta?: string;
  layoutId?: string;
  size?: 'hero' | 'tile' | 'mini';
  eager?: boolean;
  sizes?: string;
}) {
  const titleSize = size === 'hero' ? 'clamp(2.1rem, 4.2vw, 3.4rem)' : size === 'tile' ? '1.65rem' : '1.05rem';
  const pad = size === 'hero' ? 'p-5 md:p-6' : size === 'tile' ? 'p-3.5' : 'p-2';
  return (
    <div className="relative h-full w-full">
      <motion.div
        layoutId={layoutId}
        className="absolute inset-0 overflow-hidden bg-[var(--graphite)]"
        style={{ borderRadius: size === 'mini' ? 3 : 4 }}
        transition={{ type: 'spring', stiffness: 260, damping: 32 }}
      >
        <FrameImg id={id} eager={eager} sizes={sizes ?? (size === 'hero' ? '(max-width: 768px) 90vw, 560px' : '320px')} />
      </motion.div>
      <div
        className={`pointer-events-none absolute inset-0 flex flex-col justify-between ${pad}`}
        style={{ borderRadius: 4, background: 'linear-gradient(180deg, rgba(10,10,12,0.55) 0%, rgba(10,10,12,0) 28%, rgba(10,10,12,0) 52%, rgba(10,10,12,0.78) 100%)' }}
      >
        {size !== 'mini' && (
          <div className="flex items-center justify-between gap-2 whitespace-nowrap text-[#f3efe7]/85">
            <span className="f2-mono" style={{ fontSize: size === 'hero' ? 11 : 9.5 }}>
              FrantoS · Story
            </span>
            {meta && (
              <span className="f2-mono" style={{ fontSize: size === 'hero' ? 11 : 9.5 }}>
                {meta}
              </span>
            )}
          </div>
        )}
        <h3 className="f2-display text-[#f6f1e8]" style={{ fontSize: titleSize, lineHeight: 0.95 }}>
          {title.split(' / ').map((part, i) => (
            <span key={i} className="block">
              {i > 0 && <span style={{ color: 'var(--signal)' }}>/ </span>}
              {i > 0 ? <em className="italic">{part}</em> : part}
            </span>
          ))}
        </h3>
      </div>
    </div>
  );
}

export function useReducedMotion() {
  const [r, setR] = React.useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  React.useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setR(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return r;
}
