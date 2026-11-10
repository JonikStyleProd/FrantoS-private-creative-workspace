import type { SiteCollection, SiteComponent, SiteNode, SitePage } from '../ws/types';
import { dsl } from './blocks';
import { autoMotion } from './motion';

/**
 * Pages built in the constructor for two demos: the Halden shop and the Saltwater journal.
 * Written in English; the app shows them in the visitor's language (see useSiteTr).
 */
const { N, S, G, H, T, B, M, SEC } = dsl;
type Page = Omit<SitePage, 'createdAt' | 'updatedAt'>;

/** Halden's product card is a component: four copies with their own names, prices and pictures; the sofa uses the "Sale" variant */
export function haldenComponents(aid: (key: string) => string): SiteComponent[] {
  const card = (sale: boolean): SiteNode => ({
    id: 'pc-root',
    type: 'stack',
    name: 'Product card',
    s: { gap: '3' },
    hover: { lift: 4, dur: 300, ease: 'frantos' },
    children: [
      { id: 'pc-img', type: 'media', assetId: aid('chair'), alt: 'Ask chair', s: { ratio: '4/5', radius: 'md' }, hover: { scale: 1.02, bright: true, dur: 500, ease: 'expo-out' } },
      { id: 'pc-row', type: 'stack', name: 'Name and price', s: { dir: 'row', justify: 'between', gap: '2' }, children: [{ id: 'pc-name', type: 'text', text: 'Ask chair', s: { weight: 700 } }, { id: 'pc-price', type: 'text', text: '€640', s: { color: sale ? 'accent' : 'muted', weight: sale ? 700 : undefined } }] },
      ...(sale ? [{ id: 'pc-tag', type: 'text' as const, text: '−20% this week', s: { size: 'xs' as const, weight: 700 as const, color: 'accent' } }] : []),
    ],
  });
  return [{ id: 'cmp-halden-card', name: 'Product card', createdAt: 0, variants: [{ id: 'var-card', name: 'Default', node: card(false) }, { id: 'var-sale', name: 'Sale', node: card(true) }] }];
}

