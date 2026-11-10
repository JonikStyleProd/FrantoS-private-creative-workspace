import React, { useEffect, useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { useI18n } from '../i18n';
import { Pane } from '../glass/kit';
import { toast } from '../ws/kit';

import { CURVES } from './curves';
export { CURVES };

const css = (v: number[]) => `cubic-bezier(${v.join(', ')})`;

function Curve({ v }: { v: [number, number, number, number] }) {
  // the curve drawn in a 100×100 box with room for overshoot above and below
  const y = (n: number) => 120 - n * 100;
  return (
    <svg viewBox="-10 -10 120 140" className="h-[92px] w-[80px] shrink-0" aria-hidden>
      <rect x="0" y="20" width="100" height="100" fill="none" stroke="currentColor" strokeOpacity="0.15" />
      <line x1="0" y1={y(0)} x2={v[0] * 100} y2={y(v[1])} stroke="currentColor" strokeOpacity="0.35" />
      <line x1="100" y1={y(1)} x2={v[2] * 100} y2={y(v[3])} stroke="currentColor" strokeOpacity="0.35" />
      <path d={`M0 ${y(0)} C ${v[0] * 100} ${y(v[1])}, ${v[2] * 100} ${y(v[3])}, 100 ${y(1)}`} fill="none" stroke="#ff9a6b" strokeWidth="3" />
      <circle cx={v[0] * 100} cy={y(v[1])} r="3.5" fill="currentColor" />
      <circle cx={v[2] * 100} cy={y(v[3])} r="3.5" fill="currentColor" />
    </svg>
  );
}

export function EasingPanel({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const [dur, setDur] = useState(900);
  const [go, setGo] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setGo((g) => !g), dur + 700);
    return () => window.clearInterval(id);
  }, [dur, reduce]);
  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied(null), 1300);
    } catch {
      toast(t('The browser did not allow copying. Select the text and copy it.'), { tone: 'error' });
    }
  };
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-2 sm:p-5" onClick={onClose}>
      <Pane strong className="lg-pop flex max-h-[94vh] w-full max-w-[860px] flex-col overflow-hidden rounded-[28px]" role="dialog" aria-modal aria-labelledby="ez-title" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-3">
          <p id="ez-title" className="me-auto text-[18px] font-extrabold">
            {t('Easing curves')}
          </p>
          <label className="flex items-center gap-2 text-[12.5px] text-white/75">
            {t('Duration')}
            <input type="range" min={300} max={2000} step={50} value={dur} onChange={(e) => setDur(+e.target.value)} className="w-[120px]" aria-label={t('Duration')} />
            <span className="w-[52px] tabular-nums">{dur} ms</span>
          </label>
          <button type="button" onClick={onClose} className="lg-btn lg-btn-plain lg-icon" aria-label={t('Close')}>
            <X size={17} />
          </button>
        </div>
        <ul className="lg-scroll grid min-h-0 flex-1 gap-2 overflow-y-auto p-3 sm:grid-cols-2">
          {CURVES.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-[18px] p-3 lg-soft">
              <Curve v={c.v} />
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-extrabold">{t(c.label)}</p>
                <p className="text-[12px] text-white/65">{t(c.use)}</p>
                <div className="relative mt-2 h-7 rounded-full bg-black/25">
                  <span
                    className="absolute top-1 h-5 w-5 rounded-full bg-white"
                    style={{ insetInlineStart: go && !reduce ? 'calc(100% - 24px)' : '4px', transition: reduce ? 'none' : `inset-inline-start ${dur}ms ${css(c.v)}` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {[
                    { k: 'css', label: 'CSS', text: css(c.v) },
                    { k: 'js', label: 'JS', text: `[${c.v.join(', ')}]` },
                  ].map((f) => (
                    <button key={f.k} type="button" onClick={() => copy(c.id + f.k, f.text)} className="flex min-h-[28px] items-center gap-1 rounded-full bg-white/10 px-2.5 text-[11.5px] font-bold hover:bg-white/20" title={f.text}>
                      {copied === c.id + f.k ? <Check size={12} /> : <Copy size={12} />} {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Pane>
    </div>
  );
}
