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
import { useLanguage } from '../../i18n/LanguageContext';

export const CreativeWeatherWidget: React.FC = () => {
  const { t, language } = useLanguage();
  const [weather, setWeather] = useState<CreativeWeatherState>(INITIAL_WEATHER_STATE);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeFrequency, setActiveFrequency] = useState(432);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const weatherPresets = [
    {
      id: 'chrono-flow',
      title: t.atmosphere.presets.chronoFlow,
      flowState: t.atmosphere.presets.chronoDesc,
      pressure: language === 'ru' ? 'Высокая плотность (1024 гПа)' : 'High Density (1024 hPa)',
      colorIndex: language === 'ru' ? 'Спектральная призма (99.4%)' : 'Spectral Prism (99.4%)',
      sonicProfile: `${432} ${language === 'ru' ? 'Гц · Гармонический тон' : 'Hz · Harmonic Sine Wave'}`,
      freq: 432,
    },
    {
      id: 'caustic-solitude',
      title: t.atmosphere.presets.causticSolitude,
      flowState: t.atmosphere.presets.causticDesc,
      pressure: language === 'ru' ? 'Атмосферный штиль (1008 гПа)' : 'Atmospheric Stillness (1008 hPa)',
      colorIndex: language === 'ru' ? 'Обсидиан и ультрамарин (94.2%)' : 'Deep Obsidian & Ultramarine (94.2%)',
      sonicProfile: `${528} ${language === 'ru' ? 'Гц · Бинауральный резонанс' : 'Hz · Binaural Resonance'}`,
      freq: 528,
    },
    {
      id: 'specular-velocity',
      title: t.atmosphere.presets.specularVelocity,
      flowState: t.atmosphere.presets.specularDesc,
      pressure: language === 'ru' ? 'Всплеск идей (1032 гПа)' : 'Exploration Burst (1032 hPa)',
      colorIndex: language === 'ru' ? 'Ультрафиолет и янтарь (98.7%)' : 'Ultraviolet & Amber (98.7%)',
      sonicProfile: `${639} ${language === 'ru' ? 'Гц · Гамма-гармоника' : 'Hz · Gamma Harmonic Tone'}`,
      freq: 639,
    },
    {
      id: 'organic-stillness',
      title: t.atmosphere.presets.organicStillness,
      flowState: t.atmosphere.presets.organicDesc,
      pressure: language === 'ru' ? 'Минимальное трение (1002 гПа)' : 'Restorative Low Friction (1002 hPa)',
      colorIndex: language === 'ru' ? 'Хлопковая бумага и графит (92.0%)' : 'Warm Paper & Graphite (92.0%)',
      sonicProfile: `${174} ${language === 'ru' ? 'Гц · Базовый резонанс' : 'Hz · Grounding Resonance'}`,
      freq: 174,
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
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-in fade-in duration-300"
      aria-label={t.atmosphere.title}
    >
      {/* Editorial Masthead */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 border-b border-black/8 dark:border-white/8 pb-8">
        <div className="min-w-0 max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-ultramarine animate-pulse flex-shrink-0" />
            <span className="font-mono text-xs uppercase tracking-widest text-ultramarine font-semibold">
              {t.atmosphere.badge}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-extrabold tracking-tight text-[#111317] dark:text-[#F5F3EF] leading-snug">
            {t.atmosphere.title}
          </h2>
          <p className="text-xs sm:text-sm text-[#52555F] dark:text-[#A3A099] mt-2 leading-relaxed">
            {t.atmosphere.subtitle}
          </p>
        </div>

        {/* Audio Synthesizer Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSonicAmbience}
            className={`min-h-[48px] px-6 py-3 rounded-full text-xs font-mono font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer touch-manipulation shadow-lg ${
              isPlayingAudio
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/25 ring-2 ring-rose-400'
                : 'bg-ultramarine hover:bg-ultramarine/90 text-white shadow-ultramarine/25 active:scale-95'
            }`}
            aria-pressed={isPlayingAudio}
          >
            {isPlayingAudio ? (
              <>
                <Volume2 className="w-4 h-4 animate-pulse" />
                <span>{t.atmosphere.muteTone} ({activeFrequency} {language === 'ru' ? 'Гц' : 'Hz'})</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4" />
                <span>{t.atmosphere.synthesizeTone} {activeFrequency} {language === 'ru' ? 'Гц' : 'Hz'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preset Weather Selector Strip */}
      <div className="mb-8 p-3 sm:p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/8 dark:border-white/8 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-mono text-[#52555F] dark:text-[#A3A099]">
          <Sliders className="w-3.5 h-3.5 text-ultramarine" />
          <span className="font-semibold uppercase tracking-wider">{t.atmosphere.ambientMode}</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {weatherPresets.map((p) => {
            const isCurrent = activeFrequency === p.freq;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-mono transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap touch-manipulation ${
                  isCurrent
                    ? 'bg-ultramarine text-white font-bold shadow-md shadow-ultramarine/20'
                    : 'bg-white dark:bg-[#12151C] border border-black/10 dark:border-white/10 text-[#52555F] dark:text-[#A3A099] hover:text-[#121316] dark:hover:text-white hover:border-ultramarine/40'
                }`}
              >
                {isCurrent && <Check className="w-3.5 h-3.5 text-white" />}
                <span>{p.title}</span>
                <span className="opacity-60 text-[10px]">({p.freq} {language === 'ru' ? 'Гц' : 'Hz'})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Flow State */}
        <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#0E1015]/90 border border-black/8 dark:border-white/8 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-[#52555F] dark:text-[#A3A099]">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">{t.atmosphere.flowPotential}</span>
            <Activity className="w-4 h-4 text-ultramarine" />
          </div>
          <div>
            <div className="text-xl font-display font-bold text-[#111317] dark:text-[#F5F3EF] tracking-tight">
              {weather.flowState}
            </div>
            <p className="text-xs text-[#52555F] dark:text-[#A3A099] mt-1 font-mono">
              {t.atmosphere.flowFriction}
            </p>
          </div>
          <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-ultramarine rounded-full w-[96%]" />
          </div>
        </div>

        {/* Card 2: Creative Pressure */}
        <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#0E1015]/90 border border-black/8 dark:border-white/8 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-[#52555F] dark:text-[#A3A099]">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">{t.atmosphere.creativePressure}</span>
            <Wind className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <div className="text-xl font-display font-bold text-[#111317] dark:text-[#F5F3EF] tracking-tight">
              {weather.pressure}
            </div>
            <p className="text-xs text-[#52555F] dark:text-[#A3A099] mt-1 font-mono">
              {t.atmosphere.creativeZone}
            </p>
          </div>
          <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full w-[88%]" />
          </div>
        </div>

        {/* Card 3: Color Spectrum */}
        <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#0E1015]/90 border border-black/8 dark:border-white/8 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-[#52555F] dark:text-[#A3A099]">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">{t.atmosphere.opticalSpectrum}</span>
            <SunMedium className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-xl font-display font-bold text-[#111317] dark:text-[#F5F3EF] tracking-tight truncate">
              {weather.colorIndex}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-3.5 h-3.5 rounded-full bg-ultramarine shadow-xs" />
              <span className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-xs" />
              <span className="w-3.5 h-3.5 rounded-full bg-indigo-500 shadow-xs" />
              <span className="w-3.5 h-3.5 rounded-full bg-amber-400 shadow-xs" />
            </div>
          </div>
        </div>

        {/* Card 4: Sonic Ambience */}
        <div className="p-6 rounded-3xl bg-white/90 dark:bg-[#0E1015]/90 border border-black/8 dark:border-white/8 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-[#52555F] dark:text-[#A3A099]">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">{t.atmosphere.acousticProfile}</span>
            <Sparkles className="w-4 h-4 text-ultramarine" />
          </div>
          <div>
            <div className="text-lg font-display font-bold text-[#111317] dark:text-[#F5F3EF] tracking-tight">
              {weather.sonicProfile}
            </div>
            <p className="text-xs text-[#52555F] dark:text-[#A3A099] mt-1 font-mono">
              {isPlayingAudio ? (language === 'ru' ? 'Генерация активна' : 'Harmonic synthesis active') : (language === 'ru' ? 'Генератор в режиме ожидания' : 'Synthesizer idle')}
            </p>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-ultramarine font-semibold">
            <span className={`w-2 h-2 rounded-full ${isPlayingAudio ? 'bg-ultramarine animate-ping' : 'bg-zinc-500'}`} />
            <span>{isPlayingAudio ? t.atmosphere.synthActive : t.atmosphere.synthIdle}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
