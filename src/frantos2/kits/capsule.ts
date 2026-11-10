/**
 * Project capsule: the whole project in one ZIP — every original file, the project as JSON, and a case PDF
 * drawn page by page on canvas (so Hebrew and Russian set correctly without embedding fonts).
 */
import type { Asset, Project } from '../ws/types';
import { assetUrl } from '../ws/media';
import { tr } from '../i18n';

/* ───────── ZIP (stored, no compression: pictures and video are compressed already) ───────── */
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(d: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
export function zip(files: { name: string; data: Uint8Array }[]): Blob {
  const enc = new TextEncoder();
  const parts: BlobPart[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const head = new DataView(new ArrayBuffer(30));
    head.setUint32(0, 0x04034b50, true);
    head.setUint16(4, 20, true);
    head.setUint16(6, 0x0800, true); // UTF-8 names
    head.setUint16(8, 0, true);
    head.setUint16(10, dosTime, true);
    head.setUint16(12, dosDate, true);
    head.setUint32(14, crc, true);
    head.setUint32(18, f.data.length, true);
    head.setUint32(22, f.data.length, true);
    head.setUint16(26, name.length, true);
    parts.push(head.buffer, name, f.data as BlobPart);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(12, dosTime, true);
    c.setUint16(14, dosDate, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, f.data.length, true);
    c.setUint32(24, f.data.length, true);
    c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    const entry = new Uint8Array(46 + name.length);
    entry.set(new Uint8Array(c.buffer), 0);
    entry.set(name, 46);
    central.push(entry);
    offset += 30 + name.length + f.data.length;
  }
  const size = central.reduce((n, e) => n + e.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, size, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...(central as BlobPart[]), end.buffer], { type: 'application/zip' });
}

/* ───────── PDF from page images ───────── */
/** `fit`: each page takes its picture's size (a long web page stays one page) instead of A4 */
export async function pdfFromPages(pages: HTMLCanvasElement[], title: string, fit = false): Promise<Blob> {
  const enc = new TextEncoder();
  const parts: BlobPart[] = [];
  const offsets: number[] = [];
  let len = 0;
  const push = (b: Uint8Array | string) => {
    const u = typeof b === 'string' ? enc.encode(b) : b;
    parts.push(u as BlobPart);
    len += u.length;
  };
  const obj = (n: number, body: () => void) => {
    offsets[n] = len;
    push(`${n} 0 obj\n`);
    body();
    push('\nendobj\n');
  };
  const A4W = 595.28;
  const A4H = 841.89; // A4 in points
  const n = pages.length;
  // objects: 1 catalog, 2 pages, then per page: page, image, content
  push('%PDF-1.4\n');
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push(`<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] /Count ${n} >>`));
  for (let i = 0; i < n; i++) {
    const c = pages[i];
    const [W, H] = fit ? [Math.min(14400, c.width * 0.75), Math.min(14400, c.height * 0.75)] : [A4W, A4H];
    const jpeg = new Uint8Array(await (await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.88))).arrayBuffer());
    const pid = 3 + i * 3;
    const ops = `q\n${W} 0 0 ${H} 0 0 cm\n/Im0 Do\nQ\n`;
    obj(pid, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${pid + 1} 0 R >> >> /Contents ${pid + 2} 0 R >>`));
    obj(pid + 1, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
      push(jpeg);
      push('\nendstream');
    });
    obj(pid + 2, () => push(`<< /Length ${ops.length} >>\nstream\n${ops}endstream`));
  }
  const info = 3 + n * 3;
  obj(info, () => push(`<< /Title (${title.replace(/[\\()]/g, '\\$&').replace(/[^\x20-\x7e]/g, '')}) /Creator (FrantoS) >>`));
  const xref = len;
  push(`xref\n0 ${info + 1}\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`);
  push(`trailer\n<< /Size ${info + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts, { type: 'application/pdf' });
}

