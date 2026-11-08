import React, { useEffect, useRef, useState } from 'react';

/**
 * FORM / 01 launch poster. Type is live HTML (always crisp), the object is either the
 * pre-rendered transparent frame or — on capable desktops — the live WebGL object with
 * the very same camera, so the swap is invisible. Sizes use container query units.
 */
export const POSTER_BG = '#E8E2D6';
const OBJECT = '/projects/form-01/form-v2-alpha.webp';
const OBJECT_SM = '/projects/form-01/form-v2-alpha-sm.webp';

export function FormPoster({ live = false, className = '', eager = true }: { live?: boolean; className?: string; eager?: boolean }) {
  const [liveOn, setLiveOn] = useState(false);
  useEffect(() => {
    if (!live) setLiveOn(false);
  }, [live]);
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: POSTER_BG, containerType: 'inline-size', aspectRatio: '4/5' }}>
      {/* subtle paper tone */}
      <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(120% 80% at 30% 20%, rgba(255,255,255,0.35), rgba(255,255,255,0) 60%), radial-gradient(90% 60% at 80% 100%, rgba(120,100,70,0.12), rgba(0,0,0,0) 70%)' }} />
      <div aria-hidden className="absolute left-[6cqw] right-[6cqw] top-[5.5cqw] flex items-start justify-between" style={{ fontFamily: 'var(--f-mono)', fontSize: '1.9cqw', letterSpacing: '0.08em', color: '#15130F' }}>
        <span>OBJECT STUDY</span>
        <span>CERAMICS / 2026</span>
      </div>
      <h2
        aria-label="FORM 01"
        className="absolute left-[4.6cqw] right-0 top-[10cqw] whitespace-nowrap"
        style={{ fontFamily: "'Inter Tight Variable', 'Inter Tight', sans-serif", fontWeight: 800, fontSize: '33.5cqw', lineHeight: 0.8, letterSpacing: '-0.075em', color: '#15130F' }}
      >
        FORM
      </h2>
      <span aria-hidden className="absolute right-[6cqw] top-[40cqw]" style={{ fontFamily: "'Inter Tight Variable', sans-serif", fontWeight: 300, fontSize: '9cqw', letterSpacing: '-0.04em', color: '#1630A6' }}>
        /01
      </span>

      {/* the object */}
      <div className="absolute inset-0">
        <img src={OBJECT} srcSet={`${OBJECT_SM} 640w, ${OBJECT} 1600w`} sizes="(max-width: 768px) 92vw, 50vw" alt="FORM / 01 — a twisted ultramarine ceramic object" draggable={false} loading={eager ? 'eager' : 'lazy'} className="h-full w-full select-none object-cover" style={{ opacity: liveOn ? 0 : 1, transition: liveOn ? 'opacity 0.7s' : 'none' }} />
        {live && <LiveForm onShown={() => setLiveOn(true)} />}
      </div>

      <div className="absolute bottom-[5.5cqw] left-[6cqw] right-[6cqw]">
        <div className="mb-[2.4cqw] h-px w-full bg-[#15130F]/70" />
        <div className="grid grid-cols-3 gap-[3cqw]" style={{ fontFamily: 'var(--f-mono)', fontSize: '1.75cqw', letterSpacing: '0.06em', lineHeight: 1.45, color: '#15130F' }}>
          <span>
            SATIN GLAZE
            <br />
            ULTRAMARINE
          </span>
          <span>
            225° TWIST
            <br />
            ROUNDED SQUARE
          </span>
          <span className="text-right">
            ONE SOFT KEY
            <br />
            FROM THE LEFT
          </span>
        </div>
      </div>
    </div>
  );
}

/** Live WebGL object. Desktop only, paused when off-screen or the tab is hidden. */
function LiveForm({ onShown }: { onShown: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const fine = window.matchMedia('(pointer: fine) and (min-width: 1024px)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return;
    let disposed = false;
    let raf = 0;
    let visible = true;
    let cleanup = () => {};

    import('../form/formScene').then(({ createFormScene }) => {
      if (disposed) return;
      let scene: ReturnType<typeof createFormScene>;
      try {
        scene = createFormScene({ canvas, look: 'v2', background: POSTER_BG, transparent: true, segments: 180 });
      } catch {
        return; // no WebGL: the static frame stays
      }
      const host = canvas.parentElement!;
      const size = () => scene.setSize(host.clientWidth, host.clientHeight);
      size();
      const ro = new ResizeObserver(size);
      ro.observe(host);

      const base = 0.35;
      let target = 0;
      let cur = 0;
      let tilt = 0;
      let tiltT = 0;
      let drift = 0;
      let last = performance.now();
      const onMove = (e: PointerEvent) => {
        const r = host.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        target = nx * 0.9;
        tiltT = ny * 0.08;
      };
      const onLeave = () => {
        target = 0;
        tiltT = 0;
      };
      host.addEventListener('pointermove', onMove);
      host.addEventListener('pointerleave', onLeave);

      const loop = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        drift += dt * 0.12;
        cur += (target - cur) * Math.min(1, dt * 4);
        tilt += (tiltT - tilt) * Math.min(1, dt * 4);
        scene.render(base + cur + Math.sin(drift) * 0.12, tilt);
        raf = requestAnimationFrame(loop);
      };
      const start = () => {
        if (!raf && visible && document.visibilityState === 'visible') {
          last = performance.now();
          raf = requestAnimationFrame(loop);
        }
      };
      const stop = () => {
        cancelAnimationFrame(raf);
        raf = 0;
      };
      const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        visible ? start() : stop();
      });
      io.observe(host);
      const onVis = () => (document.visibilityState === 'visible' ? start() : stop());
      document.addEventListener('visibilitychange', onVis);

      scene.render(base, 0);
      requestAnimationFrame(() => {
        if (disposed) return;
        setShown(true);
        onShown();
      });
      start();

      cleanup = () => {
        stop();
        io.disconnect();
        ro.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        host.removeEventListener('pointermove', onMove);
        host.removeEventListener('pointerleave', onLeave);
        scene.dispose();
      };
    });
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="absolute inset-0 h-full w-full transition-opacity duration-700" style={{ opacity: shown ? 1 : 0 }} />;
}
