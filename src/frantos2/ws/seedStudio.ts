import type { Asset, BoardLayer, Comment, LightPreset, MoodItem, Project, StudioObject, Work } from './types';

/**
 * Four studio demos with their own subjects: a sneaker launch, a boutique hotel, a coffee brand, an audio product.
 * Photos and product shots were generated for the demo (Higgsfield); each product shot was lifted into a textured
 * GLB (SAM 3D / Tripo), so every project carries ten real 3D objects next to its ten pictures.
 * Files live in public/projects/<id>/ (photos) and public/projects/<id>/obj/ (product shot + GLB).
 */

const day = 86400000;

interface Photo {
  key: string;
  title: string;
  note: string;
  /** a reference rather than a deliverable */
  ref?: { source: string; influences?: [string, string] };
}
interface Thing {
  key: string;
  title: string;
  note: string;
  light?: LightPreset;
}
interface Studio {
  id: string;
  title: string;
  brief: string;
  status: Project['status'];
  t0: number;
  tags: string[];
  client: string;
  bg: string;
  ink: string;
  palette: string[];
  cover: string;
  photos: Photo[];
  things: Thing[];
  works: [string, string[], string[], number?][];
  comments: { work: number; version: number; pin: [number, number]; text: string; ageH: number; resolved?: boolean; reply?: string }[];
  story: [string, string][];
  presentation: string[];
  portfolio: string[];
}

/* ───────── STRIDE · sneaker launch ───────── */
const STRIDE: Studio = {
  id: 'stride',
  title: 'STRIDE · Run Club launch',
  brief: 'Launch campaign for a city running shoe: one loud orange, hard sun on concrete, and a product family that reads from across the street.',
  status: 'review',
  t0: Date.UTC(2026, 9, 6, 7, 0),
  tags: ['sportswear', 'campaign', 'product'],
  client: 'Dana L. · Brand lead',
  bg: '#e9e6e1',
  ink: '#1a1716',
  palette: ['#ff5a1f', '#2b2b2e', '#d9d6d0', '#f4f1ec', '#6b7f3a'],
  cover: 'hero',
  photos: [
    { key: 'hero', title: 'Hero · mid-air', note: 'Hard noon sun, concrete wall, the shoe hangs in the air.' },
    { key: 'poster', title: 'Poster · orange on orange', note: 'Tone on tone: the shoe disappears into the backdrop until the shadow draws it.' },
    { key: 'track', title: 'Track at dawn', note: 'The run itself, legs only — the product stays the hero.' },
    { key: 'night', title: 'City stairs at night', note: 'Sodium light on wet concrete — the after-work runner.' },
    { key: 'box', title: 'Box · unboxing', note: 'Charcoal outside, orange inside: the first thing you see is the colour.' },
    { key: 'sole', title: 'Midsole macro', note: 'Foam sculpting under the heel.', ref: { source: 'Factory sample, round 2', influences: ['hero', 'Heel foam reshaped so the hero angle shows the wave.'] } },
    { key: 'knit', title: 'Knit upper', note: 'Engineered knit, orange over grey.', ref: { source: 'Material library' } },
    { key: 'laces', title: 'Flat laces', note: 'Flat laces read better in photos than round ones.', ref: { source: 'Studio test' } },
    { key: 'swatches', title: 'Material swatches', note: 'Mesh, suede, foam, reflective tape.', ref: { source: 'Design studio board', influences: ['box', 'Box interior matched to the orange mesh swatch.'] } },
    { key: 'sketch', title: 'Side profile sketch', note: 'First silhouette, marker on paper.', ref: { source: 'Sketchbook p. 3' } },
  ],
  things: [
    { key: 'runner-orange', title: 'Runner · Signal orange', note: 'The launch colourway.' },
    { key: 'runner-mono', title: 'Runner · Mono', note: 'Black and white for every day.' },
    { key: 'court-high', title: 'Court high-top', note: 'The basketball spin-off.' },
    { key: 'trail', title: 'Trail · Olive', note: 'Chunky lugs for gravel weekends.' },
    { key: 'slide', title: 'Recovery slide', note: 'Post-run foam slide.' },
    { key: 'bottle', title: 'Club bottle', note: 'Run club merch.' },
    { key: 'duffel', title: 'Gym duffel', note: 'Charcoal with an orange pull.' },
    { key: 'cap', title: 'Running cap', note: 'Featherweight, signal orange.' },
    { key: 'box', title: 'Shoebox', note: 'Charcoal box, one orange stripe.' },
    { key: 'sock', title: 'Run sock', note: 'Cream knit, orange heel and toe.' },
  ],
  works: [
    ['Key visual', ['poster', 'hero'], ['Tone-on-tone poster', 'Mid-air on concrete'], 1],
    ['Lifestyle', ['track', 'night'], ['Dawn track', 'Night stairs']],
    ['Packaging', ['box'], ['Charcoal & orange']],
  ],
  comments: [
    { work: 0, version: 0, pin: [0.5, 0.6], text: 'Beautiful, but it whispers. Launch needs to shout — show it in the street.', ageH: 24 * 12, resolved: true, reply: 'v2: mid-air against raw concrete, hard sun.' },
    { work: 1, version: 1, pin: [0.55, 0.62], text: 'Love the night one. Can the shoe catch a bit more light on the toe?', ageH: 9 },
    { work: 2, version: 0, pin: [0.4, 0.35], text: 'The stripe on the lid should line up with the tissue edge.', ageH: 26 },
  ],
  story: [
    ['sketch', 'A silhouette on paper.'],
    ['swatches', 'One orange, chosen against grey concrete.'],
    ['sole', 'Foam that looks fast standing still.'],
    ['hero', 'Launch: the shoe in mid-air.'],
    ['night', 'And after work, the city stairs.'],
  ],
  presentation: ['hero', 'poster', 'track', 'night', 'box'],
  portfolio: ['hero', 'night'],
};

