import type { Asset, BoardLayer, Comment, LightPreset, MaterialVariant, MoodItem, Project, StageProp, StudioObject, Work } from './types';

/**
 * Four more demo projects, one studio's handwriting: each is a collection of ten objects.
 * Every object is a live studio vessel; every picture is that object rendered by the same studio engine
 * (tools/render), so the shelf, the renders and the 3D always agree.
 */

const day = 86400000;

type Var = Omit<MaterialVariant, 'id'>;
interface Piece {
  key: string;
  title: string;
  shape: [twist: number, height: number, waist: number];
  variants: Var[];
  light: LightPreset;
  angle: number;
  bg: string;
  stage?: StageProp;
  lens?: number;
  note: string;
  /** how the render is framed and lit for the picture */
  caption: string;
}

interface Series {
  id: string;
  title: string;
  brief: string;
  status: Project['status'];
  t0: number;
  tags: string[];
  client: string;
  pieces: Piece[];
  /** works: [title, piece keys in version order, labels, approved index?] */
  works: [string, string[], string[], number?][];
  /** pieces that read as references (studies) rather than deliverables */
  refs: Record<string, { source: string; influences?: [string, string] }>;
  story: [string, string][];
  comments: { work: number; version: number; pin: [number, number]; text: string; ageH: number; resolved?: boolean; reply?: string }[];
  cover: string;
  presentation: string[];
  portfolio: string[];
}

const v = (name: string, base: Var['base'], baseColor: string, topColor: string, blend: number, softness: number, roughness: number, gloss: number): Var => ({
  name,
  base,
  baseColor,
  topColor,
  blend,
  softness,
  roughness,
  gloss,
});

