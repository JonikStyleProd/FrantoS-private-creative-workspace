import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Check, Copy, Eye, EyeOff, Globe, Lock, LogIn } from 'lucide-react';
import '../glass/glass.css';
import { useI18n } from '../i18n';
import { go } from '../route';
import { ensureLoaded, useWs, ws } from '../ws/store';
import type { Asset, Brand, Profile, Project } from '../ws/types';
import { AssetThumb, toast } from '../ws/kit';
import { cloudEnabled, guestFiles, sb, useAuth } from '../cloud/client';
import { GlassPage } from '../glass/Shell';
import { Credits, Mark, Pane, ThemeSwitch, lgEase } from '../glass/kit';
import { DEFAULT_BRAND, fontCss } from '../studio/brand';

type Item = { key: string; title: string; brief?: string; cover?: Asset; href: string; tags?: string[] };
type Doc = { profile: Pick<Profile, 'name' | 'role' | 'bio' | 'links'>; brand: Pick<Brand, 'logo' | 'font' | 'bodyFont' | 'palette' | 'name'>; items: string[] };

const coverOf = (p: Project) => p.assets.find((a) => a.id === p.coverAssetId) ?? p.assets.find((a) => a.kind === 'image' && !a.isReference) ?? p.assets.find((a) => a.kind === 'image');

