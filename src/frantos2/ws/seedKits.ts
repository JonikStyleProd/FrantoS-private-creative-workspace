import { haldenPages, saltwaterPages } from '../site/demoPages';
import { autoMotion } from '../site/motion';
import type { Asset, AssetFormat, BoardLayer, Comment, Flow, MoodItem, Project, StoryFrame, Work, WorkType } from './types';

/**
 * Four demos, one per profession kit, in place of the four vessel collections:
 *   Wavelength — a surf forecast app (web & UI): screens in device frames, a flow and a clickable prototype.
 *   Halden     — a furniture store redesign (web & dev): the old site and the new, handoff, snippets, fonts.
 *   Velo       — an e-bike launch film (motion): storyboard, two cuts with notes on the timecode, a track, Lottie.
 *   Saltwater  — a seaside bakery identity (graphic): logo rounds in SVG, mark, pattern, fonts, packaging.
 * Photos were generated for the demo (Higgsfield); screens are HTML drawn by tools/kits; previews of fonts,
 * code, sound, Lottie and links were drawn by the app's own preview code. Files: public/projects/<id>/.
 */

/** 2: pages built in the constructor for Halden and Saltwater · 3: those pages move */
export const KIT_REV = 3;
const day = 86400000;
const H = 3600000;

interface A {
  key: string;
  title: string;
  kind?: 'image' | 'video';
  format?: AssetFormat;
  device?: 'phone' | 'tablet' | 'desktop';
  /** file name in the project folder; previews (fonts, code, sound, Lottie, links) use <key>-pv.webp */
  file?: string;
  w: number;
  h: number;
  duration?: number;
  text?: string;
  lang?: string;
  note?: string;
  ref?: string;
  palette?: string[];
  ageD: number;
}
interface W {
  title: string;
  type: WorkType;
  versions: [string, string][];
  approved?: number;
  status?: Work['status'];
  dueD?: number;
}
interface C {
  work: number;
  version: number;
  text: string;
  ageH: number;
  pin?: [number, number];
  t?: [number, number?];
  resolved?: boolean;
  reply?: string;
  task?: boolean;
}
interface Kit {
  id: string;
  title: string;
  brief: string;
  status: Project['status'];
  t0: number;
  client: string;
  tags: string[];
  palette: string[];
  bg: string;
  ink: string;
  cover: string;
  assets: A[];
  works: W[];
  comments: C[];
  story: [string, string, number?][];
  flow?: { links: [string, string, number, number, number, number][]; start: string };
  board: { w: number; h: number; layers: Omit<BoardLayer, 'id'>[] };
  presentation: string[];
  extra?: Partial<Project>;
}

