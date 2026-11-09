import { Project } from '../ws/types';
import { assetOf } from '../ws/store';
import { tr as t } from '../i18n';

/**
 * Builds a process Story from the project trail:
 * references that shaped decisions → first versions → the note that changed things → approved versions → the cover.
 * Captions come from the trail itself (influence notes, review notes, decisions).
 */
export function autoStory(p: Project): { assetId: string; caption?: string }[] {
  const out: { assetId: string; caption?: string }[] = [];
  const add = (assetId: string | undefined, caption?: string) => {
    if (!assetId || out.some((f) => f.assetId === assetId) || !assetOf(p, assetId)) return;
    out.push({ assetId, caption });
  };

  p.assets
    .filter((a) => a.isReference && a.influences)
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, 2)
    .forEach((a) => add(a.id, a.note || a.influences!.text));

  const works = [...p.works].sort((a, b) => a.createdAt - b.createdAt);
  for (const w of works) {
    const vs = [...w.versions].sort((a, b) => a.n - b.n);
    const first = vs[0];
    const approved = vs.find((v) => v.id === w.approvedVersionId) ?? vs[vs.length - 1];
    const turning = p.comments.filter((c) => c.workId === w.id && c.resolved).sort((a, b) => a.createdAt - b.createdAt)[0];
    if (first && first.id !== approved.id) add(first.assetId, turning ? t('v{n}: {note}', { n: first.n, note: turning.text }) : t('v{n} — first take.', { n: first.n }));
    const decision = (p.decisions ?? []).filter((d) => d.versionId === approved.id).sort((a, b) => b.createdAt - a.createdAt)[0];
    if (w.kind === 'image') add(approved.assetId, decision?.text ?? (w.approvedVersionId ? t('v{n}: approved.', { n: approved.n }) : undefined));
  }
  add(p.coverAssetId, p.title);
  return out.slice(0, 12);
}
