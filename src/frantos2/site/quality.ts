import type { Project, SiteNode, SitePage } from '../ws/types';
import { Bp, walk } from './model';
import type { MediaInfo } from './render';
import { renderPage } from './render';
import { makeCtx } from './media';
import { contrast } from './theme';
import { boardLayout } from './frames';

/**
 * Checks a page the way a careful reviewer would, on the page as drawn at phone and desktop width:
 * text that is hard to read, buttons too small for a finger, things that spill past a phone screen,
 * pictures without a description, links that go nowhere, headings out of order.
 */

export interface Issue {
  key: string;
  node?: string;
  bp: Bp;
  level: 'error' | 'warn';
  /** English text with {vars}; the panel translates it */
  text: string;
  vars?: Record<string, string | number>;
}

const rgb = (s: string): [number, number, number, number] | null => {
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return [p[0], p[1], p[2], p[3] ?? 1];
};
const hex = (c: [number, number, number, number]) => '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

function bgOf(el: Element, fallback: string): string {
  let e: Element | null = el;
  while (e) {
    const c = rgb(getComputedStyle(e).backgroundColor);
    if (c && c[3] > 0.6) return hex(c);
    e = e.parentElement;
  }
  return fallback;
}

async function drawAt(p: Project, page: Pick<SitePage, 'root' | 'theme' | 'dir' | 'board'>, media: Record<string, MediaInfo>, width: number, tr?: (s: string) => string) {
  const { css, html } = renderPage(page, makeCtx(p, media, { mode: 'container', edit: true, vh: page.board ? `${boardLayout(page.board).h}px` : '844px', tr, motion: 'off' }));
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = `position:fixed;left:-30000px;top:0;width:${width}px;container:fs / inline-size;pointer-events:none;visibility:hidden`;
  host.innerHTML = `<style>${css}</style>${html}`;
  document.body.appendChild(host);
  await document.fonts?.ready;
  return host;
}