/* ───────── Wavelength · surf forecast app ───────── */
const SCREEN = { w: 780, h: 1688, format: 'screen' as const, device: 'phone' as const };
const WAVELENGTH: Kit = {
  id: 'wavelength',
  title: 'Wavelength · Surf app',
  brief: 'A surf forecast app for people who check before they paddle out: swell, wind and tide for your own spots, read in one glance. Six key screens, a flow and a prototype for the first user tests.',
  status: 'review',
  t0: Date.UTC(2026, 9, 12, 8, 0),
  client: 'Noa K. · Product lead',
  tags: ['app', 'ui', 'mobile'],
  palette: ['#1f6f8b', '#0e2230', '#f6f0e6', '#ff7a59', '#3fd08f'],
  bg: '#f6f0e6',
  ink: '#0e2230',
  cover: 's-today',
  assets: [
    { key: 's-welcome', title: '01 Welcome', ...SCREEN, ageD: 6 },
    { key: 's-spots', title: '02 Pick your spots', ...SCREEN, ageD: 6 },
    { key: 's-today-v1', title: '03 Today · table', ...SCREEN, ageD: 9 },
    { key: 's-today', title: '03 Today', ...SCREEN, ageD: 3 },
    { key: 's-spot', title: '04 Spot · Rocky Point', ...SCREEN, ageD: 3 },
    { key: 's-log', title: '05 Log a session', ...SCREEN, ageD: 2 },
    { key: 's-saved', title: '06 Session saved', ...SCREEN, ageD: 2 },
    { key: 'dawn', title: 'Dawn paddle-out', w: 896, h: 1120, ref: 'Photo for onboarding', note: 'The calm before the first wave: onboarding needs this quiet.', ageD: 12 },
    { key: 'point', title: 'Point break from above', w: 896, h: 1120, ref: 'Drone, Rocky Point', note: 'The lines read like a chart already — the swell graph borrows them.', ageD: 12 },
    { key: 'van', title: 'Car park at golden hour', w: 896, h: 1120, ref: 'Field visit', note: 'Who uses the app: checked on the phone, standing by the van.', ageD: 13 },
    { key: 'tide', title: 'Tide table in the surf shop', w: 896, h: 1120, ref: 'Surf shop counter', note: 'People still trust the paper tide table. Ours has to be as plain.', ageD: 13 },
    { key: 'loader', title: 'Swell loader', format: 'lottie', file: 'loader.json', w: 512, h: 512, duration: 2, note: 'Three dots rising like a set. Plays while the forecast loads.', palette: ['#1f6f8b', '#3fd08f', '#8cd1d9'], ageD: 4 },
    { key: 'font-inter', title: 'Inter Tight', format: 'font', file: 'inter-tight.woff2', w: 960, h: 720, lang: 'Inter Tight', note: 'Numbers and UI text: tabular figures for the forecast.', ageD: 10 },
    { key: 'font-literata', title: 'Literata', format: 'font', file: 'literata.woff2', w: 960, h: 720, lang: 'Literata', note: 'Headlines: a warm serif so mornings feel human, not technical.', ageD: 10 },
    { key: 'link-hig', title: 'Apple HIG', format: 'link', text: 'https://developer.apple.com/design/human-interface-guidelines', w: 960, h: 600, note: 'Tab bar and safe areas.', ageD: 11 },
    { key: 'link-m3', title: 'Material 3', format: 'link', text: 'https://m3.material.io', w: 960, h: 600, note: 'For the Android build: chips and bottom bar.', ageD: 11 },
  ],
  works: [
    { title: 'Today screen', type: 'screen', versions: [['s-today-v1', 'Table'], ['s-today', 'One glance']], status: 'client', dueD: 2 },
    { title: 'Onboarding', type: 'flow', versions: [['s-welcome', 'Welcome']], approved: 0, status: 'done' },
    { title: 'Spot detail', type: 'screen', versions: [['s-spot', 'Rocky Point']], status: 'doing', dueD: 4 },
    { title: 'Session log', type: 'screen', versions: [['s-log', 'Form'], ['s-saved', 'Saved state']], status: 'doing', dueD: 6 },
  ],
  comments: [
    { work: 0, version: 0, pin: [0.5, 0.32], text: 'Accurate, but nobody reads a table at 6 am. Tell me in one line if it is on.', ageH: 24 * 7, resolved: true, reply: 'v2: one big card for your main spot, the verdict in the headline.' },
    { work: 0, version: 1, pin: [0.5, 0.42], text: 'Love the headline. Can the best window be tappable, so it opens the hourly view?', ageH: 7 },
    { work: 0, version: 1, pin: [0.72, 0.6], text: 'Make "Fair" readable for colour-blind users — add the word everywhere, not only the colour.', ageH: 5, task: true },
    { work: 2, version: 0, pin: [0.5, 0.88], text: 'The coral button is the only warm thing here. Good — keep it for the one action.', ageH: 20 },
    { work: 3, version: 1, pin: [0.5, 0.5], text: 'The share card should work as an Instagram story too (9:16).', ageH: 30, task: true },
  ],
  story: [
    ['tide', 'People trust the paper tide table. The app has to be as plain.'],
    ['s-today-v1', 'Round one: everything, in a table.'],
    ['s-today', 'Round two: one glance — is it on?'],
    ['s-spot', 'Then the detail, for the ones who want it.'],
    ['s-saved', 'And the reason to come back: your season, logged.'],
  ],
  flow: {
    start: 's-welcome',
    links: [
      ['s-welcome', 's-spots', 0.072, 0.816, 0.856, 0.066],
      ['s-spots', 's-today', 0.062, 0.882, 0.877, 0.066],
      ['s-today', 's-spot', 0.056, 0.225, 0.887, 0.323],
      ['s-spot', 's-log', 0.051, 0.886, 0.897, 0.066],
      ['s-spot', 's-today', 0.051, 0.06, 0.097, 0.045],
      ['s-log', 's-saved', 0.056, 0.886, 0.887, 0.066],
      ['s-saved', 's-today', 0.513, 0.886, 0.426, 0.066],
    ],
  },
  board: {
    w: 1920,
    h: 1080,
    layers: [
      { kind: 'rect', x: 0, y: 0, w: 1920, h: 1080, fill: '#e9f3f4' },
      { kind: 'text', text: 'Wavelength', x: 96, y: 96, w: 700, h: 120, size: 96, weight: 700, color: '#0e2230', align: 'start' },
      { kind: 'text', text: 'Know before you paddle out.', x: 100, y: 230, w: 640, h: 80, size: 36, weight: 500, color: '#1f6f8b', align: 'start' },
      { kind: 'image', assetId: 's-welcome', x: 880, y: 120, w: 380, h: 822, fit: 'cover', radius: 40 },
      { kind: 'image', assetId: 's-today', x: 1300, y: 120, w: 380, h: 822, fit: 'cover', radius: 40 },
      { kind: 'palette', x: 100, y: 880, w: 560, h: 64, colors: ['#1f6f8b', '#0e2230', '#f6f0e6', '#ff7a59', '#3fd08f'] },
    ],
  },
  presentation: ['s-welcome', 's-today', 's-spot', 's-saved'],
};

