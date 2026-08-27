export type CreativeDiscipline = 'motion' | '3d' | 'brand' | 'ui' | 'web' | 'sound';

export type ProjectFormat = 
  | 'large-featured'
  | 'cinematic-portrait'
  | 'horizontal-editorial'
  | 'layered-glass'
  | 'compact-archive'
  | 'wip-process';

export type ProjectStatusFilter = 'all' | 'exhibit' | 'wip' | 'saved' | 'mine';

export interface ProjectExhibit {
  id: string;
  title: string;
  subtitle: string;
  discipline: CreativeDiscipline;
  format: ProjectFormat;
  author: {
    id: string;
    name: string;
    handle: string;
    role: string;
    avatar: string;
  };
  coverImage: string;
  coverAlt?: string;
  galleryImages: string[];
  tags: string[];
  likesCount: number;
  savesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  isUserCreated?: boolean;
  wipProgress?: number; // 0 to 100
  year: string;
  client?: string;
  description: string;
  processNotes: string;
  colorPalette: string[];
  typographySpec: {
    headingFont: string;
    bodyFont: string;
    scale: string;
  };
  toolsUsed: string[];
  awards?: string[];
  metrics?: {
    renderTime?: string;
    fps?: string;
    polygons?: string;
    resolution?: string;
  };
}

export type StoryType = 'wip' | 'sketch' | 'process' | 'inspiration' | 'studio_note' | 'behind_the_scenes';

export interface Story {
  id: string;
  author: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    role: string;
  };
  discipline: CreativeDiscipline;
  type: StoryType;
  title: string;
  previewImage: string;
  mediaUrl: string;
  caption: string;
  timestamp: string;
  unread: boolean;
  likesCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  isUserCreated?: boolean;
}

export type WorkspaceStage = 'concept' | 'exploration' | 'production' | 'polishing' | 'delivered';

export interface WorkspaceTask {
  id: string;
  title: string;
  discipline: CreativeDiscipline;
  stage: WorkspaceStage;
  assignee: {
    name: string;
    avatar: string;
  };
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assetCount: number;
  progress: number;
  description: string;
}

export interface MoodboardItem {
  id: string;
  title: string;
  type: 'image' | 'color' | 'note' | 'material' | 'typography';
  content: string;
  meta?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  rotation?: number;
  tag: string;
  discipline: CreativeDiscipline;
}

export interface CreativeWeatherState {
  flowState: string;
  pressure: string;
  colorIndex: string;
  sonicProfile: string;
  atmosphereIndex: number;
  particleSpeed: number;
  activeAmbience: boolean;
}

export interface CreatorProfile {
  id: string;
  name: string;
  handle: string;
  role: string;
  location: string;
  bio: string;
  avatar: string;
  coverImage: string;
  stats: {
    exhibitsCount: number;
    savesCount: number;
    collabsCount: number;
    awardsCount: number;
  };
  disciplines: CreativeDiscipline[];
  tools: string[];
  availability: 'Available for commissions' | 'In studio sprint' | 'Consulting only';
  socialLinks: {
    arena?: string;
    twitter?: string;
    instagram?: string;
    github?: string;
  };
}

export interface CommentItem {
  id: string;
  projectId: string;
  author: {
    name: string;
    avatar: string;
    handle: string;
  };
  text: string;
  timestamp: string;
  discipline?: CreativeDiscipline;
}