/* ───────── NOCTURNE · fragrance ───────── */
const NOCTURNE: Series = {
  id: 'nocturne',
  title: 'NOCTURNE · Parfum',
  brief: 'A night fragrance house: ten flacon studies in smoked glass and dark glaze. One silhouette has to work as bottle, cap and campaign mark.',
  status: 'review',
  t0: Date.UTC(2026, 9, 12, 21, 0),
  tags: ['fragrance', 'packaging', 'glass'],
  client: 'Ilan R. · Creative director',
  cover: 'amber',
  pieces: [
    { key: 'amber', title: 'Flacon · smoked amber', shape: [0.22, 0.95, 0.06], variants: [v('Smoked amber', 'glaze', '#3a1f0c', '#c9792a', 0.38, 0.4, 0.06, 1), v('Ink', 'glaze', '#0d0f16', '#1c2238', 0.5, 0.3, 0.1, 1)], light: 'rim', angle: -40, bg: '#1a1513', stage: 'block', lens: 100, note: 'The house bottle. Amber pools darker at the foot, the shoulder catches the rim light.', caption: 'Hero flacon, rim light' },
    { key: 'clear', title: 'Flacon · clear, first pass', shape: [0.22, 0.95, 0.06], variants: [v('Clear lacquer', 'glaze', '#d9d6cf', '#f1efe9', 0.5, 0.2, 0.04, 1)], light: 'spot', angle: -20, bg: '#16161a', lens: 100, note: 'First pass in near-white lacquer: elegant, but it reads as a day scent.', caption: 'v1 · clear under a spot' },
    { key: 'onyx', title: 'Flacon · onyx', shape: [0.4, 1.05, 0.12], variants: [v('Onyx', 'glaze', '#0b0b0d', '#2a2a30', 0.6, 0.3, 0.12, 0.9)], light: 'rim', angle: 35, bg: '#121214', stage: 'plinth', lens: 100, note: 'Black-on-black for the extrait. Only the edge light draws the twist.', caption: 'Extrait, black on black' },
    { key: 'rose', title: 'Flacon · rose smoke', shape: [0.3, 0.85, 0.16], variants: [v('Rose smoke', 'glaze', '#5a2f35', '#c98b88', 0.45, 0.45, 0.14, 0.85)], light: 'sunset', angle: -50, bg: '#2a1c1d', lens: 85, note: 'Shorter body, deeper waist: the flanker for the rose accord.', caption: 'Rose flanker at dusk' },
    { key: 'jade', title: 'Flacon · night jade', shape: [0.5, 1.0, 0.1], variants: [v('Night jade', 'glaze', '#0f2a24', '#4f8a74', 0.4, 0.35, 0.1, 0.9)], light: 'gallery', angle: 20, bg: '#111816', lens: 100, note: 'Green tea and fig — the cooler colourway. More twist so it turns in the hand.', caption: 'Night jade, gallery light' },
    { key: 'cap', title: 'Cap study · brass', shape: [0.9, 0.7, 0.02], variants: [v('Hammered brass', 'glaze', '#6b4a1c', '#d2a656', 0.35, 0.5, 0.28, 0.8)], light: 'spot', angle: -35, bg: '#17130f', stage: 'block', lens: 120, note: 'The cap as its own small sculpture: same section, twist tripled.', caption: 'Brass cap, macro' },
    { key: 'ink', title: 'Flacon · ink blue', shape: [0.22, 1.2, 0.08], variants: [v('Ink blue', 'glaze', '#0b1430', '#3a4f9a', 0.4, 0.35, 0.08, 1)], light: 'rim', angle: -60, bg: '#0f1220', lens: 100, note: 'Tall travel size. Ink blue for the men’s line.', caption: 'Travel size, ink blue' },
    { key: 'ember', title: 'Candle vessel · ember', shape: [0.12, 0.75, 0.0], variants: [v('Ember', 'clay', '#2c1a12', '#8f3f1d', 0.55, 0.3, 0.6, 0.2)], light: 'morning', angle: 40, bg: '#1d1512', stage: 'plinth', lens: 70, note: 'The home candle: same footprint, matte clay so it never competes with the bottle.', caption: 'Home candle, matte' },
    { key: 'pearl', title: 'Flacon · pearl', shape: [0.22, 0.95, 0.2], variants: [v('Pearl', 'glaze', '#cfc6bb', '#efe8de', 0.4, 0.4, 0.18, 0.7)], light: 'softbox', angle: -30, bg: '#2b2724', lens: 100, note: 'Waist at 20% — too delicate for the shelf, kept as a study.', caption: 'Study · deep waist' },
    { key: 'duo', title: 'Coffret · two flacons', shape: [0.6, 0.8, 0.14], variants: [v('Amber / ink', 'glaze', '#0d0f16', '#c9792a', 0.5, 0.6, 0.08, 1)], light: 'sunset', angle: 55, bg: '#1b1412', stage: 'plinth', lens: 85, note: 'Gift set mood: the two colours fading into one object.', caption: 'Coffret, amber into ink' },
  ],
  works: [
    ['Hero flacon', ['clear', 'amber'], ['Clear lacquer, spot', 'Smoked amber, rim light'], 1],
    ['Extrait', ['onyx'], ['Onyx on plinth']],
    ['Flankers', ['rose', 'jade', 'ink'], ['Rose smoke', 'Night jade', 'Ink blue']],
    ['Home & gift', ['ember', 'duo'], ['Candle', 'Coffret']],
  ],
  refs: {
    cap: { source: 'Workshop sample, brass', influences: ['amber', 'Cap section fixed: the twist is tripled, the facets catch the rim light.'] },
    pearl: { source: 'Form study', influences: ['amber', 'Waist pulled back from 20% to 6%: it has to stand in a shop window.'] },
  },
  story: [
    ['clear', 'It started bright. Too bright for a night scent.'],
    ['cap', 'The cap found the language first: one section, three turns.'],
    ['amber', 'Smoked amber, one rim light. The house bottle.'],
    ['onyx', 'The extrait goes black on black.'],
    ['duo', 'And the gift set lets the two colours meet.'],
  ],
  comments: [
    { work: 0, version: 0, pin: [0.52, 0.32], text: 'It reads as a day scent. Can we go smoked — amber or ink?', ageH: 24 * 18, resolved: true, reply: 'v2 in smoked amber with a rim light.' },
    { work: 0, version: 1, pin: [0.48, 0.7], text: 'Lovely pooling at the foot. Keep exactly this density.', ageH: 24 * 15, resolved: true },
    { work: 2, version: 2, pin: [0.5, 0.45], text: 'Ink blue reads almost black on the shelf. Lift it a step?', ageH: 10 },
    { work: 3, version: 1, pin: [0.5, 0.4], text: 'The fade is gorgeous — can the amber climb a little higher?', ageH: 30 },
  ],
  presentation: ['amber', 'onyx', 'rose', 'jade', 'ink', 'duo'],
  portfolio: ['amber', 'onyx'],
};