/* ───────── Halden · website redesign ───────── */
const HALDEN: Kit = {
  id: 'halden',
  title: 'Halden · Website redesign',
  brief: 'A Danish furniture workshop outgrew its 2014 shop. The new site lets the oak and the workshop speak: big pictures, a serif with character, four products a row, and a repair promise on the home page.',
  status: 'review',
  t0: Date.UTC(2026, 9, 2, 9, 0),
  client: 'Jens H. · Owner',
  tags: ['web', 'redesign', 'e-commerce'],
  palette: ['#1d1b18', '#f4f0ea', '#b8875a', '#7a7268', '#e8e0d4'],
  bg: '#f4f0ea',
  ink: '#1d1b18',
  cover: 's-home',
  assets: [
    { key: 's-home-v1', title: 'Home · current site (2014)', format: 'screen', device: 'desktop', w: 1440, h: 1230, ageD: 20 },
    { key: 's-home', title: 'Home · new', format: 'screen', device: 'desktop', w: 1440, h: 2352, ageD: 4 },
    { key: 's-product', title: 'Product · Ask chair', format: 'screen', device: 'desktop', w: 1440, h: 1236, ageD: 3 },
    { key: 's-mobile', title: 'Home · phone', format: 'screen', device: 'phone', w: 780, h: 2108, ageD: 3 },
    { key: 'room', title: 'Living room', w: 1024, h: 688, note: 'The hero: warm, empty wall on the left for the headline.', ageD: 9 },
    { key: 'chair', title: 'Ask chair', w: 896, h: 1120, note: 'Packshot on warm grey — the same light for every product.', ageD: 9 },
    { key: 'lamp', title: 'Fold lamp', w: 896, h: 1120, ageD: 9 },
    { key: 'sofa', title: 'Dune sofa', w: 896, h: 1120, ageD: 9 },
    { key: 'shelf', title: 'Ledge shelf', w: 896, h: 1120, ageD: 9 },
    { key: 'workshop', title: 'The workshop bench', w: 896, h: 1120, ref: 'Workshop visit', note: 'Shavings on the bench: the reason to pay more. It earned its own section.', ageD: 15 },
    { key: 'code-card', title: 'Product card', format: 'code', lang: 'html', w: 960, h: 720, note: 'The card from the grid, with its hover lift.', ageD: 3 },
    { key: 'code-button', title: 'Buttons', format: 'code', lang: 'css', w: 960, h: 720, note: 'Solid and outline pills with a visible keyboard focus.', ageD: 3 },
    { key: 'code-reveal', title: 'Scroll reveal', format: 'code', lang: 'js', w: 960, h: 720, note: 'Cards rise in once as they enter the screen.', ageD: 2 },
    { key: 'font-serif', title: 'Instrument Serif', format: 'font', file: 'instrument-serif.woff2', w: 960, h: 720, lang: 'Instrument Serif', note: 'Headlines: narrow, warm, a little old.', ageD: 12 },
    { key: 'font-manrope', title: 'Manrope', format: 'font', file: 'manrope.woff2', w: 960, h: 720, lang: 'Manrope', note: 'Everything else, including prices.', ageD: 12 },
    { key: 'link-old', title: 'Current site', format: 'link', text: 'https://halden.example', w: 960, h: 600, note: 'Before: grey bars, a slider, ADD TO CART in orange.', ageD: 20 },
  ],
  works: [
    { title: 'Home page', type: 'page', versions: [['s-home-v1', 'Current site'], ['s-home', 'Redesign']], status: 'client', dueD: 3 },
    { title: 'Product page', type: 'page', versions: [['s-product', 'Ask chair']], status: 'doing', dueD: 5 },
    { title: 'Phone home', type: 'screen', versions: [['s-mobile', 'Phone']], status: 'doing', dueD: 5 },
  ],
  comments: [
    { work: 0, version: 0, pin: [0.5, 0.22], text: 'This is what we have today. Customers say it looks like a discount store.', ageH: 24 * 18, resolved: true, reply: 'Agreed — the redesign starts from the workshop, not the discount.' },
    { work: 0, version: 1, pin: [0.3, 0.17], text: 'Yes. That headline is us. Can "Visit the workshop" open the booking for Saturday tours?', ageH: 10 },
    { work: 0, version: 1, pin: [0.5, 0.75], text: 'The repair promise should be in the footer too, on every page.', ageH: 8, task: true },
    { work: 1, version: 0, pin: [0.72, 0.36], text: 'Show the price with delivery included — people ask about it on the phone every day.', ageH: 26 },
  ],
  story: [
    ['s-home-v1', 'Before: a 2014 shop, loud and grey.'],
    ['workshop', 'What makes Halden worth it: the bench.'],
    ['room', 'So the home page opens in a room, not a sale.'],
    ['s-home', 'After: the oak and the workshop speak.'],
    ['s-mobile', 'And on the phone, the same calm.'],
  ],
  flow: {
    start: 's-home',
    links: [
      ['s-home', 's-product', 0.044, 0.422, 0.217, 0.191],
      ['s-product', 's-home', 0.044, 0.023, 0.071, 0.034],
      ['s-mobile', 's-home', 0.051, 0.052, 0.216, 0.03],
    ],
  },
  board: {
    w: 1920,
    h: 1080,
    layers: [
      { kind: 'rect', x: 0, y: 0, w: 1920, h: 1080, fill: '#f4f0ea' },
      { kind: 'image', assetId: 's-home-v1', x: 80, y: 180, w: 840, h: 718, fit: 'cover', radius: 16 },
      { kind: 'image', assetId: 's-home', x: 1000, y: 180, w: 840, h: 718, fit: 'cover', radius: 16 },
      { kind: 'text', text: 'Before', x: 80, y: 90, w: 400, h: 70, size: 44, weight: 600, color: '#7a7268', align: 'start' },
      { kind: 'text', text: 'After', x: 1000, y: 90, w: 400, h: 70, size: 44, weight: 600, color: '#1d1b18', align: 'start' },
      { kind: 'palette', x: 1000, y: 940, w: 520, h: 56, colors: ['#1d1b18', '#f4f0ea', '#b8875a', '#7a7268', '#e8e0d4'] },
    ],
  },
  presentation: ['s-home-v1', 's-home', 's-product', 's-mobile'],
};

