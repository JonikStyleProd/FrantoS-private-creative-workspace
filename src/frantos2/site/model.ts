import type { SiteNode, SiteNodeType, SitePage, SiteStyle } from '../ws/types';

let seq = 0;
/** node ids: unique without importing the store (the demo seeds build pages too) */
export const nid = () => `n-${Date.now().toString(36)}${(seq++ % 1296).toString(36).padStart(2, '0')}${Math.random().toString(36).slice(2, 6)}`;

/** Tree helpers for pages: pure functions, the editor commits their result in one step for undo. */

export type Bp = 'lg' | 'md' | 'sm';
export const BPS: { id: Bp; label: string; w: number; h: number }[] = [
  { id: 'sm', label: 'Phone', w: 390, h: 844 },
  { id: 'md', label: 'Tablet', w: 768, h: 1024 },
  { id: 'lg', label: 'Desktop', w: 1440, h: 900 },
];

export const CONTAINERS: SiteNodeType[] = ['section', 'stack', 'grid'];
export const isContainer = (n: SiteNode) => CONTAINERS.includes(n.type);
export const hasText = (n: SiteNode) => n.type === 'heading' || n.type === 'text' || n.type === 'button' || n.type === 'field';

/** the style in effect at a width: desktop, then tablet, then phone overrides */
export function styleAt(n: SiteNode, bp: Bp): SiteStyle {
  if (bp === 'lg') return { ...n.s };
  if (bp === 'md') return { ...n.s, ...n.md };
  return { ...n.s, ...n.md, ...n.sm };
}
/** which width a value at this width comes from */
export function sourceOf(n: SiteNode, bp: Bp, k: keyof SiteStyle): Bp | null {
  if (bp === 'sm' && n.sm && k in n.sm) return 'sm';
  if (bp !== 'lg' && n.md && k in n.md) return 'md';
  if (n.s && k in n.s) return 'lg';
  return null;
}
export function setStyle(n: SiteNode, bp: Bp, patch: Partial<SiteStyle>): SiteNode {
  const key = bp === 'lg' ? 's' : bp;
  const cur = { ...(n[key] ?? {}) } as Record<string, unknown>;
  Object.entries(patch).forEach(([k, v]) => (v === undefined ? delete cur[k] : (cur[k] = v)));
  return { ...n, [key]: Object.keys(cur).length ? cur : undefined };
}

export function walk(nodes: SiteNode[], fn: (n: SiteNode, parent: SiteNode | null, depth: number) => void, parent: SiteNode | null = null, depth = 0) {
  for (const n of nodes) {
    fn(n, parent, depth);
    if (n.children) walk(n.children, fn, n, depth + 1);
  }
}
export function find(nodes: SiteNode[], id: string): SiteNode | undefined {
  let hit: SiteNode | undefined;
  walk(nodes, (n) => n.id === id && (hit = n));
  return hit;
}
/** parent id ('' for the page) and index */
export function locate(nodes: SiteNode[], id: string, parent = ''): { parent: string; index: number } | null {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) return { parent, index: i };
    const c = nodes[i].children;
    if (c) {
      const r = locate(c, id, nodes[i].id);
      if (r) return r;
    }
  }
  return null;
}
export function pathTo(nodes: SiteNode[], id: string): SiteNode[] {
  for (const n of nodes) {
    if (n.id === id) return [n];
    if (n.children) {
      const r = pathTo(n.children, id);
      if (r.length) return [n, ...r];
    }
  }
  return [];
}

export function update(nodes: SiteNode[], id: string, fn: (n: SiteNode) => SiteNode): SiteNode[] {
  return nodes.map((n) => (n.id === id ? fn(n) : n.children ? { ...n, children: update(n.children, id, fn) } : n));
}
export function remove(nodes: SiteNode[], id: string): SiteNode[] {
  return nodes.filter((n) => n.id !== id).map((n) => (n.children ? { ...n, children: remove(n.children, id) } : n));
}
export function insert(nodes: SiteNode[], parent: string, index: number, node: SiteNode): SiteNode[] {
  if (!parent) {
    const out = [...nodes];
    out.splice(Math.max(0, Math.min(index, out.length)), 0, node);
    return out;
  }
  return nodes.map((n) => {
    if (n.id === parent) {
      const c = [...(n.children ?? [])];
      c.splice(Math.max(0, Math.min(index, c.length)), 0, node);
      return { ...n, children: c };
    }
    return n.children ? { ...n, children: insert(n.children, parent, index, node) } : n;
  });
}
/** move a node; refuses to put a node inside itself */
export function move(nodes: SiteNode[], id: string, parent: string, index: number): SiteNode[] {
  const node = find(nodes, id);
  const from = locate(nodes, id);
  if (!node || !from) return nodes;
  if (parent && (parent === id || find(node.children ?? [], parent))) return nodes;
  // sections live at the top; anything else lives in a container
  if ((node.type === 'section') !== !parent) return nodes;
  const adj = from.parent === parent && from.index < index ? index - 1 : index;
  return insert(remove(nodes, id), parent, adj, node);
}
export function clone(n: SiteNode): SiteNode {
  return { ...n, id: nid(), children: n.children?.map(clone) };
}
export function duplicate(nodes: SiteNode[], id: string): { nodes: SiteNode[]; id: string } {
  const n = find(nodes, id);
  const at = locate(nodes, id);
  if (!n || !at) return { nodes, id };
  const c = clone(n);
  return { nodes: insert(nodes, at.parent, at.index + 1, c), id: c.id };
}
export function wrap(nodes: SiteNode[], id: string): { nodes: SiteNode[]; id: string } {
  const n = find(nodes, id);
  const at = locate(nodes, id);
  if (!n || !at || n.type === 'section') return { nodes, id };
  const box: SiteNode = { id: nid(), type: 'stack', s: { dir: 'col', gap: '4' }, children: [n] };
  return { nodes: insert(remove(nodes, id), at.parent, at.index, box), id: box.id };
}

export function assetIds(page: Pick<SitePage, 'root'>): string[] {
  const out = new Set<string>();
  walk(page.root, (n) => n.assetId && out.add(n.assetId));
  return [...out];
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '') || 'page';