/* ───────── SALT & STONE · tableware ───────── */
const SALT: Series = {
  id: 'salt-stone',
  title: 'Salt & Stone · Tableware',
  brief: 'Tableware for a seaside restaurant: cups, bowls and servers thrown in one family of forms, glazed like wet sand and sea salt.',
  status: 'wip',
  t0: Date.UTC(2026, 9, 20, 8, 0),
  tags: ['ceramics', 'tableware', 'restaurant'],
  client: 'Noa B. · Chef-owner',
  cover: 'bowl',
  pieces: [
    { key: 'bowl', title: 'Deep bowl · wet sand', shape: [0.08, 0.7, 0.02], variants: [v('Wet sand', 'travertine', '#c9b391', '#a68b62', 0.62, 0.3, 0.7, 0.15), v('Sea salt', 'clay', '#efebe3', '#d9d3c7', 0.5, 0.2, 0.8, 0.05)], light: 'window', angle: -45, bg: '#e9e3d7', lens: 70, note: 'The signature bowl: travertine-coloured outside, darker sand where the glaze pools.', caption: 'Deep bowl, window light' },
    { key: 'cup', title: 'Espresso cup · salt', shape: [0.0, 0.85, 0.08], variants: [v('Sea salt', 'clay', '#f1ede5', '#ddd6c9', 0.5, 0.2, 0.82, 0.05)], light: 'morning', angle: 30, bg: '#ece6db', stage: 'block', lens: 85, note: 'Straight walls, a soft pinch for the fingers. No handle.', caption: 'Espresso cup, morning' },
    { key: 'cup-gloss', title: 'Espresso cup · gloss, first pass', shape: [0.0, 0.85, 0.08], variants: [v('White gloss', 'glaze', '#f4f4f2', '#ffffff', 0.5, 0.1, 0.05, 1)], light: 'spot', angle: 0, bg: '#e6e6e4', lens: 85, note: 'Factory white gloss: clean, but it felt like a hotel.', caption: 'v1 · white gloss' },
    { key: 'pitcher', title: 'Water carafe · stone', shape: [0.18, 1.6, 0.18], variants: [v('Stone', 'travertine', '#d6c7aa', '#b9a27c', 0.7, 0.3, 0.6, 0.2)], light: 'window', angle: -30, bg: '#e7e0d2', stage: 'plinth', lens: 85, note: 'The carafe borrows the bowl’s glaze but stretches the waist.', caption: 'Carafe on the pass' },
    { key: 'server', title: 'Sharing bowl · kelp', shape: [0.3, 0.7, 0.0], variants: [v('Kelp', 'glaze', '#3d4a35', '#7b8a5e', 0.45, 0.4, 0.35, 0.5)], light: 'softbox', angle: -25, bg: '#e4e1d6', lens: 60, note: 'Sharing plates in kelp green for the raw bar.', caption: 'Sharing bowl, kelp' },
    { key: 'salt-cellar', title: 'Salt cellar', shape: [0.6, 0.72, 0.12], variants: [v('Speckled', 'clay', '#e6dccb', '#bfa98a', 0.4, 0.5, 0.75, 0.1)], light: 'morning', angle: 50, bg: '#ece5d8', stage: 'block', lens: 120, note: 'Tiny and twisted — the table jewel.', caption: 'Salt cellar, macro' },
    { key: 'tumbler', title: 'Tumbler · tide', shape: [0.14, 1.1, 0.05], variants: [v('Tide', 'glaze', '#365a66', '#9cc0c4', 0.4, 0.45, 0.25, 0.6)], light: 'window', angle: -40, bg: '#e2e3dd', lens: 85, note: 'Water glass in ceramic, blue only at the lip like a tideline.', caption: 'Tumbler with a tideline' },
    { key: 'vase', title: 'Bud vase · driftwood', shape: [0.45, 1.9, 0.26], variants: [v('Driftwood', 'clay', '#9e8f7d', '#c9bba6', 0.5, 0.4, 0.8, 0.05)], light: 'gallery', angle: 30, bg: '#e6e1d8', lens: 100, note: 'One stem per table. Tall, waisted, matte.', caption: 'Bud vase, one stem' },
    { key: 'ramekin', title: 'Ramekin · urchin', shape: [0.0, 0.7, 0.0], variants: [v('Urchin', 'glaze', '#4a2a3a', '#a8577a', 0.5, 0.3, 0.3, 0.6)], light: 'softbox', angle: 20, bg: '#ebe5da', stage: 'plinth', lens: 85, note: 'A single colour accent for desserts.', caption: 'Ramekin, urchin glaze' },
    { key: 'test', title: 'Glaze test · sand to salt', shape: [0.2, 0.9, 0.1], variants: [v('Sand → salt', 'travertine', '#b59a72', '#efebe3', 0.4, 0.9, 0.6, 0.2)], light: 'window', angle: -50, bg: '#e9e3d7', lens: 85, note: 'Kiln test: how far the salt glaze can run into the sand.', caption: 'Kiln test' },
  ],
  works: [
    ['Signature bowl', ['bowl'], ['Wet sand']],
    ['Espresso cup', ['cup-gloss', 'cup'], ['White gloss', 'Sea salt matte'], 1],
    ['Table family', ['pitcher', 'server', 'ramekin', 'tumbler'], ['Carafe', 'Sharing bowl', 'Ramekin', 'Tumbler']],
    ['Table jewels', ['salt-cellar', 'vase'], ['Salt cellar', 'Bud vase']],
  ],
  refs: {
    test: { source: 'Kiln, firing 14', influences: ['bowl', 'Sand glaze stops two-thirds up; the salt takes the lip.'] },
    'cup-gloss': { source: 'Supplier sample' },
  },
  story: [
    ['cup-gloss', 'The supplier’s white: clean, and completely anonymous.'],
    ['test', 'Firing 14: sand running into salt.'],
    ['bowl', 'The signature bowl, glazed like the beach at low tide.'],
    ['pitcher', 'The family grows from one profile.'],
    ['tumbler', 'Blue only where the water touches.'],
  ],
  comments: [
    { work: 1, version: 0, pin: [0.5, 0.4], text: 'Feels like a hotel breakfast. Matte, please.', ageH: 24 * 9, resolved: true, reply: 'Sea salt matte in v2.' },
    { work: 2, version: 3, pin: [0.5, 0.25], text: 'Love the tideline. Can it be 3 mm thinner?', ageH: 13 },
    { work: 0, version: 0, pin: [0.5, 0.55], text: 'Could the sand line sit a finger lower?', ageH: 20 },
  ],
  presentation: ['bowl', 'cup', 'pitcher', 'server', 'tumbler', 'vase'],
  portfolio: ['bowl'],
};

