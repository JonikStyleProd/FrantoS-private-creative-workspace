import React, { useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, ChevronDown, Component, Database, Loader2, Plus, RotateCcw, ShieldCheck, Trash2, Unlink, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { Section, Seg } from '../studio/ui';
import { AssetThumb, toast } from '../ws/kit';
import { previewOnly } from '../ws/media';
import { useWs, ws } from '../ws/store';
import type { Project, SiteBind, SiteCollection, SiteComponent, SiteEntry, SiteNode, SitePage } from '../ws/types';
import { Doc, OpCtx, Virt, addVariant, countCopies, detach, entrySlug, instanceOf } from './data';
import { clone, find, update } from './model';
import { newCollection, newEntry } from './collections';
import type { Issue } from './quality';
import { nid } from './model';

export type Apply = (fn: (d: Doc, c: OpCtx) => Doc | { doc: Doc; id: string }, label: string, now?: boolean) => string | undefined;
type Data = { comps: SiteComponent[]; colls: SiteCollection[] };

/* ───────── a copy of a component ───────── */

export function ComponentSection({ n, data, pages, apply }: { n: SiteNode; data: Data; pages: SitePage[]; apply: Apply }) {
  const { t } = useI18n();
  const comp = data.comps.find((c) => c.id === n.comp);
  const [newName, setNewName] = useState('');
  if (!comp) return null;
  const variant = comp.variants.find((v) => v.id === n.variant) ?? comp.variants[0];
  const copies = countCopies(pages, comp.id);
  const setComps = (fn: (c: SiteComponent) => SiteComponent, label: string, now = true) => apply((d) => ({ ...d, comps: d.comps.map((c) => (c.id === comp.id ? fn(c) : c)) }), label, now);
  return (
    <Section title={t('Component')} icon={<Component size={15} />}>
      <label className="block text-[12px] text-white/75">
        {t('Component name')}
        <input dir="auto" value={t(comp.name)} onChange={(e) => setComps((c) => ({ ...c, name: e.target.value }), 'Component renamed', false)} className="lg-input mt-1.5 min-h-[36px] w-full px-2.5 text-[13.5px] font-bold" />
      </label>
      <p className="rounded-[12px] bg-[#9b6bff]/15 px-2.5 py-2 text-[12px] leading-[1.4]">{t('{n} copies on the pages. Style and structure change in every copy; words, links and pictures are each copy’s own.', { n: copies })}</p>
      <Seg wrap label={t('Variant')} value={variant.id} options={comp.variants.map((v) => ({ id: v.id, label: t(v.name) }))} onChange={(id) => apply((d) => ({ ...d, root: update(d.root, n.id, (i) => ({ ...i, variant: id })) }), 'Variant changed')} />
      <label className="block text-[12px] text-white/75">
        {t('This variant is called')}
        <input dir="auto" value={t(variant.name)} onChange={(e) => setComps((c) => ({ ...c, variants: c.variants.map((v) => (v.id === variant.id ? { ...v, name: e.target.value } : v)) }), 'Variant renamed', false)} className="lg-input mt-1.5 min-h-[36px] w-full px-2.5 text-[13px]" />
      </label>
      <form
        className="flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          apply((d) => addVariant(d, n.id, newName.trim() || t('Variant {n}', { n: comp.variants.length + 1 })), 'Variant added');
          setNewName('');
          toast(t('New variant: change it, and only copies set to it change'));
        }}
      >
        <input dir="auto" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('Variant {n}', { n: comp.variants.length + 1 })} aria-label={t('New variant')} className="lg-input min-h-[36px] min-w-0 flex-1 px-2.5 text-[13px]" />
        <button type="submit" className="lg-btn lg-btn-ghost min-h-[36px] shrink-0 px-3 text-[12.5px]">
          <Plus size={13} /> {t('Variant')}
        </button>
      </form>
      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" disabled={!n.over || !Object.keys(n.over).length} onClick={() => apply((d) => ({ ...d, root: update(d.root, n.id, (i) => ({ ...i, over: undefined })) }), 'Copy reset')} className="lg-btn lg-btn-ghost min-h-[34px] text-[12px] disabled:opacity-40">
          <RotateCcw size={12} /> {t('Main’s words')}
        </button>
        <button type="button" onClick={() => (apply((d, c) => detach(d, c, n.id), 'Copy detached'), toast(t('Detached: this is now ordinary elements'), { undo: true }))} className="lg-btn lg-btn-ghost min-h-[34px] text-[12px]">
          <Unlink size={12} /> {t('Detach')}
        </button>
      </div>
    </Section>
  );
}

