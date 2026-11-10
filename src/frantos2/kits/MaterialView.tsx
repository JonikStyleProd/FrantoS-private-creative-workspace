import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Laptop, Monitor, Pause, Play, Smartphone, Tablet, X } from 'lucide-react';
import { useI18n } from '../i18n';
import type { Asset } from '../ws/types';
import { useAssetUrl } from '../ws/media';
import { AssetThumb } from '../ws/kit';
import { useWs } from '../ws/store';
import { Pane } from '../glass/kit';
import { DEFAULT_BRAND, fontCss } from '../studio/brand';

/** Opens a material as itself: a screen in its device, a font as a specimen, code with a live preview, a Lottie playing. */
export function MaterialView({ a, onClose, sub }: { a: Asset; onClose: () => void; sub?: string }) {
  const { t } = useI18n();
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/55 p-2 sm:p-5" onClick={onClose}>
      <Pane strong className="lg-pop flex max-h-[94vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-[28px]" role="dialog" aria-modal aria-label={a.title} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3">
          <div className="min-w-0 flex-1">
            <p dir="auto" className="truncate text-[16px] font-extrabold">
              {a.title}
            </p>
            {sub && <p className="truncate text-[12px] text-white/60">{sub}</p>}
          </div>
          <button type="button" onClick={onClose} className="lg-btn lg-btn-plain lg-icon" aria-label={t('Close')}>
            <X size={17} />
          </button>
        </div>
        <div className="lg-scroll min-h-0 flex-1 overflow-auto p-4 sm:p-6">
          {a.format === 'screen' ? <ScreenView a={a} /> : a.format === 'font' ? <FontView a={a} /> : a.format === 'code' ? <CodeView a={a} /> : a.format === 'lottie' ? <LottieView a={a} /> : a.format === 'audio' ? <AudioView a={a} /> : a.format === 'link' ? <LinkView a={a} /> : <AssetThumb asset={a} size="full" fit="contain" className="mx-auto max-h-[72vh] w-auto rounded-[12px] bg-[#ffffff]" />}
        </div>
      </Pane>
    </div>
  );
}

/* ───────── screens in device frames ───────── */

const DEVICES = [
  { id: 'phone', icon: Smartphone, label: 'Phone', w: 390, radius: 44, bezel: 12 },
  { id: 'tablet', icon: Tablet, label: 'Tablet', w: 760, radius: 30, bezel: 16 },
  { id: 'laptop', icon: Laptop, label: 'Laptop', w: 1024, radius: 14, bezel: 12 },
  { id: 'desktop', icon: Monitor, label: 'Desktop', w: 1280, radius: 10, bezel: 10 },
] as const;

/** a screen inside a device: the frame scales to fit, the picture keeps its own width */
export function DeviceFrame({ a, device, maxH = 640 }: { a: Asset; device: (typeof DEVICES)[number]['id']; maxH?: number }) {
  const d = DEVICES.find((x) => x.id === device)!;
  const ratio = a.h / a.w;
  const inner = Math.min(d.w, (maxH - d.bezel * 2) / Math.min(ratio, 2.4));
  const h = Math.min(inner * ratio, maxH - d.bezel * 2);
  return (
    <div className="mx-auto shrink-0" style={{ width: inner + d.bezel * 2, maxWidth: '100%' }}>
      <div className="bg-[#0b0c0f] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] ring-1 ring-white/15" style={{ padding: d.bezel, borderRadius: d.radius }}>
        <div className="lg-scroll overflow-y-auto overflow-x-hidden bg-[#ffffff]" style={{ height: h, borderRadius: Math.max(4, d.radius - d.bezel) }}>
          <AssetThumb asset={a} size="full" className="w-full" />
        </div>
      </div>
      {(device === 'laptop' || device === 'desktop') && <div className="mx-auto h-3 rounded-b-[10px] bg-[#1b1d22]" style={{ width: device === 'laptop' ? '112%' : '30%', marginInlineStart: device === 'laptop' ? '-6%' : '35%' }} />}
    </div>
  );
}

function ScreenView({ a }: { a: Asset }) {
  const { t } = useI18n();
  const start = a.device === 'phone' ? 'phone' : a.device === 'tablet' ? 'tablet' : 'laptop';
  const [dev, setDev] = useState<(typeof DEVICES)[number]['id']>(start);
  return (
    <div>
      <div className="mb-4 flex flex-wrap justify-center gap-1" role="radiogroup" aria-label={t('Device')}>
        {DEVICES.map((d) => (
          <button key={d.id} type="button" role="radio" aria-checked={dev === d.id} onClick={() => setDev(d.id)} className={`flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12.5px] font-bold ${dev === d.id ? 'bg-white text-[#11151a]' : 'lg-soft hover:bg-white/15'}`}>
            <d.icon size={14} /> {t(d.label)} <span className="opacity-60">{d.w}</span>
          </button>
        ))}
      </div>
      <DeviceFrame a={a} device={dev} />
      <p className="mt-3 text-center text-[12px] text-white/55">{t('Scroll inside the screen to see all of it.')}</p>
    </div>
  );
}

