import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowLeft, Box, Copy, Globe, LayoutGrid, Lock, Printer, RotateCcw } from 'lucide-react';
import { Project } from '../ws/types';
import { assetOf, useProject, ws } from '../ws/store';
import { AssetThumb, toast } from '../ws/kit';
import { WorkCanvas } from '../ws/WorkCanvas';
import { useAssetUrl } from '../ws/media';
import { go } from '../route';
import { ago, useI18n } from '../i18n';
import { Backdrop, Credits, GlassLang, lgEase, Mark, Pane } from '../glass/kit';
import { cloudEnabled, guestFiles, sb, useAuth } from '../cloud/client';
import '../glass/glass.css';

/**
 * "Behind the work" for any project: the finished piece first, then the reverse side —
 * what shaped it, how it changed, what was decided. Client notes never appear here.
 * Owner view: /#/p/:id/case (edit, publish, print). Public view: /#/c/:slug.
 */
export function CasePage({ projectId, slug }: { projectId?: string; slug?: string }) {
  const { t, dir } = useI18n();
  const own = useProject(projectId);
  const [pub, setPub] = useState<Project | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>(projectId ? 'ok' : 'loading');

  useEffect(() => {
    if (!slug) return;
    if (!sb) return setState('missing');
    let live = true;
    // a slow or unreachable server must not leave the visitor on "Opening…" forever
    const timer = window.setTimeout(() => live && setState((s) => (s === 'loading' ? 'missing' : s)), 15000);
    (async () => {
      try {
        const { data } = await sb!.from('projects').select('id, title, doc').eq('public_slug', slug).eq('visibility', 'public').maybeSingle();
        if (!live) return;
        if (!data) return setState('missing');
        await guestFiles({ slug });
        if (!live) return;
        setPub({
          ...(data.doc as Project),
          id: data.id,
          title: data.title,
          comments: [],
        });
        setState('ok');
      } catch {
        if (live) setState('missing');
      }
    })();
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [slug]);

  const p = projectId ? own.project : pub;
  if (own.loading || state === 'loading')
    return (
      <div className="lg fixed inset-0 flex items-center justify-center" dir={dir} role="status">
        <Backdrop tint={0.5} />
        <p className="relative text-[14px] text-white/70">{t('Opening…')}</p>
      </div>
    );
  if (!p || state === 'missing')
    return (
      <div className="lg fixed inset-0 flex items-center justify-center p-5" dir={dir}>
        <Backdrop src="/projects/form-01/ref-window.webp" tint={0.6} blur />
        <Pane strong className="relative max-w-[440px] rounded-[30px] p-7 text-center sm:p-9">
          <div className="flex justify-center">
            <Mark size={20} />
          </div>
          <p className="mt-6 text-[26px] font-extrabold leading-[1.05] tracking-[-0.03em]">{t('This case page is not public.')}</p>
          <p className="mt-3 text-[14.5px] leading-[1.5] text-white/75">{t('The studio may have unpublished it, or the link has a typo. Ask the studio for a new one.')}</p>
          <a href="#/" className="lg-btn lg-btn-primary mt-6">
            {t('What is FrantoS?')}
          </a>
        </Pane>
      </div>
    );
  return <Case p={p} owner={!!projectId} />;
}

function Case({ p, owner }: { p: Project; owner: boolean }) {
  const { t, dir } = useI18n();
  const auth = useAuth();
  const reduce = useReducedMotion();
  const cover = assetOf(p, p.coverAssetId) ?? p.assets.find((a) => !a.isReference);
  const coverUrl = useAssetUrl(cover, cover?.kind === 'video' ? 'thumb' : 'full').url;
  const [flipped, setFlipped] = useState(false);
  const shaped = p.assets.filter((a) => a.isReference && a.influences && assetOf(p, a.influences.assetId));
  const changed = p.works.filter((w) => w.kind === 'image' && w.versions.length > 1);
  const decisions = [...(p.decisions ?? [])].sort((a, b) => a.createdAt - b.createdAt);
  const finals = (p.presentation.length ? p.presentation : p.portfolio).map((id) => assetOf(p, id)).filter(Boolean) as NonNullable<ReturnType<typeof assetOf>>[];
  const refsBack = p.assets.filter((a) => a.isReference).slice(0, 4);
  const publicUrl = p.publicSlug ? `${window.location.origin}/#/c/${p.publicSlug}` : '';
  const canPublish = owner && cloudEnabled && !!auth.session && !!p.cloud;
  const objects = (p.objects ?? []).filter((o) => o.thumb);
  let n = 0;
  const num = () => String(++n).padStart(2, '0');

  const reveal = () => {
    setFlipped(true);
    setTimeout(() => document.getElementById('reverse')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }), reduce ? 0 : 650);
  };

  return (
    <div className="lg handoff-print min-h-full" dir={dir}>
      <div className="fixed inset-0 print:hidden">
        <Backdrop src={coverUrl} tint={0.6} blur />
      </div>
      <div className="relative z-10 mx-auto max-w-[1360px] px-3 pb-16 pt-3 sm:px-6 sm:pt-5">
        <Pane as="header" className="sticky top-3 z-30 flex items-center gap-2 rounded-full p-1.5 sm:top-5 print:hidden">
          {owner ? (
            <button type="button" onClick={() => go(`/p/${p.id}`)} className="lg-btn lg-btn-plain min-h-[40px] gap-2 px-3" aria-label={t('Back to project')}>
              <ArrowLeft size={17} className="rtl:-scale-x-100" />
              <span className="max-w-[40vw] truncate text-[14px] font-bold sm:max-w-[320px]" dir="auto">
                {p.title}
              </span>
            </button>
          ) : (
            <a href="#/" className="flex min-h-[40px] items-center px-3" aria-label="FrantoS">
              <Mark size={16} />
            </a>
          )}
          {owner && (
            <span className="lg-soft hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold text-white/80 md:inline-flex">
              {p.visibility === 'public' ? <Globe size={13} /> : <Lock size={13} />}
              {p.visibility === 'public' ? t('Published') : t('Private draft — only you see this')}
            </span>
          )}
          <div className="ms-auto flex items-center gap-1.5">
            <GlassLang />
            <button type="button" onClick={() => window.print()} className="lg-btn lg-btn-plain lg-icon" title={t('Print or save as PDF')} aria-label={t('Print or save as PDF')}>
              <Printer size={17} />
            </button>
          </div>
        </Pane>

        {owner && (
          <Pane className="mt-4 flex flex-col gap-4 rounded-[26px] p-5 md:flex-row md:items-center md:justify-between print:hidden" delay={0.05}>
            <div className="max-w-[46rem] text-[13.5px] leading-[1.55]">
              <p className="flex items-center gap-2 text-[15px] font-extrabold">
                {p.visibility === 'public' ? <Globe size={15} /> : <Lock size={15} />}
                {p.visibility === 'public' ? t('This page is public.') : t('Before you publish: what becomes public')}
              </p>
              <p className="mt-1 text-white/75">{t('Cover, references with their notes, version comparisons, decisions and the presentation. Review discussion, client notes and other projects stay private.')}</p>
              {!cloudEnabled || !auth.session ? (
                <p className="mt-1 text-white/60">{t('Publishing needs the studio server: sign in and move the project to your studio.')}</p>
              ) : !p.cloud ? (
                <p className="mt-1 text-white/60">{t('Move the project to your studio (Overview) to publish it.')}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {p.visibility === 'public' && publicUrl && (
                <button type="button" onClick={() => navigator.clipboard?.writeText(publicUrl).then(() => toast(t('Copied')))} className="lg-btn lg-btn-ghost">
                  <Copy size={14} /> {t('Copy public link')}
                </button>
              )}
              <button
                type="button"
                disabled={!canPublish}
                title={canPublish ? undefined : t('Publishing needs the studio server: sign in and move the project to your studio.')}
                onClick={() => {
                  const next = p.visibility === 'public' ? 'private' : 'public';
                  if (next === 'public' && !window.confirm(t('Publish this case page? Anyone with the link will see it.'))) return;
                  ws.setVisibility(p.id, next);
                  toast(next === 'public' ? t('Published') : t('Unpublished — the link no longer opens'));
                }}
                className={`lg-btn ${p.visibility === 'public' ? 'lg-btn-ghost' : 'lg-btn-primary'} disabled:cursor-not-allowed disabled:opacity-45`}
              >
                <Globe size={15} /> {p.visibility === 'public' ? t('Unpublish') : t('Publish')}
              </button>
            </div>
          </Pane>
        )}

        {/* the finished side */}
        <section className="relative z-0 isolate grid items-center gap-8 py-10 sm:py-14 lg:min-h-[76vh] lg:grid-cols-12 lg:gap-12">
          <motion.div className="lg:col-span-5" initial={{ opacity: 0, y: reduce ? 0 : 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: lgEase }}>
            <p className="lg-label lg-shadow-text uppercase tracking-[0.12em]">
              {t('Case')} · {new Date(p.updatedAt).getFullYear()}
            </p>
            <h1 dir="auto" className="lg-shadow-text mt-3 text-[clamp(40px,6.4vw,92px)] font-extrabold leading-[0.95] tracking-[-0.05em] [overflow-wrap:anywhere]">
              {p.title}
            </h1>
            <Editable
              owner={owner}
              value={p.caseText?.intro ?? p.brief ?? ''}
              placeholder={t('One or two sentences: the brief and what you made.')}
              onSave={(v) => ws.setCaseText(p.id, { ...p.caseText, intro: v })}
              className="lg-shadow-text mt-5 max-w-[34rem] text-[17px] leading-[1.55] text-white/85"
            />
            {(p.tags?.length ?? 0) > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {p.tags!.slice(0, 5).map((tag) => (
                  <span key={tag} className="lg-soft rounded-full px-3 py-1 text-[12px] font-bold text-white/80">
                    {t(tag)}
                  </span>
                ))}
              </div>
            )}
            <button type="button" onClick={reveal} className="lg-btn lg-btn-ghost mt-7 min-h-[48px] px-5 print:hidden">
              <RotateCcw size={16} className="-scale-x-100" /> {t('Behind the work')} <ArrowDown size={15} />
            </button>
          </motion.div>
          <div className="lg:col-span-7" style={{ perspective: 2000 }}>
            <motion.div
              className="relative mx-auto aspect-[4/5] w-full max-w-[540px]"
              style={{ transformStyle: 'preserve-3d' }}
              initial={{
                opacity: 0,
                y: reduce ? 0 : 24,
                scale: reduce ? 1 : 0.97,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                rotateY: flipped ? 180 : 0,
              }}
              transition={{
                duration: reduce ? 0 : 1.1,
                ease: [0.5, 0, 0.2, 1],
              }}
            >
              <div className="absolute inset-0 overflow-hidden rounded-[28px] bg-black/30 shadow-[0_50px_100px_-40px_rgba(0,0,0,0.8)] ring-1 ring-white/15" style={{ backfaceVisibility: 'hidden' }}>
                <AssetThumb asset={cover} size="full" className="h-full w-full" alt={cover?.title} />
              </div>
              {/* the reverse side of the print: its references */}
              <div
                className="lg-glass-strong absolute inset-0 grid grid-cols-2 gap-[3%] rounded-[28px] p-[5%]"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                {refsBack.map((a) => (
                  <div key={a.id} className="overflow-hidden rounded-[14px] bg-black/20">
                    <AssetThumb asset={a} className="h-full w-full" />
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <div id="reverse" className="scroll-mt-24" />

        <div className="flex flex-col gap-5 sm:gap-6">
          {shaped.length > 0 && (
            <Section n={num()} title={t('What shaped it')}>
              <div className="grid gap-4 md:grid-cols-2">
                {shaped.map((r) => {
                  const target = assetOf(p, r.influences!.assetId)!;
                  return (
                    <figure key={r.id} className="lg-soft grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[20px] p-3.5 print:break-inside-avoid">
                      <Thumb a={r} />
                      <span aria-hidden className="text-[18px] text-white/70 rtl:-scale-x-100">
                        →
                      </span>
                      <Thumb a={target} />
                      <figcaption className="col-span-3 border-t border-white/15 pt-3 text-[14.5px] leading-[1.5] text-white/85">
                        <span className="me-2 font-bold text-white">{r.title} →</span>
                        {r.influences!.text}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            </Section>
          )}

          {changed.length > 0 && (
            <Section n={num()} title={t('How it changed')}>
              <div className="flex flex-col gap-12">
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
            <Section n={num()} title={t('Decisions')}>
              <ol className="flex max-w-[52rem] flex-col gap-6 border-s border-white/20 ps-6">
                {decisions.map((d) => (
                  <li key={d.id} className="relative print:break-inside-avoid">
                    <span className="absolute -start-[30px] top-1.5 h-3 w-3 rounded-full bg-white ring-4 ring-white/15" />
                    <p className="text-[12.5px] font-bold text-white/60">
                      {p.works.find((w) => w.id === d.workId)?.title} · {ago(d.createdAt)}
                    </p>
                    <p dir="auto" className="mt-1 text-[clamp(19px,2.2vw,26px)] font-bold leading-[1.25] tracking-[-0.02em]">
                      {d.text}
                    </p>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {objects.length > 0 && (
            <Section n="3D" title={t('Objects')}>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {objects.map((o) => (
                  <figure key={o.id} className="print:break-inside-avoid">
                    <div
                      className="overflow-hidden rounded-[22px] ring-1 ring-white/10"
                      style={{
                        background: o.background.kind === 'transparent' ? '#ece6da' : o.background.color,
                      }}
                    >
                      <img src={o.thumb} alt={t(o.title)} className="aspect-[4/5] w-full object-cover" />
                    </div>
                    <figcaption className="mt-3 flex flex-wrap items-center gap-2.5">
                      <span className="text-[16px] font-extrabold">{t(o.title)}</span>
                      <span className="flex gap-1" aria-label={t('Variants')}>
                        {o.variants.map((v) => (
                          <span
                            key={v.id}
                            title={t(v.name)}
                            className="h-5 w-5 rounded-full ring-1 ring-white/30"
                            style={{
                              background: `linear-gradient(0deg, ${v.baseColor} 50%, ${v.topColor} 50%)`,
                            }}
                          />
                        ))}
                      </span>
                      {owner && (
                        <button type="button" onClick={() => go(`/o/${p.id}/${o.id}`)} className="lg-btn lg-btn-ghost ms-auto min-h-[36px] px-3 text-[13px] print:hidden">
                          <Box size={14} /> {t('Open in 3D')}
                        </button>
                      )}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </Section>
          )}

          {(p.boards ?? []).length > 0 && owner && (
            <Section n="▦" title={t('Boards')}>
              <p className="max-w-[52ch] text-[15px] leading-[1.55] text-white/75">{t('Boards from the studio’s Canvas mode. Export one “To project” to show it here as part of the work.')}</p>
              <button type="button" onClick={() => go(`/s/${p.id}?m=canvas`)} className="lg-btn lg-btn-ghost mt-4 print:hidden">
                <LayoutGrid size={15} /> {t('Open Canvas')}
              </button>
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
        </div>

        <section className="py-14 sm:py-20">
          <Editable
            owner={owner}
            value={p.caseText?.outro ?? ''}
            placeholder={t('A closing line: result, credits, thanks.')}
            onSave={(v) => ws.setCaseText(p.id, { ...p.caseText, outro: v })}
            className="lg-shadow-text max-w-[24ch] text-[clamp(28px,4vw,52px)] font-extrabold leading-[1.05] tracking-[-0.04em]"
          />
          <p className="mt-8 text-[13px] text-white/60">{t('Made in FrantoS — the private workspace behind the work.')}</p>
        </section>
        <Credits className="border-t border-white/15 pt-6" />
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.section className="lg-glass rounded-[30px] p-5 sm:p-8 md:p-10 print:break-inside-avoid" initial={{ opacity: 0, y: reduce ? 0 : 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.6, ease: lgEase }}>
      <div className="mb-7 flex items-baseline gap-3 sm:mb-9">
        <span className="lg-soft inline-flex min-w-[40px] justify-center rounded-full px-2.5 py-1 text-[12px] font-extrabold tabular-nums text-white/80">{n}</span>
        <h2 className="text-[clamp(26px,3.4vw,44px)] font-extrabold leading-[1] tracking-[-0.04em]">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}

function Thumb({ a }: { a: NonNullable<ReturnType<typeof assetOf>> }) {
  return (
    <div>
      <div className="aspect-[4/5] overflow-hidden rounded-[14px] bg-black/25">
        <AssetThumb asset={a} className="h-full w-full" alt={a.title} />
      </div>
      <p className="mt-1.5 truncate text-[12.5px] font-bold text-white/80">{a.title}</p>
    </div>
  );
}

function Changed({ p, title, aId, bId, la, lb, decisions }: { p: Project; title: string; aId: string; bId: string; la: string; lb: string; decisions: { id: string; text: string }[] }) {
  const a = assetOf(p, aId)!;
  const b = assetOf(p, bId)!;
  const [split, setSplit] = useState(55);
  const { t } = useI18n();
  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:items-center print:break-inside-avoid">
      <div className="lg:col-span-4">
        <p className="text-[24px] font-extrabold leading-[1.05] tracking-[-0.03em]">{title}</p>
        {decisions.map((d) => (
          <p key={d.id} className="mt-3 text-[15.5px] leading-[1.55] text-white/80">
            {d.text}
          </p>
        ))}
        <p className="lg-soft mt-4 inline-flex rounded-full px-3 py-1 text-[12px] font-bold text-white/70 print:hidden">↔ {t('Drag the divider')}</p>
      </div>
      <div className="relative mx-auto aspect-[4/5] w-full max-w-[600px] overflow-hidden rounded-[22px] lg:col-span-8">
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
        <video src={url} autoPlay muted loop playsInline className="mx-auto max-h-[86vh] w-auto max-w-full rounded-[22px]" />
      ) : (
        <img src={url} alt={a.title} loading="lazy" className="mx-auto max-h-[86vh] w-auto max-w-full rounded-[22px] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.7)]" />
      )}
      <figcaption className="mt-3 text-center text-[13px] font-bold text-white/70">{a.title}</figcaption>
    </figure>
  );
}

function Editable({ owner, value, placeholder, onSave, className }: { owner: boolean; value: string; placeholder: string; onSave: (v: string) => void; className?: string }) {
  const [v, setV] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setV(value), [value]);
  // grows with its text at any width, so nothing is cut on a phone
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  });
  if (!owner) return value ? <p className={className}>{value}</p> : null;
  return (
    <>
      <p className={`${className} hidden whitespace-pre-wrap print:block`}>{v}</p>
      <textarea
        value={v}
        ref={ref}
        rows={2}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== value && onSave(v)}
        placeholder={placeholder}
        dir="auto"
        aria-label={placeholder}
        className={`${className} -mx-2 w-[calc(100%+16px)] resize-none rounded-[14px] bg-transparent px-2 outline-none transition-colors placeholder:text-white/45 hover:bg-white/[.06] focus:bg-white/10 print:hidden`}
      />
    </>
  );
}
