import type { SiteAnim, SiteNode, SiteNodeType, SiteStyle } from '../ws/types';
import { nid } from './model';

/**
 * Ready sections and elements for the constructor. Each builds a fresh tree, styled only with tokens,
 * so it takes the page theme at once. `img(i)` hands out the project's own pictures.
 */

export interface Env {
  t: (s: string) => string;
  img: (i: number) => string | undefined;
  name: string;
}

type O = Partial<Omit<SiteNode, 'id' | 'type' | 'children'>>;
const N = (type: SiteNodeType, o: O = {}, children?: SiteNode[]): SiteNode => ({ id: nid(), type, ...o, ...(children ? { children } : {}) });
const S = (s: SiteStyle, children: SiteNode[], o: O = {}) => N('stack', { s, ...o }, children);
const G = (cols: number, s: SiteStyle, children: SiteNode[], o: O = {}) => N('grid', { s: { cols, gap: '6', ...s }, ...o }, children);
const H = (text: string, level: 1 | 2 | 3, s?: SiteStyle, o: O = {}) => N('heading', { text, level, s, ...o });
const T = (text: string, s?: SiteStyle, o: O = {}) => N('text', { text, s, ...o });
const B = (text: string, variant: SiteStyle['variant'] = 'solid', s: SiteStyle = {}, o: O = {}) => N('button', { text, href: '#', s: { variant, ...s }, ...o });
const M = (assetId: string | undefined, ratio: SiteStyle['ratio'] = '4/3', s: SiteStyle = {}, o: O = {}) => N('media', { assetId, s: { ratio, ...s }, ...o });
const SEC = (name: string, s: SiteStyle, children: SiteNode[], o: O = {}) => N('section', { name, s, ...o }, children);
/** the same builders for hand-made pages (demo seeds) */
export const dsl = { N, S, G, H, T, B, M, SEC };

export type BlockId = 'header' | 'hero' | 'split' | 'cards' | 'posts' | 'article' | 'quote' | 'gallery' | 'prices' | 'faq' | 'contact' | 'cta' | 'footer';

