import type { Brand, SiteColor, SiteSpace, SiteTheme, SiteType } from '../ws/types';

/** Token scales of the constructor: every style value a page can have comes from one of these. */

export const SPACE: SiteSpace[] = ['0', '1', '2', '3', '4', '6', '8', '12', '16', '24', '32'];
export const spacePx = (s: SiteSpace) => Number(s) * 4;

export const TYPE: SiteType[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'];
/** font size in px per width: desktop · tablet · phone */
export const TYPE_PX: Record<SiteType, [number, number, number]> = {
  xs: [13, 13, 13],
  sm: [15, 15, 14],
  md: [17, 17, 16],
  lg: [21, 20, 18],
  xl: [28, 25, 22],
  '2xl': [38, 33, 28],
  '3xl': [54, 46, 36],
  '4xl': [76, 62, 44],
  '5xl': [104, 82, 56],
};
export const lineHeight = (s: SiteType) => (s === '5xl' || s === '4xl' ? 1.02 : s === '3xl' ? 1.06 : s === '2xl' ? 1.12 : s === 'xl' ? 1.2 : 1.5);

export const COLOR_ROLES = ['bg', 'surface', 'text', 'muted', 'accent', 'onAccent', 'line'] as const;
export type ColorRole = (typeof COLOR_ROLES)[number];
export const ROLE_LABEL: Record<ColorRole, string> = { bg: 'Background', surface: 'Surface', text: 'Text', muted: 'Quiet text', accent: 'Accent', onAccent: 'On accent', line: 'Lines' };
const cssRole = (r: string) => r.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

/** a style colour → CSS: roles become variables, hex stays, anything else is dropped */
export function colorCss(c: SiteColor | undefined): string | undefined {
  if (!c) return undefined;
  if (c === 'transparent') return 'transparent';
  if ((COLOR_ROLES as readonly string[]).includes(c)) return `var(--c-${cssRole(c)})`;
  if (/^#[0-9a-f]{3,8}$/i.test(c)) return c;
  return undefined;
}
export const themeColor = (th: SiteTheme, c: SiteColor | undefined) => (c && (COLOR_ROLES as readonly string[]).includes(c) ? th[c as ColorRole] : c && /^#/.test(c) ? c : undefined);

export const RADIUS: Record<SiteTheme['round'], Record<'sm' | 'md' | 'lg' | 'xl', number>> = {
  sharp: { sm: 2, md: 3, lg: 4, xl: 6 },
  soft: { sm: 6, md: 12, lg: 20, xl: 28 },
  round: { sm: 10, md: 18, lg: 28, xl: 40 },
};

export const MAXW = { full: 'none', wide: '1200px', text: '720px', narrow: '480px' } as const;

/* ───────── colour maths ───────── */

const hex = (c: string) => {
  let h = c.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (r: number[]) => '#' + r.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
export const mix = (a: string, b: string, t: number) => {
  const x = hex(a);
  const y = hex(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
};
export function luminance(c: string) {
  const [r, g, b] = hex(c).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
const saturation = (c: string) => {
  const [r, g, b] = hex(c).map((v) => v / 255);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return mx === 0 ? 0 : (mx - mn) / mx;
};

/** a page theme from the brand kit and the project palette: lightest = background, darkest = text, the liveliest = accent */
export function themeFrom(brand: Brand | undefined, palette: string[]): SiteTheme {
  const cols = [...new Set([...(brand?.palette ?? []), ...palette].filter((c) => /^#[0-9a-f]{3,8}$/i.test(c)).map((c) => c.toLowerCase()))];
  const byL = [...cols].sort((a, b) => luminance(b) - luminance(a));
  const bg = byL[0] && luminance(byL[0]) > 0.6 ? byL[0] : '#f6f3ee';
  const text = byL[byL.length - 1] && luminance(byL[byL.length - 1]) < 0.08 ? byL[byL.length - 1] : '#16130f';
  const rest = cols.filter((c) => c !== bg && c !== text);
  const accent = brand?.accent ?? ([...rest].sort((a, b) => saturation(b) * (1 - Math.abs(luminance(b) - 0.25)) - saturation(a) * (1 - Math.abs(luminance(a) - 0.25)))[0] || '#c4643a');
  const surface = rest.find((c) => luminance(c) > 0.55 && contrast(c, text) > 7) ?? mix(bg, text, 0.05);
  return {
    bg,
    surface,
    text,
    muted: mix(text, bg, 0.42),
    accent,
    onAccent: contrast(accent, '#ffffff') >= contrast(accent, text) ? '#ffffff' : text,
    line: mix(bg, text, 0.16),
    heading: brand?.font ?? 'instrument-serif',
    body: brand?.bodyFont ?? 'manrope',
    round: 'soft',
  };
}