/* ───────── CASA ARCA · boutique hotel ───────── */
const ARCA: Studio = {
  id: 'casa-arca',
  title: 'Casa Arca · Boutique hotel',
  brief: 'Interiors and identity for a twelve-room hotel by the sea: lime-washed arches, terracotta, oak and boucle — furniture chosen piece by piece.',
  status: 'wip',
  t0: Date.UTC(2026, 8, 14, 9, 0),
  tags: ['interiors', 'hospitality', 'architecture'],
  client: 'Yael & Tom · Owners',
  bg: '#ece4d8',
  ink: '#2a1f18',
  palette: ['#b85c38', '#efe6d8', '#c9a46a', '#7a8b5a', '#e7b7a6'],
  cover: 'lobby',
  photos: [
    { key: 'lobby', title: 'Lobby under the arches', note: 'Curved sofa, the olive tree, afternoon light.' },
    { key: 'bedroom', title: 'Sea room', note: 'Linen, oak bench, the arched window.' },
    { key: 'bath', title: 'Pink terrazzo bath', note: 'Terrazzo, brass, one round mirror.' },
    { key: 'pool', title: 'Courtyard pool', note: 'Striped loungers and bougainvillea.' },
    { key: 'restaurant', title: 'Restaurant at night', note: 'Rattan pendants over the green bar.' },
    { key: 'reading', title: 'Reading corner', note: 'Rust velvet chair and a paper lamp.' },
    { key: 'facade', title: 'Street facade', note: 'Blue shutters, olive trees.', ref: { source: 'Site visit, September' } },
    { key: 'materials', title: 'Material board', note: 'Terracotta, travertine, oak, boucle, brass, terrazzo.', ref: { source: 'Studio board', influences: ['lobby', 'Terracotta floor and travertine tables chosen from this board.'] } },
    { key: 'handle', title: 'Brass door handle', note: 'Solid brass on lime-washed oak.', ref: { source: 'Hardware sample' } },
    { key: 'plan', title: 'Plan & arch elevation', note: 'Ground floor, one arch module repeated.', ref: { source: 'Architect’s drawing', influences: ['lobby', 'Lobby arches follow the 2.4 m module from the elevation.'] } },
  ],
  things: [
    { key: 'armchair', title: 'Lounge chair · rust boucle', note: 'For the reading corners.' },
    { key: 'sofa', title: 'Curved sofa module', note: 'Lobby seating, cream boucle.' },
    { key: 'side-table', title: 'Travertine side table', note: 'Pedestal base, one per room.' },
    { key: 'coffee-table', title: 'Oak coffee table', note: 'Thick rounded legs.' },
    { key: 'floor-lamp', title: 'Globe floor lamp', note: 'Paper globe on brass.' },
    { key: 'pendant', title: 'Rattan pendant', note: 'Restaurant lighting.' },
    { key: 'mirror', title: 'Arched mirror', note: 'Brass frame, repeats the arch.' },
    { key: 'olive', title: 'Olive tree', note: 'Terracotta pot for the lobby.' },
    { key: 'stool', title: 'Green ceramic stool', note: 'Bathroom and pool side.' },
    { key: 'bench', title: 'Oak bench', note: 'End of the bed, linen cushion.' },
  ],
  works: [
    ['Lobby', ['lobby'], ['Afternoon']],
    ['Rooms', ['bedroom', 'bath'], ['Sea room', 'Terrazzo bath']],
    ['Outdoors & dining', ['pool', 'restaurant'], ['Pool', 'Restaurant']],
    ['Details', ['reading'], ['Reading corner']],
  ],
  comments: [
    { work: 0, version: 0, pin: [0.3, 0.7], text: 'Can the sofa be a bit lower? It hides the arch base.', ageH: 12 },
    { work: 1, version: 1, pin: [0.5, 0.4], text: 'Terrazzo is perfect. Brass a touch warmer?', ageH: 30 },
    { work: 2, version: 1, pin: [0.5, 0.2], text: 'The pendants are gorgeous — we want them in the lobby too.', ageH: 50 },
  ],
  story: [
    ['facade', 'A white house on a quiet street.'],
    ['plan', 'One arch, repeated through the plan.'],
    ['materials', 'Terracotta, travertine, oak, boucle.'],
    ['lobby', 'The lobby, under the arches.'],
    ['bedroom', 'And every room faces the sea.'],
  ],
  presentation: ['lobby', 'bedroom', 'bath', 'pool', 'restaurant', 'reading'],
  portfolio: ['lobby', 'pool'],
};

