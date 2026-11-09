import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Box, FolderInput, Image as ImageIcon, Pencil, Search, Sun, Upload, Video, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { go } from '../route';
import { useWs, ws } from '../ws/store';
import type { Asset, MediaKind, Project } from '../ws/types';
import { AssetThumb, toast } from '../ws/kit';
import { assetUrl, extractPalette } from '../ws/media';
import { FilePick, upload, useDropZone } from '../ws/uploads';
import { GlassPage } from '../glass/Shell';
import { Pane, lgEase } from '../glass/kit';
import { dist } from '../studio/palette';

type Row = { a: Asset; p: Project };
const KINDS: { id: 'all' | MediaKind | 'ref'; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All', icon: Search },
  { id: 'image', label: 'Images', icon: ImageIcon },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'model', label: '3D', icon: Box },
  { id: 'env', label: 'HDRI', icon: Sun },
  { id: 'ref', label: 'References', icon: FolderInput },
];

/**
 * Every file from every project in one grid: search by name or #tag, filter by kind,
 * click a colour to find pictures with it. Drop files to add them to a project.
 */
export function LibraryPage() {
  const { t } = useI18n();
  const { state } = useWs();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<(typeof KINDS)[number]['id']>('all');
  const [colour, setColour] = useState<string | null>(null);
  const [copy, setCopy] = useState<Row | null>(null);
  const target = state.projects.find((p) => p.id === state.lastProjectId) ?? state.projects.find((p) => p.kind === 'user') ?? state.projects[0];

  // pictures that came without colours (demo files, older uploads): read them once, quietly
  useEffect(() => {
    let live = true;
    (async () => {
      const todo = state.projects.flatMap((p) => p.assets.filter((a) => a.kind === 'image' && !a.palette).map((a) => ({ p, a }))).slice(0, 40);
      for (const { p, a } of todo) {
        if (!live) return;
        const u = await assetUrl(a, 'thumb');
        if (!u) continue;
        const pal = await extractPalette(u);
        if (live && pal.length) ws.patchAsset(p.id, a.id, { palette: pal });
      }
    })();
    return () => {
      live = false;
    };
  }, [state.projects.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo<Row[]>(() => state.projects.flatMap((p) => p.assets.map((a) => ({ a, p }))).sort((x, y) => y.a.createdAt - x.a.createdAt), [state.projects]);
  const colours = useMemo(() => {
    const out: string[] = [];
    rows.forEach(({ a }) => (a.palette ?? []).slice(0, 2).forEach((c) => out.length < 18 && out.every((o) => dist(o, c) > 70) && out.push(c)));
    state.projects.forEach((p) => (p.palette ?? []).forEach((c) => out.length < 18 && out.every((o) => dist(o, c) > 70) && out.push(c)));
    return out;
  }, [rows, state.projects]);
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(({ a, p }) => {
    if (kind === 'ref' ? !a.isReference : kind !== 'all' && a.kind !== kind) return false;
    if (colour && !(a.palette ?? []).some((c) => dist(c, colour) < 110)) return false;
    if (!needle) return true;
    const tag = needle.startsWith('#') ? needle.slice(1) : null;
    return tag ? (a.tags ?? []).some((x) => x.toLowerCase().includes(tag)) : `${a.title} ${p.title} ${(a.tags ?? []).join(' ')} ${a.note ?? ''}`.toLowerCase().includes(needle);
  });

  const drop = useDropZone((files) => {
    if (!target) return;
    upload(files, target.id, { isReference: true });
    toast(t('Adding to {name}', { name: target.title }));
  });

  const open = ({ a, p }: Row) => {
    if (a.kind === 'model') {
      const o = (p.objects ?? []).find((x) => x.source.kind === 'model' && x.source.assetId === a.id);
      return go(o ? `/s/${p.id}?o=${o.id}` : `/s/${p.id}`);
    }
    if (a.kind === 'env') return go(`/s/${p.id}`);
    const w = p.works.find((x) => x.versions.some((v) => v.assetId === a.id));
    go(w ? `/p/${p.id}?i=${w.id}` : `/p/${p.id}?s=collect&i=${a.id}`);
  };

  return (
    <GlassPage
      kicker={t('Library')}
      title={t('{n} files across {m} projects', { n: rows.length, m: state.projects.length })}
      lead={t('Search by name or #tag, filter by kind, or click a colour to find pictures that carry it. Drop files anywhere to add them.')}
      bg="/projects/form-01/ref-travertine.webp"
      wide
      action={
        target && (
          <FilePick onFiles={(f) => (upload(f, target.id, { isReference: true }), toast(t('Adding to {name}', { name: target.title })))} className="lg-btn lg-btn-primary">
            <Upload size={16} /> {t('Add files')}
          </FilePick>
        )
      }
    >
      <div {...drop.props} className="relative">
        {drop.over && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-[28px] border-2 border-dashed border-white/70 bg-black/30 text-[18px] font-bold">
            {t('Drop to add to {name}', { name: target?.title ?? '' })}
          </div>
        )}
        <Pane className="flex flex-wrap items-center gap-2 rounded-[26px] p-2">
          <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-full px-3 lg-soft">
            <Search size={15} className="text-white/60" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search files, projects, #tags…')} aria-label={t('Search')} className="h-10 flex-1 bg-transparent text-[14px] outline-none placeholder:text-white/45" />
            {q && (
              <button type="button" onClick={() => setQ('')} aria-label={t('Clear')} className="text-white/60">
                <X size={14} />
              </button>
            )}
          </label>
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={t('Kind')}>
            {KINDS.map((k) => (
              <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} onClick={() => setKind(k.id)} className={`flex min-h-[38px] items-center gap-1.5 rounded-full px-3 text-[13px] font-bold ${kind === k.id ? 'bg-white text-[#11151a]' : 'text-white/80 hover:bg-white/10'}`}>
                <k.icon size={14} /> {t(k.label)}
              </button>
            ))}
          </div>
        </Pane>
        {colours.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label={t('Find by colour')}>
            <span className="lg-label lg-shadow-text me-1">{t('By colour')}</span>
            {colours.map((c) => (
              <button key={c} type="button" onClick={() => setColour(colour === c ? null : c)} aria-pressed={colour === c} title={c} aria-label={c} className={`h-7 w-7 rounded-full ring-1 ring-white/40 transition-transform hover:scale-110 ${colour === c ? 'ring-2 ring-white ring-offset-2 ring-offset-black/40' : ''}`} style={{ background: c }} />
            ))}
            {colour && (
              <button type="button" onClick={() => setColour(null)} className="lg-btn lg-btn-plain min-h-[30px] px-2 text-[12px]">
                <X size={12} /> {t('Any colour')}
              </button>
            )}
          </div>
        )}

        {shown.length === 0 ? (
          <Pane className="mt-6 rounded-[26px] p-10 text-center">
            <p className="text-[17px] font-bold">{t('Nothing matches')}</p>
            <p className="mt-1 text-[14px] text-white/70">{t('Try another word, kind or colour.')}</p>
          </Pane>
        ) : (
          <ul className="mt-5 columns-2 gap-3 sm:columns-3 lg:columns-4 2xl:columns-6">
            {shown.slice(0, 240).map((r, i) => (
              <motion.li key={r.p.id + r.a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: lgEase, delay: Math.min(i, 20) * 0.02 }} className="group relative mb-3 break-inside-avoid">
                <button type="button" onClick={() => open(r)} className="block w-full overflow-hidden rounded-[18px] text-start ring-1 ring-white/15 focus-visible:ring-2 focus-visible:ring-white">
                  {r.a.kind === 'image' || r.a.kind === 'video' ? (
                    <AssetThumb asset={r.a} className="w-full" />
                  ) : (
                    <span className="flex aspect-square w-full items-center justify-center bg-white/10">{r.a.kind === 'model' ? <Box size={28} /> : <Sun size={28} />}</span>
                  )}
                  <span className="lg-glass absolute inset-x-1.5 bottom-1.5 block rounded-[13px] px-2.5 py-1.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                    <span dir="auto" className="block truncate text-[12.5px] font-bold">
                      {r.a.title}
                    </span>
                    <span dir="auto" className="block truncate text-[11px] text-white/70">
                      {r.p.title}
                      {r.a.isReference ? ` · ${t('reference')}` : ''}
                    </span>
                  </span>
                </button>
                <div className="absolute end-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                  {r.a.kind === 'image' && (
                    <button type="button" onClick={() => go(`/s/${r.p.id}?m=image&a=${r.a.id}`)} className="lg-glass flex h-8 w-8 items-center justify-center rounded-full" aria-label={t('Edit in the studio')} title={t('Edit in the studio')}>
                      <Pencil size={13} />
                    </button>
                  )}
                  <button type="button" onClick={() => setCopy(r)} className="lg-glass flex h-8 w-8 items-center justify-center rounded-full" aria-label={t('Add to another project')} title={t('Add to another project')}>
                    <FolderInput size={13} />
                  </button>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      {copy && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4" onClick={() => setCopy(null)}>
          <Pane strong className="w-full max-w-[420px] rounded-[26px] p-5" role="dialog" aria-modal aria-label={t('Add to another project')} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <p className="text-[17px] font-extrabold">{t('Add “{name}” to…', { name: copy.a.title })}</p>
            <div className="mt-3 flex max-h-[50vh] flex-col gap-1 overflow-y-auto lg-scroll">
              {state.projects
                .filter((p) => p.id !== copy.p.id)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      ws.addAsset(p.id, { ...copy.a, isReference: true, createdAt: Date.now() });
                      toast(t('Added to {name}', { name: p.title }));
                      setCopy(null);
                    }}
                    className="rounded-[14px] px-3 py-2.5 text-start text-[14px] font-bold hover:bg-white/10"
                  >
                    {p.title}
                  </button>
                ))}
            </div>
          </Pane>
        </div>
      )}
    </GlassPage>
  );
}