export function haldenPages(aid: (key: string) => string): Page[] {
  return [
    {
      id: 'halden-pg-home',
      title: 'Halden · Home',
      slug: 'halden-home',
      dir: 'ltr',
      theme: { bg: '#f4f0ea', surface: '#e8e0d4', text: '#1d1b18', muted: '#6f675e', accent: '#b8875a', onAccent: '#1d1b18', line: '#d9d1c6', heading: 'instrument-serif', body: 'manrope', round: 'soft' },
      root: [
        SEC('Header', { py: '4', dir: 'row', justify: 'between', align: 'center', maxW: 'wide', wrap: false }, [
          T('Halden', { font: 'heading', size: '2xl' }, { name: 'Logo' }),
          S({ dir: 'row', gap: '6', align: 'center' }, [B('Furniture', 'link', {}, { sm: { hide: true } }), B('Workshop', 'link', {}, { sm: { hide: true } }), B('Repairs', 'link', {}, { sm: { hide: true } }), B('Visit us', 'solid', { radius: 'pill' })], { name: 'Navigation' }),
        ], { tag: 'header' }),
        SEC('Hero', { py: '12' }, [
          G(2, { align: 'center', gap: '12' }, [
            S({ gap: '6', align: 'start' }, [
              T('Copenhagen workshop since 1987', { size: 'sm', weight: 700, color: 'accent' }, { name: 'Eyebrow' }),
              H('Oak, made slowly', 1, { size: '5xl' }),
              T('Chairs, lamps and shelves built by six people in one workshop, and repaired by them for as long as you own them.', { size: 'lg', color: 'muted', maxW: 'text' }),
              S({ dir: 'row', gap: '3', wrap: true }, [B('See the furniture', 'solid', { radius: 'pill' }), B('Book a Saturday tour', 'outline', { radius: 'pill' })], { name: 'Buttons' }),
            ]),
            M(aid('room'), '4/3', { radius: 'lg' }, { alt: 'A living room with the Ask chair and the Fold lamp', depth: 0.06 }),
          ], { md: { cols: 1 } }),
        ]),
        SEC('Products', { gap: '8' }, [
          S({ dir: 'row', justify: 'between', align: 'end', wrap: true, gap: '4' }, [H('New this autumn', 2), B('All furniture', 'link')], { name: 'Title' }),
          G(4, { gap: '6' }, (
            [
              ['chair', 'Ask chair', '€640'],
              ['lamp', 'Fold lamp', '€280'],
              ['sofa', 'Dune sofa', '€2 900'],
              ['shelf', 'Ledge shelf', '€219'],
            ] as const
          ).map(([k, name, price]): SiteNode => ({ id: `halden-card-${k}`, type: 'instance', comp: 'cmp-halden-card', variant: k === 'sofa' ? 'var-sale' : 'var-card', name, over: { 'pc-img': { assetId: aid(k), alt: name }, 'pc-name': { text: name }, 'pc-price': { text: k === 'sofa' ? '€2 320' : price } } })), { md: { cols: 2 } }),
        ]),
        SEC('Workshop', { bg: 'surface', py: '16' }, [
          G(2, { align: 'center', gap: '12' }, [
            M(aid('workshop'), '4/5', { radius: 'lg' }, { alt: 'Oak shavings on the workshop bench', depth: 0.1 }),
            S({ gap: '6', align: 'start' }, [
              T('The workshop', { size: 'sm', weight: 700, color: 'accent' }, { name: 'Eyebrow' }),
              H('Every piece is repaired for life', 2, { size: '3xl' }),
              T('Bring it back in ten years or in forty: we sand it, oil it and weave the seat again at the bench where it was made.', { size: 'lg', color: 'muted' }),
              B('How repairs work', 'outline', { radius: 'pill' }),
            ]),
          ], { md: { cols: 1 } }),
        ]),
        SEC('Quote', { text: 'center', align: 'center', maxW: 'text', py: '24' }, [
          H('“We bought the Ask chair for our first flat. Twenty years later it went back to the workshop and came home like new.”', 2, { size: '3xl', italic: true }),
          T('Maria · Aarhus', { size: 'sm', color: 'muted', weight: 700 }, { name: 'Who said it' }),
        ]),
        SEC('Call to action', { bg: 'text', color: 'bg', align: 'center', text: 'center', maxW: 'text', py: '16' }, [H('Saturday tours, 10 to 2', 2, { size: '3xl' }), T('See the bench, smell the oak, sit on everything.', { color: 'line' }), B('Book a place', 'solid', { radius: 'pill' })]),
        SEC('Footer', { py: '12', gap: '8' }, [
          G(3, { gap: '8' }, [
            S({ gap: '2' }, [T('Halden', { font: 'heading', size: 'xl' }, { name: 'Logo' }), T('Oak furniture from Copenhagen. Free repairs for life on every piece.', { size: 'sm', color: 'muted' })]),
            S({ gap: '2' }, [B('Furniture', 'link'), B('Workshop', 'link'), B('Repairs', 'link')], { name: 'Links' }),
            S({ gap: '2' }, [T('hello@halden.example', { size: 'sm' }), T('Refshalevej 163, Copenhagen', { size: 'sm', color: 'muted' })], { name: 'Contacts' }),
          ], { sm: { cols: 1 } }),
          N('divider'),
          T('© 2026 Halden · Built in FrantoS', { size: 'xs', color: 'muted' }, { name: 'Small print' }),
        ], { tag: 'footer' }),
      ],
    },
  ];
}

/** a square post for Halden, made on an artboard: it plays and exports as MP4, GIF or Lottie */
export function haldenPost(aid: (key: string) => string): Page {
  const A = (enter: import('../ws/types').SiteAnim['enter'], delay: number, x: object = {}) => ({ enter, trigger: 'load' as const, dur: enter === 'words' ? 800 : enter === 'mask' ? 1200 : 900, delay, ease: enter === 'mask' || enter === 'zoom' ? 'expo-out' : 'frantos', ...(enter === 'words' ? { stagger: 90 } : {}), ...(enter === 'rise' ? { dist: 30 } : {}), ...x });
  return {
    id: 'halden-pg-post',
    title: 'Halden · Autumn post',
    slug: 'autumn-post',
    dir: 'ltr',
    board: { w: 1080, h: 1080, hold: 1400, fps: 30, loop: true },
    theme: { bg: '#f4f0ea', surface: '#e8e0d4', text: '#1d1b18', muted: '#6f675e', accent: '#b8875a', onAccent: '#1d1b18', line: '#d9d1c6', heading: 'instrument-serif', body: 'manrope', round: 'soft' },
    root: [
      SEC('Frame', { minH: 'screen', gap: '4', px: '12', py: '12' }, [
        M(aid('chair'), '16/9', { radius: 'lg' }, { alt: 'Ask chair', anim: A('mask', 0) }),
        T('New this autumn', { size: 'sm', weight: 700, color: 'muted' }, { name: 'Eyebrow', anim: A('fade', 700, { dur: 600 }) }),
        S({ dir: 'row', justify: 'between', align: 'end', gap: '4', wrap: true }, [H('The Ask chair', 1, { size: '3xl' }, { anim: A('words', 850) }), T('€640', { size: 'xl', weight: 700 }, { name: 'Price', anim: A('count', 1300, { dur: 1100 }) })], { name: 'Name and price' }),
        T('Oak and paper cord, made to order in six weeks.', { size: 'md', color: 'muted' }, { anim: A('rise', 1700) }),
      ]),
    ],
  };
}

