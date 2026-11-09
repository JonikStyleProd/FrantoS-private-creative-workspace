import React, { useEffect, useState } from 'react';
import { Download, HardDrive, Image as ImageIcon, Palette as PaletteIcon, Plus, Trash2, Type, UserRound, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { go } from '../route';
import { useWs, ws } from '../ws/store';
import type { BrandFont } from '../ws/types';
import { toast } from '../ws/kit';
import { FilePick } from '../ws/uploads';
import { GlassPage } from '../glass/Shell';
import { GlassLang, Pane, ThemeSwitch } from '../glass/kit';
import { DEFAULT_BRAND, FONTS, fontCss } from '../studio/brand';
import { projectPalette } from '../studio/palette';

/** Profile, brand kit, language and theme, storage, export. Everything here stays in this browser until you publish. */
export function SettingsPage() {
  const { t } = useI18n();
  const { state } = useWs();
  const brand = { ...DEFAULT_BRAND, ...state.brand };
  const profile = { name: '', handle: '', ...state.profile };
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);
  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => e.usage != null && e.quota && setUsage({ used: e.usage, quota: e.quota }));
  }, []);
  const mb = (n: number) => (n > 1e9 ? `${(n / 1e9).toFixed(1)} GB` : `${Math.round(n / 1e6)} MB`);
  const allColours = [...new Set(state.projects.flatMap((p) => projectPalette(p)))].slice(0, 24);

  const pickLogo = async (files: FileList) => {
    const f = files[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast(t('A logo is an image: SVG, PNG or WebP.'), { tone: 'error' });
    if (f.type === 'image/svg+xml' && f.size < 200_000) {
      const r = new FileReader();
      r.onload = () => ws.setBrand({ logo: r.result as string });
      r.readAsDataURL(f);
      return;
    }
    const bmp = await createImageBitmap(f);
    const s = Math.min(1, 640 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * s);
    c.height = Math.round(bmp.height * s);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    ws.setBrand({ logo: c.toDataURL('image/png') });
  };

  const exportAll = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), app: 'FrantoS', state }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `frantos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  const fontPick = (label: string, value: BrandFont, on: (f: BrandFont) => void) => (
    <div>
      <p className="lg-label mb-1.5">{label}</p>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {FONTS.map((f) => (
          <button key={f.id} type="button" onClick={() => on(f.id)} aria-pressed={value === f.id} className={`rounded-[14px] px-3 py-2.5 text-start ${value === f.id ? 'bg-white text-[#11151a]' : 'lg-soft hover:bg-white/10'}`}>
            <span className="block text-[20px] leading-none" style={{ fontFamily: f.css }}>
              Aa
            </span>
            <span className="mt-1 block text-[11.5px] font-bold">{f.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <GlassPage kicker={t('Settings')} title={t('Your studio')} lead={t('Who you are on your portfolio, how your work is dressed, and where it is stored.')} bg="/projects/form-01/ref-silk.webp">
      <div className="grid gap-5 lg:grid-cols-2">
        <Pane className="space-y-4 rounded-[28px] p-5">
          <h2 className="flex items-center gap-2 text-[18px] font-extrabold">
            <UserRound size={18} /> {t('Profile')}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('Name on the portfolio')} value={profile.name} onChange={(v) => ws.setProfile({ name: v })} />
            <Field label={t('Portfolio address')} prefix="/u/" value={profile.handle} onChange={(v) => ws.setProfile({ handle: v.toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 32) })} />
            <Field label={t('Role')} value={profile.role ?? ''} onChange={(v) => ws.setProfile({ role: v })} placeholder={t('Art director, Tel Aviv')} />
            <div className="sm:col-span-2">
              <label className="lg-label" htmlFor="pf-bio">
                {t('About')}
              </label>
              <textarea id="pf-bio" dir="auto" rows={3} className="lg-input mt-1 text-[14px]" value={profile.bio ?? ''} onChange={(e) => ws.setProfile({ bio: e.target.value })} placeholder={t('Two lines about what you make and for whom.')} />
            </div>
          </div>
          <div>
            <p className="lg-label mb-1.5">{t('Links')}</p>
            {(profile.links ?? []).map((l, i) => (
              <div key={i} className="mb-1.5 flex gap-1.5">
                <input dir="auto" className="lg-input min-h-[38px] w-[34%] py-1.5 text-[13px]" value={l.label} placeholder={t('Instagram')} aria-label={t('Link name')} onChange={(e) => ws.setProfile({ links: (profile.links ?? []).map((x, k) => (k === i ? { ...x, label: e.target.value } : x)) })} />
                <input dir="ltr" className="lg-input min-h-[38px] flex-1 py-1.5 text-[13px]" value={l.url} placeholder="https://" aria-label={t('Address')} onChange={(e) => ws.setProfile({ links: (profile.links ?? []).map((x, k) => (k === i ? { ...x, url: e.target.value } : x)) })} />
                <button type="button" onClick={() => ws.setProfile({ links: (profile.links ?? []).filter((_, k) => k !== i) })} className="lg-btn lg-btn-plain lg-icon h-[38px] min-h-0 w-[38px]" aria-label={t('Remove')}>
                  <X size={14} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => ws.setProfile({ links: [...(profile.links ?? []), { label: '', url: '' }] })} className="lg-btn lg-btn-ghost min-h-[36px] text-[12.5px]">
              <Plus size={14} /> {t('Add a link')}
            </button>
          </div>
          <button type="button" onClick={() => go('/portfolio')} className="lg-btn lg-btn-primary">
            {t('Set up the portfolio')}
          </button>
        </Pane>

        <Pane className="space-y-4 rounded-[28px] p-5">
          <h2 className="flex items-center gap-2 text-[18px] font-extrabold">
            <PaletteIcon size={18} /> {t('Brand kit')}
          </h2>
          <p className="text-[13px] leading-[1.5] text-white/70">{t('Set once: new boards, case pages, presentations and the brand guide use it.')}</p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-20 w-40 items-center justify-center overflow-hidden rounded-[16px] lg-soft">{brand.logo ? <img src={brand.logo} alt={t('Logo')} className="max-h-16 max-w-[136px] object-contain" /> : <ImageIcon size={22} className="text-white/50" />}</div>
            <div className="flex flex-col gap-1.5">
              <FilePick onFiles={pickLogo} multiple={false} accept="image/svg+xml,image/png,image/webp" className="lg-btn lg-btn-ghost min-h-[36px] text-[12.5px]">
                {brand.logo ? t('Replace the logo') : t('Add a logo')}
              </FilePick>
              {brand.logo && (
                <button type="button" onClick={() => ws.setBrand({ logo: undefined })} className="lg-btn lg-btn-plain min-h-[32px] text-[12px]">
                  <Trash2 size={13} /> {t('Remove')}
                </button>
              )}
            </div>
          </div>
          <Field label={t('Studio name')} value={brand.name ?? ''} onChange={(v) => ws.setBrand({ name: v })} placeholder="JonikStyle Production" />
          {fontPick(t('Headings'), brand.font, (f) => ws.setBrand({ font: f }))}
          {fontPick(t('Text'), brand.bodyFont ?? brand.font, (f) => ws.setBrand({ bodyFont: f }))}
          <div>
            <p className="lg-label mb-1.5">{t('Brand colours')}</p>
            <div className="flex flex-wrap gap-1.5">
              {brand.palette.map((c) => (
                <span key={c} className="group relative">
                  <span className="block h-9 w-9 rounded-full ring-1 ring-white/30" style={{ background: c }} title={c} />
                  <button type="button" onClick={() => ws.setBrand({ palette: brand.palette.filter((x) => x !== c) })} className="absolute -end-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-white text-[#11151a] group-hover:flex" aria-label={t('Remove {name}', { name: c })}>
                    <X size={10} />
                  </button>
                </span>
              ))}
              <label className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full lg-soft" title={t('Add a colour')}>
                <Plus size={14} />
                <input type="color" className="sr-only" aria-label={t('Add a colour')} onChange={(e) => !brand.palette.includes(e.target.value) && ws.setBrand({ palette: [...brand.palette, e.target.value].slice(0, 10) })} />
              </label>
            </div>
            {allColours.length > 0 && (
              <>
                <p className="mt-2 text-[12px] text-white/60">{t('From your projects:')}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {allColours.map((c) => (
                    <button key={c} type="button" onClick={() => !brand.palette.includes(c) && ws.setBrand({ palette: [...brand.palette, c].slice(0, 10) })} className="h-6 w-6 rounded-full ring-1 ring-white/30 hover:scale-110" style={{ background: c }} title={c} aria-label={t('Add {name}', { name: c })} />
                  ))}
                </div>
              </>
            )}
          </div>
          <div>
            <label className="lg-label" htmlFor="br-voice">
              {t('Voice')}
            </label>
            <textarea id="br-voice" dir="auto" rows={2} className="lg-input mt-1 text-[14px]" value={brand.voice ?? ''} onChange={(e) => ws.setBrand({ voice: e.target.value })} placeholder={t('Calm, exact, a little warm. Short sentences.')} />
          </div>
          <div className="rounded-[18px] p-4 lg-soft">
            <p className="text-[28px] leading-[1.05]" style={{ fontFamily: fontCss(brand.font), color: brand.palette[0] }}>
              {brand.name || 'FORM / 01'}
            </p>
            <p className="mt-1 text-[14px] text-white/80" style={{ fontFamily: fontCss(brand.bodyFont ?? brand.font) }}>
              {brand.voice || t('Object identity for a ceramics studio.')}
            </p>
          </div>
        </Pane>

        <Pane className="space-y-4 rounded-[28px] p-5">
          <h2 className="flex items-center gap-2 text-[18px] font-extrabold">
            <Type size={18} /> {t('Language and theme')}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <GlassLang />
            <ThemeSwitch />
          </div>
        </Pane>

        <Pane className="space-y-3 rounded-[28px] p-5">
          <h2 className="flex items-center gap-2 text-[18px] font-extrabold">
            <HardDrive size={18} /> {t('Storage')}
          </h2>
          <p className="text-[13.5px] leading-[1.5] text-white/75">{t('Projects and files live in this browser (IndexedDB). Projects you move to a studio also sync to the server.')}</p>
          {usage && (
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-white/15">
                <div className="h-full bg-white" style={{ width: `${Math.max(1, (usage.used / usage.quota) * 100)}%` }} />
              </div>
              <p className="mt-1.5 text-[12.5px] text-white/70">{t('{used} used of {quota} this browser allows', { used: mb(usage.used), quota: mb(usage.quota) })}</p>
            </div>
          )}
          <button type="button" onClick={exportAll} className="lg-btn lg-btn-ghost">
            <Download size={15} /> {t('Export all data (JSON)')}
          </button>
          <p className="text-[12px] text-white/60">{t('The export holds projects, notes, boards and settings. Uploaded files stay in the browser.')}</p>
        </Pane>
      </div>
    </GlassPage>
  );
}

function Field({ label, value, onChange, placeholder, prefix }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; prefix?: string }) {
  const id = React.useId();
  return (
    <div>
      <label className="lg-label" htmlFor={id}>
        {label}
      </label>
      <div className="mt-1 flex items-center">
        {prefix && <span className="me-1 text-[13px] text-white/55">{prefix}</span>}
        <input id={id} dir="auto" className="lg-input text-[14px]" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}
