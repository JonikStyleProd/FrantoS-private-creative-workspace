import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Flag, MousePointerClick, Play, RotateCcw, Smartphone, Trash2, Upload, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { go, leave } from '../route';
import { useProject, ws } from '../ws/store';
import type { Asset, Flow, Hotspot, Project } from '../ws/types';
import { AssetThumb, toast } from '../ws/kit';
import { FilePick, upload } from '../ws/uploads';
import { Pane, lgEase } from '../glass/kit';
import '../glass/glass.css';

const NODE_W = 150;

/** the project's screens: pictures marked as screens, or every work picture when there are none yet */
export function screensOf(p: Project): Asset[] {
  const screens = p.assets.filter((a) => a.format === 'screen');
  return screens;
}

/** nodes for every screen; new screens are laid out in rows after the ones already placed */
function placed(p: Project): Flow['nodes'] {
  const flow = p.flow ?? { nodes: [], hotspots: [] };
  const ids = new Set(flow.nodes.map((n) => n.assetId));
  const screens = screensOf(p);
  const extra = screens.filter((a) => !ids.has(a.id));
  const base = flow.nodes.filter((n) => screens.some((a) => a.id === n.assetId));
  return [...base, ...extra.map((a, i) => ({ assetId: a.id, x: 40 + ((base.length + i) % 5) * (NODE_W + 90), y: 40 + Math.floor((base.length + i) / 5) * 420 }))];
}

export function FlowPage({ id, proto, screen }: { id: string; proto: boolean; screen?: string }) {
  const { project: p, loading } = useProject(id);
  const { t, dir } = useI18n();
  if (loading) return <div className="lg fixed inset-0" />;
  if (!p)
    return (
      <div className="lg fixed inset-0 flex items-center justify-center" dir={dir}>
        <p className="text-[16px]">{t('This project is not here.')}</p>
      </div>
    );
  return proto ? <PrototypePlayer p={p} start={screen} onExit={() => leave(`/p/${p.id}/flow`)} /> : <FlowEditor p={p} />;
}

/* ───────── the map ───────── */

