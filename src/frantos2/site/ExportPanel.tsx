import React, { useEffect, useState } from 'react';
import { Check, Code2, Copy, ExternalLink, FileCode2, FileDown, FileImage, Globe, Loader2, Monitor, Smartphone, Tablet, X } from 'lucide-react';
import { go } from '../route';
import { publishBlock, publishPage, publicPageUrl, suggestSlug, unpublishPage, validSlug } from './publish';
import { useI18n } from '../i18n';
import { Pane } from '../glass/kit';
import { toast } from '../ws/kit';
import type { Project, SitePage } from '../ws/types';
import { Seg } from '../studio/ui';
import { BPS } from './model';
import { useSiteMediaState } from './media';
import { useSiteTr } from './SiteView';
import { exportHtml, exportReact, fileSlug, pagePdf, pagePng, saveFile } from './exportSite';
import { COLOR_ROLES } from './theme';

/** CSS variables of a page's tokens, ready to paste */
export const tokenCss = (pg: SitePage) =>
  `:root {\n${COLOR_ROLES.map((r) => `  --c-${r.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}: ${pg.theme[r]};`).join('\n')}\n}`;

/**
 * Code and pictures of the site's pages: a static site, a React project, PNG at any width, a PDF.
 * `page` = the page open in the editor; the handoff page passes none and works on all pages.
 */
