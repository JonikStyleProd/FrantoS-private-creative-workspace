import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, KeyRound, LogOut, MonitorSmartphone, ShieldCheck, Smartphone, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { Pane } from '../glass/kit';
import { toast } from '../ws/kit';
import {
  changePassword,
  mfaEnroll,
  mfaFactors,
  mfaRemove,
  mfaStepUp,
  mfaVerify,
  passwordProblem,
  sendPasswordReset,
  signInWithPassword,
  signOut,
  signOutEverywhere,
  useAuth,
} from './client';

/* ───────── shared bits ───────── */

function Overlay({ children, onClose, label }: { children: React.ReactNode; onClose?: () => void; label: string }) {
  useEffect(() => {
    if (!onClose) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const { dir } = useI18n();
  // portalled to <body>: a glass header (backdrop-filter) would otherwise become the box `fixed` is measured from
  return createPortal(
    <motion.div dir={dir} className="lg fixed inset-0 z-[95] flex items-center justify-center p-4" style={{ background: 'rgba(8, 10, 14, 0.5)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <Pane strong role="dialog" aria-modal aria-label={label} className="w-full max-w-[420px] rounded-[28px] p-6" onClick={(e) => e.stopPropagation()}>
        {children}
      </Pane>
    </motion.div>,
    document.body
  );
}

export function PasswordInput({ id, value, onChange, auto, label }: { id: string; value: string; onChange: (v: string) => void; auto: 'current-password' | 'new-password'; label: string }) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="lg-label" htmlFor={id}>
        {label}
      </label>
      <div className="relative mt-1">
        <input id={id} type={show ? 'text' : 'password'} required dir="ltr" autoComplete={auto} value={value} onChange={(e) => onChange(e.target.value)} className="lg-input pe-12 text-[15px]" />
        <button type="button" onClick={() => setShow((v) => !v)} className="absolute end-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full hover:bg-white/10" aria-label={show ? t('Hide the password') : t('Show the password')}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

export function CodeInput({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  const { t } = useI18n();
  return (
    <input
      aria-label={t('6-digit code')}
      inputMode="numeric"
      autoComplete="one-time-code"
      autoFocus={autoFocus}
      maxLength={7}
      dir="ltr"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
      placeholder="000000"
      className="lg-input text-center font-mono text-[24px] tracking-[0.4em]"
    />
  );
}

export const authError = (t: (s: string) => string, e: any) => {
  const m = String(e?.message ?? '');
  if (/invalid login credentials/i.test(m)) return t('Wrong email or password.');
  if (/invitation only/i.test(m)) return t('This email has no account. Accounts are created by the studio admin.');
  if (/banned/i.test(m)) return t('This account is locked. Ask the studio admin.');
  if (/rate|too many/i.test(m)) return t('Too many attempts. Wait a minute and try again.');
  if (/failed to fetch|network|load failed/i.test(m)) return t('No connection to the studio. Check the internet and try again.');
  if (/invalid.*code|totp|mfa/i.test(m)) return t('That code did not match. Use the newest one from the app.');
  return t('Something went wrong. Try again.');
};

/* ───────── sign in ───────── */

export function GlassSignIn({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const a = useAuth();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [mode, setMode] = useState<'signin' | 'forgot' | 'sent'>('signin');
  // once signed in (and past the code, which the gate asks for) the dialog has done its job
  useEffect(() => {
    if (a.session) onClose();
  }, [a.session]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Overlay onClose={onClose} label={t('Sign in')}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[26px] font-extrabold leading-[1.05]">{mode === 'signin' ? t('Sign in to FrantoS') : t('Reset the password')}</h2>
        <button type="button" onClick={onClose} className="lg-btn lg-btn-plain lg-icon" aria-label={t('Close')}>
          <X size={16} />
        </button>
      </div>
      {mode === 'sent' ? (
        <p className="mt-4 text-[14px] leading-[1.5] text-white/80">{t('If {email} has an account, a reset link is on its way. Open it on this device.', { email })}</p>
      ) : (
        <form
          className="mt-4 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setErr('');
            try {
              if (mode === 'forgot') {
                await sendPasswordReset(email);
                setMode('sent');
              } else await signInWithPassword(email, pw);
            } catch (x) {
              setErr(authError(t, x));
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="text-[13px] leading-[1.5] text-white/70">{t('A private studio: accounts are created by the admin. Your local projects stay on this device until you move them.')}</p>
          <div>
            <label className="lg-label" htmlFor="si-email">
              Email
            </label>
            <input id="si-email" type="email" required autoFocus dir="ltr" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="lg-input mt-1 text-[15px]" placeholder="you@studio.com" />
          </div>
          {mode === 'signin' && <PasswordInput id="si-pw" label={t('Password')} value={pw} onChange={setPw} auto="current-password" />}
          {err && (
            <p role="alert" className="text-[13px] text-[#ffb4a2]">
              {err}
            </p>
          )}
          <button type="submit" disabled={busy} className="lg-btn lg-btn-primary w-full disabled:opacity-60">
            {busy ? t('One moment…') : mode === 'signin' ? t('Sign in') : t('Send a reset link')}
          </button>
          <button type="button" onClick={() => (setMode(mode === 'signin' ? 'forgot' : 'signin'), setErr(''))} className="w-full text-center text-[13px] text-white/75 underline-offset-4 hover:underline">
            {mode === 'signin' ? t('Forgot the password?') : t('Back to sign in')}
          </button>
        </form>
      )}
    </Overlay>
  );
}

/* ───────── gates after sign-in: 2FA code, then a password of your own ───────── */

export function AuthGates() {
  const a = useAuth();
  if (!a.session) return null;
  if (a.needsCode) return <CodeGate />;
  if (a.mustChangePassword) return <PasswordGate />;
  return null;
}

function CodeGate() {
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (c: string) => {
    setBusy(true);
    setErr('');
    try {
      await mfaStepUp(c);
    } catch (x) {
      setErr(authError(t, x));
      setCode('');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Overlay label={t('Two-factor code')}>
      <ShieldCheck size={26} />
      <h2 className="mt-3 text-[24px] font-extrabold">{t('Enter the code')}</h2>
      <p className="mt-2 text-[13.5px] leading-[1.5] text-white/75">{t('Open your authenticator app and type the 6-digit code for FrantoS.')}</p>
      <form className="mt-4 space-y-3" onSubmit={(e) => (e.preventDefault(), submit(code))}>
        <CodeInput value={code} autoFocus onChange={(v) => (setCode(v), v.length === 6 && !busy && submit(v))} />
        {err && (
          <p role="alert" className="text-[13px] text-[#ffb4a2]">
            {err}
          </p>
        )}
        <button type="submit" disabled={busy || code.length !== 6} className="lg-btn lg-btn-primary w-full disabled:opacity-60">
          {t('Continue')}
        </button>
        <button type="button" onClick={() => signOut()} className="w-full text-center text-[13px] text-white/75 hover:underline">
          {t('Sign out')}
        </button>
      </form>
    </Overlay>
  );
}

function PasswordGate() {
  const { t } = useI18n();
  const a = useAuth();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const problem = pw ? passwordProblem(pw, a.session?.user.email) : null;
  return (
    <Overlay label={t('Choose your password')}>
      <KeyRound size={26} />
      <h2 className="mt-3 text-[24px] font-extrabold">{t('Choose your own password')}</h2>
      <p className="mt-2 text-[13.5px] leading-[1.5] text-white/75">{t('You signed in with a temporary password from the admin. Replace it with one only you know.')}</p>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (problem) return setErr(t(problem));
          if (pw !== pw2) return setErr(t('The two passwords differ.'));
          setBusy(true);
          try {
            await changePassword(pw);
            toast(t('Password saved'));
          } catch (x: any) {
            setErr(/same/i.test(x?.message ?? '') ? t('Pick a password different from the temporary one.') : authError(t, x));
          } finally {
            setBusy(false);
          }
        }}
      >
        <PasswordInput id="pg-1" label={t('New password')} value={pw} onChange={setPw} auto="new-password" />
        <p className={`text-[12px] ${problem ? 'text-white/65' : 'text-[#9be7b4]'}`}>{pw ? (problem ? t(problem) : t('Strong enough')) : t('12+ characters, letters and digits.')}</p>
        <PasswordInput id="pg-2" label={t('Repeat it')} value={pw2} onChange={setPw2} auto="new-password" />
        {err && (
          <p role="alert" className="text-[13px] text-[#ffb4a2]">
            {err}
          </p>
        )}
        <button type="submit" disabled={busy} className="lg-btn lg-btn-primary w-full disabled:opacity-60">
          {t('Save the password')}
        </button>
      </form>
    </Overlay>
  );
}

/* ───────── settings → security ───────── */

export function SecurityPanel() {
  const { t } = useI18n();
  const a = useAuth();
  const [factors, setFactors] = useState<{ id: string; friendly_name?: string; created_at: string }[]>([]);
  const [setup, setSetup] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => mfaFactors().then((f) => setFactors(f as any));
  useEffect(() => {
    if (a.session) load();
  }, [a.session?.user.id]);
  if (!a.session) return null;
  const problem = pw ? passwordProblem(pw, a.session.user.email) : null;

  return (
    <Pane className="space-y-4 rounded-[28px] p-5" id="security">
      <h2 className="flex items-center gap-2 text-[18px] font-extrabold">
        <ShieldCheck size={18} /> {t('Security')}
      </h2>
      <p className="text-[13px] text-white/70">
        <span dir="ltr">{a.session.user.email}</span> · {a.role === 'admin' ? t('Admin') : a.role === 'client' ? t('Client') : t('Developer')}
      </p>

      {/* 2FA */}
      <div className="rounded-[18px] bg-white/[0.07] p-4">
        <p className="flex items-center gap-2 text-[14.5px] font-bold">
          <Smartphone size={16} /> {t('Two-factor sign-in')}
          <span className={`ms-auto rounded-full px-2 py-0.5 text-[11.5px] ${factors.length ? 'bg-[#7fe0a1]/25 text-[#c9f5d6]' : 'bg-white/10 text-white/70'}`}>{factors.length ? t('On') : t('Off')}</span>
        </p>
        <p className="mt-1.5 text-[12.5px] leading-[1.5] text-white/70">{t('After the password, a 6-digit code from an app on your phone (Google Authenticator, 1Password, Authy…). Admin actions require it once it is on.')}</p>
        {factors.length > 0 && !setup && (
          <button
            type="button"
            className="lg-btn lg-btn-ghost mt-3 min-h-[38px] text-[13px]"
            onClick={async () => {
              if (!window.confirm(t('Turn off two-factor sign-in?'))) return;
              try {
                for (const f of factors) await mfaRemove(f.id);
                await load();
                toast(t('Two-factor sign-in is off'));
              } catch (x) {
                toast(authError(t, x), { tone: 'error' });
              }
            }}
          >
            {t('Turn off')}
          </button>
        )}
        {!factors.length && !setup && (
          <button
            type="button"
            className="lg-btn lg-btn-primary mt-3 min-h-[38px] text-[13px]"
            onClick={async () => {
              try {
                setSetup(await mfaEnroll());
              } catch (x) {
                toast(authError(t, x), { tone: 'error' });
              }
            }}
          >
            {t('Turn on')}
          </button>
        )}
        {setup && (
          <form
            className="mt-3 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await mfaVerify(setup.factorId, code);
                setSetup(null);
                setCode('');
                await load();
                toast(t('Two-factor sign-in is on'));
              } catch (x) {
                toast(authError(t, x), { tone: 'error' });
              } finally {
                setBusy(false);
              }
            }}
          >
            <p className="text-[12.5px] text-white/75">{t('1. Scan the code with your authenticator app. 2. Type the 6 digits it shows.')}</p>
            <div className="flex flex-wrap items-center gap-3">
              <img src={setup.qr} alt={t('QR code for the authenticator app')} className="h-[150px] w-[150px] rounded-[12px] bg-white p-2" />
              <p className="min-w-0 flex-1 text-[11.5px] text-white/65">
                {t('Cannot scan? Enter this key:')}
                <code dir="ltr" className="mt-1 block select-all break-all font-mono text-[12px] text-white/90">
                  {setup.secret}
                </code>
              </p>
            </div>
            <CodeInput value={code} onChange={setCode} />
            <div className="flex gap-2">
              <button type="submit" disabled={busy || code.length !== 6} className="lg-btn lg-btn-primary min-h-[38px] flex-1 text-[13px] disabled:opacity-60">
                {t('Confirm')}
              </button>
              <button type="button" onClick={() => (setSetup(null), setCode(''))} className="lg-btn lg-btn-ghost min-h-[38px] text-[13px]">
                {t('Cancel')}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* password */}
      <form
        className="space-y-2 rounded-[18px] bg-white/[0.07] p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (problem) return toast(t(problem), { tone: 'error' });
          try {
            await changePassword(pw);
            setPw('');
            toast(t('Password saved'));
          } catch (x: any) {
            toast(x?.code === 'reauthentication_needed' || /reauth/i.test(x?.message ?? '') ? t('Sign in again, then change the password.') : authError(t, x), { tone: 'error' });
          }
        }}
      >
        <p className="flex items-center gap-2 text-[14.5px] font-bold">
          <KeyRound size={16} /> {t('Password')}
        </p>
        <PasswordInput id="sec-pw" label={t('New password')} value={pw} onChange={setPw} auto="new-password" />
        <p className="text-[12px] text-white/65">{pw ? (problem ? t(problem) : t('Strong enough')) : t('12+ characters, letters and digits.')}</p>
        <button type="submit" disabled={!pw} className="lg-btn lg-btn-ghost min-h-[38px] text-[13px] disabled:opacity-50">
          {t('Change the password')}
        </button>
      </form>

      {/* sessions */}
      <div className="flex flex-wrap items-center gap-2 rounded-[18px] bg-white/[0.07] p-4">
        <MonitorSmartphone size={16} />
        <p className="min-w-0 flex-1 text-[13px] text-white/80">{t('Lost a device or used a shared computer? End every session, here and elsewhere.')}</p>
        <button
          type="button"
          className="lg-btn lg-btn-ghost min-h-[38px] text-[13px]"
          onClick={async () => {
            if (!window.confirm(t('Sign out on every device, including this one?'))) return;
            await signOutEverywhere();
          }}
        >
          <LogOut size={14} /> {t('Sign out everywhere')}
        </button>
      </div>
    </Pane>
  );
}
