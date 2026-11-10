/** "What's new": newest first. `n` grows with every entry; the header dot shows until you open the page. */
export interface NewsItem {
  n: number;
  date: string;
  title: string;
  body: string;
  path: string;
  cta: string;
  image?: string;
}

export const NEWS: NewsItem[] = [
  {
    n: 14,
    date: '2026-11-11',
    title: 'Lottie in two taps',
    body: "Studio · Motion now makes Lottie animations: a wave like the Wavelength loader, a ring, a pulse, an equaliser, an orbit and a “done” tick. Give one your project colours, tempo and thickness, then download the JSON or put it straight into the project. Vector shapes, a few kilobytes, sharp at any size.",
    path: '/s/ritual?m=motion&k=lottie',
    cta: 'Open the Lottie maker',
    image: '/projects/wavelength/loader-pv.webp',
  },
  {
    n: 13,
    date: '2026-11-10',
    title: 'Posts that move',
    body: 'A page can now be an artboard: a square post, a story, a landscape video or a banner. Build it from the same blocks, give it entrances on the timeline, and take it out as an MP4, a GIF, a Lottie file for apps or a poster — rendered frame by frame from what you see in the editor.',
    path: '/s/halden?m=site&pg=halden-pg-post',
    cta: 'Open the Halden autumn post',
    image: '/projects/halden/chair-sm.webp',
  },
  {
    n: 12,
    date: '2026-11-10',
    title: 'Components, a blog and a check',
    body: 'Make any part a component: copies keep their own words and pictures, and a change of style reaches every copy; variants such as Sale switch in one click. Collections hold blog posts: a list shows them as cards, an entry page shows one at a time, and you can edit an entry right on its card. Save blocks for any project, and let the check find hard-to-read text, small buttons and things past the phone edge.',
    path: '/s/saltwater?m=site',
    cta: 'Open the Saltwater journal',
    image: '/projects/saltwater/bag-sm.webp',
  },
  {
    n: 11,
    date: '2026-11-10',
    title: 'Take the site with you',
    body: 'Export pages as a website that opens in any browser — HTML, CSS with your tokens, fonts, pictures and the motion — or as a React + Vite project with Tailwind tokens. Pictures of every width and a PDF for the portfolio come from the same place, and the handoff page now gives developers the site too.',
    path: '/p/saltwater/handoff',
    cta: 'Open the Saltwater handoff',
    image: '/projects/saltwater/shop-sm.webp',
  },
  {
    n: 10,
    date: '2026-11-10',
    title: 'Pages that move',
    body: 'Give any element an entrance — fade, rise, reveal, word by word, counting numbers or your own keyframes — on load or when it is scrolled to. Containers bring their children in one by one; hover lifts, grows and brightens; pictures can sit deeper than the page. A timeline shows it all and scrubs through it, and one click brings a whole page to life.',
    path: '/site/saltwater/saltwater-pg-journal',
    cta: 'Watch the Saltwater journal',
    image: '/projects/saltwater/loaf-sm.webp',
  },
  {
    n: 9,
    date: '2026-11-10',
    title: 'Build a site in the studio',
    body: 'A new Site mode: put a page together from ready sections — header, hero, cards, blog posts, gallery, prices, form, footer — and change the words right on the page. Check it on a phone, tablet and desktop. Send it to review: the client pins notes on a picture of the page and opens the live page of that version.',
    path: '/s/halden?m=site',
    cta: 'Open the Halden site',
    image: '/projects/halden/room-sm.webp',
  },
  {
    n: 8,
    date: '2026-11-10',
    title: 'Flows, handoff, animatics, mockups and print',
    body: 'Screens become a map with arrows and a clickable prototype that opens from the review link. A handoff page gathers colours, type, tokens and assets at size. Story frames cut on the beat into a video. Mockups in 3D, and print PDFs with bleed and a resolution check.',
    path: '/p/form-01/flow',
    cta: 'Open a flow',
    image: '/projects/halo/hero-sm.webp',
  },
  {
    n: 7,
    date: '2026-11-10',
    title: 'A kit for your profession',
    body: 'Tell FrantoS what you make — web, development, motion, graphic, photo or 3D — and your templates and tools come first. The library now keeps screens, SVG, Lottie, fonts, code with a live preview, websites and sound.',
    path: '/settings?kit=1',
    cta: 'Pick your profession',
    image: '/projects/stride/hero-sm.webp',
  },
  {
    n: 6,
    date: '2026-11-09',
    title: 'Present boards, publish a portfolio',
    body: 'Boards from Canvas become a full-screen presentation with speaker notes. Your published case pages gather into one portfolio page, published only when you say so.',
    path: '/portfolio',
    cta: 'Open portfolio',
    image: '/projects/form-01/form-poster-sm.webp',
  },
  {
    n: 5,
    image: '/projects/form-01/ref-travertine-sm.webp',
    date: '2026-11-09',
    title: 'A library, a shelf of objects, templates',
    body: 'Every file from every project in one place, searchable by colour. All your 3D objects on one shelf. Four templates that start a project with stages and boards.',
    path: '/library',
    cta: 'Open the library',
  },
  {
    n: 4,
    image: '/projects/form-01/ref-glaze-sm.webp',
    date: '2026-11-09',
    title: 'Brand kit and a guide to hand over',
    body: 'Logo, typefaces and colours set once in Settings dress every board, case page and presentation — and print as a brand guide.',
    path: '/settings',
    cta: 'Set up the brand',
  },
  {
    n: 3,
    image: '/projects/form-01/form-v2-sm.webp',
    date: '2026-11-09',
    title: 'Studio: Image, Canvas, Motion',
    body: 'Crop, correct and pick looks; compose boards at real sizes; animate the camera around your object and export a video.',
    path: '/s/form-01?m=canvas',
    cta: 'Open the studio',
  },
  {
    n: 2,
    image: '/projects/form-01/form-clay-sm.webp',
    date: '2026-11-09',
    title: 'Light theme and an app for your dock',
    body: 'Switch between dark and light glass. Install FrantoS as an app — it opens like one and keeps working offline.',
    path: '/app',
    cta: 'Back to projects',
  },
  {
    n: 1,
    image: '/projects/form-01/form-v1-sm.webp',
    date: '2026-11-08',
    title: 'The object in 3D',
    body: 'The FORM / 01 vessel as a live object: materials, light, a turntable and a showroom with AR.',
    path: '/o/form-01/o-vessel',
    cta: 'Open the showroom',
  },
];
