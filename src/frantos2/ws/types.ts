/** FrantoS workspace data model (local-first, stored in IndexedDB). */

/** 'model' = GLB for the studio, 'env' = an .hdr environment for studio lighting */
export type MediaKind = 'image' | 'video' | 'model' | 'env';

/**
 * What a file is beyond its media kind. Every one of these is stored as kind 'image' with a rendered
 * preview (so boards, the library, search by colour and links treat it like a picture), while the
 * original stays in blobKey for the player, specimen or code view.
 */
export type AssetFormat = 'screen' | 'svg' | 'lottie' | 'font' | 'code' | 'link' | 'audio';

export interface Asset {
  id: string;
  kind: MediaKind;
  format?: AssetFormat;
  /** screens: which frame they belong in */
  device?: 'phone' | 'tablet' | 'desktop';
  /** code: the source text; link: the address */
  text?: string;
  /** code: language for the view; font: family name read from the file */
  lang?: string;
  title: string;
  /** static URL (demo) — user uploads use blobKey instead */
  src?: string;
  thumb?: string;
  blobKey?: string;
  thumbKey?: string;
  w: number;
  h: number;
  duration?: number;
  createdAt: number;
  isReference: boolean;
  source?: string;
  note?: string;
  /** reference → the decision it shaped */
  influences?: { assetId: string; text: string };
  /** false while bytes are still being written */
  ready?: boolean;
  /** made in the studio's Image mode: how to get it again from the original */
  recipe?: { sourceId: string; adjust: Record<string, number>; look: string; crop: { aspect: number | null; zoom: number; x: number; y: number }; mask?: { x: number; y: number; r: number; feather: number; invert: boolean; adjust: Record<string, number> } | null; cutout?: { tolerance: number } | null };
  /** cloud copy in the private `assets` bucket */
  storagePath?: string;
  thumbPath?: string;
  tags?: string[];
  /** dominant colours, extracted on upload */
  palette?: string[];
}

export interface Version {
  id: string;
  n: number;
  assetId: string;
  createdAt: number;
  label?: string;
}

/** what a work is, for its label and the tools offered on it; reviews and approval are the same for all */
export type WorkType = 'image' | 'screen' | 'flow' | 'page' | 'animation' | 'identity' | 'mockup' | 'model' | 'video';

export interface Work {
  id: string;
  title: string;
  kind: MediaKind;
  type?: WorkType;
  /** made from a page in the constructor */
  pageId?: string;
  versions: Version[];
  approvedVersionId?: string;
  createdAt: number;
  /** due date (ms) and a production status for planning */
  due?: number;
  status?: WorkStatus;
}

export type WorkStatus = 'todo' | 'doing' | 'client' | 'done';

export interface Reply {
  id: string;
  text: string;
  author: string;
  createdAt: number;
}

export interface Comment {
  id: string;
  workId: string;
  versionId: string;
  /** position in the work's own coordinates (0–1), survives any resize */
  pin?: { x: number; y: number };
  /** an area instead of a point, same coordinates */
  area?: { x: number; y: number; w: number; h: number };
  /** a freehand mark: points in work coordinates */
  path?: [number, number][];
  /** seconds, for motion work; t2 makes it a range */
  t?: number;
  t2?: number;
  /** a note that is a to-do for the next version */
  isTask?: boolean;
  authorId?: string;
  guest?: boolean;
  text: string;
  /** a client approved this version from a review link */
  approval?: boolean;
  /** a voice note recorded on the pin: stored like an upload */
  audio?: { blobKey: string; duration: number };
  author: string;
  createdAt: number;
  resolved: boolean;
  resolvedAt?: number;
  replies: Reply[];
}

export interface MoodItem {
  id: string;
  assetId: string;
  /** board units: 0–1 of a 16:10 board */
  x: number;
  y: number;
  w: number;
  z: number;
  rot: number;
}

export interface Decision {
  id: string;
  workId: string;
  versionId: string;
  text: string;
  /** what the decision rests on: references, notes */
  basedOn: { kind: 'asset' | 'comment'; id: string }[];
  author: string;
  createdAt: number;
}

