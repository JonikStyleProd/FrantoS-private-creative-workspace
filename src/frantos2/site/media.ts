import { useEffect, useMemo, useState } from 'react';
import { assetUrl } from '../ws/media';
import type { Project, SiteNode } from '../ws/types';
import { walk } from './model';
import type { MediaInfo, RenderCtx } from './render';

/** Resolve every picture, video and Lottie a page uses to a URL the renderer can write. */
export function useSiteMedia(p: Project, root: SiteNode[]) {
  return useSiteMediaState(p, root).media;
}
/** the same, plus whether the first lookup is done (motion waits for it, so it does not start twice) */
export function useSiteMediaState(p: Project, root: SiteNode[]) {
  const ids = useMemo(() => {
    const s = new Set<string>();
    walk(root, (n) => n.assetId && s.add(n.assetId));
    return [...s].sort().join(',');
  }, [root]);
  const [map, setMap] = useState<Record<string, MediaInfo>>({});
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    (async () => {
      const next: Record<string, MediaInfo> = {};
      await Promise.all(
        ids
          .split(',')
          .filter(Boolean)
          .map(async (id) => {
            const a = p.assets.find((x) => x.id === id);
            if (!a) return;
            const lottie = a.format === 'lottie';
            const url = await assetUrl(a, lottie ? 'raw' : 'full').catch(() => undefined);
            if (url) next[id] = { url, kind: a.kind === 'video' ? 'video' : lottie ? 'lottie' : 'image', w: a.w, h: a.h, alt: a.title };
          })
      );
      if (live) {
        setMap(next);
        setReady(true);
      }
    })();
    return () => void (live = false);
  }, [ids, p.assets]);
  return { media: map, ready };
}

export function makeCtx(p: Project, media: Record<string, MediaInfo>, extra: Partial<RenderCtx> & Pick<RenderCtx, 'mode'>): RenderCtx {
  return {
    media: (id) => media[id],
    objectThumb: (oid) => (p.objects ?? []).find((o) => o.id === oid)?.thumb,
    ...extra,
  };
}
