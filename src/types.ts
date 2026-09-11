export interface Channel {
  id: string;
  name: string;
  url: string;
  group: string;
  logo?: string;
  tvgId?: string;
  tvgName?: string;
  channelNumber?: number;
  isFavorite?: boolean;
  addedAt?: number;
  lastPlayedAt?: number;
}

export interface PlaylistMeta {
  id: string;
  name: string;
  sourceType: 'file' | 'url' | 'preset';
  sourceUrl?: string;
  fileName?: string;
  channelCount: number;
  groups: string[];
  createdAt: number;
  updatedAt: number;
}

export type PlaybackEngine = 'hls-low-latency' | 'hls-balanced' | 'native-html5';

export type AspectRatio = 'fit' | 'fill' | '16:9' | '4:3' | '21:9';

export interface AudioEqualizerSettings {
  enabled: boolean;
  preampGain: number; // 0.5 to 2.0 (1.0 = normal, 2.0 = +6dB / 200% boost)
  bassGain: number; // -10dB to +15dB
  vocalGain: number; // -10dB to +15dB
  band60Hz: number; // dB
  band230Hz: number;
  band910Hz: number;
  band3600Hz: number;
  band14000Hz: number;
  preset: 'flat' | 'bass' | 'vocal' | 'cinema' | 'night' | 'custom';
}

export interface PlayerSettings {
  engine: PlaybackEngine;
  bufferLengthSeconds: number; // 1 to 20
  lowLatencyMode: boolean;
  aspectRatio: AspectRatio;
  tvMode: boolean;
  autoPlayNext: boolean;
  muted: boolean;
  volume: number;
  theme: 'dark-default' | 'oled-pure' | 'midnight-navy';
  equalizer: AudioEqualizerSettings;
}

export interface StreamStats {
  engine: string;
  resolution?: string;
  bitrateKbps?: number;
  currentLevel?: number;
  totalLevels?: number;
  bufferedSeconds: number;
  latencySeconds?: number;
  droppedFrames?: number;
  totalFrames?: number;
  audioTrackName?: string;
}

export interface QualityLevel {
  id: number;
  height: number;
  width: number;
  bitrate: number;
  name: string;
}

export interface AudioTrack {
  id: number;
  name: string;
  lang?: string;
}
