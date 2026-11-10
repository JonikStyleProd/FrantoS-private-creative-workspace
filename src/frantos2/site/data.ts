import type { SiteCollection, SiteComponent, SiteEntry, SiteNode, SiteOverride } from '../ws/types';
import { clone, find, insert, locate, move, nid, remove, update, wrap } from './model';

/**
 * Components and collections, drawn and edited on the page.
 *
 * The stored page keeps an `instance` node (component + variant + this copy's words) and a `list`
 * node (collection + one card template). `resolveTree` expands both into ordinary nodes for the
 * renderer and the editor. Nodes that came from a component main or a card template get ids
 * `<owner>~…~<mainId>` and an entry in `reg`. The operations below take an edit made on that expanded
 * tree and send it where it belongs:
 * - words, links and pictures of a copy go to the copy;
 * - style and structure go to the component main, so every copy changes;
 * - inside a card, bound fields go to the collection entry and the rest goes to the template.
 */

export interface Virt {
  kind: 'inst' | 'list';
  /** the instance or list node in the page */
  owner: string;
  /** the node in the component main or the card template */
  master: string;
  comp?: string;
  variant?: string;
  /** the collection entry a card shows */
  item?: string;
  /** the instance's own root (its id is the instance id) */
  root?: boolean;
}
export interface Resolved {
  root: SiteNode[];
  reg: Map<string, Virt>;
}
export interface DataCtx {
  comps: SiteComponent[];
  colls: SiteCollection[];
  /** a collection page draws this entry */
  entry?: SiteEntry;
  /** where a card's "link" goes */
  linkFor?: (coll: string, e: SiteEntry) => string;
}

export const CONTENT = ['text', 'href', 'assetId', 'alt'] as const;
type ContentKey = (typeof CONTENT)[number];
const SAMPLE: SiteEntry = { id: '', slug: 'entry', title: 'Entry title', excerpt: 'Two lines from the entry, enough to decide whether to read on.', body: 'The text of the entry.', date: '14 October', cover: undefined };

export function fill(n: SiteNode, e: SiteEntry, link?: string): SiteNode {
  switch (n.bind) {
    case 'title':
      return { ...n, text: e.title };
    case 'excerpt':
      return { ...n, text: e.excerpt };
    case 'body':
      return { ...n, text: e.body };
    case 'date':
      return { ...n, text: e.date };
    case 'cover':
      return { ...n, assetId: e.cover ?? n.assetId };
    case 'link':
      return { ...n, href: link ?? '#' };
    default:
      return n;
  }
}

export function resolveTree(root: SiteNode[], ctx: DataCtx): Resolved {
  const reg = new Map<string, Virt>();
  const res = (n: SiteNode, depth: number): SiteNode => {
    if (depth > 6) return { id: n.id, type: 'stack', children: [] };
    if (n.type === 'instance') {
      const comp = ctx.comps.find((c) => c.id === n.comp);
      const v = comp?.variants.find((x) => x.id === n.variant) ?? comp?.variants[0];
      if (!comp || !v) return { id: n.id, type: 'text', text: '—', name: n.name };
      const conv = (m: SiteNode, isRoot: boolean): SiteNode => {
        const id = isRoot ? n.id : `${n.id}~${m.id}`;
        reg.set(id, { kind: 'inst', owner: n.id, master: m.id, comp: comp.id, variant: v.id, root: isRoot });
        const o = n.over?.[m.id];
        let x: SiteNode = { ...m, id, ...(o ?? {}), children: m.children?.map((k) => conv(k, false)) };
        if (isRoot) x = { ...x, name: n.name ?? m.name ?? comp.name, comp: comp.id, variant: v.id, over: n.over };
        if (ctx.entry && x.bind) x = fill(x, ctx.entry);
        return x.type === 'instance' || x.type === 'list' ? res(x, depth + 1) : x;
      };
      return conv(v.node, true);
    }
    if (n.type === 'list') {
      const coll = ctx.colls.find((c) => c.id === n.coll);
      const entries = (coll?.entries ?? []).filter((e) => !e.draft).slice(0, n.limit || undefined);
      const tpl = n.template ?? { id: 'tpl', type: 'stack', children: [] };
      const card = (e: SiteEntry | undefined) => {
        const conv = (m: SiteNode): SiteNode => {
          const id = `${n.id}~${e?.id ?? 'sample'}~${m.id}`;
          reg.set(id, { kind: 'list', owner: n.id, master: m.id, item: e?.id, root: m.id === tpl.id });
          let x: SiteNode = { ...m, id, children: m.children?.map(conv) };
          if (x.bind) x = fill(x, e ?? SAMPLE, e && coll && ctx.linkFor ? ctx.linkFor(coll.id, e) : undefined);
          return x;
        };
        return conv(tpl);
      };
      return { id: n.id, type: 'grid', name: n.name ?? coll?.name, s: n.s, md: n.md, sm: n.sm, anim: n.anim, hover: n.hover, depth: n.depth, coll: n.coll, limit: n.limit, children: entries.length ? entries.map(card) : [card(undefined)] };
    }
    let x = n;
    if (ctx.entry && x.bind) x = fill(x, ctx.entry);
    return x.children ? { ...x, children: x.children.map((k) => res(k, depth)) } : x;
  };
  return { root: root.map((n) => res(n, 0)), reg };
}

