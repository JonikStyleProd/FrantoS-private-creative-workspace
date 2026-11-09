import { set } from 'idb-keyval';
import { tr } from '../i18n';
import { uid } from '../ws/store';
import { UploadError } from '../ws/media';
import type { Asset } from '../ws/types';

const MODEL_MAX = 80 * 1024 * 1024;

/** Store a GLB in this browser (IndexedDB), like any other upload. */
export async function ingestModel(file: File): Promise<Asset> {
  const ok = /\.glb$/i.test(file.name) || file.type === 'model/gltf-binary';
  if (!ok) throw new UploadError('type', tr('{name}: 3D models are imported as GLB (binary glTF). Export GLB from Blender, Cinema 4D or Spline.', { name: file.name }));
  if (file.size > MODEL_MAX) throw new UploadError('size', tr('{name} is too large for the browser. Models up to 80 MB.', { name: file.name }));
  const id = uid('a-');
  const blobKey = `blob:${id}`;
  try {
    await set(blobKey, file);
  } catch {
    throw new UploadError('storage', tr('The browser refused to store this file (storage is full or blocked). Free some space or try a smaller file.'));
  }
  return { id, kind: 'model', title: file.name.replace(/\.glb$/i, ''), blobKey, w: 1, h: 1, createdAt: Date.now(), isReference: false, ready: true };
}

/** Turn a rendered still into a project asset (stored like an upload). */
export async function stillToAsset(blob: Blob, w: number, h: number, title: string): Promise<Asset> {
  const id = uid('a-');
  const blobKey = `blob:${id}`;
  const thumbKey = `blob:${id}:t`;
  const thumb = await downscale(blob, 480);
  await set(blobKey, blob);
  await set(thumbKey, thumb);
  return { id, kind: 'image', title, blobKey, thumbKey, w, h, createdAt: Date.now(), isReference: false, ready: true, source: 'FrantoS Studio render' };
}

export async function downscale(blob: Blob, max: number, type = 'image/webp'): Promise<Blob> {
  const bmp = await createImageBitmap(blob);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob((b) => r(b!), type, 0.82));
}

export function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.readAsDataURL(b);
  });
}
