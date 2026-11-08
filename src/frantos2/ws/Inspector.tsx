import React, { useEffect, useState } from 'react';
import { ArrowRight, BookImage, Check, Columns2, Eye, ImagePlus, LayoutGrid, MessageSquare, Presentation, Star, Trash2, Upload } from 'lucide-react';
import { Asset, Project } from './types';
import { openComments, workOfAsset, ws } from './store';
import { go } from '../route';
import { AssetThumb, toast } from './kit';
import { FilePick, upload } from './uploads';
import { ACCEPT } from './media';

/**
 * Context tools for the selected object.
 * Reference → source, note, "Add to moodboard". Work → versions, comments, compare, present.
 */
export function Inspector({ p, asset, onClose, compact }: { p: Project; asset: Asset; onClose?: () => void; compact?: boolean }) {
  const wv = workOfAsset(p, asset.id);
  const work = wv?.work;
  const onBoard = p.moodboard.some((m) => m.assetId === asset.id);
  const inPres = p.presentation.includes(asset.id);
  const inStory = p.story.some((s) => s.assetId === asset.id);
  const inPortfolio = p.portfolio.includes(asset.id);
  const isCover = p.coverAssetId === asset.id;
  const workComments = work ? p.comments.filter((c) => c.workId === work.id) : [];
  const open = workComments.filter((c) => !c.resolved).length;
  const approved = !!work && work.approvedVersionId === wv?.version.id;
  const influenced = asset.influences ? p.assets.find((a) => a.id === asset.influences!.assetId) : undefined;

  const reviewLink = (extra = '') => (work ? `/p/${p.id}/review/${work.id}?v=${wv!.version.id}${extra}` : '');

  return (
    <div className="flex flex-col gap-4">
      <div className={`relative overflow-hidden rounded-[4px] bg-[var(--graphite)] ${compact ? 'aspect-[16/10]' : 'aspect-[4/5]'}`}>
        <AssetThumb asset={asset} size="full" fit="contain" className="absolute inset-0 h-full w-full" alt={asset.title} />
        {asset.kind === 'video' && <span className="f2-mono absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 !text-[10px] text-white">Motion</span>}
      </div>

      <div>
        <p className="f2-mono text-[var(--ink-2)]">{asset.isReference ? 'Reference' : work ? `${work.title} · v${wv!.version.n}${approved ? ' · approved' : ''}` : 'Material'}</p>
        <EditableTitle value={asset.title} onSave={(t) => ws.patchAsset(p.id, asset.id, { title: t })} />
      </div>

      {asset.isReference ? (
        <>
          <Field label="Source" value={asset.source ?? ''} placeholder="Where it's from: link, book, shoot…" onSave={(v) => ws.patchAsset(p.id, asset.id, { source: v })} />
          <Field label="Note" value={asset.note ?? ''} placeholder="Why it matters for this project" multiline onSave={(v) => ws.patchAsset(p.id, asset.id, { note: v })} />
          {asset.influences && influenced && (
            <button onClick={() => go(`/p/${p.id}/materials?a=${influenced.id}`)} className="flex items-center gap-3 rounded-[6px] border border-[var(--rule)] p-2 text-left hover:bg-black/[0.03]">
              <span className="h-14 w-11 shrink-0 overflow-hidden rounded-[2px]">
                <AssetThumb asset={influenced} className="h-full w-full" />
              </span>
              <span className="min-w-0">
                <span className="f2-mono block text-[var(--ink-2)]">Shaped → {influenced.title}</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug">{asset.influences.text}</span>
              </span>
            </button>
          )}
          <div className="flex flex-wrap gap-2">
            <Act primary={!onBoard} on={onBoard} onClick={() => (onBoard ? go(`/p/${p.id}/moodboard`) : (ws.addToMoodboard(p.id, asset.id), toast('Added to moodboard')))} icon={onBoard ? <Check size={14} /> : <LayoutGrid size={14} />}>
              {onBoard ? 'On moodboard' : 'Add to moodboard'}
            </Act>
            <Act
              onClick={() => {
                const wid = ws.workFromAsset(p.id, asset.id);
                go(`/p/${p.id}/review/${wid}`);
              }}
              icon={<MessageSquare size={14} />}
            >
              Start review
            </Act>
          </div>
        </>
      ) : (
        <>
          {work ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {work.versions.map((v) => (
                  <span key={v.id} className="rounded-full border px-2 py-0.5 text-[11.5px] font-medium" style={{ borderColor: v.id === wv!.version.id ? 'var(--ink)' : 'var(--rule)' }}>
                    v{v.n}
                    {work.approvedVersionId === v.id && ' ✓'}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Act primary onClick={() => go(reviewLink())} icon={<MessageSquare size={14} />}>
                  Review{open ? ` · ${open} open` : ''}
                </Act>
                {work.versions.length > 1 && (
                  <Act
                    onClick={() => {
                      const prev = [...work.versions].sort((a, b) => b.n - a.n).find((v) => v.n < wv!.version.n) ?? work.versions[0];
                      go(reviewLink(`&cmp=${prev.id}`));
                    }}
                    icon={<Columns2 size={14} />}
                  >
                    Compare versions
                  </Act>
                )}
                <FilePick
                  accept={ACCEPT}
                  multiple={false}
                  onFiles={(f) =>
                    upload(f, p.id, {
                      isReference: false,
                      then: (a) => {
                        const vid = ws.addVersion(p.id, work.id, a.id);
                        toast(`Version added to ${work.title}`);
                        go(`/p/${p.id}/review/${work.id}?v=${vid}&cmp=${wv!.version.id}`);
                      },
                    })
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--rule)] px-3 text-[13px] font-medium hover:bg-black/[0.04]"
                >
                  <Upload size={14} /> New version
                </FilePick>
              </div>
            </>
          ) : (
            <Act
              primary
              onClick={() => {
                const wid = ws.workFromAsset(p.id, asset.id);
                go(`/p/${p.id}/review/${wid}`);
              }}
              icon={<MessageSquare size={14} />}
            >
              Start review
            </Act>
          )}
          <div className="border-t border-[var(--rule)] pt-3">
            <p className="f2-mono mb-2 text-[var(--ink-2)]">Use it</p>
            <div className="flex flex-wrap gap-2">
              <Act on={inPres} onClick={() => ws.togglePresentation(p.id, asset.id)} icon={<Presentation size={14} />}>
                {inPres ? 'In presentation' : 'Add to presentation'}
              </Act>
              <Act on={inStory} onClick={() => (inStory ? go(`/p/${p.id}/stories`) : (ws.addToStory(p.id, asset.id), toast('Added to Story')))} icon={<BookImage size={14} />}>
                {inStory ? 'In Story' : 'Add to Story'}
              </Act>
              <Act on={inPortfolio} onClick={() => ws.togglePortfolio(p.id, asset.id)} icon={<Star size={14} fill={inPortfolio ? 'currentColor' : 'none'} />}>
                {inPortfolio ? 'Portfolio pick' : 'Pick for portfolio'}
              </Act>
              <Act on={onBoard} onClick={() => (onBoard ? ws.removeFromMoodboard(p.id, p.moodboard.find((m) => m.assetId === asset.id)!.id) : ws.addToMoodboard(p.id, asset.id))} icon={<LayoutGrid size={14} />}>
                {onBoard ? 'On moodboard' : 'Moodboard'}
              </Act>
              {!isCover && (
                <Act onClick={() => (ws.setCover(p.id, asset.id), toast('Project cover updated'))} icon={<ImagePlus size={14} />}>
                  Set as cover
                </Act>
              )}
            </div>
            {inPortfolio && <p className="mt-2 text-[12px] leading-snug text-[var(--ink-2)]">Picked for portfolio — not published. Publishing needs a server; nothing leaves this browser.</p>}
          </div>
        </>
      )}

      <div className="flex items-center justify-between border-t border-[var(--rule)] pt-3">
        {!asset.isReference && work ? (
          <button onClick={() => go(`/p/${p.id}/present/0`)} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--ink-2)] hover:text-[var(--ink)]">
            <Eye size={14} /> Preview presentation
          </button>
        ) : (
          <span />
        )}
        <button
          onClick={() => {
            ws.deleteAsset(p.id, asset.id);
            onClose?.();
            toast(`Deleted “${asset.title}”`, { undo: true });
          }}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[12.5px] font-medium text-[var(--ink-2)] hover:bg-black/5 hover:text-[var(--ink)]"
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </div>
  );
}