/** a note on what an edit inside a component or a card will change */
export function PartNote({ v, data, root }: { v: Virt; data: Data; root: SiteNode[] }) {
  const { t } = useI18n();
  if (v.root && v.kind === 'inst') return null;
  const name = v.kind === 'inst' ? data.comps.find((c) => c.id === v.comp)?.name : data.colls.find((c) => c.id === find(root, v.owner)?.coll)?.name;
  return (
    <p className={`rounded-[12px] px-2.5 py-2 text-[12px] leading-[1.4] ${v.kind === 'inst' ? 'bg-[#9b6bff]/15' : 'bg-[#2fbf71]/15'}`}>
      {v.kind === 'inst'
        ? t('Inside the component “{c}”: words here are this copy’s own; style and structure change every copy.', { c: t(name ?? '') })
        : t('A card of “{c}”: a field shown from the entry changes that entry; the rest changes every card.', { c: t(name ?? '') })}
    </p>
  );
}

const BINDS: { id: SiteBind; label: string; for: SiteNode['type'][] }[] = [
  { id: 'title', label: 'Title', for: ['heading', 'text'] },
  { id: 'date', label: 'Date', for: ['heading', 'text'] },
  { id: 'excerpt', label: 'Short text', for: ['heading', 'text'] },
  { id: 'body', label: 'Full text', for: ['text'] },
  { id: 'cover', label: 'Cover', for: ['media'] },
  { id: 'link', label: 'Link to the entry', for: ['button'] },
];
/** which field of the entry a node shows (in cards, and on a collection page) */
export function BindField({ n, apply }: { n: SiteNode; apply: Apply }) {
  const { t } = useI18n();
  const opts = BINDS.filter((b) => b.for.includes(n.type));
  if (!opts.length) return null;
  return (
    <label className="block text-[12px] text-white/75">
      <span className="flex items-center gap-1.5">
        <Database size={12} /> {t('Shows from the entry')}
      </span>
      <select value={n.bind ?? ''} onChange={(e) => apply((d, c) => ({ ...d, ...applyBind(d, c, n.id, (e.target.value || undefined) as SiteBind | undefined) }), 'Field changed')} className="lg-input mt-1.5 min-h-[36px] w-full px-2 text-[13px]">
        <option value="">{t('Nothing: its own content')}</option>
        {opts.map((b) => (
          <option key={b.id} value={b.id}>
            {t(b.label)}
          </option>
        ))}
      </select>
    </label>
  );
}
function applyBind(d: Doc, c: OpCtx, id: string, bind: SiteBind | undefined): Doc {
  const v = c.R.reg.get(id);
  if (!v) return { ...d, root: update(d.root, id, (x) => ({ ...x, bind })) };
  if (v.kind === 'list') return { ...d, root: update(d.root, v.owner, (l) => ({ ...l, template: update([l.template!], v.master, (x) => ({ ...x, bind }))[0] })) };
  return { ...d, comps: d.comps.map((cp) => (cp.id === v.comp ? { ...cp, variants: cp.variants.map((x) => (x.id === v.variant ? { ...x, node: update([x.node], v.master, (y) => ({ ...y, bind }))[0] } : x)) } : cp)) };
}

/* ───────── a list of entries ───────── */

export function ListSection({ n, data, apply, onContent, onNewCollection }: { n: SiteNode; data: Data; apply: Apply; onContent: () => void; onNewCollection: () => string }) {
  const { t } = useI18n();
  const coll = data.colls.find((c) => c.id === n.coll);
  return (
    <Section title={t('List of entries')} icon={<Database size={15} />}>
      <p className="rounded-[12px] bg-[#2fbf71]/15 px-2.5 py-2 text-[12px] leading-[1.4]">{t('Each card is an entry of the collection. Change the first card and every card follows; write entries in Entries.')}</p>
      <label className="block text-[12px] text-white/75">
        {t('Collection')}
        <select
          value={n.coll ?? ''}
          onChange={(e) => {
            const id = e.target.value === '+' ? onNewCollection() : e.target.value;
            apply((d) => ({ ...d, root: update(d.root, n.id, (l) => ({ ...l, coll: id })) }), 'List changed');
          }}
          className="lg-input mt-1.5 min-h-[36px] w-full px-2 text-[13px]"
        >
          {data.colls.map((c) => (
            <option key={c.id} value={c.id}>
              {t(c.name)} · {c.entries.length}
            </option>
          ))}
          <option value="+">{t('New collection…')}</option>
        </select>
      </label>
      <Seg label={t('How many')} value={n.limit ?? 0} options={[0, 3, 6, 9].map((x) => ({ id: x, label: x ? String(x) : t('All') }))} onChange={(limit) => apply((d) => ({ ...d, root: update(d.root, n.id, (l) => ({ ...l, limit })) }), 'List changed')} />
      <button type="button" onClick={onContent} className="lg-btn lg-btn-ghost min-h-[36px] w-full text-[12.5px]">
        <Database size={13} /> {t('Write the entries')} {coll ? `· ${coll.entries.length}` : ''}
      </button>
    </Section>
  );
}

