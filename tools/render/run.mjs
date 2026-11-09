import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
const url = process.argv[2] ?? 'http://localhost:3000/tools/render/index.html';
const b = await chromium.launch({ executablePath: process.env.PW_CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 900, height: 1100 } });
pg.on('console', (m) => console.log('page:', m.text()));
pg.on('pageerror', (e) => console.log('err:', e.message));
await pg.goto(url);
await pg.waitForFunction(() => window.ready, null, { timeout: 60000 });
const files = await pg.evaluate(() => window.renderAll());
for (const f of files) {
  const p = join('public/projects', f.path);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, Buffer.from(f.data.split(',')[1], 'base64'));
}
console.log('wrote', files.length);
await b.close();