export const SALT_JOURNAL = 'col-saltwater-journal';
const LOAF_BODY = ['Lea starts the dough at four in the afternoon. Flour, water, the starter we have kept alive since 2019, and nothing else. Then it waits.', 'Overnight the cold slows everything down. The dough gets its sour, the crumb opens, and by morning it is ready for the oven at six.', 'Sam brings the salt in a bucket from the works on the pier. A pinch goes on top just before baking: that is the crunch you hear when you break the loaf.'].join('\n\n');
export const SALT_BODIES = {
  loaf: LOAF_BODY,
  bag: 'We tried printed boxes first. Then plain kraft bags with one round sticker: it costs less than a cent, and a Saltwater bag under an arm is easy to spot on the street.',
  shop: 'Mira painted the sign over three days in September. The wordmark was traced from the logo file onto the board, then filled in by hand, letter by letter.',
};
/** the Saltwater journal as a collection: the Journal page lists it, the entry page shows one entry at a time */
export function saltwaterCollections(aid: (key: string) => string): SiteCollection[] {
  return [
    {
      id: SALT_JOURNAL,
      name: 'Journal',
      entries: [
        { id: 'e-loaf', slug: 'two-days-for-one-loaf', title: 'Two days for one loaf', date: '14 October · 5 min read', excerpt: 'Why the dough rests overnight, and what the sea salt does to the crust.', body: SALT_BODIES.loaf, cover: aid('loaf') },
        { id: 'e-bag', slug: 'one-sticker-on-a-kraft-bag', title: 'One sticker on a kraft bag', date: '2 October · 3 min read', excerpt: 'The cheapest packaging we could find, and the easiest to spot on the street.', body: SALT_BODIES.bag, cover: aid('bag') },
        { id: 'e-shop', slug: 'painting-the-sign-by-hand', title: 'Painting the sign by hand', date: '21 September · 4 min read', excerpt: 'Three days on a ladder with a brush, a level and the wordmark.', body: SALT_BODIES.shop, cover: aid('shop') },
      ],
    },
  ];
}

