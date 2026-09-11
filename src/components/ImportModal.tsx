import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Link as LinkIcon, 
  Sparkles, 
  Trash2, 
  Check, 
  X, 
  FileText, 
  Tv, 
  AlertCircle,
  Clock,
  Layers
} from 'lucide-react';
import { PlaylistMeta } from '../types';
import { parseM3U, getCuratedPlaylist } from '../services/m3uParser';
import { Channel } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportPlaylist: (playlist: PlaylistMeta, channels: Channel[]) => void;
  playlists: PlaylistMeta[];
  activePlaylistId: string | null;
  onSelectPlaylist: (playlistId: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportPlaylist,
  playlists,
  activePlaylistId,
  onSelectPlaylist,
  onDeletePlaylist,
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'url' | 'curated' | 'manage'>('file');
  const [urlInput, setUrlInput] = useState('');
  const [playlistNameInput, setPlaylistNameInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Process File
  const handleFile = (file: File) => {
    setIsLoading(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text || !text.includes('#EXTINF')) {
          throw new Error('File does not appear to be a valid M3U playlist (missing #EXTINF tags).');
        }

        const id = 'playlist_' + Date.now();
        const name = playlistNameInput.trim() || file.name.replace(/\.[^/.]+$/, '');
        const { channels, groups } = parseM3U(text, id);

        if (channels.length === 0) {
          throw new Error('No valid channel stream URLs found in this M3U file.');
        }

        const playlist: PlaylistMeta = {
          id,
          name,
          sourceType: 'file',
          fileName: file.name,
          channelCount: channels.length,
          groups,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        onImportPlaylist(playlist, channels);
        setIsLoading(false);
        onClose();
      } catch (err: unknown) {
        setErrorMsg((err as Error).message || 'Failed to parse M3U file.');
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg('Failed to read file from disk.');
      setIsLoading(false);
    };

    reader.readAsText(file);
  };

  // Process URL
  const handleImportUrl = async () => {
    const url = urlInput.trim();
    if (!url) {
      setErrorMsg('Please enter a valid M3U URL.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      // First attempt direct fetch
      let response: Response;
      try {
        response = await fetch(url);
      } catch (e) {
        // If direct fetch fails due to CORS, use a public CORS proxy
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        response = await fetch(proxyUrl);
      }

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      if (!text || !text.includes('#EXTINF')) {
        throw new Error('The URL did not return a valid M3U playlist format.');
      }

      const id = 'playlist_' + Date.now();
      const name = playlistNameInput.trim() || new URL(url).hostname || 'Online Playlist';
      const { channels, groups } = parseM3U(text, id);

      if (channels.length === 0) {
        throw new Error('No stream URLs could be extracted from this M3U URL.');
      }

      const playlist: PlaylistMeta = {
        id,
        name,
        sourceType: 'url',
        sourceUrl: url,
        channelCount: channels.length,
        groups,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      onImportPlaylist(playlist, channels);
      setIsLoading(false);
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to download or parse M3U URL.');
      setIsLoading(false);
    }
  };

  // Load Curated Demo Streams
  const handleLoadCurated = () => {
    setIsLoading(true);
    const { playlist, channels } = getCuratedPlaylist();
    onImportPlaylist(playlist, channels);
    setIsLoading(false);
    onClose();
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

        {/* Modal Title */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-black font-bold">
            <Tv className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Import M3U Playlist</h2>
            <p className="text-xs text-zinc-400">Add local M3U / M3U8 files, streaming URLs, or legal public live streams</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl border border-white/10 bg-zinc-900/80 p-1 mb-5">
          <button
            onClick={() => { setActiveTab('file'); setErrorMsg(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
              activeTab === 'file' ? 'bg-amber-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload File
          </button>
          <button
            onClick={() => { setActiveTab('url'); setErrorMsg(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
              activeTab === 'url' ? 'bg-amber-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LinkIcon className="h-3.5 w-3.5" />
            M3U URL
          </button>
          <button
            onClick={() => { setActiveTab('curated'); setErrorMsg(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
              activeTab === 'curated' ? 'bg-amber-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Free Streams
          </button>
          {playlists.length > 0 && (
            <button
              onClick={() => { setActiveTab('manage'); setErrorMsg(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                activeTab === 'manage' ? 'bg-amber-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Saved ({playlists.length})
            </button>
          )}
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* File Upload Tab */}
        {activeTab === 'file' && (
          <div className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFile(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-amber-500 bg-amber-500/10 scale-[1.01]'
                  : 'border-white/15 bg-zinc-900/50 hover:border-white/30 hover:bg-zinc-900/80'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".m3u,.m3u8,.txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFile(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-amber-400 mb-3">
                <Upload className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-white mb-1">
                Drop your .m3u or .m3u8 file here
              </p>
              <p className="text-xs text-zinc-400">
                or click to browse from your device or iCloud
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                Playlist Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. My Sports & News List"
                value={playlistNameInput}
                onChange={(e) => setPlaylistNameInput(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* URL Tab */}
        {activeTab === 'url' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                M3U / M3U8 Playlist URL
              </label>
              <input
                type="url"
                placeholder="https://example.com/playlist.m3u"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                Playlist Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Global IPTV Live"
                value={playlistNameInput}
                onChange={(e) => setPlaylistNameInput(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleImportUrl}
              disabled={isLoading || !urlInput.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-xs font-bold text-black shadow-lg shadow-orange-500/20 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent"></div>
              ) : (
                <LinkIcon className="h-4 w-4" />
              )}
              <span>Import From URL</span>
            </button>
          </div>
        )}

        {/* Curated Free Streams Tab */}
        {activeTab === 'curated' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-bold mb-1">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Verified Legal 24/7 Global Channels
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Instant plug-and-play stream package including NASA TV UHD, Bloomberg Originals, Red Bull TV, DW News HD, Euronews, Sky News, and 60FPS Low-Latency benchmark streams.
              </p>
            </div>

            <button
              onClick={handleLoadCurated}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-xs font-bold text-black shadow-lg shadow-orange-500/20 hover:from-amber-400 hover:to-orange-400 transition-all"
            >
              <Sparkles className="h-4 w-4" />
              <span>Load Curated Free Live Streams</span>
            </button>
          </div>
        )}

        {/* Saved Playlists Management Tab */}
        {activeTab === 'manage' && (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {playlists.map((pl) => {
              const isActive = pl.id === activePlaylistId;
              return (
                <div
                  key={pl.id}
                  className={`flex items-center justify-between rounded-xl border p-3 transition-all ${
                    isActive ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 bg-zinc-900/60'
                  }`}
                >
                  <div
                    onClick={() => { onSelectPlaylist(pl.id); onClose(); }}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">{pl.name}</h4>
                      {isActive && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {pl.channelCount} channels • {pl.groups.length} categories
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isActive && (
                      <button
                        onClick={() => { onSelectPlaylist(pl.id); onClose(); }}
                        className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/20"
                      >
                        Select
                      </button>
                    )}
                    <button
                      onClick={() => onDeletePlaylist(pl.id)}
                      title="Delete playlist"
                      className="rounded-lg p-2 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
