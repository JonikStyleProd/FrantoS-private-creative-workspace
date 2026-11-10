// Renders the demo UI screens to PNG (dev only): node tools/kits/render.mjs
import { chromium } from '../../node_modules/playwright/index.mjs';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--allow-file-access-from-files'] });
const jobs = [
  ...['welcome', 'spots', 'today', 'today-v1', 'spot', 'log', 'saved'].map((s) => ({ file: 'wavelength.html', s, w: 390, h: 844, dpr: 2, full: false, out: `/tmp/ui/wavelength-${s}.png` })),
  ...['home-v1', 'home', 'product'].map((s) => ({ file: 'halden.html', s, w: 1440, h: 900, dpr: 1, full: true, out: `/tmp/ui/halden-${s}.png` })),
  { file: 'halden.html', s: 'mobile', w: 390, h: 844, dpr: 2, full: true, out: '/tmp/ui/halden-mobile.png' },
];
for (const j of jobs) {
  const pg = await b.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: j.dpr });
  await pg.goto(`file://${here}/${j.file}?s=${j.s}`);
  await pg.evaluate(() => document.fonts.ready);
  await pg.waitForTimeout(400);
  await pg.screenshot({ path: j.out, fullPage: j.full });
  await pg.close();
}
await b.close();
