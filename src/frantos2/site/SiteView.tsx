import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Monitor, Maximize2, PenLine, Smartphone, Tablet } from 'lucide-react';
import '../glass/glass.css';
import { tr as translate, useI18n } from '../i18n';
import { go } from '../route';
import { ensureLoaded, useProject } from '../ws/store';
import type { Project, SitePage } from '../ws/types';
import { Pane } from '../glass/kit';
import { hydrate, renderPage } from './render';
import { runMotion } from './motion';
import { makeCtx, useSiteMediaState } from './media';
import { BPS } from './model';
import { parseLink, viewRoot } from './collections';

/** A page as a visitor sees it, answering to its own width (container queries), so a phone frame on a desktop shows the phone layout. */
/** links to other pages of the site (`slug.html`) open that page with `onPage`, or stay put */
export function SiteView({ p, page: raw, entry, width, vh, tr, className = '', onPage }: { p: Project; page: Pick<SitePage, 'root' | 'theme' | 'dir'> & { collection?: string }; entry?: string; width?: number; vh?: string; tr?: (s: string) => string; className?: string; onPage?: (pageId: string, entry?: string) => void }) {
  const page = useMemo(() => ({ ...raw, root: viewRoot(p, raw, entry) }), [p, raw, entry]);
  const { media, ready } = useSiteMediaState(p, page.root);
  const { css, html } = useMemo(() => renderPage(page, makeCtx(p, media, { mode: 'container', vh, tr })), [p, page, media, vh, tr]);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const a = hydrate(el);
    const b = ready ? runMotion(el) : () => undefined;
    return () => (a(), b());
  }, [html, ready]);
  return (
    <div
      className={className}
      style={{ width: width ?? '100%', containerType: 'inline-size', containerName: 'fs' }}
      onClick={(e) => {
        const a = (e.target as HTMLElement).closest('a');
        const m = parseLink(a?.getAttribute('href') ?? '');
        if (!m) return;
        e.preventDefault();
        const target = (p.pages ?? []).find((x) => x.slug === m.page);
        if (target) onPage?.(target.id, m.entry);
      }}
    >
      <style>{css}</style>
      <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

/** demo pages are written in English and shown in the app language */
export function useSiteTr(p: Project) {
  const { lang } = useI18n();
  return useMemo(() => (p.kind === 'demo' && lang !== 'en' ? (s: string) => translate(s, undefined, lang) : undefined), [p.kind, lang]);
}
/** a demo page reads right to left when the app is in Hebrew */
export function useSiteDir<T extends Pick<SitePage, 'dir'>>(p: Project, page: T): T {
  const { lang } = useI18n();
  return useMemo(() => (p.kind === 'demo' && lang === 'he' && page.dir !== 'rtl' ? { ...page, dir: 'rtl' } : page), [p.kind, lang, page]);
}

const WIDTHS = [{ id: 'full', label: 'Full width', icon: Maximize2 }, ...BPS.map((b) => ({ id: b.id, label: b.label, icon: b.id === 'sm' ? Smartphone : b.id === 'md' ? Tablet : Monitor }))];

/** #/site/:projectId/:pageId[?v=<versionId>&w=sm|md|lg] — the live page, full screen */
export function SitePreview({ id, pageId, q }: { id: string; pageId: string; q: URLSearchParams }) {
  const { t, dir } = useI18n();
  const { project: p, loading } = useProject(id);
  useEffect(() => void ensureLoaded(), []);
  const [w, setW] = useState(q.get('w') ?? 'full');
  if (!p) return <div className="lg fixed inset-0">{!loading && <p className="p-8 text-center">{t('This project is not here')}</p>}</div>;
  return <PreviewBody p={p} pageId={pageId} q={q} w={w} setW={setW} dir={dir} />;
}

function PreviewBody({ p, pageId, q, w, setW, dir }: { p: Project; pageId: string; q: URLSearchParams; w: string; setW: (w: string) => void; dir: string }) {
  const { t } = useI18n();
  const tr = useSiteTr(p);
  const page = (p.pages ?? []).find((x) => x.id === pageId);
  const snap = page?.snapshots?.find((s) => s.versionId === q.get('v'));
  const [chrome, setChrome] = useState(true);
  useEffect(() => {
    document.title = page ? `${page.title} · FrantoS` : 'FrantoS';
  }, [page]);
  if (!page)
    return (
      <div className="lg fixed inset-0 flex items-center justify-center" dir={dir}>
        <Pane className="rounded-[26px] p-8 text-center">
          <p className="text-[18px] font-bold">{t('This page is not here')}</p>
          <button type="button" onClick={() => go(`/p/${p.id}`)} className="lg-btn lg-btn-primary mt-5">
            {t('Back to the project')}
          </button>
        </Pane>
      </div>
    );
  const bp = BPS.find((b) => b.id === w);
  return <PreviewFrame p={p} page={snap ? { ...page, root: snap.root, theme: snap.theme } : page} snap={!!snap} bp={bp} w={w} setW={setW} dir={dir} tr={tr} chrome={chrome} setChrome={setChrome} entry={q.get('entry') ?? undefined} />;
}

function PreviewFrame({ p, page: raw, snap, bp, w, setW, dir, tr, chrome, setChrome, entry }: {
  entry?: string; p: Project; page: SitePage; snap: boolean; bp?: (typeof BPS)[number]; w: string; setW: (w: string) => void; dir: string; tr?: (s: string) => string; chrome: boolean; setChrome: (f: (c: boolean) => boolean) => void }) {
  const { t } = useI18n();
  const page = useSiteDir(p, raw);
  const view = page;
  const [vw, setVw] = useState(window.innerWidth);
  useEffect(() => {
    const f = () => setVw(window.innerWidth);
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  const zoom = bp ? Math.min(1, (vw - 24) / bp.w) : 1;
  return (
    <div className={`fixed inset-0 overflow-y-auto ${bp ? 'lg lg-studio' : ''}`} style={bp ? undefined : { background: page.theme.bg }} dir={dir}>
      {bp ? (
        <div className="flex justify-center px-3 pb-16 pt-[84px]" style={{ zoom }}>
          <SiteView p={p} page={view} entry={entry} width={bp.w} vh={`${bp.h}px`} tr={tr} onPage={(id, e) => go(`/site/${p.id}/${id}?w=${w}${e ? `&entry=${e}` : ''}`)} className="shrink-0 overflow-hidden rounded-[18px] shadow-[0_30px_90px_rgba(0,0,0,.45)]" />
        </div>
      ) : (
        <SiteView p={p} page={view} entry={entry} tr={tr} vh="100vh" onPage={(id, e) => go(`/site/${p.id}/${id}?w=${w}${e ? `&entry=${e}` : ''}`)} />
      )}
      <div className={`fixed inset-x-3 top-3 z-30 flex items-center gap-2 transition-opacity ${chrome ? '' : 'opacity-0 hover:opacity-100 focus-within:opacity-100'}`}>
        <Pane className="lg flex min-w-0 items-center gap-1 rounded-full py-1 pe-3 ps-1">
          <button type="button" onClick={() => (history.length > 1 ? history.back() : go(`/s/${p.id}?m=site&pg=${page.id}`))} className="lg-btn lg-btn-plain lg-icon" aria-label={t('Back')}>
            <ArrowLeft size={18} className="rtl:-scale-x-100" />
          </button>
          <span dir="auto" className="truncate text-[14px] font-bold max-sm:hidden">
            {tr ? tr(page.title) : page.title}
          </span>
          {snap && <span className="ms-1 whitespace-nowrap rounded-full bg-white/15 px-2 py-0.5 text-[11.5px] font-bold">{t('Version from review')}</span>}
        </Pane>
        <Pane as="nav" aria-label={t('Width')} className="lg mx-auto flex items-center gap-0.5 rounded-full p-1">
          {WIDTHS.map((x) => (
            <button key={x.id} type="button" onClick={() => setW(x.id)} aria-pressed={w === x.id} aria-label={t(x.label)} title={t(x.label)} className={`flex min-h-[38px] min-w-[38px] items-center justify-center gap-1.5 rounded-full px-2.5 text-[13px] font-bold ${w === x.id ? 'bg-white text-[#11151a]' : 'text-white/80 hover:bg-white/10'}`}>
              <x.icon size={15} /> <span className="hidden lg:inline">{t(x.label)}</span>
            </button>
          ))}
        </Pane>
        <Pane className="lg flex items-center gap-1 rounded-full p-1">
          <button type="button" onClick={() => go(`/s/${p.id}?m=site&pg=${page.id}`)} className="lg-btn lg-btn-plain min-h-[38px] text-[13px]">
            <PenLine size={15} /> <span className="max-md:hidden">{t('Edit')}</span>
          </button>
          <button type="button" onClick={() => setChrome((c) => !c)} className="lg-btn lg-btn-plain min-h-[38px] text-[12.5px] max-sm:!hidden" aria-pressed={!chrome}>
            {chrome ? t('Hide controls') : t('Show controls')}
          </button>
        </Pane>
      </div>
    </div>
  );
}