export function Act({ children, onClick, icon, primary, on }: { children: React.ReactNode; onClick: () => void; icon?: React.ReactNode; primary?: boolean; on?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors"
      style={{
        background: primary ? 'var(--ink)' : on ? 'rgba(21,19,15,0.06)' : 'transparent',
        color: primary ? 'var(--paper)' : 'var(--ink)',
        borderColor: primary ? 'var(--ink)' : 'var(--rule)',
      }}
    >
      {icon}
      {children}
    </button>
  );
}

function EditableTitle({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v.trim() && v !== value && onSave(v)}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      aria-label="Title"
      className="f2-display mt-1 w-full rounded bg-transparent text-[26px] leading-tight outline-none focus:bg-black/[0.04]"
    />
  );
}

function Field({ label, value, placeholder, onSave, multiline }: { label: string; value: string; placeholder: string; onSave: (v: string) => void; multiline?: boolean }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const common = {
    value: v,
    placeholder,
    'aria-label': label,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV(e.target.value),
    onBlur: () => v !== value && onSave(v),
    className: 'mt-1 w-full rounded-[4px] border border-[var(--rule)] bg-white/40 px-2.5 py-2 text-[13.5px] leading-snug outline-none focus:border-[var(--ink)]',
  };
  return (
    <label className="block">
      <span className="f2-mono text-[var(--ink-2)]">{label}</span>
      {multiline ? <textarea rows={3} {...common} /> : <input {...common} />}
    </label>
  );
}
