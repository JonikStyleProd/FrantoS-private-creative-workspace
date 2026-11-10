import React, { useEffect } from 'react';
import { go } from '../route';
import { useAuth } from './client';

/**
 * Pages behind the sign-in. Until the account is fully in (password, 2FA code, own password) the visitor
 * is sent to #/login with the page they wanted, and nothing of the page renders meanwhile.
 */
export default function AuthGate({ hash, children }: { hash: string; children: React.ReactNode }) {
  const a = useAuth();
  const inside = a.ready && !!a.session && !a.needsCode && !a.mustChangePassword;
  useEffect(() => {
    if (a.ready && !inside) go(`/login?next=${encodeURIComponent(hash.replace(/^#/, '') || '/app')}`, { replace: true });
  }, [a.ready, inside, hash]);
  if (!inside) return <div className="fixed inset-0" style={{ background: document.documentElement.dataset.theme === 'light' ? '#f3f1ec' : '#0d1014' }} />;
  return <>{children}</>;
}
