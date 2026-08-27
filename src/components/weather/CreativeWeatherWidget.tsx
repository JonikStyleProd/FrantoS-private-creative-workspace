import React, { useState, useEffect, useRef } from 'react';
import { CreativeWeatherState } from '../../types';
import { 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Activity, 
  SunMedium, 
  Wind,
  Sliders,
  Check
} from 'lucide-react';
import { INITIAL_WEATHER_STATE } from '../../data/mockData';

export const CreativeWeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<CreativeWeatherState>(INITIAL_WEATHER_STATE);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeFrequency, setActiveFrequency] = useState(432);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const weatherPresets: {
    id: string;
    title: string;
    flowState: string;
    pressure: string;
    colorIndex: string;
    sonicProfile: string;
    freq: number;
    colorPalette: string[];
  }[] = [
    {
      id: 'chrono-flow',
      title: 'Chrono-Kinetic Flow',
      flowState: 'Peak Hyper-Focus',
      pressure: 'High Creative Density (1024 hPa)',
      colorIndex: 'Spectral Prism (99.4%)',
      sonicProfile: '432Hz Harmonic Sine Wave',
      freq: 432,
      colorPalette: ['#06B6D4', '#F43F5E', '#8B5CF6', '#10B981'],
    },
    {
      id: 'caustic-solitude',
      title: 'Deep Caustic Solitude',
      flowState: 'Subconscious Theta Stream',
      pressure: 'Atmospheric Stillness (1008 hPa)',
      colorIndex: 'Deep Obsidian & Cyan (94.2%)',
      sonicProfile: '528Hz Theta Binaural Carrier',
      freq: 528,
      colorPalette: ['#0284C7', '#0F172A', '#38BDF8', '#6366F1'],
    },
    {
      id: 'specular-velocity',
      title: 'Neon Specular Velocity',
      flowState: 'High-Cadence Rapid Iteration',
      pressure: 'Exploration Burst (1032 hPa)',
      colorIndex: 'Ultraviolet & Amber (98.7%)',
      sonicProfile: '639Hz Gamma Harmonic Tone',
      freq: 639,
      colorPalette: ['#F59E0B', '#EC4899', '#8B5CF6', '#10B981'],
    },
    {
      id: 'organic-stillness',
      title: 'Organic Ambient Stillness',
      flowState: 'Gentle Creative Drift',
      pressure: 'Restorative Low Friction (1002 hPa)',
      colorIndex: 'Warm Paper & Forest (92.0%)',
      sonicProfile: '174Hz Grounding Resonance',
      freq: 174,
      colorPalette: ['#10B981', '#F59E0B', '#78716C', '#06B6D4'],
    },
  ];

  const handleSelectPreset = (preset: typeof weatherPresets[0]) => {
    setWeather((prev) => ({
      ...prev,
      flowState: preset.flowState,
      pressure: preset.pressure,
      colorIndex: preset.colorIndex,
      sonicProfile: preset.sonicProfile,
      activeAmbience: isPlayingAudio,
    }));
    setActiveFrequency(preset.freq);

    if (isPlayingAudio && oscRef.current && audioCtxRef.current) {
      try {
        oscRef.current.frequency.setTargetAtTime(preset.freq, audioCtxRef.current.currentTime, 0.2);
      } catch {}
    }
  };

  // Web Audio generative ambient synthesizer
  const toggleSonicAmbience = () => {
    if (isPlayingAudio) {
      if (oscRef.current) {
        try {
          oscRef.current.stop();
          oscRef.current.disconnect();
        } catch {}
      }
      setIsPlayingAudio(false);
      setWeather((prev) => ({ ...prev, activeAmbience: false }));
    } else {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(activeFrequency, ctx.currentTime);

        gain.gain.setValueAtTime(0.01, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        oscRef.current = osc;
        gainRef.current = gain;

        setIsPlayingAudio(true);
        setWeather((prev) => ({ ...prev, activeAmbience: true }));
      } catch (err) {
        console.warn('Audio context init prevented by browser policy', err);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (oscRef.current) {
        try {
          oscRef.current.stop();
        } catch {}
      }
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch {}
      }
    };
  }, []);

  return (
    <section 
      id="frantos-weather-section"
      className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 animate-in fade-in duration-300"
      aria-label="FrantoS Atmospheric Creative Weather"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">
              Atmospheric Index // Studio Meteorology
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-[#111317] dark:text-[#F3F1EC]">
            CREATIVE WEATHER & AMBIENCE
          </h2>
          <p className="text-xs sm:text-sm text-[#4A505C] dark:text-[#A0A6B2] max-w-xl mt-1">
            Real-time biometric flow metrics, spectral light indices, and generative acoustic resonance for deep focus.
          </p>
        </div>

        <button
          onClick={toggleSonicAmbience}
          className={`px-4 py-2.5 rounded-full text-xs font-mono font-semibold transition-all flex items-center gap-2 shadow-md cursor-pointer ${
            isPlayingAudio
              ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
              : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-[#111317] dark:text-white border border-black/10 dark:border-white/10'
          }`}
        >
          {isPlayingAudio ? <Volume2 className="w-4 h-4 animate-pulse text-white" /> : <VolumeX className="w-4 h-4" />}
          <span>{isPlayingAudio ? `Mute ${activeFrequency}Hz Drone` : `Synthesize ${activeFrequency}Hz Drone`}</span>
        </button>
      </div>

      {/* Preset Weather Selector Strip */}
      <div className="mb-6 p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-mono text-[#4A505C] dark:text-zinc-400">
          <Sliders className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-semibold uppercase tracking-wider">Atmospheric Mode:</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {weatherPresets.map((p) => {
            const isCurrent = weather.sonicProfile.includes(`${p.freq}Hz`) || weather.flowState === p.flowState;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isCurrent
                    ? 'bg-amber-500 text-black font-bold shadow-sm'
                    : 'bg-white dark:bg-[#12151C] border border-black/10 dark:border-white/10 text-[#4A505C] dark:text-zinc-300 hover:border-amber-500/40'
                }`}
              >
                {isCurrent && <Check className="w-3 h-3 text-black" />}
                <span>{p.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Weather Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Flow State */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0F1218] border border-black/10 dark:border-white/10 shadow-lg space-y-4 frantos-animated-frame">
          <div className="flex items-center justify-between text-[#4A505C] dark:text-zinc-400">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Flow Potential</span>
            <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <div className="text-xl font-display font-bold text-[#111317] dark:text-white tracking-tight">
              {weather.flowState}
            </div>
            <p className="text-xs text-[#4A505C] dark:text-zinc-400 mt-1">
              Cognitive friction index: 0.04 (Optimal)
            </p>
          </div>
          <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-500 rounded-full w-[96%]" />
          </div>
        </div>

        {/* Card 2: Creative Pressure */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0F1218] border border-black/10 dark:border-white/10 shadow-lg space-y-4 frantos-animated-frame">
          <div className="flex items-center justify-between text-[#4A505C] dark:text-zinc-400">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Atmospheric Pressure</span>
            <Wind className="w-4 h-4 text-rose-500 dark:text-rose-400" />
          </div>
          <div>
            <div className="text-xl font-display font-bold text-[#111317] dark:text-white tracking-tight">
              {weather.pressure}
            </div>
            <p className="text-xs text-[#4A505C] dark:text-zinc-400 mt-1">
              High density creative output zone
            </p>
          </div>
          <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full w-[88%]" />
          </div>
        </div>

        {/* Card 3: Color Spectrum */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0F1218] border border-black/10 dark:border-white/10 shadow-lg space-y-4 frantos-animated-frame">
          <div className="flex items-center justify-between text-[#4A505C] dark:text-zinc-400">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Color Index</span>
            <SunMedium className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <div>
            <div className="text-xl font-display font-bold text-[#111317] dark:text-white tracking-tight truncate">
              {weather.colorIndex}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-4 h-4 rounded-full bg-cyan-400 shadow-sm" />
              <span className="w-4 h-4 rounded-full bg-rose-500 shadow-sm" />
              <span className="w-4 h-4 rounded-full bg-purple-500 shadow-sm" />
              <span className="w-4 h-4 rounded-full bg-amber-400 shadow-sm" />
            </div>
          </div>
        </div>

        {/* Card 4: Sonic Ambience */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0F1218] border border-black/10 dark:border-white/10 shadow-lg space-y-4 frantos-animated-frame">
          <div className="flex items-center justify-between text-[#4A505C] dark:text-zinc-400">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Sonic Profile</span>
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="text-lg font-display font-bold text-[#111317] dark:text-white tracking-tight">
              {weather.sonicProfile}
            </div>
            <p className="text-xs text-[#4A505C] dark:text-zinc-400 mt-1">
              {isPlayingAudio ? 'Active generative binaural carrier' : 'Audio engine idle'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            <span className={`w-2 h-2 rounded-full ${isPlayingAudio ? 'bg-emerald-500 animate-ping' : 'bg-zinc-400 dark:bg-zinc-600'}`} />
            <span>{isPlayingAudio ? 'BINAURAL SYNTH ONLINE' : 'CLICK TO SYNTHESIZE'}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
