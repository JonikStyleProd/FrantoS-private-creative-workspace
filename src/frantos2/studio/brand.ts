import type { Brand, BrandFont } from '../ws/types';

/** The typefaces a brand kit can use — all bundled, so boards and exports render the same offline. */
export const FONTS: { id: BrandFont; label: string; css: string; kind: 'sans' | 'serif' | 'mono' }[] = [
  { id: 'manrope', label: 'Manrope', css: "'Manrope Variable', 'Heebo Variable', system-ui, sans-serif", kind: 'sans' },
  { id: 'inter-tight', label: 'Inter Tight', css: "'Inter Tight Variable', 'Heebo Variable', system-ui, sans-serif", kind: 'sans' },
  { id: 'literata', label: 'Literata', css: "'Literata Variable', 'Frank Ruhl Libre', Georgia, serif", kind: 'serif' },
  { id: 'instrument-serif', label: 'Instrument Serif', css: "'Instrument Serif', 'Frank Ruhl Libre', Georgia, serif", kind: 'serif' },
  { id: 'frank-ruhl', label: 'Frank Ruhl Libre', css: "'Frank Ruhl Libre', 'Literata Variable', Georgia, serif", kind: 'serif' },
  { id: 'jetbrains-mono', label: 'JetBrains Mono', css: "'JetBrains Mono', ui-monospace, monospace", kind: 'mono' },
];

export const fontCss = (f?: BrandFont) => (FONTS.find((x) => x.id === f) ?? FONTS[0]).css;

export const DEFAULT_BRAND: Brand = { font: 'manrope', bodyFont: 'manrope', palette: [] };