export const BLOCKS: { id: BlockId; label: string; hint: string; make: (e: Env) => SiteNode }[] = [
  {
    id: 'header',
    label: 'Header',
    hint: 'Logo, links and one button',
    make: ({ t, name }) =>
      SEC('Header', { py: '4', dir: 'row', justify: 'between', align: 'center', maxW: 'wide', wrap: false }, [
        T(name, { font: 'heading', size: 'xl' }, { name: 'Logo' }),
        S({ dir: 'row', gap: '6', align: 'center' }, [B(t('Work'), 'link', { size: 'sm' }, { sm: { hide: true } }), B(t('About'), 'link', {}, { sm: { hide: true } }), B(t('Journal'), 'link', {}, { sm: { hide: true } }), B(t('Contact'), 'solid')], { name: 'Navigation' }),
      ], { tag: 'header' }),
  },
  {
    id: 'hero',
    label: 'Hero',
    hint: 'A big headline in the middle',
    make: ({ t }) =>
      SEC('Hero', { minH: 'half', align: 'center', text: 'center', maxW: 'text', gap: '6', py: '24' }, [
        T(t('New collection'), { size: 'sm', weight: 600, color: 'accent' }, { name: 'Eyebrow' }),
        H(t('Made slowly, meant to stay'), 1, { size: '5xl' }),
        T(t('One sentence about what you make and who it is for. Keep it short enough to read in a breath.'), { size: 'lg', color: 'muted' }),
        S({ dir: 'row', gap: '3', justify: 'center', wrap: true }, [B(t('See the work')), B(t('Get in touch'), 'outline')], { name: 'Buttons' }),
      ]),
  },
  {
    id: 'split',
    label: 'Hero with picture',
    hint: 'Headline on one side, picture on the other',
    make: ({ t, img }) =>
      SEC('Hero with picture', { py: '16' }, [
        G(2, { align: 'center', gap: '12' }, [
          S({ gap: '6', align: 'start' }, [H(t('Made slowly, meant to stay'), 1), T(t('One sentence about what you make and who it is for. Keep it short enough to read in a breath.'), { size: 'lg', color: 'muted' }), S({ dir: 'row', gap: '3', wrap: true }, [B(t('See the work')), B(t('Get in touch'), 'outline')], { name: 'Buttons' })]),
          M(img(0), '4/5', { radius: 'lg' }),
        ], { md: { cols: 1 } }),
      ]),
  },
  {
    id: 'cards',
    label: 'Cards',
    hint: 'Three things side by side',
    make: ({ t, img }) =>
      SEC('Cards', {}, [
        S({ gap: '3', maxW: 'text' }, [H(t('What we do'), 2), T(t('Three short promises. Each card says one thing and shows it.'), { color: 'muted' })], { name: 'Title' }),
        G(3, { gap: '8' }, [0, 1, 2].map((i) => S({ gap: '3' }, [M(img(i + 1), '4/3'), H([t('Design'), t('Make'), t('Care')][i], 3), T(t('Two lines about this, written for the person who will pay for it.'), { color: 'muted' })], { name: `Card ${i + 1}` })), { md: { cols: 2 } }),
      ]),
  },
  {
    id: 'posts',
    label: 'Blog posts',
    hint: 'A list of articles with covers',
    make: ({ t, img }) =>
      SEC('Blog posts', {}, [
        S({ dir: 'row', justify: 'between', align: 'end', gap: '4', wrap: true }, [H(t('From the journal'), 2), B(t('All articles'), 'link')], { name: 'Title' }),
        G(3, { gap: '8' }, [0, 1, 2].map((i) =>
          S({ gap: '3' }, [M(img(i + 2), '3/2'), T(t('{date} · {n} min read').replace('{date}', ['12.10', '28.09', '14.09'][i]).replace('{n}', String([4, 6, 3][i])), { size: 'xs', color: 'muted', weight: 600 }, { name: 'Date' }), H([t('Why we start with the material'), t('A week in the workshop'), t('Notes on a slow launch')][i], 3), T(t('The first two lines of the article, enough to decide whether to read on.'), { color: 'muted' })], { name: `Post ${i + 1}` })
        ), { md: { cols: 2 } }),
      ]),
  },
  {
    id: 'article',
    label: 'Article',
    hint: 'A blog post: title, cover and text',
    make: ({ t, img }) =>
      SEC('Article', { maxW: 'text', gap: '6', py: '16' }, [
        T(t('Journal · 12 October · 6 min read'), { size: 'sm', color: 'muted', weight: 600 }, { name: 'Meta' }),
        H(t('Why we start with the material'), 1, { size: '4xl' }),
        T(t('A short lede: what this article is about and why it matters now.'), { size: 'xl', color: 'muted' }, { name: 'Lede' }),
        M(img(1), '16/9', { radius: 'md' }, { name: 'Cover' }),
        T(t('Write the article here. Short paragraphs read better on a phone: three or four sentences, then a break.')),
        T(t('A second paragraph. Pictures from the project can sit between paragraphs; drop one in from the panel on the left.')),
        H(t('A subheading'), 2),
        T(t('The last part. End with what the reader should do next, and put that action right below.')),
      ], { tag: 'article' }),
  },
  {
    id: 'quote',
    label: 'Quote',
    hint: 'What the client said',
    make: ({ t }) =>
      SEC('Quote', { bg: 'surface', text: 'center', align: 'center', maxW: 'text', py: '24' }, [
        H(t('“They listened first, and it shows in every detail.”'), 2, { size: '3xl', italic: true }),
        T(t('Name Surname · Client'), { size: 'sm', color: 'muted', weight: 600 }, { name: 'Who said it' }),
      ]),
  },
  {
    id: 'gallery',
    label: 'Gallery',
    hint: 'Six pictures in a grid',
    make: ({ t, img }) =>
      SEC('Gallery', {}, [H(t('Selected work'), 2), G(3, { gap: '4' }, [0, 1, 2, 3, 4, 5].map((i) => M(img(i), '1/1', { radius: 'sm' })), { sm: { cols: 2 } })]),
  },
  {
    id: 'prices',
    label: 'Prices',
    hint: 'Three plans to compare',
    make: ({ t }) =>
      SEC('Prices', { align: 'center' }, [
        H(t('Simple prices'), 2, { text: 'center' }),
        G(3, { gap: '6', align: 'stretch' }, [0, 1, 2].map((i) =>
          S({ gap: '4', py: '8', px: '8', radius: 'lg', border: true, bg: i === 1 ? 'surface' : undefined }, [
            T([t('Start'), t('Studio'), t('Custom')][i], { weight: 700, color: 'accent' }, { name: 'Plan' }),
            H(['€900', '€2 400', t('From €6 000')][i], 2, { size: '3xl' }, { name: 'Price' }),
            T(t('Who this is for, in one line.'), { color: 'muted' }),
            N('divider'),
            T([t('One page\nTwo rounds of changes\nFiles for print and web'), t('Up to five pages\nUnlimited rounds\nA style guide'), t('A whole product\nA dedicated team\nSupport after launch')][i], { size: 'sm' }, { name: 'What is included' }),
            B(t('Choose'), i === 1 ? 'solid' : 'outline', {}, {}),
          ], { name: `Plan ${i + 1}` })
        ), { md: { cols: 1 } }),
      ]),
  },
  {
    id: 'faq',
    label: 'Questions',
    hint: 'Questions and short answers',
    make: ({ t }) =>
      SEC('Questions', { maxW: 'text', gap: '6' }, [
        H(t('Questions'), 2),
        ...[
          [t('How long does it take?'), t('Most projects take four to eight weeks from the first call to the files.')],
          [t('What do you need from me?'), t('A short brief, the pictures you like, and one person who decides.')],
          [t('Can we change things later?'), t('Yes. Every page is built from the same parts, so changes stay quick.')],
        ].flatMap(([q, a], i) => [...(i ? [N('divider')] : []), S({ gap: '2' }, [H(q, 3, { size: 'lg', font: 'body', weight: 700 }), T(a, { color: 'muted' })], { name: `Question ${i + 1}` })]),
      ]),
  },
  {
    id: 'contact',
    label: 'Contact form',
    hint: 'Name, email, message and a button',
    make: ({ t }) =>
      SEC('Contact form', {}, [
        G(2, { gap: '12', align: 'start' }, [
          S({ gap: '4' }, [H(t('Let’s talk'), 2), T(t('Tell us about the project. We answer within one working day.'), { color: 'muted' }), T('hello@studio.com', { weight: 600 }, { name: 'Email' })]),
          S({ gap: '4' }, [N('field', { text: t('Name'), placeholder: t('Your name') }), N('field', { text: t('Email'), placeholder: 'you@company.com' }), N('field', { text: t('Message'), placeholder: t('A few words about the project'), multiline: true }), B(t('Send'))], { name: 'Form' }),
        ], { md: { cols: 1 } }),
      ]),
  },
  {
    id: 'cta',
    label: 'Call to action',
    hint: 'One line and one button on colour',
    make: ({ t }) =>
      SEC('Call to action', { bg: 'accent', color: 'onAccent', align: 'center', text: 'center', maxW: 'text', py: '16' }, [H(t('Ready when you are'), 2, { size: '3xl' }), B(t('Book a call'), 'solid', { bg: 'bg', color: 'text' })]),
  },
  {
    id: 'footer',
    label: 'Footer',
    hint: 'Contacts and links at the bottom',
    make: ({ t, name }) =>
      SEC('Footer', { bg: 'text', color: 'bg', py: '12', gap: '8' }, [
        G(3, { gap: '8' }, [
          S({ gap: '2' }, [T(name, { font: 'heading', size: 'xl' }, { name: 'Logo' }), T(t('A line about who you are and where.'), { size: 'sm' })]),
          S({ gap: '2' }, [B(t('Work'), 'link'), B(t('About'), 'link'), B(t('Journal'), 'link')], { name: 'Links' }),
          S({ gap: '2' }, [T('hello@studio.com', { size: 'sm' }), T('Instagram · Behance', { size: 'sm' })], { name: 'Contacts' }),
        ], { sm: { cols: 1 } }),
        T(t('© {year} · Made in FrantoS').replace('{year}', String(new Date().getFullYear())), { size: 'xs' }, { name: 'Small print' }),
      ], { tag: 'footer' }),
  },
];

