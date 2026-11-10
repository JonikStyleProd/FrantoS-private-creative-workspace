import React, { Suspense, useMemo, useState } from 'react';
import { AppWindow } from 'lucide-react';
import { ArrowLeft, Check, Code2, Copy, Download, ExternalLink, GitBranch, Image as ImageIcon, Printer, Smartphone, Type } from 'lucide-react';
import { useI18n } from '../i18n';
import { go } from '../route';
import { useProject, useWs, ws } from '../ws/store';
import type { Asset, Project } from '../ws/types';
import { AssetThumb, toast } from '../ws/kit';
import { assetUrl } from '../ws/media';
import { GlassPage } from '../glass/Shell';
import { Pane } from '../glass/kit';
import { DEFAULT_BRAND, FONTS } from '../studio/brand';
import { projectPalette } from '../studio/palette';
import { TokensPanel } from './TokensPanel';
import { tokensOf } from './tokens';
import { screensOf } from './FlowPage';

const rgb = (hex: string) => {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

async function copyText(text: string, t: (s: string) => string) {
  try {
    await navigator.clipboard.writeText(text);
    toast(t('Copied'));
  } catch {
    toast(t('The browser did not allow copying. Select the text and copy it.'), { tone: 'error' });
  }
}

/** a picture at 1×, 2× or 3× of a base width, as PNG; SVG and the original are handed over as they are */
async function exportAt(a: Asset, scale: number, base: number) {
  const url = await assetUrl(a, 'full');
  if (!url) return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  await img.decode();
  const w = Math.round(Math.min(base * scale, img.naturalWidth));
  const h = Math.round((w * img.naturalHeight) / img.naturalWidth);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d')!.drawImage(img, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));
  if (blob) save(blob, `${slug(a.title)}${scale > 1 ? `@${scale}x` : ''}.png`);
}
async function exportOriginal(a: Asset) {
  const url = await assetUrl(a, 'raw');
  if (!url) return;
  const blob = await fetch(url).then((r) => r.blob());
  const ext = a.format === 'svg' ? 'svg' : blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
  save(blob, `${slug(a.title)}.${ext}`);
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9א-תа-я]+/gi, '-').replace(/^-|-$/g, '') || 'asset';
function save(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

/** Everything a developer needs from a project on one page: repo, colours, type, tokens, screens, assets at size. */
export function HandoffPage({ id }: { id: string }) {
  const { t } = useI18n();
  const { project: p, loading } = useProject(id);
  if (loading) return <div className="lg fixed inset-0" />;
  if (!p) return <GlassPage title={t('This project is not here.')}>{null}</GlassPage>;
  return <Handoff p={p} />;
}

const ExportBody = React.lazy(() => import('../site/ExportPanel').then((m) => ({ default: m.ExportBody })));

function Handoff({ p }: { p: Project }) {
  const { t } = useI18n();
  const { state } = useWs();
  const brand = { ...DEFAULT_BRAND, ...state.brand };
  const colours = useMemo(() => [...new Set([...(brand.palette ?? []), ...projectPalette(p)].map((c) => c.toLowerCase()))].slice(0, 12), [brand.palette, p]);
  const tokens = tokensOf(brand, colours);
  const screens = screensOf(p);
  const approved = p.works.map((w) => p.assets.find((a) => a.id === (w.versions.find((v) => v.id === w.approvedVersionId) ?? w.versions[w.versions.length - 1])?.assetId)).filter((a): a is Asset => !!a && a.kind === 'image');
  const deliver = [...new Map([...approved, ...p.assets.filter((a) => a.format === 'svg')].map((a) => [a.id, a])).values()];
  const fonts = p.assets.filter((a) => a.format === 'font');
  const code = p.assets.filter((a) => a.format === 'code');
  const [repo, setRepo] = useState(p.repo ?? '');
  const repoOk = /^https?:\/\//i.test(p.repo ?? '');

  return (
    <div className="handoff-print">
      <GlassPage
        kicker={t('Handoff')}
        title={p.title}
        lead={p.brief}
        bg="/projects/form-01/ref-window.webp"
        action={
          <div className="no-print flex flex-wrap gap-2">
            <button type="button" onClick={() => go(`/p/${p.id}`)} className="lg-btn lg-btn-ghost">
              <ArrowLeft size={15} className="rtl:-scale-x-100" /> {t('Back to the project')}
            </button>
            <button type="button" onClick={() => window.print()} className="lg-btn lg-btn-primary">
              <Printer size={15} /> {t('Print or save as PDF')}
            </button>
          </div>
        }
      >
        {(p.pages ?? []).length > 0 && (
          <Pane className="no-print mb-5 grid gap-5 rounded-[28px] p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-[18px] font-extrabold">
                <AppWindow size={18} /> {t('Site pages')}
              </h2>
              <p className="text-[13.5px] leading-[1.5] text-white/75">{t('Built in the studio’s Site mode. The code comes from the same renderer as the pages: tokens as CSS variables, three widths, the motion.')}</p>
              <ul className="space-y-1.5">
                {(p.pages ?? []).map((pg) => (
                  <li key={pg.id} className="flex items-center gap-2 rounded-[14px] px-3 py-2 lg-soft">
                    <span dir="auto" className="min-w-0 flex-1 truncate text-[14px] font-bold">
                      {p.kind === 'demo' ? t(pg.title) : pg.title}
                    </span>
                    <code dir="ltr" className="text-[11.5px] text-white/55 max-sm:hidden">
                      /{pg.slug}
                    </code>
                    <button type="button" onClick={() => go(`/site/${p.id}/${pg.id}`)} className="lg-btn lg-btn-plain min-h-[32px] px-2.5 text-[12px]">
                      <ExternalLink size={13} /> {t('Live')}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <Suspense fallback={null}>
              <ExportBody p={p} />
            </Suspense>
          </Pane>
        )}
        <div className="grid gap-5 lg:grid-cols-2">
          <Pane className="space-y-3 rounded-[28px] p-5">
            <h2 className="flex items-center gap-2 text-[18px] font-extrabold">
              <GitBranch size={18} /> {t('Repository')}
            </h2>
            <form
              className="no-print flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const v = repo.trim();
                if (v && !/^https?:\/\//i.test(v)) return toast(t('Paste the full address, starting with https://'), { tone: 'error' });
                ws.setRepo(p.id, v);
                toast(t('Saved'));
              }}
            >
              <input dir="ltr" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="https://github.com/…" aria-label={t('Repository address')} className="lg-input min-w-0 flex-1 text-[14px]" />
              <button type="submit" className="lg-btn lg-btn-ghost">
                {t('Save the address')}
              </button>
            </form>
            {repoOk && (
              <a href={p.repo} target="_blank" rel="noopener noreferrer" dir="ltr" className="flex items-center gap-2 break-all text-[14px] font-bold underline-offset-2 hover:underline">
                <ExternalLink size={14} className="shrink-0" /> {p.repo}
              </a>
            )}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              {[
                { n: screens.length, l: t('Screens') },
                { n: deliver.length, l: t('Assets') },
                { n: colours.length, l: t('Colours') },
              ].map((x) => (
                <div key={x.l} className="rounded-[16px] p-3 lg-soft">
                  <p className="text-[24px] font-extrabold tabular-nums">{x.n}</p>
                  <p className="text-[12px] text-white/70">{x.l}</p>
                </div>
              ))}
            </div>
          </Pane>

          <Pane className="space-y-3 rounded-[28px] p-5">
            <h2 className="flex items-center gap-2 text-[18px] font-extrabold">
              <Type size={18} /> {t('Type')}
            </h2>
            {[
              { role: t('Headings'), id: brand.font, stack: tokens.fonts.heading },
              { role: t('Text'), id: brand.bodyFont ?? brand.font, stack: tokens.fonts.body },
            ].map((f) => (
              <button key={f.role} type="button" onClick={() => copyText(`font-family: ${f.stack};`, t)} className="block w-full rounded-[16px] p-3 text-start lg-soft hover:bg-white/15">
                <span className="lg-label">{f.role}</span>
                <span className="mt-1 block text-[26px] leading-tight" style={{ fontFamily: FONTS.find((x) => x.id === f.id)?.css }}>
                  {FONTS.find((x) => x.id === f.id)?.label}
                </span>
                <span dir="ltr" className="mt-1 block truncate text-[11.5px] text-white/60" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {f.stack}
                </span>
              </button>
            ))}
            {fonts.length > 0 && (
              <ul className="space-y-1">
                {fonts.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 rounded-[12px] px-3 py-2 text-[13px] lg-soft">
                    <span dir="auto" className="min-w-0 flex-1 truncate font-bold">
                      {a.title}
                    </span>
                    <button type="button" onClick={() => exportOriginal(a)} className="no-print lg-btn lg-btn-plain lg-icon min-h-[30px]" aria-label={t('Download {name}', { name: a.title })}>
                      <Download size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Pane>

          <Pane className="space-y-3 rounded-[28px] p-5 lg:col-span-2">
            <h2 className="text-[18px] font-extrabold">{t('Colours')}</h2>
            <p className="no-print text-[13px] text-white/70">{t('Click a colour to copy its value.')}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {colours.map((c) => (
                <button key={c} type="button" onClick={() => copyText(c, t)} className="overflow-hidden rounded-[16px] text-start ring-1 ring-white/15 hover:ring-white/40">
                  <span className="block h-16" style={{ background: c }} />
                  <span dir="ltr" className="block px-3 py-2 text-[12px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <span className="block font-bold">{c}</span>
                    <span className="block text-white/60">rgb({rgb(c)})</span>
                  </span>
                </button>
              ))}
            </div>
          </Pane>

          <div className="lg:col-span-2">
            <TokensPanel />
          </div>

          {screens.length > 0 && (
            <Pane className="space-y-3 rounded-[28px] p-5 lg:col-span-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="me-auto flex items-center gap-2 text-[18px] font-extrabold">
                  <Smartphone size={18} /> {t('Screens')}
                </h2>
                <button type="button" onClick={() => go(`/p/${p.id}/proto`)} className="no-print lg-btn lg-btn-ghost min-h-[36px] text-[13px]">
                  {t('Play the prototype')}
                </button>
              </div>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {screens.map((a) => (
                  <li key={a.id}>
                    <AssetThumb asset={a} className="aspect-[9/16] w-full rounded-[14px] object-top ring-1 ring-white/15" />
                    <p dir="auto" className="mt-1 truncate text-[12.5px] font-bold">
                      {a.title}
                    </p>
                    <p className="text-[11px] text-white/60">
                      {t(a.device === 'phone' ? 'Phone' : a.device === 'tablet' ? 'Tablet' : 'Desktop')} · {a.w}×{a.h}
                    </p>
                  </li>
                ))}
              </ul>
            </Pane>
          )}

          <Pane className="space-y-3 rounded-[28px] p-5 lg:col-span-2">
            <h2 className="flex items-center gap-2 text-[18px] font-extrabold">
              <ImageIcon size={18} /> {t('Assets')}
            </h2>
            <p className="text-[13px] text-white/70">{t('Approved versions of each work and every vector file. PNG at 1×, 2× and 3× of the width you set, or the original.')}</p>
            <AssetList list={deliver} />
          </Pane>

          {code.length > 0 && (
            <Pane className="space-y-3 rounded-[28px] p-5 lg:col-span-2">
              <h2 className="flex items-center gap-2 text-[18px] font-extrabold">
                <Code2 size={18} /> {t('Snippets')}
              </h2>
              {code.map((a) => (
                <details key={a.id} className="rounded-[16px] lg-soft">
                  <summary className="cursor-pointer px-4 py-3 text-[14px] font-bold">
                    {a.title} <span className="text-white/50">· {(a.lang ?? '').toUpperCase()}</span>
                  </summary>
                  <div className="relative">
                    <pre dir="ltr" className="lg-scroll max-h-[320px] overflow-auto rounded-b-[16px] p-4 text-[12px] leading-[1.6]" style={{ fontFamily: "'JetBrains Mono', monospace", background: '#12151a', color: '#e6e9ee' }}>
                      {a.text}
                    </pre>
                    <button type="button" onClick={() => copyText(a.text ?? '', t)} className="no-print lg-glass absolute end-2 top-2 flex h-8 items-center gap-1 rounded-full px-3 text-[12px] font-bold">
                      <Copy size={12} /> {t('Copy')}
                    </button>
                  </div>
                </details>
              ))}
            </Pane>
          )}
        </div>
      </GlassPage>
    </div>
  );
}

function AssetList({ list }: { list: Asset[] }) {
  const { t } = useI18n();
  const [base, setBase] = useState(390);
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch {
      toast(t('This file could not be exported.'), { tone: 'error' });
    } finally {
      setBusy(null);
    }
  };
  if (!list.length) return <p className="text-[14px] text-white/70">{t('Approve a version of a work and it appears here.')}</p>;
  return (
    <>
      <label className="no-print flex items-center gap-2 text-[13px] text-white/75">
        {t('1× width')}
        <input type="number" min={16} max={4000} value={base} onChange={(e) => setBase(Math.max(16, Math.min(4000, +e.target.value || 390)))} className="lg-input h-9 w-24 text-[13px]" dir="ltr" />
        px
      </label>
      <ul className="grid gap-2 sm:grid-cols-2">
        {list.map((a) => (
          <li key={a.id} className="flex items-center gap-3 rounded-[16px] p-2 lg-soft">
            <AssetThumb asset={a} className="h-14 w-14 shrink-0 rounded-[10px] bg-[#ffffff] object-cover" />
            <span className="min-w-0 flex-1">
              <span dir="auto" className="block truncate text-[13.5px] font-bold">
                {a.title}
              </span>
              <span className="block text-[11.5px] text-white/60">
                {a.format === 'svg' ? 'SVG' : `${a.w}×${a.h}`}
              </span>
            </span>
            <span className="no-print flex flex-wrap justify-end gap-1">
              {a.format !== 'svg' &&
                [1, 2, 3].map((s) => (
                  <button key={s} type="button" disabled={!!busy} onClick={() => run(a.id + s, () => exportAt(a, s, base))} className="min-h-[30px] rounded-full bg-white/10 px-2.5 text-[11.5px] font-bold hover:bg-white/20">
                    {busy === a.id + s ? <Check size={12} /> : `${s}×`}
                  </button>
                ))}
              <button type="button" disabled={!!busy} onClick={() => run(a.id + 'o', () => exportOriginal(a))} className="flex min-h-[30px] items-center gap-1 rounded-full bg-white/10 px-2.5 text-[11.5px] font-bold hover:bg-white/20" aria-label={t('Download the original')}>
                <Download size={12} /> {a.format === 'svg' ? 'SVG' : t('Original')}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
