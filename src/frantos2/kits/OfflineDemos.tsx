import React, { useState } from 'react';
import { CloudDownload, Check } from 'lucide-react';
import { useI18n } from '../i18n';
import { useWs } from '../ws/store';
import { toast } from '../ws/kit';

const CACHE = 'frantos-v6';

/** Every file of the demo projects into the offline cache, so a client meeting with no network still shows everything. */
export function OfflineDemos() {
  const { t } = useI18n();
  const { state } = useWs();
  const [busy, setBusy] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  if (typeof caches === 'undefined') return null;
  const run = async () => {
    const urls = new Set<string>();
    for (const p of state.projects.filter((x) => x.kind === 'demo')) {
      p.assets.forEach((a) => [a.src, a.thumb].forEach((u) => u && u.startsWith('/') && urls.add(u)));
      (p.objects ?? []).forEach((o) => o.thumb && o.thumb.startsWith('/') && urls.add(o.thumb));
    }
    const list = [...urls];
    const cache = await caches.open(CACHE);
    let n = 0;
    setBusy(0);
    // a few at a time: fast, without flooding a phone
    const next = async (): Promise<void> => {
      const u = list[n++];
      if (!u) return;
      try {
        if (!(await cache.match(u))) await cache.add(u);
      } catch {
        /* a missing file is skipped */
      }
      setBusy(Math.round((n / list.length) * 100));
      return next();
    };
    await Promise.all([next(), next(), next(), next()]);
    setBusy(null);
    setDone(true);
    toast(t('Demos ready offline · {n} files', { n: list.length }));
  };
  return (
    <button type="button" onClick={run} disabled={busy != null} className="lg-btn lg-btn-ghost">
      {done ? <Check size={15} /> : <CloudDownload size={15} />} {busy != null ? `${busy}%` : done ? t('Demos kept offline') : t('Keep the demos offline')}
    </button>
  );
}
