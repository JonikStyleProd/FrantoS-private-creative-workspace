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
