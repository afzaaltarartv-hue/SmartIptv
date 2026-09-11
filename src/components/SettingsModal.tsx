import React, { useState } from 'react';
import { 
  Settings, 
  Zap, 
  HardDrive, 
  Tv, 
  Download, 
  Upload, 
  Moon, 
  RefreshCw, 
  X, 
  Check, 
  ShieldCheck, 
  Sliders,
  Cpu
} from 'lucide-react';
import { PlayerSettings, PlaybackEngine, AspectRatio } from '../types';
import { storage } from '../services/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PlayerSettings;
  onUpdateSettings: (newSettings: Partial<PlayerSettings>) => void;
  onSyncReload: () => void;
  channelCount: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onSyncReload,
  channelCount,
}) => {
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [showImportBox, setShowImportBox] = useState(false);

  if (!isOpen) return null;

  // Handle Export Sync JSON
  const handleExport = async () => {
    try {
      const json = await storage.exportSyncBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `apex-iptv-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSyncStatus('Configuration and channels exported successfully.');
      setTimeout(() => setSyncStatus(null), 4000);
    } catch (e) {
      setSyncStatus('Export failed: ' + (e as Error).message);
    }
  };

  // Handle Import Sync JSON
  const handleImport = async () => {
    try {
      if (!importText.trim()) return;
      await storage.importSyncBackup(importText);
      setSyncStatus('Imported backup successfully! Refreshing...');
      setTimeout(() => {
        onSyncReload();
        setShowImportBox(false);
        setSyncStatus(null);
      }, 1500);
    } catch (e) {
      setSyncStatus('Import failed: invalid backup JSON format.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950 p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-black">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Playback & Player Settings</h2>
            <p className="text-xs text-zinc-400">Tune latency, buffer depth, Smart TV mode, and cross-platform sync</p>
          </div>
        </div>

        {/* Sync notification message */}
        {syncStatus && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            {syncStatus}
          </div>
        )}

        {/* SECTION 1: Playback Engine & Latency */}
        <div className="space-y-4 mb-6">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Streaming Engine & Low-Latency Tuning
          </h3>

          {/* Playback Engine Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-300">
              Playback Engine Backend
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: 'hls-low-latency',
                  title: 'Low Latency HLS',
                  desc: 'Synchronized live edge (sports/news)',
                },
                {
                  id: 'hls-balanced',
                  title: 'Balanced Buffer',
                  desc: 'Stable, anti-buffering playback',
                },
                {
                  id: 'native-html5',
                  title: 'Native Browser',
                  desc: 'Hardware accelerated (iOS Safari)',
                },
              ].map((engine) => (
                <button
                  key={engine.id}
                  onClick={() => onUpdateSettings({ engine: engine.id as PlaybackEngine })}
                  className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                    settings.engine === engine.id
                      ? 'border-amber-500 bg-amber-500/10 text-white shadow-md'
                      : 'border-white/5 bg-zinc-900/60 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                  }`}
                >
                  <span className="text-xs font-bold text-white mb-0.5">{engine.title}</span>
                  <span className="text-[10px] text-zinc-400 leading-tight">{engine.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Buffer Length Target Slider */}
          <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-3.5">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-semibold text-zinc-300">Target Forward Buffer</span>
              <span className="font-mono text-amber-400 font-bold">
                {settings.bufferLengthSeconds} seconds
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={settings.bufferLengthSeconds}
              onChange={(e) => onUpdateSettings({ bufferLengthSeconds: parseInt(e.target.value, 10) })}
              className="w-full accent-amber-500 h-1.5 bg-zinc-700 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
              <span>1s (Ultra-Low Latency)</span>
              <span>5s (Balanced)</span>
              <span>15s (Maximum Buffer)</span>
            </div>
          </div>

          {/* Low Latency Live Edge Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/60 p-3">
            <div>
              <div className="text-xs font-semibold text-zinc-200">Live Edge Synchronization</div>
              <div className="text-[11px] text-zinc-400">Keep playback locked to the live broadcast edge</div>
            </div>
            <button
              onClick={() => onUpdateSettings({ lowLatencyMode: !settings.lowLatencyMode })}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                settings.lowLatencyMode ? 'bg-amber-500' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow transition ${
                  settings.lowLatencyMode ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* SECTION 2: Display & Smart TV Optimization */}
        <div className="space-y-4 mb-6">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Tv className="h-3.5 w-3.5" />
            Display, OLED & Smart TV Mode
          </h3>

          {/* Smart TV Mode */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/60 p-3">
            <div>
              <div className="text-xs font-semibold text-zinc-200">Smart TV Remote Mode</div>
              <div className="text-[11px] text-zinc-400">
                Enlarges interface, activates high-contrast D-pad remote focus and keyboard shortcuts
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ tvMode: !settings.tvMode })}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                settings.tvMode ? 'bg-cyan-500' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow transition ${
                  settings.tvMode ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Theme Palette */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2">
              Dark Mode Palette
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'dark-default', name: 'Charcoal Dark', color: 'bg-zinc-900' },
                { id: 'oled-pure', name: 'OLED Pure Black', color: 'bg-black' },
                { id: 'midnight-navy', name: 'Midnight Blue', color: 'bg-[#0b0f19]' },
              ].map((th) => (
                <button
                  key={th.id}
                  onClick={() => onUpdateSettings({ theme: th.id as PlayerSettings['theme'] })}
                  className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition-all ${
                    settings.theme === th.id
                      ? 'border-amber-500 bg-white/10 text-white font-bold'
                      : 'border-white/5 bg-zinc-900/40 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className={`h-3 w-3 rounded-full border border-white/20 ${th.color}`}></span>
                  <span>{th.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 3: Cross-Platform Sync & Offline Caching */}
        <div className="space-y-3 mb-6">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <HardDrive className="h-3.5 w-3.5" />
            Cross-Platform Sync & Offline Storage
          </h3>

          <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs font-semibold text-zinc-200">IndexedDB Offline Cache</div>
                <div className="text-[11px] text-zinc-400">
                  {channelCount} channels cached locally for fast offline access
                </div>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
                <ShieldCheck className="h-3.5 w-3.5" />
                Persistent
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700"
              >
                <Download className="h-3.5 w-3.5" />
                Export Backup (JSON)
              </button>
              <button
                onClick={() => setShowImportBox((prev) => !prev)}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700"
              >
                <Upload className="h-3.5 w-3.5" />
                Import Backup
              </button>
            </div>

            {/* Import Box */}
            {showImportBox && (
              <div className="mt-3 space-y-2 pt-2 border-t border-white/10">
                <textarea
                  rows={3}
                  placeholder="Paste exported backup JSON here to sync..."
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/60 p-2 text-xs font-mono text-zinc-300 focus:border-amber-500 focus:outline-none"
                />
                <button
                  onClick={handleImport}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-amber-400"
                >
                  Apply Backup
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-white/10 pt-4">
          <button
            onClick={onClose}
            className="rounded-xl bg-amber-500 px-6 py-2 text-xs font-bold text-black hover:bg-amber-400 shadow-md"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
