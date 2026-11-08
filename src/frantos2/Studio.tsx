import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, Reorder, useDragControls } from 'framer-motion';
import { ArrowLeft, ArrowDown, ArrowUp, Check, GripVertical, Minus, Play, Plus, RotateCcw, Star } from 'lucide-react';
import { FRAMES, FRAME_BY_ID, FrameId, STORY_META, frameSrc } from './data';
import { demo, useDemo } from './store';
import { go } from './route';
import { useCopy } from './copy';
import { CoverArt, CropMarks, FrameImg, FrameNo, Wordmark } from './ui';

const ease = [0.22, 1, 0.36, 1] as const;

export function Studio() {
  const { c } = useCopy();
  const { state } = useDemo();
  const [selected, setSelected] = useState<FrameId>(() => {
    const fromSession = sessionStorage.getItem('frantos2_selected') as FrameId | null;
    return fromSession && FRAME_BY_ID[fromSession] ? fromSession : state.cover;
  });
  const [mobileTab, setMobileTab] = useState<'story' | 'materials'>('story');
  const [announce, setAnnounce] = useState('');

  useEffect(() => {
    sessionStorage.setItem('frantos2_selected', selected);
  }, [selected]);

  const say = (msg: string) => {
    setAnnounce('');
    requestAnimationFrame(() => setAnnounce(msg));
  };

  // ← / → steps through the list the selected frame belongs to
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      const t = e.target as HTMLElement;
      if (t.closest('input,textarea,[role="radiogroup"]')) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const list = state.story.includes(selected) ? state.story : FRAMES.map((f) => f.id);
      const i = list.indexOf(selected);
      const j = Math.min(list.length - 1, Math.max(0, i + (e.key === 'ArrowRight' ? 1 : -1)));
      if (j !== i) {
        e.preventDefault();
        setSelected(list[j]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, state.story]);

  const present = () => go('/studio/present/0');
  const isDesktop = useMedia('(min-width: 1024px)');

  return (
    <div className="flex min-h-full flex-col bg-[var(--paper)] lg:h-full lg:min-h-0">
      <TopBar onPresent={present} onReset={() => { demo.reset(); setSelected('kiosk'); say(c.reset); }} />

      <div className="flex-1 lg:grid lg:min-h-0 lg:grid-cols-[272px_minmax(0,1fr)_328px]">
        {/* Materials — desktop */}
        {isDesktop && <motion.aside
          className="hidden min-h-0 flex-col border-r border-[var(--rule)] lg:flex"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40, transition: { duration: 0.25 } }}
          transition={{ duration: 0.5, ease, delay: 0.05 }}
        >
          <Materials selected={selected} onSelect={setSelected} say={say} />
        </motion.aside>}

        <Stage selected={selected} onSelect={setSelected} say={say} />

        {/* Story — desktop */}
        {isDesktop && <motion.aside
          className="hidden min-h-0 flex-col border-l border-[var(--rule)] lg:flex"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40, transition: { duration: 0.25 } }}
          transition={{ duration: 0.5, ease, delay: 0.05 }}
        >
          <StoryPanel selected={selected} onSelect={setSelected} say={say} />
        </motion.aside>}

        {/* Mobile & tablet: one panel at a time under the stage */}
        {!isDesktop && <motion.div exit={{ opacity: 0 }}>
          <div role="tablist" aria-label={c.storyPanel} className="sticky top-[60px] z-20 flex gap-1 border-b border-[var(--rule)] bg-[var(--paper)] px-4 pt-2">
            {(['story', 'materials'] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={mobileTab === tab}
                onClick={() => setMobileTab(tab)}
                className="relative px-3 py-3 text-[14px] font-semibold"
                style={{ color: mobileTab === tab ? 'var(--ink)' : 'var(--ink-2)' }}
              >
                {tab === 'story' ? c.storyPanel : c.materials}{' '}
                <span className="f2-mono !text-[11px] text-[var(--ink-2)]">{tab === 'story' ? state.story.length : FRAMES.length}</span>
                {mobileTab === tab && <motion.span layoutId="tab-line" className="absolute inset-x-2 bottom-0 h-[2px] bg-[var(--ink)]" />}
              </button>
            ))}
          </div>
          <div className="pb-28">
            {mobileTab === 'story' ? (
              <StoryPanel selected={selected} onSelect={setSelected} say={say} compact />
            ) : (
              <Materials selected={selected} onSelect={setSelected} say={say} compact />
            )}
          </div>
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--rule)] bg-[var(--paper)]/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
            <button onClick={present} className="f2-btn f2-btn-signal w-full justify-center">
              <Play size={15} fill="currentColor" /> {c.present} · {c.frames(state.story.length)}
            </button>
          </div>
        </motion.div>}
      </div>

      <div aria-live="polite" className="sr-only">
        {announce}
      </div>
    </div>
  );
}

