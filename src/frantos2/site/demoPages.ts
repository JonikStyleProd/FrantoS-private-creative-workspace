import type { SitePage } from '../ws/types';
import { dsl } from './blocks';

/**
 * Pages built in the constructor for two demos: the Halden shop and the Saltwater journal.
 * Written in English; the app shows them in the visitor's language (see useSiteTr).
 */
const { N, S, G, H, T, B, M, SEC } = dsl;
type Page = Omit<SitePage, 'createdAt' | 'updatedAt'>;

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
            M(aid('room'), '4/3', { radius: 'lg' }, { alt: 'A living room with the Ask chair and the Fold lamp' }),
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
          ).map(([k, name, price]) => S({ gap: '3' }, [M(aid(k), '4/5', { radius: 'md' }, { alt: name }), S({ dir: 'row', justify: 'between', gap: '2' }, [T(name, { weight: 700 }), T(price, { color: 'muted' })], { name: 'Name and price' })], { name })), { md: { cols: 2 } }),
        ]),
        SEC('Workshop', { bg: 'surface', py: '16' }, [
          G(2, { align: 'center', gap: '12' }, [
            M(aid('workshop'), '4/5', { radius: 'lg' }, { alt: 'Oak shavings on the workshop bench' }),
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
            S({ gap: '4', align: 'start' }, [T(posts[0][2], { size: 'sm', color: 'muted', weight: 600 }, { name: 'Date' }), H(posts[0][1], 2, { size: '4xl' }), T(posts[0][3], { size: 'lg', color: 'muted' }), B('Read the story', 'solid', { radius: 'pill' })]),
          ], { md: { cols: 1 }, name: 'Featured post' }),
        ]),
        SEC('Posts', { gap: '8' }, [
          H('More from the journal', 2),
          G(3, { gap: '8' }, posts.map(([k, title, date, text]) => S({ gap: '3' }, [M(aid(k), '3/2', { radius: 'md' }, { alt: title }), T(date, { size: 'xs', color: 'muted', weight: 700 }, { name: 'Date' }), H(title, 3), T(text, { color: 'muted' })], { name: title })), { md: { cols: 2 } }),
        ]),
        SEC('Newsletter', { bg: 'accent', color: 'onAccent', align: 'center', text: 'center', maxW: 'text', py: '16' }, [H('Fresh at 7, gone by 2', 2, { size: '3xl' }), T('One email on Friday: what we bake on Saturday.'), B('Get the Friday email', 'solid', { bg: 'bg', color: 'text', radius: 'pill' })]),
        footer(),
      ],
    },
    {
      id: 'saltwater-pg-loaf',
      title: 'Saltwater · Two days for one loaf',
      slug: 'two-days-for-one-loaf',
      dir: 'ltr',
      theme,
      root: [
        header(),
        SEC('Article', { maxW: 'text', gap: '6', py: '16' }, [
          T('Journal · 14 October · 5 min read', { size: 'sm', color: 'muted', weight: 600 }, { name: 'Meta' }),
          H('Two days for one loaf', 1, { size: '5xl' }),
          T('Why the dough rests overnight, and what the sea salt does to the crust.', { size: 'xl', color: 'muted' }, { name: 'Lede' }),
          M(aid('loaf'), '4/5', { radius: 'lg' }, { name: 'Cover', alt: 'Sourdough with sea salt' }),
          T('Lea starts the dough at four in the afternoon. Flour, water, the starter we have kept alive since 2019, and nothing else. Then it waits.'),
          T('Overnight the cold slows everything down. The dough gets its sour, the crumb opens, and by morning it is ready for the oven at six.'),
          H('Salt from the harbour', 2),
          T('Sam brings the salt in a bucket from the works on the pier. A pinch goes on top just before baking: that is the crunch you hear when you break the loaf.'),
          N('divider'),
          S({ dir: 'row', gap: '3', wrap: true }, [B('Order for Saturday', 'solid', { radius: 'pill' }), B('Back to the journal', 'outline', { radius: 'pill' })], { name: 'Buttons' }),
        ], { tag: 'article' }),
        footer(),
      ],
    },
  ];
}
