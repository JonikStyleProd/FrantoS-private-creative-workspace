import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { boardGif, boardLottie, boardPoster, boardVideo, canVideo } from './frames';
import { viewRoot } from './collections';
import { upload } from '../ws/uploads';
import { Film, ImagePlus, Sparkles } from 'lucide-react';
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
  const drawn = useMemo(() => (target ? viewRoot(p, target) : []), [p, target]);
  const { media, ready } = useSiteMediaState(p, drawn);
  if (target?.board) return <BoardExport p={p} page={target} media={media} ready={ready} tr={tr} />;
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

/** an artboard out as a video, a GIF, a Lottie file or a picture — frame by frame, exact */
function BoardExport({ p, page, media, ready, tr }: { p: Project; page: SitePage; media: Record<string, import('./render').MediaInfo>; ready: boolean; tr?: (s: string) => string }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [half, setHalf] = useState(page.board!.w * page.board!.h > 1920 * 1080 * 0.9);
  const [result, setResult] = useState<{ blob: Blob; name: string; kind: string } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const name = fileSlug(tr ? tr(page.title) : page.title);
  const job = () => ({ p, page, media, tr, signal: abort.current!.signal, onProgress: setProgress });
  const run = async (k: string, make: () => Promise<Blob>, file: string) => {
    abort.current = new AbortController();
    setBusy(k);
    setProgress(0);
    setResult(null);
    try {
      const blob = await make();
      saveFile(blob, file);
      setResult({ blob, name: file, kind: k });
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') {
        console.warn(err);
        toast((err as Error)?.message === 'no-codec' ? t('This browser cannot write MP4. Try Chrome, Edge or Safari, or export a GIF.') : t('The export did not work. Try again.'), { tone: 'error' });
      }
    } finally {
      setBusy(null);
    }
  };
  const Btn = ({ k, icon, title, sub, onClick, disabled }: { k: string; icon: React.ReactNode; title: string; sub: string; onClick: () => void; disabled?: boolean }) => (
    <button type="button" disabled={!!busy || !ready || disabled} onClick={onClick} className="flex w-full items-start gap-3 rounded-[18px] bg-white/[.08] p-3 text-start transition-colors hover:bg-white/15 disabled:opacity-50">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-white/15">{busy === k ? <Loader2 size={16} className="animate-spin" /> : icon}</span>
      <span className="min-w-0">
        <span className="block text-[14px] font-bold">{title}</span>
        <span className="block text-[12px] leading-[1.4] text-white/65">{sub}</span>
      </span>
    </button>
  );
  const b = page.board!;
  return (
    <div className="space-y-3">
      <p className="lg-label flex items-center gap-1.5">
        <Film size={13} /> {t('Animation')} · {b.w} × {b.h}
      </p>
      <Seg label={t('Size')} value={half ? 'half' : 'full'} options={[{ id: 'full', label: `${b.w} × ${b.h}` }, { id: 'half', label: `${Math.round(b.w / 2)} × ${Math.round(b.h / 2)}` }]} onChange={(v) => setHalf(v === 'half')} />
      <Btn k="mp4" icon={<Film size={17} />} title={t('Video · MP4')} sub={canVideo() ? t('Frame by frame, {fps} a second: smooth on any device, ready for Instagram, a reel or a screen.', { fps: b.fps ?? 30 }) : t('This browser cannot write MP4. Try Chrome, Edge or Safari, or export a GIF.')} disabled={!canVideo()} onClick={() => run('mp4', () => boardVideo(job(), half), `${name}.mp4`)} />
      <Btn k="gif" icon={<ImagePlus size={17} />} title={t('GIF')} sub={t('Up to 600 px wide, 15 frames a second; plays anywhere, even in an email.')} onClick={() => run('gif', () => boardGif(job()), `${name}.gif`)} />
      <Btn k="lottie" icon={<Sparkles size={17} />} title={t('Lottie · JSON')} sub={t('For apps and sites: every moving part is a layer with its own keyframes. Reveals and blurs become fades.')} onClick={() => run('lottie', () => boardLottie(job()), `${name}.json`)} />
      <Btn k="png" icon={<FileImage size={17} />} title={t('Poster · PNG')} sub={t('The last frame, everything in place.')} onClick={() => run('png', () => boardPoster(job()), `${name}.png`)} />
      {busy && (
        <div className="flex items-center gap-2" role="status">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-[#4f8bff] transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <span className="w-10 text-end text-[12px] tabular-nums">{Math.round(progress * 100)}%</span>
          <button type="button" onClick={() => abort.current?.abort()} className="lg-btn lg-btn-plain min-h-[30px] px-2.5 text-[12px]">
            {t('Cancel')}
          </button>
        </div>
      )}
      {result && (
        <div className="space-y-2 rounded-[16px] bg-[#2fbf71]/15 p-3">
          <p className="text-[12.5px] font-bold">
            {t('Saved: {file}', { file: result.name })} · {(result.blob.size / 1024 / 1024).toFixed(1)} MB
          </p>
          {result.kind === 'lottie' && <LottiePreview blob={result.blob} w={b.w} h={b.h} />}
          {result.kind !== 'png' && (
            <button
              type="button"
              onClick={() => {
                upload([new File([result.blob], result.name, { type: result.blob.type })], p.id, { isReference: false });
                toast(t('Added to the project: it opens in Review and can go on a page'));
              }}
              className="lg-btn lg-btn-ghost min-h-[34px] w-full text-[12.5px]"
            >
              <ImagePlus size={13} /> {t('Add to the project')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** the exported Lottie, played by the same player apps use */
function LottiePreview({ blob, w, h }: { blob: Blob; w: number; h: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let anim: { destroy: () => void } | undefined;
    let live = true;
    (async () => {
      const [{ default: lottie }, data] = await Promise.all([import('lottie-web/build/player/lottie_light'), blob.text().then((x) => JSON.parse(x))]);
      if (!live || !ref.current) return;
      anim = lottie.loadAnimation({ container: ref.current, renderer: 'svg', loop: true, autoplay: true, animationData: data }) as unknown as { destroy: () => void };
    })();
    return () => {
      live = false;
      anim?.destroy();
    };
  }, [blob]);
  return <div ref={ref} data-lottie-preview className="mx-auto overflow-hidden rounded-[10px] bg-black/20" style={{ width: Math.min(280, (280 * w) / Math.max(w, h)), aspectRatio: `${w} / ${h}` }} />;
}
