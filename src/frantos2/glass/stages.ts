import { Asset, Project, StudioObject, Work } from '../ws/types';

/**
 * The four stages are views of one project, derived from its data:
 *   collect — references and loose files
 *   make    — works without open notes and not approved yet
 *   review  — works whose current version has open notes
 *   show    — approved works, the story and the case page
 * Nothing is stored twice: answering the last note moves a work on by itself.
 */
export type Stage = 'collect' | 'make' | 'review' | 'show';
export const STAGES: Stage[] = ['collect', 'make', 'review', 'show'];
export const STAGE_LABEL: Record<Stage, string> = { collect: 'Collect', make: 'Make', review: 'Review', show: 'Show' };

export type Item =
  | { kind: 'asset'; id: string; title: string; asset: Asset }
  | { kind: 'work'; id: string; title: string; work: Work; asset?: Asset; open: number; versions: number }
  | { kind: 'story'; id: 'story'; title: string; asset?: Asset; frames: number }
  | { kind: 'case'; id: 'case'; title: string; asset?: Asset }
  | { kind: 'object'; id: string; title: string; object: StudioObject; asset?: undefined };

export const latest = (w: Work) => w.versions[w.versions.length - 1];
export const assetById = (p: Project, id?: string) => (id ? p.assets.find((a) => a.id === id) : undefined);
export const openOn = (p: Project, w: Work, versionId?: string) => p.comments.filter((c) => c.workId === w.id && c.versionId === (versionId ?? latest(w)?.id) && !c.resolved).length;

export function stageOf(p: Project, w: Work): Stage {
  if (w.approvedVersionId) return 'show';
  return openOn(p, w) > 0 ? 'review' : 'make';
}

export function itemsOf(p: Project): Record<Stage, Item[]> {
  const inWorks = new Set(p.works.flatMap((w) => w.versions.map((v) => v.assetId)));
  const out: Record<Stage, Item[]> = { collect: [], make: [], review: [], show: [] };
  const byNew = <T extends { createdAt: number }>(a: T, b: T) => b.createdAt - a.createdAt;
  for (const a of [...p.assets].sort(byNew)) {
    if (a.kind === 'model') continue;
    if (a.isReference) out.collect.push({ kind: 'asset', id: a.id, title: a.title, asset: a });
    else if (!inWorks.has(a.id)) out.make.push({ kind: 'asset', id: a.id, title: a.title, asset: a });
  }
  for (const w of [...p.works].sort(byNew)) {
    const v = w.approvedVersionId ? w.versions.find((x) => x.id === w.approvedVersionId) ?? latest(w) : latest(w);
    out[stageOf(p, w)].push({ kind: 'work', id: w.id, title: w.title, work: w, asset: assetById(p, v?.assetId), open: openOn(p, w), versions: w.versions.length });
  }
  for (const o of p.objects ?? []) out.show.push({ kind: 'object', id: o.id, title: o.title, object: o });
  const first = p.story[0];
  if (p.story.length) out.show.push({ kind: 'story', id: 'story', title: 'Story', asset: assetById(p, first?.assetId), frames: p.story.length });
  out.show.push({ kind: 'case', id: 'case', title: 'Case page', asset: assetById(p, p.coverAssetId) ?? assetById(p, first?.assetId) });
  return out;
}

/** Where to open a project: the stage that needs you most. */
export function defaultStage(items: Record<Stage, Item[]>): Stage {
  if (items.review.length) return 'review';
  if (items.make.length) return 'make';
  if (items.collect.length) return 'collect';
  return 'show';
}

export function itemImage(i: Item): Asset | undefined {
  return i.kind === 'asset' ? i.asset : i.asset;
}
