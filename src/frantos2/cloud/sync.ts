import { get } from 'idb-keyval';
import { RealtimeChannel } from '@supabase/supabase-js';
import { sb, getAuth } from './client';
import { ensureLoaded, patchLocal, replaceFromServer, setSyncer, ws } from '../ws/store';
import { Comment, Project } from '../ws/types';
import { tr } from '../i18n';

/**
 * Cloud sync for projects that live in a studio.
 * Local IndexedDB stays the working copy (fast, offline); the server is the shared truth.
 *  - project doc: debounced push with optimistic `rev` check; on conflict the studio copy wins
 *  - comments: individual rows, written immediately, live via Realtime
 *  - files: uploaded once to the private bucket, then read with signed URLs
 */

export type SyncState = 'off' | 'idle' | 'syncing' | 'offline' | 'conflict' | 'error';
let syncState: SyncState = sb ? 'idle' : 'off';
const ls = new Set<() => void>();
export const getSyncState = () => syncState;
export const onSync = (f: () => void) => (ls.add(f), () => ls.delete(f));
const setSync = (s: SyncState) => {
  syncState = s;
  ls.forEach((f) => f());
};
let notify: (msg: string) => void = () => {};
export const setNotifier = (f: (msg: string) => void) => (notify = f);

/** the shared part of a project; comments and personal state stay out */
export function docOf(p: Project) {
  const { comments, lastView, lastOpenedAt, cloud, ...rest } = p;
  return {
    ...rest,
    assets: p.assets.map(({ blobKey, thumbKey, ...a }) => a),
  };
}

function rowToComments(rows: any[]): Comment[] {
  const top = rows.filter((r) => !r.parent_id);
  return top.map((r) => ({
    id: r.id,
    workId: r.work_id,
    versionId: r.version_id,
    text: r.body,
    pin: r.anchor?.pin,
    area: r.anchor?.area,
    path: r.anchor?.path,
    t: r.anchor?.t,
    t2: r.anchor?.t2,
    approval: r.anchor?.approve ? true : undefined,
    isTask: r.is_task,
    author: r.author_name,
    authorId: r.author_id ?? undefined,
    guest: !!r.guest_link,
    createdAt: Date.parse(r.created_at),
    resolved: r.resolved,
    resolvedAt: r.resolved_at ? Date.parse(r.resolved_at) : undefined,
    replies: rows
      .filter((x) => x.parent_id === r.id)
      .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
      .map((x) => ({ id: x.id, text: x.body, author: x.author_name, createdAt: Date.parse(x.created_at) })),
  }));
}
export { rowToComments };

function commentRows(p: Project, c: Comment) {
  const uidv = getAuth().session?.user.id;
  const base = {
    project_id: p.id,
    work_id: c.workId,
    version_id: c.versionId,
  };
  const top = {
    ...base,
    id: c.id,
    parent_id: null,
    body: c.text,
    anchor: { pin: c.pin, area: c.area, path: c.path, t: c.t, t2: c.t2 },
    is_task: !!c.isTask,
    author_id: c.authorId ?? uidv,
    author_name: c.author,
    resolved: c.resolved,
    resolved_at: c.resolvedAt ? new Date(c.resolvedAt).toISOString() : null,
    created_at: new Date(c.createdAt).toISOString(),
  };
  const replies = c.replies.map((r) => ({
    ...base,
    id: r.id,
    parent_id: c.id,
    body: r.text,
    anchor: {},
    is_task: false,
    author_id: uidv,
    author_name: r.author,
    resolved: false,
    resolved_at: null,
    created_at: new Date(r.createdAt).toISOString(),
  }));
  return { top, replies };
}

/* ───────── files ───────── */

async function uploadMissing(p: Project) {
  if (!sb || !p.cloud) return;
  for (const a of p.assets) {
    if (a.storagePath || !a.blobKey) continue;
    const blob = (await get(a.blobKey)) as Blob | undefined;
    if (!blob) continue;
    const path = `${p.cloud.studioId}/${p.id}/${a.id}`;
    const { error } = await sb.storage.from('assets').upload(path, blob, { upsert: true, contentType: blob.type || undefined });
    if (error) throw error;
    let thumbPath: string | undefined;
    if (a.thumbKey) {
      const tb = (await get(a.thumbKey)) as Blob | undefined;
      if (tb) {
        thumbPath = `${path}.thumb.webp`;
        await sb.storage.from('assets').upload(thumbPath, tb, { upsert: true, contentType: 'image/webp' });
      }
    }
    patchLocal(p.id, (q) => ({ ...q, assets: q.assets.map((x) => (x.id === a.id ? { ...x, storagePath: path, thumbPath } : x)) }));
  }
}

/* ───────── push ───────── */

