import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Box, Code2, FolderInput, Image as ImageIcon, Link2, Music, Pencil, PenTool, Search, Smartphone, Sparkles, Sun, Type as TypeIcon, Upload, Video, X } from 'lucide-react';
import { MaterialView } from '../kits/MaterialView';
import { kitOf } from '../kits/disciplines';
import { EasingPanel } from '../kits/Easing';
import { useI18n } from '../i18n';
import { go } from '../route';
import { useWs, ws } from '../ws/store';
import type { Asset, MediaKind, Project } from '../ws/types';
import { AssetThumb, toast } from '../ws/kit';
import { assetUrl, extractPalette, linkAsset, UploadError } from '../ws/media';
import { FilePick, upload, useDropZone } from '../ws/uploads';
import { GlassPage } from '../glass/Shell';
import { Pane, lgEase } from '../glass/kit';
import { dist } from '../studio/palette';

type Row = { a: Asset; p: Project };
type KindId = 'all' | MediaKind | 'ref' | 'screen' | 'svg' | 'lottie' | 'font' | 'code' | 'link' | 'audio';
const KINDS: { id: KindId; label: string; icon: React.ElementType; test: (a: Asset) => boolean }[] = [
  { id: 'all', label: 'All', icon: Search, test: () => true },
  { id: 'image', label: 'Images', icon: ImageIcon, test: (a) => a.kind === 'image' && !a.format },
  { id: 'screen', label: 'Screens', icon: Smartphone, test: (a) => a.format === 'screen' },
  { id: 'video', label: 'Video', icon: Video, test: (a) => a.kind === 'video' },
  { id: 'lottie', label: 'Lottie', icon: Sparkles, test: (a) => a.format === 'lottie' },
  { id: 'svg', label: 'Vector', icon: PenTool, test: (a) => a.format === 'svg' },
  { id: 'font', label: 'Fonts', icon: TypeIcon, test: (a) => a.format === 'font' },
  { id: 'code', label: 'Code', icon: Code2, test: (a) => a.format === 'code' },
  { id: 'link', label: 'Websites', icon: Link2, test: (a) => a.format === 'link' },
  { id: 'audio', label: 'Sound', icon: Music, test: (a) => a.format === 'audio' },
  { id: 'model', label: '3D', icon: Box, test: (a) => a.kind === 'model' },
  { id: 'env', label: 'HDRI', icon: Sun, test: (a) => a.kind === 'env' },
  { id: 'ref', label: 'References', icon: FolderInput, test: (a) => a.isReference },
];
const FORMAT_LABEL: Record<string, string> = { screen: 'screen', svg: 'vector', lottie: 'Lottie', font: 'font', code: 'code', link: 'website', audio: 'sound' };
/** smart collections: a few that keep themselves up to date, plus searches you save */
type Saved = { id: string; name: string; q: string; kind: KindId; colour: string | null };
const SMART: { id: string; label: string; test: (a: Asset, p: Project) => boolean }[] = [
  { id: 'week', label: 'Added this week', test: (a) => a.createdAt > Date.now() - 7 * 864e5 },
  { id: 'review', label: 'Waiting for the client', test: (a, p) => p.works.some((w) => w.status === 'client' && w.versions[w.versions.length - 1]?.assetId === a.id) },
  { id: 'approved', label: 'Approved', test: (a, p) => p.works.some((w) => w.versions.some((v) => v.id === w.approvedVersionId && v.assetId === a.id)) },
  { id: 'untagged', label: 'Without tags', test: (a) => !a.tags?.length },
];
const loadSaved = (): Saved[] => {
  try {
    return JSON.parse(localStorage.getItem('frantos-collections') ?? '[]');
  } catch {
    return [];
  }
};
const hashParam = (k: string) => new URLSearchParams(window.location.hash.split('?')[1] ?? '').get(k);

/**
 * Every file from every project in one grid: search by name or #tag, filter by kind,
 * click a colour to find pictures with it. Drop files to add them to a project.
 */
