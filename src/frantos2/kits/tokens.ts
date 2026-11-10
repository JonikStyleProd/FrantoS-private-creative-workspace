import type { Brand } from '../ws/types';
import { FONTS } from '../studio/brand';

/** Design tokens from the brand kit, in the three shapes a developer pastes most. */
export interface Tokens {
  colors: Record<string, string>;
  fonts: { heading: string; body: string };
  radius: Record<string, string>;
  space: Record<string, string>;
}

const NAMES = ['primary', 'secondary', 'accent', 'ink', 'paper', 'muted', 'highlight', 'extra-1', 'extra-2', 'extra-3'];
const stack = (id?: string) => (FONTS.find((f) => f.id === id) ?? FONTS[0]).css.replace(/'/g, '"');

export function tokensOf(brand: Brand, fallback: string[] = []): Tokens {
  const palette = brand.palette.length ? brand.palette : fallback.slice(0, 5);
  const colors: Record<string, string> = {};
  palette.forEach((c, i) => (colors[NAMES[i] ?? `c${i + 1}`] = c.toLowerCase()));
  if (brand.accent) colors.accent = brand.accent.toLowerCase();
  return {
    colors,
    fonts: { heading: stack(brand.font), body: stack(brand.bodyFont ?? brand.font) },
    radius: { sm: '8px', md: '14px', lg: '22px', xl: '30px', pill: '999px' },
    space: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 6: '24px', 8: '32px', 12: '48px', 16: '64px' },
  };
}

const slug = (s?: string) => (s || 'brand').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'brand';

export function toCss(t: Tokens, name?: string) {
  const p = slug(name);
  const lines = [
    `/* ${name || 'Brand'} — design tokens from FrantoS */`,
    ':root {',
    ...Object.entries(t.colors).map(([k, v]) => `  --${p}-color-${k}: ${v};`),
    `  --${p}-font-heading: ${t.fonts.heading};`,
    `  --${p}-font-body: ${t.fonts.body};`,
    ...Object.entries(t.radius).map(([k, v]) => `  --${p}-radius-${k}: ${v};`),
    ...Object.entries(t.space).map(([k, v]) => `  --${p}-space-${k}: ${v};`),
    '}',
  ];
  return lines.join('\n') + '\n';
}

export function toTailwind(t: Tokens, name?: string) {
  const conf = {
    theme: {
      extend: {
        colors: { [slug(name)]: t.colors },
        fontFamily: { heading: t.fonts.heading.split(/,\s*/), body: t.fonts.body.split(/,\s*/) },
        borderRadius: t.radius,
        spacing: t.space,
      },
    },
  };
  return `// ${name || 'Brand'} — design tokens from FrantoS\n/** @type {import('tailwindcss').Config} */\nexport default ${JSON.stringify(conf, null, 2)};\n`;
}

/** W3C design-tokens format ($value / $type), read by Style Dictionary, Tokens Studio and Figma plugins */
export function toJson(t: Tokens) {
  const wrap = (o: Record<string, string>, type: string) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { $value: v, $type: type }]));
  return (
    JSON.stringify(
      {
        color: wrap(t.colors, 'color'),
        font: { heading: { $value: t.fonts.heading, $type: 'fontFamily' }, body: { $value: t.fonts.body, $type: 'fontFamily' } },
        radius: wrap(t.radius, 'dimension'),
        space: wrap(t.space, 'dimension'),
      },
      null,
      2
    ) + '\n'
  );
}