/* ───────── Content: collections and their entries ───────── */

export function ContentPanel({ p, data, apply, img, page, onBindPage, tr }: { p: Project; data: Data; apply: Apply; img: (i: number) => string | undefined; page: SitePage; onBindPage: (coll?: string) => void; tr?: (s: string) => string }) {
  const { t } = useI18n();
  const L = (s: string) => (tr ? tr(s) : s);
  const [open, setOpen] = useState<string | null>(data.colls[0]?.id ?? null);
  const [edit, setEdit] = useState<string | null>(null);
  const setColl = (id: string, fn: (c: SiteCollection) => SiteCollection, label: string, now = true) => apply((d) => ({ ...d, colls: d.colls.map((c) => (c.id === id ? fn(c) : c)) }), label, now);
  const setEntry = (cid: string, eid: string, patch: Partial<SiteEntry>, now = false) => setColl(cid, (c) => ({ ...c, entries: c.entries.map((e) => (e.id === eid ? { ...e, ...patch } : e)) }), 'Entry changed', now);
  const pics = p.assets.filter((a) => a.ready !== false && a.kind === 'image' && !previewOnly(a));
  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-[1.45] text-white/65">{t('Collections hold entries — blog posts, cases, products. A list shows them as cards; a collection page shows one entry at a time.')}</p>
      {data.colls.map((c) => (
        <div key={c.id} className="rounded-[16px] bg-white/[.07]">
          <button type="button" onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id} className="flex w-full items-center gap-2 px-3 py-2.5 text-start">
            <Database size={14} />
            <span dir="auto" className="min-w-0 flex-1 truncate text-[13.5px] font-bold">
              {t(c.name)}
            </span>
            <span className="text-[11.5px] text-white/55">{c.entries.length}</span>
            <ChevronDown size={14} className={open === c.id ? 'rotate-180' : ''} />
          </button>
          {open === c.id && (
            <div className="space-y-1.5 px-2 pb-2">
              <input dir="auto" aria-label={t('Collection name')} value={t(c.name)} onChange={(e) => setColl(c.id, (x) => ({ ...x, name: e.target.value }), 'Collection renamed', false)} className="lg-input min-h-[34px] w-full px-2.5 text-[13px]" />
              {c.entries.map((e, i) => (
                <div key={e.id} className="rounded-[12px] bg-black/15">
                  <div className="flex items-center gap-1 py-1 pe-1 ps-2">
                    <button type="button" onClick={() => setEdit(edit === e.id ? null : e.id)} aria-expanded={edit === e.id} className="min-w-0 flex-1 text-start">
                      <span dir="auto" className={`block truncate text-[12.5px] font-bold ${e.draft ? 'opacity-50' : ''}`}>
                        {L(e.title) || t('Untitled')}
                      </span>
                      <span className="block truncate text-[11px] text-white/50">
                        {L(e.date)}
                        {e.draft ? ` · ${t('Draft')}` : ''}
                      </span>
                    </button>
                    <button type="button" disabled={!i} onClick={() => setColl(c.id, (x) => ({ ...x, entries: swap(x.entries, i, i - 1) }), 'Entry moved')} className="lg-btn lg-btn-plain lg-icon h-7 min-h-0 w-7 !p-0 disabled:opacity-30" aria-label={t('Earlier')}>
                      <ArrowUp size={12} />
                    </button>
                    <button type="button" disabled={i === c.entries.length - 1} onClick={() => setColl(c.id, (x) => ({ ...x, entries: swap(x.entries, i, i + 1) }), 'Entry moved')} className="lg-btn lg-btn-plain lg-icon h-7 min-h-0 w-7 !p-0 disabled:opacity-30" aria-label={t('Later')}>
                      <ArrowDown size={12} />
                    </button>
                  </div>
                  {edit === e.id && (
                    <div className="space-y-2 px-2 pb-2">
                      <Field label={t('Title')} value={L(e.title)} onChange={(v) => setEntry(c.id, e.id, { title: v, slug: entrySlug(v) })} />
                      <Field label={t('Date')} value={L(e.date)} onChange={(v) => setEntry(c.id, e.id, { date: v })} />
                      <Field label={t('Short text')} value={L(e.excerpt)} onChange={(v) => setEntry(c.id, e.id, { excerpt: v })} rows={2} />
                      <Field label={t('Full text')} value={L(e.body)} onChange={(v) => setEntry(c.id, e.id, { body: v })} rows={6} />
                      <div>
                        <p className="mb-1 text-[12px] text-white/75">{t('Cover')}</p>
                        <div className="grid max-h-[132px] grid-cols-5 gap-1 overflow-y-auto lg-scroll">
                          {pics.map((a) => (
                            <button key={a.id} type="button" onClick={() => setEntry(c.id, e.id, { cover: a.id }, true)} aria-pressed={e.cover === a.id} aria-label={a.title} className={`aspect-square overflow-hidden rounded-[8px] ${e.cover === a.id ? 'ring-2 ring-white' : ''}`}>
                              <AssetThumb asset={a} className="h-full w-full" />
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="truncate text-[11px] text-white/45" dir="ltr">
                        /{e.slug}
                      </p>
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => setEntry(c.id, e.id, { draft: !e.draft }, true)} aria-pressed={!!e.draft} className="lg-btn lg-btn-ghost min-h-[32px] flex-1 text-[12px]">
                          {e.draft ? t('Show on the site') : t('Hide as a draft')}
                        </button>
                        <button type="button" onClick={() => (setColl(c.id, (x) => ({ ...x, entries: x.entries.filter((y) => y.id !== e.id) }), 'Entry removed'), toast(t('Entry removed'), { undo: true }))} className="lg-btn lg-btn-ghost lg-icon h-8 min-h-0 w-8 !p-0" aria-label={t('Remove the entry')}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const e = { ...newEntry(t, img(c.entries.length), 0), title: t('New entry'), slug: `entry-${nid().slice(-4)}`, date: new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) };
                  setColl(c.id, (x) => ({ ...x, entries: [e, ...x.entries] }), 'Entry added');
                  setEdit(e.id);
                }}
                className="lg-btn lg-btn-ghost min-h-[34px] w-full text-[12.5px]"
              >
                <Plus size={13} /> {t('New entry')}
              </button>
              <button type="button" onClick={() => onBindPage(page.collection === c.id ? undefined : c.id)} className={`lg-btn min-h-[34px] w-full text-[12px] ${page.collection === c.id ? 'lg-btn-primary' : 'lg-btn-plain'}`} title={t('This page is drawn once per entry; its fields can show the entry')}>
                {page.collection === c.id ? t('This page shows an entry · stop') : t('Make this page the entry page')}
              </button>
            </div>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          const c = newCollection(t, img);
          apply((d) => ({ ...d, colls: [...d.colls, c] }), 'Collection added');
          setOpen(c.id);
        }}
        className="lg-btn lg-btn-ghost min-h-[36px] w-full text-[12.5px]"
      >
        <Plus size={13} /> {t('New collection')}
      </button>
    </div>
  );
}
const swap = <T,>(a: T[], i: number, j: number) => {
  const b = [...a];
  [b[i], b[j]] = [b[j], b[i]];
  return b;
};
function Field({ label, value, onChange, rows }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="block text-[12px] text-white/75">
      {label}
      {rows ? <textarea dir="auto" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className="lg-input mt-1 w-full resize-y px-2.5 py-1.5 text-[13px] leading-[1.45]" /> : <input dir="auto" value={value} onChange={(e) => onChange(e.target.value)} className="lg-input mt-1 min-h-[34px] w-full px-2.5 text-[13px]" />}
    </label>
  );
}

/* ───────── saved blocks and components in the Add panel ───────── */

export function savedBlockNode(p: Project, b: { node: SiteNode; projectId: string }): SiteNode {
  // pictures from another project come along
  if (b.projectId !== p.id) {
    const src = ws.project(b.projectId);
    const need = new Set<string>();
    const w = (n: SiteNode) => (n.assetId && need.add(n.assetId), n.children?.forEach(w));
    w(b.node);
    need.forEach((id) => {
      const a = src?.assets.find((x) => x.id === id);
      if (a && !p.assets.some((x) => x.id === id)) ws.addAsset(p.id, { ...a, isReference: true });
    });
  }
  return clone(b.node);
}

export function MyBlocks({ p, item }: { p: Project; item: (label: string, make: () => SiteNode, section: boolean, extra?: React.ReactNode) => React.ReactNode }) {
  const { t } = useI18n();
  const { state } = useWs();
  const blocks = state.siteBlocks ?? [];
  if (!blocks.length) return null;
  return (
    <div>
      <p className="lg-label mb-2 px-1">{t('My blocks')}</p>
      <div className="grid grid-cols-1 gap-1.5">
        {blocks.map((b) =>
          item(
            b.name,
            () => savedBlockNode(p, b),
            b.node.type === 'section',
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                ws.removeSiteBlock(b.id);
                toast(t('Block removed from your blocks'));
              }}
              className="ms-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full opacity-60 hover:bg-white/15 hover:opacity-100"
              aria-label={t('Remove from my blocks')}
            >
              <X size={12} />
            </button>
          )
        )}
      </div>
    </div>
  );
}

export function ComponentsList({ data, item }: { data: Data; item: (label: string, make: () => SiteNode, section: boolean) => React.ReactNode }) {
  const { t } = useI18n();
  if (!data.comps.length) return null;
  return (
    <div>
      <p className="lg-label mb-2 px-1">{t('Components')}</p>
      <div className="grid grid-cols-1 gap-1.5">{data.comps.flatMap((c) => c.variants.map((v) => item(`${t(c.name)}${c.variants.length > 1 ? ' · ' + t(v.name) : ''}`, () => instanceOf(c, v.id), v.node.type === 'section')))}</div>
    </div>
  );
}

/* ───────── quality ───────── */

export function QualityPanel({ issues, busy, onPick, onClose }: { issues: Issue[] | null; busy: boolean; onPick: (i: Issue) => void; onClose: () => void }) {
  const { t } = useI18n();
  const [cursor, setCursor] = useState<Record<string, number>>({});
  // the same remark in several places is one line; clicks go through the places
  const groups: { key: string; items: Issue[] }[] = [];
  (issues ?? []).forEach((i) => {
    const key = `${i.bp}|${i.text}|${i.vars && i.text.startsWith('Hard') ? i.vars.n : ''}`;
    const g = groups.find((x) => x.key === key);
    g ? g.items.push(i) : groups.push({ key, items: [i] });
  });
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck size={17} />
        <p className="me-auto text-[16px] font-extrabold">{t('Check')}</p>
        {busy && <Loader2 size={15} className="animate-spin" aria-label={t('Checking…')} />}
        <button type="button" onClick={onClose} className="lg-btn lg-btn-plain lg-icon h-8 min-h-0 w-8 !p-0" aria-label={t('Close the check')}>
          <X size={15} />
        </button>
      </div>
      <p className="text-[12px] leading-[1.45] text-white/60">{t('The page as drawn at phone and desktop width: reading contrast, finger-sized buttons, nothing past the edge, descriptions, links, headings.')}</p>
      {issues && !issues.length && (
        <p className="flex items-center gap-2 rounded-[14px] bg-[#2fbf71]/15 p-3 text-[13px] font-bold">
          <CheckCircle2 size={16} /> {t('All clear')}
        </p>
      )}
      <ul className="space-y-1.5">
        {groups.map((g) => (
          <li key={g.key}>
            <button
              type="button"
              onClick={() => {
                const i = g.items[(cursor[g.key] ?? 0) % g.items.length];
                setCursor((c) => ({ ...c, [g.key]: (c[g.key] ?? 0) + 1 }));
                onPick(i);
              }}
              className="flex w-full items-start gap-2 rounded-[14px] bg-white/[.07] p-2.5 text-start hover:bg-white/15"
            >
              <AlertTriangle size={14} className={`mt-0.5 shrink-0 ${g.items[0].level === 'error' ? 'text-[#ff6b6b]' : 'text-[#ffb84f]'}`} />
              <span className="min-w-0 flex-1 text-[12.5px] leading-[1.4]">
                {t(g.items[0].text, g.items[0].vars)}
                {g.items.length > 1 && <span className="block text-[11.5px] text-white/55">{t('{n} places · click to go through them', { n: g.items.length })}</span>}
              </span>
              <span className="shrink-0 rounded-full bg-white/10 px-1.5 text-[10.5px] font-bold">{g.items[0].bp === 'sm' ? t('Phone') : t('Desktop')}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