/** The portfolio itself — the same component for your preview and for the public page. */
export function FolioView({ profile, brand, items }: { profile: Doc['profile']; brand: Doc['brand']; items: Item[] }) {
  const { t } = useI18n();
  const head = fontCss(brand.font);
  const body = fontCss(brand.bodyFont ?? brand.font);
  const accent = brand.palette?.[0];
  return (
    <div style={{ fontFamily: body }}>
      <header className="grid gap-8 py-10 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] md:items-end">
        <div>
          {brand.logo && <img src={brand.logo} alt="" className="mb-6 max-h-14 max-w-[220px] object-contain" />}
          <h1 className="text-[clamp(44px,7vw,104px)] font-extrabold leading-[0.92] tracking-[-0.045em]" style={{ fontFamily: head }}>
            {profile.name || brand.name || t('Your name')}
          </h1>
          {profile.role && (
            <p className="mt-3 text-[18px] font-semibold" style={{ color: accent }}>
              {profile.role}
            </p>
          )}
        </div>
        <div>
          {profile.bio && <p className="text-[17px] leading-[1.6] text-white/85">{profile.bio}</p>}
          {!!profile.links?.length && (
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.links.filter((l) => l.url).map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noreferrer noopener" className="lg-btn lg-btn-ghost min-h-[36px] text-[13px]">
                  {l.label || l.url.replace(/^https?:\/\//, '')} <ArrowUpRight size={13} />
                </a>
              ))}
            </div>
          )}
        </div>
      </header>
      {items.length === 0 ? (
        <p className="py-16 text-center text-[16px] text-white/65">{t('No work here yet.')}</p>
      ) : (
        <ul className="grid gap-6 md:grid-cols-2">
          {items.map((it, i) => (
            <motion.li key={it.key} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.6, ease: lgEase }} className={i % 3 === 0 ? 'md:col-span-2' : ''}>
              <a href={it.href} className="group block">
                <div className={`overflow-hidden rounded-[10px] bg-white/5 ${i % 3 === 0 ? 'aspect-[16/9]' : 'aspect-[4/5]'}`}>
                  {it.cover ? <AssetThumb asset={it.cover} size="full" className="h-full w-full transition-transform duration-[1200ms] ease-out group-hover:scale-[1.035]" /> : null}
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-4">
                  <h2 className="text-[clamp(22px,2.4vw,32px)] font-bold leading-tight tracking-[-0.02em]" style={{ fontFamily: head }}>
                    {it.title}
                  </h2>
                  <ArrowUpRight size={20} className="shrink-0 opacity-60 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100" />
                </div>
                {it.brief && <p className="mt-1 max-w-[60ch] text-[15px] leading-[1.55] text-white/70">{it.brief}</p>}
              </a>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** #/portfolio — choose what goes on it, preview it, publish it (explicitly). */
export function PortfolioPage() {
  const { t } = useI18n();
  const { state } = useWs();
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [remote, setRemote] = useState<{ published: boolean; handle: string } | null>(null);
  const profile = { name: state.you !== 'You' ? state.you : '', handle: '', ...state.profile };
  const brand = { ...DEFAULT_BRAND, ...state.brand };
  const own = state.projects.filter((p) => p.kind !== 'demo' || p.id === 'form-01');
  const chosen = (profile.projects ?? own.map((p) => p.id)).filter((id) => own.some((p) => p.id === id));
  const items: Item[] = chosen.map((id) => own.find((p) => p.id === id)!).map((p) => ({ key: p.id, title: p.title, brief: p.brief, cover: coverOf(p), href: `#/p/${p.id}/case`, tags: p.tags }));
  const publicReady = chosen.map((id) => own.find((p) => p.id === id)!).filter((p) => p.visibility === 'public' && p.publicSlug && p.cloud);
  const url = profile.handle ? `${window.location.origin}/#/u/${profile.handle}` : '';

  useEffect(() => {
    if (!sb || !session) return;
    sb.from('portfolios')
      .select('handle, published')
      .eq('owner_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => data && setRemote(data as { handle: string; published: boolean }));
  }, [session]);

  const toggle = (id: string) => ws.setProfile({ projects: chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id] });
  const move = (id: string, d: number) => {
    const i = chosen.indexOf(id);
    const j = i + d;
    if (j < 0 || j >= chosen.length) return;
    const next = [...chosen];
    [next[i], next[j]] = [next[j], next[i]];
    ws.setProfile({ projects: next });
  };

  async function publish(on: boolean) {
    if (!sb || !session) return;
    if (!/^[a-z0-9][a-z0-9-]{1,31}$/.test(profile.handle)) return toast(t('Pick an address in Settings first: 2–32 letters, digits or dashes.'), { tone: 'error' });
    setBusy(true);
    try {
      const doc: Doc = {
        profile: { name: profile.name, role: profile.role, bio: profile.bio, links: profile.links },
        brand: { logo: brand.logo, font: brand.font, bodyFont: brand.bodyFont, palette: brand.palette, name: brand.name },
        items: publicReady.map((p) => p.publicSlug!),
      };
      const { error } = await sb.from('portfolios').upsert({ owner_id: session.user.id, handle: profile.handle, published: on, doc, updated_at: new Date().toISOString() });
      if (error) throw error;
      ws.setProfile({ published: on });
      setRemote({ handle: profile.handle, published: on });
      toast(on ? t('Portfolio published') : t('Portfolio is private again'));
    } catch (e) {
      toast(String((e as Error).message ?? e).includes('duplicate') ? t('That address is taken. Choose another in Settings.') : t('Publishing failed. Try again.'), { tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const live = remote?.published;
  return (
    <GlassPage kicker={t('Portfolio')} title={t('Your work, on one page')} lead={t('Choose projects and their order. Only projects whose case pages you published appear on the public page; the rest stay in your preview.')} bg="/projects/form-01/form-v2.webp" wide>
      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Pane className="space-y-3 rounded-[26px] p-4">
            <p className="flex items-center gap-2 text-[16px] font-extrabold">{live ? <Globe size={16} /> : <Lock size={16} />} {live ? t('Published') : t('Private — only you see this')}</p>
            {url && <p className="break-all font-mono text-[12.5px] text-white/70">{url}</p>}
            {!cloudEnabled ? (
              <p className="text-[13px] text-white/70">{t('Publishing needs the cloud, which is not configured on this deployment.')}</p>
            ) : !session ? (
              <button type="button" onClick={() => go('/team')} className="lg-btn lg-btn-primary">
                <LogIn size={15} /> {t('Sign in to publish')}
              </button>
            ) : (
              <>
                <div className="rounded-[16px] p-3 text-[13px] leading-[1.5] lg-soft">
                  <p className="font-bold">{t('What becomes public')}</p>
                  <p className="mt-1 text-white/75">{t('Your name, role, about, links, logo, typefaces and colours, and {n} published case pages. Notes, versions and private projects never appear.', { n: publicReady.length })}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busy} onClick={() => publish(!live)} className={`lg-btn ${live ? 'lg-btn-ghost' : 'lg-btn-primary'} disabled:opacity-50`}>
                    {live ? <EyeOff size={15} /> : <Globe size={15} />} {live ? t('Unpublish') : t('Publish')}
                  </button>
                  {live && (
                    <>
                      <button type="button" onClick={() => publish(true)} disabled={busy} className="lg-btn lg-btn-ghost">
                        <Check size={15} /> {t('Update')}
                      </button>
                      <button type="button" onClick={() => navigator.clipboard?.writeText(url).then(() => toast(t('Link copied')))} className="lg-btn lg-btn-ghost">
                        <Copy size={15} /> {t('Copy link')}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
            <button type="button" onClick={() => go('/settings')} className="lg-btn lg-btn-plain min-h-[34px] text-[12.5px]">
              {t('Name, address, about and brand → Settings')}
            </button>
          </Pane>
          <Pane className="rounded-[26px] p-3">
            <p className="lg-label px-1 pb-2">{t('Projects')}</p>
            <ul className="flex flex-col gap-1.5">
              {own.map((p) => {
                const on = chosen.includes(p.id);
                const pub = p.visibility === 'public' && !!p.cloud;
                return (
                  <li key={p.id} className={`flex items-center gap-2 rounded-[16px] p-1.5 ${on ? 'bg-white/15' : ''}`}>
                    <button type="button" role="switch" aria-checked={on} onClick={() => toggle(p.id)} className="flex min-w-0 flex-1 items-center gap-2 text-start">
                      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-[10px] bg-white/10">
                        <AssetThumb asset={coverOf(p)} className="h-full w-full" />
                      </span>
                      <span className="min-w-0">
                        <span dir="auto" className="block truncate text-[13.5px] font-bold">
                          {p.title}
                        </span>
                        <span className="block text-[11.5px] text-white/60">{pub ? t('Case page public') : t('Case page private — preview only')}</span>
                      </span>
                    </button>
                    {on && (
                      <span className="flex">
                        <button type="button" onClick={() => move(p.id, -1)} className="lg-btn lg-btn-plain h-8 min-h-0 w-8 p-0" aria-label={t('Move up')}>
                          ↑
                        </button>
                        <button type="button" onClick={() => move(p.id, 1)} className="lg-btn lg-btn-plain h-8 min-h-0 w-8 p-0" aria-label={t('Move down')}>
                          ↓
                        </button>
                      </span>
                    )}
                    {!pub && (
                      <button type="button" onClick={() => go(`/p/${p.id}/case`)} className="lg-btn lg-btn-plain h-8 min-h-0 px-2 text-[11.5px]" title={t('Open the case page to publish it')}>
                        {t('Case')}
                      </button>
                    )}
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full ${on ? 'bg-white text-[#11151a]' : 'ring-1 ring-white/30'}`} aria-hidden>
                      {on && <Check size={13} />}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Pane>
        </div>
        <Pane className="rounded-[30px] p-5 sm:p-8">
          <p className="lg-label flex items-center gap-1.5">
            <Eye size={13} /> {t('Preview')}
          </p>
          <FolioView profile={profile} brand={brand} items={items} />
        </Pane>
      </div>
    </GlassPage>
  );
}

/** #/u/:handle — the public page. Reads only a published row and published case pages. */
export function FolioPublic({ handle }: { handle: string }) {
  const { t, dir } = useI18n();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading');
  useEffect(() => void ensureLoaded(), []);
  useEffect(() => {
    if (!sb) return setState('missing');
    (async () => {
      const { data } = await sb.from('portfolios').select('doc').eq('handle', handle).eq('published', true).maybeSingle();
      if (!data) return setState('missing');
      const d = data.doc as Doc;
      setDoc(d);
      const rows = await Promise.all(
        (d.items ?? []).map(async (slug) => {
          const { data: pr } = await sb!.from('projects').select('title, doc').eq('public_slug', slug).eq('visibility', 'public').maybeSingle();
          if (!pr) return null;
          await guestFiles({ slug });
          const p = pr.doc as Project;
          return { key: slug, title: pr.title, brief: p.brief, cover: coverOf({ ...p, assets: p.assets ?? [] } as Project), href: `#/c/${slug}` } as Item;
        })
      );
      setItems(rows.filter(Boolean) as Item[]);
      setState('ok');
    })();
  }, [handle]);
  useEffect(() => {
    if (doc?.profile.name) document.title = `${doc.profile.name} — FrantoS`;
  }, [doc]);
  return (
    <div className="lg min-h-full bg-[var(--lg-bg)]" dir={dir}>
      <div className="mx-auto max-w-[1280px] px-4 pb-16 pt-4 sm:px-8">
        <div className="flex items-center justify-between">
          <Mark onClick={() => go('/')} size={15} />
          <ThemeSwitch />
        </div>
        {state === 'loading' && <p className="py-24 text-center text-white/60">{t('Opening…')}</p>}
        {state === 'missing' && (
          <div className="py-24 text-center">
            <p className="text-[28px] font-extrabold">{t('This portfolio is not public.')}</p>
            <p className="mt-2 text-white/65">{t('The link may be old, or its owner made it private.')}</p>
          </div>
        )}
        {state === 'ok' && doc && <FolioView profile={doc.profile} brand={{ ...DEFAULT_BRAND, ...doc.brand }} items={items} />}
        <Credits className="mt-16 border-t border-white/15 pt-6" />
      </div>
    </div>
  );
}
