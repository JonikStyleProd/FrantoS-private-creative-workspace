import { getAuth, sb } from '../cloud/client';
import { assetUrl } from '../ws/media';
import { ws } from '../ws/store';
import type { Project, SitePage, SiteTheme, SiteNode } from '../ws/types';
import { walk } from './model';
import type { MediaInfo } from './render';
import { fileSlug } from './exportSite';

/**
 * Publishing a page, on purpose: only this page goes public (title, direction, theme, tree and the
 * pictures it shows) as a row in published_pages and files in the public site-media bucket.
 * The project, its other pages, reviews and files stay private. Unpublishing removes both.
 */

export interface PublishedDoc {
  title: string;
  dir: 'ltr' | 'rtl';
  theme: SiteTheme;
  root: SiteNode[];
  media: Record<string, MediaInfo>;
}

export const publicPageUrl = (slug: string) => `${location.origin}${location.pathname}#/w/${slug}`;
export const validSlug = (s: string) => /^[a-z0-9][a-z0-9-]{1,62}$/.test(s);
export const suggestSlug = (p: Project, pg: SitePage) =>
  (fileSlug(`${p.title.split(/\s[·|—–-]\s/)[0]}-${pg.slug}`)
    .normalize('NFKD')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'page').slice(0, 60);

export type PublishBlock = 'no-cloud' | 'signed-out' | 'local-project' | null;
export function publishBlock(p: Project): PublishBlock {
  if (!sb) return 'no-cloud';
  if (!getAuth().session) return 'signed-out';
  if (!p.cloud) return 'local-project';
  return null;
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'video/mp4': 'mp4', 'video/webm': 'webm', 'application/json': 'json' };

async function clearFolder(folder: string) {
  const { data } = await sb!.storage.from('site-media').list(folder, { limit: 1000 });
  if (data?.length) await sb!.storage.from('site-media').remove(data.map((f) => `${folder}/${f.name}`));
}

export async function publishPage(p: Project, pg: SitePage, slug: string, onProgress?: (done: number, total: number) => void): Promise<string> {
  if (publishBlock(p)) throw new Error('blocked');
  if (!validSlug(slug)) throw new Error('slug');
  const studioId = p.cloud!.studioId;
  // the address is someone else's?
  const { data: taken } = await sb!.from('published_pages').select('project_id, page_id').eq('slug', slug).maybeSingle();
  if (taken && (taken.project_id !== p.id || taken.page_id !== pg.id)) throw new Error('taken');
  // the page moved to a new address: the old one goes
  if (pg.published && pg.published.slug !== slug) await unpublishPage(p, pg, true);

  const folder = `${studioId}/${slug}`;
  await clearFolder(folder);
  const ids = new Set<string>();
  walk(pg.root, (n) => n.assetId && ids.add(n.assetId));
  const media: Record<string, MediaInfo> = {};
  let done = 0;
  for (const id of ids) {
    const a = p.assets.find((x) => x.id === id);
    if (!a) continue;
    const lottie = a.format === 'lottie';
    const url = await assetUrl(a, lottie || a.kind === 'video' || a.format === 'svg' ? 'raw' : 'full').catch(() => undefined);
    if (!url) continue;
    const blob = await fetch(url).then((r) => r.blob());
    const ext = a.format === 'svg' ? 'svg' : lottie ? 'json' : EXT[blob.type] ?? (a.kind === 'video' ? 'mp4' : 'jpg');
    const path = `${folder}/${fileSlug(a.title)}-${id.slice(-5).replace(/[^a-z0-9]/gi, '')}.${ext}`;
    const { error } = await sb!.storage.from('site-media').upload(path, blob, { upsert: true, contentType: blob.type || undefined, cacheControl: '3600' });
    if (error) throw error;
    media[id] = { url: sb!.storage.from('site-media').getPublicUrl(path).data.publicUrl, kind: a.kind === 'video' ? 'video' : lottie ? 'lottie' : 'image', w: a.w, h: a.h, alt: a.title };
    onProgress?.(++done, ids.size);
  }
  const doc: PublishedDoc = { title: pg.title, dir: pg.dir, theme: pg.theme, root: pg.root, media };
  const { error } = await sb!.from('published_pages').upsert({ slug, studio_id: studioId, project_id: p.id, page_id: pg.id, doc, published_by: getAuth().session!.user.id, updated_at: new Date().toISOString() }, { onConflict: 'slug' });
  if (error) throw error;
  ws.patchPage(p.id, pg.id, { published: { slug, at: Date.now() } }, 'Page published');
  return publicPageUrl(slug);
}

export async function unpublishPage(p: Project, pg: SitePage, quiet = false): Promise<void> {
  if (!sb || !pg.published || !p.cloud) return;
  const { error } = await sb.from('published_pages').delete().eq('project_id', p.id).eq('page_id', pg.id);
  if (error) throw error;
  await clearFolder(`${p.cloud.studioId}/${pg.published.slug}`).catch(() => undefined);
  if (!quiet) ws.patchPage(p.id, pg.id, { published: undefined }, 'Page unpublished');
}

export async function loadPublished(slug: string): Promise<PublishedDoc | null> {
  if (!sb) return null;
  const { data } = await sb.from('published_pages').select('doc').eq('slug', slug).maybeSingle();
  return (data?.doc as PublishedDoc) ?? null;
}