/* ───────── Velo · launch film ───────── */
const BEAT = 60 / 112;
const BAR = Math.round(4 * BEAT * 1000) / 1000;
const VELO: Kit = {
  id: 'velo',
  title: 'Velo · Launch film',
  brief: 'A 15-second launch film for a city e-bike: blue hour to sunset, one sage-green frame, cut on a 112 BPM track. Storyboard, two cuts and notes on the timecode.',
  status: 'review',
  t0: Date.UTC(2026, 9, 20, 10, 0),
  client: 'Mira S. · Marketing',
  tags: ['motion', 'film', 'launch'],
  palette: ['#0f3b3a', '#9fb39a', '#e9b06a', '#1b2228', '#f2ede4'],
  bg: '#0f3b3a',
  ink: '#f2ede4',
  cover: 'tunnel',
  assets: [
    { key: 'board', title: 'Storyboard · pencil', w: 1344, h: 752, ref: 'Sketchbook', note: 'Six beats, drawn before any frame was made.', ageD: 14 },
    { key: 'street', title: '01 Blue hour street', w: 1344, h: 752, ageD: 10 },
    { key: 'grip', title: '02 Hand on the grip', w: 1344, h: 752, ageD: 10 },
    { key: 'wheel', title: '03 Wheel spin', w: 1344, h: 752, ageD: 10 },
    { key: 'battery', title: '04 Battery click', w: 1344, h: 752, ageD: 9 },
    { key: 'tunnel', title: '05 Tunnel streaks', w: 1344, h: 752, ageD: 9 },
    { key: 'bridge', title: '06 Bridge at sunset', w: 1344, h: 752, ageD: 9 },
    { key: 'end', title: '07 End card', w: 1344, h: 752, ageD: 8 },
    { key: 'cut-v1', title: 'Launch film · cut 1', kind: 'video', file: 'cut-v1.mp4', w: 1280, h: 720, duration: 12.5, ageD: 6 },
    { key: 'cut-v2', title: 'Launch film · cut 2', kind: 'video', file: 'cut-v2.mp4', w: 1280, h: 720, duration: 15, ageD: 2 },
    { key: 'track', title: 'Main track · 112 BPM', format: 'audio', file: 'track.m4a', w: 960, h: 540, duration: 24, note: 'Kick on every beat from bar two; the bass enters on bar three.', ageD: 11 },
    { key: 'sting', title: 'Wheel sting', format: 'lottie', file: 'sting.json', w: 512, h: 512, duration: 3, note: 'Logo sting for the end card and the app splash.', palette: ['#9fb39a', '#e9b06a'], ageD: 5 },
  ],
  works: [
    { title: 'Launch film', type: 'video', versions: [['cut-v1', 'Cut 1 · 12.5 s'], ['cut-v2', 'Cut 2 · on the beat']], status: 'client', dueD: 2 },
    { title: 'End card', type: 'animation', versions: [['end', 'Still'], ['sting', 'Wheel sting']], status: 'doing', dueD: 4 },
  ],
  comments: [
    { work: 0, version: 0, t: [0.2], text: 'Starting on the sunset gives the ending away. Open in the dark street instead.', ageH: 24 * 5, resolved: true, reply: 'Cut 2 opens at blue hour and saves the sunset for the end.' },
    { work: 0, version: 1, t: [4.3, 6.4], text: 'The wheel spin is the moment — hold it one more beat.', ageH: 9 },
    { work: 0, version: 1, t: [6.4, 8.6], text: 'Battery click: add the sound of the click here, it sells the product.', ageH: 8, task: true },
    { work: 0, version: 1, t: [12.9], text: 'End card needs the logo and the date: launch 3.12.', ageH: 6, task: true },
    { work: 1, version: 0, pin: [0.5, 0.5], text: 'Keep the amber rim — it is the only warm light in the film.', ageH: 30 },
  ],
  story: [
    ['street', 'Blue hour. The city before it wakes.', BAR],
    ['grip', 'One hand, one grip.', BAR],
    ['wheel', 'And it moves.', BAR],
    ['battery', 'Click. A day of riding.', BAR],
    ['tunnel', 'Through the tunnel.', BAR],
    ['bridge', 'Over the river at sunset.', BAR],
    ['end', 'Velo. From 3 December.', BAR],
  ],
  board: {
    w: 1920,
    h: 1080,
    layers: [
      { kind: 'image', assetId: 'tunnel', x: 0, y: 0, w: 1920, h: 1080, fit: 'cover' },
      { kind: 'rect', x: 0, y: 700, w: 1920, h: 380, fill: '#0f3b3acc' },
      { kind: 'text', text: 'Velo', x: 96, y: 760, w: 900, h: 160, size: 150, weight: 800, color: '#f2ede4', align: 'start' },
      { kind: 'text', text: 'Launch film · 15 s · 112 BPM', x: 100, y: 940, w: 900, h: 60, size: 36, weight: 600, color: '#e9b06a', align: 'start' },
    ],
  },
  presentation: ['street', 'wheel', 'tunnel', 'bridge', 'end'],
  extra: { animatic: { audioAssetId: 'velo-a-track', fade: 0.35, bpm: 112, beats: Array.from({ length: 44 }, (_, i) => Math.round(i * BEAT * 1000) / 1000) } },
};