/* ───────── fonts: a specimen and a pairing on your own words ───────── */

function FontView({ a }: { a: Asset }) {
  const { t } = useI18n();
  const { state } = useWs();
  const { url } = useAssetUrl(a, 'raw');
  const [family, setFamily] = useState<string | null>(null);
  const [role, setRole] = useState<'heading' | 'body'>('heading');
  const brand = { ...DEFAULT_BRAND, ...state.brand };
  const sample = useMemo(() => {
    const p = state.projects.find((x) => x.assets.some((y) => y.id === a.id)) ?? state.projects[0];
    return { title: p?.title ?? 'FORM / 01', text: p?.brief || t('Object identity for a ceramics studio.') };
  }, [state.projects, a.id, t]);
  const [text, setText] = useState('');
  useEffect(() => {
    if (!url) return;
    let live = true;
    const fam = `fv-${a.id}`;
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((b) => new FontFace(fam, b).load())
      .then((f) => {
        (document.fonts as unknown as { add: (f: FontFace) => void }).add(f);
        if (live) setFamily(fam);
      })
      .catch(() => live && setFamily(''));
    return () => {
      live = false;
    };
  }, [url, a.id]);
  if (family === null) return <div className="h-60 animate-pulse rounded-[18px] bg-white/10" />;
  if (!family) return <p className="text-[14px] text-white/70">{t('This font could not be read in the browser.')}</p>;
  const head = role === 'heading' ? `'${family}'` : fontCss(brand.font);
  const body = role === 'body' ? `'${family}'` : fontCss(brand.bodyFont ?? brand.font);
  return (
    <div className="space-y-5">
      <input dir="auto" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('Type to try your own words')} className="lg-input text-[15px]" />
      <div className="rounded-[20px] bg-[#f3efe7] p-6 text-[#14171c]" style={{ fontFamily: `'${family}'` }}>
        <p className="text-[clamp(56px,9vw,120px)] leading-[0.95]">{text || 'Aa Бб אב'}</p>
        {[48, 32, 20, 15].map((s) => (
          <p key={s} dir="auto" className="mt-2 truncate" style={{ fontSize: s }}>
            {text || 'The quick brown fox · Съешь же ещё · דג סקרן שט'}
          </p>
        ))}
        <p className="mt-3 break-all text-[18px] tracking-wide">ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 &amp;!?@</p>
      </div>
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="lg-label me-auto">{t('Pairing with your brand kit')}</p>
          {(['heading', 'body'] as const).map((r) => (
            <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)} className={`min-h-[32px] whitespace-nowrap rounded-full px-3 text-[12px] font-bold ${role === r ? 'bg-white text-[#11151a]' : 'lg-soft'}`}>
              {r === 'heading' ? t('As the heading') : t('As the text')}
            </button>
          ))}
        </div>
        <div className="rounded-[20px] bg-[#ffffff] p-6 text-[#14171c]">
          <p dir="auto" className="text-[clamp(30px,4.6vw,52px)] font-bold leading-[1.02] tracking-[-0.02em]" style={{ fontFamily: head }}>
            {text || sample.title}
          </p>
          <p dir="auto" className="mt-3 max-w-[62ch] text-[16px] leading-[1.6] text-[#3b3933]" style={{ fontFamily: body }}>
            {sample.text}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ───────── code: source and, for HTML/CSS/JS, a live preview in a sealed frame ───────── */

