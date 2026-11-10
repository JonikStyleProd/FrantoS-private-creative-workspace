import type { SiteCollection, SiteEntry, SiteNode, SitePage } from '../ws/types';
import { dsl } from './blocks';
import { entrySlug, resolveTree } from './data';
import { nid } from './model';

/** where an entry opens: the collection page of that collection, as `page--entry.html` */
export const linkFor = (pages: SitePage[]) => (coll: string, e: SiteEntry) => {
  const pg = pages.find((x) => x.collection === coll);
  return pg ? `${pg.slug}--${e.slug}.html` : '#';
};
/** `journal--two-days.html` → page slug and entry slug */
export function parseLink(href: string): { page: string; entry?: string } | null {
  const m = href.match(/^([^#?/]+?)(?:--([^#?/]+))?\.html/);
  return m ? { page: m[1], entry: m[2] } : null;
}

export function newEntry(t: (s: string) => string, cover?: string, i = 0): SiteEntry {
  const title = [t('Why we start with the material'), t('A week in the workshop'), t('Notes on a slow launch')][i % 3];
  return {
    id: 'e-' + nid(),
    slug: entrySlug(title) + (i > 2 ? `-${i}` : ''),
    title,
    excerpt: t('The first two lines of the article, enough to decide whether to read on.'),
    body: t('Write the article here. Short paragraphs read better on a phone: three or four sentences, then a break.'),
    date: ['12.10', '28.09', '14.09'][i % 3],
    cover,
  };
}
export function newCollection(t: (s: string) => string, img: (i: number) => string | undefined): SiteCollection {
  return { id: 'col-' + nid(), name: t('Journal'), entries: [0, 1, 2].map((i) => newEntry(t, img(i + 1), i)) };
}

const { N, S, H, T, B, M } = dsl;
/** a card for a list: cover, date, title, excerpt, link — every field bound to the entry */
export function cardTemplate(t: (s: string) => string): SiteNode {
  return S({ gap: '3' }, [M(undefined, '3/2', { radius: 'md' }, { bind: 'cover' }), T('', { size: 'xs', color: 'muted', weight: 700 }, { bind: 'date', name: 'Date' }), H('', 3, {}, { bind: 'title' }), T('', { color: 'muted' }, { bind: 'excerpt' }), B(t('Read'), 'link', {}, { bind: 'link' })], { name: 'Card' });
}
export function listNode(t: (s: string) => string, coll: string): SiteNode {
  return N('list', { coll, limit: 0, template: cardTemplate(t), s: { cols: 3, gap: '8' }, md: { cols: 2 }, name: 'List of entries' });
}
/** the body of a collection page: date, title, excerpt, cover, text — bound to the entry on screen */
export function entrySection(t: (s: string) => string): SiteNode {
  return N('section', { name: 'Entry', tag: 'article', s: { maxW: 'text', gap: '6', py: '16' } }, [
    T('', { size: 'sm', color: 'muted', weight: 600 }, { bind: 'date', name: 'Date' }),
    H('', 1, { size: '4xl' }, { bind: 'title' }),
    T('', { size: 'xl', color: 'muted' }, { bind: 'excerpt', name: 'Lede' }),
    M(undefined, '16/9', { radius: 'md' }, { bind: 'cover', name: 'Cover' }),
    T('', {}, { bind: 'body', name: 'Text' }),
    B(t('Back to the journal'), 'outline'),
  ]);
}

/** a page's tree with its copies of components and its lists expanded — what the renderer draws */
export function viewRoot(p: { pages?: SitePage[]; components?: import('../ws/types').SiteComponent[]; collections?: SiteCollection[] }, page: { root: SiteNode[]; collection?: string }, entryId?: string): SiteNode[] {
  const colls = p.collections ?? [];
  const coll = page.collection ? colls.find((c) => c.id === page.collection) : undefined;
  const entry = coll ? coll.entries.find((e) => e.id === entryId || e.slug === entryId) ?? coll.entries[0] : undefined;
  return resolveTree(page.root, { comps: p.components ?? [], colls, entry, linkFor: linkFor(p.pages ?? []) }).root;
}