/* ───────── RITUAL · coffee roasters ───────── */
const RITUAL: Studio = {
  id: 'ritual',
  title: 'Ritual · Coffee roasters',
  brief: 'Brand and packaging for a small roastery: forest green and cream, morning light, and the tools of a slow cup.',
  status: 'review',
  t0: Date.UTC(2026, 9, 18, 7, 30),
  tags: ['branding', 'packaging', 'food'],
  client: 'Omer S. · Founder',
  bg: '#e8e2d4',
  ink: '#1d2a20',
  palette: ['#1f4d33', '#efe6d2', '#8a5a36', '#c9b08a', '#2a1f18'],
  cover: 'bag',
  photos: [
    { key: 'bag', title: 'Bag · forest green', note: 'Matte pouch, cream label left blank for the roast.' },
    { key: 'poster', title: 'Poster · one cup', note: 'Espresso on deep green, steam only.' },
    { key: 'latte', title: 'Flat white', note: 'Rosetta in a speckled cup.' },
    { key: 'coldbrew', title: 'Cold brew', note: 'Summer line on green tiles.' },
    { key: 'counter', title: 'Café counter', note: 'Green tiles, morning sun.' },
    { key: 'identity', title: 'Identity flat lay', note: 'Stamp, sleeve, swatches.' },
    { key: 'roast', title: 'Roaster, drop', note: 'Beans into the cooling tray.', ref: { source: 'Roastery visit' } },
    { key: 'pour', title: 'Pour-over bloom', note: 'Thirty seconds of bloom.', ref: { source: 'Barista session', influences: ['poster', 'The poster keeps only the steam from this moment.'] } },
    { key: 'beans', title: 'Beans macro', note: 'Medium roast, oily sheen.', ref: { source: 'Studio macro', influences: ['bag', 'Bag green chosen to sit against this brown.'] } },
    { key: 'window', title: 'Morning window', note: 'Cup, linen, plant shadow.', ref: { source: 'Mood reference' } },
  ],
  things: [
    { key: 'bag', title: 'Coffee bag', note: 'Stand-up pouch, forest green.' },
    { key: 'takeaway', title: 'Takeaway cup', note: 'Cream paper, green lid.' },
    { key: 'cup', title: 'Speckled cup & saucer', note: 'In-house ceramic.' },
    { key: 'dripper', title: 'Pour-over dripper', note: 'White ceramic cone.' },
    { key: 'grinder', title: 'Hand grinder', note: 'Walnut and steel.' },
    { key: 'coldbrew', title: 'Cold brew bottle', note: 'Green cap.' },
    { key: 'moka', title: 'Moka pot', note: 'For the home kit.' },
    { key: 'tin', title: 'Storage tin', note: 'Matte green.' },
    { key: 'kettle', title: 'Gooseneck kettle', note: 'Matte black.' },
    { key: 'espresso', title: 'Home espresso machine', note: 'Cream and steel.' },
  ],
  works: [
    ['Packaging', ['bag'], ['Forest green pouch'], 0],
    ['Campaign', ['latte', 'poster'], ['Flat white', 'One cup on green']],
    ['Summer line', ['coldbrew'], ['Cold brew']],
    ['Identity', ['identity', 'counter'], ['Flat lay', 'In the café']],
  ],
  comments: [
    { work: 1, version: 0, pin: [0.5, 0.45], text: 'Pretty, but every café has a rosetta. What’s ours?', ageH: 24 * 6, resolved: true, reply: 'v2: one cup on our green, nothing else.' },
    { work: 1, version: 1, pin: [0.45, 0.25], text: 'Steam could rise a little higher into the empty space.', ageH: 11 },
    { work: 2, version: 0, pin: [0.4, 0.5], text: 'Can the cap match the bag green exactly?', ageH: 20 },
  ],
  story: [
    ['roast', 'It starts at the roaster.'],
    ['beans', 'A brown we could build a brand on.'],
    ['bag', 'The bag: forest green, nothing shouting.'],
    ['poster', 'One cup on green.'],
    ['counter', 'And a counter to drink it at.'],
  ],
  presentation: ['bag', 'poster', 'latte', 'coldbrew', 'counter', 'identity'],
  portfolio: ['bag', 'poster'],
};

