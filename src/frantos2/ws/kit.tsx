import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { tr, ago as agoI } from '../i18n';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, Lock, X } from 'lucide-react';
import { Asset } from './types';
import { useAssetUrl } from './media';
import { undo, useWs } from './store';

export const ease = [0.22, 1, 0.36, 1] as const;

/* ───────── media ───────── */

export function AssetThumb({ asset, className = '', fit = 'cover', size = 'thumb', alt }: { asset?: Asset; className?: string; fit?: 'cover' | 'contain'; size?: 'thumb' | 'full'; alt?: string }) {
  const { url, missing } = useAssetUrl(asset, size);
  if (!asset) return <div className={`bg-[var(--graphite-2)] ${className}`} />;
  if (missing)
    return (
      <div className={`flex items-center justify-center bg-[var(--graphite-2)] text-[11px] text-[var(--fog)] ${className}`}>
        <AlertTriangle size={14} className="me-1" /> {tr('File missing')}
      </div>
    );
  return url ? (
    <img src={url} alt={alt ?? ''} draggable={false} loading="lazy" decoding="async" className={`block select-none ${fit === 'cover' ? 'object-cover' : 'object-contain'} ${className}`} />
  ) : (
    <div className={`animate-pulse bg-[var(--graphite-2)] ${className}`} />
  );
}

/* ───────── toasts with undo ───────── */

type Toast = { id: number; text: string; undo?: boolean; tone?: 'error' | 'ok' };
let toasts: Toast[] = [];
const tl = new Set<() => void>();
let tid = 0;
export function toast(text: string, opts: { undo?: boolean; tone?: Toast['tone'] } = {}) {
  const t = { id: ++tid, text, ...opts };
  toasts = [...toasts.slice(-2), t];
  tl.forEach((l) => l());
  window.setTimeout(() => dismiss(t.id), opts.undo ? 7000 : 3500);
}
function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  tl.forEach((l) => l());
}

export function Toaster() {
  const list = useSyncExternalStore(
    (l) => (tl.add(l), () => tl.delete(l)),
    () => toasts,
    () => toasts
  );
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        const t = e.target as HTMLElement;
        if (t.closest('input,textarea,[contenteditable]')) return;
        const label = undo();
        if (label) {
          e.preventDefault();
          toast(`Undone: ${label.toLowerCase()}`);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4 pb-[env(safe-area-inset-bottom)]" aria-live="polite">
      <AnimatePresence>
        {list.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.22, ease }}
            className="pointer-events-auto flex max-w-[560px] items-center gap-3 rounded-full bg-[var(--ink)] py-2 ps-4 pe-2 text-[13.5px] text-[var(--paper)] shadow-[0_18px_40px_-16px_rgba(0,0,0,0.5)]"
            role={t.tone === 'error' ? 'alert' : 'status'}
          >
            {t.tone === 'error' ? <AlertTriangle size={15} className="shrink-0 text-[var(--signal)]" /> : <Check size={15} className="shrink-0 opacity-70" />}
            <span className="min-w-0">{t.text}</span>
            {t.undo && (
              <button
                onClick={() => {
                  const label = undo();
                  dismiss(t.id);
                  if (label) toast(tr('Restored'));
                }}
                className="rounded-full bg-[var(--paper)] px-3 py-1 text-[12.5px] font-semibold text-[var(--ink)]"
              >
                {tr('Undo')}
              </button>
            )}
            <button onClick={() => dismiss(t.id)} aria-label={tr('Dismiss')} className="rounded-full p-1.5 opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ───────── save state ───────── */

export function SaveBadge({ dark = false }: { dark?: boolean }) {
  const { status, lastSavedAt } = useWs();
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);
  let label = tr('Stored in this browser');
  let dot = dark ? 'var(--fog)' : 'var(--ink-2)';
  if (status === 'loading') label = tr('Opening…');
  else if (status === 'saving') {
    label = tr('Saving…');
    dot = 'var(--signal)';
  } else if (status === 'error') {
    label = tr('Not saved — browser storage unavailable');
    dot = 'var(--signal)';
  } else if (status === 'saved' && lastSavedAt) {
    label = tr('Saved {when}', { when: agoI(lastSavedAt) });
    dot = '#4f8a5b';
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px]" style={{ color: dark ? 'var(--fog)' : 'var(--ink-2)' }} title={tr('Your projects and files are stored in this browser (IndexedDB). Nothing is uploaded to a server.')} aria-live="polite">
      <motion.span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: dot }}
        animate={status === 'saving' ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
        transition={status === 'saving' ? { duration: 0.8, repeat: Infinity } : { duration: 0.2 }}
      />
      {label}
    </span>
  );
}

export const ago = (t: number) => agoI(t);

export function PrivateChip({ dark }: { dark?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[11px] font-medium"
      style={{ borderColor: dark ? 'var(--line)' : 'var(--rule)', color: dark ? 'var(--fog)' : 'var(--ink-2)' }}
      title={tr('Private: stored only in this browser. There is no server, so there are no shared links or invites.')}
    >
      <Lock size={11} /> {tr('Private · this browser')}
    </span>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border border-[var(--rule)] bg-white/50 px-1.5 py-[1px] font-mono text-[10.5px]">{children}</kbd>;
}

export function useMedia(q: string) {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return m;
}
