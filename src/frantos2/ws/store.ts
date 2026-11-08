import { useSyncExternalStore } from 'react';
import { get, set, del, keys } from 'idb-keyval';
import { Asset, Comment, MoodItem, Project, WsState, Work } from './types';
import { DEMO_ID, demoProject } from './seed';

/**
 * Local-first workspace store.
 * Metadata: IndexedDB key `frantos-ws-v1`. Uploaded files: IndexedDB keys `blob:<id>`.
 * Nothing leaves the browser. Undo keeps snapshots; blobs are only garbage-collected
 * on the next start, so an undone delete always gets its file back.
 */
const KEY = 'frantos-ws-v1';
export type SaveStatus = 'loading' | 'idle' | 'saving' | 'saved' | 'error';

let state: WsState = { v: 1, projects: [], you: 'You' };
let status = 'loading' as SaveStatus;
let lastSavedAt = null as number | null;
let undoStack: { label: string; snap: WsState }[] = [];
const listeners = new Set<() => void>();
let snapshot: { state: WsState; status: SaveStatus; lastSavedAt: number | null; canUndo: boolean } = { state, status, lastSavedAt, canUndo: false };

function emit() {
  snapshot = { state, status, lastSavedAt, canUndo: undoStack.length > 0 };
  listeners.forEach((l) => l());
}

export const uid = (p = '') => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

let saveTimer: number | undefined;
function schedule() {
  status = 'saving';
  emit();
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(async () => {
    try {
      await set(KEY, state);
      status = 'saved';
      lastSavedAt = Date.now();
    } catch (e) {
      console.warn('FrantoS: save failed', e);
      status = 'error';
    }
    emit();
  }, 220);
}

/** flush pending writes when the tab is hidden or closed */
if (typeof window !== 'undefined') {
  const flush = () => {
    if (status === 'saving') {
      window.clearTimeout(saveTimer);
      set(KEY, state).catch(() => {});
    }
  };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
}

let loading: Promise<void> | null = null;
export function ensureLoaded() {
  if (!loading) {
    loading = (async () => {
      try {
        const saved = (await get(KEY)) as WsState | undefined;
        if (saved && saved.v === 1 && Array.isArray(saved.projects)) {
          state = saved;
          if (!state.projects.some((p) => p.id === DEMO_ID)) state.projects.push(demoProject());
          gcBlobs();
        } else {
          state = { v: 1, projects: [demoProject()], you: 'You' };
        }
        status = 'idle';
      } catch (e) {
        console.warn('FrantoS: IndexedDB unavailable, working in memory', e);
        state = { v: 1, projects: [demoProject()], you: 'You' };
        status = 'error';
      }
      emit();
    })();
  }
  return loading;
}

async function gcBlobs() {
  try {
    const used = new Set<string>();
    state.projects.forEach((p) => p.assets.forEach((a) => (a.blobKey && used.add(a.blobKey), a.thumbKey && used.add(a.thumbKey))));
    const all = (await keys()) as string[];
    await Promise.all(all.filter((k) => typeof k === 'string' && k.startsWith('blob:') && !used.has(k)).map((k) => del(k)));
  } catch {
    /* ignore */
  }
}

/* ───────── mutation helpers ───────── */

function commit(next: WsState, undoLabel?: string) {
  if (undoLabel) {
    undoStack.push({ label: undoLabel, snap: state });
    if (undoStack.length > 25) undoStack.shift();
  }
  state = next;
  schedule();
}

function updateProject(id: string, fn: (p: Project) => Project, undoLabel?: string, touch = true) {
  const projects = state.projects.map((p) => (p.id === id ? { ...fn(p), updatedAt: touch ? Date.now() : p.updatedAt } : p));
  commit({ ...state, projects }, undoLabel);
}

export function undo(): string | null {
  const last = undoStack.pop();
  if (!last) return null;
  state = last.snap;
  schedule();
  return last.label;
}

/* ───────── public API ───────── */

