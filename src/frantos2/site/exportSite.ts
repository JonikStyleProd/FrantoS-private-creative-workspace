import { zip, pdfFromPages } from '../kits/capsule';
import { FONTS } from '../studio/brand';
import { assetUrl } from '../ws/media';
import type { Project, SitePage } from '../ws/types';
import { walk } from './model';
import { motionRuntime, motionScript } from './motion';
import type { MediaInfo } from './render';
import { renderPage } from './render';
import { capturePage } from './snapshot';
import { BPS } from './model';

/**
 * Pages out of FrantoS: a static site (open index.html, no build), a React + Vite project, pictures and a PDF.
 * Everything comes from the same renderer as the editor, so the files look like the page you built,
 * with the same motion and the same fonts.
 */

export type ExportKind = 'html' | 'react';
type File = { name: string; data: Uint8Array };
const enc = new TextEncoder();
const text = (name: string, s: string): File => ({ name, data: enc.encode(s) });
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const fileSlug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'page';

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'application/json': 'json' };

function langOf(pages: Pick<SitePage, 'root'>[], tr?: (s: string) => string) {
  let s = '';
  pages.forEach((p) => walk(p.root, (n) => n.text && (s += (tr ? tr(n.text) : n.text) + ' ')));
  return /[֐-׿]/.test(s) ? 'he' : /[Ѐ-ӿ]/.test(s) ? 'ru' : 'en';
}

/* ───────── fonts: the bundled @font-face files the pages use ───────── */

