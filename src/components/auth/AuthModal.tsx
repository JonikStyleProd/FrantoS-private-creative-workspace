import React, { useState, useEffect } from 'react';
import { X, Check, ShieldCheck } from 'lucide-react';
import { CreatorProfile } from '../../types';
import { CREATOR_PROFILES } from '../../data/mockData';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfile: CreatorProfile;
  onSelectProfile: (profile: CreatorProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  activeProfile,
  onSelectProfile,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'demo' | 'supabase'>('demo');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handlePopState = () => {
      onClose();
    };

    window.history.pushState({ modal: 'studio-auth-vault' }, '');
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSimulateLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg('Demo Session verified with local workspace persistence.');
    setTimeout(() => {
      setStatusMsg('');
      onClose();
    }, 1200);
  };

  return (
    <div 
      id="auth-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 box-border animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div 
        id="auth-modal-card"
        className="w-full max-w-[420px] max-h-[calc(100dvh-24px)] rounded-3xl bg-[#F8F7F4] dark:bg-[#11141A] border border-black/10 dark:border-white/15 p-4 sm:p-5 text-[#111317] dark:text-white shadow-2xl flex flex-col box-border min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3 mb-3 gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-5 h-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
            <h3 id="auth-modal-title" className="font-display font-bold text-sm sm:text-base text-[#111317] dark:text-white truncate">
              Studio Identity & Vault
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="min-w-[36px] min-h-[36px] p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white cursor-pointer flex items-center justify-center flex-shrink-0 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab selector */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs font-mono mb-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => setMode('demo')}
            className={`py-1.5 sm:py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              mode === 'demo' ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-bold shadow-xs' : 'text-[#4A505C] dark:text-zinc-400'
            }`}
          >
            Demo Personas
          </button>
          <button
            type="button"
            onClick={() => setMode('supabase')}
            className={`py-1.5 sm:py-2 rounded-xl transition-colors cursor-pointer text-xs ${
              mode === 'supabase' ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-bold shadow-xs' : 'text-[#4A505C] dark:text-zinc-400'
            }`}
          >
            Supabase Config
          </button>
        </div>

        {/* Modal Body: Static, Clean, Responsive */}
        <div className="min-w-0 flex-1 min-h-0">
          {mode === 'demo' ? (
            <div className="space-y-2">
              <p className="text-[11px] text-[#4A505C] dark:text-zinc-400 font-medium">
                Select a verified studio persona:
              </p>
              <div className="space-y-1.5">
                {CREATOR_PROFILES.map((prof) => {
                  const isCurrent = activeProfile.id === prof.id;
                  return (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => {
                        onSelectProfile(prof);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between p-2 sm:p-2.5 rounded-2xl border transition-all cursor-pointer min-h-[44px] ${
                        isCurrent
                          ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-800 dark:text-cyan-200 shadow-xs'
                          : 'bg-black/[0.03] dark:bg-white/[0.03] border-black/5 dark:border-white/5 hover:border-black/15 dark:hover:border-white/15 text-[#111317] dark:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img 
                          src={prof.avatar} 
                          alt={prof.name} 
                          className="w-8 h-8 rounded-full aspect-square object-cover flex-shrink-0" 
                        />
                        <div className="text-left min-w-0">
                          <div className="text-xs font-semibold truncate">{prof.name}</div>
                          <div className="text-[10px] text-[#4A505C] dark:text-zinc-400 font-mono truncate">{prof.role}</div>
                        </div>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSimulateLogin} className="space-y-2.5">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[10px] sm:text-[11px] font-mono text-cyan-800 dark:text-cyan-300 leading-relaxed font-semibold">
                Supabase Architecture Ready: Cloud credentials sync directly with PostgreSQL.
              </div>

              <div>
                <label className="block text-[10px] font-mono text-[#4A505C] dark:text-zinc-400 mb-1 font-semibold">
                  Studio Email
                </label>
                <input
                  type="email"
                  placeholder="designer@frantos.studio"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#111317] dark:text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-[#4A505C] dark:text-zinc-400 mb-1 font-semibold">
                  Vault Key / Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#111317] dark:text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              {statusMsg && (
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono text-center font-semibold">
                  {statusMsg}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-colors cursor-pointer shadow-sm min-h-[40px] mt-1"
              >
                Sign In to Private Workspace
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
