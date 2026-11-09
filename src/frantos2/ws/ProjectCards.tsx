import React, { useState } from 'react';
import { ArrowRight, Cloud, Globe, Lock, Users } from 'lucide-react';
import { Project } from './types';
import { go } from '../route';
import { tr as t, ago } from '../i18n';
import { cloudEnabled, useAuth } from '../cloud/client';
import { moveToStudio } from '../cloud/sync';
import { useStudioId, AccountButton } from '../cloud/Account';
import { toast } from './kit';

/** Where this project lives: this browser, or a studio on the server. */
export function StudioCard({ p }: { p: Project }) {
  const a = useAuth();
  const studioId = useStudioId();
  const [busy, setBusy] = useState(false);
  if (!cloudEnabled) return null;
  const studio = a.studios.find((s) => s.id === (p.cloud?.studioId ?? studioId));
  return (
    <div className="rounded-[8px] border border-[var(--rule)] p-3">
      <p className="f2-mono flex items-center gap-1.5 text-[var(--ink-2)]">
        {p.cloud ? <Cloud size={12} /> : <Lock size={12} />} {p.cloud ? t('Studio') : t('This browser only')}
      </p>
      {p.cloud ? (
        <>
          <p className="mt-1 text-[14px] font-semibold">{studio?.name ?? t('Studio')}</p>
          <p className="text-[12.5px] text-[var(--ink-2)]">{p.cloud.syncedAt ? t('Synced {when}', { when: ago(p.cloud.syncedAt) }) : t('Syncing…')}</p>
          <button onClick={() => go('/team')} className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium hover:underline">
            <Users size={13} /> {t('People and roles')}
          </button>
        </>
      ) : !a.session ? (
        <>
          <p className="mt-1 text-[13px] leading-snug text-[var(--ink-2)]">{t('Sign in to share this project with your studio and send review links to clients.')}</p>
          <div className="mt-2">
            <AccountButton />
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-[13px] leading-snug text-[var(--ink-2)]">{p.kind === 'demo' ? t('Copy this demo into {studio} to try sharing and client links.', { studio: studio?.name ?? t('your studio') }) : t('Move it to {studio}: files upload once, then everyone in the studio works on the same project.', { studio: studio?.name ?? t('your studio') })}</p>
          <button
            disabled={busy || !studioId}
            onClick={async () => {
              setBusy(true);
              try {
                const id = await moveToStudio(p.id, studioId!);
                toast(t('Project is in your studio now'));
                if (id !== p.id) go(`/p/${id}`);
              } catch (e: any) {
                toast(t('Could not move the project: {msg}', { msg: e?.message ?? '' }), { tone: 'error' });
              } finally {
                setBusy(false);
              }
            }}
            className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--ink)] px-3.5 text-[13px] font-semibold text-[var(--paper)] disabled:opacity-50"
          >
            <Cloud size={14} /> {busy ? t('Uploading…') : p.kind === 'demo' ? t('Copy to studio') : t('Move to studio')}
          </button>
        </>
      )}
    </div>
  );
}

/** The project's own "Behind the work" page. */
export function CaseCard({ p }: { p: Project }) {
  const published = p.visibility === 'public' && p.publicSlug;
  return (
    <button onClick={() => go(`/p/${p.id}/case`)} className="group flex items-center justify-between gap-3 rounded-[8px] border border-[var(--rule)] p-3 text-start hover:bg-black/[0.03]">
      <span>
        <span className="f2-mono flex items-center gap-1.5 text-[var(--ink-2)]">
          {published ? <Globe size={12} /> : <Lock size={12} />} {published ? t('Case page · published') : t('Case page · private draft')}
        </span>
        <span className="mt-1 block text-[14px] font-semibold">{t('Behind the work')}</span>
        <span className="block text-[12.5px] text-[var(--ink-2)]">{t('Your poster that opens into references, versions and decisions.')}</span>
      </span>
      <ArrowRight size={16} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
