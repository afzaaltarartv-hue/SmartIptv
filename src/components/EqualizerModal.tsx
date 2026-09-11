import React from 'react';
import { 
  Sliders, 
  Volume2, 
  RotateCcw, 
  Sparkles, 
  X, 
  Check, 
  Zap, 
  Headphones, 
  VolumeX,
  Radio
} from 'lucide-react';
import { AudioEqualizerSettings } from '../types';
import { EQ_PRESETS, audioEngine } from '../services/audioEngine';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AudioEqualizerSettings;
  onChange: (newSettings: AudioEqualizerSettings) => void;
}

export const EqualizerModal: React.FC<EqualizerModalProps> = ({
  isOpen,
  onClose,
  settings,
  onChange,
}) => {
  if (!isOpen) return null;

  const handleToggle = () => {
    const updated = { ...settings, enabled: !settings.enabled };
    onChange(updated);
    audioEngine.applySettings(updated);
  };

  const handlePreset = (presetKey: AudioEqualizerSettings['preset']) => {
    const presetValues = EQ_PRESETS[presetKey] || EQ_PRESETS.flat;
    const updated: AudioEqualizerSettings = {
      ...settings,
      ...presetValues,
      preset: presetKey,
      enabled: true,
    };
    onChange(updated);
    audioEngine.applySettings(updated);
  };

  const handleBandChange = (band: keyof AudioEqualizerSettings, value: number) => {
    const updated = {
      ...settings,
      [band]: value,
      preset: 'custom' as const,
      enabled: true,
    };
    onChange(updated);
    audioEngine.applySettings(updated);
  };

  const handleReset = () => {
    handlePreset('flat');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl rounded-2xl border border-white/15 bg-zinc-950 p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6 pr-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-black">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                High-Fidelity Audio Equalizer
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                  Hi-Fi
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Precision 5-band sound tuning, preamp booster, and vocal enhancer
              </p>
            </div>
          </div>

          {/* Master Enable Toggle */}
          <button
            onClick={handleToggle}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
              settings.enabled
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <Zap className={`h-3 w-3 ${settings.enabled ? 'fill-current' : ''}`} />
            {settings.enabled ? 'Active' : 'Bypassed'}
          </button>
        </div>

        {/* Presets Bar */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-zinc-400 mb-2">
            Sound Presets
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {[
              { id: 'flat', label: 'Flat / Studio' },
              { id: 'bass', label: 'Bass Boost' },
              { id: 'vocal', label: 'Dialogue Clear' },
              { id: 'cinema', label: 'Movie Cinema' },
              { id: 'night', label: 'Night Mode' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handlePreset(p.id as AudioEqualizerSettings['preset'])}
                className={`rounded-lg py-2 px-2 text-center text-xs font-medium transition-all ${
                  settings.preset === p.id && settings.enabled
                    ? 'bg-white/20 text-amber-400 border border-amber-500/50 font-bold'
                    : 'border border-white/5 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Boost Controls: Preamp Volume & Bass / Vocal Enhance */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {/* Preamp Booster (0.5x to 2.5x) */}
          <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-3">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-semibold text-zinc-300">Preamp Boost</span>
              <span className="font-mono text-amber-400 font-bold">
                {Math.round(settings.preampGain * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.2"
              step="0.05"
              value={settings.preampGain}
              onChange={(e) => handleBandChange('preampGain', parseFloat(e.target.value))}
              className="w-full accent-amber-500 h-1 bg-zinc-700 rounded-lg cursor-pointer"
            />
            <p className="text-[10px] text-zinc-500 mt-1">Boost quiet IPTV streams</p>
          </div>

          {/* Bass Enhancer */}
          <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-3">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-semibold text-zinc-300">Bass Shelf</span>
              <span className="font-mono text-amber-400 font-bold">
                {settings.bassGain > 0 ? `+${settings.bassGain}` : settings.bassGain} dB
              </span>
            </div>
            <input
              type="range"
              min="-6"
              max="12"
              step="1"
              value={settings.bassGain}
              onChange={(e) => handleBandChange('bassGain', parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 h-1 bg-zinc-700 rounded-lg cursor-pointer"
            />
            <p className="text-[10px] text-zinc-500 mt-1">Punch & low-end depth</p>
          </div>

          {/* Vocal / Speech Enhancer */}
          <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-3">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-semibold text-zinc-300">Vocal Clarity</span>
              <span className="font-mono text-amber-400 font-bold">
                {settings.vocalGain > 0 ? `+${settings.vocalGain}` : settings.vocalGain} dB
              </span>
            </div>
            <input
              type="range"
              min="-6"
              max="10"
              step="1"
              value={settings.vocalGain}
              onChange={(e) => handleBandChange('vocalGain', parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 h-1 bg-zinc-700 rounded-lg cursor-pointer"
            />
            <p className="text-[10px] text-zinc-500 mt-1">Dialogue & speech focus</p>
          </div>
        </div>

        {/* 5-Band Graphic Equalizer Faders */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 mb-5">
          <div className="text-xs font-semibold text-zinc-400 mb-4 flex justify-between">
            <span>5-Band Graphic Frequency Faders</span>
            <span className="text-[11px] text-zinc-500">-12dB to +12dB</span>
          </div>

          <div className="grid grid-cols-5 gap-2 text-center">
            {[
              { key: 'band60Hz', label: '60 Hz', sub: 'Sub' },
              { key: 'band230Hz', label: '230 Hz', sub: 'Bass' },
              { key: 'band910Hz', label: '910 Hz', sub: 'Mids' },
              { key: 'band3600Hz', label: '3.6 kHz', sub: 'Presence' },
              { key: 'band14000Hz', label: '14 kHz', sub: 'Treble' },
            ].map((b) => {
              const val = settings[b.key as keyof AudioEqualizerSettings] as number;
              return (
                <div key={b.key} className="flex flex-col items-center">
                  <span className="text-[11px] font-mono font-bold text-amber-400 mb-2">
                    {val > 0 ? `+${val}` : val}
                  </span>
                  {/* Vertical Slider */}
                  <div className="h-28 flex items-center justify-center py-1">
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="1"
                      value={val}
                      onChange={(e) => handleBandChange(b.key as keyof AudioEqualizerSettings, parseInt(e.target.value, 10))}
                      className="accent-amber-500 h-24 w-1 bg-zinc-700 rounded-lg cursor-pointer appearance-slider-vertical"
                      style={{
                        writingMode: 'vertical-lr',
                        direction: 'rtl',
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-zinc-200 mt-2">{b.label}</span>
                  <span className="text-[10px] text-zinc-500">{b.sub}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Flat
          </button>
          <button
            onClick={onClose}
            className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-black hover:bg-amber-400 shadow-md transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