function FlowEditor({ p }: { p: Project }) {
  const { t, dir } = useI18n();
  const screens = screensOf(p);
  const nodes = placed(p);
  const flow = p.flow ?? { nodes: [], hotspots: [] };
  const [sel, setSel] = useState<string | null>(null);
  const byId = (aid: string) => screens.find((a) => a.id === aid);
  const nodeH = (a?: Asset) => (a ? Math.min(NODE_W * 2.4, (NODE_W * a.h) / a.w) : NODE_W * 2);

  // drag a screen on the map
  const drag = useRef<{ aid: string; dx: number; dy: number; moved: boolean } | null>(null);
  const [live, setLive] = useState<Record<string, { x: number; y: number }>>({});
  const pos = (n: Flow['nodes'][number]) => live[n.assetId] ?? n;
  const map = useRef<HTMLDivElement>(null);
  const onDown = (e: React.PointerEvent, n: Flow['nodes'][number]) => {
    const r = map.current!.getBoundingClientRect();
    drag.current = { aid: n.assetId, dx: e.clientX - r.left + map.current!.scrollLeft - n.x, dy: e.clientY - r.top + map.current!.scrollTop - n.y, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const r = map.current!.getBoundingClientRect();
    const x = Math.max(0, Math.round(e.clientX - r.left + map.current!.scrollLeft - d.dx));
    const y = Math.max(0, Math.round(e.clientY - r.top + map.current!.scrollTop - d.dy));
    d.moved = true;
    setLive((l) => ({ ...l, [d.aid]: { x, y } }));
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) return setSel(d.aid);
    const at = live[d.aid];
    if (at) ws.setFlow(p.id, (f) => ({ ...f, nodes: placed({ ...p, flow: f }).map((n) => (n.assetId === d.aid ? { ...n, ...at } : n)) }));
    setLive({});
  };

  // arrows: one per pair of screens, whatever number of zones lead there
  const edges = useMemo(() => {
    const seen = new Set<string>();
    return flow.hotspots.filter((h) => {
      const k = `${h.from}>${h.to}`;
      if (seen.has(k) || h.from === h.to) return false;
      seen.add(k);
      return true;
    });
  }, [flow.hotspots]);
  const at = (aid: string) => {
    const n = nodes.find((x) => x.assetId === aid);
    return n ? pos(n) : null;
  };
  const W = Math.max(1200, ...nodes.map((n) => pos(n).x + NODE_W + 200));
  const H = Math.max(800, ...nodes.map((n) => pos(n).y + 480));

  return (
    <div className="lg fixed inset-0 flex flex-col" dir={dir}>
      <header className="z-20 flex flex-wrap items-center gap-2 p-3 sm:p-4">
        <Pane className="flex min-w-0 items-center gap-1 rounded-full py-1 pe-4 ps-1">
          <button type="button" onClick={() => go(`/p/${p.id}`)} className="lg-btn lg-btn-plain lg-icon" aria-label={t('Back to the project')}>
            <ArrowLeft size={18} className="rtl:-scale-x-100" />
          </button>
          <span className="min-w-0">
            <span className="block text-[11px] font-bold text-white/60">{t('Flow & prototype')}</span>
            <span dir="auto" className="block truncate text-[15px] font-bold">
              {p.title}
            </span>
          </span>
        </Pane>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <FilePick accept="image/png,image/jpeg,image/webp" onFiles={(f) => upload(f, p.id, { isReference: false, screen: true, then: () => toast(t('Screen added')) })} className="lg-glass lg-btn">
            <Upload size={15} /> <span className="hidden sm:inline">{t('Add screens')}</span>
          </FilePick>
          <button type="button" disabled={!screens.length} onClick={() => go(`/p/${p.id}/proto`)} className="lg-btn lg-btn-primary">
            <Play size={15} /> {t('Play the prototype')}
          </button>
        </div>
      </header>

      {screens.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <Pane className="max-w-[460px] rounded-[28px] p-8 text-center">
            <Smartphone className="mx-auto" />
            <p className="mt-3 text-[18px] font-extrabold">{t('Add the screens of your app or site')}</p>
            <p className="mt-1 text-[14px] text-white/70">{t('Then draw tap zones on each screen and pick where they lead. The map draws the arrows, the prototype plays them.')}</p>
            <FilePick accept="image/png,image/jpeg,image/webp" onFiles={(f) => upload(f, p.id, { isReference: false, screen: true })} className="lg-btn lg-btn-primary mt-5">
              <Upload size={15} /> {t('Add screens')}
            </FilePick>
          </Pane>
        </div>
      ) : (
        <div ref={map} className="lg-scroll relative min-h-0 flex-1 overflow-auto" dir="ltr" onPointerMove={onMove} onPointerUp={onUp}>
          <div className="relative" style={{ width: W, height: H, backgroundImage: 'radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
            <svg className="pointer-events-none absolute inset-0" width={W} height={H} aria-hidden>
              <defs>
                <marker id="fl-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0 0 L10 5 L0 10 z" fill="#ff9a6b" />
                </marker>
              </defs>
              {edges.map((e) => {
                const a = at(e.from);
                const b = at(e.to);
                if (!a || !b) return null;
                const ha = nodeH(byId(e.from));
                const hb = nodeH(byId(e.to));
                const forward = b.x >= a.x;
                const x1 = forward ? a.x + NODE_W : a.x;
                const y1 = a.y + 30 + (e.y + e.h / 2) * ha;
                const x2 = forward ? b.x - 4 : b.x + NODE_W + 4;
                const y2 = b.y + 30 + hb / 2;
                const k = Math.max(60, Math.abs(x2 - x1) / 2);
                return <path key={e.id} d={`M${x1} ${y1} C ${x1 + (forward ? k : -k)} ${y1}, ${x2 - (forward ? k : -k)} ${y2}, ${x2} ${y2}`} fill="none" stroke="#ff9a6b" strokeWidth="2.5" markerEnd="url(#fl-arrow)" />;
              })}
            </svg>
            {nodes.map((n) => {
              const a = byId(n.assetId);
              if (!a) return null;
              const q = pos(n);
              const out = flow.hotspots.filter((h) => h.from === a.id).length;
              return (
                <div key={a.id} className="absolute select-none" style={{ left: q.x, top: q.y, width: NODE_W }}>
                  <div className="mb-1.5 flex items-center gap-1 text-[12px] font-bold">
                    {flow.start === a.id && <Flag size={12} className="text-[var(--lg-accent)]" />}
                    <span dir="auto" className="truncate">
                      {a.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    onPointerDown={(e) => onDown(e, n)}
                    onKeyDown={(e) => e.key === 'Enter' && setSel(a.id)}
                    className={`block w-full cursor-grab touch-none overflow-hidden rounded-[14px] bg-[#ffffff] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.7)] active:cursor-grabbing ${sel === a.id ? 'ring-2 ring-[#ff9a6b]' : 'ring-1 ring-white/20'}`}
                    style={{ height: nodeH(a) }}
                    aria-label={t('Edit the zones on {name}', { name: a.title })}
                  >
                    <AssetThumb asset={a} className="pointer-events-none h-full w-full object-top" />
                  </button>
                  <p className="mt-1 text-[11px] text-white/60">{out ? t('{n} links', { n: out }) : t('No links yet')}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AnimatePresence>{sel && byId(sel) && <ZoneEditor key={sel} p={p} a={byId(sel)!} screens={screens} onClose={() => setSel(null)} />}</AnimatePresence>
    </div>
  );
}

/* ───────── drawing tap zones on one screen ───────── */

function ZoneEditor({ p, a, screens, onClose }: { p: Project; a: Asset; screens: Asset[]; onClose: () => void }) {
  const { t } = useI18n();
  const zones = (p.flow?.hotspots ?? []).filter((h) => h.from === a.id);
  const box = useRef<HTMLDivElement>(null);
  const [draw, setDraw] = useState<{ x0: number; y0: number; x: number; y: number } | null>(null);
  const [pending, setPending] = useState<Omit<Hotspot, 'id' | 'to'> | null>(null);
  const rel = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };
  const done = () => {
    if (!draw) return;
    const x = Math.min(draw.x0, draw.x);
    const y = Math.min(draw.y0, draw.y);
    const w = Math.abs(draw.x - draw.x0);
    const h = Math.abs(draw.y - draw.y0);
    setDraw(null);
    // a tap without a drag makes a finger-sized zone around the point
    setPending(w < 0.02 || h < 0.01 ? { from: a.id, x: Math.max(0, x - 0.12), y: Math.max(0, y - 0.025), w: 0.24, h: 0.05 } : { from: a.id, x, y, w, h });
  };
  const others = screens.filter((s) => s.id !== a.id);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/55 p-2 sm:p-5" onClick={onClose}>
      <Pane strong className="lg-pop flex w-full max-w-[1000px] flex-col overflow-hidden rounded-[28px] md:flex-row" role="dialog" aria-modal aria-label={a.title} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className="lg-scroll flex min-h-0 flex-1 justify-center overflow-auto bg-black/30 p-4">
          <div ref={box} className="relative h-fit w-full max-w-[380px] touch-none select-none overflow-hidden rounded-[18px] bg-[#ffffff]" dir="ltr"
            onPointerDown={(e) => {
              const q = rel(e);
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              setPending(null);
              setDraw({ x0: q.x, y0: q.y, ...q });
            }}
            onPointerMove={(e) => draw && setDraw({ ...draw, ...rel(e) })}
            onPointerUp={done}
          >
            <AssetThumb asset={a} size="full" className="pointer-events-none w-full" />
            {zones.map((z) => (
              <span key={z.id} className="absolute rounded-[6px] border-2 border-[#ff9a6b] bg-[#ff9a6b]/20" style={{ left: `${z.x * 100}%`, top: `${z.y * 100}%`, width: `${z.w * 100}%`, height: `${z.h * 100}%` }}>
                <span className="absolute -top-5 start-0 whitespace-nowrap rounded bg-[#ff9a6b] px-1 text-[10.5px] font-bold text-[#14171c]">→ {screens.find((s) => s.id === z.to)?.title ?? '?'}</span>
              </span>
            ))}
            {(draw || pending) && (
              <span className="absolute rounded-[6px] border-2 border-dashed border-[#3a5bff] bg-[#3a5bff]/20" style={draw ? { left: `${Math.min(draw.x0, draw.x) * 100}%`, top: `${Math.min(draw.y0, draw.y) * 100}%`, width: `${Math.abs(draw.x - draw.x0) * 100}%`, height: `${Math.abs(draw.y - draw.y0) * 100}%` } : { left: `${pending!.x * 100}%`, top: `${pending!.y * 100}%`, width: `${pending!.w * 100}%`, height: `${pending!.h * 100}%` }} />
            )}
          </div>
        </div>
        <div className="lg-scroll flex max-h-[45vh] w-full shrink-0 flex-col gap-3 overflow-y-auto border-white/10 p-4 md:max-h-none md:w-[320px] md:border-s">
          <div className="flex items-start gap-2">
            <p dir="auto" className="min-w-0 flex-1 text-[17px] font-extrabold">
              {a.title}
            </p>
            <button type="button" onClick={onClose} className="lg-btn lg-btn-plain lg-icon" aria-label={t('Close')}>
              <X size={17} />
            </button>
          </div>
          <p className="flex items-start gap-2 text-[13px] text-white/75">
            <MousePointerClick size={15} className="mt-0.5 shrink-0" /> {t('Drag over a button or area on the screen, then pick where it leads.')}
          </p>
          {pending && (
            <div className="rounded-[16px] p-3 lg-soft">
              <p className="lg-label mb-2">{t('Leads to')}</p>
              {others.length === 0 && <p className="text-[13px] text-white/70">{t('Add another screen first.')}</p>}
              <div className="grid grid-cols-3 gap-2">
                {others.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      ws.addHotspot(p.id, { ...pending, to: s.id });
                      setPending(null);
                    }}
                    className="overflow-hidden rounded-[10px] text-start ring-1 ring-white/20 hover:ring-2 hover:ring-[#ff9a6b]"
                  >
                    <AssetThumb asset={s} className="aspect-[9/16] w-full object-top" />
                    <span dir="auto" className="block truncate px-1 py-0.5 text-[10.5px] font-bold">
                      {s.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {zones.length > 0 && (
            <ul className="space-y-1">
              {zones.map((z, i) => (
                <li key={z.id} className="flex items-center gap-2 rounded-[12px] px-2 py-1.5 text-[13px] lg-soft">
                  <span className="font-bold tabular-nums text-white/60">{i + 1}</span>
                  <span dir="auto" className="min-w-0 flex-1 truncate">
                    → {screens.find((s) => s.id === z.to)?.title}
                  </span>
                  <button type="button" onClick={() => ws.setFlow(p.id, (f) => ({ ...f, hotspots: f.hotspots.filter((x) => x.id !== z.id) }), 'Link removed')} className="lg-btn lg-btn-plain lg-icon min-h-[30px]" aria-label={t('Remove')}>
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={() => ws.setFlow(p.id, (f) => ({ ...f, start: a.id }))} aria-pressed={p.flow?.start === a.id} className={`lg-btn mt-auto ${p.flow?.start === a.id ? 'lg-btn-primary' : 'lg-btn-ghost'}`}>
            <Flag size={14} /> {p.flow?.start === a.id ? t('The prototype starts here') : t('Start the prototype here')}
          </button>
        </div>
      </Pane>
    </motion.div>
  );
}

/* ───────── playing it ───────── */

/** The prototype full screen: tap zones lead on, a tap elsewhere shows where you can tap. */
export function PrototypePlayer({ p, start, onExit }: { p: Project; start?: string; onExit: () => void }) {
  const { t, dir } = useI18n();
  const reduce = useReducedMotion();
  const screens = screensOf(p);
  const first = (start && screens.find((s) => s.id === start)?.id) || p.flow?.start || screens[0]?.id;
  const [trail, setTrail] = useState<string[]>(first ? [first] : []);
  const [hint, setHint] = useState(0);
  const cur = screens.find((s) => s.id === trail[trail.length - 1]);
  const zones = (p.flow?.hotspots ?? []).filter((h) => h.from === cur?.id);
  const back = () => setTrail((tr) => (tr.length > 1 ? tr.slice(0, -1) : tr));
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
      if (e.key === 'Backspace' || e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });
  const flash = () => {
    setHint((n) => n + 1);
  };
  const ratio = cur ? cur.h / cur.w : 2.16;
  const phone = cur?.device !== 'desktop' && cur?.device !== 'tablet';
  return (
    <div className="lg fixed inset-0 flex flex-col bg-[#0b0c0f]" dir={dir}>
      <header className="flex items-center gap-2 p-3">
        <button type="button" onClick={onExit} className="lg-btn lg-btn-plain lg-icon" aria-label={t('Close')}>
          <X size={18} />
        </button>
        <span dir="auto" className="min-w-0 flex-1 truncate text-[14px] font-bold text-white/80">
          {p.title} · {cur?.title}
        </span>
        <button type="button" onClick={back} disabled={trail.length < 2} className="lg-btn lg-btn-plain lg-icon" aria-label={t('Back')}>
          <ArrowLeft size={17} className="rtl:-scale-x-100" />
        </button>
        <button type="button" onClick={() => first && setTrail([first])} className="lg-btn lg-btn-plain lg-icon" aria-label={t('From the start')} title={t('From the start')}>
          <RotateCcw size={16} />
        </button>
      </header>
      {!cur ? (
        <p className="m-auto text-[15px] text-white/70">{t('No screens in this prototype yet.')}</p>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center p-3 pb-6">
          <div
            className="relative bg-[#000] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] ring-1 ring-white/15"
            style={phone ? { padding: 10, borderRadius: 46, height: 'min(100%, 860px)', aspectRatio: `${1} / ${Math.min(ratio, 2.3)}` } : { padding: 8, borderRadius: 14, width: 'min(100%, 1280px)', aspectRatio: `${1} / ${Math.min(ratio, 0.8)}` }}
          >
            <div className="lg-scroll relative h-full w-full overflow-y-auto overflow-x-hidden bg-[#ffffff]" style={{ borderRadius: phone ? 36 : 8 }} dir="ltr">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.div key={cur.id} initial={reduce ? { opacity: 0 } : { x: '30%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={reduce ? { opacity: 0 } : { x: '-20%', opacity: 0 }} transition={{ duration: 0.32, ease: lgEase }} className="relative" onClick={flash}>
                  <AssetThumb asset={cur} size="full" className="w-full" />
                  {zones.map((z) => (
                    <button
                      key={z.id + hint}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTrail((tr) => [...tr, z.to]);
                      }}
                      className="proto-zone absolute rounded-[8px]"
                      style={{ left: `${z.x * 100}%`, top: `${z.y * 100}%`, width: `${z.w * 100}%`, height: `${z.h * 100}%` }}
                      aria-label={t('Go to {name}', { name: screens.find((s) => s.id === z.to)?.title ?? '' })}
                      data-hint={hint > 0 ? '1' : undefined}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
      <p className="pb-3 text-center text-[12px] text-white/45">{t('Tap anywhere to see where you can tap. Esc to close.')}</p>
    </div>
  );
}