export async function checkPage(p: Project, page: Pick<SitePage, 'root' | 'theme' | 'dir' | 'board'>, media: Record<string, MediaInfo>, tr?: (s: string) => string): Promise<Issue[]> {
  const out: Issue[] = [];
  const add = (i: Issue) => !out.some((x) => x.key === i.key) && out.push(i);
  const nodeOf = (el: Element) => (el.closest('[data-n]') as HTMLElement | null)?.dataset.n;

  // desktop: reading contrast
  const lg = await drawAt(p, page, media, page.board ? boardLayout(page.board).w : 1440, tr);
  try {
    lg.querySelectorAll<HTMLElement>('.t-heading, .t-text, .t-button, .t-field > span').forEach((el) => {
      if (!el.textContent?.trim() || el.offsetParent === null) return;
      const cs = getComputedStyle(el);
      const c = rgb(cs.color);
      if (!c) return;
      const ratio = contrast(hex(c), bgOf(el, page.theme.bg));
      const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.6 && +cs.fontWeight >= 700);
      const need = big ? 3 : 4.5;
      const id = nodeOf(el);
      if (ratio < need) add({ key: `contrast-${id}`, node: id, bp: 'lg', level: ratio < need - 1.2 ? 'error' : 'warn', text: 'Hard to read: contrast {r}:1, needs {n}:1', vars: { r: ratio.toFixed(1), n: need } });
    });
    // an artboard: nothing may run past its frame
    const bd = page.board ? boardLayout(page.board) : null;
    if (bd) {
      const W = lg.getBoundingClientRect();
      const past = (el: Element) => {
        const r = el.getBoundingClientRect();
        return Math.max(r.bottom - W.top - bd.h, r.right - W.left - bd.w);
      };
      lg.querySelectorAll<HTMLElement>('[data-n]').forEach((el) => {
        if (el.offsetParent === null || past(el) < 1) return;
        const parent = el.parentElement?.closest<HTMLElement>('[data-n]');
        if (parent && past(parent) >= 1) return;
        const id = el.dataset.n;
        add({ key: `board-${id}`, node: id, bp: 'lg', level: 'error', text: 'Runs past the artboard by {d} px: it will be cut off', vars: { d: Math.round(past(el)) } });
      });
    }
  } finally {
    lg.remove();
  }

  // phone: finger-sized buttons, nothing past the edge, text not too small
  const sm = page.board ? null : await drawAt(p, page, media, 390, tr);
  if (sm) try {
    const W = sm.getBoundingClientRect();
    sm.querySelectorAll<HTMLElement>('.t-button, .t-field input, .t-field textarea').forEach((el) => {
      if (el.offsetParent === null) return;
      const r = el.getBoundingClientRect();
      const id = nodeOf(el);
      if (r.height < 40) add({ key: `tap-${id}`, node: id, bp: 'sm', level: 'warn', text: 'Small for a finger on a phone: {h} px tall, aim for 44', vars: { h: Math.round(r.height) } });
    });
    sm.querySelectorAll<HTMLElement>('[data-n]').forEach((el) => {
      if (el.offsetParent === null) return;
      const r = el.getBoundingClientRect();
      if (r.right > W.left + 391 || r.left < W.left - 1) {
        const id = el.dataset.n;
        // report the outermost node that spills
        const parent = el.parentElement?.closest<HTMLElement>('[data-n]');
        const pr = parent?.getBoundingClientRect();
        if (pr && (pr.right > W.left + 391 || pr.left < W.left - 1)) return;
        add({ key: `spill-${id}`, node: id, bp: 'sm', level: 'error', text: 'Spills past the phone screen by {d} px', vars: { d: Math.round(Math.max(r.right - W.left - 390, W.left - r.left)) } });
      }
    });
    sm.querySelectorAll<HTMLElement>('.t-text, .t-heading, .t-button').forEach((el) => {
      if (el.offsetParent === null || !el.textContent?.trim()) return;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      const id = nodeOf(el);
      if (fs < 13) add({ key: `small-${id}`, node: id, bp: 'sm', level: 'warn', text: 'Text is {s} px on a phone; 13 px or more reads better', vars: { s: Math.round(fs) } });
    });
  } finally {
    sm.remove();
  }

  // the tree itself
  const heads: { id: string; l: number }[] = [];
  walk(page.root, (n: SiteNode) => {
    if (n.type === 'heading') heads.push({ id: n.id, l: n.level ?? 2 });
    if (n.type === 'media') {
      const a = n.assetId ? p.assets.find((x) => x.id === n.assetId) : undefined;
      if (!a) add({ key: `empty-${n.id}`, node: n.id, bp: 'lg', level: 'warn', text: 'A picture frame is empty' });
      else if (!n.alt && /\.[a-z0-9]{2,4}$|^(img|dsc|image|photo|screenshot)[\s_-]?\d*/i.test(a.title)) add({ key: `alt-${n.id}`, node: n.id, bp: 'lg', level: 'warn', text: 'The picture has no description for screen readers' });
    }
    if (n.type === 'button' && !page.board && (!n.href || n.href === '#')) add({ key: `link-${n.id}`, node: n.id, bp: 'lg', level: 'warn', text: 'The button goes nowhere yet' });
    if ((n.type === 'heading' || n.type === 'text') && !n.text?.trim() && !n.bind) add({ key: `blank-${n.id}`, node: n.id, bp: 'lg', level: 'warn', text: 'Empty text' });
  });
  const h1 = heads.filter((h) => h.l === 1);
  if (!h1.length && !page.board) add({ key: 'h1-none', bp: 'lg', level: 'warn', text: 'No main headline (H1): search engines and screen readers look for one' });
  if (h1.length > 1) add({ key: 'h1-many', node: h1[1].id, bp: 'lg', level: 'warn', text: '{n} main headlines (H1): keep one', vars: { n: h1.length } });
  heads.forEach((h, i) => {
    const prev = heads[i - 1];
    if (prev && h.l > prev.l + 1) add({ key: `order-${h.id}`, node: h.id, bp: 'lg', level: 'warn', text: 'Heading level jumps from H{a} to H{b}', vars: { a: prev.l, b: h.l } });
  });
  // errors first, then by place on the page
  const order: string[] = [];
  walk(page.root, (n) => order.push(n.id));
  return out.sort((a, b) => (a.level === b.level ? order.indexOf(a.node ?? '') - order.indexOf(b.node ?? '') : a.level === 'error' ? -1 : 1));
}