/* ───────── edits on the expanded tree → the stored data ───────── */

export interface Doc {
  root: SiteNode[];
  comps: SiteComponent[];
  colls: SiteCollection[];
}
export interface OpCtx {
  R: Resolved;
  /** a collection page: the entry on screen */
  entry?: { coll: string; id: string };
}
/** an edit that cannot be made, with the reason for the person */
export class Refused extends Error {}

const stripContent = (n: SiteNode) => {
  const x = { ...n };
  CONTENT.forEach((k) => delete x[k]);
  return x;
};
/** a node's own settings onto the stored one; the stored children stay */
const merge = (stored: SiteNode, next: SiteNode, keepContent = false): SiteNode => {
  const { children: _c, id: _i, type: _t, comp: _cp, variant: _v, over: _o, coll: _cl, template: _tp, ...own } = next;
  const base = keepContent ? stripContent(own as SiteNode) : (own as SiteNode);
  const out = { ...stored, ...base, id: stored.id, type: stored.type, children: stored.children };
  // keys removed in `next` (e.g. a reset style) go away too
  (['s', 'md', 'sm', 'anim', 'hover', 'depth', 'name', 'level', 'tag', 'multiline', 'placeholder', 'bind'] as const).forEach((k) => !(k in next) && delete (out as Record<string, unknown>)[k]);
  return out;
};
const contentDiff = (a: SiteNode, b: SiteNode): Partial<Record<ContentKey, string | undefined>> => {
  const d: Partial<Record<ContentKey, string | undefined>> = {};
  CONTENT.forEach((k) => a[k] !== b[k] && (d[k] = b[k]));
  return d;
};

/* the main tree a virtual node lives in, as an editable one-node forest */
function mainOf(doc: Doc, v: Virt): SiteNode[] {
  if (v.kind === 'inst') {
    const c = doc.comps.find((x) => x.id === v.comp)!;
    return [c.variants.find((x) => x.id === v.variant)!.node];
  }
  return [find(doc.root, v.owner)!.template!];
}
function setMain(doc: Doc, v: Virt, forest: SiteNode[]): Doc {
  const node = forest[0];
  if (v.kind === 'inst') return { ...doc, comps: doc.comps.map((c) => (c.id === v.comp ? { ...c, variants: c.variants.map((x) => (x.id === v.variant ? { ...x, node } : x)) } : c)) };
  return { ...doc, root: update(doc.root, v.owner, (l) => ({ ...l, template: node })) };
}
const sameMain = (a?: Virt, b?: Virt) => !!a && !!b && a.kind === b.kind && a.owner === b.owner && (a.kind === 'list' || a.variant === b.variant);