export const ws = {
  get: () => state,
  project: (id: string) => state.projects.find((p) => p.id === id),

  createProject(title: string): string {
    const id = uid('p-');
    const now = Date.now();
    const p: Project = {
      id,
      title: title.trim() || 'Untitled project',
      kind: 'user',
      status: 'wip',
      createdAt: now,
      updatedAt: now,
      assets: [],
      works: [],
      comments: [],
      moodboard: [],
      story: [],
      presentation: [],
      portfolio: [],
    };
    commit({ ...state, projects: [p, ...state.projects], lastProjectId: id });
    return id;
  },

  renameProject(id: string, title: string) {
    updateProject(id, (p) => ({ ...p, title: title.trim() || p.title }));
  },

  setStatus(id: string, s: Project['status']) {
    updateProject(id, (p) => ({ ...p, status: s }));
  },

  deleteProject(id: string) {
    commit({ ...state, projects: state.projects.filter((p) => p.id !== id), lastProjectId: state.lastProjectId === id ? undefined : state.lastProjectId }, 'Project deleted');
  },

  resetDemo() {
    const projects = state.projects.map((p) => (p.id === DEMO_ID ? demoProject() : p));
    commit({ ...state, projects }, 'Demo project reset');
  },

  /** remember where the person was, for "continue where you left off" */
  visit(id: string, view: string) {
    const p = state.projects.find((x) => x.id === id);
    if (!p || (p.lastView === view && state.lastProjectId === id)) return;
    state = {
      ...state,
      lastProjectId: id,
      projects: state.projects.map((x) => (x.id === id ? { ...x, lastView: view, lastOpenedAt: Date.now() } : x)),
    };
    schedule();
  },

  /* materials */
  addAsset(pid: string, a: Asset) {
    updateProject(pid, (p) => ({ ...p, assets: [a, ...p.assets], coverAssetId: p.coverAssetId ?? (a.isReference ? undefined : a.id) }));
  },
  patchAsset(pid: string, aid: string, patch: Partial<Asset>) {
    updateProject(pid, (p) => ({ ...p, assets: p.assets.map((a) => (a.id === aid ? { ...a, ...patch } : a)) }));
  },
  deleteAsset(pid: string, aid: string) {
    updateProject(
      pid,
      (p) => {
        const works = p.works
          .map((w) => ({ ...w, versions: w.versions.filter((v) => v.assetId !== aid) }))
          .filter((w) => w.versions.length > 0)
          .map((w) => (w.approvedVersionId && !w.versions.some((v) => v.id === w.approvedVersionId) ? { ...w, approvedVersionId: undefined } : w));
        const liveVersions = new Set(works.flatMap((w) => w.versions.map((v) => v.id)));
        return {
          ...p,
          assets: p.assets.filter((a) => a.id !== aid),
          works,
          comments: p.comments.filter((c) => liveVersions.has(c.versionId)),
          moodboard: p.moodboard.filter((m) => m.assetId !== aid),
          story: p.story.filter((s) => s.assetId !== aid),
          presentation: p.presentation.filter((x) => x !== aid),
          portfolio: p.portfolio.filter((x) => x !== aid),
          coverAssetId: p.coverAssetId === aid ? p.assets.find((a) => a.id !== aid && !a.isReference)?.id : p.coverAssetId,
        };
      },
      'Material deleted'
    );
  },
  setCover(pid: string, aid: string) {
    updateProject(pid, (p) => ({ ...p, coverAssetId: aid }));
  },

  /* works & versions */
  workFromAsset(pid: string, aid: string): string {
    const p = state.projects.find((x) => x.id === pid)!;
    const existing = p.works.find((w) => w.versions.some((v) => v.assetId === aid));
    if (existing) return existing.id;
    const a = p.assets.find((x) => x.id === aid)!;
    const id = uid('w-');
    const work: Work = {
      id,
      title: a.title.replace(/\.[a-z0-9]+$/i, ''),
      kind: a.kind,
      createdAt: Date.now(),
      versions: [{ id: uid('v-'), n: 1, assetId: aid, createdAt: Date.now() }],
    };
    updateProject(pid, (q) => ({ ...q, works: [work, ...q.works], assets: q.assets.map((x) => (x.id === aid ? { ...x, isReference: false } : x)) }));
    return id;
  },
  addVersion(pid: string, wid: string, aid: string): string {
    const vid = uid('v-');
    updateProject(pid, (p) => ({
      ...p,
      status: p.status === 'approved' ? 'review' : p.status,
      works: p.works.map((w) => (w.id === wid ? { ...w, versions: [...w.versions, { id: vid, n: Math.max(0, ...w.versions.map((v) => v.n)) + 1, assetId: aid, createdAt: Date.now() }] } : w)),
    }));
    return vid;
  },
  approve(pid: string, wid: string, vid: string | undefined) {
    updateProject(pid, (p) => ({ ...p, works: p.works.map((w) => (w.id === wid ? { ...w, approvedVersionId: vid } : w)) }), vid ? undefined : 'Approval removed');
  },

  /* review */
  addComment(pid: string, c: Omit<Comment, 'id' | 'createdAt' | 'resolved' | 'replies' | 'author'>): string {
    const id = uid('c-');
    updateProject(pid, (p) => ({ ...p, comments: [...p.comments, { ...c, id, createdAt: Date.now(), resolved: false, replies: [], author: state.you }] }));
    return id;
  },
  resolve(pid: string, cid: string, resolved: boolean) {
    updateProject(pid, (p) => ({ ...p, comments: p.comments.map((c) => (c.id === cid ? { ...c, resolved, resolvedAt: resolved ? Date.now() : undefined } : c)) }));
  },
  reply(pid: string, cid: string, text: string) {
    updateProject(pid, (p) => ({
      ...p,
      comments: p.comments.map((c) => (c.id === cid ? { ...c, replies: [...c.replies, { id: uid('r-'), text, author: state.you, createdAt: Date.now() }] } : c)),
    }));
  },
  deleteComment(pid: string, cid: string) {
    updateProject(pid, (p) => ({ ...p, comments: p.comments.filter((c) => c.id !== cid) }), 'Comment deleted');
  },

  /* moodboard */
  addToMoodboard(pid: string, aid: string) {
    updateProject(pid, (p) => {
      if (p.moodboard.some((m) => m.assetId === aid)) return p;
      const n = p.moodboard.length;
      const z = Math.max(0, ...p.moodboard.map((m) => m.z)) + 1;
      const item: MoodItem = { id: uid('m-'), assetId: aid, x: 0.06 + ((n * 0.17) % 0.78), y: 0.08 + (Math.floor((n * 0.17) / 0.78) % 3) * 0.28, w: 0.16, z, rot: ((n % 5) - 2) * 0.8 };
      return { ...p, moodboard: [...p.moodboard, item] };
    });
  },
  moveMood(pid: string, id: string, patch: Partial<MoodItem>, undoLabel?: string) {
    updateProject(pid, (p) => ({ ...p, moodboard: p.moodboard.map((m) => (m.id === id ? { ...m, ...patch } : m)) }), undoLabel);
  },
  bringToFront(pid: string, id: string) {
    updateProject(pid, (p) => {
      const z = Math.max(0, ...p.moodboard.map((m) => m.z)) + 1;
      return { ...p, moodboard: p.moodboard.map((m) => (m.id === id ? { ...m, z } : m)) };
    }, undefined, false);
  },
  removeFromMoodboard(pid: string, id: string) {
    updateProject(pid, (p) => ({ ...p, moodboard: p.moodboard.filter((m) => m.id !== id) }), 'Removed from moodboard');
  },

  /* story · presentation · portfolio */
  addToStory(pid: string, aid: string, caption?: string) {
    updateProject(pid, (p) => (p.story.some((s) => s.assetId === aid) ? p : { ...p, story: [...p.story, { id: uid('s-'), assetId: aid, caption }] }));
  },
  moveStory(pid: string, id: string, d: number) {
    updateProject(pid, (p) => {
      const i = p.story.findIndex((s) => s.id === id);
      const j = i + d;
      if (i < 0 || j < 0 || j >= p.story.length) return p;
      const story = [...p.story];
      const [it] = story.splice(i, 1);
      story.splice(j, 0, it);
      return { ...p, story };
    });
  },
  captionStory(pid: string, id: string, caption: string) {
    updateProject(pid, (p) => ({ ...p, story: p.story.map((s) => (s.id === id ? { ...s, caption } : s)) }));
  },
  removeFromStory(pid: string, id: string) {
    updateProject(pid, (p) => ({ ...p, story: p.story.filter((s) => s.id !== id) }), 'Removed from story');
  },
  togglePresentation(pid: string, aid: string, on?: boolean) {
    updateProject(pid, (p) => {
      const has = p.presentation.includes(aid);
      const want = on ?? !has;
      if (want === has) return p;
      return { ...p, presentation: want ? [...p.presentation, aid] : p.presentation.filter((x) => x !== aid) };
    });
  },
  movePresentation(pid: string, aid: string, d: number) {
    updateProject(pid, (p) => {
      const i = p.presentation.indexOf(aid);
      const j = i + d;
      if (i < 0 || j < 0 || j >= p.presentation.length) return p;
      const list = [...p.presentation];
      list.splice(i, 1);
      list.splice(j, 0, aid);
      return { ...p, presentation: list };
    });
  },
  togglePortfolio(pid: string, aid: string) {
    updateProject(pid, (p) => ({ ...p, portfolio: p.portfolio.includes(aid) ? p.portfolio.filter((x) => x !== aid) : [...p.portfolio, aid] }));
  },
};

/* ───────── hooks ───────── */

function subscribe(l: () => void) {
  listeners.add(l);
  ensureLoaded();
  return () => listeners.delete(l);
}

export function useWs() {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}

export function useProject(id: string | undefined) {
  const { state: s, status: st } = useWs();
  return { project: id ? s.projects.find((p) => p.id === id) : undefined, loading: st === 'loading' };
}

/* ───────── derived ───────── */

export function assetOf(p: Project, id?: string) {
  return id ? p.assets.find((a) => a.id === id) : undefined;
}
export function openComments(p: Project) {
  return p.comments.filter((c) => !c.resolved);
}
export function versionOf(p: Project, vid: string) {
  for (const w of p.works) {
    const v = w.versions.find((x) => x.id === vid);
    if (v) return { work: w, version: v };
  }
  return undefined;
}
export function workOfAsset(p: Project, aid: string) {
  for (const w of p.works) {
    const v = w.versions.find((x) => x.assetId === aid);
    if (v) return { work: w, version: v };
  }
  return undefined;
}
