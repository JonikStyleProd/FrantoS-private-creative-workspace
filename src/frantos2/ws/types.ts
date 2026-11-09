/** FrantoS workspace data model (local-first, stored in IndexedDB). */

export type MediaKind = 'image' | 'video' | 'model';

export interface Asset {
  id: string;
  kind: MediaKind;
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

export interface Work {
  id: string;
  title: string;
  kind: MediaKind;
  versions: Version[];
  approvedVersionId?: string;
  createdAt: number;
}

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
}

export type LightPreset = 'softbox' | 'window' | 'spot' | 'rim';

export interface StudioObject {
  id: string;
  title: string;
  /** 'vessel' = the procedural FORM / 01 vessel; 'model' = an imported GLB/GLTF asset */
  source: { kind: 'vessel'; twist: number; height: number; waist: number } | { kind: 'model'; assetId: string };
  variants: MaterialVariant[];
  variantId: string;
  light: { preset: LightPreset; angle: number; intensity: number };
  camera: { lens: number };
  background: { kind: 'studio' | 'color' | 'transparent'; color: string };
  turntable: { seconds: number };
  /** small preview, a data URL or a static path */
  thumb?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface StoryFrame {
  id: string;
  assetId: string;
  caption?: string;
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
  notes?: CanvasNote[];
  groups?: CanvasGroup[];
  tags?: string[];
  /** case page: shown publicly only when published */
  caseText?: { intro?: string; outro?: string };
  visibility?: 'private' | 'public';
  publicSlug?: string;
  /** set once the project lives in a studio on the server */
  cloud?: { studioId: string; rev: number; syncedAt?: number };
  lastView?: string;
  lastOpenedAt?: number;
}

export interface WsState {
  v: 1;
  projects: Project[];
  lastProjectId?: string;
  you: string;
  /** which studio new cloud projects go to */
  studioId?: string;
}
