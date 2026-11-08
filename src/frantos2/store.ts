import { useSyncExternalStore } from 'react';
import { FRAMES, FrameId } from './data';

/**
 * Visitor's own demo copy of the story.
 * Lives only in this browser (localStorage key below) and never touches
 * the legacy atelier keys (frantos_*_v2) — resetting the demo resets only this.
 */
const KEY = 'frantos2_demo_story_v1';

export interface DemoState {
  v: 1;
  story: FrameId[];
  cover: FrameId;
  updatedAt: number | null; // null = untouched seed
}

export const SEED: DemoState = {
  v: 1,
  story: ['kiosk', 'shutters', 'promenade', 'reflections', 'dawn'],
  cover: 'kiosk',
  updatedAt: null,
};

const valid = new Set(FRAMES.map((f) => f.id));

function load(): DemoState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return SEED;
    const s = JSON.parse(raw) as DemoState;
    const story = (s.story || []).filter((id) => valid.has(id));
    if (s.v !== 1 || story.length === 0) return SEED;
    const cover = story.includes(s.cover) ? s.cover : story[0];
    return { v: 1, story: Array.from(new Set(story)), cover, updatedAt: s.updatedAt ?? null };
  } catch {
    return SEED;
  }
}

let state: DemoState = typeof window === 'undefined' ? SEED : load();
let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle' as 'idle' | 'saving' | 'saved' | 'error';
const listeners = new Set<() => void>();
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
let snapshot: { state: DemoState; saveStatus: SaveStatus } = { state, saveStatus };
let saveTimer: number | undefined;

function emit() {
  snapshot = { state, saveStatus };
  listeners.forEach((l) => l());
}

function persist() {
  saveStatus = 'saving';
  emit();
  window.clearTimeout(saveTimer);
  // Write immediately (so a refresh never loses work), then confirm visually.
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    saveTimer = window.setTimeout(() => {
      saveStatus = 'saved';
      emit();
    }, 450);
  } catch {
    saveStatus = 'error';
    emit();
  }
}

function set(next: Omit<DemoState, 'v' | 'updatedAt'>) {
  state = { v: 1, ...next, updatedAt: Date.now() };
  persist();
}

export const demo = {
  get: () => state,
  addToStory(id: FrameId, at?: number) {
    if (state.story.includes(id)) return;
    const story = [...state.story];
    story.splice(at ?? story.length, 0, id);
    set({ story, cover: state.cover });
  },
  removeFromStory(id: FrameId) {
    if (!state.story.includes(id) || state.story.length <= 1) return;
    const story = state.story.filter((x) => x !== id);
    set({ story, cover: state.cover === id ? story[0] : state.cover });
  },
  move(id: FrameId, delta: number) {
    const i = state.story.indexOf(id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= state.story.length) return;
    const story = [...state.story];
    story.splice(i, 1);
    story.splice(j, 0, id);
    set({ story, cover: state.cover });
  },
  reorder(story: FrameId[]) {
    if (story.join() === state.story.join()) return;
    set({ story, cover: state.cover });
  },
  setCover(id: FrameId) {
    if (state.cover === id && state.story.includes(id)) return;
    const story = state.story.includes(id) ? state.story : [id, ...state.story];
    set({ story, cover: id });
  },
  reset() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    state = SEED;
    saveStatus = 'idle';
    emit();
  },
};

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      state = load();
      emit();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener('storage', onStorage);
  };
}

export function useDemo() {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}