export type ElementId = 'heading' | 'text' | 'button' | 'image' | 'object' | 'divider' | 'spacer' | 'row' | 'column' | 'grid' | 'field';
export const ELEMENTS: { id: ElementId; label: string; make: (e: Env, objectId?: string) => SiteNode }[] = [
  { id: 'heading', label: 'Heading', make: ({ t }) => H(t('Heading'), 2) },
  { id: 'text', label: 'Text', make: ({ t }) => T(t('Write something here.')) },
  { id: 'button', label: 'Button', make: ({ t }) => B(t('Button')) },
  { id: 'image', label: 'Picture', make: ({ img }) => M(img(0), '4/3') },
  { id: 'object', label: '3D object', make: (_e, objectId) => N('object', { objectId, s: { ratio: '1/1' } }) },
  { id: 'divider', label: 'Line', make: () => N('divider') },
  { id: 'spacer', label: 'Space', make: () => N('spacer', { s: { py: '8' } }) },
  { id: 'row', label: 'Row', make: () => S({ dir: 'row', gap: '4', align: 'center', wrap: true }, []) },
  { id: 'column', label: 'Column', make: () => S({ gap: '4' }, []) },
  { id: 'grid', label: 'Grid', make: () => G(2, {}, []) },
  { id: 'field', label: 'Form field', make: ({ t }) => N('field', { text: t('Name'), placeholder: t('Your name') }) },
];

