import React, { useCallback, useEffect, useState } from 'react';
import { Check, Lock, Play } from 'lucide-react';
import { PrototypePlayer, screensOf } from '../kits/FlowPage';
import { sb, guestFiles } from './client';
import { rowToComments } from './sync';
import { Project } from '../ws/types';
import { Review, ReviewApi } from '../ws/Review';
import { useI18n } from '../i18n';
import { Backdrop, GlassLang, Mark, Pane } from '../glass/kit';
import { useAssetUrl } from '../ws/media';
import '../glass/glass.css';

/** A client opens a review link: sees the work, leaves notes, no account needed. */
export function GuestReview({ token, workId, q }: { token: string; workId?: string; q: URLSearchParams }) {
  const { t, dir } = useI18n();
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

  // the same link opens the clickable prototype when the project has one (?proto=1 opens it straight away)
  const [proto, setProto] = useState(() => q.get('proto') === '1');
  const hasProto = !!project && screensOf(project).length > 0 && (project.flow?.hotspots.length ?? 0) > 0;

  // the client says yes: one approval note per work, on its newest version — the studio confirms it
  const [approving, setApproving] = useState(false);
  const approved = (wid: string, vid: string) => project?.comments.some((c) => c.approval && c.workId === wid && c.versionId === vid);
  const pending = (project?.works ?? []).map((w) => ({ w, v: [...w.versions].sort((a, b) => b.n - a.n)[0] })).filter(({ w, v }) => v && !approved(w.id, v.id));
  const approveAll = async () => {
    if (!project || !pending.length) return;
    const n = ensureName();
    setApproving(true);
    try {
      for (const { w, v } of pending) await sb!.rpc('review_comment', { p_token: token, p_name: n, p_work: w.id, p_version: v.id, p_body: t('Approved v{n}', { n: v.n }), p_anchor: { approve: true } });
      await load();
    } finally {
      setApproving(false);
    }
  };

  if (state !== 'ok' || !project)
    return (
      <div className="lg fixed inset-0 flex items-center justify-center p-5" dir={dir}>
        <Backdrop src="/projects/form-01/ref-window.webp" tint={0.6} blur />
        <Pane strong className="relative max-w-[440px] rounded-[30px] p-7 text-center sm:p-9" role={state === 'loading' ? 'status' : undefined}>
          <div className="flex justify-center">
            <Mark size={20} />
          </div>
          <p className="mt-6 text-[26px] font-extrabold leading-[1.05] tracking-[-0.03em]">{state === 'loading' ? t('Opening the review…') : state === 'offline' ? t('This build has no studio server.') : t('This review link is not valid.')}</p>
          {state === 'invalid' && <p className="mt-3 text-[14.5px] leading-[1.5] text-white/75">{t('It may have been revoked or expired. Ask the studio for a new one.')}</p>}
          {state !== 'loading' && (
            <a href="#/" className="lg-btn lg-btn-ghost mt-6">
              {t('What is FrantoS?')}
            </a>
          )}
        </Pane>
      </div>
    );

  const cover = project.assets.find((a) => a.id === project.coverAssetId) ?? project.assets.find((a) => !a.isReference);
  return (
    <div className="lg f2-glass relative flex min-h-full flex-col lg:h-full lg:min-h-0" dir={dir}>
      <div className="pointer-events-none fixed inset-0">
        <CoverBackdrop asset={cover} />
      </div>
      <header className="sticky top-0 z-30 shrink-0 px-3 pb-2 pt-3 md:px-5">
        <Pane className="flex flex-wrap items-center gap-2 rounded-[28px] p-1.5 sm:rounded-full">
          <a href="#/" className="flex min-h-[40px] shrink-0 items-center px-2.5" aria-label="FrantoS">
            <Mark size={15} compact />
          </a>
          <div className="min-w-0 flex-1">
            <p dir="auto" className="truncate text-[15px] font-extrabold leading-tight tracking-[-0.01em]">
              {project.title}
            </p>
            <p className="flex items-center gap-1 truncate text-[11.5px] text-white/65">
              <Lock size={11} className="shrink-0" /> {link?.can_comment ? t('Shared for review · you can leave notes') : t('Shared for viewing')}
              {name && <span className="hidden md:inline">&nbsp;· {t('Commenting as {name}', { name })}</span>}
            </p>
          </div>
          <div className="shrink-0 max-sm:order-1">
            <GlassLang />
          </div>
          <div className="flex items-center gap-1.5 max-sm:order-2 max-sm:w-full max-sm:justify-end">
            {hasProto && (
              <button type="button" onClick={() => setProto(true)} className="lg-btn lg-btn-ghost min-h-[40px] px-3.5 text-[13px]">
                <Play size={14} /> {t('Prototype')}
              </button>
            )}
            {link?.can_comment &&
              (pending.length ? (
                <button type="button" disabled={approving} onClick={approveAll} className="lg-btn lg-btn-primary min-h-[40px] px-4 text-[13px] disabled:opacity-60 max-sm:flex-1">
                  <Check size={15} /> {project.works.length > 1 ? t('Approve all ({n})', { n: pending.length }) : t('Approve')}
                </button>
              ) : (
                <span className="lg-soft inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold">
                  <Check size={14} /> {t('Approved — thank you')}
                </span>
              ))}
          </div>
        </Pane>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        <Review p={project} workId={workId} q={q} api={api} basePath={`/r/${token}`} />
      </div>
      {proto && hasProto && (
        <div className="fixed inset-0 z-[90]">
          <PrototypePlayer p={project} onExit={() => setProto(false)} />
        </div>
      )}
    </div>
  );
}

function CoverBackdrop({ asset }: { asset?: Project['assets'][number] }) {
  const { url } = useAssetUrl(asset, 'thumb');
  return <Backdrop src={url} tint={0.62} blur />;
}
