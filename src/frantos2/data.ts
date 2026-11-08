/**
 * FrantoS 2.0 — demo series "After Hours / Tel Aviv".
 * Seven frames with a shared grade (tungsten night, graphite shadows, red halation).
 * `focus` is the focal point used whenever a frame is cropped (thumbnails, covers).
 */

export type FrameId =
  | 'kiosk'
  | 'shutters'
  | 'promenade'
  | 'reflections'
  | 'balcony'
  | 'bus-stop'
  | 'dawn';

export interface Frame {
  id: FrameId;
  n: number; // number on the contact sheet
  time: string;
  orientation: 'portrait' | 'landscape';
  ratio: number; // width / height
  focus: string; // CSS object-position for crops
  title: { en: string; ru: string };
  place: { en: string; ru: string };
  caption: { en: string; ru: string };
}

const base = '/series/after-hours/';
export const frameSrc = (id: FrameId) => `${base}${id}.webp`;
export const frameThumb = (id: FrameId) => `${base}${id}-sm.webp`;

export const FRAMES: Frame[] = [
  {
    id: 'kiosk',
    n: 1,
    time: '02:10',
    orientation: 'portrait',
    ratio: 1792 / 2240,
    focus: '38% 72%',
    title: { en: 'The kiosk', ru: 'Киоск' },
    place: { en: 'Central Tel Aviv', ru: 'Центр Тель-Авива' },
    caption: {
      en: 'The only light on the block that is still awake.',
      ru: 'Единственный свет в квартале, который ещё не спит.',
    },
  },
  {
    id: 'shutters',
    n: 2,
    time: '02:35',
    orientation: 'portrait',
    ratio: 1744 / 2336,
    focus: '50% 62%',
    title: { en: 'Shutters down', ru: 'Жалюзи опущены' },
    place: { en: 'Allenby', ru: 'Алленби' },
    caption: {
      en: 'The street folds itself away until morning.',
      ru: 'Улица складывает себя до утра.',
    },
  },
  {
    id: 'promenade',
    n: 3,
    time: '03:05',
    orientation: 'landscape',
    ratio: 2048 / 1360,
    focus: '40% 50%',
    title: { en: 'Promenade', ru: 'Набережная' },
    place: { en: 'Tayelet', ru: 'Тайелет' },
    caption: {
      en: 'Lamps keep watch over an empty seafront.',
      ru: 'Фонари сторожат пустую набережную.',
    },
  },
  {
    id: 'reflections',
    n: 4,
    time: '03:30',
    orientation: 'portrait',
    ratio: 1792 / 2240,
    focus: '50% 40%',
    title: { en: 'Reflections', ru: 'Отражения' },
    place: { en: 'Florentin', ru: 'Флорентин' },
    caption: {
      en: 'After the rain, every sign reads upside down.',
      ru: 'После дождя все вывески читаются вверх ногами.',
    },
  },
  {
    id: 'balcony',
    n: 5,
    time: '03:50',
    orientation: 'portrait',
    ratio: 1744 / 2336,
    focus: '62% 55%',
    title: { en: 'One window', ru: 'Одно окно' },
    place: { en: 'White City', ru: 'Белый город' },
    caption: {
      en: 'One window is still arguing with the dark.',
      ru: 'Одно окно всё ещё спорит с темнотой.',
    },
  },
  {
    id: 'bus-stop',
    n: 6,
    time: '04:20',
    orientation: 'landscape',
    ratio: 2048 / 1360,
    focus: '22% 55%',
    title: { en: 'Night bus', ru: 'Ночной автобус' },
    place: { en: 'Ibn Gabirol', ru: 'Ибн Гвироль' },
    caption: {
      en: 'Last passenger of the night, first of the shift.',
      ru: 'Последний пассажир ночи, первый в смене.',
    },
  },
  {
    id: 'dawn',
    n: 7,
    time: '05:40',
    orientation: 'portrait',
    ratio: 1792 / 2240,
    focus: '70% 55%',
    title: { en: 'First light', ru: 'Первый свет' },
    place: { en: 'Jaffa', ru: 'Яффо' },
    caption: {
      en: 'Jaffa switches the lamps off, one by one.',
      ru: 'Яффо гасит фонари по одному.',
    },
  },
];

export const FRAME_BY_ID = Object.fromEntries(FRAMES.map((f) => [f.id, f])) as Record<FrameId, Frame>;

export const STORY_META = {
  title: 'After Hours / Tel Aviv',
  year: '2026',
};

/** Covers offered on the landing page "choose a cover" step. */
export const COVER_CHOICES: FrameId[] = ['kiosk', 'reflections', 'dawn'];
