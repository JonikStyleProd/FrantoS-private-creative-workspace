import React, { useMemo } from 'react';
import { ArrowLeft, BadgeCheck, MessageSquareQuote, Printer, Scale } from 'lucide-react';
import { useI18n } from '../i18n';
import { go } from '../route';
import { useProject } from '../ws/store';
import type { Project } from '../ws/types';
import { AssetThumb } from '../ws/kit';
import { GlassPage } from '../glass/Shell';
import { Pane } from '../glass/kit';

type Entry = { at: number; kind: 'approval' | 'decision' | 'quote'; who: string; text: string; work?: string; assetId?: string; version?: number };

/** Decision wall: every approval, decision and key client line in one dated timeline — who said yes to what, and when. */
export function DecisionsPage({ id }: { id: string }) {
  const { t } = useI18n();
  const { project: p, loading } = useProject(id);
  if (loading) return <div className="lg fixed inset-0" />;
  if (!p) return <GlassPage title={t('This project is not here.')}>{null}</GlassPage>;
  return <Wall p={p} />;
}

function entries(p: Project, you: string): Entry[] {
  const out: Entry[] = [];
  for (const w of p.works) {
    const v = w.versions.find((x) => x.id === w.approvedVersionId);
    if (v) {
      const note = p.comments.find((c) => c.approval && c.workId === w.id && c.versionId === v.id);
      out.push({ at: note?.createdAt ?? v.createdAt, kind: 'approval', who: note?.author ?? you, text: v.label ? `v${v.n} · ${v.label}` : `v${v.n}`, work: w.title, assetId: v.assetId, version: v.n });
    }
  }
  for (const d of p.decisions ?? []) {
    const w = p.works.find((x) => x.id === d.workId);
    const v = w?.versions.find((x) => x.id === d.versionId);
    out.push({ at: d.createdAt, kind: 'decision', who: d.author, text: d.text, work: w?.title, assetId: v?.assetId, version: v?.n });
  }
  // the client's own words: notes from anyone but the studio, the ones that changed something (resolved) or still stand
  for (const c of p.comments) {
    if (c.approval || c.author === 'You' || c.author === you) continue;
    const w = p.works.find((x) => x.id === c.workId);
    const v = w?.versions.find((x) => x.id === c.versionId);
    out.push({ at: c.createdAt, kind: 'quote', who: c.author, text: c.text, work: w?.title, assetId: v?.assetId, version: v?.n });
  }
  return out.sort((a, b) => b.at - a.at);
}

function Wall({ p }: { p: Project }) {
  const { t, lang } = useI18n();
  const list = useMemo(() => entries(p, 'You'), [p]);
  const approvals = list.filter((e) => e.kind === 'approval').length;
  const icon = { approval: BadgeCheck, decision: Scale, quote: MessageSquareQuote };
  const label = { approval: 'Approved', decision: 'Decision', quote: 'Client said' };
  let lastDay = '';
  return (
    <GlassPage
      kicker={t('Decision wall')}
      title={p.title}
      lead={t('{a} approvals and {n} lines from the client, newest first. What was agreed, by whom, on which version.', { a: approvals, n: list.filter((e) => e.kind === 'quote').length })}
      bg="/projects/form-01/ref-window.webp"
      action={
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => go(`/p/${p.id}`)} className="lg-btn lg-btn-ghost">
            <ArrowLeft size={15} className="rtl:-scale-x-100" /> {t('Back to the project')}
          </button>
          <button type="button" onClick={() => window.print()} className="lg-btn lg-btn-primary">
            <Printer size={15} /> {t('Print or save as PDF')}
          </button>
        </div>
      }
    >
      {list.length === 0 ? (
        <Pane className="rounded-[26px] p-8 text-center">
          <p className="text-[16px] font-bold">{t('Nothing decided yet')}</p>
          <p className="mt-1 text-[14px] text-white/70">{t('Approvals and client notes appear here as they come in.')}</p>
        </Pane>
      ) : (
        <ol className="relative space-y-3 border-s-2 border-white/20 ps-6">
          {list.map((e, i) => {
            const day = new Date(e.at).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' });
            const head = day !== lastDay;
            lastDay = day;
            const Icon = icon[e.kind];
            return (
              <li key={i}>
                {head && <p className="lg-label lg-shadow-text -ms-6 mb-2 mt-4 ps-6">{day}</p>}
                <div className="relative">
                <span className={`absolute -start-[38px] top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full ${e.kind === 'approval' ? 'bg-[#7fe0a1] text-[#14171c]' : 'bg-[#2a2f36] text-white'}`}>
                  <Icon size={14} />
                </span>
                <Pane className={`flex gap-3 rounded-[20px] p-3 ${e.kind === 'approval' ? 'ring-1 ring-[#7fe0a1]/60' : ''}`}>
                  <span hidden className={`absolute -start-[34px] mt-1 flex h-7 w-7 items-center justify-center rounded-full ${e.kind === 'approval' ? 'bg-[#7fe0a1] text-[#14171c]' : 'bg-white/20'}`}>
                    <Icon size={14} />
                  </span>
                  {e.assetId && <AssetThumb asset={p.assets.find((a) => a.id === e.assetId)} className="h-16 w-16 shrink-0 rounded-[12px]" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold text-white/60">
                      {t(label[e.kind])} · {e.who} · {new Date(e.at).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p dir="auto" className={`mt-0.5 leading-[1.45] ${e.kind === 'quote' ? 'text-[15px] italic' : 'text-[15px] font-bold'}`}>
                      {e.kind === 'quote' ? `“${t(e.text)}”` : t(e.text)}
                    </p>
                    {e.work && (
                      <p dir="auto" className="mt-1 text-[12.5px] text-white/65">
                        {e.work}
                        {e.version ? ` · v${e.version}` : ''}
                      </p>
                    )}
                  </div>
                </Pane>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </GlassPage>
  );
}