export function saltwaterPages(aid: (key: string) => string): Page[] {
  const theme = { bg: '#f3eee4', surface: '#ebe3d4', text: '#1d2b44', muted: '#5d6a7c', accent: '#b0603a', onAccent: '#ffffff', line: '#d8d0c2', heading: 'instrument-serif', body: 'manrope', round: 'soft' } as const;
  const header = () =>
    SEC('Header', { py: '4', dir: 'row', justify: 'between', align: 'center', maxW: 'wide', wrap: false }, [
      T('Saltwater', { font: 'heading', size: '2xl', italic: true }, { name: 'Logo' }),
      S({ dir: 'row', gap: '6', align: 'center' }, [B('Bread', 'link', {}, { sm: { hide: true } }), B('Café', 'link', {}, { sm: { hide: true } }), B('Journal', 'link', {}, { sm: { hide: true } }), B('Order for Saturday', 'solid', { radius: 'pill' })], { name: 'Navigation' }),
    ], { tag: 'header' });
  const footer = () =>
    SEC('Footer', { bg: 'text', color: 'bg', py: '12', gap: '6' }, [
      G(3, { gap: '8' }, [
        S({ gap: '2' }, [T('Saltwater', { font: 'heading', size: 'xl', italic: true }, { name: 'Logo' }), T('Bread from the harbour · open 7 to 2', { size: 'sm' })]),
        S({ gap: '2' }, [B('Bread', 'link'), B('Café', 'link'), B('Journal', 'link')], { name: 'Links' }),
        S({ gap: '2' }, [T('Harbour front 4', { size: 'sm' }), T('hello@saltwater.example', { size: 'sm' })], { name: 'Contacts' }),
      ], { sm: { cols: 1 } }),
    ], { tag: 'footer' });
  const posts: [string, string, string, string][] = [
    ['loaf', 'Two days for one loaf', '14 October · 5 min read', 'Why the dough rests overnight, and what the sea salt does to the crust.'],
    ['bag', 'One sticker on a kraft bag', '2 October · 3 min read', 'The cheapest packaging we could find, and the easiest to spot on the street.'],
    ['shop', 'Painting the sign by hand', '21 September · 4 min read', 'Three days on a ladder with a brush, a level and the wordmark.'],
  ];
  return [
    {
      id: 'saltwater-pg-journal',
      title: 'Saltwater · Journal',
      slug: 'journal',
      dir: 'ltr',
      theme,
      root: [
        header(),
        SEC('Intro', { maxW: 'text', gap: '4', py: '16' }, [T('Journal', { size: 'sm', weight: 700, color: 'accent' }, { name: 'Eyebrow' }), H('Notes from the harbour bakery', 1, { size: '5xl' }), T('What we bake, why it takes two days, and who brings the salt.', { size: 'xl', color: 'muted' })]),
        SEC('Featured', { py: '4' }, [
          G(2, { gap: '12', align: 'center', bg: 'surface', radius: 'xl', px: '8', py: '8' }, [
            M(aid(posts[0][0]), '4/5', { radius: 'lg' }, { alt: 'Sourdough with sea salt' }),
            S({ gap: '4', align: 'start' }, [T(posts[0][2], { size: 'sm', color: 'muted', weight: 600 }, { name: 'Date' }), H(posts[0][1], 2, { size: '4xl' }), T(posts[0][3], { size: 'lg', color: 'muted' }), B('Read the story', 'solid', { radius: 'pill' }, { href: 'story--two-days-for-one-loaf.html' })]),
          ], { md: { cols: 1 }, name: 'Featured post' }),
        ]),
        SEC('Posts', { gap: '8' }, [
          H('More from the journal', 2),
          N('list', {
            name: 'Journal entries',
            coll: SALT_JOURNAL,
            limit: 0,
            s: { cols: 3, gap: '8' },
            md: { cols: 2 },
            anim: { enter: 'rise', trigger: 'scroll', dur: 800, delay: 0, ease: 'frantos', dist: 40, stagger: 110 },
            template: S({ gap: '3' }, [M(undefined, '3/2', { radius: 'md' }, { bind: 'cover', hover: { scale: 1.02, bright: true, dur: 500, ease: 'expo-out' } }), T('', { size: 'xs', color: 'muted', weight: 700 }, { bind: 'date', name: 'Date' }), H('', 3, {}, { bind: 'title' }), T('', { color: 'muted' }, { bind: 'excerpt' }), B('Read the story', 'link', {}, { bind: 'link' })], { name: 'Card' }),
          }),
        ]),
        SEC('Newsletter', { bg: 'accent', color: 'onAccent', align: 'center', text: 'center', maxW: 'text', py: '16' }, [H('Fresh at 7, gone by 2', 2, { size: '3xl' }), T('One email on Friday: what we bake on Saturday.'), B('Get the Friday email', 'solid', { bg: 'bg', color: 'text', radius: 'pill' })]),
        footer(),
      ],
    },
    {
      id: 'saltwater-pg-loaf',
      title: 'Saltwater · Journal entry',
      slug: 'story',
      dir: 'ltr',
      theme,
      collection: SALT_JOURNAL,
      root: [
        header(),
        SEC('Article', { maxW: 'text', gap: '6', py: '16' }, [
          T('', { size: 'sm', color: 'muted', weight: 600 }, { name: 'Date', bind: 'date' }),
          H('', 1, { size: '5xl' }, { bind: 'title' }),
          T('', { size: 'xl', color: 'muted' }, { name: 'Lede', bind: 'excerpt' }),
          M(undefined, '4/5', { radius: 'lg' }, { name: 'Cover', bind: 'cover' }),
          T('', {}, { name: 'Text', bind: 'body' }),
          N('divider'),
          S({ dir: 'row', gap: '3', wrap: true }, [B('Order for Saturday', 'solid', { radius: 'pill' }), B('Back to the journal', 'outline', { radius: 'pill' }, { href: 'journal.html' })], { name: 'Buttons' }),
        ], { tag: 'article' }),
        footer(),
      ],
    },
  ];
}
