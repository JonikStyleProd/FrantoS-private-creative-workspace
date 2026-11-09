import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Cloud, CloudOff, HardDrive, Loader2, TriangleAlert } from 'lucide-react';
import { useI18n } from '../i18n';
import { useWs } from '../ws/store';
import { getSyncState, onSync } from '../cloud/sync';
import { useAuth } from '../cloud/client';

/**
 * Where your work is right now, in one glance: this browser only, saving, in the cloud,
 * offline (changes wait), or a conflict. The label says it plainly on hover and to screen readers.
 */
export function SyncBadge() {
  const { t } = useI18n();
  const { status } = useWs();
  const { session } = useAuth();
  const sync = useSyncExternalStore(onSync, getSyncState, () => 'off' as const);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  let icon = <HardDrive size={14} />;
  let label = t('Saved in this browser');
  let tone = 'text-white/70';
  if (status === 'saving' || sync === 'syncing') {
    icon = <Loader2 size={14} className="animate-spin" />;
    label = t('Saving…');
  } else if (status === 'error' || sync === 'error') {
    icon = <TriangleAlert size={14} />;
    label = t('Not saved — check storage or connection');
    tone = 'text-[var(--lg-accent)]';
  } else if (!online || sync === 'offline') {
    icon = <CloudOff size={14} />;
    label = session ? t('Offline — changes wait and sync later') : t('Offline — everything still saves here');
  } else if (sync === 'conflict') {
    icon = <TriangleAlert size={14} />;
    label = t('Changed in two places — open the project to choose');
    tone = 'text-[var(--lg-accent)]';
  } else if (session && sync === 'idle') {
    icon = <Cloud size={14} />;
    label = t('Synced to your studio');
  }
  return (
    <span role="status" aria-live="polite" title={label} className={`flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold lg-soft ${tone}`}>
      {icon}
      <span className="hidden 2xl:inline">{label}</span>
      <span className="sr-only 2xl:hidden">{label}</span>
    </span>
  );
}
