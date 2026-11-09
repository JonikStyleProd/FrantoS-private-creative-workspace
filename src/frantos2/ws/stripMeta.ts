/**
 * Remove location and camera metadata from an image before it is stored or uploaded.
 * Lossless: the image data is copied byte for byte, only the metadata blocks are dropped.
 *   JPEG — APP1 Exif / XMP and APP13 (IPTC) segments; colour profiles (APP2) stay.
 *   PNG  — eXIf and text chunks (tEXt / zTXt / iTXt, where XMP lives).
 *   WebP — EXIF and XMP chunks (and their VP8X flags).
 * A JPEG whose Exif says "rotate me" is redrawn upright first, so dropping the tag does not turn the photo.
 * Other formats are returned unchanged.
 */
export async function stripMetadata(file: File): Promise<File> {
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    let out: Uint8Array | null = null;
    if (file.type === 'image/jpeg' || (buf[0] === 0xff && buf[1] === 0xd8)) {
      const r = stripJpeg(buf);
      if (r.orientation > 1) return await redrawUpright(file);
      out = r.bytes;
    } else if (file.type === 'image/png' || isPng(buf)) out = stripPng(buf);
    else if (file.type === 'image/webp' || isWebp(buf)) out = stripWebp(buf);
    if (!out || out.length === buf.length) return file;
    return new File([out as BlobPart], file.name, { type: file.type, lastModified: file.lastModified });
  } catch {
    // never block an upload over metadata: the original goes through
    return file;
  }
}

const ascii = (b: Uint8Array, at: number, n: number) => String.fromCharCode(...b.subarray(at, at + n));

export function stripJpeg(b: Uint8Array): { bytes: Uint8Array; orientation: number } {
  if (b[0] !== 0xff || b[1] !== 0xd8) return { bytes: b, orientation: 1 };
  const parts: Uint8Array[] = [b.subarray(0, 2)];
  let i = 2;
  let orientation = 1;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) break;
    const marker = b[i + 1];
    if (marker === 0xda) {
      // start of scan: the rest is image data
      parts.push(b.subarray(i));
      i = b.length;
      break;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      parts.push(b.subarray(i, i + 2));
      i += 2;
      continue;
    }
    const len = (b[i + 2] << 8) | b[i + 3];
    const seg = b.subarray(i, i + 2 + len);
    const isExif = marker === 0xe1 && ascii(b, i + 4, 6) === 'Exif\0\0';
    const isXmp = marker === 0xe1 && ascii(b, i + 4, 28).startsWith('http://ns.adobe.com/xap');
    const isIptc = marker === 0xed;
    if (isExif) orientation = exifOrientation(b.subarray(i + 10, i + 2 + len));
    if (!(isExif || isXmp || isIptc)) parts.push(seg);
    i += 2 + len;
  }
  if (i < b.length) parts.push(b.subarray(i));
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) out.set(p, (o += p.length) - p.length);
  return { bytes: out, orientation };
}

function exifOrientation(tiff: Uint8Array): number {
  if (tiff.length < 8) return 1;
  const le = tiff[0] === 0x49;
  const u16 = (at: number) => (le ? tiff[at] | (tiff[at + 1] << 8) : (tiff[at] << 8) | tiff[at + 1]);
  const u32 = (at: number) => (le ? (tiff[at] | (tiff[at + 1] << 8) | (tiff[at + 2] << 16) | (tiff[at + 3] << 24)) >>> 0 : ((tiff[at] << 24) | (tiff[at + 1] << 16) | (tiff[at + 2] << 8) | tiff[at + 3]) >>> 0);
  const ifd = u32(4);
  if (ifd + 2 > tiff.length) return 1;
  const n = u16(ifd);
  for (let k = 0; k < n; k++) {
    const e = ifd + 2 + k * 12;
    if (e + 12 > tiff.length) break;
    if (u16(e) === 0x0112) return u16(e + 8) || 1;
  }
  return 1;
}

const isPng = (b: Uint8Array) => b[0] === 0x89 && ascii(b, 1, 3) === 'PNG';
export function stripPng(b: Uint8Array): Uint8Array {
  if (!isPng(b)) return b;
  const drop = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt']);
  const parts: Uint8Array[] = [b.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= b.length) {
    const len = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
    const type = ascii(b, i + 4, 4);
    const end = i + 12 + len;
    if (!drop.has(type)) parts.push(b.subarray(i, end));
    i = end;
    if (type === 'IEND') break;
  }
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) out.set(p, (o += p.length) - p.length);
  return out;
}

const isWebp = (b: Uint8Array) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP';
export function stripWebp(b: Uint8Array): Uint8Array {
  if (!isWebp(b)) return b;
  const parts: Uint8Array[] = [];
  let i = 12;
  while (i + 8 <= b.length) {
    const type = ascii(b, i, 4);
    const len = (b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24)) >>> 0;
    const end = i + 8 + len + (len & 1);
    if (type !== 'EXIF' && type !== 'XMP ') {
      const chunk = b.slice(i, Math.min(end, b.length));
      if (type === 'VP8X') chunk[8] &= ~0x0c; // clear the EXIF and XMP flags
      parts.push(chunk);
    }
    i = end;
  }
  const body = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(12 + body);
  out.set(b.subarray(0, 12));
  const size = 4 + body;
  out[4] = size & 255;
  out[5] = (size >> 8) & 255;
  out[6] = (size >> 16) & 255;
  out[7] = (size >> 24) & 255;
  let o = 12;
  for (const p of parts) out.set(p, (o += p.length) - p.length);
  return out;
}

/** browsers apply the Exif rotation when decoding; draw that upright and save a fresh JPEG */
async function redrawUpright(file: File): Promise<File> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const c = document.createElement('canvas');
  c.width = bmp.width;
  c.height = bmp.height;
  c.getContext('2d')!.drawImage(bmp, 0, 0);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.95));
  if (!blob) return file;
  return new File([blob], file.name, { type: 'image/jpeg', lastModified: file.lastModified });
}