export type TemplateId = 'blank' | 'landing' | 'blog' | 'article' | 'portfolio' | 'square' | 'story' | 'wide' | 'banner';
export const PAGE_TEMPLATES: { id: TemplateId; label: string; hint: string; blocks: BlockId[]; board?: { w: number; h: number } }[] = [
  { id: 'landing', label: 'Landing', hint: 'Header, hero, cards, gallery, quote, call to action', blocks: ['header', 'split', 'cards', 'gallery', 'quote', 'cta', 'footer'] },
  { id: 'blog', label: 'Blog', hint: 'Header, intro, posts, form', blocks: ['header', 'hero', 'posts', 'contact', 'footer'] },
  { id: 'article', label: 'Article', hint: 'One post and what to read next', blocks: ['header', 'article', 'posts', 'footer'] },
  { id: 'portfolio', label: 'Portfolio', hint: 'Gallery, quote, prices, contact', blocks: ['header', 'hero', 'gallery', 'quote', 'prices', 'faq', 'contact', 'footer'] },
  { id: 'blank', label: 'Blank', hint: 'Start from nothing', blocks: [] },
  { id: 'square', label: 'Square post', hint: '1080 × 1080 · headline word by word', blocks: [], board: { w: 1080, h: 1080 } },
  { id: 'story', label: 'Story', hint: '1080 × 1920 · picture, then the words', blocks: [], board: { w: 1080, h: 1920 } },
  { id: 'wide', label: 'Landscape video', hint: '1920 × 1080 · for a reel or a screen', blocks: [], board: { w: 1920, h: 1080 } },
  { id: 'banner', label: 'Banner', hint: '300 × 250 · a line and a button', blocks: [], board: { w: 300, h: 250 } },
];