const timers = new Map<string, number>();
const pushing = new Set<string>();

async function push(pid: string) {
  if (!sb || !getAuth().session) return;
  // clients read shared projects and write comments; the project itself is the studio's (RLS refuses it anyway)
  if (getAuth().role === 'client') return;
  if (pushing.has(pid)) {
    queue(pid);
    return;
  }
  pushing.add(pid);
  setSync('syncing');
  try {
    let p = ws.project(pid);
    if (!p?.cloud) return;
    await uploadMissing(p);
    p = ws.project(pid)!;
    const rev = p.cloud!.rev;
    const { data, error } = await sb
      .from('projects')
      .update({ title: p.title, doc: docOf(p), rev: rev + 1, updated_at: new Date().toISOString(), updated_by: getAuth().session!.user.id, visibility: p.visibility ?? 'private', public_slug: p.visibility === 'public' ? p.publicSlug ?? null : null })
      .eq('id', pid)
      .eq('rev', rev)
      .select('rev')
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      // someone else saved first: take the studio copy
      await pullProject(pid);
      setSync('conflict');
      notify(tr('Someone else changed this project — showing the studio version.'));
      return;
    }
    patchLocal(pid, (q) => ({ ...q, cloud: { ...q.cloud!, rev: data.rev, syncedAt: Date.now() } }));
    setSync('idle');
  } catch (e) {
    console.warn('FrantoS sync', e);
    setSync(navigator.onLine ? 'error' : 'offline');
    queue(pid, 8000);
  } finally {
    pushing.delete(pid);
  }
}

function queue(pid: string, delay = 900) {
  window.clearTimeout(timers.get(pid));
  timers.set(pid, window.setTimeout(() => push(pid), delay));
}

async function writeComment(pid: string, op: 'upsert' | 'delete', cid: string) {
  if (!sb || !getAuth().session) return;
  const p = ws.project(pid);
  if (!p?.cloud) return;
  try {
    if (op === 'delete') {
      await sb.from('comments').delete().eq('id', cid);
      return;
    }
    const c = p.comments.find((x) => x.id === cid) ?? p.comments.find((x) => x.replies.some((r) => r.id === cid));
    if (!c) return;
    const { top, replies } = commentRows(p, c);
    const row = c.id === cid ? top : replies.find((r) => r.id === cid)!;
    await saveRow(row);
  } catch (e) {
    console.warn('FrantoS comment sync', e);
    notify(tr('A note could not be sent to the studio. It is kept here and will retry.'));
    window.setTimeout(() => writeComment(pid, op, cid), 10000);
  }
}

/** update if it exists (any author, status only), insert as me otherwise — RLS-safe */
async function saveRow(row: any) {
  const { data, error } = await sb!
    .from('comments')
    .update({ body: row.body, anchor: row.anchor, is_task: row.is_task, resolved: row.resolved, resolved_at: row.resolved_at })
    .eq('id', row.id)
    .select('id');
  if (error) throw error;
  if (data && data.length) return;
  const ins = await sb!.from('comments').insert({ ...row, author_id: getAuth().session!.user.id });
  if (ins.error) throw ins.error;
}

async function reconcile(pid: string) {
  if (!sb) return;
  const p = ws.project(pid);
  if (!p?.cloud) return;
  const rows = p.comments.flatMap((c) => {
    const { top, replies } = commentRows(p, c);
    return [top, ...replies];
  });
  const ids = rows.map((r) => r.id);
  // parents before replies
  for (const r of rows.filter((x) => !x.parent_id)) await saveRow(r).catch(() => {});
  for (const r of rows.filter((x) => x.parent_id)) await saveRow(r).catch(() => {});
  const { data } = await sb.from('comments').select('id').eq('project_id', pid);
  const stale = (data ?? []).map((r) => r.id).filter((id: string) => !ids.includes(id));
  if (stale.length) await sb.from('comments').delete().in('id', stale);
}

/* ───────── pull ───────── */

function merge(row: any, comments: Comment[]): Project {
  const local = ws.project(row.id);
  const doc = row.doc as Project;
  const keep = new Map((local?.assets ?? []).map((a) => [a.id, a]));
  return {
    ...doc,
    id: row.id,
    title: row.title,
    kind: 'user',
    assets: doc.assets.map((a) => ({ ...a, blobKey: keep.get(a.id)?.blobKey, thumbKey: keep.get(a.id)?.thumbKey })),
    comments,
    visibility: row.visibility,
    publicSlug: row.public_slug ?? undefined,
    cloud: { studioId: row.studio_id, rev: row.rev, syncedAt: Date.now() },
    lastView: local?.lastView,
    lastOpenedAt: local?.lastOpenedAt,
  };
}

