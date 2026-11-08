import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookImage, Check, CheckCircle2, Columns2, Crosshair, MessageSquarePlus, Play, Presentation, RotateCcw, Star, Timer, Upload, X } from 'lucide-react';
import { Comment, Project, Version, Work } from './types';
import { assetOf, ws } from './store';
import { go } from '../route';
import { AssetThumb, Kbd, ago, ease, toast, useMedia } from './kit';
import { PinView, WorkCanvas } from './WorkCanvas';
import { VideoHandle, VideoWork } from './VideoWork';
import { FilePick, upload } from './uploads';
import { ACCEPT, fmtTime } from './media';
import { Act } from './Inspector';

type Filter = 'open' | 'resolved' | 'all';

export function Review({ p, workId, q }: { p: Project; workId?: string; q: URLSearchParams }) {
  const isDesktop = useMedia('(min-width: 1024px)');
  const works = p.works;
  const work = works.find((w) => w.id === workId) ?? works[0];

  if (!work) return <NoWorks p={p} />;
  return <ReviewWork key={work.id} p={p} work={work} q={q} isDesktop={isDesktop} />;
}

function ReviewWork({ p, work, q, isDesktop }: { p: Project; work: Work; q: URLSearchParams; isDesktop: boolean }) {
  const sorted = [...work.versions].sort((a, b) => a.n - b.n);
  const latest = sorted[sorted.length - 1];
  const vParam = q.get('v');
  const cur: Version = sorted.find((v) => v.id === vParam) ?? sorted.find((v) => v.id === work.approvedVersionId) ?? latest;
  const cmpParam = q.get('cmp');
  const cmp = cmpParam && cmpParam !== cur.id ? sorted.find((v) => v.id === cmpParam) : undefined;
  const activeId = q.get('c') ?? undefined;

  const asset = assetOf(p, cur.assetId)!;
  const cmpAsset = cmp ? assetOf(p, cmp.assetId) : undefined;
  const isVideo = work.kind === 'video';

  const [split, setSplit] = useState(50);
  const [placing, setPlacing] = useState(false);
  const [draft, setDraft] = useState<{ x?: number; y?: number; t?: number; versionId: string } | null>(null);
  const [filter, setFilter] = useState<Filter>('open');
  const video = useRef<VideoHandle>(null);

  const setQ = (patch: Record<string, string | undefined>, replace = true) => {
    const next = new URLSearchParams(q);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!next.get('v')) next.set('v', cur.id);
    go(`/p/${p.id}/review/${work.id}?${next.toString()}`, { replace });
  };

  // comments of this work, numbered once in creation order
  const all = useMemo(() => [...p.comments.filter((c) => c.workId === work.id)].sort((a, b) => a.createdAt - b.createdAt), [p.comments, work.id]);
  const num = (id: string) => all.findIndex((c) => c.id === id) + 1;
  const shown = all.filter((c) => c.id === activeId || (filter === 'all' ? true : filter === 'open' ? !c.resolved : c.resolved));
  const openCount = all.filter((c) => !c.resolved).length;

  const pins: PinView[] = all
    .filter((c) => c.pin && (c.versionId === cur.id || (cmp && c.versionId === cmp.id)))
    .filter((c) => filter === 'all' || c.id === activeId || (filter === 'open' ? !c.resolved : c.resolved))
    .map((c) => ({ c, n: num(c.id), side: cmp && c.versionId === cmp.id ? 'a' : 'b' }));

  // opening a deep link to a comment: show its version, reveal its side, seek its frame
  useEffect(() => {
    const c = all.find((x) => x.id === activeId);
    if (!c) return;
    if (c.resolved && filter === 'open') setFilter('all');
    if (c.t != null) video.current?.seek(c.t);
    if (cmp && c.pin) setSplit(c.versionId === cmp.id ? Math.min(96, Math.max(c.pin.x * 100 + 18, 55)) : Math.max(4, Math.min(c.pin.x * 100 - 18, 45)));
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectComment = (c: Comment) => {
    const patch: Record<string, string | undefined> = { c: c.id };
    if (c.versionId !== cur.id && (!cmp || c.versionId !== cmp.id)) patch.v = c.versionId;
    setQ(patch);
    if (c.t != null) video.current?.seek(c.t);
  };

  // keyboard: C = comment, Esc = cancel, [ ] = versions
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input,textarea,[contenteditable]')) return;
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        startComment();
      } else if (e.key === 'Escape') {
        setPlacing(false);
        setDraft(null);
      } else if (e.key === '[' || e.key === ']') {
        const i = sorted.findIndex((v) => v.id === cur.id);
        const j = Math.min(sorted.length - 1, Math.max(0, i + (e.key === ']' ? 1 : -1)));
        if (j !== i) setQ({ v: sorted[j].id, c: undefined, cmp: cmp?.id === sorted[j].id ? undefined : cmp?.id });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function startComment() {
    if (isVideo) {
      const t = video.current?.time() ?? 0;
      video.current?.pause();
      setDraft({ t, versionId: cur.id });
    } else {
      setPlacing((v) => !v);
      setDraft(null);
    }
  }

  const toggleCompare = () => {
    if (cmp) setQ({ cmp: undefined });
    else {
      const prev = [...sorted].reverse().find((v) => v.n < cur.n) ?? sorted.find((v) => v.id !== cur.id);
      if (prev) {
        setSplit(50);
        setQ({ cmp: prev.id });
      }
    }
  };

  const approved = work.approvedVersionId === cur.id;
  const inPres = p.presentation.includes(asset.id);
  const presIndex = p.presentation.indexOf(asset.id);

  const versionBar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-full bg-white/[0.06] p-1" role="radiogroup" aria-label="Version">
        {sorted.map((v) => {
          const on = v.id === cur.id;
          const isA = cmp?.id === v.id;
          return (
            <button
              key={v.id}
              role="radio"
              aria-checked={on}
              onClick={() => setQ({ v: v.id, c: undefined, cmp: isA ? cur.id : cmp?.id })}
              className="relative rounded-full px-3 py-1.5 text-[12.5px] font-semibold"
              style={{ color: on ? 'var(--ink)' : isA ? '#f3efe7' : 'var(--fog)' }}
              title={v.label}
            >
              {on && <motion.span layoutId={`vsel-${work.id}`} className="absolute inset-0 rounded-full bg-[#f3efe7]" transition={{ duration: 0.25, ease }} />}
              <span className="relative">
                {isA ? 'A · ' : cmp && on ? 'B · ' : ''}v{v.n}
                {work.approvedVersionId === v.id ? ' ✓' : ''}
              </span>
            </button>
          );
        })}
      </div>
      {!isVideo && sorted.length > 1 && (
        <button onClick={toggleCompare} aria-pressed={!!cmp} className="inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium" style={{ borderColor: cmp ? 'var(--signal)' : 'var(--line)', color: cmp ? 'var(--signal)' : '#f3efe7' }}>
          <Columns2 size={14} /> {cmp ? 'Comparing' : 'Compare A/B'}
        </button>
      )}
      <button onClick={startComment} aria-pressed={placing || !!draft} className="inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium" style={{ borderColor: placing || draft ? 'var(--signal)' : 'var(--line)', background: placing ? 'var(--signal)' : 'transparent', color: placing ? 'var(--signal-ink)' : '#f3efe7' }}>
        {isVideo ? <Timer size={14} /> : <Crosshair size={14} />}
        {isVideo ? 'Comment at time' : placing ? 'Click the work…' : 'Comment'}
        <span className="hidden opacity-60 md:inline">
          <Kbd>C</Kbd>
        </span>
      </button>
    </div>
  );

  const stage = (
    <div className="relative flex min-h-0 flex-col bg-[var(--graphite)] text-[#f3efe7]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 md:px-6">
        {versionBar}
        <div className="flex items-center gap-2">
          <FilePick
            accept={ACCEPT}
            multiple={false}
            onFiles={(f) =>
              upload(f, p.id, {
                isReference: false,
                then: (a) => {
                  const vid = ws.addVersion(p.id, work.id, a.id);
                  toast(`v${Math.max(...work.versions.map((v) => v.n)) + 1} added — comparing with v${cur.n}`);
                  go(`/p/${p.id}/review/${work.id}?v=${vid}&cmp=${cur.id}`, { replace: true });
                },
              })
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--line)] px-3 text-[12.5px] font-medium hover:bg-white/5"
          >
            <Upload size={14} /> New version
          </FilePick>
        </div>
      </div>

      <div className={`relative mx-3 mb-3 mt-3 md:mx-6 ${isDesktop ? 'min-h-0 flex-1' : isVideo ? 'h-[58vh]' : 'h-[54vh]'}`}>
        {isVideo ? (
          <VideoWork ref={video} asset={asset} comments={all.filter((c) => c.versionId === cur.id).map((c) => ({ c, n: num(c.id) }))} activeId={activeId} onMarker={(id) => selectComment(all.find((c) => c.id === id)!)} />
        ) : (
          <WorkCanvas
            b={asset}
            a={cmpAsset}
            split={split}
            onSplit={setSplit}
            pins={pins}
            activeId={activeId}
            onPin={(id) => selectComment(all.find((c) => c.id === id)!)}
            placing={placing}
            onPlace={(x, y) => {
              const onA = !!cmp && x * 100 <= split;
              setDraft({ x, y, versionId: onA ? cmp!.id : cur.id });
              setPlacing(false);
            }}
            draft={draft && draft.x != null ? { x: draft.x, y: draft.y! } : null}
            labelA={cmp ? `A · v${cmp.n}${cmp.label ? ` · ${cmp.label}` : ''}` : undefined}
            labelB={cmp ? `B · v${cur.n}${cur.label ? ` · ${cur.label}` : ''}` : undefined}
            layoutId={`work-${asset.id}`}
          />
        )}
        <AnimatePresence>
          {placing && (
            <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-full bg-[var(--signal)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--signal-ink)]">
              {cmp ? 'Click on A or B — the note goes to that version' : 'Click the detail you want to talk about'} · Esc to cancel
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-4 py-3 md:px-6">
        <div className="min-w-0">
          <p className="f2-mono text-[var(--fog)]">
            {work.title} · v{cur.n}
            {cur.label ? ` · ${cur.label}` : ''} · {ago(cur.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              ws.approve(p.id, work.id, approved ? undefined : cur.id);
              if (!approved) toast(`v${cur.n} approved`);
            }}
            aria-pressed={approved}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold"
            style={{ borderColor: approved ? '#7fbf8e' : 'var(--line)', color: approved ? '#9ad3a6' : '#f3efe7', background: approved ? 'rgba(127,191,142,0.1)' : 'transparent' }}
          >
            <CheckCircle2 size={14} /> {approved ? `v${cur.n} approved` : `Approve v${cur.n}`}
          </button>
          {inPres ? (
            <button onClick={() => go(`/p/${p.id}/present/${presIndex + 1}`)} className="f2-btn f2-btn-signal !min-h-[36px] !px-3.5 !text-[13px]">
              <Play size={13} fill="currentColor" /> Present
            </button>
          ) : (
            <button onClick={() => (ws.togglePresentation(p.id, asset.id, true), toast('Added to presentation'))} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--line)] px-3 text-[12.5px] font-medium hover:bg-white/5">
              <Presentation size={14} /> Add to presentation
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const side = (
    <div className="flex min-h-0 flex-col">
      {/* works switcher */}
      <div className="border-b border-[var(--rule)] px-4 pb-3 pt-4">
        <div className="f2-noscrollbar flex gap-2 overflow-x-auto">
          {p.works.map((w) => {
            const v = w.versions.find((x) => x.id === w.approvedVersionId) ?? w.versions[w.versions.length - 1];
            const a = assetOf(p, v.assetId);
            const open = p.comments.filter((c) => c.workId === w.id && !c.resolved).length;
            const on = w.id === work.id;
            return (
              <a key={w.id} href={`#/p/${p.id}/review/${w.id}`} aria-current={on} className="w-[76px] shrink-0">
                <span className="relative block h-[90px] overflow-hidden rounded-[3px] bg-[var(--graphite)]" style={{ outline: on ? '2px solid var(--ink)' : 'none', outlineOffset: 2 }}>
                  <AssetThumb asset={a} className="h-full w-full" />
                  {open > 0 && <span className="absolute right-1 top-1 rounded-full bg-[var(--signal)] px-1.5 text-[10px] font-bold text-[var(--signal-ink)]">{open}</span>}
                </span>
                <span className="mt-1 block truncate text-[11.5px] font-medium">{w.title}</span>
              </a>
            );
          })}
          <FilePick
            accept={ACCEPT}
            multiple={false}
            onFiles={(f) =>
              upload(f, p.id, {
                isReference: false,
                then: (a) => {
                  const wid = ws.workFromAsset(p.id, a.id);
                  go(`/p/${p.id}/review/${wid}`);
                },
              })
            }
            className="flex h-[90px] w-[76px] shrink-0 flex-col items-center justify-center gap-1 rounded-[3px] border border-dashed border-[var(--rule)] text-[11px] font-medium text-[var(--ink-2)] hover:bg-black/[0.03]"
            label="New work"
          >
            <Upload size={15} /> New work
          </FilePick>
        </div>
      </div>

      {/* discussion */}
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="text-[13px] font-semibold">
          Discussion <span className="font-medium text-[var(--ink-2)]">· {openCount} open</span>
        </h2>
        <div className="flex gap-0.5" role="radiogroup" aria-label="Show">
          {(['open', 'resolved', 'all'] as Filter[]).map((f) => (
            <button key={f} role="radio" aria-checked={filter === f} onClick={() => setFilter(f)} className="rounded-full px-2.5 py-1 text-[12px] font-medium capitalize" style={{ background: filter === f ? 'var(--ink)' : 'transparent', color: filter === f ? 'var(--paper)' : 'var(--ink-2)' }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {draft && (
          <Composer
            key="composer"
            label={draft.t != null ? `Note at ${fmtTime(draft.t)} on v${cur.n}` : `Note on v${sorted.find((v) => v.id === draft.versionId)?.n} · pinned`}
            onCancel={() => setDraft(null)}
            onSave={(text) => {
              const id = ws.addComment(p.id, { workId: work.id, versionId: draft.versionId, pin: draft.x != null ? { x: draft.x, y: draft.y! } : undefined, t: draft.t, text });
              setDraft(null);
              setFilter('open');
              setQ({ c: id });
              toast('Note added');
            }}
          />
        )}
      </AnimatePresence>

      <ul className={`flex flex-col gap-2 px-3 pb-4 ${isDesktop ? 'f2-scroll min-h-0 flex-1 overflow-y-auto' : ''}`}>
        {shown.length === 0 && (
          <li className="rounded-[8px] border border-dashed border-[var(--rule)] p-4 text-[13px] leading-relaxed text-[var(--ink-2)]">
            {filter === 'open' ? (
              <>
                Nothing open on this work.{' '}
                <button onClick={startComment} className="f2-link font-medium text-[var(--ink)]">
                  {isVideo ? 'Comment at the current frame' : 'Pin a note on the work'}
                </button>
                .
              </>
            ) : (
              'No notes here yet.'
            )}
          </li>
        )}
        {shown.map((c) => (
          <CommentCard key={c.id} scroll={isDesktop} p={p} c={c} n={num(c.id)} version={sorted.find((v) => v.id === c.versionId)} active={c.id === activeId} onSelect={() => selectComment(c)} />
        ))}
      </ul>

      {/* approved → use it, without re-uploading */}
      <div className="border-t border-[var(--rule)] px-4 py-4">
        <p className="f2-mono text-[var(--ink-2)]">{approved ? `v${cur.n} approved · use it` : 'Use this version'}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Act on={p.story.some((s) => s.assetId === asset.id)} onClick={() => (ws.addToStory(p.id, asset.id), toast('Added to Story'))} icon={<BookImage size={14} />}>
            {p.story.some((s) => s.assetId === asset.id) ? 'In Story' : 'Story frame'}
          </Act>
          <Act on={p.portfolio.includes(asset.id)} onClick={() => ws.togglePortfolio(p.id, asset.id)} icon={<Star size={14} fill={p.portfolio.includes(asset.id) ? 'currentColor' : 'none'} />}>
            {p.portfolio.includes(asset.id) ? 'Portfolio pick' : 'Pick for portfolio'}
          </Act>
        </div>
        <p className="mt-3 text-[11.5px] leading-snug text-[var(--ink-2)]">
          Visibility: project, presentation and portfolio picks are private to this browser. There's no server, so no share links or invites — nothing is published until FrantoS is connected to one.
        </p>
      </div>
    </div>
  );

  return isDesktop ? (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px]">
      {stage}
      <aside className="flex min-h-0 flex-col border-l border-[var(--rule)]">{side}</aside>
    </div>
  ) : (
    <div className="flex flex-col">
      {stage}
      {side}
    </div>
  );
}

function CommentCard({ p, c, n, version, active, onSelect, scroll }: { scroll: boolean; p: Project; c: Comment; n: number; version?: Version; active: boolean; onSelect: () => void }) {
  const [reply, setReply] = useState('');
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (active && scroll) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [active, scroll]);
  return (
    <motion.li ref={ref} layout transition={{ duration: 0.25, ease }} className="rounded-[8px] border p-3" style={{ borderColor: active ? 'var(--ink)' : 'var(--rule)', background: active ? 'rgba(255,255,255,0.45)' : 'transparent', opacity: c.resolved && !active ? 0.75 : 1 }}>
      <button onClick={onSelect} className="flex w-full gap-2.5 text-left" aria-label={`Go to note ${n}`}>
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full rounded-bl-[3px] text-[11px] font-bold" style={{ background: c.resolved ? 'var(--paper-3)' : 'var(--signal)', color: 'var(--ink)' }}>
          {c.resolved ? <Check size={12} strokeWidth={3} /> : n}
        </span>
        <span className="min-w-0 flex-1">
          <span className="f2-mono block !text-[10px] text-[var(--ink-2)]">
            v{version?.n} · {c.t != null ? `▶ ${fmtTime(c.t)}` : c.pin ? 'pinned' : 'general'} · {c.author} · {ago(c.createdAt)}
          </span>
          <span className="mt-1 block text-[13.5px] leading-snug">{c.text}</span>
        </span>
      </button>
      {c.replies.length > 0 && (
        <ul className="ml-8 mt-2 flex flex-col gap-1.5 border-l border-[var(--rule)] pl-3">
          {c.replies.map((r) => (
            <li key={r.id} className="text-[13px] leading-snug">
              <span className="f2-mono block !text-[10px] text-[var(--ink-2)]">
                {r.author} · {ago(r.createdAt)}
              </span>
              {r.text}
            </li>
          ))}
        </ul>
      )}
      {active && (
        <div className="ml-8 mt-3 flex flex-col gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!reply.trim()) return;
              ws.reply(p.id, c.id, reply.trim());
              setReply('');
            }}
          >
            <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply…" aria-label="Reply" className="w-full rounded-[6px] border border-[var(--rule)] bg-white/50 px-2.5 py-2 text-[13px] outline-none focus:border-[var(--ink)]" />
          </form>
          <div className="flex gap-2">
            <button
              onClick={() => {
                ws.resolve(p.id, c.id, !c.resolved);
                toast(c.resolved ? 'Note reopened' : 'Marked resolved');
              }}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold"
              style={{ background: c.resolved ? 'transparent' : 'var(--ink)', color: c.resolved ? 'var(--ink)' : 'var(--paper)', border: '1px solid var(--ink)' }}
            >
              {c.resolved ? <RotateCcw size={13} /> : <Check size={13} />}
              {c.resolved ? 'Reopen' : 'Resolve'}
            </button>
            <button
              onClick={() => {
                ws.deleteComment(p.id, c.id);
                toast('Note deleted', { undo: true });
              }}
              className="rounded-full px-3 py-1.5 text-[12.5px] font-medium text-[var(--ink-2)] hover:bg-black/5"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </motion.li>
  );
}

function Composer({ label, onSave, onCancel }: { label: string; onSave: (t: string) => void; onCancel: () => void }) {
  const [t, setT] = useState('');
  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22, ease }}
      className="mx-3 mb-3 overflow-hidden rounded-[8px] border-2 border-[var(--signal)] bg-white/60"
      onSubmit={(e) => {
        e.preventDefault();
        if (t.trim()) onSave(t.trim());
      }}
    >
      <div className="p-3">
        <p className="f2-mono flex items-center gap-1.5 text-[var(--ink-2)]">
          <MessageSquarePlus size={12} /> {label}
        </p>
        <textarea
          autoFocus
          rows={3}
          value={t}
          onChange={(e) => setT(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
              e.preventDefault();
              if (t.trim()) onSave(t.trim());
            }
            if (e.key === 'Escape') onCancel();
          }}
          placeholder="What should change here?"
          aria-label="Note"
          className="mt-2 w-full resize-none bg-transparent text-[14px] leading-snug outline-none"
        />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] text-[var(--ink-2)]">Enter to post · Shift+Enter new line · Esc cancel</span>
          <div className="flex gap-1.5">
            <button type="button" onClick={onCancel} aria-label="Cancel" className="rounded-full p-1.5 hover:bg-black/5">
              <X size={15} />
            </button>
            <button type="submit" disabled={!t.trim()} className="rounded-full bg-[var(--ink)] px-3.5 py-1.5 text-[12.5px] font-semibold text-[var(--paper)] disabled:opacity-35">
              Post
            </button>
          </div>
        </div>
      </div>
    </motion.form>
  );
}

function NoWorks({ p }: { p: Project }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-[520px] text-center">
        <p className="f2-mono text-[var(--ink-2)]">Review</p>
        <h2 className="f2-display mt-3 text-[40px] leading-none">Nothing to review yet.</h2>
        <p className="mt-3 text-[15px] text-[var(--ink-2)]">Upload a render or a motion file. When the next version comes in, put them side by side and pin notes right on the detail.</p>
        <FilePick
          accept={ACCEPT}
          multiple={false}
          onFiles={(f) =>
            upload(f, p.id, {
              isReference: false,
              then: (a) => {
                const wid = ws.workFromAsset(p.id, a.id);
                go(`/p/${p.id}/review/${wid}`);
              },
            })
          }
          className="f2-btn f2-btn-signal mt-6"
        >
          <Upload size={16} /> Upload first version
        </FilePick>
      </div>
    </div>
  );
}
