import React, { useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, Loader2, RotateCcw, X } from 'lucide-react';
import { ingest, UploadError } from './media';
import { ws } from './store';
import { Asset } from './types';
import { ease, toast } from './kit';

type Job = {
  id: string;
  file: File;
  pid: string;
  isReference: boolean;
  state: 'reading' | 'done' | 'error';
  error?: string;
  retry?: boolean;
  then?: (a: Asset) => void;
};

let jobs: Job[] = [];
const ls = new Set<() => void>();
const emit = () => ls.forEach((l) => l());
const patch = (id: string, p: Partial<Job>) => {
  jobs = jobs.map((j) => (j.id === id ? { ...j, ...p } : j));
  emit();
};

async function run(job: Job) {
  patch(job.id, { state: 'reading', error: undefined });
  try {
    const asset = await ingest(job.file, { isReference: job.isReference });
    ws.addAsset(job.pid, asset);
    job.then?.(asset);
    patch(job.id, { state: 'done' });
    window.setTimeout(() => {
      jobs = jobs.filter((j) => j.id !== job.id);
      emit();
    }, 1600);
  } catch (e) {
    patch(job.id, { state: 'error', error: e instanceof UploadError ? e.message : 'Something went wrong while reading this file.', retry: !(e instanceof UploadError) || e.code === 'storage' || e.code === 'decode' });
  }
}

/** Add files to a project. `then` runs for each stored asset (e.g. add as a new version). */
export function upload(files: FileList | File[], pid: string, opts: { isReference: boolean; then?: (a: Asset) => void }) {
  const list = Array.from(files);
  if (!list.length) return;
  const created = list.map((file) => ({ id: Math.random().toString(36).slice(2), file, pid, isReference: opts.isReference, state: 'reading' as const, then: opts.then }));
  jobs = [...jobs, ...created];
  emit();
  created.forEach(run);
}

export function UploadTray() {
  const list = useSyncExternalStore(
    (l) => (ls.add(l), () => ls.delete(l)),
    () => jobs,
    () => jobs
  );
  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-[70] flex w-[min(360px,calc(100vw-32px))] flex-col gap-2 md:bottom-6">
      <AnimatePresence>
        {list.map((j) => (
          <motion.div
            key={j.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2, ease }}
            className="pointer-events-auto rounded-[8px] border border-[var(--rule)] bg-[#f7f2e9] p-3 text-[13px] shadow-[0_18px_40px_-20px_rgba(0,0,0,0.4)]"
            role={j.state === 'error' ? 'alert' : 'status'}
          >
            <div className="flex items-center gap-2">
              {j.state === 'reading' && <Loader2 size={15} className="shrink-0 animate-spin text-[var(--ink-2)]" />}
              {j.state === 'done' && <Check size={15} className="shrink-0 text-[#4f8a5b]" />}
              {j.state === 'error' && <AlertTriangle size={15} className="shrink-0 text-[var(--signal)]" />}
              <span className="min-w-0 flex-1 truncate font-medium">{j.file.name}</span>
              <span className="shrink-0 text-[11.5px] text-[var(--ink-2)]">{j.state === 'reading' ? 'Saving…' : j.state === 'done' ? 'Added' : 'Not added'}</span>
            </div>
            {j.state === 'error' && (
              <>
                <p className="mt-1.5 text-[12.5px] leading-snug text-[var(--ink-2)]">{j.error}</p>
                <div className="mt-2 flex gap-2">
                  {j.retry && <button onClick={() => run(j)} className="inline-flex items-center gap-1 rounded-full bg-[var(--ink)] px-3 py-1.5 text-[12px] font-semibold text-[var(--paper)]">
                    <RotateCcw size={12} /> Try again
                  </button>}
                  <button
                    onClick={() => {
                      jobs = jobs.filter((x) => x.id !== j.id);
                      emit();
                    }}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium hover:bg-black/5"
                  >
                    <X size={12} /> Dismiss
                  </button>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Invisible file input + drop zone helper. */
export function FilePick({
  onFiles,
  children,
  multiple = true,
  accept,
  className = '',
  label,
}: {
  onFiles: (f: FileList) => void;
  children: React.ReactNode;
  multiple?: boolean;
  accept?: string;
  className?: string;
  label?: string;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.click()} className={className} aria-label={label}>
        {children}
      </button>
      <input
        ref={ref}
        type="file"
        hidden
        multiple={multiple}
        accept={accept ?? 'image/*,video/*'}
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </>
  );
}

export function useDropZone(onFiles: (f: FileList) => void) {
  const [over, setOver] = React.useState(false);
  const props = {
    onDragOver: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes('Files')) {
        e.preventDefault();
        setOver(true);
      }
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setOver(false);
    },
    onDrop: (e: React.DragEvent) => {
      if (!e.dataTransfer.files.length) return;
      e.preventDefault();
      setOver(false);
      onFiles(e.dataTransfer.files);
    },
  };
  return { over, props };
}

export { toast };
