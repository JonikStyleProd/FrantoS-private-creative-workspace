import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BoxSelect, Link2, MousePointer2, Plus, StickyNote, Upload, X } from 'lucide-react';
import { Asset, Project } from './types';
import { assetOf, ws } from './store';
import { AssetThumb, ease, toast } from './kit';
import { FilePick, upload } from './uploads';
import { ACCEPT, extractPalette } from './media';
import { tr as t } from '../i18n';
import { Tile } from './Project';

type Mode = 'select' | 'note' | 'group' | 'link';
type Drag = { kind: 'item' | 'note' | 'group' | 'resize'; id: string; sx: number; sy: number; x: number; y: number; w?: number; h?: number; moved: boolean };
const BOARD = 16 / 10;

/**
 * Moodboard as a canvas: references, works, notes and groups — and visible threads
 * from a reference to the work it shaped. Everything is saved as you go.
 */
export function Canvas({ p, Sheet }: { p: Project; Sheet: React.FC<{ children: React.ReactNode; onClose: () => void }> }) {
  const board = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('select');
  const [picker, setPicker] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const drag = useRef<Drag | null>(null);
  const [live, setLive] = useState<{ id: string; x: number; y: number; w?: number; h?: number } | null>(null);
  const [groupDraft, setGroupDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const items = [...p.moodboard].sort((a, b) => a.z - b.z);
  const notes = p.notes ?? [];
  const groups = p.groups ?? [];
  const available = p.assets.filter((a) => !p.moodboard.some((m) => m.assetId === a.id));

  // palette: dominant colours of what's on the board (extracted once per asset)
  useEffect(() => {
    items.forEach((m) => {
      const a = assetOf(p, m.assetId);
      if (a && !a.palette && a.kind === 'image' && (a.thumb || a.src)) extractPalette(a.thumb ?? a.src!).then((pal) => pal.length && ws.patchAsset(p.id, a.id, { palette: pal }));
    });
  }, [items.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const palette = useMemo(() => {
    const seen: string[] = [];
    items.forEach((m) => (assetOf(p, m.assetId)?.palette ?? []).slice(0, 2).forEach((c) => seen.length < 10 && !seen.includes(c) && seen.push(c)));
    return seen;
  }, [items, p]);

  const pos = (e: React.PointerEvent) => {
    const r = board.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, r };
  };
  const box = (m: { x: number; y: number; w: number }, a?: Asset) => {
    const h = a ? m.w * (a.h / a.w) * BOARD * 1.12 : m.w * 0.6;
    return { x: m.x, y: m.y, w: m.w, h };
  };

  const onBoardDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) return;
    const { x, y } = pos(e);
    if (mode === 'note') {
      const id = ws.addNote(p.id, x, y);
      setFocus(id);
      setMode('select');
      return;
    }
    if (mode === 'group') {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      drag.current = { kind: 'group', id: '__new', sx: x, sy: y, x, y, moved: false };
      setGroupDraft({ x, y, w: 0, h: 0 });
      return;
    }
    setFocus(null);
    setLinkFrom(null);
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !board.current) return;
    const { x, y } = pos(e);
    if (d.id === '__new') {
      setGroupDraft({ x: Math.min(d.sx, x), y: Math.min(d.sy, y), w: Math.abs(x - d.sx), h: Math.abs(y - d.sy) });
      return;
    }
    const dx = x - d.sx;
    const dy = y - d.sy;
    if (Math.abs(dx) + Math.abs(dy) > 0.004) d.moved = true;
    if (d.kind === 'resize') setLive({ id: d.id, x: d.x, y: d.y, w: Math.max(0.08, (d.w ?? 0.2) + dx), h: Math.max(0.08, (d.h ?? 0.2) + dy) });
    else setLive({ id: d.id, x: Math.min(0.97, Math.max(-0.05, d.x + dx)), y: Math.min(0.95, Math.max(-0.05, d.y + dy)) });
  };

  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.id === '__new' && groupDraft) {
      if (groupDraft.w > 0.05 && groupDraft.h > 0.05) {
        const label = window.prompt(t('Name this group'), t('Group')) ?? t('Group');
        ws.addGroup(p.id, { ...groupDraft, label });
      }
      setGroupDraft(null);
      setMode('select');
      return;
    }
    if (d && live && d.moved) {
      if (d.kind === 'item') ws.moveMood(p.id, d.id, { x: live.x, y: live.y }, t('Moved on moodboard'));
      if (d.kind === 'note') ws.patchNote(p.id, d.id, { x: live.x, y: live.y });
      if (d.kind === 'group') ws.patchGroup(p.id, d.id, { x: live.x, y: live.y });
      if (d.kind === 'resize') ws.patchGroup(p.id, d.id, { w: live.w, h: live.h });
    }
    setLive(null);
  };

  const start = (e: React.PointerEvent, kind: Drag['kind'], id: string, at: { x: number; y: number; w?: number; h?: number }) => {
    e.stopPropagation();
    (board.current as HTMLElement).setPointerCapture(e.pointerId);
    const { x, y } = pos(e);
    drag.current = { kind, id, sx: x, sy: y, x: at.x, y: at.y, w: at.w, h: at.h, moved: false };
  };

  const clickItem = (assetId: string, mid: string) => {
    if (mode === 'link') {
      if (!linkFrom) {
        const a = assetOf(p, assetId);
        if (!a?.isReference) return toast(t('Start a thread from a reference'));
        setLinkFrom(assetId);
        return;
      }
      if (linkFrom === assetId) return setLinkFrom(null);
      const note = window.prompt(t('What did this reference change? (optional)'), '') ?? '';
      ws.linkInfluence(p.id, linkFrom, assetId, note);
      toast(t('Thread added'));
      setLinkFrom(null);
      setMode('select');
      return;
    }
    setFocus(mid);
  };

  // threads: reference → the work it shaped, when both are on the board
  const threads = items
    .map((m) => {
      const a = assetOf(p, m.assetId);
      if (!a?.influences) return null;
      const target = items.find((x) => x.assetId === a.influences!.assetId);
      if (!target) return null;
      const ta = assetOf(p, target.assetId);
      const ma = live?.id === m.id ? { ...m, ...live } : m;
      const mt = live?.id === target.id ? { ...target, ...live } : target;
      const b1 = box(ma, a);
      const b2 = box(mt, ta);
      return { id: m.id, from: a, x1: b1.x + b1.w / 2, y1: b1.y + b1.h / 2, x2: b2.x + b2.w / 2, y2: b2.y + b2.h / 2, text: a.influences.text };
    })
    .filter(Boolean) as { id: string; from: Asset; x1: number; y1: number; x2: number; y2: number; text: string }[];

  const tools: { id: Mode; label: string; icon: React.ReactNode }[] = [
    { id: 'select', label: t('Move'), icon: <MousePointer2 size={14} /> },
    { id: 'note', label: t('Note'), icon: <StickyNote size={14} /> },
    { id: 'group', label: t('Group'), icon: <BoxSelect size={14} /> },
    { id: 'link', label: t('Thread'), icon: <Link2 size={14} /> },
  ];

  return (
    <div className="flex flex-1 flex-col lg:min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 md:px-6">
        <div className="flex items-center gap-1 rounded-full border border-[var(--rule)] p-0.5" role="radiogroup" aria-label={t('Tool')}>
          {tools.map((tl) => (
            <button key={tl.id} role="radio" aria-checked={mode === tl.id} title={tl.label} onClick={() => (setMode(tl.id), setLinkFrom(null))} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium" style={{ background: mode === tl.id ? 'var(--ink)' : 'transparent', color: mode === tl.id ? 'var(--paper)' : 'var(--ink-2)' }}>
              {tl.icon} <span className="max-sm:sr-only">{tl.label}</span>
            </button>
          ))}
        </div>
        {palette.length > 0 && (
          <div className="flex items-center gap-2" aria-label={t('Project palette')}>
            <span className="f2-mono text-[var(--ink-2)]">{t('Palette')}</span>
            <div className="flex overflow-hidden rounded-full border border-[var(--rule)]" dir="ltr">
              {palette.map((c) => (
                <button key={c} title={c} onClick={() => navigator.clipboard?.writeText(c).then(() => toast(t('{c} copied', { c })))} className="h-6 w-6" style={{ background: c }} aria-label={c} />
              ))}
            </div>
          </div>
        )}
        <div className="flex shrink-0 gap-2">
          <FilePick accept={ACCEPT} onFiles={(f) => upload(f, p.id, { isReference: true, then: (a) => ws.addToMoodboard(p.id, a.id) })} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--rule)] px-3 text-[13px] font-medium hover:bg-black/[0.04]">
            <Upload size={14} /> <span className="hidden sm:inline">{t('Upload')}</span>
          </FilePick>
          <button onClick={() => setPicker(true)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--ink)] px-3.5 text-[13px] font-semibold text-[var(--paper)]">
            <Plus size={14} /> {t('From materials')}
          </button>
        </div>
      </div>
      <p className="px-5 pt-2 text-[12.5px] text-[var(--ink-2)] md:px-6" aria-live="polite">
        {mode === 'note'
          ? t('Click anywhere to place a note.')
          : mode === 'group'
            ? t('Drag to frame a group.')
            : mode === 'link'
              ? linkFrom
                ? t('Now click the work this reference shaped.')
                : t('Click a reference to start a thread.')
              : p.moodboard.length
                ? t('Drag to arrange. Arrow keys nudge, Delete removes. Threads show which reference shaped which work.')
                : t('Arrange references next to the work they shape.')}
      </p>
      <div className="relative flex-1 p-4 md:p-6 lg:min-h-0">
        <div
          ref={board}
          dir="ltr"
          className="relative mx-auto w-full overflow-hidden rounded-[8px] bg-[var(--paper-2)] shadow-[inset_0_0_0_1px_var(--rule)]"
          style={{ aspectRatio: '16/10', maxHeight: '100%', backgroundImage: 'radial-gradient(rgba(21,19,15,0.12) 1px, transparent 1px)', backgroundSize: '24px 24px', cursor: mode === 'note' || mode === 'group' ? 'crosshair' : 'default', touchAction: mode === 'group' ? 'none' : 'auto' }}
          onPointerDown={onBoardDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          {/* groups sit behind everything */}
          {groups.map((g) => {
            const gg = live?.id === g.id ? { ...g, ...live } : g;
            return (
              <div key={g.id} className="absolute rounded-[10px] border-2 border-dashed border-[var(--ink)]/25 bg-white/20" style={{ left: `${gg.x * 100}%`, top: `${gg.y * 100}%`, width: `${(gg.w ?? g.w) * 100}%`, height: `${(gg.h ?? g.h) * 100}%`, zIndex: 0 }}>
                <span
                  onPointerDown={(e) => start(e, 'group', g.id, g)}
                  onDoubleClick={() => {
                    const l = window.prompt(t('Rename group'), g.label);
                    if (l != null) ws.patchGroup(p.id, g.id, { label: l });
                  }}
                  className="f2-mono absolute -top-3 left-3 cursor-grab touch-none rounded bg-[var(--paper)] px-2 py-0.5 !text-[10.5px] text-[var(--ink)] shadow-sm"
                >
                  {g.label}
                  <button onPointerDown={(e) => e.stopPropagation()} onClick={() => (ws.removeGroup(p.id, g.id), toast(t('Group removed'), { undo: true }))} className="ms-2 opacity-50 hover:opacity-100" aria-label={t('Remove group')}>
                    ×
                  </button>
                </span>
                <span onPointerDown={(e) => start(e, 'resize', g.id, g)} className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize touch-none" aria-hidden />
              </div>
            );
          })}
          {groupDraft && <div className="pointer-events-none absolute rounded-[10px] border-2 border-dashed border-[var(--signal)]" style={{ left: `${groupDraft.x * 100}%`, top: `${groupDraft.y * 100}%`, width: `${groupDraft.w * 100}%`, height: `${groupDraft.h * 100}%` }} />}

          {/* threads */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none" style={{ zIndex: 500 }} aria-hidden>
            {threads.map((th) => {
              const mx = (th.x1 + th.x2) / 2;
              const my = Math.min(th.y1, th.y2) - 0.08;
              return <path key={th.id} d={`M ${th.x1} ${th.y1} Q ${mx} ${my} ${th.x2} ${th.y2}`} fill="none" stroke="var(--signal)" strokeWidth={1.75} strokeDasharray="6 5" vectorEffect="non-scaling-stroke" opacity={focus === th.id ? 1 : 0.7} />;
            })}
          </svg>
          {threads
            .filter((th) => focus === th.id || focus === items.find((x) => x.assetId === th.from.influences?.assetId)?.id)
            .map((th) => (
            <span key={`l-${th.id}`} className="pointer-events-none absolute max-w-[22%] -translate-x-1/2 -translate-y-1/2 truncate rounded-full bg-[var(--signal)] px-2 py-0.5 text-[clamp(8px,0.75vw,11px)] font-semibold text-[var(--signal-ink)]" style={{ left: `${((th.x1 + th.x2) / 2) * 100}%`, top: `${((th.y1 + th.y2) / 2 - 0.04) * 100}%`, zIndex: 501 }} title={th.text}>
              {th.text || t('shaped')}
            </span>
            ))}

          {items.length === 0 && notes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
              <p className="f2-display text-[32px]">{t('An empty wall.')}</p>
              <p className="max-w-[24rem] text-[14px] text-[var(--ink-2)]">{t('Pin references from Materials or upload new ones. Positions are saved as you go.')}</p>
              <button onClick={() => setPicker(true)} className="f2-btn f2-btn-ghost !min-h-[40px]">
                <Plus size={15} /> {t('Add from materials')}
              </button>
            </div>
          )}

          {items.map((m) => {
            const a = assetOf(p, m.assetId);
            if (!a) return null;
            const ps = live?.id === m.id ? live : m;
            const isF = focus === m.id;
            const isLinkSrc = linkFrom === m.assetId;
            return (
              <motion.div
                key={m.id}
                role="button"
                tabIndex={0}
                aria-label={a.title}
                className="absolute cursor-grab touch-none select-none active:cursor-grabbing"
                style={{ left: `${ps.x * 100}%`, top: `${ps.y * 100}%`, width: `${m.w * 100}%`, zIndex: m.z, rotate: m.rot }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: live?.id === m.id ? 1.03 : 1 }}
                transition={{ duration: 0.25, ease }}
                onPointerDown={(e) => {
                  if (mode === 'link') return;
                  start(e, 'item', m.id, m);
                  ws.bringToFront(p.id, m.id);
                }}
                onClick={() => clickItem(m.assetId, m.id)}
                onKeyDown={(e) => {
                  const step = e.shiftKey ? 0.05 : 0.01;
                  const map: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
                  if (map[e.key]) {
                    e.preventDefault();
                    ws.moveMood(p.id, m.id, { x: m.x + map[e.key][0], y: m.y + map[e.key][1] });
                  }
                  if (e.key === 'Delete' || e.key === 'Backspace') {
                    ws.removeFromMoodboard(p.id, m.id);
                    toast(t('Removed “{name}” from moodboard', { name: a.title }), { undo: true });
                  }
                }}
                onFocus={() => setFocus(m.id)}
              >
                <div className="overflow-hidden rounded-[2px] bg-white p-[5%] shadow-[0_14px_28px_-14px_rgba(21,19,15,0.55)]" style={{ outline: isF || isLinkSrc ? '2px solid var(--signal)' : 'none', outlineOffset: 3 }}>
                  <div style={{ aspectRatio: `${a.w}/${a.h}` }} className="overflow-hidden">
                    <AssetThumb asset={a} className="h-full w-full" alt={a.title} />
                  </div>
                  <p className="mt-[4%] flex items-center justify-between gap-1 truncate text-[clamp(8px,0.8vw,11px)] font-medium">
                    <span className="truncate">{a.title}</span>
                    {a.isReference && <span className="shrink-0 text-[0.85em] text-[var(--ink-2)]">ref</span>}
                  </p>
                </div>
                {isF && mode === 'select' && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      ws.removeFromMoodboard(p.id, m.id);
                      toast(t('Removed “{name}” from moodboard', { name: a.title }), { undo: true });
                    }}
                    aria-label={t('Remove from moodboard')}
                    className="absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ink)] text-[var(--paper)] shadow"
                  >
                    <X size={13} />
                  </button>
                )}
              </motion.div>
            );
          })}

          {notes.map((n) => {
            const ps = live?.id === n.id ? live : n;
            return (
              <div key={n.id} className="absolute" style={{ left: `${ps.x * 100}%`, top: `${ps.y * 100}%`, width: `${n.w * 100}%`, zIndex: n.z + 600 }}>
                <div className="rounded-[3px] bg-[#f6e7a8] shadow-[0_10px_20px_-12px_rgba(0,0,0,0.5)]">
                  <div onPointerDown={(e) => start(e, 'note', n.id, n)} className="flex h-4 cursor-grab touch-none items-center justify-end px-1">
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={() => (ws.removeNote(p.id, n.id), toast(t('Note removed'), { undo: true }))} aria-label={t('Remove note')} className="text-[11px] opacity-40 hover:opacity-100">
                      ×
                    </button>
                  </div>
                  <NoteText value={n.text} autoFocus={focus === n.id && !n.text} onSave={(v) => ws.patchNote(p.id, n.id, { text: v })} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <AnimatePresence>
        {picker && (
          <Sheet onClose={() => setPicker(false)}>
            <h2 className="f2-display text-[28px]">{t('Add to moodboard')}</h2>
            {available.length === 0 ? (
              <p className="mt-3 text-[14px] text-[var(--ink-2)]">{t('Every material is already on the board. Upload new references to add more.')}</p>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {available.map((a) => (
                  <Tile key={a.id} a={a} p={p} onClick={() => (ws.addToMoodboard(p.id, a.id), toast(t('“{name}” pinned', { name: a.title })))} />
                ))}
              </div>
            )}
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  );
}

function NoteText({ value, onSave, autoFocus }: { value: string; onSave: (v: string) => void; autoFocus?: boolean }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <textarea
      autoFocus={autoFocus}
      value={v}
      rows={3}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onSave(v)}
      onPointerDown={(e) => e.stopPropagation()}
      placeholder={t('Write a note…')}
      aria-label={t('Note')}
      dir="auto"
      className="block w-full resize-none bg-transparent px-2 pb-2 text-[clamp(9px,0.9vw,13px)] leading-snug outline-none"
    />
  );
}
