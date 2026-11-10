import React, { useEffect, useState } from 'react';
import { Briefcase, Crown, Eye, UserCog, Users } from 'lucide-react';
import { useI18n } from '../i18n';
import { go } from '../route';
import { setStudio, useWs } from '../ws/store';
import { toast } from '../ws/kit';
import { GlassPage } from '../glass/Shell';
import { Pane } from '../glass/kit';
import { Avatar } from '../glass/Avatar';
import { useMyAvatar } from '../glass/account';
import { cloudEnabled, refreshStudios, sb, useAuth } from '../cloud/client';

interface Member {
  user_id: string;
  role: 'owner' | 'editor' | 'client';
  name?: string;
  avatar?: string | null;
}

const ROLE_ICON = { owner: Crown, editor: Briefcase, client: Eye } as const;

/** The studio and the people in it, in the workspace's glass style. Accounts themselves are made on #/admin. */
export function TeamGlass() {
  const { t } = useI18n();
  const a = useAuth();
  const { state } = useWs();
  const me = useMyAvatar();
  const studio = a.studios.find((s) => s.id === state.studioId) ?? a.studios[0];
  const [members, setMembers] = useState<Member[] | null>(null);
  const [name, setName] = useState(studio?.name ?? '');
  useEffect(() => setName(studio?.name ?? ''), [studio?.id, studio?.name]);

  useEffect(() => {
    if (!sb || !studio) return;
    let live = true;
    (async () => {
      const { data: m } = await sb!.from('studio_members').select('user_id, role').eq('studio_id', studio.id);
      const ids = (m ?? []).map((x) => x.user_id);
      let profs: { id: string; name: string; avatar?: string | null }[] = [];
      if (ids.length) {
        const full = await sb!.from('profiles').select('id, name, avatar').in('id', ids);
        profs = (full.error ? (await sb!.from('profiles').select('id, name').in('id', ids)).data : full.data) ?? [];
      }
      if (live) setMembers((m ?? []).map((x: any) => ({ ...x, ...(profs.find((p) => p.id === x.user_id) ?? {}), user_id: x.user_id })));
    })();
    return () => {
      live = false;
    };
  }, [studio?.id]);

  const owner = studio?.role === 'owner';
  const roleName = (r: Member['role']) => (r === 'owner' ? t('Owner') : r === 'editor' ? t('Developer') : t('Client'));

  if (!cloudEnabled || !a.session || !studio)
    return (
      <GlassPage kicker={t('Studio & team')} title={t('Your studio')} lead={!cloudEnabled ? t('This build has no studio server.') : t('Your account is not part of a studio yet. The admin adds you.')}>
        <span />
      </GlassPage>
    );

  return (
    <GlassPage
      kicker={t('Studio & team')}
      title={studio.name}
      lead={t('Everyone here works on the studio’s projects. Clients only see the projects the admin opens to them.')}
      bg="/projects/casa-arca/lobby.webp"
      action={
        a.role === 'admin' ? (
          <button type="button" className="lg-btn lg-btn-primary" onClick={() => go('/admin')}>
            <UserCog size={16} /> {t('Accounts & access')}
          </button>
        ) : undefined
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <Pane className="rounded-[28px] p-5">
          <h2 className="mb-3 flex items-center gap-2 text-[18px] font-extrabold">
            <Users size={18} /> {t('People')}
            {members && <span className="text-[13px] font-semibold text-white/55">{members.length}</span>}
          </h2>
          {!members ? (
            <ul className="space-y-2" aria-busy>
              {[0, 1].map((i) => (
                <li key={i} className="h-[62px] animate-pulse rounded-[18px] bg-white/[0.07]" />
              ))}
            </ul>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => {
                const self = m.user_id === a.session!.user.id;
                const Icon = ROLE_ICON[m.role] ?? Eye;
                return (
                  <li key={m.user_id} className="flex items-center gap-3 rounded-[18px] bg-white/[0.08] p-3">
                    <Avatar src={self ? me : m.avatar} name={m.name ?? '?'} size={42} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-bold" dir="auto">
                        {m.name ?? '—'} {self && <span className="font-semibold text-white/55">· {t('you')}</span>}
                      </p>
                      <p className="flex items-center gap-1 text-[12.5px] text-white/65">
                        <Icon size={12} /> {roleName(m.role)}
                      </p>
                    </div>
                    {owner && !self && m.role !== 'owner' && (
                      <select
                        value={m.role}
                        aria-label={t('Role of {name}', { name: m.name ?? '' })}
                        className="lg-input min-h-[36px] w-auto py-1 text-[12.5px]"
                        onChange={async (e) => {
                          const role = e.target.value as Member['role'];
                          const { error } = await sb!.from('studio_members').update({ role }).eq('studio_id', studio.id).eq('user_id', m.user_id);
                          if (error) return toast(t('Could not change the role.'), { tone: 'error' });
                          setMembers((list) => list?.map((x) => (x.user_id === m.user_id ? { ...x, role } : x)) ?? null);
                          toast(t('Role changed'));
                        }}
                      >
                        <option value="editor">{t('Developer')}</option>
                        <option value="client">{t('Client')}</option>
                      </select>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Pane>

        <div className="space-y-5">
          {owner && (
            <Pane className="space-y-3 rounded-[28px] p-5">
              <h2 className="text-[16px] font-extrabold">{t('Studio name')}</h2>
              <form
                className="flex gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!name.trim() || name === studio.name) return;
                  const { error } = await sb!.from('studios').update({ name: name.trim().slice(0, 80) }).eq('id', studio.id);
                  if (error) return toast(t('Could not save.'), { tone: 'error' });
                  await refreshStudios();
                  toast(t('Saved'));
                }}
              >
                <input dir="auto" value={name} onChange={(e) => setName(e.target.value)} aria-label={t('Studio name')} className="lg-input min-w-0 flex-1 text-[14px]" />
                <button type="submit" disabled={!name.trim() || name === studio.name} className="lg-btn lg-btn-ghost min-h-[44px] text-[13px] disabled:opacity-50">
                  {t('Save')}
                </button>
              </form>
            </Pane>
          )}
          {a.studios.length > 1 && (
            <Pane className="space-y-2 rounded-[28px] p-5">
              <h2 className="text-[16px] font-extrabold">{t('Switch studio')}</h2>
              <div className="flex flex-wrap gap-1.5">
                {a.studios.map((s) => (
                  <button key={s.id} type="button" aria-pressed={s.id === studio.id} onClick={() => setStudio(s.id)} className={`min-h-[36px] rounded-full px-3 text-[13px] font-bold ${s.id === studio.id ? 'bg-white text-[#11151a]' : 'bg-white/10 hover:bg-white/15'}`}>
                    {s.name}
                  </button>
                ))}
              </div>
            </Pane>
          )}
          <Pane className="space-y-2.5 rounded-[28px] p-5">
            <h2 className="text-[16px] font-extrabold">{t('Who can do what')}</h2>
            {(
              [
                ['owner', t('Everything, including people and the studio name.')],
                ['editor', t('Projects, files, the studio, review and publishing.')],
                ['client', t('Sees the projects opened to them, comments and approves.')],
              ] as const
            ).map(([r, text]) => {
              const Icon = ROLE_ICON[r];
              return (
                <p key={r} className="flex gap-2.5 text-[13px] leading-[1.45] text-white/80">
                  <Icon size={15} className="mt-0.5 shrink-0" />
                  <span>
                    <b className="text-white">{roleName(r)}</b> — {text}
                  </span>
                </p>
              );
            })}
          </Pane>
        </div>
      </div>
    </GlassPage>
  );
}
