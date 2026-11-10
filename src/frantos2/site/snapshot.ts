import { stillToAsset } from '../studio/models';
import { ws } from '../ws/store';
import type { Project, SitePage } from '../ws/types';
import type { MediaInfo } from './render';
import { renderPage } from './render';
import { makeCtx } from './media';
import { viewRoot } from './collections';
import { boardLayout } from './frames';

/**
 * A page → a picture of the whole page at desktop width. The picture becomes a version of the page's
 * work, so review, pins on the picture, approval and the version strip work as for any other work;
 * the tree is kept with the version, so the live page of that version can be opened again.
 */
export async function capturePage(p: Project, page: SitePage, media: Record<string, MediaInfo>, width = 1440, tr?: (s: string) => string): Promise<{ blob: Blob; w: number; h: number }> {
  // an artboard is pictured at its own size, everything in place
  const lay = page.board ? boardLayout(page.board) : null;
  if (lay) width = lay.w;
  const { toBlob } = await import('html-to-image');
  const { css, html } = renderPage({ ...page, root: viewRoot(p, page) }, makeCtx(p, media, { mode: 'container', vh: lay ? `${lay.h}px` : '900px', tr, motion: 'off' }));
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = `position:fixed;left:-30000px;top:0;width:${width}px;${lay ? `height:${lay.h}px;overflow:hidden;` : ''}container:fs / inline-size;pointer-events:none`;
  host.innerHTML = `<style>${css}</style>${html}`;
  // videos and Lottie become their first look: a still of the frame
  host.querySelectorAll('video').forEach((v) => v.replaceWith(Object.assign(document.createElement('div'), { style: 'width:100%;height:100%;background:var(--c-surface)' })));
  document.body.appendChild(host);
  try {
    await Promise.all([
      document.fonts?.ready,
      ...Array.from(host.querySelectorAll('img')).map((i) => {
        i.loading = 'eager';
        return i.decode().catch(() => undefined);
      }),
    ]);
    const h = lay ? lay.h : Math.min(16000, Math.ceil(host.scrollHeight));
    const blob = await toBlob(host, { width, height: h, pixelRatio: lay ? lay.k : 1, backgroundColor: page.theme.bg, cacheBust: false, skipAutoScale: true, style: { position: 'static', left: '0', top: '0', transform: 'none' } });
    if (!blob) throw new Error('capture');
    return { blob, w: lay ? page.board!.w : width, h: lay ? page.board!.h : h };
  } finally {
    host.remove();
  }
}

/** the next review version of a page; returns where to look at it */
export async function pageToReview(p: Project, page: SitePage, media: Record<string, MediaInfo>, tr?: (s: string) => string): Promise<{ workId: string; versionId: string }> {
  const { blob, w, h } = await capturePage(p, page, media, 1440, tr);
  const a = await stillToAsset(blob, w, h, page.title);
  ws.addAsset(p.id, { ...a, format: 'screen', device: 'desktop', source: 'FrantoS Site' });
  const existing = page.workId ? ws.project(p.id)?.works.find((x) => x.id === page.workId) : undefined;
  let workId: string;
  let versionId: string;
  if (existing) {
    workId = existing.id;
    versionId = ws.addVersion(p.id, workId, a.id);
  } else {
    workId = ws.workFromAsset(p.id, a.id);
    ws.linkPageWork(p.id, workId, page.id);
    versionId = ws.project(p.id)!.works.find((x) => x.id === workId)!.versions[0].id;
  }
  // the version keeps the page as drawn, so later changes to components or entries do not alter it
  const snaps = [...(page.snapshots ?? []), { versionId, root: viewRoot(p, page), theme: page.theme, createdAt: Date.now() }].slice(-12);
  ws.patchPage(p.id, page.id, { workId, snapshots: snaps });
  return { workId, versionId };
}