/* ───────────────────────── Top bar ───────────────────────── */

function TopBar({ onPresent, onReset }: { onPresent: () => void; onReset: () => void }) {
  const { c } = useCopy();
  const [confirm, setConfirm] = useState(false);
  return (
    <motion.header
      className="sticky top-0 z-30 flex h-[60px] shrink-0 items-center justify-between gap-3 border-b border-[var(--rule)] bg-[var(--paper)] px-3 md:h-[64px] md:px-5"
      exit={{ opacity: 0, y: -12, transition: { duration: 0.25 } }}
    >
      <div className="flex min-w-0 items-center gap-2 md:gap-4">
        <a href="#/" className="flex items-center gap-1.5 rounded-full px-2 py-2 hover:bg-black/5" aria-label="FrantoS — home">
          <ArrowLeft size={16} className="text-[var(--ink-2)]" />
          <Wordmark small />
        </a>
        <span className="hidden h-6 w-px bg-[var(--rule)] md:block" />
        <div className="min-w-0">
          <h1 className="f2-display truncate text-[19px] leading-tight md:text-[22px]">
            After Hours <span style={{ color: 'var(--signal)' }}>/</span> <em>Tel Aviv</em>
          </h1>
          <SaveStatus />
        </div>
      </div>
      <div className="relative flex items-center gap-2">
        <button
          onClick={() => setConfirm((v) => !v)}
          aria-expanded={confirm}
          className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-[13.5px] font-medium text-[var(--ink-2)] hover:bg-black/5 hover:text-[var(--ink)]"
        >
          <RotateCcw size={15} /> <span className="hidden sm:inline">{c.reset}</span>
        </button>
        <AnimatePresence>
          {confirm && (
            <motion.div
              role="dialog"
              aria-label={c.resetConfirm}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 top-12 z-40 w-[260px] rounded-[6px] border border-[var(--rule)] bg-[#f7f2e9] p-4 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.35)]"
            >
              <p className="text-[14px] font-semibold">{c.resetConfirm}</p>
              <p className="mt-1 text-[12.5px] leading-snug text-[var(--ink-2)]">{c.localNote}</p>
              <div className="mt-3 flex gap-2">
                <button
                  autoFocus
                  onClick={() => {
                    onReset();
                    setConfirm(false);
                  }}
                  className="rounded-full bg-[var(--ink)] px-4 py-2 text-[13px] font-semibold text-[var(--paper)]"
                >
                  {c.resetYes}
                </button>
                <button onClick={() => setConfirm(false)} className="rounded-full px-4 py-2 text-[13px] font-medium hover:bg-black/5">
                  {c.resetNo}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button onClick={onPresent} className="f2-btn f2-btn-signal hidden !min-h-[42px] lg:inline-flex">
          <Play size={14} fill="currentColor" /> {c.present}
        </button>
      </div>
    </motion.header>
  );
}

function SaveStatus() {
  const { c, lang } = useCopy();
  const { state, saveStatus } = useDemo();
  const time = state.updatedAt
    ? new Date(state.updatedAt).toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
    : '';
  let dot = 'var(--ink-2)';
  let label = c.seed;
  if (saveStatus === 'saving') {
    dot = 'var(--signal)';
    label = c.saving;
  } else if (saveStatus === 'error') {
    dot = 'var(--signal)';
    label = c.saveError;
  } else if (state.updatedAt) {
    dot = '#4f8a5b';
    label = `${c.saved} · ${time}`;
  }
  return (
    <p className="flex items-center gap-1.5 text-[11.5px] text-[var(--ink-2)]" aria-live="polite" title={c.localNote}>
      <motion.span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: dot }}
        animate={saveStatus === 'saving' ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
        transition={saveStatus === 'saving' ? { duration: 0.8, repeat: Infinity } : { duration: 0.2 }}
      />
      <span className="truncate">{label}</span>
    </p>
  );
}

/* ───────────────────────── Stage (graphite light table) ───────────────────────── */

function useMedia(q: string) {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return m;
}

function useBox<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, box] as const;
}