/* ───────── the case, drawn ───────── */
const PW = 1240;
const PH = 1754;
const FONT = "'Manrope Variable', 'Heebo Variable', system-ui, sans-serif";

async function image(a?: Asset) {
  if (!a) return null;
  const url = await assetUrl(a, 'full');
  if (!url) return null;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  try {
    await img.decode();
    return img;
  } catch {
    return null;
  }
}
function page(bg = '#f4f0ea') {
  const c = document.createElement('canvas');
  c.width = PW;
  c.height = PH;
  const x = c.getContext('2d')!;
  x.fillStyle = bg;
  x.fillRect(0, 0, PW, PH);
  return { c, x };
}
function fit(x: CanvasRenderingContext2D, img: HTMLImageElement, l: number, t: number, w: number, h: number, cover = false) {
  const s = (cover ? Math.max : Math.min)(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  x.save();
  x.beginPath();
  x.rect(l, t, w, h);
  x.clip();
  x.drawImage(img, l + (w - dw) / 2, t + (h - dh) / 2, dw, dh);
  x.restore();
}
function words(x: CanvasRenderingContext2D, text: string, l: number, t: number, w: number, size: number, weight = 500, color = '#1b1916', lh = 1.4, max = 99, rtl = false) {
  x.font = `${weight} ${size}px ${FONT}`;
  x.fillStyle = color;
  x.direction = rtl ? 'rtl' : 'ltr';
  x.textAlign = rtl ? 'right' : 'left';
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (x.measureText(next).width > w && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
  }
  lines.slice(0, max).forEach((ln, i) => x.fillText(ln, rtl ? l + w : l, t + size + i * size * lh));
  return t + Math.min(lines.length, max) * size * lh;
}

export async function casePages(p: Project, rtl: boolean): Promise<HTMLCanvasElement[]> {
  await document.fonts?.ready;
  const M = 96;
  const out: HTMLCanvasElement[] = [];
  const byId = (id?: string) => p.assets.find((a) => a.id === id);
  // cover
  {
    const { c, x } = page('#14171c');
    const img = await image(byId(p.coverAssetId) ?? p.assets.find((a) => a.kind === 'image' && !a.isReference));
    if (img) fit(x, img, 0, 0, PW, PH * 0.62, true);
    let y = words(x, p.title, M, PH * 0.66, PW - M * 2, 76, 800, '#f4f0ea', 1.1, 3, rtl);
    if (p.brief) y = words(x, tr(p.brief), M, y + 30, PW - M * 2, 30, 500, 'rgba(244,240,234,0.8)', 1.45, 8, rtl);
    words(x, `${new Date().toLocaleDateString()} · FrantoS`, M, PH - M - 30, PW - M * 2, 22, 600, 'rgba(244,240,234,0.55)', 1.2, 1, rtl);
    out.push(c);
  }
  // a page per work: the approved (or latest) version, and what was said about it
  for (const w of p.works) {
    const v = w.versions.find((x) => x.id === w.approvedVersionId) ?? w.versions[w.versions.length - 1];
    if (!v) continue;
    const { c, x } = page();
    const img = await image(byId(v.assetId));
    if (img) fit(x, img, M, M, PW - M * 2, PH * 0.56);
    let y = PH * 0.56 + M + 30;
    y = words(x, w.title, M, y, PW - M * 2, 48, 800, '#1b1916', 1.15, 2, rtl);
    const status = w.approvedVersionId === v.id ? tr('Approved v{n}', { n: v.n }) : `v${v.n}`;
    y = words(x, `${status}${v.label ? ` · ${tr(v.label)}` : ''} · ${w.versions.length} ${tr('versions')}`, M, y + 6, PW - M * 2, 24, 600, '#7a7268', 1.3, 1, rtl);
    const notes = p.comments.filter((cm) => cm.workId === w.id).slice(0, 5);
    for (const n of notes) {
      if (y > PH - M - 60) break;
      y = words(x, `“${tr(n.text)}” — ${n.author}`, M, y + 18, PW - M * 2, 24, 500, '#3b3933', 1.4, 3, rtl);
    }
    out.push(c);
  }
  // the story, two frames a page
  for (let i = 0; i < p.story.length; i += 2) {
    const { c, x } = page();
    for (let k = 0; k < 2 && i + k < p.story.length; k++) {
      const f = p.story[i + k];
      const top = M + k * ((PH - M * 2) / 2);
      const img = await image(byId(f.assetId));
      if (img) fit(x, img, M, top, PW - M * 2, (PH - M * 2) / 2 - 150, true);
      words(x, `${String(i + k + 1).padStart(2, '0')}  ${f.caption ? tr(f.caption) : ''}`, M, top + (PH - M * 2) / 2 - 130, PW - M * 2, 28, 600, '#1b1916', 1.35, 3, rtl);
    }
    out.push(c);
  }
  return out;
}

const safe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'file';
const extOf = (a: Asset, type: string) => {
  if (a.format === 'svg') return 'svg';
  if (a.format === 'lottie' || (a.format === 'code' && a.lang === 'json')) return 'json';
  if (a.format === 'code') return ({ html: 'html', css: 'css', js: 'js', jsx: 'jsx', ts: 'ts', tsx: 'tsx', md: 'md', python: 'py' } as Record<string, string>)[a.lang ?? ''] ?? 'txt';
  if (a.format === 'link') return 'url';
  if (a.kind === 'model') return 'glb';
  if (a.kind === 'env') return 'hdr';
  return (type.split('/')[1] ?? 'bin').replace('jpeg', 'jpg').replace('svg+xml', 'svg').replace('quicktime', 'mov').split(';')[0];
};

/** the capsule: originals, project.json, case.pdf and a short readme, as one ZIP */
export async function exportCapsule(p: Project, rtl: boolean, onProgress?: (done: number, total: number) => void): Promise<Blob> {
  const enc = new TextEncoder();
  const files: { name: string; data: Uint8Array }[] = [];
  const used = new Set<string>();
  const total = p.assets.length + 2;
  let done = 0;
  for (const a of p.assets) {
    try {
      let data: Uint8Array;
      let type = '';
      if (a.format === 'code' && a.text != null) {
        data = enc.encode(a.text);
      } else if (a.format === 'link') {
        data = enc.encode(`[InternetShortcut]\r\nURL=${a.text ?? ''}\r\n`);
      } else {
        const url = await assetUrl(a, 'raw');
        if (!url) continue;
        const blob = await fetch(url).then((r) => r.blob());
        type = blob.type;
        data = new Uint8Array(await blob.arrayBuffer());
      }
      let name = `${a.isReference ? 'references' : 'work'}/${safe(a.title)}.${extOf(a, type)}`;
      for (let k = 2; used.has(name); k++) name = name.replace(/(\.[^.]+)$/, ` (${k})$1`);
      used.add(name);
      files.push({ name, data });
    } catch {
      /* a file that cannot be read is left out; the JSON still lists it */
    }
    onProgress?.(++done, total);
  }
  files.push({ name: 'project.json', data: enc.encode(JSON.stringify(p, null, 2)) });
  onProgress?.(++done, total);
  const pdf = await pdfFromPages(await casePages(p, rtl), p.title);
  files.push({ name: 'case.pdf', data: new Uint8Array(await pdf.arrayBuffer()) });
  files.push({
    name: 'README.txt',
    data: enc.encode(`${p.title}\n\nExported from FrantoS on ${new Date().toISOString().slice(0, 10)}.\n\ncase.pdf      the case: cover, every work with its notes, the story\nwork/         the files of the works, every version\nreferences/   the references\nproject.json  everything else: notes, decisions, boards, objects, the order of the story\n`),
  });
  onProgress?.(++done, total);
  return zip(files);
}
