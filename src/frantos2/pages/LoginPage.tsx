import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Fingerprint, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n';
import { go } from '../route';
import { useTheme } from '../glass/theme';
import { isLite } from '../glass/perf';
import { GlassLang, ThemeSwitch } from '../glass/kit';
import '../glass/glass.css';
import { changePassword, mfaStepUp, passwordProblem, sendPasswordReset, signInWithPassword, signOut, useAuth } from '../cloud/client';
import { authError, CodeInput, PasswordInput } from '../cloud/Security';

/** covers from the studio's own projects: they orbit the sign-in card */
const COVERS = [
  '/projects/stride/hero-sm.webp',
  '/projects/form-01/form-poster-sm.webp',
  '/projects/casa-arca/lobby-sm.webp',
  '/projects/ritual/bag-sm.webp',
  '/projects/halo/hero-sm.webp',
  '/series/after-hours/balcony-sm.webp',
  '/projects/nocturne/amber-sm.webp',
  '/projects/halo/launch-sm.webp',
  '/projects/ritual/poster-sm.webp',
  '/projects/casa-arca/pool-sm.webp',
  '/projects/stride/night-sm.webp',
  '/projects/maree/cobalt-sm.webp',
];

type Step = 'password' | 'forgot' | 'sent' | 'code' | 'newpw' | 'welcome';
const ease = [0.22, 1, 0.36, 1] as const;

