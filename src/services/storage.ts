import { Channel, PlaylistMeta, PlayerSettings } from '../types';

const DB_NAME = 'ApexM3UPlayerDB';
const DB_VERSION = 1;
const PLAYLISTS_STORE = 'playlists';
const CHANNELS_STORE = 'channels';
const SETTINGS_KEY = 'apex_iptv_settings';
const FAVORITES_KEY = 'apex_iptv_favorites';
const HISTORY_KEY = 'apex_iptv_history';
const ACTIVE_PLAYLIST_KEY = 'apex_iptv_active_playlist';

export const DEFAULT_SETTINGS: PlayerSettings = {
  engine: 'hls-low-latency',
  bufferLengthSeconds: 2,
  lowLatencyMode: true,
  aspectRatio: 'fit',
  tvMode: false,
  autoPlayNext: false,
  muted: false,
  volume: 0.9,
  theme: 'dark-default',
  equalizer: {
    enabled: false,
    preampGain: 1.0,
    bassGain: 0,
    vocalGain: 0,
    band60Hz: 0,
    band230Hz: 0,
    band910Hz: 0,
    band3600Hz: 0,
    band14000Hz: 0,
    preset: 'flat',
  },
};

class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memoryPlaylists: Map<string, PlaylistMeta> = new Map();
  private memoryChannels: Map<string, Channel[]> = new Map();

  private getDB(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        resolve(null);
        return;
      }

      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(PLAYLISTS_STORE)) {
            db.createObjectStore(PLAYLISTS_STORE, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(CHANNELS_STORE)) {
            const channelStore = db.createObjectStore(CHANNELS_STORE, { keyPath: 'id' });
            channelStore.createIndex('playlistId', 'playlistId', { unique: false });
            channelStore.createIndex('group', 'group', { unique: false });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  // Settings
  getSettings(): PlayerSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to load settings from localStorage', e);
    }
    return DEFAULT_SETTINGS;
  }

  saveSettings(settings: PlayerSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings', e);
    }
  }

  // Favorites
  getFavorites(): Set<string> {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        return new Set<string>(JSON.parse(stored) as string[]);
      }
    } catch (e) {
      console.warn('Failed to load favorites', e);
    }
    return new Set<string>();
  }

  saveFavorites(favorites: Set<string>): void {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)));
    } catch (e) {
      console.warn('Failed to save favorites', e);
    }
  }

  // History
  getHistory(): Array<{ channelId: string; timestamp: number; channelName: string; logo?: string; group: string; url: string }> {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load history', e);
    }
    return [];
  }

  addToHistory(channel: Channel): void {
    try {
      const history = this.getHistory().filter((item) => item.channelId !== channel.id);
      history.unshift({
        channelId: channel.id,
        timestamp: Date.now(),
        channelName: channel.name,
        logo: channel.logo,
        group: channel.group,
        url: channel.url,
      });
      // Keep last 40 channels in history
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 40)));
    } catch (e) {
      console.warn('Failed to update history', e);
    }
  }

  clearHistory(): void {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (e) {
      console.warn('Failed to clear history', e);
    }
  }

  // Active Playlist ID
  getActivePlaylistId(): string | null {
    try {
      return localStorage.getItem(ACTIVE_PLAYLIST_KEY);
    } catch {
      return null;
    }
  }

  setActivePlaylistId(id: string): void {
    try {
      localStorage.setItem(ACTIVE_PLAYLIST_KEY, id);
    } catch (e) {
      console.warn('Failed to set active playlist ID', e);
    }
  }

  // IndexedDB Playlists & Channels (with in-memory fallback)
  async savePlaylistWithChannels(playlist: PlaylistMeta, channels: Channel[]): Promise<void> {
    this.memoryPlaylists.set(playlist.id, playlist);
    this.memoryChannels.set(playlist.id, channels);

    const db = await this.getDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([PLAYLISTS_STORE, CHANNELS_STORE], 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => resolve();

        const playlistStore = transaction.objectStore(PLAYLISTS_STORE);
        playlistStore.put(playlist);

        const channelStore = transaction.objectStore(CHANNELS_STORE);
        for (const channel of channels) {
          channelStore.put({
            ...channel,
            playlistId: playlist.id,
          });
        }
      } catch {
        resolve();
      }
    });
  }

  async getAllPlaylists(): Promise<PlaylistMeta[]> {
    const db = await this.getDB();
    if (!db) {
      return Array.from(this.memoryPlaylists.values());
    }

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(PLAYLISTS_STORE, 'readonly');
        const store = transaction.objectStore(PLAYLISTS_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
          const results: PlaylistMeta[] = request.result || [];
          if (results.length === 0 && this.memoryPlaylists.size > 0) {
            resolve(Array.from(this.memoryPlaylists.values()));
          } else {
            // Keep memory cache in sync
            for (const pl of results) {
              this.memoryPlaylists.set(pl.id, pl);
            }
            resolve(results);
          }
        };
        request.onerror = () => resolve(Array.from(this.memoryPlaylists.values()));
      } catch {
        resolve(Array.from(this.memoryPlaylists.values()));
      }
    });
  }

  async getChannelsForPlaylist(playlistId: string): Promise<Channel[]> {
    const db = await this.getDB();
    if (!db) {
      return this.memoryChannels.get(playlistId) || [];
    }

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(CHANNELS_STORE, 'readonly');
        const store = transaction.objectStore(CHANNELS_STORE);
        const index = store.index('playlistId');
        const request = index.getAll(playlistId);

        request.onsuccess = () => {
          const res = request.result || [];
          if (res.length === 0 && this.memoryChannels.has(playlistId)) {
            resolve(this.memoryChannels.get(playlistId) || []);
          } else {
            this.memoryChannels.set(playlistId, res);
            resolve(res);
          }
        };
        request.onerror = () => resolve(this.memoryChannels.get(playlistId) || []);
      } catch {
        resolve(this.memoryChannels.get(playlistId) || []);
      }
    });
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    this.memoryPlaylists.delete(playlistId);
    this.memoryChannels.delete(playlistId);

    const db = await this.getDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([PLAYLISTS_STORE, CHANNELS_STORE], 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => resolve();

        const playlistStore = transaction.objectStore(PLAYLISTS_STORE);
        playlistStore.delete(playlistId);

        const channelStore = transaction.objectStore(CHANNELS_STORE);
        const index = channelStore.index('playlistId');
        const request = index.openKeyCursor(IDBKeyRange.only(playlistId));

        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            channelStore.delete(cursor.primaryKey);
            cursor.continue();
          }
        };
      } catch {
        resolve();
      }
    });
  }

  // Cross-Platform Synchronization (Export/Import Backup)
  async exportSyncBackup(): Promise<string> {
    const playlists = await this.getAllPlaylists();
    const allChannels: Record<string, Channel[]> = {};

    for (const pl of playlists) {
      allChannels[pl.id] = await this.getChannelsForPlaylist(pl.id);
    }

    const backup = {
      version: 1,
      exportedAt: Date.now(),
      settings: this.getSettings(),
      favorites: Array.from(this.getFavorites()),
      history: this.getHistory(),
      activePlaylistId: this.getActivePlaylistId(),
      playlists,
      channels: allChannels,
    };

    return JSON.stringify(backup, null, 2);
  }

  async importSyncBackup(jsonString: string): Promise<void> {
    const backup = JSON.parse(jsonString);
    if (!backup || !backup.playlists) {
      throw new Error('Invalid backup data format');
    }

    if (backup.settings) this.saveSettings(backup.settings);
    if (backup.favorites) this.saveFavorites(new Set(backup.favorites));
    if (backup.history) localStorage.setItem(HISTORY_KEY, JSON.stringify(backup.history));
    if (backup.activePlaylistId) this.setActivePlaylistId(backup.activePlaylistId);

    // Save playlists and channels
    for (const pl of backup.playlists) {
      const channels = backup.channels?.[pl.id] || [];
      await this.savePlaylistWithChannels(pl, channels);
    }
  }
}

export const storage = new StorageService();
