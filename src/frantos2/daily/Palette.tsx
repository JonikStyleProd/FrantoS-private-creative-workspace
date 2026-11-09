import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, FileImage, FolderOpen, Hash, MessageSquare, Search, Sparkles } from 'lucide-react';
import { useWs, ws } from '../ws/store';
import { go } from '../route';
import { LANGS, setLang, tr as t } from '../i18n';

type Item = { id: string; kind: 'project' | 'asset' | 'note' | 'tag' | 'command'; title: string; sub?: string; run: () => void };

/** ⌘K / Ctrl+K: jump to any project, file, note or tag; run common commands. */
export function Palette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const { state } = useWs();
  const inp = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === '/' && !(e.target as HTMLElement).closest('input,textarea,[contenteditable]')) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('frantos:palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('frantos:palette', onOpen);
    };
  }, []);
  useEffect(() => {
    if (open) {
      setQ('');
      setI(0);
      setTimeout(() => inp.current?.focus(), 10);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    const cmds: Item[] = [
      { id: 'c-home', kind: 'command', title: t('Go to workspace'), run: () => go('/app') },
      { id: 'c-new', kind: 'command', title: t('New project'), run: () => (go('/app'), setTimeout(() => window.dispatchEvent(new Event('frantos:new')), 50)) },
      { id: 'c-team', kind: 'command', title: t('Studio & team'), run: () => go('/team') },
      ...LANGS.map((l) => ({ id: `c-lang-${l.id}`, kind: 'command' as const, title: `${t('Language')}: ${l.name}`, run: () => setLang(l.id) })),
    ];
    const tags = new Map<string, number>();
    for (const p of state.projects) {
      out.push({ id: `p-${p.id}`, kind: 'project', title: p.title, sub: (p.tags ?? []).join(' · '), run: () => go(p.lastView ?? `/p/${p.id}`) });
      (p.tags ?? []).forEach((tg) => tags.set(tg, (tags.get(tg) ?? 0) + 1));
      for (const a of p.assets) {
        (a.tags ?? []).forEach((tg) => tags.set(tg, (tags.get(tg) ?? 0) + 1));
        out.push({ id: `a-${a.id}`, kind: 'asset', title: a.title, sub: `${p.title}${a.tags?.length ? ' · #' + a.tags.join(' #') : ''}${a.note ? ' · ' + a.note : ''}`, run: () => go(`/p/${p.id}/materials?a=${a.id}`) });
      }
      for (const c of p.comments) out.push({ id: `n-${c.id}`, kind: 'note', title: c.text, sub: `${p.title} · ${c.author}${c.resolved ? ' · ✓' : ''}`, run: () => go(`/p/${p.id}/review/${c.workId}?v=${c.versionId}&c=${c.id}`) });
    }
    for (const [tg, n] of tags) out.push({ id: `t-${tg}`, kind: 'tag', title: `#${tg}`, sub: t('{n} files', { n }), run: () => setQ(`#${tg}`) });
    const needle = q.trim().toLowerCase();
    if (!needle) return [...cmds, ...out.filter((x) => x.kind === 'project')].slice(0, 12);
    const tagQ = needle.startsWith('#') ? needle.slice(1) : null;
    const hit = (x: Item) => (tagQ ? x.kind === 'asset' && (x.sub ?? '').toLowerCase().includes(`#${tagQ}`) : `${x.title} ${x.sub ?? ''}`.toLowerCase().includes(needle));
    return [...cmds.filter(hit), ...out.filter(hit)].slice(0, 30);
  }, [state.projects, q]);

  const run = (it?: Item) => {
    if (!it) return;
    if (it.kind !== 'tag') setOpen(false);
    it.run();
  };
  const icon = (k: Item['kind']) => (k === 'project' ? <FolderOpen size={15} /> : k === 'asset' ? <FileImage size={15} /> : k === 'note' ? <MessageSquare size={15} /> : k === 'tag' ? <Hash size={15} /> : <Sparkles size={15} />);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[95] flex items-start justify-center bg-black/25 px-4 pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
          <motion.div
            role="dialog"
            aria-modal
            aria-label={t('Search and commands')}
            initial={{ y: -8, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -6, opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[620px] overflow-hidden rounded-[12px] border border-[var(--rule)] bg-[#f7f2e9] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.55)]"
          >
            <div className="flex items-center gap-3 border-b border-[var(--rule)] px-4">
              <Search size={17} className="text-[var(--ink-2)]" />
              <input
                ref={inp}
                value={q}
                onChange={(e) => (setQ(e.target.value), setI(0))}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') (e.preventDefault(), setI((x) => Math.min(items.length - 1, x + 1)));
                  if (e.key === 'ArrowUp') (e.preventDefault(), setI((x) => Math.max(0, x - 1)));
                  if (e.key === 'Enter') run(items[i]);
                  if (e.key === 'Escape') setOpen(false);
                }}
                placeholder={t('Search projects, files, notes, #tags…')}
                aria-label={t('Search')}
                className="h-14 flex-1 bg-transparent text-[16px] outline-none"
              />
              <kbd className="rounded border border-[var(--rule)] px-1.5 text-[11px] text-[var(--ink-2)]">Esc</kbd>
            </div>
            <ul className="f2-scroll max-h-[52vh] overflow-y-auto p-1.5" role="listbox">
              {items.length === 0 && <li className="px-3 py-6 text-center text-[14px] text-[var(--ink-2)]">{t('Nothing found')}</li>}
              {items.map((it, k) => (
                <li key={it.id} role="option" aria-selected={k === i}>
                  <button onMouseEnter={() => setI(k)} onClick={() => run(it)} className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-start" style={{ background: k === i ? 'rgba(21,19,15,0.07)' : 'transparent' }}>
                    <span className="text-[var(--ink-2)]">{icon(it.kind)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{it.title}</span>
                      {it.sub && <span className="block truncate text-[12px] text-[var(--ink-2)]">{it.sub}</span>}
                    </span>
                    {k === i && <ArrowRight size={14} className="text-[var(--ink-2)]" />}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const openPalette = () => window.dispatchEvent(new Event('frantos:palette'));
export { ws };