function Stage({ selected, onSelect, say }: { selected: FrameId; onSelect: (id: FrameId) => void; say: (s: string) => void }) {
  const { c, lang } = useCopy();
  const { state } = useDemo();
  const f = FRAME_BY_ID[selected];
  const idx = state.story.indexOf(selected);
  const inStory = idx >= 0;
  const isCover = state.cover === selected;
  const [ref, box] = useBox<HTMLDivElement>();

  // fit frame into the available box, keeping its true proportions
  const maxW = box.w;
  const maxH = box.h;
  let w = maxW;
  let h = w / f.ratio;
  if (h > maxH) {
    h = maxH;
    w = h * f.ratio;
  }

  const add = () => {
    demo.addToStory(selected);
    say(`${f.title[lang]} — ${c.inStory} ${c.position(state.story.length + 1, state.story.length + 1)}`);
  };

  return (
    <motion.main
      className="relative flex min-h-0 flex-col bg-[var(--graphite)] text-[#f3efe7]"
      exit={{ backgroundColor: '#0e0e10', transition: { duration: 0.3 } }}
    >
      <div ref={ref} className="relative mx-4 mt-4 h-[min(38vh,420px)] md:h-[min(48vh,520px)] md:mx-8 md:mt-6 lg:mx-10 lg:mt-8 lg:h-auto lg:flex-1">
        <div className="absolute inset-0 flex items-center justify-center">
          {box.w > 0 && (
            <div className="relative" style={{ width: w, height: h }}>
              <span className="text-[var(--signal)]">
                <CropMarks inset={-10} size={16} />
              </span>
              <AnimatePresence initial={false} mode="popLayout">
                <motion.div
                  key={selected}
                  className="absolute inset-0 overflow-hidden rounded-[2px]"
                  initial={{ opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, ease }}
                >
                  <img
                    src={frameSrc(selected)}
                    alt={`${f.title[lang]} — ${f.caption[lang]}`}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* caption + tools */}
      <div className="flex flex-col gap-3 px-4 pb-4 pt-5 md:gap-4 md:px-8 md:pb-5 md:pt-6 lg:flex-row lg:items-end lg:justify-between lg:px-10 lg:pb-7">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[var(--fog)]">
            <FrameNo n={f.n} />
            <span className="f2-mono">{f.time}</span>
            <span className="f2-mono max-[400px]:hidden">{f.place[lang]}</span>
            <span
              className="f2-mono rounded-full px-2 py-[3px] !text-[10px]"
              style={{ background: inStory ? 'rgba(255,255,255,0.1)' : 'transparent', border: inStory ? 'none' : '1px dashed rgba(255,255,255,0.3)' }}
            >
              {inStory ? `${c.inStory} · ${c.position(idx + 1, state.story.length)}` : c.notInStory}
            </span>
          </div>
          <p className="f2-display mt-2 text-[28px] leading-none md:text-[34px]">{f.title[lang]}</p>
          <p className="mt-1.5 hidden text-[14px] text-[var(--fog)] sm:block">{f.caption[lang]}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label={f.title[lang]}>
          {inStory ? (
            <>
              <ToolBtn onClick={() => demo.move(selected, -1)} disabled={idx === 0} label={c.moveUp} icon={<ArrowUp size={15} className="lg:-rotate-90" />} iconOnly />
              <ToolBtn onClick={() => demo.move(selected, 1)} disabled={idx === state.story.length - 1} label={c.moveDown} icon={<ArrowDown size={15} className="lg:-rotate-90" />} iconOnly />
              <ToolBtn
                onClick={() => demo.setCover(selected)}
                active={isCover}
                label={isCover ? c.isCover : c.setCover}
                icon={<Star size={15} fill={isCover ? 'currentColor' : 'none'} />}
              />
              <ToolBtn
                onClick={() => demo.removeFromStory(selected)}
                disabled={state.story.length <= 1}
                title={state.story.length <= 1 ? c.lastFrame : undefined}
                label={c.removeFromStory}
                icon={<Minus size={15} />}
                shrink
              />
            </>
          ) : (
            <button onClick={add} className="f2-btn !min-h-[44px] bg-[#f3efe7] text-[var(--ink)] hover:bg-white">
              <Plus size={16} /> {c.addToStory}
            </button>
          )}
        </div>
      </div>
    </motion.main>
  );
}

function ToolBtn({
  onClick,
  label,
  icon,
  active,
  disabled,
  iconOnly,
  title,
  shrink,
}: {
  shrink?: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  iconOnly?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={iconOnly ? label : undefined}
      title={title ?? (iconOnly ? label : undefined)}
      className={`inline-flex h-11 items-center gap-2 rounded-full border text-[13.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${iconOnly ? 'w-11 justify-center' : shrink ? 'px-4 max-[400px]:w-11 max-[400px]:justify-center max-[400px]:px-0' : 'px-4'}`}
      style={{
        borderColor: active ? 'var(--signal)' : 'rgba(255,255,255,0.14)',
        color: active ? 'var(--signal)' : '#f3efe7',
        background: active ? 'rgba(255,75,43,0.1)' : 'transparent',
      }}
    >
      {icon}
      {!iconOnly && <span className={shrink ? 'max-[400px]:sr-only' : ''}>{label}</span>}
    </button>
  );
}

/* ───────────────────────── Materials (raw frames) ───────────────────────── */

function Materials({ selected, onSelect, say, compact }: { selected: FrameId; onSelect: (id: FrameId) => void; say: (s: string) => void; compact?: boolean }) {
  const { c, lang } = useCopy();
  const { state } = useDemo();
  return (
    <div className={`f2-scroll flex min-h-0 flex-1 flex-col ${compact ? '' : 'overflow-y-auto'}`}>
      {!compact && (
        <div className="flex items-baseline justify-between px-5 pb-3 pt-5">
          <h2 className="text-[13px] font-semibold">{c.materials}</h2>
          <span className="f2-mono text-[var(--ink-2)]">{String(FRAMES.length).padStart(2, '0')}</span>
        </div>
      )}
      <ul className={`grid gap-x-3 gap-y-5 px-5 pb-6 ${compact ? 'grid-cols-3 pt-5 sm:grid-cols-4' : 'grid-cols-2'}`}>
        {FRAMES.map((f) => {
          const pos = state.story.indexOf(f.id);
          const inStory = pos >= 0;
          const on = selected === f.id;
          return (
            <li key={f.id} className="relative">
              <button onClick={() => onSelect(f.id)} aria-pressed={on} className="group block w-full text-left" aria-label={`${f.title[lang]}${inStory ? ` — ${c.inStory} ${pos + 1}` : ''}`}>
                <div className="relative aspect-[4/5]">
                  <div className="absolute inset-0 overflow-hidden rounded-[3px] bg-[var(--graphite)]">
                    <FrameImg id={f.id} sizes="140px" className={`transition-[opacity,transform] duration-300 group-hover:scale-[1.03] ${inStory ? 'opacity-55' : ''}`} />
                  </div>
                  {inStory && (
                    <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-[3px] bg-[var(--ink)] px-1.5 py-[3px] text-[10px] font-semibold tabular-nums text-[var(--paper)]">
                      <Check size={10} strokeWidth={3} /> {String(pos + 1).padStart(2, '0')}
                    </span>
                  )}
                  {on && <motion.span layoutId={compact ? 'mat-sel-m' : 'mat-sel'} className="absolute -inset-[4px] rounded-[5px] border-2 border-[var(--signal)]" transition={{ duration: 0.25, ease }} />}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[var(--ink-2)]">
                  <FrameNo n={f.n} className="!text-[10px]" />
                  <span className="f2-mono !text-[10px]">{f.time}</span>
                </div>
                <p className="truncate text-[12.5px] font-medium">{f.title[lang]}</p>
              </button>
              {!inStory && (
                <button
                  onClick={() => {
                    demo.addToStory(f.id);
                    onSelect(f.id);
                    say(`${f.title[lang]} — ${c.addToStory}`);
                  }}
                  className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#f3efe7] text-[var(--ink)] shadow-md transition-transform hover:scale-110"
                  aria-label={`${c.addToStory}: ${f.title[lang]}`}
                  title={c.addToStory}
                >
                  <Plus size={16} strokeWidth={2.4} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ───────────────────────── Story (ordered sequence) ───────────────────────── */

function StoryPanel({ selected, onSelect, say, compact }: { selected: FrameId; onSelect: (id: FrameId) => void; say: (s: string) => void; compact?: boolean }) {
  const { c, lang } = useCopy();
  const { state } = useDemo();
  const coverF = FRAME_BY_ID[state.cover];
  const coarse = useMedia('(pointer: coarse)');

  return (
    <div className={`f2-scroll flex min-h-0 flex-1 flex-col ${compact ? '' : 'overflow-y-auto'}`}>
      {/* Cover */}
      <div className={`flex gap-4 px-5 ${compact ? 'pt-5' : 'pt-5'}`}>
        <button
          onClick={() => onSelect(state.cover)}
          className="relative aspect-[4/5] w-[112px] shrink-0 text-[var(--ink)] md:w-[128px]"
          aria-label={`${c.isCover}: ${coverF.title[lang]}`}
        >
          <CoverArt id={state.cover} title={STORY_META.title} layoutId="cover" size="mini" sizes="160px" />
          <AnimatePresence>
            <motion.span
              key={state.cover}
              aria-hidden
              className="absolute -inset-[4px] rounded-[5px] border-2 border-[var(--signal)]"
              initial={{ opacity: 1, scale: 1.08 }}
              animate={{ opacity: 0, scale: 1 }}
              transition={{ duration: 0.7, ease }}
            />
          </AnimatePresence>
        </button>
        <div className="min-w-0 pt-1">
          <p className="f2-mono text-[var(--ink-2)]">{c.cover}</p>
          <p className="f2-display mt-1.5 text-[22px] leading-none">{coverF.title[lang]}</p>
          <p className="mt-1 text-[12.5px] text-[var(--ink-2)]">
            <FrameNo n={coverF.n} className="!text-[10px]" /> · {coverF.time}
          </p>
          <p className="mt-2 text-[12px] leading-snug text-[var(--ink-2)]">{coarse ? c.dragHintTouch : c.dragHint}</p>
        </div>
      </div>

      <div className="flex items-baseline justify-between px-5 pb-2 pt-6">
        <h2 className="text-[13px] font-semibold">{c.storyPanel}</h2>
        <span className="f2-mono text-[var(--ink-2)]">{c.frames(state.story.length)}</span>
      </div>

      <Reorder.Group axis="y" values={state.story} onReorder={(v) => demo.reorder(v as FrameId[])} className="flex flex-col gap-1.5 px-3 pb-4">
        {state.story.map((id, i) => (
          <StoryRow key={id} id={id} i={i} total={state.story.length} selected={selected === id} isCover={state.cover === id} onSelect={onSelect} say={say} />
        ))}
      </Reorder.Group>

      <p className="mx-5 mb-6 mt-auto border-t border-[var(--rule)] pt-4 text-[12px] leading-snug text-[var(--ink-2)]">{c.localNote}</p>
    </div>
  );
}

function StoryRow({
  id,
  i,
  total,
  selected,
  isCover,
  onSelect,
  say,
}: {
  id: FrameId;
  i: number;
  total: number;
  selected: boolean;
  isCover: boolean;
  onSelect: (id: FrameId) => void;
  say: (s: string) => void;
}) {
  const { c, lang } = useCopy();
  const f = FRAME_BY_ID[id];
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);

  const move = (d: number) => {
    const j = i + d;
    if (j < 0 || j >= total) return;
    demo.move(id, d);
    say(`${f.title[lang]}: ${c.position(j + 1, total)}`);
  };

  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => {
        setDragging(false);
        say(`${f.title[lang]}`);
      }}
      className="relative"
      style={{ zIndex: dragging ? 5 : 0 }}
      transition={{ type: 'spring', stiffness: 520, damping: 40 }}
    >
      <motion.div
        className="flex items-center gap-2 rounded-[5px] pr-1.5"
        animate={{
          backgroundColor: selected ? 'rgba(21,19,15,0.07)' : 'rgba(21,19,15,0)',
          boxShadow: dragging ? '0 18px 30px -16px rgba(21,19,15,0.45)' : '0 0 0 0 rgba(0,0,0,0)',
          scale: dragging ? 1.02 : 1,
        }}
        transition={{ duration: 0.18 }}
      >
        <button
          aria-hidden
          tabIndex={-1}
          onPointerDown={(e) => controls.start(e)}
          className="flex h-14 w-7 cursor-grab touch-none items-center justify-center text-[var(--ink-2)] active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </button>
        <button
          onClick={() => onSelect(id)}
          onKeyDown={(e) => {
            if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
              e.preventDefault();
              move(e.key === 'ArrowUp' ? -1 : 1);
            }
          }}
          aria-current={selected}
          aria-label={`${String(i + 1).padStart(2, '0')}. ${f.title[lang]}${isCover ? ` — ${c.isCover}` : ''}. ${c.dragHint}`}
          className="flex min-w-0 flex-1 items-center gap-3 py-1.5 text-left"
        >
          <span className="w-5 text-right text-[12px] font-semibold tabular-nums" style={{ color: selected ? 'var(--signal)' : 'var(--ink-2)' }}>
            {String(i + 1).padStart(2, '0')}
          </span>
          <span className="relative h-[52px] w-[42px] shrink-0 overflow-hidden rounded-[2px] bg-[var(--graphite)]">
            <FrameImg id={id} sizes="90px" />
            {selected && <span className="absolute inset-0 rounded-[2px] ring-2 ring-inset ring-[var(--signal)]" />}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 truncate text-[13.5px] font-medium">
              {f.title[lang]}
              {isCover && <Star size={12} className="shrink-0 text-[var(--signal)]" fill="currentColor" aria-hidden />}
            </span>
            <span className="f2-mono block truncate !text-[10px] text-[var(--ink-2)]">
              {f.time} · {f.place[lang]}
            </span>
          </span>
        </button>
        <div className="flex shrink-0 flex-col">
          <button onClick={() => move(-1)} disabled={i === 0} aria-label={`${c.moveUp}: ${f.title[lang]}`} className="flex h-7 w-8 items-center justify-center rounded text-[var(--ink-2)] hover:bg-black/5 hover:text-[var(--ink)] disabled:opacity-25">
            <ArrowUp size={14} />
          </button>
          <button onClick={() => move(1)} disabled={i === total - 1} aria-label={`${c.moveDown}: ${f.title[lang]}`} className="flex h-7 w-8 items-center justify-center rounded text-[var(--ink-2)] hover:bg-black/5 hover:text-[var(--ink)] disabled:opacity-25">
            <ArrowDown size={14} />
          </button>
        </div>
      </motion.div>
    </Reorder.Item>
  );
}
