/**
 * FrantoS Supabase-Ready Architecture Service
 * Provides full offline-first localStorage persistence with clean abstraction
 * ready to plug into real Supabase credentials (PostgreSQL + Supabase Storage)
 * whenever configured in Settings.
 */

import { 
  ProjectExhibit, 
  Story, 
  WorkspaceTask, 
  MoodboardItem, 
  CommentItem, 
  CreativeWeatherState,
  CreatorProfile 
} from '../types';
import { 
  INITIAL_EXHIBITS, 
  INITIAL_STORIES, 
  INITIAL_WORKSPACE_TASKS, 
  INITIAL_MOODBOARD_ITEMS, 
  INITIAL_COMMENTS,
  INITIAL_WEATHER_STATE 
} from '../data/mockData';

const STORAGE_KEYS = {
  EXHIBITS: 'frantos_exhibits_v2',
  STORIES: 'frantos_stories_v2',
  TASKS: 'frantos_tasks_v2',
  MOODBOARD: 'frantos_moodboard_v2',
  COMMENTS: 'frantos_comments_v2',
  THEME: 'frantos_theme_mode',
  ACTIVE_PERSONA: 'frantos_active_persona',
  SAVED_ITEMS: 'frantos_saved_items',
  LIKED_ITEMS: 'frantos_liked_items',
  RECENTLY_VIEWED: 'frantos_recently_viewed_v2',
  WEATHER: 'frantos_weather_v2',
  PROFILES_OVERRIDE: 'frantos_profiles_override_v2',
};

export interface UploadResult {
  url: string;
  path: string;
  sizeBytes: number;
  mimeType: string;
  name: string;
}

