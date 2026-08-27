import React, { useState } from 'react';
import { Heart } from 'lucide-react';

interface LikeHeartButtonProps {
  isLiked?: boolean;
  likesCount: number;
  onToggleLike: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'pill' | 'icon-only' | 'badge';
  className?: string;
}

export const LikeHeartButton: React.FC<LikeHeartButtonProps> = ({
  isLiked = false,
  likesCount,
  onToggleLike,
  size = 'md',
  variant = 'pill',
  className = '',
}) => {
  const [particles, setParticles] = useState<{ id: number; x: number }[]>([]);
  const [isPopping, setIsPopping] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Trigger animation only when liking (transitioning from false -> true)
    if (!isLiked) {
      setIsPopping(true);
      const newParticle = { id: Date.now(), x: (Math.random() - 0.5) * 16 };
      setParticles((prev) => [...prev, newParticle]);

      setTimeout(() => {
        setIsPopping(false);
      }, 450);

      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== newParticle.id));
      }, 850);
    }

    onToggleLike(e);
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  const textSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  }[size];

  if (variant === 'icon-only') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`relative p-2 rounded-full border transition-all cursor-pointer select-none ${
          isLiked
            ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
            : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
        } ${className}`}
        aria-label={isLiked ? 'Unlike project' : 'Like project'}
      >
        <Heart
          className={`${iconSizes} ${isLiked ? 'fill-current' : ''} ${
            isPopping ? 'animate-heart-pop text-rose-500' : ''
          }`}
        />

        {/* Floating Heart Particles */}
        {particles.map((p) => (
          <span
            key={p.id}
            style={{ transform: `translateX(${p.x}px)` }}
            className="absolute -top-1 left-1/2 pointer-events-none text-rose-500 animate-heart-float z-30"
          >
            <Heart className="w-3 h-3 fill-current" />
          </span>
        ))}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`relative inline-flex items-center gap-1.5 font-mono ${textSizes} px-3 py-1.5 rounded-full border transition-all cursor-pointer select-none ${
        isLiked
          ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400 font-semibold'
          : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white'
      } ${className}`}
      aria-label={isLiked ? `Unlike (${likesCount})` : `Like (${likesCount})`}
    >
      <Heart
        className={`${iconSizes} ${isLiked ? 'fill-current text-rose-500' : ''} ${
          isPopping ? 'animate-heart-pop text-rose-500' : ''
        }`}
      />
      <span>{likesCount}</span>

      {/* Floating Heart Particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          style={{ transform: `translateX(${p.x}px)` }}
          className="absolute -top-1 left-3 pointer-events-none text-rose-500 animate-heart-float z-30"
        >
          <Heart className="w-3 h-3 fill-current" />
        </span>
      ))}
    </button>
  );
};
