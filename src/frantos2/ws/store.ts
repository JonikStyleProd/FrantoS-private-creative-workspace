import { useSyncExternalStore } from 'react';
import { get, set, del, keys } from 'idb-keyval';
import { Asset, Board, Brand, CanvasGroup, Profile, WorkStatus, CanvasNote, Comment, Decision, MaterialVariant, MoodItem, Project, StudioObject, WsState, Work } from './types';
import { AH_ID, DEMO_ID, DEMO_REV, afterHoursProject, demoProject } from './seed';
import { SERIES_IDS, SERIES_REV, seriesProject } from './seedSeries';
import { STUDIO_IDS, STUDIO_REV, studioProject } from './seedStudio';

/** every extra demo: id → how to build it and its current revision */
const EXTRA_IDS = [...STUDIO_IDS, ...SERIES_IDS];
const extraProject = (id: string) => (STUDIO_IDS.includes(id) ? studioProject(id) : seriesProject(id));
const extraRev = (id: string) => (STUDIO_IDS.includes(id) ? STUDIO_REV : SERIES_REV);

/**
 * Local-first workspace store.
 * Metadata: IndexedDB key `frantos-ws-v1`. Uploaded files: IndexedDB keys `blob:<id>`.
 * Nothing leaves the browser. Undo keeps snapshots; blobs are only garbage-collected
 * on the next start, so an undone delete always gets its file back.
 */
const KEY = 'frantos-ws-v1';

/** set by cloud/sync.ts — keeps server copies of cloud projects in step */
export interface Syncer {
  changed: (pid: string) => void;
  comment: (pid: string, op: 'upsert' | 'delete', cid: string) => void;
  reconcile: (pid: string) => void;
}
let syncer: Syncer | null = null;
export function setSyncer(s: Syncer) {
  syncer = s;
}
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
      await set(KEY, { ...state, savedAt: Date.now() });
      localStorage.removeItem(JOURNAL);
      status = 'saved';
      lastSavedAt = Date.now();
    } catch (e) {
      console.warn('FrantoS: save failed', e);
      status = 'error';
    }
    emit();
  }, 220);
}

/**
 * Flush pending writes when the tab is hidden or closed. IndexedDB writes may not finish
 * during unload, so the latest metadata also goes to a small synchronous journal
 * (localStorage) that wins on the next start if it is newer.
 */
