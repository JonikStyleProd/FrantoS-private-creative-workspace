import React, { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, GitCommitVertical, MessageSquare, Sparkles } from 'lucide-react';
import { useI18n } from '../i18n';
import { go } from '../route';
import type { Project } from '../ws/types';
import { ago } from '../ws/kit';
import { Pane } from '../glass/kit';

const KEY = 'frantos-last-visit';

/** What happened since you were last here: notes from others, approvals, new versions. Nothing new, nothing shown. */
export function ActivityFeed({ projects }: { projects: Project[] }) {
  const { t } = useI18n();
  // the visit before this one; this visit is stored as you leave (or after a minute here)
  const [since] = useState(() => {
    const v = Number(localStorage.getItem(KEY) || 0);
    return v || Date.now() - 3 * 864e5;
  });
  useEffect(() => {
    const mark = () => localStorage.setItem(KEY, String(Date.now()));
    const id = window.setTimeout(mark, 60_000);
    window.addEventListener('pagehide', mark);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('pagehide', mark);
      mark();
    };
  }, []);
  const items = useMemo(() => {
    const out: { at: number; kind: 'note' | 'approval' | 'version'; p: Project; text: string; who?: string; to: string }[] = [];
    for (const p of projects) {
      for (const c of p.comments) {
        if (c.createdAt <= since || c.author === 'You') continue;
        out.push({ at: c.createdAt, kind: c.approval ? 'approval' : 'note', p, text: c.text, who: c.author, to: `/p/${p.id}?s=review&i=${c.workId}&c=${c.id}` });
      }
      for (const w of p.works)
        for (const v of w.versions)
          if (v.createdAt > since && v.n > 1) out.push({ at: v.createdAt, kind: 'version', p, text: `${w.title} · v${v.n}${v.label ? ` · ${v.label}` : ''}`, to: `/p/${p.id}?i=${w.id}` });
    }
    return out.sort((a, b) => b.at - a.at).slice(0, 6);
  }, [projects, since]);
  if (!items.length) return null;
  const icon = { note: MessageSquare, approval: BadgeCheck, version: GitCommitVertical };
  return (
    <Pane className="mt-6 rounded-[24px] p-2" delay={0.14}>
      <p className="lg-label flex items-center gap-1.5 px-2 pb-1 pt-1">
        <Sparkles size={13} /> {t('Since your last visit')}
      </p>
      <div className="grid gap-1 md:grid-cols-2">
        {items.map((it, i) => {
          const Icon = icon[it.kind];
          return (
            <button key={i} type="button" onClick={() => go(it.to)} className="flex items-start gap-3 rounded-[16px] p-2.5 text-start hover:bg-white/10">
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${it.kind === 'approval' ? 'bg-[#7fe0a1] text-[#14171c]' : 'bg-white/15'}`}>
                <Icon size={14} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-bold text-white/65">
                  {it.p.title}
                  {it.who ? ` · ${it.who}` : ''} · {ago(it.at)}
                </span>
                <span dir="auto" className="line-clamp-2 block text-[13.5px] leading-[1.4]">
                  {it.kind === 'approval' ? t('Approved: {what}', { what: t(it.text) }) : it.kind === 'version' ? t('New version: {what}', { what: it.text }) : t(it.text)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </Pane>
  );
}