export function LibraryPage() {
  const { t } = useI18n();
  const { state } = useWs();
  const [q, setQ] = useState('');
  // #/library?k=screen opens on one kind (the profession kits link here)
  const [kind, setKind] = useState<KindId>(() => (KINDS.some((k) => k.id === hashParam('k')) ? (hashParam('k') as KindId) : 'all'));
  const [view, setView] = useState<Row | null>(null);
  const [linking, setLinking] = useState(false);
  const [easing, setEasing] = useState(() => hashParam('easing') === '1');
  const kit = kitOf(state.profile?.discipline);
  const [smart, setSmart] = useState<string | null>(null);
  const [saved, setSaved] = useState<Saved[]>(loadSaved);
  const [naming, setNaming] = useState<string | null>(null);
  const storeSaved = (list: Saved[]) => {
    setSaved(list);
    try {
      localStorage.setItem('frantos-collections', JSON.stringify(list));
    } catch {
      /* fine */
    }
  };
  // your profession's kinds first, the rest in their usual order; kinds you have no files of yet stay hidden
  const kinds = useMemo(() => {
    const has = (k: (typeof KINDS)[number]) => k.id === 'all' || k.id === kind || state.projects.some((p) => p.assets.some(k.test));
    const first = kit ? KINDS.filter((k) => (kit.formats as string[]).includes(k.id)) : [];
    return [KINDS[0], ...first, ...KINDS.slice(1).filter((k) => !first.includes(k))].filter(has);
  }, [kit, kind, state.projects]);
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
    if (!KINDS.find((k) => k.id === kind)!.test(a)) return false;
    if (smart && !SMART.find((x) => x.id === smart)?.test(a, p)) return false;
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
    if (a.format) return setView({ a, p });
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
          <div className="flex flex-wrap gap-2">
            <FilePick onFiles={(f) => (upload(f, target.id, { isReference: true }), toast(t('Adding to {name}', { name: target.title })))} className="lg-btn lg-btn-primary">
              <Upload size={16} /> {t('Add files')}
            </FilePick>
            <FilePick accept="image/png,image/jpeg,image/webp" onFiles={(f) => (upload(f, target.id, { isReference: true, screen: true }), toast(t('Adding to {name}', { name: target.title })))} className="lg-btn lg-btn-ghost">
              <Smartphone size={16} /> {t('Add screens')}
            </FilePick>
            <button type="button" onClick={() => setLinking(true)} className="lg-btn lg-btn-ghost">
              <Link2 size={16} /> {t('Add a website')}
            </button>
            {(kit?.id === 'motion' || easing) && (
              <button type="button" onClick={() => setEasing(true)} className="lg-btn lg-btn-ghost">
                <Sparkles size={16} /> {t('Easing curves')}
              </button>
            )}
          </div>
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
            {kinds.map((k) => (
              <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} onClick={() => setKind(k.id)} className={`flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-bold ${kind === k.id ? 'bg-white text-[#11151a]' : 'text-white/80 hover:bg-white/10'}`}>
                <k.icon size={14} /> {t(k.label)}
              </button>
            ))}
          </div>
        </Pane>
        <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label={t('Collections')}>
          <span className="lg-label lg-shadow-text me-1">{t('Collections')}</span>
          {SMART.map((c) => (
            <button key={c.id} type="button" aria-pressed={smart === c.id} onClick={() => setSmart(smart === c.id ? null : c.id)} className={`min-h-[32px] whitespace-nowrap rounded-full px-3 text-[12.5px] font-bold ${smart === c.id ? 'bg-white text-[#11151a]' : 'lg-glass hover:bg-white/15'}`}>
              {t(c.label)}
            </button>
          ))}
          {saved.map((c) => {
            const on = q === c.q && kind === c.kind && colour === c.colour;
            return (
              <span key={c.id} className={`group flex min-h-[32px] items-center rounded-full ps-3 text-[12.5px] font-bold ${on ? 'bg-white text-[#11151a]' : 'lg-glass'}`}>
                <button type="button" onClick={() => (setQ(c.q), setKind(c.kind), setColour(c.colour), setSmart(null))} className="whitespace-nowrap">
                  {c.name}
                </button>
                <button type="button" onClick={() => storeSaved(saved.filter((x) => x.id !== c.id))} className="px-2 opacity-50 hover:opacity-100" aria-label={t('Remove {name}', { name: c.name })}>
                  <X size={11} />
                </button>
              </span>
            );
          })}
          {(q || kind !== 'all' || colour) &&
            (naming == null ? (
              <button type="button" onClick={() => setNaming(q.trim() || t(KINDS.find((k) => k.id === kind)!.label))} className="lg-btn lg-btn-plain min-h-[32px] px-2.5 text-[12px]">
                <Plus size={12} /> {t('Save this view')}
              </button>
            ) : (
              <form
                className="flex items-center gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!naming.trim()) return;
                  storeSaved([...saved, { id: Math.random().toString(36).slice(2), name: naming.trim().slice(0, 40), q, kind, colour }]);
                  setNaming(null);
                }}
              >
                <input autoFocus dir="auto" value={naming} onChange={(e) => setNaming(e.target.value)} aria-label={t('Collection name')} className="lg-input h-8 w-40 px-2.5 text-[12.5px]" />
                <button type="submit" className="lg-btn lg-btn-primary min-h-[32px] px-3 text-[12px]">
                  {t('Save view')}
                </button>
              </form>
            ))}
        </div>
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
                      {r.a.format ? ` · ${t(FORMAT_LABEL[r.a.format])}` : ''}
                      {r.a.isReference ? ` · ${t('reference')}` : ''}
                    </span>
                  </span>
                </button>
                <div className="absolute end-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                  {r.a.kind === 'image' && (!r.a.format || r.a.format === 'screen') && (
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

      {view && <MaterialView a={view.a} sub={view.p.title} onClose={() => setView(null)} />}
      {linking && target && <AddLink pid={target.id} pname={target.title} onClose={() => setLinking(false)} />}
      {easing && <EasingPanel onClose={() => setEasing(false)} />}
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