const JOURNAL = 'frantos-ws-journal';
if (typeof window !== 'undefined') {
  const flush = () => {
    if (status === 'saving') {
      window.clearTimeout(saveTimer);
      try {
        localStorage.setItem(JOURNAL, JSON.stringify({ at: Date.now(), state }));
      } catch {
        /* too big for localStorage: rely on IndexedDB */
      }
      set(KEY, { ...state, savedAt: Date.now() }).catch(() => {});
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
        let saved = (await get(KEY)) as (WsState & { savedAt?: number }) | undefined;
        try {
          const j = JSON.parse(localStorage.getItem(JOURNAL) ?? 'null') as { at: number; state: WsState } | null;
          if (j?.state?.v === 1 && (!saved || j.at > (saved.savedAt ?? 0))) {
            saved = j.state;
            set(KEY, { ...j.state, savedAt: Date.now() }).then(() => localStorage.removeItem(JOURNAL));
          }
        } catch {
          /* ignore a broken journal */
        }
        if (saved && saved.v === 1 && Array.isArray(saved.projects)) {
          state = saved;
          if (!state.projects.some((p) => p.id === DEMO_ID)) state.projects.push(demoProject());
          else state = { ...state, projects: state.projects.map((p) => (p.id === DEMO_ID && (p.seedRev ?? 1) < DEMO_REV ? refreshDemo(p) : p)) };
          if (!state.projects.some((p) => p.id === AH_ID)) state.projects.push(afterHoursProject());
          addSeries();
          gcBlobs();
        } else {
          state = { v: 1, projects: [demoProject(), afterHoursProject(), ...EXTRA_IDS.map(extraProject)], you: 'You' };
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

/** the extra demos (studio projects and collections): added once per browser (a deleted one stays deleted), refreshed when their files change */
function addSeries() {
  let seen: string[] = [];
  try {
    seen = JSON.parse(localStorage.getItem('frantos-series-seen') ?? '[]');
  } catch {
    /* ignore */
  }
  const add = EXTRA_IDS.filter((id) => !seen.includes(id) && !state.projects.some((p) => p.id === id));
  state = {
    ...state,
    projects: [
      ...state.projects.map((p) => (EXTRA_IDS.includes(p.id) && p.kind === 'demo' && (p.seedRev ?? 0) < extraRev(p.id) ? extraProject(p.id) : p)),
      ...add.map(extraProject),
    ],
  };
  try {
    localStorage.setItem('frantos-series-seen', JSON.stringify(EXTRA_IDS));
  } catch {
    /* ignore */
  }
}

/** Bring an older demo copy up to date: new copy for the demo's own files, the visitor's notes stay. */
function refreshDemo(p: Project): Project {
  const fresh = demoProject();
  const byId = new Map(fresh.assets.map((a) => [a.id, a]));
  return {
    ...p,
    seedRev: DEMO_REV,
    brief: fresh.brief,
    objects: p.objects?.length ? p.objects : fresh.objects,
    assets: p.assets.map((a) => {
      const f = byId.get(a.id);
      return f ? { ...a, title: f.title, note: f.note, source: f.source, influences: f.influences, w: f.w, h: f.h, src: f.src, thumb: f.thumb } : a;
    }),
  };
}

async function gcBlobs() {
  try {
    const used = new Set<string>();
    state.projects.forEach((p) => {
      p.assets.forEach((a) => (a.blobKey && used.add(a.blobKey), a.thumbKey && used.add(a.thumbKey)));
      p.comments.forEach((c) => c.audio && used.add(c.audio.blobKey));
      (p.objects ?? []).forEach((o) => o.motion?.audio && used.add(o.motion.audio.blobKey));
    });
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
  if (touch && state.projects.find((p) => p.id === id)?.cloud) syncer?.changed(id);
}

/** server → local, no undo, no echo back to the server */
export function replaceFromServer(projects: Project[], removeIds: string[] = []) {
  const byId = new Map(state.projects.map((p) => [p.id, p]));
  for (const p of projects) byId.set(p.id, p);
  removeIds.forEach((id) => byId.delete(id));
  state = { ...state, projects: Array.from(byId.values()) };
  schedule();
}
export function patchLocal(id: string, fn: (p: Project) => Project) {
  state = { ...state, projects: state.projects.map((p) => (p.id === id ? fn(p) : p)) };
  schedule();
}
export function setStudio(studioId: string) {
  state = { ...state, studioId };
  schedule();
}

export function undo(): string | null {
  const last = undoStack.pop();
  if (!last) return null;
  const before = state;
  state = last.snap;
  schedule();
  // cloud projects: send the restored state back to the studio
  for (const p of state.projects) {
    const prev = before.projects.find((x) => x.id === p.id);
    if (p.cloud && prev !== p) {
      syncer?.changed(p.id);
      syncer?.reconcile(p.id);
    }
  }
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

  resetDemo(id: string = DEMO_ID) {
    const projects = state.projects.map((p) => (p.id !== id ? p : id === DEMO_ID ? demoProject() : id === AH_ID ? afterHoursProject() : EXTRA_IDS.includes(id) ? extraProject(id) : p));
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
    updateProject(pid, (p) => ({ ...p, comments: [...p.comments, { ...c, id, createdAt: Date.now(), resolved: false, replies: [], author: state.you }] }), undefined, false);
    syncer?.comment(pid, 'upsert', id);
    return id;
  },
  resolve(pid: string, cid: string, resolved: boolean) {
    updateProject(pid, (p) => ({ ...p, comments: p.comments.map((c) => (c.id === cid ? { ...c, resolved, resolvedAt: resolved ? Date.now() : undefined } : c)) }), undefined, false);
    syncer?.comment(pid, 'upsert', cid);
  },
  setTask(pid: string, cid: string, isTask: boolean) {
    updateProject(pid, (p) => ({ ...p, comments: p.comments.map((c) => (c.id === cid ? { ...c, isTask } : c)) }), undefined, false);
    syncer?.comment(pid, 'upsert', cid);
  },
  reply(pid: string, cid: string, text: string) {
    const rid = uid('r-');
    updateProject(pid, (p) => ({
      ...p,
      comments: p.comments.map((c) => (c.id === cid ? { ...c, replies: [...c.replies, { id: rid, text, author: state.you, createdAt: Date.now() }] } : c)),
    }), undefined, false);
    syncer?.comment(pid, 'upsert', rid);
  },
  deleteComment(pid: string, cid: string) {
    updateProject(pid, (p) => ({ ...p, comments: p.comments.filter((c) => c.id !== cid) }), 'Comment deleted', false);
    syncer?.comment(pid, 'delete', cid);
  },
  setProfile(patch: Partial<Profile>) {
    commit({ ...state, profile: { name: state.you === 'You' ? '' : state.you, handle: '', ...state.profile, ...patch } });
  },
  setBrand(patch: Partial<Brand>) {
    commit({ ...state, brand: { font: 'manrope', palette: [], ...state.brand, ...patch } });
  },
  seeNews(n: number) {
    state = { ...state, seenNews: n };
    schedule();
  },
  planWork(pid: string, wid: string, patch: { due?: number | null; status?: WorkStatus }) {
    updateProject(pid, (p) => ({ ...p, works: p.works.map((w) => (w.id === wid ? { ...w, ...(patch.status ? { status: patch.status } : {}), ...(patch.due !== undefined ? { due: patch.due ?? undefined } : {}) } : w)) }), 'Plan changed');
  },
  approveAll(pid: string) {
    updateProject(pid, (p) => ({ ...p, works: p.works.map((w) => ({ ...w, approvedVersionId: w.versions[w.versions.length - 1]?.id, status: 'done' as const })) }), 'Approved all');
  },
  /** a whole project from a template */
  createFromTemplate(tpl: { title: string; brief: string; works: string[]; tags: string[]; boards: Omit<Board, 'id' | 'createdAt' | 'updatedAt'>[] }): string {
    const id = this.createProject(tpl.title);
    const now = Date.now();
    updateProject(id, (p) => ({
      ...p,
      brief: tpl.brief,
      tags: tpl.tags,
      boards: tpl.boards.map((b) => ({ ...b, id: uid('b-'), createdAt: now, updatedAt: now })),
      decisions: [...(p.decisions ?? [])],
      notes: tpl.works.map((w, i) => ({ id: uid('n-'), x: 0.06 + (i % 3) * 0.3, y: 0.08 + Math.floor(i / 3) * 0.22, w: 0.24, z: i + 1, text: w })),
    }));
    return id;
  },
  setYou(name: string) {
    state = { ...state, you: name };
    schedule();
  },

  /* decisions log: what was decided on a version and what it rests on */
  decide(pid: string, d: Omit<Decision, 'id' | 'createdAt' | 'author'>) {
    updateProject(pid, (p) => ({ ...p, decisions: [...(p.decisions ?? []), { ...d, id: uid('d-'), createdAt: Date.now(), author: state.you }] }));
  },
  removeDecision(pid: string, id: string) {
    updateProject(pid, (p) => ({ ...p, decisions: (p.decisions ?? []).filter((d) => d.id !== id) }), 'Decision removed');
  },

  /* canvas: notes, groups */
  addNote(pid: string, x: number, y: number, text = ''): string {
    const id = uid('n-');
    updateProject(pid, (p) => ({ ...p, notes: [...(p.notes ?? []), { id, x, y, w: 0.16, text, z: Math.max(0, ...p.moodboard.map((m) => m.z), ...(p.notes ?? []).map((n) => n.z)) + 1 }] }));
    return id;
  },
  patchNote(pid: string, id: string, patch: Partial<CanvasNote>) {
    updateProject(pid, (p) => ({ ...p, notes: (p.notes ?? []).map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
  },
  removeNote(pid: string, id: string) {
    updateProject(pid, (p) => ({ ...p, notes: (p.notes ?? []).filter((n) => n.id !== id) }), 'Note removed');
  },
  addGroup(pid: string, g: Omit<CanvasGroup, 'id'>): string {
    const id = uid('g-');
    updateProject(pid, (p) => ({ ...p, groups: [...(p.groups ?? []), { ...g, id }] }));
    return id;
  },
  patchGroup(pid: string, id: string, patch: Partial<CanvasGroup>) {
    updateProject(pid, (p) => ({ ...p, groups: (p.groups ?? []).map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
  },
  removeGroup(pid: string, id: string) {
    updateProject(pid, (p) => ({ ...p, groups: (p.groups ?? []).filter((g) => g.id !== id) }), 'Group removed');
  },
  linkInfluence(pid: string, refId: string, targetId: string | null, text = '') {
    updateProject(pid, (p) => ({ ...p, assets: p.assets.map((a) => (a.id === refId ? { ...a, influences: targetId ? { assetId: targetId, text: text || a.influences?.text || '' } : undefined } : a)) }));
  },
  setTags(pid: string, aid: string, tags: string[]) {
    updateProject(pid, (p) => ({ ...p, assets: p.assets.map((a) => (a.id === aid ? { ...a, tags } : a)) }));
  },
  setProjectTags(pid: string, tags: string[]) {
    updateProject(pid, (p) => ({ ...p, tags }));
  },
  setBrief(pid: string, brief: string) {
    updateProject(pid, (p) => ({ ...p, brief }));
  },
  setVisibility(pid: string, visibility: 'private' | 'public') {
    updateProject(pid, (p) => ({
      ...p,
      visibility,
      publicSlug:
        p.publicSlug ??
        `${p.title
          .toLowerCase()
          .normalize('NFKD')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 40) || 'case'}-${Math.random().toString(36).slice(2, 6)}`,
    }));
  },
  setCaseText(pid: string, caseText: Project['caseText']) {
    updateProject(pid, (p) => ({ ...p, caseText }));
  },
  /** replace the story with an ordered list (auto-story) */
  setStory(pid: string, frames: { assetId: string; caption?: string }[]) {
    updateProject(pid, (p) => ({ ...p, story: frames.map((f) => ({ id: uid('s-'), ...f })) }), 'Story replaced');
  },
  /** duplicate a project (e.g. copy the demo into a studio) */
  duplicate(pid: string, title?: string): string {
    const src = state.projects.find((p) => p.id === pid)!;
    const id = uid('p-');
    const now = Date.now();
    const copy: Project = { ...structuredClone(src), id, kind: 'user', title: title ?? src.title, createdAt: now, updatedAt: now, cloud: undefined, visibility: 'private', publicSlug: undefined, lastView: undefined };
    commit({ ...state, projects: [copy, ...state.projects] });
    return id;
  },

  /* studio objects */
  addObject(pid: string, o: Omit<StudioObject, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = uid('o-');
    const now = Date.now();
    updateProject(pid, (p) => ({ ...p, objects: [...(p.objects ?? []), { ...o, id, createdAt: now, updatedAt: now }] }), 'Object added');
    return id;
  },
  patchObject(pid: string, oid: string, patch: Partial<StudioObject>, undoLabel?: string) {
    updateProject(pid, (p) => ({ ...p, objects: (p.objects ?? []).map((o) => (o.id === oid ? { ...o, ...patch, updatedAt: Date.now() } : o)) }), undoLabel);
  },
  patchVariant(pid: string, oid: string, vid: string, patch: Partial<MaterialVariant>, undoLabel?: string) {
    updateProject(
      pid,
      (p) => ({ ...p, objects: (p.objects ?? []).map((o) => (o.id === oid ? { ...o, updatedAt: Date.now(), variants: o.variants.map((v) => (v.id === vid ? { ...v, ...patch } : v)) } : o)) }),
      undoLabel
    );
  },
  addVariant(pid: string, oid: string, from: MaterialVariant): string {
    const id = uid('mv-');
    updateProject(pid, (p) => ({ ...p, objects: (p.objects ?? []).map((o) => (o.id === oid ? { ...o, variants: [...o.variants, { ...from, id, name: from.name + ' 2' }], variantId: id } : o)) }), 'Variant added');
    return id;
  },
  removeVariant(pid: string, oid: string, vid: string) {
    updateProject(
      pid,
      (p) => ({ ...p, objects: (p.objects ?? []).map((o) => (o.id === oid && o.variants.length > 1 ? { ...o, variants: o.variants.filter((v) => v.id !== vid), variantId: o.variantId === vid ? o.variants.find((v) => v.id !== vid)!.id : o.variantId } : o)) }),
      'Variant removed'
    );
  },
  /* studio: palette and boards */
  setPalette(pid: string, palette: string[], undoLabel: string | undefined = 'Palette changed') {
    updateProject(pid, (p) => ({ ...p, palette }), undoLabel);
  },
  addBoard(pid: string, b: Omit<Board, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = uid('b-');
    const now = Date.now();
    updateProject(pid, (p) => ({ ...p, boards: [...(p.boards ?? []), { ...b, id, createdAt: now, updatedAt: now }] }), 'Board added');
    return id;
  },
  patchBoard(pid: string, bid: string, patch: Partial<Board>, undoLabel?: string) {
    updateProject(pid, (p) => ({ ...p, boards: (p.boards ?? []).map((b) => (b.id === bid ? { ...b, ...patch, updatedAt: Date.now() } : b)) }), undoLabel);
  },
  removeBoard(pid: string, bid: string) {
    updateProject(pid, (p) => ({ ...p, boards: (p.boards ?? []).filter((b) => b.id !== bid) }), 'Board removed');
  },
  removeObject(pid: string, oid: string) {
    updateProject(pid, (p) => ({ ...p, objects: (p.objects ?? []).filter((o) => o.id !== oid) }), 'Object removed');
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
