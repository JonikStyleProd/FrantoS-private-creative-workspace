import { useEffect, useState } from 'react';
import { get, set } from 'idb-keyval';
import { Asset } from './types';
import { uid } from './store';

export const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime';
const IMAGE_MAX = 40 * 1024 * 1024;
const VIDEO_MAX = 250 * 1024 * 1024;

export class UploadError extends Error {
  constructor(public code: 'type' | 'size' | 'decode' | 'storage', message: string) {
    super(message);
  }
}

const mb = (n: number) => `${Math.round(n / 1024 / 1024)} MB`;

async function imageMeta(file: Blob) {
  try {
    const bmp = await createImageBitmap(file);
    const { width: w, height: h } = bmp;
    const s = Math.min(1, 640 / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.round(w * s);
    c.height = Math.round(h * s);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close?.();
    const thumb = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/webp', 0.8));
    return { w, h, thumb };
  } catch {
    throw new UploadError('decode', 'This image could not be read. It may be damaged or in an unsupported format.');
  }
}

async function videoMeta(file: Blob) {
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.src = url;
    await new Promise<void>((res, rej) => {
      v.onloadeddata = () => res();
      v.onerror = () => rej(new Error('decode'));
      setTimeout(() => rej(new Error('timeout')), 15000);
    });
    const w = v.videoWidth || 1280;
    const h = v.videoHeight || 720;
    const duration = isFinite(v.duration) ? v.duration : 0;
    try {
      v.currentTime = Math.min(0.2, duration / 2);
      await new Promise((r) => (v.onseeked = r));
    } catch {
      /* first frame is fine */
    }
    const s = Math.min(1, 640 / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.round(w * s);
    c.height = Math.round(h * s);
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
    const thumb = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/webp', 0.8));
    return { w, h, duration, thumb };
  } catch {
    throw new UploadError('decode', 'This video could not be read in the browser. Try MP4 (H.264) or WebM.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Validate, read and store a file. Returns an Asset ready to add to a project. */
export async function ingest(file: File, opts: { isReference: boolean }): Promise<Asset> {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  if (!isImage && !isVideo) throw new UploadError('type', `${file.name}: only images (JPG, PNG, WebP, GIF, AVIF) and video (MP4, WebM, MOV) can be added.`);
  if (isImage && file.size > IMAGE_MAX) throw new UploadError('size', `${file.name} is ${mb(file.size)}. Images up to ${mb(IMAGE_MAX)}.`);
  if (isVideo && file.size > VIDEO_MAX) throw new UploadError('size', `${file.name} is ${mb(file.size)}. Video up to ${mb(VIDEO_MAX)}.`);

  const meta = isImage ? await imageMeta(file) : await videoMeta(file);
  const id = uid('a-');
  const blobKey = `blob:${id}`;
  const thumbKey = meta.thumb ? `blob:${id}:t` : undefined;
  try {
    await set(blobKey, file);
    if (thumbKey && meta.thumb) await set(thumbKey, meta.thumb);
  } catch {
    throw new UploadError('storage', 'The browser refused to store this file (storage is full or blocked). Free some space or try a smaller file.');
  }
  return {
    id,
    kind: isImage ? 'image' : 'video',
    title: file.name.replace(/\.[a-z0-9]+$/i, ''),
    blobKey,
    thumbKey,
    w: meta.w,
    h: meta.h,
    duration: 'duration' in meta ? (meta as { duration: number }).duration : undefined,
    createdAt: Date.now(),
    isReference: opts.isReference,
    ready: true,
  };
}

/* ───────── object URLs for stored blobs ───────── */

const urlCache = new Map<string, string>();
const pending = new Map<string, Promise<string | undefined>>();

function loadUrl(key: string) {
  if (urlCache.has(key)) return Promise.resolve(urlCache.get(key));
  if (!pending.has(key)) {
    pending.set(
      key,
      get(key).then((b) => {
        if (!(b instanceof Blob)) return undefined;
        const u = URL.createObjectURL(b);
        urlCache.set(key, u);
        return u;
      })
    );
  }
  return pending.get(key)!;
}

export function useAssetUrl(a: Asset | undefined, size: 'full' | 'thumb' = 'full') {
  const staticUrl = a ? (size === 'thumb' ? a.thumb ?? a.src : a.src) : undefined;
  const key = a ? (size === 'thumb' ? a.thumbKey ?? a.blobKey : a.blobKey) : undefined;
  const [url, setUrl] = useState<string | undefined>(() => staticUrl ?? (key ? urlCache.get(key) : undefined));
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (staticUrl) {
      setUrl(staticUrl);
      return;
    }
    if (!key) return;
    let live = true;
    loadUrl(key).then((u) => {
      if (!live) return;
      if (u) setUrl(u);
      else setMissing(true);
    });
    return () => {
      live = false;
    };
  }, [staticUrl, key]);
  return { url, missing };
}

export function fmtTime(t: number) {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}
