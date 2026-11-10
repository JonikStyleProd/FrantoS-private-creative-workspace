import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Columns3 } from 'lucide-react';
import { useI18n } from '../i18n';
import { go } from '../route';
import { useWs, ws } from '../ws/store';
import type { Project, Work, WorkStatus } from '../ws/types';
import { AssetThumb } from '../ws/kit';
import { GlassPage } from '../glass/Shell';
import { Pane } from '../glass/kit';

const COLS: { id: WorkStatus; label: string }[] = [
  { id: 'todo', label: 'To do' },
  { id: 'doing', label: 'In work' },
  { id: 'client', label: 'With client' },
  { id: 'done', label: 'Done' },
];
const statusOf = (w: Work): WorkStatus => w.status ?? (w.approvedVersionId ? 'done' : 'doing');
type Row = { p: Project; w: Work };

/** Every work of every project on one board by status, or on a calendar by due date. Drag a card to move it. */
export function PlanPage() {
  const { t, lang } = useI18n();
  const { state } = useWs();
  const [view, setView] = useState<'board' | 'calendar'>(() => (localStorage.getItem('frantos-plan-view') === 'calendar' ? 'calendar' : 'board'));
  const pick = (v: typeof view) => (localStorage.setItem('frantos-plan-view', v), setView(v));
  const [only, setOnly] = useState<string>('all');
  const rows = useMemo<Row[]>(() => state.projects.filter((p) => only === 'all' || p.id === only).flatMap((p) => p.works.map((w) => ({ p, w }))), [state.projects, only]);
  return (
    <GlassPage
      kicker={t('Plan')}
      title={t('{n} works in progress', { n: rows.filter((r) => statusOf(r.w) !== 'done').length })}
      lead={t('Drag a card to change its status. Dates come from each work’s plan.')}
      bg="/projects/halden/workshop.webp"
      wide
      action={
        <div className="flex flex-wrap items-center gap-2">
          <select value={only} onChange={(e) => setOnly(e.target.value)} className="lg-input h-11 w-auto text-[13.5px] [color-scheme:dark]" aria-label={t('Project')}>
            <option value="all">{t('All projects')}</option>
            {state.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <div className="flex rounded-full p-1 lg-glass" role="radiogroup" aria-label={t('View')}>
            {(
              [
                ['board', Columns3, 'Board'],
                ['calendar', CalendarDays, 'Calendar'],
              ] as const
            ).map(([id, Icon, label]) => (
              <button key={id} type="button" role="radio" aria-checked={view === id} onClick={() => pick(id)} className={`flex min-h-[38px] items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold ${view === id ? 'bg-white text-[#11151a]' : 'text-white/80'}`}>
                <Icon size={15} /> {t(label)}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {view === 'board' ? <Board rows={rows} /> : <Calendar rows={rows} lang={lang} />}
    </GlassPage>
  );
}

function Card({ p, w, compact }: Row & { compact?: boolean }) {
  const { t, lang } = useI18n();
  const v = w.versions[w.versions.length - 1];
  const a = p.assets.find((x) => x.id === v?.assetId);
  const late = w.due && w.due < Date.now() && statusOf(w) !== 'done';
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', `${p.id}|${w.id}`)}
      onClick={() => go(`/p/${p.id}?i=${w.id}`)}
      className={`group flex w-full items-center gap-2.5 rounded-[16px] p-2 text-start lg-soft hover:bg-white/15 ${compact ? '' : 'min-h-[64px]'}`}
    >
      {!compact && <AssetThumb asset={a} className="h-12 w-12 shrink-0 rounded-[10px]" />}
      <span className="min-w-0 flex-1">
        <span dir="auto" className="block truncate text-[13.5px] font-bold">
          {w.title}
        </span>
        <span dir="auto" className="block truncate text-[11.5px] text-white/60">
          {p.title}
          {w.due ? ` · ${new Date(w.due).toLocaleDateString(lang, { day: 'numeric', month: 'short' })}` : ''}
        </span>
      </span>
      {late && <span className="shrink-0 rounded-full bg-[var(--lg-accent)] px-2 py-0.5 text-[10.5px] font-bold text-white">{t('Late')}</span>}
    </button>
  );
}

function Board({ rows }: { rows: Row[] }) {
  const { t } = useI18n();
  const [over, setOver] = useState<WorkStatus | null>(null);
  const drop = (st: WorkStatus, e: React.DragEvent) => {
    e.preventDefault();
    setOver(null);
    const [pid, wid] = e.dataTransfer.getData('text/plain').split('|');
    if (pid && wid) ws.planWork(pid, wid, { status: st });
  };
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {COLS.map((c) => {
        const list = rows.filter((r) => statusOf(r.w) === c.id).sort((a, b) => (a.w.due ?? Infinity) - (b.w.due ?? Infinity));
        return (
          <Pane
            key={c.id}
            className={`flex min-h-[220px] flex-col gap-2 rounded-[24px] p-3 transition-shadow ${over === c.id ? 'ring-2 ring-white/70' : ''}`}
            onDragOver={(e: React.DragEvent) => (e.preventDefault(), setOver(c.id))}
            onDragLeave={() => setOver(null)}
            onDrop={(e: React.DragEvent) => drop(c.id, e)}
            aria-label={t(c.label)}
          >
            <p className="flex items-center justify-between px-1.5 pt-1 text-[14px] font-extrabold">
              {t(c.label)} <span className="text-[12px] font-bold text-white/55">{list.length}</span>
            </p>
            {list.map((r) => (
              <div key={r.p.id + r.w.id} className="relative">
                <Card {...r} />
                {/* without a mouse: move with a menu */}
                <select
                  value={c.id}
                  onChange={(e) => ws.planWork(r.p.id, r.w.id, { status: e.target.value as WorkStatus })}
                  aria-label={t('Status of {name}', { name: r.w.title })}
                  className="absolute end-2 top-2 h-6 w-6 cursor-pointer appearance-none rounded-full bg-transparent text-transparent opacity-0 focus:opacity-100 focus:outline focus:outline-2 focus:outline-white [color-scheme:dark] sm:opacity-0"
                >
                  {COLS.map((x) => (
                    <option key={x.id} value={x.id} className="text-black">
                      {t(x.label)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            {list.length === 0 && <p className="px-1.5 text-[12.5px] text-white/50">{t('Drop a card here')}</p>}
          </Pane>
        );
      })}
    </div>
  );
}

function Calendar({ rows, lang }: { rows: Row[]; lang: string }) {
  const { t } = useI18n();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const start = new Date(month);
  const offset = (start.getDay() + 6) % 7; // weeks start on Monday
  start.setDate(1 - offset);
  const days = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const byDay = new Map<string, Row[]>();
  rows.filter((r) => r.w.due).forEach((r) => {
    const k = key(new Date(r.w.due!));
    byDay.set(k, [...(byDay.get(k) ?? []), r]);
  });
  const today = key(new Date());
  const undated = rows.filter((r) => !r.w.due && statusOf(r.w) !== 'done');
  const drop = (d: Date, e: React.DragEvent) => {
    e.preventDefault();
    const [pid, wid] = e.dataTransfer.getData('text/plain').split('|');
    if (pid && wid) ws.planWork(pid, wid, { due: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18).getTime() });
  };
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <Pane className="rounded-[26px] p-3">
        <div className="mb-2 flex items-center gap-2 px-1">
          <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="lg-btn lg-btn-plain lg-icon" aria-label={t('Previous month')}>
            <ChevronLeft size={17} className="rtl:-scale-x-100" />
          </button>
          <p className="flex-1 text-center text-[16px] font-extrabold capitalize">{month.toLocaleDateString(lang, { month: 'long', year: 'numeric' })}</p>
          <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="lg-btn lg-btn-plain lg-icon" aria-label={t('Next month')}>
            <ChevronRight size={17} className="rtl:-scale-x-100" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-white/55">
          {days.slice(0, 7).map((d) => (
            <span key={d.getDay()}>{d.toLocaleDateString(lang, { weekday: 'short' })}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((d) => {
            const list = byDay.get(key(d)) ?? [];
            const out = d.getMonth() !== month.getMonth();
            return (
              <div key={key(d)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => drop(d, e)} className={`min-h-[86px] min-w-0 rounded-[12px] p-1 ${out ? 'opacity-40' : ''} ${key(d) === today ? 'ring-1 ring-white/70' : ''} lg-soft`}>
                <p className="px-1 text-[11.5px] font-bold text-white/70">{d.getDate()}</p>
                <div className="space-y-0.5">
                  {list.slice(0, 3).map((r) => (
                    <button key={r.w.id} type="button" draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', `${r.p.id}|${r.w.id}`)} onClick={() => go(`/p/${r.p.id}?i=${r.w.id}`)} className={`block w-full truncate rounded-[6px] px-1.5 py-0.5 text-start text-[11px] font-bold ${statusOf(r.w) === 'done' ? 'bg-white/10 text-white/60 line-through' : r.w.due! < Date.now() ? 'bg-[var(--lg-accent)] text-white' : 'bg-white/20'}`} title={`${r.w.title} · ${r.p.title}`}>
                      {r.w.title}
                    </button>
                  ))}
                  {list.length > 3 && <p className="px-1 text-[10.5px] text-white/60">+{list.length - 3}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </Pane>
      <Pane className="space-y-2 rounded-[26px] p-3">
        <p className="px-1 text-[14px] font-extrabold">{t('Without a date')}</p>
        <p className="px-1 text-[12px] text-white/60">{t('Drag one onto a day to set its due date.')}</p>
        {undated.map((r) => (
          <Card key={r.p.id + r.w.id} {...r} compact />
        ))}
        {undated.length === 0 && <p className="px-1 text-[12.5px] text-white/50">{t('Everything has a date.')}</p>}
      </Pane>
    </div>
  );
}