/** an entrance that starts when the artboard starts */
const A = (enter: SiteAnim['enter'], delay: number, x: Partial<SiteAnim> = {}): SiteAnim => ({ enter, trigger: 'load', dur: enter === 'words' ? 800 : enter === 'mask' ? 1200 : 900, delay, ease: enter === 'zoom' || enter === 'mask' ? 'expo-out' : 'frantos', ...(enter === 'words' ? { stagger: 90 } : {}), ...(enter === 'rise' ? { dist: 40 } : {}), ...x });
/** artboards: one frame that fills the board, its parts entering in turn */
export const BOARDS: Record<'square' | 'story' | 'wide' | 'banner', (e: Env) => SiteNode[]> = {
  square: ({ t }) => [
    SEC('Frame', { minH: 'screen', align: 'center', text: 'center', gap: '8', px: '16', bg: 'accent', color: 'onAccent' }, [
      T(t('New collection'), { size: 'lg', weight: 700 }, { anim: A('fade', 0, { dur: 600 }), name: 'Eyebrow' }),
      H(t('Made slowly, meant to stay'), 1, { size: '5xl' }, { anim: A('words', 250) }),
      T(t('Opening on Saturday at ten'), { size: 'xl' }, { anim: A('rise', 1150) }),
      B(t('See the work'), 'solid', { bg: 'bg', color: 'text', radius: 'pill', size: 'lg' }, { anim: A('zoom', 1450, { dur: 700 }) }),
    ]),
  ],
  story: ({ t, img }) => [
    SEC('Frame', { minH: 'screen', gap: '8', px: '12', py: '24' }, [
      M(img(0), '4/5', { radius: 'lg' }, { anim: A('mask', 0) }),
      T(t('New collection'), { size: 'lg', weight: 700, color: 'accent' }, { anim: A('fade', 700, { dur: 600 }), name: 'Eyebrow' }),
      H(t('Made slowly, meant to stay'), 1, { size: '4xl' }, { anim: A('words', 850) }),
      T(t('Opening on Saturday at ten'), { size: 'xl', color: 'muted' }, { anim: A('rise', 1700) }),
    ]),
  ],
  wide: ({ t, img }) => [
    SEC('Frame', { minH: 'screen', px: '24' }, [
      G(2, { align: 'center', gap: '16' }, [
        S({ gap: '6', align: 'start' }, [T(t('New collection'), { size: 'lg', weight: 700, color: 'accent' }, { anim: A('fade', 0, { dur: 600 }), name: 'Eyebrow' }), H(t('Made slowly, meant to stay'), 1, { size: '5xl' }, { anim: A('words', 200) }), T(t('Opening on Saturday at ten'), { size: 'xl', color: 'muted' }, { anim: A('rise', 1100) })]),
        M(img(0), '1/1', { radius: 'lg' }, { anim: A('zoom', 300, { dur: 1400 }) }),
      ]),
    ]),
  ],
  banner: ({ t }) => [
    SEC('Frame', { minH: 'screen', align: 'center', text: 'center', gap: '3', px: '4', py: '4', bg: 'accent', color: 'onAccent' }, [
      H(t('Made slowly, meant to stay'), 2, { size: 'xl' }, { anim: A('rise', 0, { dist: 16 }) }),
      B(t('See the work'), 'solid', { bg: 'bg', color: 'text', radius: 'pill' }, { anim: A('zoom', 500, { dur: 600 }) }),
    ]),
  ],
};
export const pageFrom = (id: TemplateId, e: Env) => (id in BOARDS ? BOARDS[id as keyof typeof BOARDS](e) : null) ?? (PAGE_TEMPLATES.find((x) => x.id === id)?.blocks ?? []).map((b) => BLOCKS.find((x) => x.id === b)!.make(e));
