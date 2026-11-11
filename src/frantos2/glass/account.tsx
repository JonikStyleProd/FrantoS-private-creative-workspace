import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Cloud, CloudOff, LogOut, LogIn, ShieldCheck, UserCog, UserRound, Users } from 'lucide-react';
import { useI18n } from '../i18n';
import { useAuth, cloudEnabled, signOut } from '../cloud/client';
import { useSync } from '../cloud/Account';
import { GlassSignIn } from '../cloud/Security';
import { go } from '../route';
import { Pane } from './kit';
import { Avatar } from './Avatar';
import { useWs } from '../ws/store';

/** this account's photo: the one stored with the profile, or the one picked on this device */
export function useMyAvatar() {
  const a = useAuth();
  const { state } = useWs();
  return state.profile?.avatar || a.avatar || null;
}

/** Account on glass: sign in, sync state, studio, language, sign out. */
export function GlassAccount() {
  const { t } = useI18n();
  const a = useAuth();
  const sync = useSync();
  const [open, setOpen] = useState(false);
  // the menu sits under the photo but always fully on screen, whichever side the photo is on (RTL too)
  const box = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<React.CSSProperties>({});
  useLayoutEffect(() => {
    if (!open || !box.current) return;
    const fit = () => {
      const r = box.current!.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const w = Math.min(300, vw - 24);
      const rtl = getComputedStyle(box.current!).direction === 'rtl';
      const want = rtl ? r.left : r.right - w;
      const x = Math.max(12, Math.min(vw - 12 - w, want));
      setPlace({ left: x - r.left, width: w });
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [open]);
  const [signin, setSignin] = useState(false);
  const avatar = useMyAvatar();
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
        <button type="button" onClick={() => go(`/login?next=${encodeURIComponent(window.location.hash.replace(/^#/, '') || '/app')}`)} className="lg-btn lg-btn-ghost max-lg:w-11 max-lg:px-0" aria-label={t('Sign in')} title={t('Sign in')}>
          <LogIn size={15} /> <span className="max-lg:hidden">{t('Sign in')}</span>
        </button>
        <AnimatePresence>{signin && <GlassSignIn onClose={() => setSignin(false)} />}</AnimatePresence>
      </>
    );
  const name = a.name || a.session.user.email || '?';
  const dot = sync === 'syncing' ? '#ffcf70' : sync === 'offline' || sync === 'error' ? '#c9c2b6' : '#7fe0a1';
  return (
    <div className="relative" ref={box}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={t('Account')} className="relative flex h-11 w-11 items-center justify-center rounded-full transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
        <Avatar src={avatar} name={name} size={38} ring />
        <span className="absolute bottom-0.5 end-0.5 h-3 w-3 rounded-full border-2 border-[#1a1e24]" style={{ background: dot }} title={sync} />
      </button>
      <AnimatePresence>
        {open && (
          <Pane strong className="lg-pop absolute top-14 z-50 rounded-[22px] p-2" style={place} role="menu">
            <div className="flex items-center gap-3 px-3 py-2">
              <Avatar src={avatar} name={name} size={44} />
              <div className="min-w-0">
              <p className="truncate text-[14px] font-bold">{a.name}</p>
              <p className="truncate text-[12px] text-white/70" dir="ltr">
                {a.session.user.email}
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-white/75">
                {sync === 'offline' ? <CloudOff size={13} /> : <Cloud size={13} />}
                {sync === 'syncing' ? t('Syncing…') : sync === 'offline' ? t('Offline — changes wait here') : sync === 'error' ? t('Sync paused, retrying') : t('In sync with your studio')}
              </p>
              </div>
            </div>
            <button role="menuitem" onClick={() => (setOpen(false), go('/settings'))} className="flex min-h-[44px] w-full items-center gap-2 rounded-[14px] px-3 text-start text-[14px] hover:bg-white/10">
              <UserRound size={16} /> {t('Profile and photo')}
            </button>
            {a.role === 'admin' && (
              <button role="menuitem" onClick={() => (setOpen(false), go('/admin'))} className="flex min-h-[44px] w-full items-center gap-2 rounded-[14px] px-3 text-start text-[14px] hover:bg-white/10">
                <UserCog size={16} /> {t('Accounts & access')}
              </button>
            )}
            {a.role !== 'client' && (
              <button role="menuitem" onClick={() => (setOpen(false), go('/team'))} className="flex min-h-[44px] w-full items-center gap-2 rounded-[14px] px-3 text-start text-[14px] hover:bg-white/10">
                <Users size={16} /> {t('Studio & team')}
              </button>
            )}
            <button role="menuitem" onClick={() => (setOpen(false), go('/settings?security=1'))} className="flex min-h-[44px] w-full items-center gap-2 rounded-[14px] px-3 text-start text-[14px] hover:bg-white/10">
              <ShieldCheck size={16} /> {t('Security')}
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