function setEntry(doc: Doc, coll: string, id: string, patch: Partial<SiteEntry>): Doc {
  return { ...doc, colls: doc.colls.map((c) => (c.id === coll ? { ...c, entries: c.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) } : c)) };
}
/** a bound field edited on the page goes to the entry */
function boundPatch(n: SiteNode, d: Partial<Record<ContentKey, string | undefined>>): Partial<SiteEntry> | null {
  if (!n.bind) return null;
  if (n.bind === 'cover') return 'assetId' in d ? { cover: d.assetId } : null;
  if (n.bind === 'link') return null;
  return 'text' in d ? { [n.bind]: d.text ?? '' } : null;
}

export function opUpdate(doc: Doc, c: OpCtx, id: string, fn: (n: SiteNode) => SiteNode): Doc {
  const old = find(c.R.root, id);
  if (!old) return doc;
  const nn = fn(old);
  const v = c.R.reg.get(id);
  const d = contentDiff(old, nn);
  if (!v) {
    // a real node; on a collection page its bound field writes the entry
    const bp = c.entry && boundPatch(old, d);
    let out = bp ? setEntry(doc, c.entry!.coll, c.entry!.id, bp) : doc;
    out = { ...out, root: update(out.root, id, (st) => merge(st, nn, !!bp)) };
    return out;
  }
  if (v.kind === 'inst') {
    let out = doc;
    if (Object.keys(d).length)
      out = {
        ...out,
        root: update(out.root, v.owner, (inst) => {
          const prev: SiteOverride = { ...(inst.over?.[v.master] ?? {}) };
          Object.entries(d).forEach(([k, val]) => (val === undefined ? delete prev[k as ContentKey] : (prev[k as ContentKey] = val)));
          return { ...inst, over: { ...inst.over, [v.master]: prev } };
        }),
      };
    // the copy's own name stays on the copy
    if (v.root && nn.name !== old.name) out = { ...out, root: update(out.root, v.owner, (inst) => ({ ...inst, name: nn.name })) };
    const main = mainOf(out, v);
    return setMain(out, v, update(main, v.master, (st) => merge(st, { ...nn, name: v.root ? st.name : nn.name }, true)));
  }
  // a card of a list
  let out = doc;
  const bp = boundPatch(old, d);
  const coll = find(doc.root, v.owner)?.coll;
  if (bp && v.item && coll) out = setEntry(out, coll, v.item, bp);
  const main = mainOf(out, v);
  return setMain(out, v, update(main, v.master, (st) => merge(st, nn, !!bp || !v.item)));
}

const NOT_HERE = 'Cards come from the collection: add or remove entries in Entries.';

export function opRemove(doc: Doc, c: OpCtx, id: string): Doc {
  const v = c.R.reg.get(id);
  if (!v || (v.kind === 'inst' && v.root)) return { ...doc, root: remove(doc.root, id) };
  if (v.kind === 'list' && v.root) throw new Refused(NOT_HERE);
  return setMain(doc, v, remove(mainOf(doc, v), v.master));
}

export function opInsert(doc: Doc, c: OpCtx, parent: string, index: number, node: SiteNode): Doc {
  const pv = parent ? c.R.reg.get(parent) : undefined;
  const pn = parent ? find(c.R.root, parent) : undefined;
  if (pn?.coll && !pv) throw new Refused(NOT_HERE);
  if (!pv) return { ...doc, root: insert(doc.root, parent, index, node) };
  if (node.type === 'instance' || node.type === 'list') throw new Refused('A component or a list cannot go inside a component or a card.');
  return setMain(doc, pv, insert(mainOf(doc, pv), pv.master, index, node));
}

export function opMove(doc: Doc, c: OpCtx, id: string, parent: string, index: number): Doc {
  const v = c.R.reg.get(id);
  const pv = parent ? c.R.reg.get(parent) : undefined;
  const real = !v || (v.kind === 'inst' && v.root);
  if (real && !pv) {
    if (parent && find(c.R.root, parent)?.coll) throw new Refused(NOT_HERE);
    return { ...doc, root: move(doc.root, id, parent, index) };
  }
  if (!real && sameMain(v, pv) && !(v!.kind === 'list' && v!.root)) return setMain(doc, v!, move(mainOf(doc, v!), v!.master, pv!.master, index));
  throw new Refused('This move would cross a component or a card. Detach the component first.');
}

