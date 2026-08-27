import React, { useState, useEffect } from 'react';

export const Footer: React.FC = () => {
  const [timeUtc, setTimeUtc] = useState('');
  const [timeLocal, setTimeLocal] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeUtc(now.toUTCString().split(' ')[4] + ' UTC');
      setTimeLocal(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer 
      id="frantos-studio-footer"
      className="w-full mt-24 border-t border-black/10 dark:border-white/10 bg-[#EFECE6] dark:bg-[#07090C] text-[#4A505C] dark:text-[#A0A6B2] transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Col 1: Brand & Philosophy */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-xl tracking-[0.2em] text-[#111317] dark:text-[#F3F1EC]">
                FRANTOS
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-cyan-700 dark:text-cyan-400 font-semibold">
                PRO EDITION
              </span>
            </div>
            <p className="text-xs max-w-md leading-relaxed text-[#4A505C] dark:text-[#A0A6B2]">
              A digital creative studio, living 3D archive, and private workspace for motion designers, 
              3D artists, spatial UI architects, and creative teams. Built around spatial materials and real-time storytelling.
            </p>
          </div>

          {/* Col 2: Studio Manifest */}
          <div className="space-y-2 font-mono text-xs">
            <div className="text-[11px] uppercase tracking-wider text-zinc-900 dark:text-zinc-300 font-bold mb-2">
              Studio Manifest
            </div>
            <div>01 // Material Integrity</div>
            <div>02 // Spatial Depth over Flatness</div>
            <div>03 // Real-Time Generative Light</div>
            <div>04 // Non-Destructive Process</div>
          </div>

          {/* Col 3: Live Coordinates & Pipeline */}
          <div className="space-y-2 font-mono text-xs">
            <div className="text-[11px] uppercase tracking-wider text-zinc-900 dark:text-zinc-300 font-bold mb-2">
              Live Telemetry
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              <span>Studio Clock: {timeLocal || 'Loading...'}</span>
            </div>
            <div className="text-zinc-600 dark:text-zinc-500">Universal: {timeUtc}</div>
            <div className="text-zinc-600 dark:text-zinc-500">Pipeline: Three.js WebGL 2.0</div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
          <div className="text-zinc-600 dark:text-zinc-500">
            © 2026 FRANTOS STUDIO LABS. ALL ARTIFACTS RESERVED.
          </div>
          <div className="flex items-center gap-4 text-zinc-600 dark:text-zinc-400">
            <span>DISCIPLINES: 06</span>
            <span>•</span>
            <span>SHADERS: GLSL 3.0</span>
            <span>•</span>
            <span>NATIVE CURSOR: ENABLED</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
