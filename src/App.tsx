import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Tv, 
  Upload, 
  Sparkles, 
  Radio, 
  FolderPlus, 
  Layers, 
  ChevronRight, 
  ShieldCheck, 
  Sliders, 
  Zap, 
  Smartphone,
  Star,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Channel, PlaylistMeta, PlayerSettings } from './types';
import { storage, DEFAULT_SETTINGS } from './services/storage';
import { getCuratedPlaylist } from './services/m3uParser';
import { Header } from './components/Header';
import { VideoPlayer } from './components/VideoPlayer';
import { ChannelList } from './components/ChannelList';
import { ImportModal } from './components/ImportModal';
import { EqualizerModal } from './components/EqualizerModal';
import { SettingsModal } from './components/SettingsModal';
import { TVRemoteBar } from './components/TVRemoteBar';

export default function App() {
  // State
  const [playlists, setPlaylists] = useState<PlaylistMeta[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set<string>());
  const [history, setHistory] = useState<Array<{ channelId: string; timestamp: number }>>([]);
  const [activeGroup, setActiveGroup] = useState<string>('ALL');
  const [activeFilter, setActiveFilter] = useState<'all' | 'favorites' | 'history'>('all');
  const [settings, setSettings] = useState<PlayerSettings>(DEFAULT_SETTINGS);

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEqualizerModalOpen, setIsEqualizerModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [showTVBar, setShowTVBar] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Load initial settings, favorites, and playlists from IndexedDB / Storage
  useEffect(() => {
    const savedSettings = storage.getSettings();
    setSettings(savedSettings);

    const savedFavs = storage.getFavorites();
    setFavorites(savedFavs);

    const savedHistory = storage.getHistory();
    setHistory(savedHistory);

    const loadData = async () => {
      try {
        let storedPlaylists = await storage.getAllPlaylists();
        
        // Auto-seed curated streams on first launch for immediate playback
        if (storedPlaylists.length === 0) {
          const { playlist, channels: curatedChannels } = getCuratedPlaylist();
          await storage.savePlaylistWithChannels(playlist, curatedChannels);
          storage.setActivePlaylistId(playlist.id);
          storedPlaylists = [playlist];
        }

        setPlaylists(storedPlaylists);

        let currentPlId = storage.getActivePlaylistId();
        if (!currentPlId && storedPlaylists.length > 0) {
          currentPlId = storedPlaylists[0].id;
        }

        if (currentPlId) {
          setActivePlaylistId(currentPlId);
          const chList = await storage.getChannelsForPlaylist(currentPlId);
          setChannels(chList);
          if (chList.length > 0) {
            setSelectedChannel(chList[0]);
          }
        }
      } catch (err) {
        console.warn('Initial data load error:', err);
      }
    };

    loadData();
  }, []);

  // Sync settings updates
  const handleUpdateSettings = useCallback((newSettings: Partial<PlayerSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      storage.saveSettings(updated);
      return updated;
    });
  }, []);

  // Toggle TV Mode
  const handleToggleTvMode = () => {
    const newTvMode = !settings.tvMode;
    handleUpdateSettings({ tvMode: newTvMode });
    setShowTVBar(newTvMode);
  };

  // Toggle Favorite
  const handleToggleFavorite = useCallback((channelId: string) => {
    setFavorites((prev) => {
      const next = new Set<string>(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      storage.saveFavorites(next);
      return next;
    });
  }, []);

  // Select Channel
  const handleSelectChannel = useCallback((channel: Channel) => {
    setSelectedChannel(channel);
    storage.addToHistory(channel);
    setHistory(storage.getHistory());
  }, []);

  // Next / Prev Channel navigation
  const displayedChannels = useMemo(() => {
    if (activeFilter === 'favorites') {
      return channels.filter((c) => favorites.has(c.id));
    }
    if (activeFilter === 'history') {
      const historyIds = new Set(history.map((h) => h.channelId));
      return channels.filter((c) => historyIds.has(c.id));
    }
    if (activeGroup !== 'ALL') {
      return channels.filter((c) => c.group === activeGroup);
    }
    return channels;
  }, [channels, activeFilter, favorites, history, activeGroup]);

  const handleNextChannel = useCallback(() => {
    if (!selectedChannel || displayedChannels.length === 0) return;
    const currentIndex = displayedChannels.findIndex((c) => c.id === selectedChannel.id);
    const nextIndex = (currentIndex + 1) % displayedChannels.length;
    handleSelectChannel(displayedChannels[nextIndex]);
  }, [selectedChannel, displayedChannels, handleSelectChannel]);

  const handlePrevChannel = useCallback(() => {
    if (!selectedChannel || displayedChannels.length === 0) return;
    const currentIndex = displayedChannels.findIndex((c) => c.id === selectedChannel.id);
    const prevIndex = (currentIndex - 1 + displayedChannels.length) % displayedChannels.length;
    handleSelectChannel(displayedChannels[prevIndex]);
  }, [selectedChannel, displayedChannels, handleSelectChannel]);

  // Import New Playlist
  const handleImportPlaylist = async (playlist: PlaylistMeta, newChannels: Channel[]) => {
    try {
      await storage.savePlaylistWithChannels(playlist, newChannels);
      storage.setActivePlaylistId(playlist.id);

      const allPlaylists = await storage.getAllPlaylists();
      setPlaylists(allPlaylists);
      setActivePlaylistId(playlist.id);
      setChannels(newChannels);
      setActiveGroup('ALL');
      if (newChannels.length > 0) {
        setSelectedChannel(newChannels[0]);
      }
      showToast(`Imported ${newChannels.length} channels successfully!`);
    } catch (err) {
      showToast('Error saving playlist: ' + (err as Error).message);
    }
  };

  // Switch Active Playlist
  const handleSelectPlaylist = async (playlistId: string) => {
    try {
      storage.setActivePlaylistId(playlistId);
      setActivePlaylistId(playlistId);
      const chList = await storage.getChannelsForPlaylist(playlistId);
      setChannels(chList);
      setActiveGroup('ALL');
      if (chList.length > 0) {
        setSelectedChannel(chList[0]);
      }
    } catch (err) {
      console.warn('Failed to switch playlist', err);
    }
  };

  // Delete Playlist
  const handleDeletePlaylist = async (playlistId: string) => {
    try {
      await storage.deletePlaylist(playlistId);
      const remaining = await storage.getAllPlaylists();
      setPlaylists(remaining);

      if (activePlaylistId === playlistId) {
        if (remaining.length > 0) {
          handleSelectPlaylist(remaining[0].id);
        } else {
          setActivePlaylistId(null);
          setChannels([]);
          setSelectedChannel(null);
        }
      }
      showToast('Playlist deleted');
    } catch (err) {
      console.warn('Failed to delete playlist', err);
    }
  };

  // Sync Reload
  const handleSyncReload = async () => {
    const allPlaylists = await storage.getAllPlaylists();
    setPlaylists(allPlaylists);
    const activeId = storage.getActivePlaylistId();
    if (activeId) {
      setActivePlaylistId(activeId);
      const chList = await storage.getChannelsForPlaylist(activeId);
      setChannels(chList);
    }
    setFavorites(storage.getFavorites());
    setSettings(storage.getSettings());
    showToast('Sync updated from backup');
  };

  // Groups list for active playlist
  const activePlaylist = playlists.find((p) => p.id === activePlaylistId);
  const currentGroups = useMemo(() => {
    const set = new Set<string>();
    channels.forEach((c) => {
      if (c.group) set.add(c.group);
    });
    return Array.from(set).sort();
  }, [channels]);

  // Dynamic Theme Palette Class
  const getThemeBackground = () => {
    switch (settings.theme) {
      case 'oled-pure':
        return 'bg-black text-white';
      case 'midnight-navy':
        return 'bg-[#090d16] text-white';
      case 'dark-default':
      default:
        return 'bg-zinc-950 text-zinc-100';
    }
  };

  return (
    <div className={`min-h-screen ${getThemeBackground()} flex flex-col font-sans transition-colors duration-300 pb-12`}>
      {/* Header Bar */}
      <Header
        channelCount={channels.length}
        playlistName={activePlaylist?.name || ''}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        favoritesCount={favorites.size}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenEqualizer={() => setIsEqualizerModalOpen(true)}
        settings={settings}
        onToggleTvMode={handleToggleTvMode}
        isPlaying={!!selectedChannel}
        currentChannelName={selectedChannel?.name}
      />

      {/* Main Container */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-6 sm:py-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-zinc-900/95 px-4 py-3 text-xs font-bold text-amber-300 shadow-2xl backdrop-blur-md animate-fade-in">
            <CheckCircle2 className="h-4 w-4 text-amber-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Empty State: Ask to import playlist */}
        {channels.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-zinc-900/40 px-6 py-20 text-center shadow-2xl backdrop-blur-xs">
            <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-xl shadow-orange-500/20">
              <Tv className="h-10 w-10 text-white" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex h-4 w-4 rounded-full bg-amber-500"></span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
              Import Your M3U Playlist
            </h1>
            <p className="text-sm text-zinc-400 max-w-lg mb-8 leading-relaxed">
              Universal low-latency IPTV player engineered for iPhone 12 Pro Max, Android TV, Smart TV browsers, and desktop. Buffer-free HLS streaming, 5-band audio equalizer, and intuitive gesture controls.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-bold text-black shadow-lg shadow-orange-500/25 hover:from-amber-400 hover:to-orange-400 active:scale-95 transition-all"
              >
                <Upload className="h-4 w-4 text-black" />
                <span>Import M3U File or URL</span>
              </button>

              <button
                onClick={() => {
                  const { playlist, channels: curatedChannels } = getCuratedPlaylist();
                  handleImportPlaylist(playlist, curatedChannels);
                }}
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-zinc-800/80 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-700 hover:border-white/30 active:scale-95 transition-all"
              >
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>Load Curated Free Live Streams</span>
              </button>
            </div>

            {/* Feature Highlights Pill Grid */}
            <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl w-full text-left">
              <div className="rounded-xl border border-white/5 bg-zinc-900/60 p-3.5">
                <Zap className="h-5 w-5 text-amber-400 mb-1.5" />
                <div className="text-xs font-bold text-white">Ultra-Low Latency</div>
                <div className="text-[11px] text-zinc-400">Live edge sync & buffer-free streaming</div>
              </div>
              <div className="rounded-xl border border-white/5 bg-zinc-900/60 p-3.5">
                <Smartphone className="h-5 w-5 text-cyan-400 mb-1.5" />
                <div className="text-xs font-bold text-white">iPhone 12 Pro Max</div>
                <div className="text-[11px] text-zinc-400">Gesture sliders & edge-to-edge OLED fill</div>
              </div>
              <div className="rounded-xl border border-white/5 bg-zinc-900/60 p-3.5">
                <Sliders className="h-5 w-5 text-emerald-400 mb-1.5" />
                <div className="text-xs font-bold text-white">Hi-Fi Audio EQ</div>
                <div className="text-[11px] text-zinc-400">5-band equalizer & preamp volume booster</div>
              </div>
              <div className="rounded-xl border border-white/5 bg-zinc-900/60 p-3.5">
                <Tv className="h-5 w-5 text-purple-400 mb-1.5" />
                <div className="text-xs font-bold text-white">Smart TV Mode</div>
                <div className="text-[11px] text-zinc-400">D-Pad remote navigation & keyboard shortcuts</div>
              </div>
            </div>
          </div>
        ) : (
          /* Active Playing State */
          <div className="space-y-6">
            {/* Top Video Player Section */}
            <div className="relative">
              <VideoPlayer
                channel={selectedChannel}
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onNextChannel={handleNextChannel}
                onPrevChannel={handlePrevChannel}
                onToggleFavorite={handleToggleFavorite}
                isFavorite={selectedChannel ? favorites.has(selectedChannel.id) : false}
                onOpenEqualizer={() => setIsEqualizerModalOpen(true)}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
              />
            </div>

            {/* Bottom Channels Directory */}
            <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5 shadow-xl backdrop-blur-md">
              <ChannelList
                channels={displayedChannels}
                selectedChannel={selectedChannel}
                onSelectChannel={handleSelectChannel}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                groups={currentGroups}
                activeGroup={activeGroup}
                onSelectGroup={setActiveGroup}
                tvMode={settings.tvMode}
              />
            </div>
          </div>
        )}
      </main>

      {/* Floating Smart TV Remote Bar */}
      {(settings.tvMode || showTVBar) && (
        <TVRemoteBar onClose={() => setShowTVBar(false)} />
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportPlaylist={handleImportPlaylist}
        playlists={playlists}
        activePlaylistId={activePlaylistId}
        onSelectPlaylist={handleSelectPlaylist}
        onDeletePlaylist={handleDeletePlaylist}
      />

      {/* Audio Equalizer Modal */}
      <EqualizerModal
        isOpen={isEqualizerModalOpen}
        onClose={() => setIsEqualizerModalOpen(false)}
        settings={settings.equalizer}
        onChange={(newEq) => handleUpdateSettings({ equalizer: newEq })}
      />

      {/* Player & Low-Latency Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onSyncReload={handleSyncReload}
        channelCount={channels.length}
      />
    </div>
  );
}