function CodeView({ a }: { a: Asset }) {
  const { t } = useI18n();
  const [src, setSrc] = useState(a.text ?? '');
  const [tick, setTick] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const live = a.lang === 'html' || a.lang === 'css' || a.lang === 'js';
  const payload = useMemo(() => (a.lang === 'css' ? { html: '<main class="demo"><h1>Heading</h1><p>Paragraph of text with a <a href="#">link</a>.</p><button>Button</button></main>', css: src } : a.lang === 'js' ? { html: '<div id="app"></div>', js: src } : { html: src }), [src, a.lang]);
  useEffect(() => {
    if (!live) return;
    const on = (e: MessageEvent) => {
      if (e.source === frame.current?.contentWindow && e.data?.type === 'frantos:sandbox-ready') frame.current!.contentWindow!.postMessage({ type: 'frantos:snippet', ...payload }, '*');
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, [payload, live]);
  // a new frame for each change: the old document and anything it started are thrown away
  useEffect(() => {
    if (!live) return;
    const id = window.setTimeout(() => setTick((n) => n + 1), 350);
    return () => window.clearTimeout(id);
  }, [src, live]);
  return (
    <div className={`grid gap-4 ${live ? 'lg:grid-cols-2' : ''}`}>
      <div>
        <p className="lg-label mb-1.5">{(a.lang ?? 'text').toUpperCase()}</p>
        <textarea dir="ltr" spellCheck={false} value={src} onChange={(e) => setSrc(e.target.value)} aria-label={t('Code')} className="lg-scroll h-[56vh] w-full resize-none rounded-[16px] p-4 text-[12.5px] leading-[1.6] outline-none focus:ring-2 focus:ring-[#7aa2ff]" style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", background: '#12151a', color: '#e6e9ee' }} />
        <p className="mt-1.5 text-[11.5px] text-white/50">{t('Edits here are for trying things out; the stored file does not change.')}</p>
      </div>
      {live && (
        <div>
          <p className="lg-label mb-1.5">{t('Live preview')}</p>
          <iframe key={tick} ref={frame} title={t('Live preview')} src="/sandbox.html" sandbox="allow-scripts" referrerPolicy="no-referrer" className="h-[56vh] w-full rounded-[16px] bg-[#ffffff]" />
          <p className="mt-1.5 text-[11.5px] text-white/50">{t('Runs in a sealed frame with no access to your files or account.')}</p>
        </div>
      )}
    </div>
  );
}

/* ───────── Lottie ───────── */

function LottieView({ a }: { a: Asset }) {
  const { t } = useI18n();
  const { url } = useAssetUrl(a, 'raw');
  const host = useRef<HTMLDivElement>(null);
  const anim = useRef<{ play: () => void; pause: () => void; goToAndStop: (f: number, b: boolean) => void; destroy: () => void; totalFrames: number; currentFrame: number; addEventListener: (n: string, f: () => void) => void } | null>(null);
  const [playing, setPlaying] = useState(true);
  const [frame, setFrame] = useState(0);
  const [total, setTotal] = useState(0);
  const [bg, setBg] = useState('#ffffff');
  useEffect(() => {
    if (!url || !host.current) return;
    let dead = false;
    (async () => {
      const [{ default: lottie }, json] = await Promise.all([import('lottie-web/build/player/lottie_light'), fetch(url).then((r) => r.json())]);
      if (dead || !host.current) return;
      const an = lottie.loadAnimation({ container: host.current, renderer: 'svg', loop: true, autoplay: true, animationData: json }) as unknown as NonNullable<typeof anim.current>;
      anim.current = an;
      an.addEventListener('DOMLoaded', () => setTotal(Math.floor(an.totalFrames)));
      an.addEventListener('enterFrame', () => setFrame(Math.floor(an.currentFrame)));
    })();
    return () => {
      dead = true;
      anim.current?.destroy();
      anim.current = null;
    };
  }, [url]);
  return (
    <div>
      <div ref={host} className="mx-auto aspect-square max-h-[58vh] w-full max-w-[58vh] rounded-[18px]" style={{ background: bg }} />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => (playing ? anim.current?.pause() : anim.current?.play(), setPlaying(!playing))} className="lg-btn lg-btn-primary lg-icon" aria-label={playing ? t('Pause') : t('Play')}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <input type="range" min={0} max={Math.max(1, total)} value={frame} onChange={(e) => (anim.current?.goToAndStop(+e.target.value, true), setPlaying(false))} aria-label={t('Frame')} className="min-w-[160px] flex-1" />
        <span className="w-[86px] text-end text-[12px] tabular-nums text-white/70">
          {frame} / {total}
        </span>
        <span className="flex gap-1">
          {['#ffffff', '#f3efe7', '#14171c'].map((c) => (
            <button key={c} type="button" onClick={() => setBg(c)} aria-label={c} aria-pressed={bg === c} className={`h-7 w-7 rounded-full ring-1 ring-white/30 ${bg === c ? 'ring-2 ring-white' : ''}`} style={{ background: c }} />
          ))}
        </span>
      </div>
    </div>
  );
}

/* ───────── sound ───────── */

function AudioView({ a }: { a: Asset }) {
  const { url } = useAssetUrl(a, 'raw');
  return (
    <div className="space-y-4">
      <AssetThumb asset={a} className="w-full rounded-[18px]" />
      {url && <audio controls src={url} className="w-full" />}
    </div>
  );
}

/* ───────── links ───────── */

function LinkView({ a }: { a: Asset }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <AssetThumb asset={a} className="w-full rounded-[18px]" />
      <div className="flex flex-wrap items-center gap-3">
        <p dir="ltr" className="min-w-0 flex-1 truncate text-[14px] text-white/80">
          {a.text}
        </p>
        {/^https?:\/\//i.test(a.text ?? '') && (
          <a href={a.text} target="_blank" rel="noopener noreferrer" className="lg-btn lg-btn-primary">
            <ExternalLink size={15} /> {t('Open the site')}
          </a>
        )}
      </div>
      {a.note && <p className="text-[14px] text-white/75">{a.note}</p>}
    </div>
  );
}