/* ───────── LUMEN · lamps ───────── */
const LUMEN: Series = {
  id: 'lumen',
  title: 'LUMEN · Alabaster lamps',
  brief: 'A lighting collection for a furniture brand: ten lamp bodies in alabaster, stone and glaze, shown the way they glow at dusk.',
  status: 'approved',
  t0: Date.UTC(2026, 8, 28, 17, 0),
  tags: ['lighting', 'furniture', 'stone'],
  client: 'Studio Haas · Product',
  cover: 'column',
  pieces: [
    { key: 'column', title: 'Column lamp · alabaster', shape: [0.3, 1.9, 0.1], variants: [v('Alabaster', 'travertine', '#efe3cf', '#fff6e6', 0.5, 0.6, 0.45, 0.3), v('Smoked', 'glaze', '#4b4038', '#8c7a68', 0.5, 0.5, 0.3, 0.5)], light: 'sunset', angle: -45, bg: '#d9cfc1', stage: 'plinth', lens: 85, note: 'The floor-standing hero. Warm at the base, almost white toward the top, like light through stone.', caption: 'Column lamp at dusk' },
    { key: 'table', title: 'Table lamp · onion', shape: [0.0, 1.0, 0.28], variants: [v('Onion alabaster', 'travertine', '#ecdfc8', '#fdf3e0', 0.45, 0.6, 0.45, 0.3)], light: 'gallery', angle: 30, bg: '#d6cdc2', stage: 'block', lens: 85, note: 'Deep waist for a softer glow pattern on the table.', caption: 'Table lamp, gallery' },
    { key: 'pendant', title: 'Pendant body · white glaze', shape: [0.7, 1.1, 0.06], variants: [v('White satin', 'glaze', '#f4efe6', '#fbf8f2', 0.5, 0.3, 0.32, 0.5)], light: 'softbox', angle: -20, bg: '#cfc8bf', lens: 100, note: 'Turned so the twist throws soft stripes on the ceiling.', caption: 'Pendant, satin white' },
    { key: 'column-v1', title: 'Column lamp · first pass', shape: [0.0, 2.1, 0.0], variants: [v('Plaster', 'clay', '#e9e5df', '#e9e5df', 1, 0.1, 0.85, 0)], light: 'softbox', angle: 0, bg: '#d2ccc4', lens: 85, note: 'Straight plaster tube: correct proportions, no soul.', caption: 'v1 · straight plaster' },
    { key: 'sconce', title: 'Wall sconce · travertine', shape: [0.15, 0.8, 0.04], variants: [v('Travertine', 'travertine', '#d8c7a8', '#e8dcc5', 0.6, 0.4, 0.6, 0.15)], light: 'morning', angle: 50, bg: '#d8d0c3', lens: 70, note: 'A half-height sconce for corridors.', caption: 'Sconce, morning' },
    { key: 'lantern', title: 'Lantern · honey onyx', shape: [0.5, 1.4, 0.16], variants: [v('Honey onyx', 'glaze', '#a5672a', '#f2c98a', 0.4, 0.6, 0.18, 0.8)], light: 'sunset', angle: 40, bg: '#2a221c', stage: 'plinth', lens: 85, note: 'The evening version: honey onyx on a dark backdrop.', caption: 'Honey onyx after dark' },
    { key: 'mini', title: 'Mini lamp · rose stone', shape: [0.2, 0.9, 0.12], variants: [v('Rose stone', 'travertine', '#d9b5a4', '#efd6c8', 0.5, 0.5, 0.55, 0.2)], light: 'window', angle: -35, bg: '#ddd2c8', stage: 'block', lens: 85, note: 'Bedside, cordless. Rose stone for the hotel line.', caption: 'Bedside mini' },
    { key: 'floor-dark', title: 'Floor lamp · basalt', shape: [0.3, 2.2, 0.14], variants: [v('Basalt', 'clay', '#2b2a29', '#4d4a46', 0.5, 0.3, 0.8, 0.1)], light: 'rim', angle: -55, bg: '#c9c1b6', lens: 85, note: 'The dark counterpart: basalt, the glow only at the top opening.', caption: 'Basalt floor lamp' },
    { key: 'shade', title: 'Shade study · paper', shape: [1.2, 1.0, 0.2], variants: [v('Paper', 'clay', '#f3ece0', '#f3ece0', 1, 0.1, 0.9, 0)], light: 'gallery', angle: 0, bg: '#d4ccc0', lens: 100, note: 'How far the twist can go before it looks like a lantern from a shop.', caption: 'Study · maximum twist' },
    { key: 'trio', title: 'Lineup · three heights', shape: [0.3, 1.5, 0.12], variants: [v('Alabaster fade', 'travertine', '#d8c4a4', '#fff7ea', 0.35, 0.8, 0.45, 0.3)], light: 'sunset', angle: -30, bg: '#d9cfc1', stage: 'plinth', lens: 70, note: 'Catalogue opener: the family under one arch.', caption: 'Catalogue opener' },
  ],
  works: [
    ['Column lamp', ['column-v1', 'column'], ['Straight plaster', 'Twisted alabaster'], 1],
    ['Table & bedside', ['table', 'mini'], ['Onion table lamp', 'Bedside mini'], 0],
    ['Pendant & wall', ['pendant', 'sconce'], ['Pendant', 'Sconce']],
    ['Catalogue', ['trio', 'lantern', 'floor-dark'], ['Opener', 'After dark', 'Basalt']],
  ],
  refs: {
    shade: { source: 'Form study', influences: ['column', 'Twist capped at 54° — beyond that it reads as a paper lantern.'] },
  },
  story: [
    ['column-v1', 'Right height, right width. Nothing to look at.'],
    ['shade', 'Then too much twist. Somewhere in between.'],
    ['column', 'Alabaster, 54°, dusk. The hero.'],
    ['lantern', 'After dark it turns to honey.'],
    ['trio', 'The family, ready for the catalogue.'],
  ],
  comments: [
    { work: 0, version: 0, pin: [0.5, 0.45], text: 'Proportion is right but it’s a pipe. Give it a turn.', ageH: 24 * 30, resolved: true, reply: 'Twisted alabaster in v2.' },
    { work: 3, version: 0, pin: [0.5, 0.3], text: 'Approved for the catalogue. Beautiful.', ageH: 24 * 4, resolved: true },
  ],
  presentation: ['trio', 'column', 'table', 'pendant', 'lantern', 'floor-dark'],
  portfolio: ['column', 'lantern'],
};