/** a website as a reference: address, an optional name and why it matters */
function AddLink({ pid, pname, onClose }: { pid: string; pname: string; onClose: () => void }) {
  const { t } = useI18n();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const a = await linkAsset(url.trim(), title.trim() || undefined, { isReference: true });
      ws.addAsset(pid, { ...a, note: note.trim() || undefined });
      toast(t('Added to {name}', { name: pname }));
      onClose();
    } catch (err) {
      toast(err instanceof UploadError ? err.message : t('Something went wrong while reading this file.'), { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Pane strong className="lg-pop w-full max-w-[460px] rounded-[26px] p-5" role="dialog" aria-modal aria-labelledby="al-title" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <form onSubmit={save} className="space-y-3">
          <p id="al-title" className="text-[18px] font-extrabold">
            {t('Add a website')}
          </p>
          <p className="text-[13px] text-white/70">{t('Kept as a reference in {name}, with a card in the library and on boards.', { name: pname })}</p>
          <input required dir="ltr" type="text" inputMode="url" autoComplete="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" aria-label={t('Address')} className="lg-input text-[15px]" />
          <input dir="auto" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('Name (optional)')} aria-label={t('Name')} className="lg-input text-[15px]" />
          <textarea dir="auto" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('What to take from it (optional)')} aria-label={t('Note')} className="lg-input text-[14px]" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="lg-btn lg-btn-plain">
              {t('Cancel')}
            </button>
            <button type="submit" disabled={busy || !url.trim()} className="lg-btn lg-btn-primary">
              {t('Add')}
            </button>
          </div>
        </form>
      </Pane>
    </div>
  );
}
