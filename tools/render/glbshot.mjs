import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const [,, ...pairs] = process.argv; // url=out
const b = await chromium.launch({ executablePath: process.env.PW_CHROME, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 820, height: 820 } });
pg.on('pageerror', e => console.log('err', e.message));
await pg.goto('http://localhost:3000/tools/render/glb.html');
await pg.waitForFunction(() => window.ready, null, { timeout: 60000 });
for (const p of pairs) { const [u, o, az, bg, zoom] = p.split('='); const d = await pg.evaluate(([u, az, bg, zoom]) => window.shot(u, Number(az ?? 30), bg ?? '#e7e3d8', Number(zoom ?? 1)), [u, az, bg, zoom]); writeFileSync(o, Buffer.from(d.split(',')[1], 'base64')); }
await b.close();
