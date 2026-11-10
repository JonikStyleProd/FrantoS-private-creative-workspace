import { stripMetadata } from './stripMeta';
import { useEffect, useState } from 'react';
import { get, set } from 'idb-keyval';
import { Asset } from './types';
import { uid } from './store';
import { signedUrl } from '../cloud/client';
import { tr } from '../i18n';
import { audioPreview, codePreview, deviceFor, fontPreview, FORMAT_ACCEPT, linkPreview, lottiePreview, sniff, svgPreview } from './formats';
import type { AssetFormat } from './types';

export const MEDIA_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime';
/** pictures, video and every other kind of material the library keeps */
export const ACCEPT = `${MEDIA_ACCEPT},${FORMAT_ACCEPT}`;
const OTHER_MAX = 30 * 1024 * 1024;
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
    throw new UploadError('decode', tr('This image could not be read. It may be damaged or in an unsupported format.'));
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
    throw new UploadError('decode', tr('This video could not be read in the browser. Try MP4 (H.264) or WebM.'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Validate, read and store a file. Returns an Asset ready to add to a project. */
export async function ingest(input: File, opts: { isReference: boolean; screen?: boolean }): Promise<Asset> {
  const other = await sniff(input);
  if (other) return ingestOther(input, other.format, other.lang, opts);
  const isImage = input.type.startsWith('image/');
  // location and camera data never leave the photo's owner: stripped before anything is stored
  const file = isImage ? await stripMetadata(input) : input;
  const isVideo = file.type.startsWith('video/');
  if (!isImage && !isVideo) throw new UploadError('type', tr('{name}: this kind of file cannot be added. Pictures, video, SVG, Lottie, fonts, code and sound can.', { name: file.name }));
  if (isImage && file.size > IMAGE_MAX) throw new UploadError('size', tr('{name} is {size}. Images up to {max}.', { name: file.name, size: mb(file.size), max: mb(IMAGE_MAX) }));
  if (isVideo && file.size > VIDEO_MAX) throw new UploadError('size', tr('{name} is {size}. Video up to {max}.', { name: file.name, size: mb(file.size), max: mb(VIDEO_MAX) }));

  const meta = isImage ? await imageMeta(file) : await videoMeta(file);
  const id = uid('a-');
  const blobKey = `blob:${id}`;
  const thumbKey = meta.thumb ? `blob:${id}:t` : undefined;
  await store(blobKey, file, thumbKey, meta.thumb);
  const palette = meta.thumb ? await extractPalette(meta.thumb) : [];
  return {
    id,
    palette,
    kind: isImage ? 'image' : 'video',
    ...(isImage && opts.screen ? { format: 'screen' as const, device: deviceFor(meta.w, meta.h) } : {}),
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

async function store(blobKey: string, file: Blob, thumbKey?: string, thumb?: Blob | null) {
  try {
    await set(blobKey, file);
    if (thumbKey && thumb) await set(thumbKey, thumb);
  } catch {
    throw new UploadError('storage', tr('The browser refused to store this file (storage is full or blocked). Free some space or try a smaller file.'));
  }
}

/** SVG, Lottie, fonts, code and sound: the original is kept, a preview picture stands in for it */
async function ingestOther(file: File, format: AssetFormat, lang: string | undefined, opts: { isReference: boolean }): Promise<Asset> {
  if (file.size > OTHER_MAX) throw new UploadError('size', tr('{name} is {size}. Files of this kind up to {max}.', { name: file.name, size: mb(file.size), max: mb(OTHER_MAX) }));
  const title = file.name.replace(/\.[a-z0-9]+$/i, '');
  let meta: { w: number; h: number; thumb: Blob | null; duration?: number };
  let text: string | undefined;
  try {
    if (format === 'svg') meta = await svgPreview(file);
    else if (format === 'font') meta = await fontPreview(file, title);
    else if (format === 'audio') meta = await audioPreview(file, title);
    else if (format === 'lottie') meta = await lottiePreview(JSON.parse(await file.text()));
    else {
      text = (await file.text()).slice(0, 200_000);
      meta = await codePreview(text, file.name, lang ?? 'text');
    }
  } catch {
    throw new UploadError('decode', tr('{name} could not be read. It may be damaged or in a version the browser does not support.', { name: file.name }));
  }
  const id = uid('a-');
  const blobKey = `blob:${id}`;
  const thumbKey = `blob:${id}:t`;
  await store(blobKey, file, thumbKey, meta.thumb);
  const palette = meta.thumb && (format === 'svg' || format === 'lottie') ? await extractPalette(meta.thumb) : [];
  return { id, kind: 'image', format, lang, text, title, blobKey, thumbKey, w: meta.w, h: meta.h, duration: meta.duration, palette, createdAt: Date.now(), isReference: opts.isReference, ready: true };
}

/** a website as a material: its address and a drawn card (pages from other sites cannot be read from the browser) */
export async function linkAsset(url: string, title: string | undefined, opts: { isReference: boolean }): Promise<Asset> {
  const clean = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    new URL(clean);
  } catch {
    throw new UploadError('type', tr('This does not look like a web address.'));
  }
  const meta = await linkPreview(clean, title);
  const id = uid('a-');
  const thumbKey = `blob:${id}:t`;
  await store(thumbKey, meta.thumb!);
  let host = clean;
  try {
    host = new URL(clean).hostname.replace(/^www\./, '');
  } catch {
    /* fine */
  }
  return { id, kind: 'image', format: 'link', text: clean, title: title || host, thumbKey, blobKey: thumbKey, w: meta.w, h: meta.h, createdAt: Date.now(), isReference: opts.isReference, ready: true };
}

/** formats whose stored file is not a picture: shown everywhere by their preview */
export const previewOnly = (a: Asset) => !!a.format && a.format !== 'screen' && a.format !== 'svg';

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

/** the same lookup as useAssetUrl, outside React (exports, composites) */
export async function assetUrl(a: Asset, size: 'full' | 'thumb' = 'full'): Promise<string | undefined> {
  if (previewOnly(a)) size = 'thumb';
  const staticUrl = size === 'thumb' ? a.thumb ?? a.src : a.src;
  if (staticUrl) return staticUrl;
  const key = size === 'thumb' ? a.thumbKey ?? a.blobKey : a.blobKey;
  const local = key ? await loadUrl(key) : undefined;
  if (local) return local;
  const cloudPath = size === 'thumb' ? a.thumbPath ?? a.storagePath : a.storagePath;
  return cloudPath ? (await signedUrl(cloudPath)) ?? undefined : undefined;
}

export function useAssetUrl(a: Asset | undefined, size: 'full' | 'thumb' | 'raw' = 'full') {
  // 'raw' = the original file (font, sound, Lottie JSON); 'full' of those formats is their preview
  if (size === 'raw') size = 'full';
  else if (a && previewOnly(a)) size = 'thumb';
  const staticUrl = a ? (size === 'thumb' ? a.thumb ?? a.src : a.src) : undefined;
  const key = a ? (size === 'thumb' ? a.thumbKey ?? a.blobKey : a.blobKey) : undefined;
  const cloudPath = a ? (size === 'thumb' ? a.thumbPath ?? a.storagePath : a.storagePath) : undefined;
  const [url, setUrl] = useState<string | undefined>(() => staticUrl ?? (key ? urlCache.get(key) : undefined));
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (staticUrl) {
      setUrl(staticUrl);
      return;
    }
    let live = true;
    const fromCloud = () =>
      cloudPath
        ? signedUrl(cloudPath).then((u) => live && (u ? setUrl(u) : setMissing(true)))
        : live && setMissing(true);
    if (!key) {
      fromCloud();
      return () => {
        live = false;
      };
    }
    loadUrl(key).then((u) => {
      if (!live) return;
      if (u) setUrl(u);
      else fromCloud();
    });
    return () => {
      live = false;
    };
  }, [staticUrl, key, cloudPath]);
  return { url, missing };
}

/** dominant colours of an image, for the project palette */
export async function extractPalette(src: Blob | string, n = 5): Promise<string[]> {
  try {
    const bmp = typeof src === 'string' ? await fetch(src).then((r) => r.blob()).then((b) => createImageBitmap(b)) : await createImageBitmap(src);
    const c = document.createElement('canvas');
    c.width = 48;
    c.height = 48;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(bmp, 0, 0, 48, 48);
    const d = ctx.getImageData(0, 0, 48, 48).data;
    const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const k = `${r >> 5}-${g >> 5}-${b >> 5}`;
      const e = buckets.get(k) ?? { r: 0, g: 0, b: 0, n: 0 };
      e.r += r; e.g += g; e.b += b; e.n++;
      buckets.set(k, e);
    }
    const hex = (v: number) => Math.round(v).toString(16).padStart(2, '0');
    const sorted = [...buckets.values()].sort((a, b) => b.n - a.n);
    const out: { r: number; g: number; b: number }[] = [];
    for (const e of sorted) {
      const col = { r: e.r / e.n, g: e.g / e.n, b: e.b / e.n };
      // keep colours that are visibly different
      if (out.every((o) => Math.abs(o.r - col.r) + Math.abs(o.g - col.g) + Math.abs(o.b - col.b) > 60)) out.push(col);
      if (out.length >= n) break;
    }
    return out.map((o) => `#${hex(o.r)}${hex(o.g)}${hex(o.b)}`);
  } catch {
    return [];
  }
}

export function fmtTime(t: number) {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}