const unquote = (s: string) => s.trim().replace(/^['"]|['"]$/g, '');
async function fontFiles(families: Set<string>, dir: string): Promise<{ css: string; files: File[] }> {
  const files: File[] = [];
  const rules: string[] = [];
  const seen = new Map<string, string>();
  for (const sheet of Array.from(document.styleSheets)) {
    let list: CSSRuleList;
    try {
      list = sheet.cssRules;
    } catch {
      continue;
    }
    for (const r of Array.from(list)) {
      if (!(r instanceof CSSFontFaceRule)) continue;
      const fam = unquote(r.style.getPropertyValue('font-family'));
      if (!families.has(fam)) continue;
      const src = r.style.getPropertyValue('src');
      const m = src.match(/url\(\s*['"]?([^'")]+\.woff2[^'")]*)['"]?\s*\)/);
      if (!m) continue;
      const abs = new URL(m[1], sheet.href ?? location.href).href;
      let name = seen.get(abs);
      if (!name) {
        try {
          const buf = new Uint8Array(await (await fetch(abs)).arrayBuffer());
          name = `${fileSlug(fam)}-${seen.size + 1}.woff2`;
          seen.set(abs, name);
          files.push({ name: `fonts/${name}`, data: buf });
        } catch {
          continue;
        }
      }
      const keep = ['font-style', 'font-weight', 'font-display', 'unicode-range'].map((k) => (r.style.getPropertyValue(k) ? `${k}:${r.style.getPropertyValue(k)};` : '')).join('');
      rules.push(`@font-face{font-family:'${fam}';src:url('${dir}${name}') format('woff2');${keep}}`);
    }
  }
  return { css: rules.join('\n') + '\n', files };
}
function familiesFor(pages: SitePage[], lang: string) {
  const out = new Set<string>();
  const first = (id: string) => unquote((FONTS.find((f) => f.id === id) ?? FONTS[0]).css.split(',')[0]);
  pages.forEach((p) => {
    out.add(first(p.theme.heading));
    out.add(first(p.theme.body));
    if (p.dir === 'rtl' || lang === 'he') {
      out.add('Heebo Variable');
      out.add('Frank Ruhl Libre');
    }
  });
  return out;
}

/* ───────── pictures, videos and Lottie as files ───────── */

async function mediaFiles(p: Project, pages: SitePage[], base: string): Promise<{ map: Record<string, MediaInfo>; files: File[]; lottie: Record<string, string> }> {
  const ids = new Set<string>();
  pages.forEach((pg) => walk(pg.root, (n) => n.assetId && ids.add(n.assetId)));
  const map: Record<string, MediaInfo> = {};
  const files: File[] = [];
  const lottie: Record<string, string> = {};
  for (const id of ids) {
    const a = p.assets.find((x) => x.id === id);
    if (!a) continue;
    const isLottie = a.format === 'lottie';
    const url = await assetUrl(a, isLottie || a.kind === 'video' || a.format === 'svg' ? 'raw' : 'full').catch(() => undefined);
    if (!url) continue;
    const blob = await fetch(url).then((r) => r.blob());
    const name = `${fileSlug(a.title)}-${id.slice(-5).replace(/[^a-z0-9]/gi, '')}`;
    if (isLottie) {
      const key = name;
      lottie[key] = await blob.text();
      map[id] = { url: '', kind: 'lottie', w: a.w, h: a.h, alt: a.title, key };
      continue;
    }
    const ext = a.format === 'svg' ? 'svg' : EXT[blob.type] ?? (a.kind === 'video' ? 'mp4' : 'jpg');
    files.push({ name: `assets/${name}.${ext}`, data: new Uint8Array(await blob.arrayBuffer()) });
    map[id] = { url: `${base}assets/${name}.${ext}`, kind: a.kind === 'video' ? 'video' : 'image', w: a.w, h: a.h, alt: a.title };
  }
  return { map, files, lottie };
}

async function lottiePlayer(): Promise<string> {
  const m = await import('lottie-web/build/player/lottie_light.min.js?raw');
  return m.default;
}

/** links to other pages: `slug.html` in the static site, `#/slug` in the React app */
const pageLinks = (html: string, pages: SitePage[], kind: ExportKind) =>
  html.replace(/href="([^"#?]+)\.html(#[^"]*)?"/g, (all, slug: string, hash = '') => {
    const i = pages.findIndex((x) => x.slug === slug);
    if (i < 0) return all;
    return kind === 'html' ? `href="${i === 0 ? 'index' : slug}.html${hash}"` : `href="#/${i === 0 ? '' : slug}"`;
  });

const README_HTML = (title: string, pages: SitePage[]) => `${title}
${'='.repeat(title.length)}

Built in FrantoS. Open index.html in a browser: no build, no server needed.

Pages
${pages.map((p, i) => `  ${i === 0 ? 'index' : p.slug}.html — ${p.title}`).join('\n')}

Files
  css/fonts.css     the typefaces (woff2 in fonts/)
  css/<page>.css    each page: colour and type tokens as CSS variables, layout, widths (≤1023 tablet, ≤599 phone), motion
  js/motion.js      starts entrances on load and on scroll, counts numbers, moves depth; respects reduced motion
  assets/           pictures and videos

Change a colour: edit the --c-* variables at the top of the page's CSS.
`;

/* ───────── static site ───────── */

export async function exportHtml(p: Project, pages: SitePage[], tr?: (s: string) => string): Promise<Blob> {
  const lang = langOf(pages, tr);
  const [{ map, files: media, lottie }, fonts] = await Promise.all([mediaFiles(p, pages, ''), fontFiles(familiesFor(pages, lang), '../fonts/')]);
  const files: File[] = [...media, ...fonts.files, text('css/fonts.css', fonts.css), text('js/motion.js', motionScript())];
  const lottieKeys = Object.keys(lottie);
  if (lottieKeys.length) {
    files.push(text('js/lottie.min.js', await lottiePlayer()));
    files.push(text('js/lottie-data.js', `window.__fsLottie=${JSON.stringify(Object.fromEntries(lottieKeys.map((k) => [k, JSON.parse(lottie[k])])))};\n`));
  }
  pages.forEach((pg, i) => {
    const name = i === 0 ? 'index' : pg.slug;
    const { css, html } = renderPage(pg, { media: (id) => map[id], objectThumb: (oid) => (p.objects ?? []).find((o) => o.id === oid)?.thumb, mode: 'media', tr, motion: 'on' });
    files.push(text(`css/${name}.css`, `/* ${pg.title} · FrantoS */\nhtml,body{margin:0;padding:0}\nbody{background:${pg.theme.bg}}\n${css}\n`));
    const title = tr ? tr(pg.title) : pg.title;
    files.push(
      text(
        `${name}.html`,
        `<!doctype html>
<html lang="${lang}" dir="${pg.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="generator" content="FrantoS">
<link rel="stylesheet" href="css/fonts.css">
<link rel="stylesheet" href="css/${name}.css">
</head>
<body>
${pageLinks(html, pages, 'html')}
${lottieKeys.length ? '<script src="js/lottie.min.js"></script>\n<script src="js/lottie-data.js"></script>\n' : ''}<script src="js/motion.js" defer></script>
</body>
</html>
`
      )
    );
  });
  files.push(text('README.txt', README_HTML(tr ? tr(pages[0].title) : pages[0].title, pages)));
  return zip(files.map((f) => ({ ...f, name: `${fileSlug(p.title)}-site/${f.name}` })));
}

/* ───────── React + Vite ───────── */

/** our own HTML → JSX: the renderer writes a small, known subset, so a few rules are enough */
export function htmlToJsx(html: string): string {
  return html
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;')
    .replace(/ class="/g, ' className="')
    .replace(/ style="--i:(\d+)"/g, " style={{ '--i': $1 }}")
    .replace(/ autoplay/g, ' autoPlay')
    .replace(/ playsinline/g, ' playsInline')
    .replace(/<(img|hr|input|br)([^>]*?)\s*\/?>/g, '<$1$2 />');
}
const compName = (s: string, i: number) => {
  const c = s
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  return /^[A-Z]/.test(c) ? c : `Page${i + 1}${c}`;
};

export function tailwindTokens(pg: SitePage): string {
  const th = pg.theme;
  const fam = (id: string) => (FONTS.find((f) => f.id === id) ?? FONTS[0]).css.split(',').map((x) => unquote(x));
  return `/** Design tokens of "${pg.title}" for Tailwind: spread into theme.extend in tailwind.config.js */
export default {
  colors: { bg: '${th.bg}', surface: '${th.surface}', text: '${th.text}', muted: '${th.muted}', accent: '${th.accent}', 'on-accent': '${th.onAccent}', line: '${th.line}' },
  fontFamily: { heading: ${JSON.stringify(fam(th.heading))}, body: ${JSON.stringify(fam(th.body))} },
  fontSize: { xs: '13px', sm: '15px', md: '17px', lg: '21px', xl: '28px', '2xl': '38px', '3xl': '54px', '4xl': '76px', '5xl': '104px' },
  spacing: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 6: '24px', 8: '32px', 12: '48px', 16: '64px', 24: '96px', 32: '128px' },
  borderRadius: ${JSON.stringify(th.round === 'sharp' ? { sm: '2px', md: '3px', lg: '4px', xl: '6px' } : th.round === 'round' ? { sm: '10px', md: '18px', lg: '28px', xl: '40px' } : { sm: '6px', md: '12px', lg: '20px', xl: '28px' })},
  screens: { tablet: { max: '1023px' }, phone: { max: '599px' } },
};
`;
}

export async function exportReact(p: Project, pages: SitePage[], tr?: (s: string) => string): Promise<Blob> {
  const lang = langOf(pages, tr);
  const [{ map, files: media, lottie }, fonts] = await Promise.all([mediaFiles(p, pages, '/'), fontFiles(familiesFor(pages, lang), '/fonts/')]);
  const files: File[] = [...media.map((f) => ({ ...f, name: `public/${f.name}` })), ...fonts.files.map((f) => ({ ...f, name: `public/${f.name}` })), text('src/fonts.css', fonts.css)];
  const names = pages.map((pg, i) => compName(tr ? tr(pg.title) : pg.title, i));
  pages.forEach((pg, i) => {
    const scope = `pg-${fileSlug(pg.slug)}`;
    const { css, html } = renderPage(pg, { media: (id) => map[id], objectThumb: (oid) => (p.objects ?? []).find((o) => o.id === oid)?.thumb, mode: 'media', tr, motion: 'on', scope });
    files.push(text(`src/pages/${names[i]}.css`, css + '\n'));
    const jsx = htmlToJsx(pageLinks(html, pages, 'react')).replace(/^<div /, '<div ref={ref} ');
    files.push(
      text(
        `src/pages/${names[i]}.jsx`,
        `import { useMotion } from '../useMotion';
import './${names[i]}.css';

/** ${pg.title} — built in FrantoS */
export default function ${names[i]}() {
  const ref = useMotion();
  return (
    ${jsx}
  );
}
`
      )
    );
  });
  const lottieKeys = Object.keys(lottie);
  lottieKeys.forEach((k) => files.push(text(`src/lottie/${k}.json`, lottie[k])));
  files.push(
    text('src/motion.js', `/* FrantoS · page motion: entrances on load and on scroll, counting numbers, depth; respects reduced motion */\nexport const motion = ${motionRuntime.toString()};\n`),
    text('src/useMotion.js', `import { useEffect, useRef } from 'react';\nimport { motion } from './motion';\n\nexport function useMotion() {\n  const ref = useRef(null);\n  useEffect(() => (ref.current ? motion(ref.current, {}) : undefined), []);\n  return ref;\n}\n`),
    text(
      'src/main.jsx',
      `import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './fonts.css';
${names.map((n) => `import ${n} from './pages/${n}';`).join('\n')}
${lottieKeys.length ? `import lottie from 'lottie-web/build/player/lottie_light';\n${lottieKeys.map((k, i) => `import l${i} from './lottie/${k}.json';`).join('\n')}\nwindow.lottie = lottie;\nwindow.__fsLottie = { ${lottieKeys.map((k, i) => `'${k}': l${i}`).join(', ')} };\n` : ''}
const PAGES = { ${pages.map((pg, i) => `'${i === 0 ? '' : pg.slug}': ${names[i]}`).join(', ')} };

function App() {
  const [path, setPath] = useState(() => location.hash.replace(/^#\\/?/, ''));
  useEffect(() => {
    const on = () => (setPath(location.hash.replace(/^#\\/?/, '')), window.scrollTo(0, 0));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const Page = PAGES[path] ?? ${names[0]};
  return <Page key={path} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`
    ),
    text('index.html', `<!doctype html>\n<html lang="${lang}" dir="${pages[0].dir}">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    <title>${esc(tr ? tr(pages[0].title) : pages[0].title)}</title>\n    <style>html,body{margin:0;padding:0}</style>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.jsx"></script>\n  </body>\n</html>\n`),
    text('vite.config.js', `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({ plugins: [react()] });\n`),
    text(
      'package.json',
      JSON.stringify(
        {
          name: fileSlug(p.title).replace(/[^a-z0-9-]/g, '') || 'frantos-site',
          private: true,
          version: '1.0.0',
          type: 'module',
          scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
          dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0', ...(lottieKeys.length ? { 'lottie-web': '^5.12.2' } : {}) },
          devDependencies: { vite: '^6.0.0', '@vitejs/plugin-react': '^4.3.0' },
        },
        null,
        2
      ) + '\n'
    ),
    text('tailwind.tokens.js', tailwindTokens(pages[0])),
    text(
      'README.md',
      `# ${tr ? tr(pages[0].title) : pages[0].title}\n\nBuilt in FrantoS as a React + Vite project.\n\n\`\`\`\nnpm install\nnpm run dev\n\`\`\`\n\n- \`src/pages/\` — one component per page, with its CSS (tokens as CSS variables, widths: ≤1023 tablet, ≤599 phone).\n- \`src/useMotion.js\` — starts the page's motion; respects reduced motion.\n- \`tailwind.tokens.js\` — the same tokens for Tailwind (\`theme.extend\`).\n- Pages: ${pages.map((pg, i) => `\`#/${i === 0 ? '' : pg.slug}\` ${pg.title}`).join(', ')}.\n`
    )
  );
  return zip(files.map((f) => ({ ...f, name: `${fileSlug(p.title)}-react/${f.name}` })));
}

/* ───────── pictures ───────── */

export async function pagePng(p: Project, page: SitePage, media: Record<string, MediaInfo>, width: number, tr?: (s: string) => string) {
  return (await capturePage(p, page, media, width, tr)).blob;
}

/** desktop, tablet and phone, one PDF page each, every page as long as the site */
export async function pagePdf(p: Project, page: SitePage, media: Record<string, MediaInfo>, tr?: (s: string) => string): Promise<Blob> {
  const canvases: HTMLCanvasElement[] = [];
  for (const b of [...BPS].reverse()) {
    const { blob } = await capturePage(p, page, media, b.w, tr);
    const bmp = await createImageBitmap(blob);
    const c = document.createElement('canvas');
    c.width = bmp.width;
    c.height = bmp.height;
    c.getContext('2d')!.drawImage(bmp, 0, 0);
    canvases.push(c);
  }
  return pdfFromPages(canvases, tr ? tr(page.title) : page.title, true);
}

export function saveFile(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