export function opDuplicate(doc: Doc, c: OpCtx, id: string): { doc: Doc; id: string } {
  const v = c.R.reg.get(id);
  if (!v || (v.kind === 'inst' && v.root)) {
    const at = locate(doc.root, id);
    const n = find(doc.root, id);
    if (!at || !n) return { doc, id };
    const cp = clone(n);
    return { doc: { ...doc, root: insert(doc.root, at.parent, at.index + 1, cp) }, id: cp.id };
  }
  if (v.kind === 'list' && v.root) throw new Refused(NOT_HERE);
  const main = mainOf(doc, v);
  const at = locate(main, v.master)!;
  const cp = clone(find(main, v.master)!);
  const nextId = id.slice(0, id.length - v.master.length) + cp.id;
  return { doc: setMain(doc, v, insert(main, at.parent, at.index + 1, cp)), id: nextId };
}

export function opWrap(doc: Doc, c: OpCtx, id: string): { doc: Doc; id: string } {
  const v = c.R.reg.get(id);
  if (!v || (v.kind === 'inst' && v.root)) {
    const r = wrap(doc.root, id);
    return { doc: { ...doc, root: r.nodes }, id: r.id };
  }
  if (v.root) throw new Refused('Wrap the whole card in the template’s own column.');
  const r = wrap(mainOf(doc, v), v.master);
  return { doc: setMain(doc, v, r.nodes), id: id.slice(0, id.length - v.master.length) + r.id };
}

/* ───────── components ───────── */

/** the selected node becomes a component's main; the node on the page becomes its first copy */
export function makeComponent(doc: Doc, c: OpCtx, id: string, name: string): { doc: Doc; id: string } {
  if (c.R.reg.get(id)) throw new Refused('This is already part of a component or a card.');
  const n = find(doc.root, id);
  if (!n || n.type === 'instance' || n.type === 'list') throw new Refused('This cannot become a component.');
  const comp: SiteComponent = { id: 'c-' + nid(), name, variants: [{ id: 'v-' + nid(), name: 'Default', node: { ...n, id: 'm-' + nid() } }], createdAt: Date.now() };
  const inst: SiteNode = { id: n.id, type: 'instance', comp: comp.id, variant: comp.variants[0].id, name };
  return { doc: { ...doc, comps: [...doc.comps, comp], root: update(doc.root, id, () => inst) }, id: n.id };
}
export const instanceOf = (comp: SiteComponent, variant?: string): SiteNode => ({ id: nid(), type: 'instance', comp: comp.id, variant: variant ?? comp.variants[0].id });

/** a copy becomes ordinary nodes again (its words kept), no longer following the main */
export function detach(doc: Doc, c: OpCtx, id: string): Doc {
  const resolved = find(c.R.root, id);
  if (!resolved) return doc;
  const plain = (n: SiteNode): SiteNode => {
    const { comp: _c, variant: _v, over: _o, ...x } = n;
    return { ...x, id: nid(), children: x.children?.map(plain) };
  };
  return { ...doc, root: update(doc.root, id, () => ({ ...plain(resolved), id })) };
}
/** a new variant from the one this copy shows; the copy switches to it */
export function addVariant(doc: Doc, instId: string, name: string): Doc {
  const inst = find(doc.root, instId);
  const comp = doc.comps.find((x) => x.id === inst?.comp);
  if (!inst || !comp) return doc;
  const from = comp.variants.find((x) => x.id === inst.variant) ?? comp.variants[0];
  const v = { id: 'v-' + nid(), name, node: structuredClone(from.node) };
  return { ...doc, comps: doc.comps.map((x) => (x.id === comp.id ? { ...x, variants: [...x.variants, v] } : x)), root: update(doc.root, instId, (i) => ({ ...i, variant: v.id })) };
}
export const countCopies = (pages: { root: SiteNode[] }[], compId: string) => {
  let n = 0;
  const w = (ns: SiteNode[]) => ns.forEach((x) => (x.type === 'instance' && x.comp === compId && n++, x.children && w(x.children), x.template && w([x.template])));
  pages.forEach((p) => w(p.root));
  return n;
};

/* ───────── collections ───────── */

export const entrySlug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'entry';
