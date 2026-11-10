import { fontCss } from '../studio/brand';
import type { SiteNode, SitePage, SiteStyle, SiteTheme } from '../ws/types';
import { styleAt } from './model';
import { MAXW, RADIUS, TYPE, TYPE_PX, colorCss, lineHeight, spacePx } from './theme';

/**
 * One renderer for every place a page appears: the editor, the preview, review links and (later) the
 * exported HTML. It writes plain HTML + CSS from the tree; all text is escaped and links are filtered,
 * so a page can never carry a script of its own.
 */

export interface MediaInfo {
  url: string;
  kind: 'image' | 'video' | 'lottie';
  w: number;
  h: number;
  alt?: string;
}
export interface RenderCtx {
  media: (assetId: string) => MediaInfo | undefined;
  objectThumb?: (objectId: string) => string | undefined;
  /** 'container' answers to the frame width (editor, preview); 'media' to the window (export) */
  mode: 'container' | 'media';
  /** adds data-n attributes and the editing helpers */
  edit?: boolean;
  /** demo pages are written in English and translated on screen */
  tr?: (s: string) => string;
  /** the height a "full screen" section takes */
  vh?: string;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const txt = (s: string, ctx: RenderCtx) => esc(ctx.tr ? ctx.tr(s) : s).replace(/\n/g, '<br>');
export const safeHref = (h?: string) => (h && /^(https?:\/\/|mailto:|tel:|#|\/)/i.test(h.trim()) ? h.trim() : '#');
const cls = (id: string) => 'n-' + id.replace(/[^a-z0-9_-]/gi, '');

/* ───────── style → CSS ───────── */

const ALIGN = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' } as const;
const JUSTIFY = { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between' } as const;

function radius(r: SiteStyle['radius'], th: SiteTheme) {
  if (!r) return undefined;
  if (r === 'none') return '0';
  if (r === 'pill') return '999px';
  return RADIUS[th.round][r] + 'px';
}

/** declarations for a node at one width; for sections `inner` gets the layout of the content column */
function decls(n: SiteNode, s: SiteStyle, th: SiteTheme, base = true): { self: string[]; inner: string[] } {
  const self: string[] = [];
  const inner: string[] = [];
  const box = n.type === 'section' ? inner : self;
  const push = (arr: string[], k: string, v: string | number | undefined) => v !== undefined && v !== '' && arr.push(`${k}:${v}`);

  if (s.hide) self.push('display:none');
  // layout
  if (n.type === 'stack' || n.type === 'section') {
    push(box, 'flex-direction', s.dir === 'row' ? 'row' : s.dir === 'col' ? 'column' : undefined);
    push(box, 'flex-wrap', s.wrap === undefined ? undefined : s.wrap ? 'wrap' : 'nowrap');
    push(box, 'justify-content', s.justify && JUSTIFY[s.justify]);
  }
  if (n.type === 'grid' && s.cols) push(self, 'grid-template-columns', `repeat(${Math.max(1, Math.min(12, s.cols))},minmax(0,1fr))`);
  if (n.type === 'stack' || n.type === 'grid' || n.type === 'section') push(box, 'align-items', s.align && ALIGN[s.align]);
  if (s.gap) push(box, 'gap', spacePx(s.gap) + 'px');
  if (n.type === 'spacer') {
    if (s.py) push(self, 'height', spacePx(s.py) + 'px');
  } else {
    if (s.py) push(self, 'padding-block', n.type === 'section' ? `calc(${spacePx(s.py)}px * var(--k-space))` : spacePx(s.py) + 'px');
    if (s.px) push(self, 'padding-inline', n.type === 'section' ? `max(${spacePx(s.px)}px, var(--sec-px))` : spacePx(s.px) + 'px');
  }
  if (s.maxW) push(n.type === 'section' ? inner : self, 'max-width', MAXW[s.maxW]);
  if (s.minH) push(self, 'min-height', s.minH === 'none' ? '0' : s.minH === 'half' ? 'calc(var(--vh) * .5)' : 'var(--vh)');
  // type
  if (s.text) push(n.type === 'section' ? inner : self, 'text-align', s.text);
  if (s.size) {
    push(self, 'font-size', `var(--fs-${s.size})`);
    push(self, 'line-height', lineHeight(s.size));
  }
  push(self, 'font-weight', s.weight);
  if (s.font) push(self, 'font-family', `var(--f-${s.font})`);
  if (s.italic !== undefined) push(self, 'font-style', s.italic ? 'italic' : 'normal');
  // colour and box
  push(self, 'color', colorCss(s.color));
  push(self, 'background', colorCss(s.bg));
  push(self, 'border-radius', radius(s.radius, th));
  if (s.border !== undefined) push(self, 'border', s.border ? '1px solid var(--c-line)' : '0');
  if (n.type === 'media' || n.type === 'object') {
    if (s.ratio) push(self, 'aspect-ratio', s.ratio === 'auto' ? 'auto' : s.ratio.replace('/', ' / '));
    if (s.fit) inner.push(`object-fit:${s.fit}`);
  }
  if (s.span) push(self, 'grid-column', `span ${s.span}`);
  if (s.grow !== undefined) push(self, 'flex', s.grow ? '1 1 0' : '0 0 auto');
  if (n.type === 'button' && (base || s.variant)) {
    const v = s.variant ?? 'solid';
    if (v === 'solid') {
      if (!s.bg) self.push('background:var(--c-accent)');
      if (!s.color) self.push('color:var(--c-on-accent)');
      self.push('border:1.5px solid transparent');
    } else if (v === 'outline') self.push('background:transparent', 'border:1.5px solid currentColor', 'padding:12px 22px', ...(s.color ? [] : ['color:inherit']));
    else self.push('background:transparent', 'border:0', 'padding:4px 0', ...(s.color ? [] : ['color:inherit']), 'text-decoration:underline', 'text-underline-offset:.25em');
  }
  return { self, inner };
}

/** what a node is before any style: the type's own defaults */
const BASE = (th: SiteTheme) => `
.fs-page{--c-bg:${th.bg};--c-surface:${th.surface};--c-text:${th.text};--c-muted:${th.muted};--c-accent:${th.accent};--c-on-accent:${th.onAccent};--c-line:${th.line};--f-heading:${fontCss(th.heading)};--f-body:${fontCss(th.body)};${TYPE.map((k) => `--fs-${k}:${TYPE_PX[k][0]}px`).join(';')};background:var(--c-bg);color:var(--c-text);font-family:var(--f-body);font-size:var(--fs-md);line-height:1.5;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;min-height:100%;--k-space:1;--sec-px:24px}
.fs-page :where(*),.fs-page :where(*::before),.fs-page :where(*::after){box-sizing:border-box;margin:0;padding:0}
.fs-page a{color:inherit;text-decoration:none}
.fs-page img,.fs-page video{display:block;width:100%;height:100%}
.fs-page :where(.t-section){display:flex;flex-direction:column;justify-content:center;width:100%;padding:calc(64px * var(--k-space)) var(--sec-px)}
.fs-page :where(.t-section>.in){display:flex;flex-direction:column;gap:24px;width:100%;max-width:1200px;margin-inline:auto}
.fs-page :where(.t-stack){display:flex;flex-direction:column;gap:16px;min-width:0}
.fs-page :where(.t-grid){display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;min-width:0}
.fs-page :where(.t-heading){font-family:var(--f-heading);font-weight:400;letter-spacing:-.015em;text-wrap:balance;overflow-wrap:anywhere}
.fs-page :where(.t-heading.l1){font-size:var(--fs-4xl);line-height:1.02}
.fs-page :where(.t-heading.l2){font-size:var(--fs-2xl);line-height:1.12}
.fs-page :where(.t-heading.l3){font-size:var(--fs-xl);line-height:1.2}
.fs-page :where(.t-text){text-wrap:pretty;overflow-wrap:anywhere}
.fs-page :where(.t-button){display:inline-flex;align-items:center;justify-content:center;gap:8px;width:fit-content;max-width:100%;padding:12px 22px;border-radius:${RADIUS[th.round].md}px;font-weight:600;font-size:var(--fs-sm);line-height:1.2;cursor:pointer;transition:transform .2s,opacity .2s}
.fs-page :where(.t-button:hover){opacity:.88}
.fs-page :where(.t-button:focus-visible){outline:2px solid var(--c-accent);outline-offset:3px}
.fs-page :where(.t-media),.fs-page :where(.t-object){position:relative;overflow:hidden;width:100%;aspect-ratio:4 / 3;border-radius:${RADIUS[th.round].md}px;background:var(--c-surface)}
.fs-page :where(.t-media>img),.fs-page :where(.t-media>video),.fs-page :where(.t-object>img){object-fit:cover}
.fs-page :where(.t-media>.lottie){width:100%;height:100%}
.fs-page :where(.t-divider){height:1px;width:100%;background:var(--c-line);border:0}
.fs-page :where(.t-spacer){height:32px}
.fs-page :where(.t-field){display:flex;flex-direction:column;gap:6px;font-size:var(--fs-sm);font-weight:600}
.fs-page :where(.t-field input),.fs-page :where(.t-field textarea){font:inherit;font-weight:400;font-size:var(--fs-md);color:var(--c-text);background:var(--c-bg);border:1px solid var(--c-line);border-radius:${RADIUS[th.round].sm}px;padding:12px 14px;width:100%}
.fs-page :where(.t-field textarea){min-height:120px;resize:vertical}
.fs-page :where(.t-field input:focus),.fs-page :where(.t-field textarea:focus){outline:2px solid var(--c-accent);outline-offset:1px}
`;

const EDIT = `
.fs-edit [data-n]{cursor:default}
.fs-edit .t-section>.in:empty,.fs-edit .t-stack:empty,.fs-edit .t-grid:empty{min-height:72px;outline:1.5px dashed color-mix(in srgb,var(--c-text) 28%,transparent);outline-offset:-6px;border-radius:10px}
.fs-edit .t-field input,.fs-edit .t-field textarea{pointer-events:none}
.fs-edit [contenteditable]{outline:2px solid #4f8bff;outline-offset:3px;cursor:text;border-radius:2px}
.fs-edit .t-media:empty::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(135deg,transparent 0 10px,color-mix(in srgb,var(--c-text) 7%,transparent) 10px 20px)}
`;

/* ───────── nodes → HTML ───────── */

function nodeHtml(n: SiteNode, ctx: RenderCtx): string {
  const c = cls(n.id);
  const data = ctx.edit ? ` data-n="${esc(n.id)}"` : '';
  const kids = () => (n.children ?? []).map((k) => nodeHtml(k, ctx)).join('');
  switch (n.type) {
    case 'section': {
      const tag = n.tag ?? 'section';
      return `<${tag} class="t-section ${c}"${data}><div class="in"${ctx.edit ? ' data-in' : ''}>${kids()}</div></${tag}>`;
    }
    case 'stack':
    case 'grid':
      return `<div class="t-${n.type} ${c}"${data}>${kids()}</div>`;
    case 'heading': {
      const l = n.level ?? 2;
      return `<h${l} class="t-heading l${l} ${c}"${data}>${txt(n.text ?? '', ctx)}</h${l}>`;
    }
    case 'text':
      return `<p class="t-text ${c}"${data}>${txt(n.text ?? '', ctx)}</p>`;
    case 'button':
      return `<a class="t-button ${c}" href="${esc(safeHref(n.href))}"${data}>${txt(n.text ?? '', ctx)}</a>`;
    case 'media': {
      const m = n.assetId ? ctx.media(n.assetId) : undefined;
      const alt = esc(ctx.tr && n.alt ? ctx.tr(n.alt) : n.alt ?? m?.alt ?? '');
      const inner = !m ? '' : m.kind === 'video' ? `<video src="${esc(m.url)}" autoplay muted loop playsinline aria-label="${alt}"></video>` : m.kind === 'lottie' ? `<div class="lottie" data-lottie="${esc(m.url)}" role="img" aria-label="${alt}"></div>` : `<img src="${esc(m.url)}" alt="${alt}" loading="lazy" decoding="async" width="${m.w}" height="${m.h}">`;
      return `<div class="t-media ${c}"${data}>${inner}</div>`;
    }
    case 'object': {
      const u = n.objectId ? ctx.objectThumb?.(n.objectId) : undefined;
      return `<div class="t-object ${c}"${data}>${u ? `<img src="${esc(u)}" alt="${esc(n.alt ?? '')}" loading="lazy">` : ''}</div>`;
    }
    case 'divider':
      return `<hr class="t-divider ${c}"${data}>`;
    case 'spacer':
      return `<div class="t-spacer ${c}"${data} aria-hidden="true"></div>`;
    case 'field': {
      const ph = esc(ctx.tr && n.placeholder ? ctx.tr(n.placeholder) : n.placeholder ?? '');
      const name = esc((n.text ?? 'field').toLowerCase().replace(/[^a-z0-9]+/gi, '-'));
      const input = n.multiline ? `<textarea name="${name}" placeholder="${ph}"></textarea>` : `<input name="${name}" placeholder="${ph}"${/mail|почт|דוא/i.test(n.text ?? '') ? ' type="email"' : ''}>`;
      return `<label class="t-field ${c}"${data}><span>${txt(n.text ?? '', ctx)}</span>${input}</label>`;
    }
  }
}

function nodeCss(nodes: SiteNode[], th: SiteTheme, out: { lg: string[]; md: string[]; sm: string[] }) {
  for (const n of nodes) {
    const c = '.fs-page .' + cls(n.id);
    const rule = (d: { self: string[]; inner: string[] }, into: string[]) => {
      if (d.self.length) into.push(`${c}{${d.self.join(';')}}`);
      if (d.inner.length) into.push(`${c}>${n.type === 'section' ? '.in' : '*'}{${d.inner.join(';')}}`);
    };
    rule(decls(n, styleAt(n, 'lg'), th), out.lg);
    // overrides only write what changes at that width
    if (n.md) rule(decls(n, n.md, th, false), out.md);
    if (n.sm) rule(decls(n, n.sm, th, false), out.sm);
    if (n.children) nodeCss(n.children, th, out);
  }
}

export function renderPage(page: Pick<SitePage, 'root' | 'theme' | 'dir'>, ctx: RenderCtx): { css: string; html: string } {
  const th = page.theme;
  const out = { lg: [] as string[], md: [] as string[], sm: [] as string[] };
  nodeCss(page.root, th, out);
  const q = (w: number) => (ctx.mode === 'container' ? `@container fs (max-width:${w}px)` : `@media (max-width:${w}px)`);
  const css = [
    BASE(th),
    `.fs-page{--vh:${ctx.vh ?? '100vh'}}`,
    ctx.edit ? EDIT : '',
    out.lg.join('\n'),
    `${q(1023)}{.fs-page{--k-space:.82;${TYPE.map((k) => `--fs-${k}:${TYPE_PX[k][1]}px`).join(';')}}\n${out.md.join('\n')}}`,
    `${q(599)}{.fs-page{--k-space:.64;--sec-px:20px;${TYPE.map((k) => `--fs-${k}:${TYPE_PX[k][2]}px`).join(';')}}.fs-page .t-grid{grid-template-columns:minmax(0,1fr)}\n${out.sm.join('\n')}}`,
  ].join('\n');
  const html = `<div class="fs-page${ctx.edit ? ' fs-edit' : ''}" dir="${page.dir === 'rtl' ? 'rtl' : 'ltr'}">${page.root.map((n) => nodeHtml(n, ctx)).join('')}</div>`;
  return { css, html };
}

/** play the Lottie files in a rendered page; returns a cleanup */
export function hydrate(root: HTMLElement): () => void {
  const anims: { destroy: () => void }[] = [];
  let live = true;
  root.querySelectorAll<HTMLElement>('[data-lottie]').forEach(async (el) => {
    try {
      const [{ default: lottie }, json] = await Promise.all([import('lottie-web/build/player/lottie_light'), fetch(el.dataset.lottie!).then((r) => r.json())]);
      if (!live) return;
      anims.push(lottie.loadAnimation({ container: el, renderer: 'svg', loop: true, autoplay: !matchMedia('(prefers-reduced-motion: reduce)').matches, animationData: json }) as unknown as { destroy: () => void });
    } catch {
      /* the frame stays empty */
    }
  });
  return () => {
    live = false;
    anims.forEach((a) => a.destroy());
  };
}
