import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, Loader2, Printer, X } from 'lucide-react';
import { useI18n } from '../i18n';
import type { Board, BrandFont, Project } from '../ws/types';
import { toast } from '../ws/kit';
import { Pane } from '../glass/kit';
import { renderBoard } from '../studio/compose';
import { PAPERS, dpiAt, orient, printPdf } from './printPdf';

/** Print export for a board: paper, bleed and crop marks, with a warning wherever pictures are too small for the size. */
export function PrintDialog({ p, b, rtl, brandFont, onClose }: { p: Project; b: Board; rtl: boolean; brandFont?: BrandFont; onClose: () => void }) {
  const { t } = useI18n();
  // the paper whose proportions are closest to the board's
  const near = useMemo(() => {
    const r = b.w / b.h;
    return [...PAPERS].sort((x, y) => Math.abs(Math.log(orient(x, b.w, b.h).w / orient(x, b.w, b.h).h / r)) - Math.abs(Math.log(orient(y, b.w, b.h).w / orient(y, b.w, b.h).h / r)))[0].id;
  }, [b.w, b.h]);
  const [paper, setPaper] = useState<string>(near);
  const [bleed, setBleed] = useState(3);
  const [marks, setMarks] = useState(true);
  const [busy, setBusy] = useState(false);
  const size = orient(PAPERS.find((x) => x.id === paper)!, b.w, b.h);

  // resolution: the board itself, then each picture at the size it is placed
  const checks = useMemo(() => {
    const scale = Math.max(size.w / b.w, size.h / b.h); // mm per board px, covering the page
    const boardDpi = dpiAt(1, scale);
    const pics = b.layers
      .filter((l) => l.kind === 'image')
      .map((l) => {
        const a = p.assets.find((x) => x.id === l.assetId);
        if (!a || !a.w) return null;
        const s = (l.fit === 'contain' ? Math.min : Math.max)(l.w / a.w, l.h / a.h);
        return { name: a.title, dpi: Math.round(boardDpi / s) };
      })
      .filter((x): x is { name: string; dpi: number } => !!x);
    return { boardDpi, pics, worst: Math.min(boardDpi, ...pics.map((x) => x.dpi)) };
  }, [b, p.assets, size.w, size.h]);
  const tone = (d: number) => (d >= 300 ? 'ok' : d >= 200 ? 'fair' : 'low');

  const make = async () => {
    setBusy(true);
    try {
      const png = await renderBoard(p, b, rtl, brandFont);
      const pdf = await printPdf(png, size, { bleed, marks, title: b.title });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(pdf);
      a.download = `${b.title.replace(/[^\p{L}\p{N}]+/gu, '-')}-print-${paper}.pdf`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast(t('Print PDF saved'));
      onClose();
    } catch {
      toast(t('Export failed.'), { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-3" onClick={onClose}>
      <Pane strong className="lg-pop lg-scroll max-h-[94vh] w-full max-w-[520px] overflow-y-auto rounded-[28px] p-5" role="dialog" aria-modal aria-labelledby="pr-title" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className="flex items-start gap-2">
          <p id="pr-title" className="flex flex-1 items-center gap-2 text-[19px] font-extrabold">
            <Printer size={18} /> {t('Print PDF')}
          </p>
          <button type="button" onClick={onClose} className="lg-btn lg-btn-plain lg-icon" aria-label={t('Close')}>
            <X size={17} />
          </button>
        </div>
        <p dir="auto" className="mt-1 text-[13px] text-white/70">
          {b.title} · {b.w}×{b.h}
        </p>

        <p className="lg-label mt-4 mb-1.5">{t('Paper')}</p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {PAPERS.map((x) => (
            <button key={x.id} type="button" onClick={() => setPaper(x.id)} aria-pressed={paper === x.id} className={`min-h-[40px] rounded-[12px] px-2 text-[12.5px] font-bold ${paper === x.id ? 'bg-white text-[#11151a]' : 'lg-soft hover:bg-white/15'}`}>
              {t(x.label)}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[12px] text-white/60">
          {size.w}×{size.h} mm {t('trim')} · {size.w + bleed * 2}×{size.h + bleed * 2} mm {t('with bleed')}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[13px]">
            {t('Bleed')}
            <select value={bleed} onChange={(e) => setBleed(+e.target.value)} className="lg-input h-9 w-auto px-2 text-[13px]">
              {[0, 2, 3, 5].map((n) => (
                <option key={n} value={n} className="text-black">
                  {n} mm
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={marks} onChange={(e) => setMarks(e.target.checked)} className="h-4 w-4" />
            {t('Crop marks')}
          </label>
        </div>

        <div className={`mt-4 space-y-1.5 rounded-[16px] p-3 ${tone(checks.worst) === 'low' ? 'ring-1 ring-[var(--lg-accent)]' : ''} lg-soft`}>
          <p className="flex items-center gap-2 text-[13.5px] font-bold">
            {tone(checks.worst) === 'ok' ? <Check size={15} /> : <AlertTriangle size={15} className="text-[var(--lg-accent)]" />}
            {tone(checks.worst) === 'ok' ? t('Sharp at this size') : tone(checks.worst) === 'fair' ? t('Acceptable, a little soft up close') : t('Too low for print at this size')}
          </p>
          <Row label={t('Board')} dpi={checks.boardDpi} tone={tone(checks.boardDpi)} />
          {checks.pics.map((x, i) => (
            <Row key={i} label={x.name} dpi={x.dpi} tone={tone(x.dpi)} />
          ))}
          {tone(checks.worst) !== 'ok' && <p className="pt-1 text-[12px] text-white/65">{t('Print wants about 300 dpi. Use a larger board format, a smaller paper or bigger pictures.')}</p>}
        </div>
        <p className="mt-3 text-[11.5px] text-white/55">{t('RGB, as on screen. Ask the print shop whether they convert to CMYK themselves.')}</p>

        <button type="button" onClick={make} disabled={busy} className="lg-btn lg-btn-primary mt-4 w-full">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />} {t('Save the print PDF')}
        </button>
      </Pane>
    </div>
  );
}

function Row({ label, dpi, tone }: { label: string; dpi: number; tone: 'ok' | 'fair' | 'low' }) {
  return (
    <p className="flex items-center gap-2 text-[12.5px]">
      <span className={`h-2 w-2 shrink-0 rounded-full ${tone === 'ok' ? 'bg-[#7fe0a1]' : tone === 'fair' ? 'bg-[#ffcf70]' : 'bg-[#ff7a5c]'}`} />
      <span dir="auto" className="min-w-0 flex-1 truncate">
        {label}
      </span>
      <span className="tabular-nums text-white/75">{dpi} dpi</span>
    </p>
  );
}