/* ───────── HALO · audio ───────── */
const HALO: Studio = {
  id: 'halo',
  title: 'HALO · Audio launch',
  brief: 'Launch of a headphone line and its family: sage aluminium, cream fabric, warm light — tech that looks at home.',
  status: 'approved',
  t0: Date.UTC(2026, 8, 2, 10, 0),
  tags: ['tech', 'product', 'launch'],
  client: 'Halo Audio · Marketing',
  bg: '#e3e6df',
  ink: '#1b201c',
  palette: ['#8fa58c', '#efe8db', '#2b2d2b', '#b8673f', '#c9cfc3'],
  cover: 'hero',
  photos: [
    { key: 'hero', title: 'Hero · floating', note: 'Sage aluminium on a sage gradient.' },
    { key: 'launch', title: 'Launch · on vinyl', note: 'Warm, cinematic, space for the headline.' },
    { key: 'rooftop', title: 'Rooftop, golden hour', note: 'Worn, not posed.' },
    { key: 'desk', title: 'Desk setup', note: 'On the walnut stand.' },
    { key: 'colorways', title: 'Four colourways', note: 'Sage, cream, charcoal, terracotta.' },
    { key: 'unbox', title: 'Unboxing', note: 'Moulded pulp, no plastic.' },
    { key: 'buds', title: 'Earbuds', note: 'Case open, buds in sage.' },
    { key: 'cushion', title: 'Cushion macro', note: 'Knit over memory foam.', ref: { source: 'Engineering sample' } },
    { key: 'alu', title: 'Bead-blasted aluminium', note: 'The sage finish.', ref: { source: 'Finish sample', influences: ['hero', 'The hero gradient is sampled from this finish.'] } },
    { key: 'sketch', title: 'Marker sketches', note: 'First views, sage marker.', ref: { source: 'ID sketchbook' } },
  ],
  things: [
    { key: 'headphones', title: 'Over-ear headphones', note: 'The flagship.' },
    { key: 'case', title: 'Earbuds case', note: 'Cream pebble.' },
    { key: 'earbud', title: 'Earbud', note: 'Sage, stem design.' },
    { key: 'speaker', title: 'Portable speaker', note: 'Sage fabric cylinder.' },
    { key: 'bookshelf', title: 'Bookshelf speaker', note: 'Walnut, cream grille.' },
    { key: 'turntable', title: 'Turntable', note: 'Walnut and aluminium.' },
    { key: 'mic', title: 'Studio mic', note: 'For the creator bundle.' },
    { key: 'stand', title: 'Headphone stand', note: 'Walnut arm.' },
    { key: 'dock', title: 'Charging dock', note: 'Cream puck, sage ring.' },
    { key: 'radio', title: 'Portable radio', note: 'Retro edition.' },
  ],
  works: [
    ['Key visual', ['hero', 'launch'], ['Floating', 'On vinyl']],
    ['Lifestyle', ['rooftop', 'desk'], ['Rooftop', 'Desk']],
    ['Range', ['colorways', 'buds'], ['Colourways', 'Earbuds']],
    ['Packaging', ['unbox'], ['Moulded pulp']],
  ],
  comments: [
    { work: 0, version: 0, pin: [0.5, 0.5], text: 'Clean, but cold. Can we feel music?', ageH: 24 * 40, resolved: true, reply: 'v2 on a stack of records, warm light.' },
    { work: 2, version: 0, pin: [0.85, 0.5], text: 'Terracotta stays in the range. Approved.', ageH: 24 * 30, resolved: true },
  ],
  story: [
    ['sketch', 'Sketches first.'],
    ['alu', 'Then the finish: bead-blasted sage.'],
    ['hero', 'The flagship.'],
    ['colorways', 'In four colours.'],
    ['launch', 'Launched on vinyl.'],
  ],
  presentation: ['hero', 'launch', 'rooftop', 'desk', 'colorways', 'unbox'],
  portfolio: ['hero', 'launch'],
};

