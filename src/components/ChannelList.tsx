import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Star, 
  Tv, 
  Grid, 
  List, 
  Radio, 
  Play, 
  Sparkles,
  Layers,
  X
} from 'lucide-react';
import { Channel } from '../types';

interface ChannelListProps {
  channels: Channel[];
  selectedChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  favorites: Set<string>;
  onToggleFavorite: (channelId: string) => void;
  groups: string[];
  activeGroup: string;
  onSelectGroup: (group: string) => void;
  tvMode: boolean;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  selectedChannel,
  onSelectChannel,
  favorites,
  onToggleFavorite,
  groups,
  activeGroup,
  onSelectGroup,
  tvMode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter channels based on group & search query
  const filteredChannels = useMemo(() => {
    return channels.filter((ch) => {
      // Group filter
      if (activeGroup !== 'ALL' && ch.group !== activeGroup) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = ch.name.toLowerCase().includes(q);
        const matchesGroup = ch.group.toLowerCase().includes(q);
        const matchesChno = ch.channelNumber?.toString() === q;
        return matchesName || matchesGroup || matchesChno;
      }
      return true;
    });
  }, [channels, activeGroup, searchQuery]);

  return (
    <div className="flex flex-col gap-4">
      {/* Search Bar & View Mode Toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            id="channel-search-input"
            type="text"
            placeholder="Search channels by name, category, or number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-900/90 pl-10 pr-10 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* View Mode Toggle & Count Badge */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <span className="text-xs font-medium text-zinc-400">
            Showing <strong className="text-white">{filteredChannels.length}</strong> channels
          </span>
          <div className="flex items-center rounded-lg border border-white/10 bg-zinc-900/90 p-1">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              className={`rounded p-1.5 transition-all ${
                viewMode === 'grid' ? 'bg-amber-500 text-black shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              className={`rounded p-1.5 transition-all ${
                viewMode === 'list' ? 'bg-amber-500 text-black shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Category / Group Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => onSelectGroup('ALL')}
          className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
            activeGroup === 'ALL'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
              : 'border border-white/5 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          <Layers className="h-3 w-3" />
          All Categories ({channels.length})
        </button>

        {groups.map((group) => {
          const count = channels.filter((c) => c.group === group).length;
          return (
            <button
              key={group}
              onClick={() => onSelectGroup(group)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                activeGroup === group
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'border border-white/5 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              {group} ({count})
            </button>
          );
        })}
      </div>

      {/* Channels Grid / List */}
      {filteredChannels.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-zinc-900/40 py-16 text-center">
          <Tv className="h-12 w-12 text-zinc-600 mb-3" />
          <h3 className="text-sm font-bold text-zinc-300">No channels found</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Try adjusting your search query or select another category.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className={`grid gap-3 ${
          tvMode
            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
            : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
        }`}>
          {filteredChannels.map((channel) => {
            const isCurrent = selectedChannel?.id === channel.id;
            const isFav = favorites.has(channel.id);

            return (
              <div
                key={channel.id}
                tabIndex={0}
                onClick={() => onSelectChannel(channel)}
                className={`group relative flex flex-col justify-between rounded-xl border p-3 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:scale-[1.02] ${
                  isCurrent
                    ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                    : 'border-white/5 bg-zinc-900/70 hover:border-white/20 hover:bg-zinc-800/80'
                }`}
              >
                {/* Header: Logo & Favorite button */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-lg bg-black/60 p-1 border border-white/10 overflow-hidden">
                    {channel.logo ? (
                      <img
                        src={channel.logo}
                        alt={channel.name}
                        loading="lazy"
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-sm font-bold text-amber-400">
                        {channel.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}

                    {isCurrent && (
                      <span className="absolute inset-0 flex items-center justify-center bg-amber-500/20 backdrop-blur-xs">
                        <span className="flex gap-0.5 items-end h-3">
                          <span className="w-0.5 h-2 bg-amber-400 animate-pulse"></span>
                          <span className="w-0.5 h-3 bg-amber-400 animate-pulse delay-75"></span>
                          <span className="w-0.5 h-1.5 bg-amber-400 animate-pulse delay-150"></span>
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Star Favorite button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(channel.id);
                    }}
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    className={`rounded-lg p-1.5 transition-all ${
                      isFav
                        ? 'text-amber-400 hover:text-amber-300'
                        : 'text-zinc-600 hover:text-zinc-300 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <Star className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Channel Details */}
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    {channel.channelNumber && (
                      <span className="text-[10px] font-mono text-zinc-500">
                        #{channel.channelNumber}
                      </span>
                    )}
                    <h4 className="truncate text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                      {channel.name}
                    </h4>
                  </div>
                  <p className="truncate text-[11px] text-zinc-400 mt-0.5">
                    {channel.group}
                  </p>
                </div>

                {/* Live tag or Play overlay on hover */}
                <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2">
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-400 uppercase">
                    HLS Stream
                  </span>
                  {isCurrent ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
                      <Radio className="h-3 w-3" />
                      PLAYING
                    </span>
                  ) : (
                    <span className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 text-[10px] font-semibold text-zinc-400 transition-opacity">
                      <Play className="h-2.5 w-2.5 fill-current" />
                      Play
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="flex flex-col gap-1.5">
          {filteredChannels.map((channel) => {
            const isCurrent = selectedChannel?.id === channel.id;
            const isFav = favorites.has(channel.id);

            return (
              <div
                key={channel.id}
                tabIndex={0}
                onClick={() => onSelectChannel(channel)}
                className={`group flex items-center justify-between rounded-xl border p-2.5 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  isCurrent
                    ? 'border-amber-500 bg-amber-500/10 shadow-md shadow-amber-500/10'
                    : 'border-white/5 bg-zinc-900/60 hover:border-white/20 hover:bg-zinc-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/60 p-1 border border-white/10">
                    {channel.logo ? (
                      <img
                        src={channel.logo}
                        alt={channel.name}
                        loading="lazy"
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-xs font-bold text-amber-400">
                        {channel.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      {channel.channelNumber && (
                        <span className="text-xs font-mono text-zinc-500">
                          #{channel.channelNumber}
                        </span>
                      )}
                      <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                        {channel.name}
                      </h4>
                      {isCurrent && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                          PLAYING
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-400">
                      {channel.group}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(channel.id);
                    }}
                    className={`rounded-lg p-2 transition-all ${
                      isFav ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-300'
                    }`}
                  >
                    <Star className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
                  </button>

                  <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-zinc-400 group-hover:bg-amber-500 group-hover:text-black transition-all">
                    <Play className="h-4 w-4 fill-current ml-0.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
