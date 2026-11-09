import React, { useEffect, useState } from 'react';
import { FolderOpen, Link2, Plus, Send, StickyNote } from 'lucide-react';
import { useI18n } from '../i18n';
import { go } from '../route';
import { ensureLoaded, useWs, ws } from '../ws/store';
import { toast } from '../ws/kit';
import { upload } from '../ws/uploads';
import { GlassPage } from '../glass/Shell';
import { Pane } from '../glass/kit';

/**
 * Something shared to FrantoS from another app (Android share sheet, desktop share):
 * text and links become a note on a board, pictures and video become references.
 * You pick the project — nothing lands anywhere until you do.
 */
export function SharePage({ q }: { q: URLSearchParams }) {
  const { t } = useI18n();
  const { state, status } = useWs();
  const [files, setFiles] = useState<File[]>([]);
  const [pid, setPid] = useState<string | null>(null);
  const text = [q.get('title'), q.get('text'), q.get('url')].filter(Boolean).join('\n');
  const link = q.get('url') ?? text.match(/https?:\/\/\S+/)?.[0];
  useEffect(() => void ensureLoaded(), []);
  useEffect(() => {
    if (!Number(q.get('files')) || typeof caches === 'undefined') return;
    caches.open('frantos-share').then(async (c) => {
      const out: File[] = [];
      for (const req of await c.keys()) {
        const r = await c.match(req);
        if (!r) continue;
        const b = await r.blob();
        out.push(new File([b], decodeURIComponent(r.headers.get('X-Name') ?? 'shared'), { type: b.type }));
      }
      setFiles(out);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (status !== 'loading' && !pid) setPid(state.lastProjectId ?? state.projects[0]?.id ?? null);
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    if (!pid) return;
    if (text) ws.addNote(pid, 0.04, 0.06, text);
    if (files.length) upload(files, pid, { isReference: true });
    await caches?.delete('frantos-share').catch(() => undefined);
    toast(t('Added to {name}', { name: state.projects.find((p) => p.id === pid)?.title ?? '' }));
    go(files.length ? `/p/${pid}?s=collect` : `/p/${pid}/moodboard`);
  };
  const nothing = !text && !files.length;

  return (
    <GlassPage kicker={t('Shared to FrantoS')} title={nothing ? t('Nothing arrived') : t('Where should it go?')} lead={nothing ? t('Share a picture, a video or a link to FrantoS from another app, and it will wait here.') : t('Pictures and video become references; text and links become a note on the board.')}>
      {!nothing && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <Pane className="rounded-[26px] p-4">
            {files.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {files.map((f, i) => (
                  <div key={i} className="aspect-square overflow-hidden rounded-[14px] bg-white/10">
                    {f.type.startsWith('image/') ? <img src={URL.createObjectURL(f)} alt={f.name} className="h-full w-full object-cover" /> : <video src={URL.createObjectURL(f)} muted className="h-full w-full object-cover" />}
                  </div>
                ))}
              </div>
            )}
            {text && (
              <div className="mt-3 flex items-start gap-2 rounded-[16px] p-3 lg-soft">
                {link ? <Link2 size={16} className="mt-0.5 shrink-0" /> : <StickyNote size={16} className="mt-0.5 shrink-0" />}
                <p dir="auto" className="whitespace-pre-wrap break-words text-[14px]">
                  {text}
                </p>
              </div>
            )}
          </Pane>
          <Pane className="flex flex-col gap-2 rounded-[26px] p-3">
            <p className="lg-label px-1">{t('Project')}</p>
            <div className="flex max-h-[44vh] flex-col gap-1 overflow-y-auto lg-scroll">
              {state.projects.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={pid === p.id} onClick={() => setPid(p.id)} className={`flex items-center gap-2 rounded-[14px] px-3 py-2.5 text-start text-[14px] font-bold ${pid === p.id ? 'bg-white text-[#11151a]' : 'hover:bg-white/10'}`}>
                  <FolderOpen size={15} /> {p.title}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                const id = ws.createProject(t('Shared'));
                setPid(id);
              }}
              className="lg-btn lg-btn-ghost min-h-[38px] text-[13px]"
            >
              <Plus size={14} /> {t('New project')}
            </button>
            <button type="button" disabled={!pid} onClick={add} className="lg-btn lg-btn-primary mt-1 disabled:opacity-50">
              <Send size={15} /> {t('Add to the project')}
            </button>
          </Pane>
        </div>
      )}
    </GlassPage>
  );
}
