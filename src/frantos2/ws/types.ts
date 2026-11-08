/** FrantoS workspace data model (local-first, stored in IndexedDB). */

export type MediaKind = 'image' | 'video';

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
  /** seconds, for motion work */
  t?: number;
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
  lastView?: string;
  lastOpenedAt?: number;
}

export interface WsState {
  v: 1;
  projects: Project[];
  lastProjectId?: string;
  you: string;
}