/* ───────── Saltwater · bakery identity ───────── */
const SALT: Kit = {
  id: 'saltwater',
  title: 'Saltwater · Bakery identity',
  brief: 'Identity for a bakery on the harbour front: an italic serif that feels handwritten, one wave line, navy and cream with a warm crust colour. Logo, mark, pattern, signage, bags and cards.',
  status: 'approved',
  t0: Date.UTC(2026, 8, 28, 9, 0),
  client: 'Lea & Sam · Owners',
  tags: ['identity', 'brand', 'print'],
  palette: ['#1d2b44', '#f3eee4', '#b0603a', '#e7b77a', '#8a9aa8'],
  bg: '#f3eee4',
  ink: '#1d2b44',
  cover: 'shop',
  assets: [
    { key: 'logo-v1', title: 'Logo · round 1', format: 'svg', file: 'logo-v1.svg', w: 800, h: 500, palette: ['#f3eee4', '#1d2b44'], ageD: 24 },
    { key: 'logo-v2', title: 'Logo · round 2', format: 'svg', file: 'logo-v2.svg', w: 800, h: 500, palette: ['#f3eee4', '#1d2b44', '#b0603a'], ageD: 16 },
    { key: 'mark', title: 'Mark · S with a wave', format: 'svg', file: 'mark.svg', w: 400, h: 400, palette: ['#1d2b44', '#f3eee4', '#e7b77a'], ageD: 15 },
    { key: 'pattern', title: 'Wave pattern', format: 'svg', file: 'pattern.svg', w: 600, h: 600, palette: ['#1d2b44', '#e7b77a'], ageD: 14 },
    { key: 'shop', title: 'Shopfront', w: 896, h: 1120, note: 'Hand-painted sign in cream on navy.', ageD: 6 },
    { key: 'bag', title: 'Bread bag', w: 896, h: 1120, note: 'Kraft bag, one round sticker: cheap to print, easy to spot.', ageD: 7 },
    { key: 'cards', title: 'Business cards', w: 896, h: 1120, ageD: 7 },
    { key: 'loaf', title: 'Sourdough and sea salt', w: 896, h: 1120, ref: 'Shot at the bakery', note: 'Where the palette comes from: crust, flour, salt and the harbour.', ageD: 26 },
    { key: 'font-serif-italic', title: 'Instrument Serif Italic', format: 'font', file: 'instrument-serif-italic.woff2', w: 960, h: 720, lang: 'Instrument Serif', note: 'The wordmark face — redrawn by hand for the sign.', ageD: 20 },
  ],
  works: [
    { title: 'Logo', type: 'identity', versions: [['logo-v1', 'Upright'], ['logo-v2', 'Italic with the wave']], approved: 1, status: 'done' },
    { title: 'Mark', type: 'identity', versions: [['mark', 'S with a wave']], approved: 0, status: 'done' },
    { title: 'Packaging', type: 'mockup', versions: [['bag', 'Kraft bag']], approved: 0, status: 'done' },
    { title: 'Signage', type: 'mockup', versions: [['shop', 'Shopfront']], approved: 0, status: 'done' },
  ],
  comments: [
    { work: 0, version: 0, pin: [0.5, 0.5], text: 'Too serious — we are a bakery, not a bank.', ageH: 24 * 18, resolved: true, reply: 'Round 2: italic, and a wave under it.' },
    { work: 0, version: 1, pin: [0.5, 0.66], text: 'The wave! Yes. Approved.', ageH: 24 * 15, resolved: true },
    { work: 2, version: 0, pin: [0.55, 0.42], text: 'Sticker is perfect. Order 5,000.', ageH: 24 * 6, resolved: true },
  ],
  story: [
    ['loaf', 'Crust, flour, salt and the harbour.'],
    ['logo-v1', 'Round one was upright and too serious.'],
    ['logo-v2', 'Round two leans in, with a wave.'],
    ['bag', 'One sticker on a kraft bag.'],
    ['shop', 'And the sign over the door.'],
  ],
  board: {
    w: 2480,
    h: 3508,
    layers: [
      { kind: 'rect', x: 0, y: 0, w: 2480, h: 3508, fill: '#1d2b44' },
      { kind: 'image', assetId: 'shop', x: 160, y: 160, w: 2160, h: 2200, fit: 'cover', radius: 24 },
      { kind: 'text', text: 'Saltwater', x: 160, y: 2560, w: 2160, h: 320, size: 300, weight: 400, color: '#f3eee4', align: 'start', font: 'instrument-serif' },
      { kind: 'text', text: 'Bread from the harbour · open 7 to 2', x: 170, y: 2960, w: 2160, h: 120, size: 84, weight: 600, color: '#e7b77a', align: 'start' },
      { kind: 'palette', x: 170, y: 3200, w: 1200, h: 120, colors: ['#1d2b44', '#f3eee4', '#b0603a', '#e7b77a', '#8a9aa8'] },
    ],
  },
  presentation: ['loaf', 'logo-v2', 'mark', 'bag', 'shop'],
};

