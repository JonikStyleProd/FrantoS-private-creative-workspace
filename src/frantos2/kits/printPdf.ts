/**
 * A print PDF from a rendered board: the artwork covers trim + bleed, crop marks sit outside it,
 * TrimBox and BleedBox are set so a print shop's preflight reads the sizes. RGB, JPEG inside.
 */
export const PAPERS = [
  { id: 'a4', label: 'A4', w: 210, h: 297 },
  { id: 'a3', label: 'A3', w: 297, h: 420 },
  { id: 'a5', label: 'A5', w: 148, h: 210 },
  { id: 'letter', label: 'Letter', w: 215.9, h: 279.4 },
  { id: 'poster', label: '50×70 cm', w: 500, h: 700 },
  { id: 'card', label: 'Business card', w: 85, h: 55 },
  { id: 'square', label: '20×20 cm', w: 200, h: 200 },
] as const;

const PT = 72 / 25.4; // points per millimetre

/** the paper turned to match the artwork's orientation */
export function orient(paper: { w: number; h: number }, artW: number, artH: number) {
  const landscape = artW > artH;
  return landscape === paper.w > paper.h ? { w: paper.w, h: paper.h } : { w: paper.h, h: paper.w };
}

/** effective resolution of the artwork at a paper width, in dots per inch */
export const dpiAt = (px: number, mm: number) => Math.round(px / (mm / 25.4));

export async function printPdf(board: Blob, paperMm: { w: number; h: number }, opts: { bleed: number; marks: boolean; title: string }): Promise<Blob> {
  const img = await createImageBitmap(board);
  const bleed = opts.bleed;
  const slug = opts.marks ? 10 : 0; // room for crop marks outside the bleed
  const artW = paperMm.w + bleed * 2;
  const artH = paperMm.h + bleed * 2;
  // the picture covers the bleed area: scaled to cover, centred
  const pxPerMm = Math.max(img.width / paperMm.w, img.height / paperMm.h);
  const cw = Math.round(artW * pxPerMm);
  const ch = Math.round(artH * pxPerMm);
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const x = c.getContext('2d')!;
  const s = Math.max(cw / img.width, ch / img.height);
  x.drawImage(img, (cw - img.width * s) / 2, (ch - img.height * s) / 2, img.width * s, img.height * s);
  img.close?.();
  const jpeg = new Uint8Array(await (await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.95))).arrayBuffer());

  const W = (artW + slug * 2) * PT;
  const H = (artH + slug * 2) * PT;
  const ox = slug * PT;
  const oy = slug * PT;
  const tx = ox + bleed * PT;
  const ty = oy + bleed * PT;
  const tw = paperMm.w * PT;
  const th = paperMm.h * PT;
  const f = (n: number) => n.toFixed(2);
  let ops = `q\n${f(artW * PT)} 0 0 ${f(artH * PT)} ${f(ox)} ${f(oy)} cm\n/Im0 Do\nQ\n`;
  if (opts.marks) {
    // crop marks: short hairlines at each trim corner, kept out of the bleed
    const gap = (bleed + 2) * PT;
    const len = 6 * PT;
    ops += '0 0 0 RG 0.25 w\n';
    for (const [cx, cy] of [
      [tx, ty],
      [tx + tw, ty],
      [tx, ty + th],
      [tx + tw, ty + th],
    ]) {
      const sx = cx === tx ? -1 : 1;
      const sy = cy === ty ? -1 : 1;
      ops += `${f(cx + sx * gap)} ${f(cy)} m ${f(cx + sx * (gap + len))} ${f(cy)} l S\n`;
      ops += `${f(cx)} ${f(cy + sy * gap)} m ${f(cx)} ${f(cy + sy * (gap + len))} l S\n`;
    }
  }
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let len = 0;
  const push = (b: Uint8Array | string) => {
    const u = typeof b === 'string' ? enc.encode(b) : b;
    parts.push(u);
    len += u.length;
  };
  const obj = (n: number, body: () => void) => {
    offsets[n] = len;
    push(`${n} 0 obj\n`);
    body();
    push('\nendobj\n');
  };
  const esc = (s: string) => s.replace(/[\\()]/g, (m) => '\\' + m).replace(/[^\x20-\x7e]/g, '');
  push('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'));
  obj(3, () =>
    push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(W)} ${f(H)}] /BleedBox [${f(ox)} ${f(oy)} ${f(ox + artW * PT)} ${f(oy + artH * PT)}] /TrimBox [${f(tx)} ${f(ty)} ${f(tx + tw)} ${f(ty + th)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`
    )
  );
  obj(4, () => {
    push(`<< /Type /XObject /Subtype /Image /Width ${cw} /Height ${ch} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
    push(jpeg);
    push('\nendstream');
  });
  obj(5, () => push(`<< /Length ${enc.encode(ops).length} >>\nstream\n${ops}endstream`));
  obj(6, () => push(`<< /Title (${esc(opts.title)}) /Creator (FrantoS) /Producer (FrantoS print export) >>`));
  const xref = len;
  push(`xref\n0 7\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`);
  push(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
}
