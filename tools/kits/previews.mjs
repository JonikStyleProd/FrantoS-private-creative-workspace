// Draws the previews of the demo materials with the app's own preview code (dev only).
// Needs `npx vite --port 5199` running. Writes PNGs to /tmp/pv/.
import { chromium } from '../../node_modules/playwright/index.mjs';
import fs from 'node:fs';
const root = '/home/claude/frantos';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const pg = await b.newPage();
await pg.goto('http://localhost:5199/');
fs.mkdirSync('/tmp/pv', { recursive: true });
const run = async (name, kind, args) => {
  const b64 = await pg.evaluate(async ({ kind, args }) => {
    const m = await import('/src/frantos2/ws/formats.ts');
    const fromB64 = (s, type) => new Blob([Uint8Array.from(atob(s), (c) => c.charCodeAt(0))], { type });
    let r;
    if (kind === 'code') r = await m.codePreview(args.text, args.name, args.lang);
    if (kind === 'font') r = await m.fontPreview(fromB64(args.data, 'font/woff2'), args.name);
    if (kind === 'audio') r = await m.audioPreview(fromB64(args.data, 'audio/mp4'), args.name);
    if (kind === 'lottie') r = await m.lottiePreview(JSON.parse(args.text));
    if (kind === 'link') r = await m.linkPreview(args.url, args.title);
    const buf = new Uint8Array(await r.thumb.arrayBuffer());
    let s = '';
    buf.forEach((x) => (s += String.fromCharCode(x)));
    return { data: btoa(s), duration: r.duration ?? null };
  }, { kind, args });
  fs.writeFileSync(`/tmp/pv/${name}.webp`, Buffer.from(b64.data, 'base64'));
  console.log(name, b64.duration ?? '');
};
const file = (p) => fs.readFileSync(p).toString('base64');
const text = (p) => fs.readFileSync(p, 'utf8');
await run('hd-code-card', 'code', { text: text(`${root}/tools/kits/snippets/product-card.html`), name: 'product-card.html', lang: 'html' });
await run('hd-code-button', 'code', { text: text(`${root}/tools/kits/snippets/button.css`), name: 'button.css', lang: 'css' });
await run('hd-code-reveal', 'code', { text: text(`${root}/tools/kits/snippets/reveal.js`), name: 'reveal.js', lang: 'js' });
await run('hd-font-manrope', 'font', { data: file(`${root}/node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2`), name: 'Manrope' });
await run('hd-font-serif', 'font', { data: file(`${root}/node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2`), name: 'Instrument Serif' });
await run('wl-font-inter', 'font', { data: file(`${root}/node_modules/@fontsource-variable/inter-tight/files/inter-tight-latin-wght-normal.woff2`), name: 'Inter Tight' });
await run('wl-font-literata', 'font', { data: file(`${root}/node_modules/@fontsource-variable/literata/files/literata-latin-wght-normal.woff2`), name: 'Literata' });
await run('vl-track', 'audio', { data: file(`${root}/tools/kits/velo-track.m4a`), name: 'Velo — main track, 112 BPM' });
await run('wl-loader', 'lottie', { text: text(`${root}/tools/kits/wave-loader.json`) });
await run('vl-sting', 'lottie', { text: text(`${root}/tools/kits/wheel-sting.json`) });
await run('wl-link-hig', 'link', { url: 'https://developer.apple.com/design/human-interface-guidelines', title: 'Apple HIG' });
await run('wl-link-m3', 'link', { url: 'https://m3.material.io', title: 'Material 3' });
await run('hd-link-old', 'link', { url: 'https://halden.example', title: 'Current site' });
await b.close();
