import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Cloud, CloudOff, LogOut, Users } from 'lucide-react';
import { useI18n } from '../i18n';
import { useAuth, cloudEnabled, signOut } from '../cloud/client';
import { SignIn, useSync } from '../cloud/Account';
import { go } from '../route';
import { Pane } from './kit';

/** Account on glass: sign in, sync state, studio, language, sign out. */
export function GlassAccount() {
  const { t } = useI18n();
  const a = useAuth();
  const sync = useSync();
  const [open, setOpen] = useState(false);
  const [signin, setSignin] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);
  if (!cloudEnabled) return null;
  if (!a.ready) return <span className="h-11 w-11" />;
  if (!a.session)
    return (
      <>
        <button type="button" onClick={() => setSignin(true)} className="lg-btn lg-btn-ghost">
          <Cloud size={15} /> {t('Sign in')}
        </button>
        <AnimatePresence>{signin && <SignIn onClose={() => setSignin(false)} />}</AnimatePresence>
      </>
    );
  const initial = (a.name || a.session.user.email || '?').slice(0, 1).toUpperCase();
  const dot = sync === 'syncing' ? '#ffcf70' : sync === 'offline' || sync === 'error' ? '#c9c2b6' : '#7fe0a1';
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={t('Account')} className="lg-btn lg-btn-ghost lg-icon relative text-[15px]">
        {initial}
        <span className="absolute bottom-0.5 end-0.5 h-3 w-3 rounded-full border-2 border-[#1a1e24]" style={{ background: dot }} title={sync} />
      </button>
      <AnimatePresence>
        {open && (
          <Pane strong className="absolute end-0 top-14 z-50 w-[280px] rounded-[22px] p-2" role="menu">
            <div className="px-3 py-2">
              <p className="text-[14px] font-bold">{a.name}</p>
              <p className="truncate text-[12px] text-white/70" dir="ltr">
                {a.session.user.email}
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-white/75">
                {sync === 'offline' ? <CloudOff size={13} /> : <Cloud size={13} />}
                {sync === 'syncing' ? t('Syncing…') : sync === 'offline' ? t('Offline — changes wait here') : sync === 'error' ? t('Sync paused, retrying') : t('In sync with your studio')}
              </p>
            </div>
            <button role="menuitem" onClick={() => (setOpen(false), go('/team'))} className="flex min-h-[44px] w-full items-center gap-2 rounded-[14px] px-3 text-start text-[14px] hover:bg-white/10">
              <Users size={16} /> {t('Studio & team')}
            </button>
            <button role="menuitem" onClick={() => (setOpen(false), signOut())} className="flex min-h-[44px] w-full items-center gap-2 rounded-[14px] px-3 text-start text-[14px] text-white/80 hover:bg-white/10">
              <LogOut size={16} /> {t('Sign out')}
            </button>
          </Pane>
        )}
      </AnimatePresence>
    </div>
  );
}