class FrantoSStorageService {
  private getStorage<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  private setStorage<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage write failed (e.g. quota limit)', e);
    }
  }

  // --- EXHIBITS & POSTS CRUD ---

  getExhibits(): ProjectExhibit[] {
    return this.getStorage<ProjectExhibit[]>(STORAGE_KEYS.EXHIBITS, INITIAL_EXHIBITS);
  }

  saveExhibits(exhibits: ProjectExhibit[]): void {
    this.setStorage(STORAGE_KEYS.EXHIBITS, exhibits);
  }

  saveExhibit(exhibit: ProjectExhibit): ProjectExhibit[] {
    const exhibits = this.getExhibits();
    const exists = exhibits.some((e) => e.id === exhibit.id);
    let updated: ProjectExhibit[];
    if (exists) {
      updated = exhibits.map((e) => (e.id === exhibit.id ? exhibit : e));
    } else {
      updated = [exhibit, ...exhibits];
    }
    this.saveExhibits(updated);
    return updated;
  }

  createExhibit(newExhibit: ProjectExhibit): ProjectExhibit[] {
    const exhibits = [newExhibit, ...this.getExhibits()];
    this.saveExhibits(exhibits);
    return exhibits;
  }

  updateExhibit(updatedExhibit: ProjectExhibit): ProjectExhibit[] {
    const exhibits = this.getExhibits();
    const updated = exhibits.map((ex) => (ex.id === updatedExhibit.id ? updatedExhibit : ex));
    this.saveExhibits(updated);
    return updated;
  }

  deleteExhibit(exhibitId: string): ProjectExhibit[] {
    const exhibits = this.getExhibits();
    const updated = exhibits.filter((ex) => ex.id !== exhibitId);
    this.saveExhibits(updated);
    return updated;
  }

  toggleLike(exhibitId: string): ProjectExhibit[] {
    const exhibits = this.getExhibits();
    const updated = exhibits.map((ex) => {
      if (ex.id === exhibitId) {
        const isLiked = !ex.isLiked;
        return {
          ...ex,
          isLiked,
          likesCount: isLiked ? ex.likesCount + 1 : Math.max(0, ex.likesCount - 1),
        };
      }
      return ex;
    });
    this.saveExhibits(updated);
    return updated;
  }

  toggleSave(exhibitId: string): ProjectExhibit[] {
    const exhibits = this.getExhibits();
    const updated = exhibits.map((ex) => {
      if (ex.id === exhibitId) {
        const isSaved = !ex.isSaved;
        return {
          ...ex,
          isSaved,
          savesCount: isSaved ? ex.savesCount + 1 : Math.max(0, ex.savesCount - 1),
        };
      }
      return ex;
    });
    this.saveExhibits(updated);
    return updated;
  }

  // --- RECENTLY VIEWED TRACKER ---

  getRecentlyViewed(): string[] {
    return this.getStorage<string[]>(STORAGE_KEYS.RECENTLY_VIEWED, []);
  }

  addRecentlyViewed(id: string): string[] {
    const current = this.getRecentlyViewed().filter((item) => item !== id);
    const updated = [id, ...current].slice(0, 10);
    this.setStorage(STORAGE_KEYS.RECENTLY_VIEWED, updated);
    return updated;
  }

  clearRecentlyViewed(): void {
    this.setStorage(STORAGE_KEYS.RECENTLY_VIEWED, []);
  }

  // --- STORIES CRUD ---

  getStories(): Story[] {
    return this.getStorage<Story[]>(STORAGE_KEYS.STORIES, INITIAL_STORIES);
  }

  saveStories(stories: Story[]): void {
    this.setStorage(STORAGE_KEYS.STORIES, stories);
  }

  addStory(story: Story): Story[] {
    const stories = [story, ...this.getStories()];
    this.saveStories(stories);
    return stories;
  }

  toggleLikeStory(storyId: string): Story[] {
    const stories = this.getStories();
    const updated = stories.map((s) => {
      if (s.id === storyId) {
        const isLiked = !s.isLiked;
        return {
          ...s,
          isLiked,
          likesCount: isLiked ? s.likesCount + 1 : Math.max(0, s.likesCount - 1),
        };
      }
      return s;
    });
    this.saveStories(updated);
    return updated;
  }

  toggleSaveStory(storyId: string): Story[] {
    const stories = this.getStories();
    const updated = stories.map((s) => {
      if (s.id === storyId) {
        return { ...s, isSaved: !s.isSaved };
      }
      return s;
    });
    this.saveStories(updated);
    return updated;
  }

  // --- WORKSPACE SPRINT TASKS ---

  getTasks(): WorkspaceTask[] {
    return this.getStorage<WorkspaceTask[]>(STORAGE_KEYS.TASKS, INITIAL_WORKSPACE_TASKS);
  }

  saveTasks(tasks: WorkspaceTask[]): void {
    this.setStorage(STORAGE_KEYS.TASKS, tasks);
  }

  addTask(task: WorkspaceTask): WorkspaceTask[] {
    const tasks = [task, ...this.getTasks()];
    this.saveTasks(tasks);
    return tasks;
  }

  // --- SPATIAL MOODBOARD ---

  getMoodboard(): MoodboardItem[] {
    return this.getStorage<MoodboardItem[]>(STORAGE_KEYS.MOODBOARD, INITIAL_MOODBOARD_ITEMS);
  }

  saveMoodboard(items: MoodboardItem[]): void {
    this.setStorage(STORAGE_KEYS.MOODBOARD, items);
  }

  addMoodboardItem(item: MoodboardItem): MoodboardItem[] {
    const current = this.getMoodboard();
    const updated = [item, ...current];
    this.saveMoodboard(updated);
    return updated;
  }

  // --- COMMENTS ---

  getComments(projectId: string): CommentItem[] {
    const all = this.getStorage<CommentItem[]>(STORAGE_KEYS.COMMENTS, INITIAL_COMMENTS);
    return all.filter((c) => c.projectId === projectId);
  }

  addComment(comment: CommentItem): CommentItem[] {
    const all = this.getStorage<CommentItem[]>(STORAGE_KEYS.COMMENTS, INITIAL_COMMENTS);
    const updated = [comment, ...all];
    this.setStorage(STORAGE_KEYS.COMMENTS, updated);
    return updated.filter((c) => c.projectId === comment.projectId);
  }

  deleteComment(commentId: string, projectId: string): CommentItem[] {
    const all = this.getStorage<CommentItem[]>(STORAGE_KEYS.COMMENTS, INITIAL_COMMENTS);
    const updated = all.filter((c) => c.id !== commentId);
    this.setStorage(STORAGE_KEYS.COMMENTS, updated);
    return updated.filter((c) => c.projectId === projectId);
  }

  // --- CREATIVE WEATHER METEOROLOGY ---

  getWeather(): CreativeWeatherState {
    return this.getStorage<CreativeWeatherState>(STORAGE_KEYS.WEATHER, INITIAL_WEATHER_STATE);
  }

  saveWeather(weather: CreativeWeatherState): void {
    this.setStorage(STORAGE_KEYS.WEATHER, weather);
  }

  // --- PROFILES OVERRIDE (For custom avatars and names) ---

  getProfileOverride(): CreatorProfile | null {
    return this.getStorage<CreatorProfile | null>('frantos_active_profile_override_v2', null);
  }

  saveProfileOverride(profile: CreatorProfile): void {
    this.setStorage('frantos_active_profile_override_v2', profile);
  }

  getProfileOverrides(): Record<string, Partial<CreatorProfile>> {
    return this.getStorage<Record<string, Partial<CreatorProfile>>>(STORAGE_KEYS.PROFILES_OVERRIDE, {});
  }

  updateProfileOverride(profileId: string, updates: Partial<CreatorProfile>): void {
    const overrides = this.getProfileOverrides();
    overrides[profileId] = {
      ...overrides[profileId],
      ...updates,
    };
    this.setStorage(STORAGE_KEYS.PROFILES_OVERRIDE, overrides);
  }

  // --- PHOTO UPLOAD & SUPABASE STORAGE ABSTRACTION ---

  /**
   * Client-side file upload simulator designed for Demo Mode with localStorage
   * data URL storage, prepared for seamless drop-in with Supabase Storage bucket.
   */
  async uploadFile(
    file: File,
    options?: {
      maxSizeBytes?: number;
      allowedTypes?: string[];
      onProgress?: (progress: number) => void;
    }
  ): Promise<UploadResult> {
    const maxSizeBytes = options?.maxSizeBytes || 10 * 1024 * 1024; // 10MB default
    const allowedTypes = options?.allowedTypes || [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
    ];

    // 1. Validation
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      throw new Error(`Unsupported file type (${file.type}). Supported formats: JPG, PNG, WEBP, GIF, SVG.`);
    }

    if (file.size > maxSizeBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const limitMB = (maxSizeBytes / (1024 * 1024)).toFixed(0);
      throw new Error(`File is too large (${sizeMB} MB). Maximum allowed size is ${limitMB} MB.`);
    }

    // 2. Simulated Upload Progress & Base64 Reader
    return new Promise<UploadResult>((resolve, reject) => {
      const reader = new FileReader();

      // Progress emulation
      let step = 0;
      const progressInterval = setInterval(() => {
        step += 25;
        if (options?.onProgress) {
          options.onProgress(Math.min(90, step));
        }
      }, 70);

      reader.onload = () => {
        clearInterval(progressInterval);
        if (options?.onProgress) options.onProgress(100);

        const dataUrl = reader.result as string;
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const simulatedBucketPath = `frantos-vault-bucket/${Date.now()}_${sanitizedName}`;

        resolve({
          url: dataUrl,
          path: simulatedBucketPath,
          sizeBytes: file.size,
          mimeType: file.type,
          name: file.name,
        });
      };

      reader.onerror = () => {
        clearInterval(progressInterval);
        reject(new Error('Failed to read file from device filesystem.'));
      };

      reader.readAsDataURL(file);
    });
  }
}

export const frantosDB = new FrantoSStorageService();
