import React, { useEffect } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useI18n } from '../i18n';
import { go } from '../route';
import { ensureLoaded, useProject, useWs } from '../ws/store';
import type { Board, Project } from '../ws/types';
import { toast } from '../ws/kit';
import { DEFAULT_BRAND, fontCss, FONTS } from '../studio/brand';
import { hexToRgb, luminance, projectPalette } from '../studio/palette';
import { LayerView } from '../studio/CanvasMode';

/**
 * A brand guide to hand over: logo, colours with their values, typefaces, voice, materials and
 * the boards as applications. Made from the brand kit (Settings) and the project; prints to PDF.
 */
export function GuidePage({ id }: { id: string }) {
  const { t, dir } = useI18n();
  const { project: p, loading } = useProject(id);
  const { state } = useWs();
  useEffect(() => void ensureLoaded(), []);
  if (!p) return loading ? <div className="fixed inset-0 bg-[#f4f1ea]" /> : null;
  const brand = { ...DEFAULT_BRAND, ...state.brand };
  const colours = [...new Set([...brand.palette, ...projectPalette(p)])].slice(0, 10);
  const head = fontCss(brand.font);
  const body = fontCss(brand.bodyFont ?? brand.font);
  const name = brand.name || state.profile?.name || 'FrantoS';
  const copy = (v: string) => navigator.clipboard?.writeText(v).then(() => toast(t('Copied {v}', { v })));
  const H = ({ n, children }: { n: string; children: React.ReactNode }) => (
    <h2 className="flex items-baseline gap-4 border-t border-black/15 pt-5 text-[13px] font-bold uppercase tracking-[0.14em] text-black/55">
      <span className="tabular-nums">{n}</span> {children}
    </h2>
  );
  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#f4f1ea] text-[#16130f] print:static print:overflow-visible" dir={dir} style={{ fontFamily: body }}>
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-black/10 bg-[#f4f1ea]/90 px-4 py-2.5 backdrop-blur print:hidden">
        <button type="button" onClick={() => go(`/p/${p.id}`)} className="flex min-h-[40px] items-center gap-2 rounded-full px-3 text-[14px] font-semibold hover:bg-black/5">
          <ArrowLeft size={16} className="rtl:-scale-x-100" /> {p.title}
        </button>
        <span className="text-[13px] text-black/55">{t('Brand guide')}</span>
        <button type="button" onClick={() => go('/settings')} className="ms-auto min-h-[40px] rounded-full px-3 text-[13.5px] font-semibold hover:bg-black/5">
          {t('Edit the brand kit')}
        </button>
        <button type="button" onClick={() => window.print()} className="flex min-h-[40px] items-center gap-2 rounded-full bg-[#16130f] px-4 text-[13.5px] font-semibold text-white">
          <Printer size={15} /> {t('Save as PDF')}
        </button>
      </div>

      <main className="mx-auto max-w-[1100px] px-6 pb-24 print:px-0">
        <section className="flex min-h-[80vh] flex-col justify-between py-14 print:min-h-[100vh] print:break-after-page">
          <div className="flex items-center gap-4">{brand.logo ? <img src={brand.logo} alt={name} className="max-h-16 max-w-[240px] object-contain" /> : <span className="text-[22px] font-bold" style={{ fontFamily: head }}>{name}</span>}</div>
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-black/55">{t('Brand guide')}</p>
            <h1 className="mt-3 text-[clamp(56px,9vw,128px)] leading-[0.92] tracking-[-0.04em]" style={{ fontFamily: head, fontWeight: 800 }}>
              {p.title}
            </h1>
            {p.brief && <p className="mt-6 max-w-[48ch] text-[19px] leading-[1.5] text-black/75">{p.brief}</p>}
          </div>
          <div className="flex h-3 overflow-hidden rounded-full">
            {colours.map((c) => (
              <span key={c} className="flex-1" style={{ background: c }} />
            ))}
          </div>
        </section>

        <section className="space-y-6 py-10 print:break-after-page">
          <H n="01">{t('Colour')}</H>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {colours.map((c, i) => {
              const { r, g, b } = hexToRgb(c);
              return (
                <button key={c} type="button" onClick={() => copy(c)} className="text-start" title={t('Copy')}>
                  <span className={`block ${i < 2 ? 'aspect-[3/4]' : 'aspect-square'} rounded-[6px] ring-1 ring-black/10`} style={{ background: c }} />
                  <span className="mt-2 block font-mono text-[13px] font-semibold uppercase">{c}</span>
                  <span className="block font-mono text-[12px] text-black/55">
                    RGB {r} {g} {b}
                  </span>
                  <span className="block text-[12px] text-black/55">{luminance(c) > 0.55 ? t('Dark text on it') : t('Light text on it')}</span>
                </button>
              );
            })}
          </div>
          {!colours.length && <p className="text-black/60">{t('Add brand colours in Settings, or pick a palette in the studio.')}</p>}
        </section>

        <section className="space-y-6 py-10 print:break-after-page">
          <H n="02">{t('Type')}</H>
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-black/55">
                {t('Headings')} · {FONTS.find((f) => f.id === brand.font)?.label}
              </p>
              <p className="mt-3 text-[64px] leading-[0.95] tracking-[-0.03em]" style={{ fontFamily: head, fontWeight: 800 }}>
                Aa Бб אב
              </p>
              <p className="mt-4 text-[34px] leading-[1.05]" style={{ fontFamily: head, fontWeight: 700 }}>
                {p.title}
              </p>
            </div>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-black/55">
                {t('Text')} · {FONTS.find((f) => f.id === (brand.bodyFont ?? brand.font))?.label}
              </p>
              <p className="mt-3 text-[17px] leading-[1.6]" style={{ fontFamily: body }}>
                {p.brief || t('Body text sits at 16–18 px with a generous line height. Keep lines under 70 characters.')}
              </p>
              <p className="mt-3 text-[13px] leading-[1.6] text-black/65" style={{ fontFamily: body }}>
                ABCDEFGHIJKLMNOPQRSTUVWXYZ · abcdefghijklmnopqrstuvwxyz · 0123456789
              </p>
            </div>
          </div>
          {brand.voice && (
            <div className="rounded-[8px] bg-white/70 p-5">
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-black/55">{t('Voice')}</p>
              <p className="mt-2 text-[22px] leading-[1.4]" style={{ fontFamily: head }}>
                {brand.voice}
              </p>
            </div>
          )}
        </section>

        {(p.objects ?? []).length > 0 && (
          <section className="space-y-6 py-10 print:break-after-page">
            <H n="03">{t('Materials')}</H>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {(p.objects ?? [])
                .flatMap((o) => o.variants)
                .slice(0, 8)
                .map((v) => (
                  <div key={v.id}>
                    <span className="block aspect-[3/4] rounded-[40px_40px_12px_12px] ring-1 ring-black/10" style={{ background: `linear-gradient(0deg, ${v.baseColor} 0 ${Math.round((v.blend - v.softness / 2) * 100)}%, ${v.topColor} ${Math.round((v.blend + v.softness / 2) * 100)}% 100%)` }} />
                    <p className="mt-2 text-[15px] font-semibold">{t(v.name)}</p>
                    <p className="font-mono text-[12px] uppercase text-black/55">
                      {v.baseColor} · {v.topColor}
                    </p>
                  </div>
                ))}
            </div>
          </section>
        )}

        {(p.boards ?? []).length > 0 && (
          <section className="space-y-6 py-10">
            <H n={(p.objects ?? []).length ? '04' : '03'}>{t('In use')}</H>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(p.boards ?? []).map((b) => (
                <figure key={b.id} className="print:break-inside-avoid">
                  <MiniBoard p={p} b={b} w={320} />
                  <figcaption className="mt-2 text-[13px] text-black/60">
                    {b.title} · {b.w}×{b.h}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}
        <p className="mt-16 text-[12px] text-black/45">{t('Made with FrantoS · {name}', { name })}</p>
      </main>
    </div>
  );
}

function MiniBoard({ p, b, w }: { p: Project; b: Board; w: number }) {
  const { state } = useWs();
  const ref = React.useRef<HTMLDivElement>(null);
  const [cw, setCw] = React.useState(w);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCw(el.clientWidth || w));
    ro.observe(el);
    return () => ro.disconnect();
  }, [w]);
  const k = cw / b.w;
  return (
    <div ref={ref} className="relative overflow-hidden rounded-[4px] ring-1 ring-black/10" style={{ width: '100%', aspectRatio: `${b.w} / ${b.h}` }} dir="ltr">
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: b.w, height: b.h, background: b.bg, transform: `scale(${k})` }}>
        {b.layers.map((l) => (
          <LayerView key={l.id} p={p} l={l} rtl={false} brandFont={state.brand?.font} selected={false} scale={k} />
        ))}
      </div>
    </div>
  );
}
