import { Project } from './types';

/**
 * FORM / 01 — demo project. An identity built around one sculptural object.
 * One vessel — travertine base, terracotta satin lip — in clay, lacquer (v1) and satin (v2).
 * Renders, references and the turntable were generated for the demo (Higgsfield) and live in public/projects/form-01.
 */
const P = '/projects/form-01/';
const img = (name: string) => ({ src: `${P}${name}.webp`, thumb: `${P}${name}-sm.webp` });
const day = 86400000;
const T0 = Date.UTC(2026, 10, 2, 9, 30);

export const DEMO_ID = 'form-01';
/** bump when the demo's files or copy change: open browsers refresh the demo's text on next load */
export const DEMO_REV = 2;

export function demoProject(now = Date.now()): Project {
  return {
    id: DEMO_ID,
    title: 'FORM / 01',
    brief: 'Object identity for a ceramics studio: one sculptural form carries the poster, the motion loop and the launch story.',
    kind: 'demo',
    seedRev: DEMO_REV,
    status: 'review',
    createdAt: T0,
    updatedAt: now - 2 * 3600000,
    coverAssetId: 'poster',
    assets: [
      { id: 'poster', kind: 'image', title: 'Launch poster', ...img('form-poster'), w: 1600, h: 2000, createdAt: T0 + 5 * day, isReference: false },
      { id: 'render-v2', kind: 'image', title: 'Hero render · satin glaze', ...img('form-v2'), w: 1600, h: 2000, createdAt: T0 + 4 * day, isReference: false },
      { id: 'render-v1', kind: 'image', title: 'Hero render · lacquer', ...img('form-v1'), w: 1600, h: 2000, createdAt: T0 + 2 * day, isReference: false },
      { id: 'clay', kind: 'image', title: 'Form study · clay', ...img('form-clay'), w: 1600, h: 2000, createdAt: T0 + day, isReference: false },
      {
        id: 'loop',
        kind: 'video',
        title: 'Turntable loop',
        src: `${P}form-loop.mp4`,
        thumb: `${P}form-loop-poster.webp`,
        w: 720,
        h: 900,
        duration: 8,
        createdAt: T0 + 5 * day,
        isReference: false,
      },
      {
        id: 'ref-sketch',
        kind: 'image',
        title: 'Sketchbook, twist studies',
        ...img('ref-sketch'),
        w: 1792,
        h: 2240,
        createdAt: T0,
        isReference: true,
        source: 'Own sketchbook, p. 14',
        note: 'Rounded square, 225° of twist. Anything more starts to read as a screw.',
        influences: { assetId: 'clay', text: 'Fixed the cross-section and the 225° twist of the form study.' },
      },
      {
        id: 'ref-silk',
        kind: 'image',
        title: 'Silk ribbon, one turn',
        ...img('ref-silk'),
        w: 1792,
        h: 2240,
        createdAt: T0,
        isReference: true,
        source: 'Studio test shoot',
        note: 'The twist should feel like fabric, not like a machined part.',
        influences: { assetId: 'clay', text: 'Softened the edges of the twist so it folds instead of cuts.' },
      },
      {
        id: 'ref-hotspot',
        kind: 'image',
        title: 'Lacquer under a hard spot',
        ...img('ref-hotspot'),
        w: 1792,
        h: 2240,
        createdAt: T0 + 2 * day,
        isReference: true,
        source: 'Lighting test, v1 setup',
        note: 'What a small hard key does to gloss: the highlight clips and the form disappears.',
        influences: { assetId: 'render-v1', text: 'Same light as v1: the clipped highlight that triggered the review note.' },
      },
      {
        id: 'ref-glaze',
        kind: 'image',
        title: 'Terracotta glaze, satin',
        ...img('ref-glaze'),
        w: 1792,
        h: 2240,
        createdAt: T0 + 3 * day,
        isReference: true,
        source: 'Client sample box',
        note: 'Their real glaze. Satin, darker where it pools in the grooves, never mirrors.',
        influences: { assetId: 'render-v2', text: 'Lacquer → satin glaze. Roughness 0.06 → 0.30, the highlight spreads instead of clipping.' },
      },
      {
        id: 'ref-window',
        kind: 'image',
        title: 'North window, morning',
        ...img('ref-window'),
        w: 1792,
        h: 2240,
        createdAt: T0 + 3 * day,
        isReference: true,
        source: 'Studio, 08:40',
        note: 'One big soft source and a clean shadow edge.',
        influences: { assetId: 'render-v2', text: 'Small hard spot → one broad soft key from the left, warm bounce under.' },
      },
      {
        id: 'ref-travertine',
        kind: 'image',
        title: 'Travertine plinth',
        ...img('ref-travertine'),
        w: 1792,
        h: 2240,
        createdAt: T0 + 4 * day,
        isReference: true,
        source: 'Showroom visit',
        note: 'Warm stone with open pores — the base should feel quarried, not cast.',
        influences: { assetId: 'render-v2', text: 'Travertine for the lower half of the vessel; the glaze fades into the stone toward the base.' },
      },
    ],
    works: [
      {
        id: 'hero-render',
        title: 'Hero render',
        kind: 'image',
        createdAt: T0 + 2 * day,
        versions: [
          { id: 'hero-v1', n: 1, assetId: 'render-v1', createdAt: T0 + 2 * day, label: 'Lacquer, hard key' },
          { id: 'hero-v2', n: 2, assetId: 'render-v2', createdAt: T0 + 4 * day, label: 'Satin glaze, soft key' },
        ],
        approvedVersionId: 'hero-v2',
      },
      {
        id: 'poster-work',
        title: 'Launch poster',
        kind: 'image',
        createdAt: T0 + 5 * day,
        versions: [{ id: 'poster-v1', n: 1, assetId: 'poster', createdAt: T0 + 5 * day, label: 'Layout A' }],
      },
      {
        id: 'turntable',
        title: 'Turntable loop',
        kind: 'video',
        createdAt: T0 + 5 * day,
        versions: [{ id: 'loop-v1', n: 1, assetId: 'loop', createdAt: T0 + 5 * day, label: '8 s, 30 fps' }],
      },
    ],
    comments: [
      {
        id: 'c-highlight',
        workId: 'hero-render',
        versionId: 'hero-v1',
        pin: { x: 0.585, y: 0.27 },
        text: 'The highlight blows out on the upper twist — we lose the edge right where the form turns. Try one big soft key instead of the spot.',
        author: 'Mara K. · AD',
        createdAt: T0 + 3 * day,
        resolved: true,
        resolvedAt: T0 + 4 * day,
        replies: [{ id: 'r1', text: 'Fixed in v2: satin glaze + softbox from the left.', author: 'You', createdAt: T0 + 4 * day }],
      },
      {
        id: 'c-shadow',
        workId: 'hero-render',
        versionId: 'hero-v2',
        pin: { x: 0.635, y: 0.6 },
        text: 'Shadow side could go one stop deeper here — the mass is a bit polite.',
        author: 'Mara K. · AD',
        createdAt: now - 5 * 3600000,
        resolved: false,
        replies: [],
      },
      {
        id: 'c-kerning',
        workId: 'poster-work',
        versionId: 'poster-v1',
        pin: { x: 0.215, y: 0.14 },
        text: 'Tighten F–O, the word should sit as one block behind the object.',
        author: 'Mara K. · AD',
        createdAt: now - 3 * 3600000,
        resolved: false,
        replies: [],
      },
      {
        id: 'c-speed',
        workId: 'turntable',
        versionId: 'loop-v1',
        t: 3.2,
        text: 'Around here the twist passes the camera too fast. Slow this half by ~20%.',
        author: 'Mara K. · AD',
        createdAt: now - 26 * 3600000,
        resolved: false,
        replies: [],
      },
    ],
    moodboard: [
      { id: 'm1', assetId: 'ref-sketch', x: 0.03, y: 0.06, w: 0.2, z: 1, rot: -2 },
      { id: 'm2', assetId: 'ref-silk', x: 0.25, y: 0.03, w: 0.17, z: 2, rot: 1.5 },
      { id: 'm3', assetId: 'clay', x: 0.45, y: 0.08, w: 0.15, z: 3, rot: 0 },
      { id: 'm4', assetId: 'ref-glaze', x: 0.63, y: 0.04, w: 0.16, z: 4, rot: -1 },
      { id: 'm5', assetId: 'ref-window', x: 0.81, y: 0.1, w: 0.16, z: 5, rot: 2 },
      { id: 'm6', assetId: 'ref-travertine', x: 0.08, y: 0.5, w: 0.16, z: 6, rot: 1 },
      { id: 'm7', assetId: 'render-v2', x: 0.4, y: 0.42, w: 0.2, z: 7, rot: 0 },
      { id: 'm8', assetId: 'ref-hotspot', x: 0.66, y: 0.5, w: 0.14, z: 8, rot: -2.5 },
    ],
    story: [
      { id: 's1', assetId: 'ref-sketch', caption: 'It started as a twist on paper.' },
      { id: 's2', assetId: 'clay', caption: 'Form first: 225°, rounded square, no material.' },
      { id: 's3', assetId: 'render-v1', caption: 'v1: lacquer under a hard spot. The highlight ate the edge.' },
      { id: 's4', assetId: 'render-v2', caption: 'v2: satin glaze, one soft key. Approved.' },
      { id: 's5', assetId: 'poster', caption: 'FORM / 01 — launch poster.' },
    ],
    presentation: ['poster', 'render-v2', 'loop', 'clay'],
    portfolio: ['poster'],
  };
}

