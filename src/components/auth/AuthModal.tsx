import React, { useState } from 'react';
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

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0F1218] border border-black/10 dark:border-white/15 p-6 text-[#111317] dark:text-white shadow-2xl space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h3 className="font-display font-bold text-lg text-[#111317] dark:text-white">Studio Identity & Vault</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Tab selector */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs font-mono">
          <button
            onClick={() => setMode('demo')}
            className={`py-2 rounded-xl transition-colors cursor-pointer ${
              mode === 'demo' ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-bold' : 'text-[#4A505C] dark:text-zinc-400'
            }`}
          >
            Demo Personas
          </button>
          <button
            onClick={() => setMode('supabase')}
            className={`py-2 rounded-xl transition-colors cursor-pointer ${
              mode === 'supabase' ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-bold' : 'text-[#4A505C] dark:text-zinc-400'
            }`}
          >
            Supabase Config
          </button>
        </div>

        {mode === 'demo' ? (
          <div className="space-y-3">
            <p className="text-xs text-[#4A505C] dark:text-zinc-400">
              Select an instant studio persona with verified discipline badges and portfolio exhibits:
            </p>
            <div className="space-y-2">
              {CREATOR_PROFILES.map((prof) => (
                <button
                  key={prof.id}
                  onClick={() => {
                    onSelectProfile(prof);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                    activeProfile.id === prof.id
                      ? 'bg-black/10 dark:bg-white/15 border-cyan-500/80 shadow-md'
                      : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img src={prof.avatar} alt={prof.name} className="w-10 h-10 rounded-full object-cover" />
                    <div className="text-left">
                      <div className="text-xs font-semibold text-[#111317] dark:text-white">{prof.name}</div>
                      <div className="text-[11px] text-[#4A505C] dark:text-zinc-400 font-mono">{prof.role}</div>
                    </div>
                  </div>
                  {activeProfile.id === prof.id && <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSimulateLogin} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] font-mono text-cyan-800 dark:text-cyan-300 leading-relaxed font-semibold">
              Supabase Architecture Ready: Connect credentials in Settings to sync with your PostgreSQL cloud instance.
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#4A505C] dark:text-zinc-400 mb-1 font-semibold">Studio Email</label>
              <input
                type="email"
                placeholder="designer@frantos.studio"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#111317] dark:text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#4A505C] dark:text-zinc-400 mb-1 font-semibold">Vault Key / Password</label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-[#111317] dark:text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            {statusMsg && (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-mono text-center font-semibold">{statusMsg}</div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-colors cursor-pointer shadow-md"
            >
              Sign In to Private Workspace
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
