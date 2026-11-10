import { Box, Camera, Clapperboard, Code2, LayoutTemplate, PenTool } from 'lucide-react';
import type { Asset, Discipline, WorkType } from '../ws/types';

/**
 * One loop for everyone — collect → connect → board → story → show. A discipline only changes
 * which templates, materials and tools come first. Every tool stays reachable for every profession.
 */
export interface Kit {
  id: Discipline;
  label: string;
  /** a line in the picker: what this person makes here */
  blurb: string;
  icon: React.ElementType;
  /** templates offered first, by id */
  templates: string[];
  /** the materials this profession adds most, for the library's first filter */
  formats: ('image' | 'video' | 'model' | 'screen' | 'svg' | 'lottie' | 'font' | 'code' | 'link' | 'audio')[];
  /** tools shown first: a label, why, and where it lives */
  tools: { label: string; hint: string; to: string }[];
  /** the demo project that shows this profession best */
  demo: string;
}

export const KITS: Kit[] = [
  {
    id: 'web',
    label: 'Web & UI/UX designer',
    blurb: 'Screens in device frames, flows and clickable prototypes.',
    icon: LayoutTemplate,
    templates: ['app', 'site', 'identity'],
    formats: ['screen', 'link', 'svg', 'font'],
    tools: [
      { label: 'Screens', hint: 'UI pictures in phone, tablet and desktop frames', to: '/library?k=screen' },
      { label: 'Websites', hint: 'Sites you look up to, kept as links', to: '/library?k=link' },
      { label: 'Design tokens', hint: 'Your brand as CSS, Tailwind and JSON', to: '/settings?tokens=1' },
    ],
    demo: 'halo',
  },
  {
    id: 'dev',
    label: 'Site & app developer',
    blurb: 'Design tokens, a handoff page and code snippets with a live preview.',
    icon: Code2,
    templates: ['site', 'app', 'launch'],
    formats: ['code', 'screen', 'svg', 'font'],
    tools: [
      { label: 'Design tokens', hint: 'CSS variables, Tailwind config and JSON from the brand kit', to: '/settings?tokens=1' },
      { label: 'Snippets', hint: 'HTML, CSS and JS with a live preview', to: '/library?k=code' },
      { label: 'Screens', hint: 'What to build, in device frames', to: '/library?k=screen' },
    ],
    demo: 'halo',
  },
  {
    id: 'motion',
    label: 'Motion designer',
    blurb: 'Notes on the timecode, Lottie, easing curves and animatics.',
    icon: Clapperboard,
    templates: ['motion', 'launch', 'object'],
    formats: ['video', 'lottie', 'audio'],
    tools: [
      { label: 'Motion', hint: 'Camera moves, titles and sound over a 3D object', to: '/s/form-01?m=motion' },
      { label: 'Lottie & sound', hint: 'Animations and tracks in the library', to: '/library?k=lottie' },
      { label: 'Easing curves', hint: 'Curves with a live preview, ready to copy', to: '/library?easing=1' },
    ],
    demo: 'stride',
  },
  {
    id: 'graphic',
    label: 'Graphic designer',
    blurb: 'Type pairings on your own content, mockups and print-ready export.',
    icon: PenTool,
    templates: ['identity', 'launch', 'photo'],
    formats: ['font', 'svg', 'image'],
    tools: [
      { label: 'Typefaces', hint: 'Fonts with a heading-and-text pairing preview', to: '/library?k=font' },
      { label: 'Brand kit', hint: 'Colour, type and logo used across boards and pages', to: '/settings' },
      { label: 'Canvas', hint: 'Posts, posters and slides in the right formats', to: '/s/form-01?m=canvas' },
    ],
    demo: 'ritual',
  },
  {
    id: 'photo',
    label: 'Photographer',
    blurb: 'Selects, grade and a sequence that becomes a case page.',
    icon: Camera,
    templates: ['photo', 'launch', 'identity'],
    formats: ['image', 'video'],
    tools: [
      { label: 'Image mode', hint: 'Grade, crop and masks without touching the original', to: '/s/form-01?m=image' },
      { label: 'Library by colour', hint: 'Find every frame that carries a colour', to: '/library' },
      { label: 'Story', hint: 'A sequence with captions that plays full screen', to: '/story' },
    ],
    demo: 'casa-arca',
  },
  {
    id: '3d',
    label: '3D artist',
    blurb: 'Objects, materials, light and turntables for a showroom.',
    icon: Box,
    templates: ['object', 'launch', 'motion'],
    formats: ['model', 'image'],
    tools: [
      { label: '3D studio', hint: 'Materials, light, stage and stills', to: '/s/form-01' },
      { label: 'Objects', hint: 'Every object across projects', to: '/objects' },
      { label: 'Motion', hint: 'A camera move through keyframes', to: '/s/form-01?m=motion' },
    ],
    demo: 'form-01',
  },
];

export const kitOf = (d?: Discipline) => KITS.find((k) => k.id === d);

/** what a work is, from the file it started with */
export function workTypeFor(a: Asset): WorkType {
  if (a.format === 'screen') return 'screen';
  if (a.format === 'lottie') return 'animation';
  if (a.format === 'svg' || a.format === 'font') return 'identity';
  if (a.format === 'link' || a.format === 'code') return 'page';
  if (a.kind === 'video') return 'video';
  if (a.kind === 'model') return 'model';
  return 'image';
}

export const WORK_TYPES: { id: WorkType; label: string }[] = [
  { id: 'image', label: 'Image' },
  { id: 'screen', label: 'Screen' },
  { id: 'flow', label: 'Flow' },
  { id: 'page', label: 'Web page' },
  { id: 'animation', label: 'Animation' },
  { id: 'video', label: 'Video' },
  { id: 'identity', label: 'Identity' },
  { id: 'mockup', label: 'Mockup' },
  { id: 'model', label: '3D model' },
];