/** A ring of project covers turning slowly in 3D, the FrantoS orbit. `burst` sends it rushing past the viewer. */
function Orbit({ burst, still }: { burst: boolean; still: boolean }) {
  const n = still ? 8 : COVERS.length;
  const step = 360 / n;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ perspective: 1400 }}>
      <motion.div
        className="absolute left-1/2 top-[56%] h-0 w-0 lg:left-[74%] lg:top-1/2"
        style={{ transformStyle: 'preserve-3d' }}
        initial={{ rotateX: -8, scale: 0.6, opacity: 0 }}
        animate={burst ? { scale: 2.6, opacity: 0, rotateX: -2 } : { scale: 1, opacity: 1, rotateX: -8 }}
        transition={burst ? { duration: 0.9, ease: [0.7, 0, 0.84, 0] } : { duration: 1.6, ease }}
      >
        <div className={still ? '' : 'login-orbit'} style={{ transformStyle: 'preserve-3d' }}>
          {COVERS.slice(0, n).map((src, i) => (
            <div
              key={src}
              className="absolute overflow-hidden rounded-[14px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]"
              style={{
                width: 168,
                height: 210,
                left: -84,
                top: -105,
                transform: `rotateY(${i * step}deg) translateZ(${still ? 470 : 560}px)`,
                backfaceVisibility: 'hidden',
              }}
            >
              <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/** The wordmark arrives as a light sweep reveals it, then a slow sheen keeps passing over it. */
function Logo({ still }: { theme: string; still: boolean }) {
  const { t } = useI18n();
  return (
    <div className="inline-block" style={{ filter: 'drop-shadow(0 10px 34px rgba(60,100,255,0.38))' }}>
    <motion.div
      className="relative inline-block overflow-hidden"
      initial={still ? false : { clipPath: 'inset(0 100% 0 0)' }}
      animate={{ clipPath: 'inset(0 0% 0 0)' }}
      transition={{ duration: 1.2, ease, delay: 0.2 }}
    >
      <span role="img" aria-label={t('FrantoS')} className="login-word block" style={{ height: 56, width: Math.round((56 * 337) / 96) }} />
      {!still && (
        <span className="login-word-mask absolute inset-0 overflow-hidden" aria-hidden>
          <span className="login-sheen absolute inset-0" />
        </span>
      )}
    </motion.div>
    </div>
  );
}

export function LoginPage({ next }: { next: string }) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const a = useAuth();
  const reduce = useReducedMotion();
  const still = !!reduce || isLite();
  const [step, setStep] = useState<Step>('password');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [code, setCode] = useState('');
  const [np, setNp] = useState('');
  const [np2, setNp2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const card = useAnimationControls();
  const left = useRef(false);

  // where the account stands decides the step: code first, then a password of their own, then in
  useEffect(() => {
    if (!a.ready || !a.session || left.current) return;
    if (a.needsCode) setStep('code');
    else if (a.mustChangePassword) setStep('newpw');
    else {
      left.current = true;
      setStep('welcome');
      window.setTimeout(() => go(next, { replace: true }), still ? 300 : 1250);
    }
  }, [a.ready, a.session, a.needsCode, a.mustChangePassword]); // eslint-disable-line react-hooks/exhaustive-deps

  const fail = (x: unknown) => {
    setErr(authError(t, x));
    if (!still) card.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.42 } });
  };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr('');
    try {
      await fn();
    } catch (x) {
      fail(x);
    } finally {
      setBusy(false);
    }
  };

  const title: Record<Step, string> = {
    password: t('Welcome back'),
    forgot: t('Reset the password'),
    sent: t('Check your inbox'),
    code: t('Enter the code'),
    newpw: t('Choose your own password'),
    welcome: t('Opening your studio'),
  };
  const problem = np ? passwordProblem(np, a.session?.user.email ?? email) : null;

  return (
    <main className={`lg login-stage relative min-h-[100dvh] overflow-hidden ${theme === 'light' ? 'login-light' : ''}`}>
      <Orbit burst={step === 'welcome'} still={still} />
      <div aria-hidden className="login-vignette pointer-events-none absolute inset-0" />

      {/* top bar */}
      <div className="relative z-10 flex items-center justify-between gap-2 p-4 sm:p-6">
        <button type="button" onClick={() => go('/')} className="lg-btn lg-btn-plain min-h-[40px] px-3 text-[13.5px]">
          <ArrowLeft size={16} className="rtl:-scale-x-100" /> {t('Home')}
        </button>
        <div className="flex items-center gap-1.5">
          <GlassLang />
          <ThemeSwitch />
        </div>
      </div>

      <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-88px)] w-full max-w-[1180px] content-center items-center gap-6 px-5 pb-10 lg:grid-cols-[1fr_440px] lg:gap-10">
        {/* the pitch */}
        <motion.section initial={still ? false : { opacity: 0, y: 24 }} animate={{ opacity: step === 'welcome' ? 0 : 1, y: 0 }} transition={{ duration: 0.9, ease, delay: 0.2 }} className="max-lg:text-center">
          <Logo theme={theme} still={still} />
          <p className="mt-8 text-[13px] font-bold uppercase tracking-[0.22em] text-[var(--lg-ink-3)] max-lg:mt-5 max-lg:text-[11px]">{t('Private Creative Workspace')}</p>
          <h1 className="mt-3 max-w-[560px] text-[clamp(28px,5vw,60px)] font-extrabold leading-[0.98] tracking-[-0.02em] max-lg:mx-auto">{t('Collect. Connect. Show.')}</h1>
          <p className="mt-4 max-w-[480px] text-[16px] leading-[1.55] text-[var(--lg-ink-2)] max-lg:hidden">{t('Your references, boards, 3D objects and stories — in one quiet place that only your team and your clients can open.')}</p>
          <ul className="mt-7 flex flex-wrap gap-2 max-lg:hidden">
            {[
              [Lock, t('Invitation only')],
              [ShieldCheck, t('Two-factor sign-in')],
              [Fingerprint, t('Your data, your access')],
            ].map(([Icon, label], i) => (
              <motion.li
                key={i}
                initial={still ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease, delay: 0.9 + i * 0.12 }}
                className="lg-glass flex min-h-[34px] items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold"
              >
                {React.createElement(Icon as typeof Lock, { size: 14 })} {label as string}
              </motion.li>
            ))}
          </ul>
        </motion.section>

        {/* the card */}
        <motion.div initial={still ? false : { opacity: 0, y: 40, scale: 0.96 }} animate={step === 'welcome' ? { opacity: 0, scale: 0.9, y: -10 } : { opacity: 1, y: 0, scale: 1 }} transition={{ duration: step === 'welcome' ? 0.5 : 0.9, ease, delay: step === 'welcome' ? 0 : 0.55 }}>
          <motion.div animate={card} className="lg-glass-strong relative rounded-[30px] p-6 sm:p-8" style={{ boxShadow: 'var(--lg-hi)' }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.28, ease }}>
                <div className="mb-5 flex items-center gap-3">
                  {step === 'password' ? (
                    <h2 className="flex items-center gap-[0.4em] whitespace-nowrap text-[clamp(17px,5vw,24px)] font-extrabold leading-tight">
                      {t('Welcome back to')}
                      <img src={theme === 'light' ? '/brand/wordmark-black.webp' : '/brand/wordmark-white.webp'} alt={t('FrantoS')} draggable={false} className="relative top-[0.04em] h-[1.12em] w-auto" />
                    </h2>
                  ) : (
                  <>
                  <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[var(--lg-fill-soft)]">
                    {step === 'code' ? <ShieldCheck size={20} /> : step === 'newpw' ? <KeyRound size={20} /> : <img src={theme === 'light' ? '/brand/mark-black.webp' : '/brand/mark-white.webp'} alt="" className="h-6 w-6" />}
                  </span>
                  <h2 className="text-[24px] font-extrabold leading-tight">{title[step]}</h2>
                  </>
                  )}
                </div>

                {step === 'password' && (
                  <form className="space-y-3.5" onSubmit={(e) => (e.preventDefault(), run(() => signInWithPassword(email, pw)))}>
                    <div>
                      <label className="lg-label" htmlFor="lp-email">
                        Email
                      </label>
                      <input id="lp-email" type="email" required autoFocus dir="ltr" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="lg-input mt-1 text-[15px]" placeholder="you@studio.com" />
                    </div>
                    <PasswordInput id="lp-pw" label={t('Password')} value={pw} onChange={setPw} auto="current-password" />
                    {err && (
                      <p role="alert" className="text-[13px] text-[var(--lg-danger,#ff9a8a)]">
                        {err}
                      </p>
                    )}
                    <button type="submit" disabled={busy} className="lg-btn lg-btn-primary min-h-[50px] w-full text-[15px] disabled:opacity-60">
                      {busy ? <span className="login-dots" aria-label={t('One moment…')} /> : t('Sign in')}
                    </button>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-1 text-[13px]">
                      <button type="button" onClick={() => (setStep('forgot'), setErr(''))} className="text-[var(--lg-ink-2)] underline-offset-4 hover:underline">
                        {t('Forgot the password?')}
                      </button>
                      <span className="text-[var(--lg-ink-3)]">{t('No sign-up: ask the admin')}</span>
                    </div>
                  </form>
                )}

                {step === 'forgot' && (
                  <form className="space-y-3.5" onSubmit={(e) => (e.preventDefault(), run(async () => (await sendPasswordReset(email), setStep('sent'))))}>
                    <p className="text-[14px] leading-[1.5] text-[var(--lg-ink-2)]">{t('Type your email and we will send a link to set a new password.')}</p>
                    <input aria-label="Email" type="email" required autoFocus dir="ltr" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="lg-input text-[15px]" placeholder="you@studio.com" />
                    {err && (
                      <p role="alert" className="text-[13px] text-[#ff9a8a]">
                        {err}
                      </p>
                    )}
                    <button type="submit" disabled={busy} className="lg-btn lg-btn-primary min-h-[50px] w-full disabled:opacity-60">
                      {t('Send a reset link')}
                    </button>
                    <button type="button" onClick={() => setStep('password')} className="w-full text-center text-[13px] text-[var(--lg-ink-2)] hover:underline">
                      {t('Back to sign in')}
                    </button>
                  </form>
                )}

                {step === 'sent' && (
                  <div className="space-y-4">
                    <p className="text-[14px] leading-[1.55] text-[var(--lg-ink-2)]">{t('If {email} has an account, a reset link is on its way. Open it on this device.', { email })}</p>
                    <button type="button" onClick={() => setStep('password')} className="lg-btn lg-btn-ghost min-h-[46px] w-full">
                      {t('Back to sign in')}
                    </button>
                  </div>
                )}

                {step === 'code' && (
                  <form className="space-y-3.5" onSubmit={(e) => (e.preventDefault(), run(() => mfaStepUp(code)))}>
                    <p className="text-[14px] leading-[1.5] text-[var(--lg-ink-2)]">{t('Open your authenticator app and type the 6-digit code for FrantoS.')}</p>
                    <CodeInput
                      value={code}
                      autoFocus
                      onChange={(v) => {
                        setCode(v);
                        if (v.length === 6 && !busy) run(() => mfaStepUp(v)).then(() => setCode(''));
                      }}
                    />
                    {err && (
                      <p role="alert" className="text-[13px] text-[#ff9a8a]">
                        {err}
                      </p>
                    )}
                    <button type="submit" disabled={busy || code.length !== 6} className="lg-btn lg-btn-primary min-h-[50px] w-full disabled:opacity-60">
                      {t('Continue')}
                    </button>
                    <button type="button" onClick={() => (signOut(), setStep('password'))} className="w-full text-center text-[13px] text-[var(--lg-ink-2)] hover:underline">
                      {t('Use another account')}
                    </button>
                  </form>
                )}

                {step === 'newpw' && (
                  <form
                    className="space-y-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (problem) return fail({ message: '' }), setErr(t(problem));
                      if (np !== np2) return fail({ message: '' }), setErr(t('The two passwords differ.'));
                      run(() => changePassword(np));
                    }}
                  >
                    <p className="text-[13.5px] leading-[1.5] text-[var(--lg-ink-2)]">{t('You signed in with a temporary password from the admin. Replace it with one only you know.')}</p>
                    <PasswordInput id="lp-np" label={t('New password')} value={np} onChange={setNp} auto="new-password" />
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--lg-fill-soft)]" aria-hidden>
                      <motion.div className="h-full rounded-full" animate={{ width: `${Math.min(100, (np.length / 16) * 100)}%`, background: problem || !np ? '#ff9a6b' : '#7fe0a1' }} transition={{ duration: 0.25 }} />
                    </div>
                    <p className="text-[12px] text-[var(--lg-ink-3)]">{np ? (problem ? t(problem) : t('Strong enough')) : t('12+ characters, letters and digits.')}</p>
                    <PasswordInput id="lp-np2" label={t('Repeat it')} value={np2} onChange={setNp2} auto="new-password" />
                    {err && (
                      <p role="alert" className="text-[13px] text-[#ff9a8a]">
                        {err}
                      </p>
                    )}
                    <button type="submit" disabled={busy} className="lg-btn lg-btn-primary min-h-[50px] w-full disabled:opacity-60">
                      {t('Save and continue')}
                    </button>
                  </form>
                )}

                {step === 'welcome' && <p className="text-[14px] text-[var(--lg-ink-2)]">{t('One moment…')}</p>}
              </motion.div>
            </AnimatePresence>
          </motion.div>
          <p className="mt-4 text-center text-[11.5px] text-[var(--lg-ink-3)]">{t('Protected connection · sessions you can end from Settings')}</p>
        </motion.div>
      </div>

      {/* the welcome flash: the mark grows from the centre as the orbit rushes past */}
      <AnimatePresence>
        {step === 'welcome' && (
          <motion.div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <motion.img src="/brand/mark-gradient.webp" alt="" className="h-[96px] w-[96px] rounded-[26px]" initial={{ scale: 0.4, rotate: -40 }} animate={{ scale: [0.4, 1.1, 1], rotate: 0 }} transition={{ duration: 0.8, ease }} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
