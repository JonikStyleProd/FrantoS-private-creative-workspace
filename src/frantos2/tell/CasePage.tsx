import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowLeft, Copy, Globe, Lock, Printer, RotateCcw } from 'lucide-react';
import { Project } from '../ws/types';
import { assetOf, useProject, ws } from '../ws/store';
import { AssetThumb, toast } from '../ws/kit';
import { WorkCanvas } from '../ws/WorkCanvas';
import { useAssetUrl } from '../ws/media';
import { go } from '../route';
import { ago, tr as t } from '../i18n';
import { LangSwitch } from '../i18n/LangSwitch';
import { Wordmark } from '../ui';
import { cloudEnabled, guestFiles, sb, useAuth } from '../cloud/client';

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * "Behind the work" for any project: the finished piece first, then the reverse side —
 * what shaped it, how it changed, what was decided. Client notes never appear here.
 * Owner view: /#/p/:id/case (edit, publish, print). Public view: /#/c/:slug.
 */
export function CasePage({ projectId, slug }: { projectId?: string; slug?: string }) {
  const own = useProject(projectId);
  const [pub, setPub] = useState<Project | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>(projectId ? 'ok' : 'loading');

  useEffect(() => {
    if (!slug) return;
    if (!sb) return setState('missing');
    (async () => {
      const { data } = await sb.from('projects').select('id, title, doc').eq('public_slug', slug).eq('visibility', 'public').maybeSingle();
      if (!data) return setState('missing');
      await guestFiles({ slug });
      setPub({ ...(data.doc as Project), id: data.id, title: data.title, comments: [] });
      setState('ok');
    })();
  }, [slug]);

  const p = projectId ? own.project : pub;
  if (own.loading || state === 'loading') return <div className="flex h-full items-center justify-center bg-[var(--paper)] text-[var(--ink-2)]">{t('Opening…')}</div>;
  if (!p || state === 'missing')
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--paper)] px-6 text-center">
        <Wordmark />
        <p className="f2-display mt-4 text-[36px]">{t('This case page is not public.')}</p>
      </div>
    );
  return <Case p={p} owner={!!projectId} />;
}