/* ───────── MARÉE · sea-glass vases ───────── */
const MAREE: Series = {
  id: 'maree',
  title: 'Marée · Sea-glass vases',
  brief: 'Room objects for a coastal hotel: ten vases glazed like sea glass, each named after a tide. One per room, all of them in the lobby.',
  status: 'review',
  t0: Date.UTC(2026, 9, 26, 10, 0),
  tags: ['hospitality', 'vases', 'glaze'],
  client: 'Hôtel Marée · Interiors',
  cover: 'cobalt',
  pieces: [
    { key: 'cobalt', title: 'Vase · cobalt tide', shape: [0.62, 1.5, 0.14], variants: [v('Cobalt', 'glaze', '#0f2a78', '#3a63c9', 0.45, 0.4, 0.22, 0.7), v('Frosted cobalt', 'glaze', '#22407e', '#7d9bd6', 0.5, 0.5, 0.5, 0.3)], light: 'window', angle: -40, bg: '#dfe6e8', stage: 'plinth', lens: 85, note: 'The lobby piece. Deep cobalt at the foot, clearing toward the lip.', caption: 'Cobalt tide, window' },
    { key: 'seafoam', title: 'Vase · seafoam', shape: [0.4, 1.3, 0.2], variants: [v('Seafoam frost', 'glaze', '#5f9c8e', '#cde6dc', 0.4, 0.6, 0.5, 0.3)], light: 'morning', angle: 35, bg: '#e2e8e4', lens: 85, note: 'Frosted like glass after years in the sand.', caption: 'Seafoam, morning' },
    { key: 'cobalt-v1', title: 'Vase · cobalt, first pass', shape: [0.62, 1.5, 0.14], variants: [v('Cobalt gloss', 'glaze', '#1a2fa0', '#1a2fa0', 1, 0.1, 0.04, 1)], light: 'spot', angle: -10, bg: '#dde2e6', lens: 85, note: 'Flat cobalt gloss: too much like a souvenir.', caption: 'v1 · flat cobalt gloss' },
    { key: 'bottle', title: 'Bottle vase · kelp glass', shape: [0.2, 2.0, 0.3], variants: [v('Kelp glass', 'glaze', '#2c4a2a', '#8fb38a', 0.4, 0.5, 0.25, 0.6)], light: 'window', angle: -50, bg: '#e1e6df', lens: 100, note: 'A narrow-necked bottle vase for a single branch.', caption: 'Bottle vase, one branch' },
    { key: 'shell', title: 'Low vase · shell', shape: [0.9, 0.75, 0.04], variants: [v('Shell', 'travertine', '#e5d6c6', '#f6ede4', 0.5, 0.5, 0.55, 0.25)], light: 'softbox', angle: 25, bg: '#e6e4df', stage: 'block', lens: 70, note: 'Low and wide, for floating flowers in the spa.', caption: 'Shell, low' },
    { key: 'aqua', title: 'Vase · aqua', shape: [0.5, 1.2, 0.1], variants: [v('Aqua', 'glaze', '#1f6f80', '#7fd0d6', 0.45, 0.45, 0.2, 0.7)], light: 'morning', angle: -30, bg: '#dce7e8', lens: 85, note: 'Shallow-water blue for the pool rooms.', caption: 'Aqua, pool rooms' },
    { key: 'amber-glass', title: 'Vase · beach amber', shape: [0.3, 1.0, 0.16], variants: [v('Beach amber', 'glaze', '#7a4512', '#e2a95a', 0.4, 0.5, 0.35, 0.5)], light: 'sunset', angle: 50, bg: '#e9e1d6', stage: 'plinth', lens: 85, note: 'The rare brown sea glass — for the bar.', caption: 'Beach amber at sunset' },
    { key: 'mist', title: 'Vase · morning mist', shape: [0.7, 1.7, 0.18], variants: [v('Mist', 'glaze', '#a9b8bd', '#eef2f2', 0.4, 0.7, 0.55, 0.25)], light: 'softbox', angle: -20, bg: '#e4e8e9', lens: 100, note: 'Almost white — for the rooms facing north.', caption: 'Morning mist' },
    { key: 'storm', title: 'Vase · storm', shape: [1.0, 1.4, 0.22], variants: [v('Storm', 'glaze', '#1d2a33', '#5c7480', 0.5, 0.5, 0.3, 0.6)], light: 'rim', angle: -55, bg: '#cfd7da', stage: 'plinth', lens: 85, note: 'The winter vase: more twist, darker water.', caption: 'Storm, winter' },
    { key: 'pebble', title: 'Study · pebble foot', shape: [0.1, 0.8, 0.0], variants: [v('Pebble', 'travertine', '#b9b1a5', '#d9d3c9', 0.5, 0.4, 0.7, 0.1)], light: 'window', angle: 40, bg: '#e3e3df', lens: 85, note: 'Testing a stone foot under the glaze.', caption: 'Study · stone foot' },
  ],
  works: [
    ['Lobby vase', ['cobalt-v1', 'cobalt'], ['Flat cobalt gloss', 'Cobalt tide'], 1],
    ['Room vases', ['seafoam', 'aqua', 'amber-glass', 'mist'], ['Seafoam', 'Aqua', 'Beach amber', 'Mist']],
    ['Single stems', ['bottle'], ['Kelp bottle']],
    ['Spa & winter', ['shell', 'storm'], ['Shell', 'Storm']],
  ],
  refs: {
    pebble: { source: 'Beach walk, glaze test', influences: ['cobalt', 'Stone foot under the glaze: the cobalt clears as it climbs.'] },
  },
  story: [
    ['cobalt-v1', 'Flat cobalt. A souvenir, not a hotel.'],
    ['pebble', 'The beach answered: stone at the foot, glass above.'],
    ['cobalt', 'Cobalt tide — the lobby piece.'],
    ['seafoam', 'Every room gets its own tide.'],
    ['storm', 'And winter gets the storm.'],
  ],
  comments: [
    { work: 0, version: 0, pin: [0.5, 0.4], text: 'Too shiny, too even. Real sea glass is frosted and uneven.', ageH: 24 * 11, resolved: true, reply: 'v2 clears from deep cobalt at the foot to pale at the lip.' },
    { work: 1, version: 3, pin: [0.5, 0.55], text: 'Mist might disappear against the white walls. Test it in room 204?', ageH: 16 },
    { work: 3, version: 1, pin: [0.5, 0.35], text: 'Storm is my favourite. Can we make two sizes?', ageH: 14 },
  ],
  presentation: ['cobalt', 'seafoam', 'aqua', 'bottle', 'amber-glass', 'storm'],
  portfolio: ['cobalt', 'storm'],
};