const KITS = [WAVELENGTH, HALDEN, VELO, SALT];
export const KIT_IDS = KITS.map((k) => k.id);

/** code snippets ship as text inside the demo: shown with a live preview, copied from the handoff page */
const SNIPPETS: Record<string, string> = {
  'halden-a-code-card': `<!-- Halden product card: image, name, price; the whole card is the link -->
<style>
  :root { --ink: #1d1b18; --paper: #f4f0ea; --oak: #b8875a; }
  body { font-family: system-ui, sans-serif; background: var(--paper); display: grid; place-items: center; min-height: 100vh; }
  .card { display: block; width: 260px; border-radius: 18px; overflow: hidden; background: #fff; color: var(--ink); text-decoration: none; transition: transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s; }
  .card:hover { transform: translateY(-4px); box-shadow: 0 24px 40px -24px rgba(29,27,24,.45); }
  .card .img { aspect-ratio: 4 / 5; background: linear-gradient(160deg, #e9e1d4, #cdbba3); }
  .card .t { display: flex; justify-content: space-between; padding: 14px 16px 18px; font-weight: 700; }
  .card .t span { color: #7a7268; font-weight: 600; }
</style>
<a class="card" href="#">
  <div class="img"></div>
  <div class="t">Ask chair <span>€349</span></div>
</a>
`,
  'halden-a-code-button': `/* Halden buttons: one solid, one outline, both pill-shaped, both keyboard-visible */
.demo { font-family: system-ui, sans-serif; padding: 40px; background: #f4f0ea; min-height: 100vh; display: flex; flex-direction: column; gap: 16px; align-items: flex-start; }
.demo h1 { font: 400 44px/1 Georgia, serif; color: #1d1b18; margin: 0; }
.demo button, .demo a { font: 700 15px system-ui; height: 46px; padding: 0 24px; border-radius: 999px; border: 1.5px solid #1d1b18; background: #1d1b18; color: #fff; cursor: pointer; }
.demo a { display: inline-flex; align-items: center; background: transparent; color: #1d1b18; text-decoration: none; }
.demo button:hover { background: #3a362f; }
.demo :focus-visible { outline: 3px solid #b8875a; outline-offset: 3px; }
`,
  'halden-a-code-reveal': `// Scroll reveal for product cards: each card rises in as it enters the screen, once.
const app = document.getElementById('app');
app.innerHTML = Array.from({ length: 8 }, (_, i) => \`<div class="c" style="height:120px;margin:16px;border-radius:16px;background:hsl(\${30 + i * 6} 30% \${80 - i * 3}%);opacity:0;transform:translateY(24px);transition:.6s cubic-bezier(.22,1,.36,1)"></div>\`).join('');
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  e.target.style.opacity = 1;
  e.target.style.transform = 'none';
  io.unobserve(e.target);
}), { threshold: 0.2 });
document.querySelectorAll('.c').forEach((c) => io.observe(c));
`,
};