function Case({ p, owner }: { p: Project; owner: boolean }) {
  const auth = useAuth();
  const cover = assetOf(p, p.coverAssetId) ?? p.assets.find((a) => !a.isReference);
  const [flipped, setFlipped] = useState(false);
  const shaped = p.assets.filter((a) => a.isReference && a.influences && assetOf(p, a.influences.assetId));
  const changed = p.works.filter((w) => w.kind === 'image' && w.versions.length > 1);
  const decisions = [...(p.decisions ?? [])].sort((a, b) => a.createdAt - b.createdAt);
  const finals = (p.presentation.length ? p.presentation : p.portfolio).map((id) => assetOf(p, id)).filter(Boolean) as NonNullable<ReturnType<typeof assetOf>>[];
  const refsBack = p.assets.filter((a) => a.isReference).slice(0, 4);
  const publicUrl = p.publicSlug ? `${window.location.origin}/#/c/${p.publicSlug}` : '';
  const canPublish = owner && cloudEnabled && !!auth.session && !!p.cloud;

  const reveal = () => {
    setFlipped(true);
    setTimeout(() => document.getElementById('reverse')?.scrollIntoView({ behavior: 'smooth' }), 650);
  };

  return (
    <div className="f2-paper min-h-full print:bg-white">
      <header className="sticky top-0 z-30 border-b border-[var(--rule)] bg-[var(--paper)]/95 backdrop-blur print:hidden">
        <div className="mx-auto flex h-[58px] max-w-[1280px] items-center justify-between gap-3 px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {owner ? (
              <a href={`#/p/${p.id}`} className="inline-flex items-center gap-1.5 rounded-full px-2 py-2 hover:bg-black/5" aria-label={t('Back to project')}>
                <ArrowLeft size={16} className="text-[var(--ink-2)]" /> <Wordmark small />
              </a>
            ) : (
              <a href="#/" aria-label="FrantoS">
                <Wordmark small />
              </a>
            )}
            {owner && (
              <span className="hidden items-center gap-1 text-[12px] text-[var(--ink-2)] sm:inline-flex">
                {p.visibility === 'public' ? <Globe size={12} /> : <Lock size={12} />}
                {p.visibility === 'public' ? t('Published') : t('Private draft — only you see this')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <LangSwitch />
            <button onClick={() => window.print()} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--rule)] px-3 text-[13px] font-medium hover:bg-black/[0.04]" title={t('Print or save as PDF')}>
              <Printer size={14} /> <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </header>

      {owner && (
        <div className="mx-auto mt-4 max-w-[1280px] px-4 md:px-8 print:hidden">
          <div className="flex flex-col gap-3 rounded-[10px] border border-[var(--rule)] bg-white/30 p-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-[44rem] text-[13px] leading-relaxed">
              <p className="font-semibold">{p.visibility === 'public' ? t('This page is public.') : t('Before you publish: what becomes public')}</p>
              <p className="text-[var(--ink-2)]">{t('Cover, references with their notes, version comparisons, decisions and the presentation. Review discussion, client notes and other projects stay private.')}</p>
              {!cloudEnabled || !auth.session ? <p className="mt-1 text-[var(--ink-2)]">{t('Publishing needs the studio server: sign in and move the project to your studio.')}</p> : !p.cloud ? <p className="mt-1 text-[var(--ink-2)]">{t('Move the project to your studio (Overview) to publish it.')}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {p.visibility === 'public' && publicUrl && (
                <button onClick={() => navigator.clipboard?.writeText(publicUrl).then(() => toast(t('Copied')))} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--rule)] px-3 text-[13px]">
                  <Copy size={13} /> {t('Copy public link')}
                </button>
              )}
              <button
                disabled={!canPublish}
                onClick={() => {
                  const next = p.visibility === 'public' ? 'private' : 'public';
                  if (next === 'public' && !window.confirm(t('Publish this case page? Anyone with the link will see it.'))) return;
                  ws.setVisibility(p.id, next);
                  toast(next === 'public' ? t('Published') : t('Unpublished — the link no longer opens'));
                }}
                className="f2-btn !min-h-[38px] !px-4 !text-[13.5px] disabled:opacity-40"
                style={{ background: p.visibility === 'public' ? 'transparent' : 'var(--signal)', color: 'var(--ink)', border: p.visibility === 'public' ? '1px solid var(--ink)' : 'none' }}
              >
                <Globe size={14} /> {p.visibility === 'public' ? t('Unpublish') : t('Publish')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* the finished side */}
      <section className="mx-auto grid max-w-[1280px] items-center gap-10 px-4 py-10 md:px-8 lg:min-h-[78vh] lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="f2-mono text-[var(--ink-2)]">{t('Case')} · {new Date(p.updatedAt).getFullYear()}</p>
          <h1 className="f2-display mt-4 text-[clamp(3rem,7vw,6.2rem)]">{p.title}</h1>
          <Editable owner={owner} value={p.caseText?.intro ?? p.brief ?? ''} placeholder={t('One or two sentences: the brief and what you made.')} onSave={(v) => ws.setCaseText(p.id, { ...p.caseText, intro: v })} className="mt-5 max-w-[34rem] text-[17px] leading-relaxed text-[var(--ink-2)]" />
          <button onClick={reveal} className="f2-btn f2-btn-ghost mt-8 print:hidden">
            <RotateCcw size={16} className="-scale-x-100" /> {t('Behind the work')} <ArrowDown size={15} />
          </button>
        </div>
        <div className="lg:col-span-7" style={{ perspective: 2000 }}>
          <motion.div className="relative mx-auto aspect-[4/5] w-full max-w-[560px]" style={{ transformStyle: 'preserve-3d', transformOrigin: '0% 50%' }} animate={{ rotateY: flipped ? -180 : 0, x: flipped ? '100%' : 0 }} transition={{ duration: 1.2, ease: [0.5, 0, 0.2, 1] }}>
            <div className="absolute inset-0 overflow-hidden rounded-[3px] bg-[var(--graphite)] shadow-[0_50px_90px_-40px_rgba(21,19,15,0.65)]" style={{ backfaceVisibility: 'hidden' }}>
              <AssetThumb asset={cover} size="full" className="h-full w-full" alt={cover?.title} />
            </div>
            {/* the reverse side of the print: its references */}
            <div className="absolute inset-0 grid grid-cols-2 gap-[3%] rounded-[3px] bg-[#e3dccf] p-[5%]" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              {refsBack.map((a) => (
                <div key={a.id} className="overflow-hidden rounded-[2px] bg-white">
                  <AssetThumb asset={a} className="h-full w-full" />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <div id="reverse" />

      {shaped.length > 0 && (
        <Section n="01" title={t('What shaped it')}>
          <div className="grid gap-5 md:grid-cols-2">
            {shaped.map((r) => {
              const target = assetOf(p, r.influences!.assetId)!;
              return (
                <figure key={r.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[8px] bg-[var(--paper-2)] p-4 print:break-inside-avoid">
                  <Thumb a={r} />
                  <span aria-hidden className="text-[18px]">→</span>
                  <Thumb a={target} />
                  <figcaption className="col-span-3 border-t border-[var(--rule)] pt-3 text-[15px] leading-snug">
                    <span className="f2-mono me-2 text-[var(--ink-2)]">{r.title} →</span>
                    {r.influences!.text}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </Section>
      )}

      {changed.length > 0 && (
        <Section n={shaped.length ? '02' : '01'} title={t('How it changed')} dark>
          <div className="flex flex-col gap-14">
            {changed.map((w) => {
              const vs = [...w.versions].sort((a, b) => a.n - b.n);
              const first = vs[0];
              const fin = vs.find((v) => v.id === w.approvedVersionId) ?? vs[vs.length - 1];
              return <Changed key={w.id} p={p} title={w.title} aId={first.assetId} bId={fin.assetId} la={`v${first.n}${first.label ? ` · ${first.label}` : ''}`} lb={`v${fin.n}${fin.label ? ` · ${fin.label}` : ''}`} decisions={decisions.filter((d) => d.workId === w.id)} />;
            })}
          </div>
        </Section>
      )}

      {decisions.length > 0 && (
        <Section n={String([shaped.length, changed.length].filter(Boolean).length + 1).padStart(2, '0')} title={t('Decisions')}>
          <ol className="flex max-w-[52rem] flex-col gap-6 border-s border-[var(--rule)] ps-6">
            {decisions.map((d) => (
              <li key={d.id} className="relative print:break-inside-avoid">
                <span className="absolute -start-[29px] top-2 h-3 w-3 rounded-full bg-[var(--ink)]" />
                <p className="f2-mono text-[var(--ink-2)]">
                  {p.works.find((w) => w.id === d.workId)?.title} · {ago(d.createdAt)}
                </p>
                <p className="f2-display mt-1 text-[clamp(1.5rem,2.6vw,2.2rem)] leading-tight">{d.text}</p>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {finals.length > 0 && (
        <Section n="→" title={t('The work')}>
          <div className="flex flex-col gap-8">
            {finals.map((a) => (
              <FinalMedia key={a.id} a={a} />
            ))}
          </div>
        </Section>
      )}

      <section className="mx-auto max-w-[1280px] px-4 py-16 md:px-8">
        <Editable owner={owner} value={p.caseText?.outro ?? ''} placeholder={t('A closing line: result, credits, thanks.')} onSave={(v) => ws.setCaseText(p.id, { ...p.caseText, outro: v })} className="f2-display max-w-[24ch] text-[clamp(2rem,4vw,3.4rem)] leading-tight" />
        <p className="mt-10 text-[12.5px] text-[var(--ink-2)]">{t('Made in FrantoS — the private workspace behind the work.')}</p>
      </section>
    </div>
  );
}

function Section({ n, title, children, dark }: { n: string; title: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <section className={dark ? 'bg-[var(--graphite)] text-[#f3efe7] print:bg-white print:text-black' : 'border-t border-[var(--rule)]'}>
      <div className="mx-auto max-w-[1280px] px-4 py-16 md:px-8 md:py-24">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, ease }}>
          <p className="f2-mono" style={{ color: dark ? 'var(--fog)' : 'var(--ink-2)' }}>
            {n}
          </p>
          <h2 className="f2-display mb-10 mt-3 text-[clamp(2.2rem,4.4vw,3.8rem)]">{title}</h2>
        </motion.div>
        {children}
      </div>
    </section>
  );
}

function Thumb({ a }: { a: NonNullable<ReturnType<typeof assetOf>> }) {
  return (
    <div>
      <div className="aspect-[4/5] overflow-hidden rounded-[3px] bg-[var(--graphite)]">
        <AssetThumb asset={a} className="h-full w-full" alt={a.title} />
      </div>
      <p className="mt-1.5 truncate text-[12.5px] font-medium">{a.title}</p>
    </div>
  );
}

function Changed({ p, title, aId, bId, la, lb, decisions }: { p: Project; title: string; aId: string; bId: string; la: string; lb: string; decisions: { id: string; text: string }[] }) {
  const a = assetOf(p, aId)!;
  const b = assetOf(p, bId)!;
  const [split, setSplit] = useState(55);
  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:items-center print:break-inside-avoid">
      <div className="lg:col-span-4">
        <p className="f2-display text-[30px] leading-none">{title}</p>
        {decisions.map((d) => (
          <p key={d.id} className="mt-4 text-[16px] leading-relaxed text-[var(--fog)]">
            {d.text}
          </p>
        ))}
        <p className="f2-mono mt-4 text-[var(--fog)] print:hidden">{t('Drag the divider')}</p>
      </div>
      <div className="relative mx-auto aspect-[4/5] w-full max-w-[600px] lg:col-span-8">
        <WorkCanvas a={a} b={b} split={split} onSplit={setSplit} pins={[]} labelA={`A · ${la}`} labelB={`B · ${lb}`} />
      </div>
    </div>
  );
}

function FinalMedia({ a }: { a: NonNullable<ReturnType<typeof assetOf>> }) {
  const { url } = useAssetUrl(a, 'full');
  return (
    <figure className="print:break-inside-avoid">
      {a.kind === 'video' ? (
        <video src={url} autoPlay muted loop playsInline className="mx-auto max-h-[86vh] w-auto rounded-[3px]" />
      ) : (
        <img src={url} alt={a.title} loading="lazy" className="mx-auto max-h-[86vh] w-auto rounded-[3px] shadow-[0_40px_80px_-40px_rgba(21,19,15,0.55)]" />
      )}
      <figcaption className="f2-mono mt-3 text-center text-[var(--ink-2)]">{a.title}</figcaption>
    </figure>
  );
}

function Editable({ owner, value, placeholder, onSave, className }: { owner: boolean; value: string; placeholder: string; onSave: (v: string) => void; className?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  if (!owner) return value ? <p className={className}>{value}</p> : null;
  return (
    <>
      <p className={`${className} hidden whitespace-pre-wrap print:block`}>{v}</p>
    <textarea
      value={v}
      rows={Math.max(2, Math.ceil(v.length / 60))}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onSave(v)}
      placeholder={placeholder}
      dir="auto"
      aria-label={placeholder}
      className={`${className} w-full resize-none rounded bg-transparent outline-none focus:bg-black/[0.04] print:hidden`}
    />
    </>
  );
}