export const SERIES: Series[] = [NOCTURNE, SALT, LUMEN, MAREE];
export const SERIES_IDS = SERIES.map((s) => s.id);
/** bump when the series files or copy change */
export const SERIES_REV = 2;

/** render size of every picture in the series (4:5, like the rest of the demo) */
export const SERIES_W = 1600;
export const SERIES_H = 2000;

export function seriesObject(s: Series, p: Piece, i: number, now?: number): StudioObject {
  const base = `/projects/${s.id}/`;
  const created = s.t0 + i * 0.7 * day;
  return {
    id: `${s.id}-o-${p.key}`,
    title: p.title,
    source: { kind: 'vessel', twist: p.shape[0], height: p.shape[1], waist: p.shape[2] },
    variants: p.variants.map((x, k) => ({ ...x, id: `${s.id}-${p.key}-mv${k}` })),
    variantId: `${s.id}-${p.key}-mv0`,
    light: { preset: p.light, angle: p.angle, intensity: 1 },
    camera: { lens: p.lens ?? 85 },
    background: { kind: 'studio', color: p.bg },
    turntable: { seconds: 12 },
    stage: p.stage ?? 'none',
    thumb: `${base}${p.key}-sm.webp`,
    note: p.note,
    createdAt: created,
    updatedAt: now ?? created + day,
  };
}