export function ExportBody({ p, page }: { p: Project; page?: SitePage }) {
  const { t } = useI18n();
  const tr = useSiteTr(p);
  const pages = p.pages ?? [];
  const [scope, setScope] = useState<'one' | 'all'>(page ? 'one' : 'all');
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const target = page ?? pages[0];
  const { media, ready } = useSiteMediaState(p, target?.root ?? []);
  if (!target) return <p className="text-[13px] text-white/70">{t('No pages yet. Build one in the studio’s Site mode.')}</p>;
  const list = scope === 'one' && page ? [page] : pages;
  const name = fileSlug(tr ? tr(target.title) : target.title);
  const run = async (key: string, job: () => Promise<void>) => {
    setBusy(key);
    try {
      await job();
    } catch (err) {
      console.warn(err);
      toast(t('The export did not work. Try again.'), { tone: 'error' });
    } finally {
      setBusy(null);
    }
  };
  const Btn = ({ k, icon, title, sub, onClick, primary }: { k: string; icon: React.ReactNode; title: string; sub: string; onClick: () => void; primary?: boolean }) => (
    <button type="button" disabled={!!busy || !ready} onClick={onClick} className={`flex w-full items-start gap-3 rounded-[18px] p-3 text-start transition-colors disabled:opacity-60 ${primary ? 'bg-white text-[#11151a] hover:bg-white/90' : 'bg-white/[.08] hover:bg-white/15'}`}>
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] ${primary ? 'bg-current/10 ring-1 ring-current/15' : 'bg-white/15'}`}>{busy === k ? <Loader2 size={16} className="animate-spin" /> : icon}</span>
      <span className="min-w-0">
        <span className="block text-[14px] font-bold">{title}</span>
        <span className={`block text-[12px] leading-[1.4] ${primary ? 'opacity-70' : 'text-white/65'}`}>{sub}</span>
      </span>
    </button>
  );
  return (
    <div className="space-y-5">
      <section className="space-y-2.5">
        <p className="lg-label">{t('Code')}</p>
        {page && pages.length > 1 && <Seg label={t('Which pages')} value={scope} options={[{ id: 'one' as const, label: t('This page') }, { id: 'all' as const, label: t('All pages ({n})', { n: pages.length }) }]} onChange={setScope} />}
        <Btn primary k="html" icon={<FileCode2 size={17} />} title={t('Website · HTML + CSS')} sub={t('A folder to open in any browser or upload to any hosting: pages, CSS with your tokens, fonts, pictures and the motion.')} onClick={() => run('html', async () => saveFile(await exportHtml(p, list, tr), `${name}-site.zip`))} />
        <Btn k="react" icon={<Code2 size={17} />} title={t('React + Vite project')} sub={t('One component per page, the same CSS and motion, Tailwind tokens. npm install, npm run dev.')} onClick={() => run('react', async () => saveFile(await exportReact(p, list, tr), `${name}-react.zip`))} />
        <div className="flex items-center gap-2 rounded-[14px] bg-black/20 p-2.5">
          <code dir="ltr" className="min-w-0 flex-1 truncate text-[11.5px] text-white/75">
            --c-bg: {target.theme.bg}; --c-text: {target.theme.text}; --c-accent: {target.theme.accent} …
          </code>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(tokenCss(target));
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1300);
              } catch {
                toast(t('The browser did not allow copying. Select the text and copy it.'), { tone: 'error' });
              }
            }}
            className="lg-btn lg-btn-plain min-h-[32px] shrink-0 px-2.5 text-[12px]"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />} {t('Copy the colour tokens')}
          </button>
        </div>
      </section>
      <section className="space-y-2.5">
        <p className="lg-label">{t('Pictures of “{page}”', { page: tr ? tr(target.title) : target.title })}</p>
        <div className="grid grid-cols-3 gap-1.5">
          {[...BPS].reverse().map((b) => (
            <button key={b.id} type="button" disabled={!!busy || !ready} onClick={() => run('png-' + b.id, async () => saveFile(await pagePng(p, target, media, b.w, tr), `${name}-${b.w}.png`))} className="flex flex-col items-center gap-1 rounded-[14px] bg-white/[.08] px-1 py-2.5 text-[12px] font-bold hover:bg-white/15 disabled:opacity-60">
              {busy === 'png-' + b.id ? <Loader2 size={16} className="animate-spin" /> : b.id === 'sm' ? <Smartphone size={16} /> : b.id === 'md' ? <Tablet size={16} /> : <Monitor size={16} />}
              PNG · {b.w}
            </button>
          ))}
        </div>
        <Btn k="pdf" icon={<FileDown size={17} />} title={t('PDF for the portfolio')} sub={t('Desktop, tablet and phone, a page each, the whole length of the site.')} onClick={() => run('pdf', async () => saveFile(await pagePdf(p, target, media, tr), `${name}.pdf`))} />
      </section>
    </div>
  );
}

export function ExportDialog({ p, page, onClose }: { p: Project; page: SitePage; onClose: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-3" onClick={onClose}>
      <Pane strong className="lg-pop lg-scroll max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-[28px] p-5" role="dialog" aria-modal aria-labelledby="site-export-title" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-2">
          <FileImage size={18} />
          <p id="site-export-title" className="me-auto text-[18px] font-extrabold">
            {t('Export')}
          </p>
          <button type="button" onClick={onClose} className="lg-btn lg-btn-plain lg-icon" aria-label={t('Close')}>
            <X size={17} />
          </button>
        </div>
        <ExportBody p={p} page={page} />
        <PublishSection p={p} page={(p.pages ?? []).find((x) => x.id === page.id) ?? page} />
      </Pane>
    </div>
  );
}

/** Publishing one page on purpose: what goes public is said before, the address is yours, unpublish removes it. */
export function PublishSection({ p, page }: { p: Project; page: SitePage }) {
  const { t } = useI18n();
  const block = publishBlock(p);
  const [slug, setSlug] = useState(page.published?.slug ?? suggestSlug(p, page));
  const [busy, setBusy] = useState<string | null>(null);
  const url = page.published ? publicPageUrl(page.published.slug) : null;
  const fail = (err: unknown) => {
    const m = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err);
    console.warn(err);
    toast(
      m === 'taken'
        ? t('This address is taken. Try another one.')
        : m === 'slug'
          ? t('Use 2–63 Latin letters, digits and hyphens.')
          : /published_pages|site-media|relation|bucket/i.test(m)
            ? t('Publishing is not switched on on the studio server yet.')
            : t('Publishing did not work. Try again.'),
      { tone: 'error' }
    );
  };
  const run = async (k: string, job: () => Promise<void>) => {
    setBusy(k);
    try {
      await job();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  };
  return (
    <section className="mt-5 space-y-2.5 border-t border-white/10 pt-5">
      <p className="lg-label flex items-center gap-1.5">
        <Globe size={13} /> {t('Publish this page')}
      </p>
      {block ? (
        <div className="space-y-2 rounded-[16px] bg-white/[.07] p-3 text-[12.5px] leading-[1.45] text-white/75">
          <p>{block === 'signed-out' ? t('Publishing needs the studio server: sign in and move the project to your studio.') : block === 'local-project' ? t('Move the project to your studio (Overview) to publish it.') : t('Publishing needs the studio server.')}</p>
          {block === 'signed-out' && (
            <button type="button" onClick={() => go('/login')} className="lg-btn lg-btn-ghost min-h-[34px] text-[12.5px]">
              {t('Sign in')}
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-[12.5px] leading-[1.45] text-white/70">{t('Only this page becomes public: its words, pictures and colours. The project, reviews, notes and other pages stay private. Search engines are asked not to index it.')}</p>
          <label className="block text-[12px] text-white/75">
            {t('Address')}
            <span className="mt-1.5 flex items-center overflow-hidden rounded-[14px] bg-black/20" dir="ltr">
              <span className="truncate ps-3 text-[12px] text-white/50">…/#/w/</span>
              <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 63))} aria-invalid={!validSlug(slug)} className="min-h-[38px] min-w-0 flex-1 bg-transparent px-1 text-[13px] font-bold outline-none" aria-label={t('Address')} />
            </span>
          </label>
          {url && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-[14px] bg-[#2fbf71]/15 p-2 text-[12.5px]">
              <span className="me-auto font-bold">{t('Published · {date}', { date: new Date(page.published!.at).toLocaleDateString() })}</span>
              <a href={url} target="_blank" rel="noopener noreferrer" className="lg-btn lg-btn-plain min-h-[30px] px-2 text-[12px]">
                <ExternalLink size={12} /> {t('Open')}
              </a>
              <button type="button" onClick={() => navigator.clipboard?.writeText(url).then(() => toast(t('Copied')))} className="lg-btn lg-btn-plain min-h-[30px] px-2 text-[12px]">
                <Copy size={12} /> {t('Copy link')}
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!!busy || !validSlug(slug)}
              onClick={() => {
                if (!page.published && !window.confirm(t('Publish this page? Anyone with the link will see it.'))) return;
                run('pub', async () => {
                  const u = await publishPage(p, page, slug);
                  toast(page.published ? t('The published page is updated') : t('Published: {url}', { url: u }));
                });
              }}
              className="lg-btn lg-btn-primary min-h-[38px] flex-1 text-[13px] disabled:opacity-50"
            >
              {busy === 'pub' ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />} {page.published ? t('Update the published page') : t('Publish')}
            </button>
            {page.published && (
              <button type="button" disabled={!!busy} onClick={() => run('unpub', async () => (await unpublishPage(p, page), toast(t('Unpublished — the link no longer opens'))))} className="lg-btn lg-btn-ghost min-h-[38px] text-[13px]">
                {busy === 'unpub' ? <Loader2 size={14} className="animate-spin" /> : null} {t('Unpublish')}
              </button>
            )}
          </div>
          {page.published && page.updatedAt > page.published.at + 2000 && <p className="text-[11.5px] text-[#ffb84f]">{t('The page changed since it was published. Update to show the changes.')}</p>}
        </>
      )}
    </section>
  );
}