export const STUDIOS: Studio[] = [STRIDE, ARCA, RITUAL, HALO];
export const STUDIO_IDS = STUDIOS.map((s) => s.id);
export const STUDIO_REV = 1;

const PW = 896;
const PH = 1120;

export function studioProject(id: string, now = Date.now()): Project {
  const s = STUDIOS.find((x) => x.id === id)!;
  const base = `/projects/${s.id}/`;
  const aid = (k: string) => `${s.id}-${k}`;
  const at = (k: string) => s.t0 + Math.max(0, s.photos.findIndex((p) => p.key === k)) * 0.6 * day;

  const photos: Asset[] = s.photos.map((p) => ({
    id: aid(p.key),
    kind: 'image',
    title: p.title,
    src: `${base}${p.key}.webp`,
    thumb: `${base}${p.key}-sm.webp`,
    w: PW,
    h: PH,
    createdAt: at(p.key),
    isReference: !!p.ref,
    note: p.note,
    source: p.ref?.source,
    influences: p.ref?.influences ? { assetId: aid(p.ref.influences[0]), text: p.ref.influences[1] } : undefined,
    tags: s.tags.slice(0, 2),
  }));
  const models: Asset[] = s.things.map((o, i) => ({
    id: `${s.id}-glb-${o.key}`,
    kind: 'model',
    title: `${o.title}.glb`,
    src: `${base}obj/${o.key}.glb`,
    thumb: `${base}obj/${o.key}.webp`,
    w: 640,
    h: 640,
    createdAt: s.t0 + (i + 2) * 0.5 * day,
    isReference: false,
    source: 'Generated from a product shot',
    tags: ['3d', s.tags[0]],
  }));

  const objects: StudioObject[] = s.things.map((o, i) => ({
    id: `${s.id}-o-${o.key}`,
    title: o.title,
    source: { kind: 'model', assetId: `${s.id}-glb-${o.key}` },
    variants: [{ id: `${s.id}-${o.key}-mv`, name: 'As modelled', base: 'clay', baseColor: s.palette[1], topColor: s.palette[0], blend: 0.5, softness: 0.3, roughness: 0.5, gloss: 0.2 }],
    variantId: `${s.id}-${o.key}-mv`,
    light: { preset: o.light ?? (['softbox', 'window', 'morning', 'gallery'] as LightPreset[])[i % 4], angle: -35 + (i % 3) * 30, intensity: 1 },
    camera: { lens: 70 },
    background: { kind: 'studio', color: s.bg },
    turntable: { seconds: 14 },
    stage: i % 4 === 1 ? 'plinth' : 'none',
    thumb: `${base}obj/${o.key}.webp`,
    note: o.note,
    createdAt: s.t0 + (i + 2) * 0.5 * day,
    updatedAt: now - (10 - i) * 3600000,
  }));

  const works: Work[] = s.works.map(([title, keys, labels, approved], wi) => ({
    id: `${s.id}-w${wi}`,
    title,
    kind: 'image',
    createdAt: at(keys[0]),
    status: approved !== undefined || s.status === 'approved' ? 'done' : wi === 0 ? 'client' : 'doing',
    versions: keys.map((k, n) => ({ id: `${s.id}-w${wi}-v${n + 1}`, n: n + 1, assetId: aid(k), createdAt: at(k) + n * 3600000, label: labels[n] })),
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

  const moodboard: MoodItem[] = s.photos.map((p, i) => {
    const row = i < 5 ? 0 : 1;
    const col = i % 5;
    return { id: `${s.id}-m${i}`, assetId: aid(p.key), x: 0.02 + col * 0.195 + (row ? 0.04 : 0), y: row ? 0.5 : 0.03 + (col % 2) * 0.05, w: col % 2 ? 0.16 : 0.18, z: i + 1, rot: [-2, 1.5, 0, -1, 2][col] * (row ? -1 : 1) };
  });

  const [a, b] = s.presentation;
  const layers: BoardLayer[] = [
    { id: 'l-bg', kind: 'rect', x: 0, y: 0, w: 1600, h: 1000, fill: s.bg },
    { id: 'l-a', kind: 'image', assetId: aid(a), x: 60, y: 60, w: 704, h: 880, fit: 'cover', radius: 10 },
    { id: 'l-b', kind: 'image', assetId: aid(b), x: 800, y: 380, w: 352, h: 440, fit: 'cover', radius: 10 },
    { id: 'l-c', kind: 'object', objectId: objects[0].id, x: 1188, y: 380, w: 352, h: 440, fit: 'contain', radius: 10 },
    { id: 'l-t', kind: 'text', text: s.title, x: 800, y: 70, w: 740, h: 150, size: 60, weight: 700, color: s.ink, align: 'start' },
    { id: 'l-p', kind: 'palette', x: 800, y: 870, w: 740, h: 70, colors: s.palette },
  ];

  return {
    id: s.id,
    title: s.title,
    brief: s.brief,
    kind: 'demo',
    seedRev: STUDIO_REV,
    status: s.status,
    createdAt: s.t0,
    updatedAt: now - (STUDIO_IDS.indexOf(s.id) + 1) * 2 * 3600000,
    coverAssetId: aid(s.cover),
    assets: [...photos, ...models],
    works,
    comments,
    moodboard,
    story: s.story.map(([k, caption], i) => ({ id: `${s.id}-s${i}`, assetId: aid(k), caption })),
    objects,
    boards: [{ id: `${s.id}-b0`, title: `${s.title} — cover`, w: 1600, h: 1000, bg: s.bg, layers, createdAt: s.t0 + 5 * day, updatedAt: now - day }],
    presentation: s.presentation.map(aid),
    portfolio: s.portfolio.map(aid),
    palette: s.palette,
    tags: s.tags,
  };
}
