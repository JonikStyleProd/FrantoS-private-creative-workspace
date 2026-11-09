import React, { useCallback, useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { sb, guestFiles } from './client';
import { rowToComments } from './sync';
import { Project } from '../ws/types';
import { Review, ReviewApi } from '../ws/Review';
import { useI18n } from '../i18n';
import { LangSwitch } from '../i18n/LangSwitch';
import { Wordmark } from '../ui';

/** A client opens a review link: sees the work, leaves notes, no account needed. */
export function GuestReview({ token, workId, q }: { token: string; workId?: string; q: URLSearchParams }) {
  const { t } = useI18n();
  const [state, setState] = useState<'loading' | 'ok' | 'invalid' | 'offline'>('loading');
  const [project, setProject] = useState<Project | null>(null);
  const [link, setLink] = useState<{ work_id: string | null; can_comment: boolean } | null>(null);
  const [name, setName] = useState(() => localStorage.getItem('frantos-guest-name') ?? '');

  const load = useCallback(async () => {
    if (!sb) return setState('offline');
    const { data, error } = await sb.rpc('review_open', { p_token: token });
    if (error || !data) return setState('invalid');
    await guestFiles({ token });
    const doc = data.project.doc as Project;
    const p: Project = { ...doc, id: data.project.id, title: data.project.title, kind: 'user', comments: rowToComments(data.comments ?? []) };
    if (data.link.work_id) p.works = p.works.filter((w) => w.id === data.link.work_id);
    setProject(p);
    setLink(data.link);
    setState('ok');
  }, [token]);

  useEffect(() => {
    load();
    const iv = setInterval(() => document.visibilityState === 'visible' && load(), 20000);
    return () => clearInterval(iv);
  }, [load]);

  const ensureName = () => {
    let n = name.trim();
    if (!n) {
      n = (window.prompt(t('Your name, so the studio knows who wrote the note')) ?? '').trim() || t('Guest');
      setName(n);
      localStorage.setItem('frantos-guest-name', n);
    }
    return n;
  };

  const api: ReviewApi = {
    role: 'guest',
    addComment: async (c) => {
      const n = ensureName();
      const { data, error } = await sb!.rpc('review_comment', {
        p_token: token,
        p_name: n,
        p_work: c.workId,
        p_version: c.versionId,
        p_body: c.text,
        p_anchor: { pin: c.pin, area: c.area, path: c.path, t: c.t, t2: c.t2 },
      });
      if (error) throw error;
      await load();
      return (data as { id: string }).id;
    },
    reply: async (cid, text) => {
      const p = project!;
      const parent = p.comments.find((c) => c.id === cid)!;
      const n = ensureName();
      await sb!.rpc('review_comment', { p_token: token, p_name: n, p_work: parent.workId, p_version: parent.versionId, p_body: text, p_anchor: {}, p_parent: cid });
      await load();
    },
  };

  if (state !== 'ok' || !project)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--paper)] px-6 text-center">
        <Wordmark />
        <p className="f2-display mt-4 text-[36px] leading-none">{state === 'loading' ? t('Opening the review…') : state === 'offline' ? t('This build has no studio server.') : t('This review link is not valid.')}</p>
        {state === 'invalid' && <p className="max-w-[28rem] text-[var(--ink-2)]">{t('It may have been revoked or expired. Ask the studio for a new one.')}</p>}
      </div>
    );

  return (
    <div className="flex min-h-full flex-col bg-[var(--paper)] lg:h-full lg:min-h-0">
      <header className="flex h-[58px] shrink-0 items-center justify-between gap-3 border-b border-[var(--rule)] px-4 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Wordmark small />
          <span className="h-6 w-px bg-[var(--rule)]" />
          <div className="min-w-0">
            <p className="f2-display truncate text-[20px] leading-tight">{project.title}</p>
            <p className="flex items-center gap-1 text-[11.5px] text-[var(--ink-2)]">
              <Lock size={11} /> {link?.can_comment ? t('Shared for review · you can leave notes') : t('Shared for viewing')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {name && <span className="hidden text-[12.5px] text-[var(--ink-2)] sm:inline">{t('Commenting as {name}', { name })}</span>}
          <LangSwitch />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        <Review p={project} workId={workId} q={q} api={api} basePath={`/r/${token}`} />
      </div>
    </div>
  );
}
