import React from 'react';
import { 
  Tv, 
  Sliders, 
  FolderPlus, 
  Settings, 
  Star, 
  History, 
  Zap, 
  Layers, 
  Radio
} from 'lucide-react';
import { PlayerSettings } from '../types';

interface HeaderProps {
  channelCount: number;
  playlistName: string;
  activeFilter: 'all' | 'favorites' | 'history';
  onFilterChange: (filter: 'all' | 'favorites' | 'history') => void;
  favoritesCount: number;
  onOpenImport: () => void;
  onOpenSettings: () => void;
  onOpenEqualizer: () => void;
  settings: PlayerSettings;
  onToggleTvMode: () => void;
  isPlaying: boolean;
  currentChannelName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  channelCount,
  playlistName,
  activeFilter,
  onFilterChange,
  favoritesCount,
  onOpenImport,
  onOpenSettings,
  onOpenEqualizer,
  settings,
  onToggleTvMode,
  isPlaying,
  currentChannelName,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-black/80 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6">
        {/* Brand & Active Stream Info */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 shadow-lg shadow-orange-500/20">
            <Radio className="h-5 w-5 text-white" />
            {isPlaying && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
              </span>
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white sm:text-lg">
                Universal M3U
              </span>
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 uppercase tracking-wide">
                King IPTV
              </span>
              {settings.lowLatencyMode && (
                <span className="hidden items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300 md:inline-flex">
                  <Zap className="h-2.5 w-2.5 fill-current" />
                  Ultra-Low Latency
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="truncate max-w-[140px] sm:max-w-[240px]" title={playlistName}>
                {playlistName || 'No playlist loaded'}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400">{channelCount} {channelCount === 1 ? 'ch' : 'channels'}</span>
            </div>
          </div>
        </div>

        {/* Center / Navigation Filters */}
        <div className="hidden items-center rounded-xl border border-white/10 bg-zinc-900/80 p-1 md:flex">
          <button
            id="filter-all-btn"
            onClick={() => onFilterChange('all')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeFilter === 'all'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            All Channels
          </button>
          <button
            id="filter-favorites-btn"
            onClick={() => onFilterChange('favorites')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeFilter === 'favorites'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Star className="h-3.5 w-3.5 fill-current" />
            Favorites ({favoritesCount})
          </button>
          <button
            id="filter-history-btn"
            onClick={() => onFilterChange('history')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeFilter === 'history'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            Recent
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Audio EQ Button */}
          <button
            id="header-audio-eq-btn"
            onClick={onOpenEqualizer}
            title="High-Fidelity Audio Equalizer & Sound Enhancer"
            className={`relative flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-all ${
              settings.equalizer.enabled
                ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
                : 'border-white/10 bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span className="hidden sm:inline">Audio EQ</span>
            {settings.equalizer.enabled && (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          {/* TV Mode Toggle */}
          <button
            id="header-tv-mode-btn"
            onClick={onToggleTvMode}
            title={settings.tvMode ? 'Exit Smart TV Mode' : 'Enter Smart TV Mode (Remote Friendly)'}
            className={`flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-all ${
              settings.tvMode
                ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-300 shadow-md shadow-cyan-500/10'
                : 'border-white/10 bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <Tv className="h-4 w-4" />
            <span className="hidden sm:inline">TV Mode</span>
          </button>

          {/* Import M3U Button */}
          <button
            id="header-import-btn"
            onClick={onOpenImport}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 text-xs font-bold text-black shadow-lg shadow-orange-500/20 hover:from-amber-400 hover:to-orange-400 active:scale-95 transition-all"
          >
            <FolderPlus className="h-4 w-4 text-black" />
            <span className="hidden sm:inline">Playlists / M3U</span>
            <span className="sm:hidden">Import</span>
          </button>

          {/* Settings Button */}
          <button
            id="header-settings-btn"
            onClick={onOpenSettings}
            title="Player Settings, Buffering & Cross-Device Sync"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-zinc-900/90 text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="flex border-t border-white/5 bg-zinc-950 px-3 py-1.5 md:hidden items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onFilterChange('all')}
            className={`rounded-md px-2.5 py-1 font-medium transition-all ${
              activeFilter === 'all' ? 'bg-amber-500 text-black' : 'text-zinc-400'
            }`}
          >
            All
          </button>
          <button
            onClick={() => onFilterChange('favorites')}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-all ${
              activeFilter === 'favorites' ? 'bg-amber-500 text-black' : 'text-zinc-400'
            }`}
          >
            <Star className="h-3 w-3 fill-current" />
            Favs ({favoritesCount})
          </button>
          <button
            onClick={() => onFilterChange('history')}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-all ${
              activeFilter === 'history' ? 'bg-amber-500 text-black' : 'text-zinc-400'
            }`}
          >
            <History className="h-3 w-3" />
            Recent
          </button>
        </div>
        {currentChannelName && isPlaying && (
          <div className="flex items-center gap-1.5 text-zinc-400 max-w-[140px] truncate text-[11px]">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="truncate text-zinc-200">{currentChannelName}</span>
          </div>
        )}
      </div>
    </header>
  );
};