export function kitProject(id: string): Project {
  const k = KITS.find((x) => x.id === id)!;
  const now = Date.now();
  const base = `/projects/${k.id}/`;
  const aid = (key: string) => `${k.id}-a-${key}`;
  const assets: Asset[] = k.assets.map((a) => {
    const id = aid(a.key);
    const pv = a.format && a.format !== 'screen' && a.format !== 'svg';
    const kind = a.kind ?? 'image';
    const src = a.file ? base + a.file : pv ? `${base}${a.key}-pv.webp` : `${base}${a.key}.webp`;
    const thumb = pv ? `${base}${a.key}-pv.webp` : a.format === 'svg' ? base + a.file : kind === 'video' ? `${base}${a.key}-sm.webp` : `${base}${a.key}-sm.webp`;
    return {
      id,
      kind,
      format: a.format,
      device: a.device,
      text: a.format === 'code' ? SNIPPETS[id] : a.text,
      lang: a.lang,
      title: a.title,
      src,
      thumb,
      w: a.w,
      h: a.h,
      duration: a.duration,
      createdAt: Math.min(now - H, now - a.ageD * day),
      isReference: !!a.ref || (!!a.format && a.format !== 'screen' && a.format !== 'svg'),
      source: a.ref,
      note: a.note,
      palette: a.palette,
      tags: [k.tags[0]],
    };
  });
  const at = (key: string) => assets.find((a) => a.id === aid(key))!.createdAt;
  const works: Work[] = k.works.map((w, wi) => ({
    id: `${k.id}-w${wi}`,
    title: w.title,
    kind: assets.find((a) => a.id === aid(w.versions[0][0]))!.kind,
    type: w.type,
    createdAt: at(w.versions[0][0]),
    status: w.status,
    due: w.dueD ? now + w.dueD * day : undefined,
    versions: w.versions.map(([key, label], n) => ({ id: `${k.id}-w${wi}-v${n + 1}`, n: n + 1, assetId: aid(key), createdAt: at(key), label })),
    approvedVersionId: w.approved !== undefined ? `${k.id}-w${wi}-v${w.approved + 1}` : undefined,
  }));
  // deliverables are not references, even when a preview-only format
  const inWork = new Set(works.flatMap((w) => w.versions.map((v) => v.assetId)));
  assets.forEach((a) => inWork.has(a.id) && (a.isReference = false));

  const comments: Comment[] = k.comments.map((c, ci) => {
    const w = works[c.work];
    const v = w.versions[Math.min(c.version, w.versions.length - 1)];
    const created = Math.max(v.createdAt + H, now - c.ageH * H);
    return {
      id: `${k.id}-c${ci}`,
      workId: w.id,
      versionId: v.id,
      pin: c.pin ? { x: c.pin[0], y: c.pin[1] } : undefined,
      t: c.t?.[0],
      t2: c.t?.[1],
      isTask: c.task,
      text: c.text,
      author: k.client,
      createdAt: created,
      resolved: !!c.resolved,
      resolvedAt: c.resolved ? created + 5 * H : undefined,
      replies: c.reply ? [{ id: `${k.id}-c${ci}-r`, text: c.reply, author: 'You', createdAt: created + 4 * H }] : [],
    };
  });

  const pics = k.assets.filter((a) => !a.format || a.format === 'svg').slice(0, 10);
  const moodboard: MoodItem[] = pics.map((p, i) => ({ id: `${k.id}-m${i}`, assetId: aid(p.key), x: 0.03 + (i % 5) * 0.19, y: i < 5 ? 0.04 + (i % 2) * 0.05 : 0.5, w: i % 2 ? 0.16 : 0.18, z: i + 1, rot: [-2, 1.5, 0, -1, 2][i % 5] }));

  let flow: Flow | undefined;
  if (k.flow) {
    const screens = k.assets.filter((a) => a.format === 'screen');
    flow = {
      start: aid(k.flow.start),
      nodes: screens.map((s, i) => ({ assetId: aid(s.key), x: 40 + i * 240, y: 40 + (i % 2) * 60 })),
      hotspots: k.flow.links.map(([from, to, x, y, w, h], i) => ({ id: `${k.id}-h${i}`, from: aid(from), to: aid(to), x, y, w, h })),
    };
  }

  const story: StoryFrame[] = k.story.map(([key, caption, duration], i) => ({ id: `${k.id}-s${i}`, assetId: aid(key), caption, duration }));
  const layers: BoardLayer[] = k.board.layers.map((l, i) => ({ ...l, id: `${k.id}-l${i}`, assetId: l.assetId ? aid(l.assetId) : undefined }));

  return {
    id: k.id,
    title: k.title,
    brief: k.brief,
    kind: 'demo',
    seedRev: KIT_REV,
    status: k.status,
    createdAt: k.t0,
    updatedAt: now - (KIT_IDS.indexOf(k.id) + 1) * 90 * 60000,
    coverAssetId: aid(k.cover),
    assets,
    works,
    comments,
    moodboard,
    story,
    flow,
    boards: [{ id: `${k.id}-b0`, title: `${k.title} — board`, w: k.board.w, h: k.board.h, bg: k.bg, layers, createdAt: k.t0 + 3 * day, updatedAt: now - day }],
    presentation: k.presentation.map(aid),
    portfolio: k.presentation.slice(0, 2).map(aid),
    palette: k.palette,
    tags: k.tags,
    ...(k.id === 'velo' ? { animatic: VELO.extra!.animatic } : {}),
    ...(k.id === 'halden' || k.id === 'saltwater' ? { pages: (k.id === 'halden' ? haldenPages(aid) : saltwaterPages(aid)).map((pg) => ({ ...pg, root: autoMotion(pg.root), createdAt: k.t0 + 5 * day, updatedAt: now - 2 * H })) } : {}),
  };
}