/** After Hours / Tel Aviv — the stage-1 photo story, now an ordinary project. */
export const AH_ID = 'after-hours';
const AH = '/series/after-hours/';
const AH_FRAMES: [string, string, number, number, string, string][] = [
  ['kiosk', 'The kiosk', 1792, 2240, 'Central Tel Aviv · 02:10', 'The only light on the block that is still awake.'],
  ['shutters', 'Shutters down', 1744, 2336, 'Allenby · 02:35', 'The street folds itself away until morning.'],
  ['promenade', 'Promenade', 2048, 1360, 'Tayelet · 03:05', 'Lamps keep watch over an empty seafront.'],
  ['reflections', 'Reflections', 1792, 2240, 'Florentin · 03:30', 'After the rain, every sign reads upside down.'],
  ['balcony', 'One window', 1744, 2336, 'White City · 03:50', 'One window is still arguing with the dark.'],
  ['bus-stop', 'Night bus', 2048, 1360, 'Ibn Gabirol · 04:20', 'Last passenger of the night, first of the shift.'],
  ['dawn', 'First light', 1792, 2240, 'Jaffa · 05:40', 'Jaffa switches the lamps off, one by one.'],
];

export function afterHoursProject(now = Date.now()): Project {
  const T = Date.UTC(2026, 9, 30, 2, 10);
  const story = (() => {
    try {
      const s = JSON.parse(localStorage.getItem('frantos2_demo_story_v1') ?? 'null');
      if (s?.story?.length) return s.story as string[];
    } catch {
      /* ignore */
    }
    return ['kiosk', 'shutters', 'promenade', 'reflections', 'dawn'];
  })();
  return {
    id: AH_ID,
    title: 'After Hours / Tel Aviv',
    brief: 'A city diary after closing time: shutters down, the kiosk light, a seafront under lamps. Seven frames, one night.',
    kind: 'demo',
    status: 'approved',
    createdAt: T,
    updatedAt: now - 3 * 86400000,
    coverAssetId: 'ah-kiosk',
    assets: AH_FRAMES.map(([id, title, w, h, place], i) => ({
      id: `ah-${id}`,
      kind: 'image' as const,
      title,
      src: `${AH}${id}.webp`,
      thumb: `${AH}${id}-sm.webp`,
      w,
      h,
      createdAt: T + i * 600000,
      isReference: false,
      tags: ['night', 'street', place.split(' · ')[0].toLowerCase()],
      note: place,
    })),
    works: AH_FRAMES.map(([id, title], i) => ({
      id: `ahw-${id}`,
      title,
      kind: 'image' as const,
      createdAt: T + i * 600000,
      versions: [{ id: `ahv-${id}`, n: 1, assetId: `ah-${id}`, createdAt: T + i * 600000, label: AH_FRAMES[i][4] }],
      approvedVersionId: `ahv-${id}`,
    })),
    comments: [],
    moodboard: AH_FRAMES.map(([id], i) => ({ id: `ahm-${id}`, assetId: `ah-${id}`, x: 0.03 + (i % 4) * 0.24, y: 0.05 + Math.floor(i / 4) * 0.48, w: 0.2, z: i + 1, rot: ((i % 3) - 1) * 1.2 })),
    story: story.map((id) => ({ id: `ahs-${id}`, assetId: `ah-${id}`, caption: AH_FRAMES.find((f) => f[0] === id)?.[5] })),
    presentation: story.map((id) => `ah-${id}`),
    portfolio: ['ah-kiosk', 'ah-dawn'],
    tags: ['photo', 'series'],
  };
}
