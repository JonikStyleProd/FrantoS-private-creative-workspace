/**
 * Dev-only: renders the collection demos' pictures with the studio engine.
 * `node tools/render/run.mjs` opens this page in headless Chrome and saves the files to public/projects/<id>/.
 */
localStorage.setItem('frantos-quality', 'full');
const { createObjectScene } = await import('../../src/frantos2/studio/scene');
const { SERIES, SERIES_W, SERIES_H, seriesObject } = await import('../../src/frantos2/ws/seedSeries');

const canvas = document.getElementById('c') as HTMLCanvasElement;
const scene = createObjectScene(canvas, { interactive: false, pixelRatio: 1 });

function backdrop(x: CanvasRenderingContext2D, w: number, h: number, color: string) {
  const g = x.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, Math.hypot(w, h) * 0.66);
  g.addColorStop(0, color);
  g.addColorStop(0.7, shade(color, -0.22));
  g.addColorStop(1, shade(color, -0.42));
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
}
function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * (1 + k))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
const blobToImg = (b: Blob) => new Promise<HTMLImageElement>((res) => {
  const i = new Image();
  i.onload = () => res(i);
  i.src = URL.createObjectURL(b);
});
const toData = (c: HTMLCanvasElement, q: number) => c.toDataURL('image/webp', q);

(window as any).renderAll = async () => {
  const out: { path: string; data: string }[] = [];
  for (const s of SERIES) {
    for (let i = 0; i < s.pieces.length; i++) {
      const p = s.pieces[i];
      const o = seriesObject(s, p, i);
      await scene.setObject(o, undefined, 'full');
      scene.setLight(o.light);
      scene.setLens(o.camera.lens);
      scene.setStage(o.stage);
      // each picture its own view: a slow walk around the collection
      scene.setPose({ az: 18 + ((i * 37) % 70) - 30, el: 8 + (i % 3) * 7, zoom: o.stage && o.stage !== 'none' ? 1.12 : 1.3 });
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const png = await scene.render(SERIES_W, SERIES_H);
      const img = await blobToImg(png);
      const big = document.createElement('canvas');
      big.width = SERIES_W;
      big.height = SERIES_H;
      const x = big.getContext('2d')!;
      backdrop(x, SERIES_W, SERIES_H, p.bg);
      x.drawImage(img, 0, 0);
      const sm = document.createElement('canvas');
      sm.width = 480;
      sm.height = 600;
      sm.getContext('2d')!.drawImage(big, 0, 0, 480, 600);
      out.push({ path: `${s.id}/${p.key}.webp`, data: toData(big, 0.86) }, { path: `${s.id}/${p.key}-sm.webp`, data: toData(sm, 0.8) });
    }
  }
  return out;
};
(window as any).ready = true;