export function seriesProject(id: string, now = Date.now()): Project {
  const s = SERIES.find((x) => x.id === id)!;
  const base = `/projects/${s.id}/`;
  const aid = (k: string) => `${s.id}-${k}`;
  const at = (k: string) => s.t0 + s.pieces.findIndex((p) => p.key === k) * 0.7 * day;

  const assets: Asset[] = s.pieces.map((p) => {
    const ref = s.refs[p.key];
    return {
      id: aid(p.key),
      kind: 'image',
      title: p.title,
      src: `${base}${p.key}.webp`,
      thumb: `${base}${p.key}-sm.webp`,
      w: SERIES_W,
      h: SERIES_H,
      createdAt: at(p.key),
      isReference: !!ref,
      note: p.caption,
      source: ref?.source ?? 'FrantoS studio render',
      influences: ref?.influences ? { assetId: aid(ref.influences[0]), text: ref.influences[1] } : undefined,
      tags: [...s.tags.slice(0, 2), p.variants[0].name.toLowerCase()],
      palette: [p.variants[0].topColor, p.variants[0].baseColor, p.bg],
    };
  });

  const works: Work[] = s.works.map(([title, keys, labels, approved], wi) => ({
    id: `${s.id}-w${wi}`,
    title,
    kind: 'image',
    createdAt: at(keys[0]),
    status: approved !== undefined ? 'done' : s.status === 'approved' ? 'done' : wi === 0 ? 'client' : 'doing',
    versions: keys.map((k, n) => ({ id: `${s.id}-w${wi}-v${n + 1}`, n: n + 1, assetId: aid(k), createdAt: at(k), label: labels[n] })),
    approvedVersionId: approved !== undefined ? `${s.id}-w${wi}-v${approved + 1}` : s.status === 'approved' ? `${s.id}-w${wi}-v${keys.length}` : undefined,
  }));

  const comments: Comment[] = s.comments.map((c, ci) => {
    const w = works[c.work];
    const ver = w.versions[Math.min(c.version, w.versions.length - 1)];
    const created = Math.max(ver.createdAt + 3600000, now - c.ageH * 3600000);
    return {
      id: `${s.id}-c${ci}`,
      workId: w.id,
      versionId: ver.id,
      pin: { x: c.pin[0], y: c.pin[1] },
      text: c.text,
      author: s.client,
      createdAt: created,
      resolved: !!c.resolved,
      resolvedAt: c.resolved ? created + 6 * 3600000 : undefined,
      replies: c.reply ? [{ id: `${s.id}-c${ci}-r`, text: c.reply, author: 'You', createdAt: created + 5 * 3600000 }] : [],
    };
  });

  // moodboard: a loose two-row collage, alternating sizes and tilts
  const moodboard: MoodItem[] = s.pieces.map((p, i) => {
    const row = i < 5 ? 0 : 1;
    const col = i % 5;
    return {
      id: `${s.id}-m${i}`,
      assetId: aid(p.key),
      x: 0.02 + col * 0.195 + (row ? 0.05 : 0),
      y: row ? 0.5 : 0.04 + (col % 2) * 0.04,
      w: col % 2 ? 0.15 : 0.17,
      z: i + 1,
      rot: [-2, 1.5, 0, -1, 2][col] * (row ? -1 : 1),
    };
  });

  const objects = s.pieces.map((p, i) => seriesObject(s, p, i, now - (s.pieces.length - i) * 3600000));

  // one board per project: the cover large, two more frames, the title and the palette
  const [a, b, c] = s.presentation;
  const coverPiece = s.pieces.find((p) => p.key === s.cover)!;
  const layers: BoardLayer[] = [
    { id: 'l-bg', kind: 'rect', x: 0, y: 0, w: 1600, h: 1000, fill: coverPiece.bg },
    { id: 'l-a', kind: 'image', assetId: aid(a), x: 60, y: 60, w: 704, h: 880, fit: 'cover', radius: 10 },
    { id: 'l-b', kind: 'image', assetId: aid(b), x: 800, y: 380, w: 352, h: 440, fit: 'cover', radius: 10 },
    { id: 'l-c', kind: 'object', objectId: `${s.id}-o-${c}`, x: 1188, y: 380, w: 352, h: 440, fit: 'cover', radius: 10 },
    { id: 'l-t', kind: 'text', text: s.title, x: 800, y: 70, w: 740, h: 150, size: 64, weight: 600, color: isDark(coverPiece.bg) ? '#f4efe6' : '#1b1916', align: 'start' },
    { id: 'l-p', kind: 'palette', x: 800, y: 870, w: 740, h: 70, colors: [coverPiece.variants[0].topColor, coverPiece.variants[0].baseColor, ...s.pieces.slice(1, 4).map((p) => p.variants[0].topColor)] },
  ];

  return {
    id: s.id,
    title: s.title,
    brief: s.brief,
    kind: 'demo',
    seedRev: SERIES_REV,
    status: s.status,
    createdAt: s.t0,
    updatedAt: now - (SERIES_IDS.indexOf(s.id) + 1) * 5 * 3600000,
    coverAssetId: aid(s.cover),
    assets,
    works,
    comments,
    moodboard,
    story: s.story.map(([k, caption], i) => ({ id: `${s.id}-s${i}`, assetId: aid(k), caption })),
    objects,
    boards: [{ id: `${s.id}-b0`, title: `${s.title} — cover`, w: 1600, h: 1000, bg: coverPiece.bg, layers, createdAt: s.t0 + 5 * day, updatedAt: now - 86400000 }],
    presentation: s.presentation.map(aid),
    portfolio: s.portfolio.map(aid),
    tags: s.tags,
  };
}

function isDark(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 128;
}