export interface CanvasNote {
  id: string;
  x: number;
  y: number;
  w: number;
  text: string;
  z: number;
}

export interface CanvasGroup {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

/* ───────── studio: 3D objects ───────── */

/** How a surface looks. Two zones (base and top) meet at `blend`, like stone fading into glaze. */
export interface MaterialVariant {
  id: string;
  name: string;
  base: 'travertine' | 'clay' | 'glaze';
  baseColor: string;
  topColor: string;
  /** 0 = all top colour, 1 = all base; where the two meet, measured from the bottom */
  blend: number;
  softness: number;
  roughness: number;
  gloss: number;
  /** imported models only: keep the model's own look, recolour its texture, or paint one solid colour (topColor) */
  finish?: 'original' | 'tint' | 'solid' | 'photo';
  /** material from a photo: a square crop of a reference (WebP/JPEG data URL), wrapped around the object */
  photo?: string;
  /** imported models: how strongly the recolour replaces the texture's colour, 0–1 */
  tint?: number;
  /** imported models: metalness, 0–1 */
  metal?: number;
}

export type LightPreset = 'softbox' | 'window' | 'spot' | 'rim' | 'morning' | 'sunset' | 'gallery' | 'hdri';

export type StageProp = 'none' | 'plinth' | 'block' | 'arch';

export type EnvPreset = 'room' | 'sunset' | 'overcast' | 'neon' | 'night';
export interface SceneExtras {
  env?: EnvPreset;
  floor?: 'shadow' | 'mirror' | 'water';
  scale?: 'none' | 'hand' | 'person';
  /** the object's real height, for the scale figure */
  sizeCm?: number;
  /** a logo or sticker on the surface: image data URL, size as a share of the object height, where around it */
  decal?: { src: string; size: number; angle: number; y: number } | null;
}

/** a title over the motion clip, shown between two fractions of its length */
export interface MotionTitle {
  id: string;
  text: string;
  from: number;
  to: number;
  pos: 'top' | 'center' | 'bottom';
  size: number;
  color: string;
}

/** a camera pose around the object: azimuth and elevation in degrees, zoom 1 = framed */
export interface CameraKey {
  id: string;
  /** seconds from the start */
  t: number;
  az: number;
  el: number;
  zoom: number;
  variantId?: string;
}

export interface StudioObject {
  id: string;
  title: string;
  /** 'vessel' = the procedural FORM / 01 vessel; 'model' = an imported GLB/GLTF asset */
  source: { kind: 'vessel'; twist: number; height: number; waist: number } | { kind: 'model'; assetId: string };
  variants: MaterialVariant[];
  variantId: string;
  light: { preset: LightPreset; angle: number; intensity: number; hdriAssetId?: string };
  camera: { lens: number };
  background: { kind: 'studio' | 'color' | 'transparent'; color: string };
  turntable: { seconds: number };
  /** Motion mode: a camera move through keyframes, titles over it, an optional sound */
  motion?: { seconds: number; keys: CameraKey[]; titles?: MotionTitle[]; audio?: { blobKey: string; name: string } };
  /** what the object stands on in the scene */
  stage?: StageProp;
  /** the scene around it: light environment, floor, a figure for scale, a logo on the surface */
  extras?: SceneExtras;
  /** numbered points on the object with a note each, shown in the showroom */
  notes3d?: { id: string; p: [number, number, number]; text: string }[];
  /** small preview, a data URL or a static path */
  thumb?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

/* ───────── studio: canvas boards ───────── */

export type LayerKind = 'image' | 'object' | 'text' | 'rect' | 'palette';

export interface BoardLayer {
  id: string;
  kind: LayerKind;
  /** position and size in board pixels */
  x: number;
  y: number;
  w: number;
  h: number;
  rot?: number;
  opacity?: number;
  /** locked layers cannot be moved by accident; hidden ones stay out of exports and presentations */
  locked?: boolean;
  hidden?: boolean;
  assetId?: string;
  objectId?: string;
  /** image crop: how the picture fills its frame */
  fit?: 'cover' | 'contain';
  text?: string;
  size?: number;
  weight?: number;
  color?: string;
  align?: 'start' | 'center' | 'end';
  /** typeface; empty = the brand kit's heading face */
  font?: BrandFont;
  fill?: string;
  radius?: number;
  colors?: string[];
}

export interface Board {
  id: string;
  title: string;
  w: number;
  h: number;
  bg: string;
  layers: BoardLayer[];
  /** presenter notes */
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface StoryFrame {
  id: string;
  assetId: string;
  caption?: string;
  /** animatic: seconds on screen */
  duration?: number;
}

/** a tap zone on one screen that leads to another; coordinates are 0–1 of the screen */
export interface Hotspot {
  id: string;
  from: string;
  to: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** screens as a map (positions in map units) and the prototype that runs through them */
export interface Flow {
  nodes: { assetId: string; x: number; y: number }[];
  hotspots: Hotspot[];
  start?: string;
}

/* ───────── studio: site constructor ───────── */

export type SiteNodeType = 'section' | 'stack' | 'grid' | 'heading' | 'text' | 'button' | 'media' | 'object' | 'divider' | 'spacer' | 'field';
/** spacing steps: n × 4 px */
export type SiteSpace = '0' | '1' | '2' | '3' | '4' | '6' | '8' | '12' | '16' | '24' | '32';
export type SiteType = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
/** a colour role from the page theme, 'transparent', or a #hex */
export type SiteColor = string;

/** style of one node; every value comes from a token scale, so pages stay consistent */
export interface SiteStyle {
  dir?: 'row' | 'col';
  wrap?: boolean;
  cols?: number;
  gap?: SiteSpace;
  py?: SiteSpace;
  px?: SiteSpace;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between';
  text?: 'start' | 'center' | 'end';
  size?: SiteType;
  weight?: 400 | 500 | 600 | 700 | 800;
  font?: 'heading' | 'body';
  italic?: boolean;
  color?: SiteColor;
  bg?: SiteColor;
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'pill';
  border?: boolean;
  maxW?: 'full' | 'wide' | 'text' | 'narrow';
  minH?: 'none' | 'half' | 'screen';
  ratio?: 'auto' | '1/1' | '4/3' | '3/2' | '16/9' | '3/4' | '4/5';
  fit?: 'cover' | 'contain';
  span?: number;
  grow?: boolean;
  hide?: boolean;
  variant?: 'solid' | 'outline' | 'link';
}

/** how an element enters */
export type SiteEnter = 'fade' | 'rise' | 'slide' | 'zoom' | 'mask' | 'blur' | 'words' | 'count' | 'custom';
/** one keyframe of a custom entrance: `at` 0…1 of the duration */
export interface SiteKey {
  at: number;
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
  opacity?: number;
}
export interface SiteAnim {
  enter: SiteEnter;
  trigger: 'load' | 'scroll';
  /** ms */
  dur: number;
  delay: number;
  /** a curve id from the easing library */
  ease: string;
  /** px, for rise and slide */
  dist?: number;
  /** ms between children (containers) or words */
  stagger?: number;
  /** custom: play again and again */
  loop?: boolean;
  keys?: SiteKey[];
}
export interface SiteHover {
  lift?: number;
  scale?: number;
  bright?: boolean;
  shadow?: boolean;
  bg?: SiteColor;
  color?: SiteColor;
  dur?: number;
  ease?: string;
}

export interface SiteNode {
  id: string;
  type: SiteNodeType;
  /** entrance animation */
  anim?: SiteAnim;
  /** hover state */
  hover?: SiteHover;
  /** scroll depth (parallax): −0.3…0.3, how much faster or slower than the page it moves */
  depth?: number;
  /** layer name */
  name?: string;
  text?: string;
  href?: string;
  level?: 1 | 2 | 3;
  assetId?: string;
  objectId?: string;
  alt?: string;
  placeholder?: string;
  multiline?: boolean;
  /** sections: the HTML element they export as */
  tag?: 'section' | 'header' | 'footer' | 'nav' | 'article' | 'aside';
  /** desktop style; md = tablet (≤ 1023 px) and sm = phone (≤ 599 px) override it */
  s?: SiteStyle;
  md?: SiteStyle;
  sm?: SiteStyle;
  children?: SiteNode[];
}

/** colours and type of one page; kept in the page so review links and exports render it the same */
export interface SiteTheme {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  onAccent: string;
  line: string;
  heading: BrandFont;
  body: BrandFont;
  /** how round the corners are */
  round: 'sharp' | 'soft' | 'round';
}

export interface SitePage {
  id: string;
  title: string;
  slug: string;
  dir: 'ltr' | 'rtl';
  theme: SiteTheme;
  root: SiteNode[];
  /** the work its review versions go to */
  workId?: string;
  /** published on purpose at #/w/<slug> (cloud projects only) */
  published?: { slug: string; at: number };
  /** the page as it was at each review version */
  snapshots?: { versionId: string; root: SiteNode[]; theme: SiteTheme; createdAt: number }[];
  createdAt: number;
  updatedAt: number;
}

export type ProjectStatus = 'wip' | 'review' | 'approved';

export interface Project {
  id: string;
  title: string;
  brief?: string;
  kind: 'demo' | 'user';
  /** demo only: which revision of the seed this copy came from */
  seedRev?: number;
  status: ProjectStatus;
  createdAt: number;
  updatedAt: number;
  coverAssetId?: string;
  assets: Asset[];
  works: Work[];
  comments: Comment[];
  moodboard: MoodItem[];
  story: StoryFrame[];
  presentation: string[];
  portfolio: string[];
  decisions?: Decision[];
  /** 3D objects made in the studio */
  objects?: StudioObject[];
  /** compositions made in the studio's Canvas mode */
  boards?: Board[];
  /** pages built in the studio's Site mode */
  pages?: SitePage[];
  /** the project palette, picked in the studio */
  palette?: string[];
  notes?: CanvasNote[];
  groups?: CanvasGroup[];
  tags?: string[];
  /** case page: shown publicly only when published */
  caseText?: { intro?: string; outro?: string };
  /** screens and the clickable prototype through them */
  flow?: Flow;
  /** handoff: where the code lives */
  repo?: string;
  /** the story as a film: sound and how frames meet */
  animatic?: { audioAssetId?: string; fade: number; bpm?: number; beats?: number[] };
  visibility?: 'private' | 'public';
  publicSlug?: string;
  /** set once the project lives in a studio on the server */
  cloud?: { studioId: string; rev: number; syncedAt?: number };
  lastView?: string;
  lastOpenedAt?: number;
}

/** who you are on your portfolio */
/** the profession picked at first sign-in: decides templates, the tool kit shown first and the demo */
export type Discipline = 'web' | 'dev' | 'motion' | 'graphic' | 'photo' | '3d';

export interface Profile {
  discipline?: Discipline;
  name: string;
  handle: string;
  role?: string;
  bio?: string;
  /** a small square photo (WebP data URL) */
  avatar?: string;
  links?: { label: string; url: string }[];
  /** projects shown on the portfolio, in order (only published case pages appear publicly) */
  projects?: string[];
  published?: boolean;
}

export type BrandFont = 'manrope' | 'inter-tight' | 'literata' | 'instrument-serif' | 'jetbrains-mono' | 'frank-ruhl';

/** the studio's brand kit: applied to boards, case pages, presentations and the guide */
export interface Brand {
  name?: string;
  logo?: string;
  font: BrandFont;
  bodyFont?: BrandFont;
  palette: string[];
  accent?: string;
  voice?: string;
}

export interface WsState {
  v: 1;
  projects: Project[];
  profile?: Profile;
  brand?: Brand;
  /** the newest "What's new" entry you have seen */
  seenNews?: number;
  lastProjectId?: string;
  you: string;
  /** which studio new cloud projects go to */
  studioId?: string;
}