export async function pullProject(pid: string) {
  if (!sb) return;
  const [{ data: row }, { data: crow }] = await Promise.all([
    sb.from('projects').select('*').eq('id', pid).maybeSingle(),
    sb.from('comments').select('*').eq('project_id', pid),
  ]);
  if (row) replaceFromServer([merge(row, rowToComments(crow ?? []))]);
}

export async function pullAll() {
  if (!sb || !getAuth().session) return;
  await ensureLoaded();
  setSync('syncing');
  try {
    const { data: rows, error } = await sb.from('projects').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    const ids = (rows ?? []).map((r) => r.id);
    const { data: crows } = ids.length ? await sb.from('comments').select('*').in('project_id', ids) : { data: [] as any[] };
    const merged: Project[] = [];
    for (const row of rows ?? []) {
      const local = ws.project(row.id);
      // never overwrite unsent local edits that are newer
      if (local?.cloud && local.cloud.rev > row.rev) continue;
      merged.push(merge(row, rowToComments((crows ?? []).filter((c) => c.project_id === row.id))));
    }
    // cloud projects that disappeared (deleted or access removed)
    const gone = ws
      .get()
      .projects.filter((p) => p.cloud && getAuth().studios.some((s) => s.id === p.cloud!.studioId) && !ids.includes(p.id))
      .map((p) => p.id);
    replaceFromServer(merged, gone);
    subscribe(ids);
    setSync('idle');
  } catch (e) {
    console.warn('FrantoS pull', e);
    setSync(navigator.onLine ? 'error' : 'offline');
  }
}

let channel: RealtimeChannel | null = null;
function subscribe(ids: string[]) {
  if (!sb) return;
  channel?.unsubscribe();
  if (!ids.length) return;
  channel = sb
    .channel('frantos-comments')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, async (payload: any) => {
      const pid = (payload.new?.project_id ?? payload.old?.project_id) as string | undefined;
      if (pid && ws.project(pid)?.cloud) {
        const { data } = await sb!.from('comments').select('*').eq('project_id', pid);
        patchLocal(pid, (p) => ({ ...p, comments: rowToComments(data ?? []) }));
      }
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects' }, (payload: any) => {
      const row = payload.new;
      const local = ws.project(row?.id);
      if (local?.cloud && row.rev > local.cloud.rev && !pushing.has(row.id)) pullProject(row.id);
    })
    .subscribe();
}

/* ───────── move a local project into a studio ───────── */

export async function moveToStudio(pid: string, studioId: string) {
  if (!sb || !getAuth().session) throw new Error('Sign in first');
  let p = ws.project(pid)!;
  // demo projects get their own id so every studio has its own copy
  if (p.kind === 'demo') {
    const id = ws.duplicate(pid, p.title);
    p = ws.project(id)!;
  }
  patchLocal(p.id, (q) => ({ ...q, kind: 'user', cloud: { studioId, rev: 0 } }));
  p = ws.project(p.id)!;
  // demo files are static URLs (public/), they don't need uploading
  await uploadMissing(p);
  p = ws.project(p.id)!;
  const { error } = await sb.from('projects').insert({ id: p.id, studio_id: studioId, title: p.title, doc: docOf(p), rev: 1, updated_by: getAuth().session!.user.id });
  if (error) {
    patchLocal(p.id, (q) => ({ ...q, cloud: undefined }));
    throw error;
  }
  patchLocal(p.id, (q) => ({ ...q, cloud: { studioId, rev: 1, syncedAt: Date.now() } }));
  await reconcile(p.id);
  subscribe(ws.get().projects.filter((x) => x.cloud).map((x) => x.id));
  return p.id;
}

export async function createReviewLink(pid: string, workId?: string, label?: string) {
  if (!sb) throw new Error('Cloud is not configured');
  const { data, error } = await sb
    .from('review_links')
    .insert({ project_id: pid, work_id: workId ?? null, label: label ?? null, created_by: getAuth().session?.user.id })
    .select('*')
    .single();
  if (error) throw error;
  return data as { id: string; token: string };
}
export async function listReviewLinks(pid: string) {
  if (!sb) return [];
  const { data } = await sb.from('review_links').select('*').eq('project_id', pid).eq('revoked', false).order('created_at', { ascending: false });
  return (data ?? []) as { id: string; token: string; work_id: string | null; label: string | null; created_at: string }[];
}
export async function revokeReviewLink(id: string) {
  await sb?.from('review_links').update({ revoked: true }).eq('id', id);
}

if (sb) {
  setSyncer({
    changed: (pid) => queue(pid),
    comment: (pid, op, cid) => writeComment(pid, op, cid),
    reconcile: (pid) => reconcile(pid),
  });
  window.addEventListener('online', () => {
    if (syncState === 'offline' || syncState === 'error') pullAll();
  });
}
