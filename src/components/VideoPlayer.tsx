import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls, { type HlsConfig } from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  SkipForward,
  SkipBack,
  Settings,
  Info,
  Tv,
  Cast,
  PictureInPicture,
  RefreshCw,
  Sliders,
  Sun,
  Zap,
  Activity,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Channel, PlayerSettings, StreamStats, QualityLevel, AudioTrack, AspectRatio } from '../types';
import { audioEngine } from '../services/audioEngine';

interface VideoPlayerProps {
  channel: Channel | null;
  settings: PlayerSettings;
  onUpdateSettings: (newSettings: Partial<PlayerSettings>) => void;
  onNextChannel: () => void;
  onPrevChannel: () => void;
  onToggleFavorite: (channelId: string) => void;
  isFavorite: boolean;
  onOpenEqualizer: () => void;
  onOpenSettings: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  channel,
  settings,
  onUpdateSettings,
  onNextChannel,
  onPrevChannel,
  onToggleFavorite,
  isFavorite,
  onOpenEqualizer,
  onOpenSettings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Audio / Volume & Brightness
  const [volume, setVolume] = useState(settings.volume);
  const [isMuted, setIsMuted] = useState(settings.muted);
  const [brightness, setBrightness] = useState(1.0); // 0.3 to 1.8

  // Gesture HUD states
  const [hudFeedback, setHudFeedback] = useState<{
    type: 'volume' | 'brightness' | 'seek-fwd' | 'seek-back' | 'aspect';
    value?: string | number;
  } | null>(null);
  const hudTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Quality & Audio tracks
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = Auto
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<number>(-1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showStatsOverlay, setShowStatsOverlay] = useState(false);

  // Diagnostics & Stats
  const [stats, setStats] = useState<StreamStats>({
    engine: settings.engine,
    bufferedSeconds: 0,
  });

  // Touch gesture tracker
  const touchStartRef = useRef<{ x: number; y: number; time: number; side: 'left' | 'right' | 'center' } | null>(null);
  const touchLastTapRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Trigger HUD feedback
  const triggerHud = useCallback((type: 'volume' | 'brightness' | 'seek-fwd' | 'seek-back' | 'aspect', value?: string | number) => {
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    setHudFeedback({ type, value });
    hudTimeoutRef.current = setTimeout(() => {
      setHudFeedback(null);
    }, 1200);
  }, []);

  // Show / Hide Controls timeout
  const handleUserActivity = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowQualityMenu(false);
      }
    }, 3500);
  }, [isPlaying]);

  // Clean up Hls instance
  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  // Initialize playback for channel
  const loadStream = useCallback((targetChannel: Channel) => {
    const video = videoRef.current;
    if (!video || !targetChannel.url) return;

    destroyHls();
    setErrorMsg(null);
    setIsBuffering(true);
    setQualityLevels([]);
    setAudioTracks([]);

    const streamUrl = targetChannel.url;

    // Check engine selection
    const preferNative = settings.engine === 'native-html5';
    const canNativePlay = video.canPlayType('application/vnd.apple.mpegurl') || 
                          video.canPlayType('application/x-mpegURL');

    // On iOS Safari / Apple devices (iPhone 12 Pro Max), native HLS is deeply optimized
    if (preferNative || (!Hls.isSupported() && canNativePlay)) {
      video.src = streamUrl;
      video.load();
      video.play().catch(() => {
        // Autoplay policy or error
      });
      setStats((prev) => ({ ...prev, engine: 'Native Browser Engine (Safari HLS)' }));
      return;
    }

    if (Hls.isSupported()) {
      const isLowLatency = settings.engine === 'hls-low-latency' || settings.lowLatencyMode;

      // Precision low-latency HLS configuration
      const hlsConfig: Partial<HlsConfig> = {
        enableWorker: true,
        lowLatencyMode: isLowLatency,
        backBufferLength: 30,
        maxBufferLength: settings.bufferLengthSeconds || 2,
        maxMaxBufferLength: (settings.bufferLengthSeconds || 2) * 2,
        maxBufferSize: 30 * 1000 * 1000, // 30MB
        liveSyncDurationCount: isLowLatency ? 1 : 3,
        liveMaxLatencyDurationCount: isLowLatency ? 3 : 6,
        liveDurationInfinity: true,
        startLevel: -1, // Auto
        manifestLoadingTimeOut: 12000,
        manifestLoadingMaxRetry: 3,
        fragLoadingTimeOut: 15000,
        fragLoadingMaxRetry: 4,
      };

      const hls = new Hls(hlsConfig);
      hlsRef.current = hls;

      hls.attachMedia(video);

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(streamUrl);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setIsBuffering(false);
        // Extract qualities
        if (data.levels && data.levels.length > 0) {
          const levels: QualityLevel[] = data.levels.map((lvl, index) => ({
            id: index,
            height: lvl.height || 0,
            width: lvl.width || 0,
            bitrate: lvl.bitrate || 0,
            name: lvl.height ? `${lvl.height}p` : `Level ${index + 1}`,
          }));
          setQualityLevels(levels);
        }

        video.play().catch((err) => {
          console.warn('Playback requires user gesture', err);
        });
      });

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_event, data) => {
        if (data.audioTracks) {
          const tracks: AudioTrack[] = data.audioTracks.map((t, idx) => ({
            id: idx,
            name: t.name || `Track ${idx + 1}`,
            lang: t.lang,
          }));
          setAudioTracks(tracks);
          setCurrentAudioTrack(hls.audioTrack);
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        const lvl = hls.levels[data.level];
        if (lvl) {
          setStats((prev) => ({
            ...prev,
            currentLevel: data.level,
            totalLevels: hls.levels.length,
            resolution: `${lvl.width}x${lvl.height}`,
            bitrateKbps: Math.round(lvl.bitrate / 1000),
          }));
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.warn('HLS Event Error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setErrorMsg('Network error loading stream. Retrying connection...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setErrorMsg('Media decode error. Recovering stream...');
              hls.recoverMediaError();
              break;
            default:
              // Try native fallback if available
              if (canNativePlay) {
                console.info('Switching to native player fallback');
                destroyHls();
                video.src = streamUrl;
                video.play().catch(() => {});
                setStats((prev) => ({ ...prev, engine: 'Native Fallback' }));
              } else {
                setErrorMsg('Stream failed to load. The stream host may be offline or blocking CORS.');
                setIsBuffering(false);
              }
              break;
          }
        }
      });

      setStats((prev) => ({
        ...prev,
        engine: isLowLatency ? 'HLS.js (Low-Latency)' : 'HLS.js (Balanced Buffer)',
      }));
    } else if (canNativePlay) {
      video.src = streamUrl;
      video.play().catch(() => {});
      setStats((prev) => ({ ...prev, engine: 'Native HTML5 Player' }));
    } else {
      setErrorMsg('This browser does not support HLS playback.');
      setIsBuffering(false);
    }
  }, [settings.engine, settings.lowLatencyMode, settings.bufferLengthSeconds, destroyHls]);

  // Load channel on prop change
  useEffect(() => {
    if (channel) {
      loadStream(channel);
    } else {
      destroyHls();
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
    }
    return () => {
      destroyHls();
    };
  }, [channel, loadStream, destroyHls]);

  // Connect Web Audio Equalizer
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlayForAudio = () => {
      audioEngine.attachToVideo(video, settings.equalizer);
    };

    video.addEventListener('play', handlePlayForAudio);
    return () => {
      video.removeEventListener('play', handlePlayForAudio);
    };
  }, [settings.equalizer]);

  // Sync settings volume and mute
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = isMuted;
  }, [volume, isMuted]);

  // Periodic stats monitor (Buffer health, Latency, FPS)
  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video) return;

      let bufferedSec = 0;
      if (video.buffered.length > 0) {
        const currentTime = video.currentTime;
        for (let i = 0; i < video.buffered.length; i++) {
          if (video.buffered.start(i) <= currentTime && currentTime <= video.buffered.end(i)) {
            bufferedSec = Math.max(0, video.buffered.end(i) - currentTime);
            break;
          }
        }
      }

      let latency = undefined;
      if (hlsRef.current && hlsRef.current.latency) {
        latency = Math.max(0, hlsRef.current.latency);
      }

      // Quality of playback
      const qualityObj = (video as unknown as { getVideoPlaybackQuality?: () => { droppedVideoFrames?: number; totalVideoFrames?: number } }).getVideoPlaybackQuality?.();

      setStats((prev) => ({
        ...prev,
        bufferedSeconds: Number(bufferedSec.toFixed(1)),
        latencySeconds: latency !== undefined ? Number(latency.toFixed(1)) : undefined,
        droppedFrames: qualityObj?.droppedVideoFrames,
        totalFrames: qualityObj?.totalVideoFrames,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Video element events
  const handlePlay = () => {
    setIsPlaying(true);
    setIsBuffering(false);
    setErrorMsg(null);
  };
  const handlePause = () => setIsPlaying(false);
  const handleWaiting = () => setIsBuffering(true);
  const handlePlaying = () => {
    setIsBuffering(false);
    setIsPlaying(true);
  };

  // Toggle Play / Pause
  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  // Toggle Mute
  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    onUpdateSettings({ muted: newMuted });
    triggerHud('volume', newMuted ? 'Muted' : `${Math.round(volume * 100)}%`);
  };

  // Adjust Volume
  const changeVolume = (newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolume(clamped);
    setIsMuted(clamped === 0);
    onUpdateSettings({ volume: clamped, muted: clamped === 0 });
    triggerHud('volume', `${Math.round(clamped * 100)}%`);
  };

  // Adjust Brightness
  const changeBrightness = (newBr: number) => {
    const clamped = Math.max(0.3, Math.min(1.8, newBr));
    setBrightness(clamped);
    triggerHud('brightness', `${Math.round(clamped * 100)}%`);
  };

  // Toggle Aspect Ratio (Fit, Fill / Zoom, 16:9, 4:3, 21:9)
  const cycleAspectRatio = () => {
    const ratios: AspectRatio[] = ['fit', 'fill', '16:9', '4:3', '21:9'];
    const currentIndex = ratios.indexOf(settings.aspectRatio);
    const nextRatio = ratios[(currentIndex + 1) % ratios.length];
    onUpdateSettings({ aspectRatio: nextRatio });
    triggerHud('aspect', nextRatio.toUpperCase());
  };

  // Aspect ratio class mapper
  const getAspectRatioClasses = () => {
    switch (settings.aspectRatio) {
      case 'fill':
        return 'w-full h-full object-cover scale-[1.03]'; // Perfect for iPhone 12 Pro Max edge-to-edge
      case '16:9':
        return 'w-full h-full object-contain aspect-video';
      case '4:3':
        return 'w-full h-full object-contain aspect-[4/3]';
      case '21:9':
        return 'w-full h-full object-contain aspect-[21/9]';
      case 'fit':
      default:
        return 'w-full h-full object-contain';
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    const container = containerRef.current;
    const video = videoRef.current;

    if (!document.fullscreenElement) {
      if (container?.requestFullscreen) {
        container.requestFullscreen().catch(() => {});
      } else if ((video as unknown as { webkitEnterFullscreen?: () => void })?.webkitEnterFullscreen) {
        // iOS Safari fullscreen
        (video as unknown as { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Picture in Picture
  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      } else if ((video as unknown as { webkitSetPresentationMode?: (mode: string) => void })?.webkitSetPresentationMode) {
        // iOS Safari PiP
        (video as unknown as { webkitSetPresentationMode: (mode: string) => void }).webkitSetPresentationMode('picture-in-picture');
      }
    } catch (err) {
      console.warn('PiP error', err);
    }
  };

  // AirPlay support for Apple devices
  const triggerAirPlay = () => {
    const video = videoRef.current;
    if ((video as unknown as { webkitShowPlaybackTargetPicker?: () => void })?.webkitShowPlaybackTargetPicker) {
      (video as unknown as { webkitShowPlaybackTargetPicker: () => void }).webkitShowPlaybackTargetPicker();
    }
  };

  // Touch Gesture Handlers (iPhone 12 Pro Max & mobile optimized)
  const handleTouchStart = (e: React.TouchEvent) => {
    handleUserActivity();
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const side = x < rect.width * 0.4 ? 'left' : x > rect.width * 0.6 ? 'right' : 'center';

    touchStartRef.current = { x, y, time: Date.now(), side };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentY = touch.clientY - rect.top;
    const deltaY = touchStartRef.current.y - currentY; // Positive = swipe up

    // Vertical drag threshold (must drag more than 15px vertically)
    if (Math.abs(deltaY) > 15) {
      const step = (deltaY / rect.height) * 0.05;

      if (touchStartRef.current.side === 'left') {
        // Left side swipe adjusts brightness
        changeBrightness(brightness + step);
      } else if (touchStartRef.current.side === 'right') {
        // Right side swipe adjusts volume
        changeVolume(volume + step);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const now = Date.now();
    const duration = now - touchStartRef.current.time;

    // Check for double tap
    if (touchLastTapRef.current && now - touchLastTapRef.current.time < 300) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = touchLastTapRef.current.x;
        const video = videoRef.current;

        if (x < rect.width * 0.35) {
          // Double tap left: rewind 10s
          if (video) video.currentTime = Math.max(0, video.currentTime - 10);
          triggerHud('seek-back', '-10s');
        } else if (x > rect.width * 0.65) {
          // Double tap right: forward 10s
          if (video) video.currentTime = video.currentTime + 10;
          triggerHud('seek-fwd', '+10s');
        } else {
          // Double tap center: toggle play/pause
          togglePlayPause();
        }
      }
      touchLastTapRef.current = null;
      touchStartRef.current = null;
      return;
    }

    // Record last tap for double-tap detection
    if (duration < 250) {
      touchLastTapRef.current = {
        x: touchStartRef.current.x,
        y: touchStartRef.current.y,
        time: now,
      };
    }

    touchStartRef.current = null;
  };

  // Keyboard navigation & Smart TV Remote support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      handleUserActivity();

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(volume - 0.1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
            triggerHud('seek-back', '-10s');
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime += 10;
            triggerHud('seek-fwd', '+10s');
          }
          break;
        case 'PageUp':
        case 'n':
        case 'N':
          e.preventDefault();
          onNextChannel();
          break;
        case 'PageDown':
        case 'p':
        case 'P':
          e.preventDefault();
          onPrevChannel();
          break;
        case 's':
        case 'S':
          e.preventDefault();
          setShowStatsOverlay((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume, onNextChannel, onPrevChannel, handleUserActivity, triggerHud]);

  // Quality switch handler
  const handleSelectQuality = (lvlId: number) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = lvlId;
    setCurrentQuality(lvlId);
    setShowQualityMenu(false);
  };

  // Audio track switch handler
  const handleSelectAudioTrack = (trackId: number) => {
    if (!hlsRef.current) return;
    hlsRef.current.audioTrack = trackId;
    setCurrentAudioTrack(trackId);
    setShowQualityMenu(false);
  };

  return (
    <div
      ref={containerRef}
      id="video-player-container"
      onMouseMove={handleUserActivity}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full overflow-hidden select-none bg-black transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen' : 'rounded-2xl border border-white/10 shadow-2xl aspect-video max-h-[70vh]'
      }`}
      style={{
        filter: `brightness(${brightness})`,
      }}
    >
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        id="main-video-element"
        playsInline
        webkit-playsinline="true"
        x-webkit-airplay="allow"
        crossOrigin="anonymous"
        onPlay={handlePlay}
        onPause={handlePause}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onClick={togglePlayPause}
        className={`cursor-pointer transition-transform duration-200 ${getAspectRatioClasses()}`}
      />

      {/* Buffering Spinner */}
      {isBuffering && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <div className="absolute h-16 w-16 animate-spin rounded-full border-4 border-amber-500/20 border-t-amber-500"></div>
            <Zap className="h-6 w-6 text-amber-400 animate-pulse" />
          </div>
          <p className="mt-4 text-xs font-semibold text-zinc-300 tracking-wide uppercase">
            Syncing Low-Latency Stream...
          </p>
        </div>
      )}

      {/* Error Message & Reconnect Action */}
      {errorMsg && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mb-3" />
          <h3 className="text-base font-bold text-white mb-1">Stream Error</h3>
          <p className="text-xs text-zinc-400 max-w-md mb-4">{errorMsg}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => channel && loadStream(channel)}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-black shadow-lg hover:bg-amber-400"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry Connection
            </button>
            <button
              onClick={() => {
                const nextEngine = settings.engine === 'native-html5' ? 'hls-low-latency' : 'native-html5';
                onUpdateSettings({ engine: nextEngine });
                if (channel) loadStream(channel);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-zinc-800 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700"
            >
              Switch to {settings.engine === 'native-html5' ? 'HLS Engine' : 'Native Browser Engine'}
            </button>
          </div>
        </div>
      )}

      {/* On-Screen Touch / Gesture Feedback HUD */}
      {hudFeedback && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-black/80 px-5 py-3 shadow-2xl backdrop-blur-md animate-fade-in">
            {hudFeedback.type === 'volume' && <Volume2 className="h-6 w-6 text-amber-400" />}
            {hudFeedback.type === 'brightness' && <Sun className="h-6 w-6 text-amber-400" />}
            {hudFeedback.type === 'seek-back' && <RotateCcw className="h-6 w-6 text-amber-400" />}
            {hudFeedback.type === 'seek-fwd' && <SkipForward className="h-6 w-6 text-amber-400" />}
            {hudFeedback.type === 'aspect' && <Maximize2 className="h-6 w-6 text-amber-400" />}
            <span className="text-base font-bold text-white">{hudFeedback.value}</span>
          </div>
        </div>
      )}

      {/* Diagnostics / Stats for Nerds Overlay */}
      {showStatsOverlay && (
        <div className="absolute top-4 left-4 z-40 rounded-xl border border-white/10 bg-black/90 p-3.5 text-[11px] font-mono text-zinc-300 shadow-2xl backdrop-blur-md max-w-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-amber-400 font-bold">
            <span className="flex items-center gap-1">
              <Activity className="h-3.5 w-3.5" />
              Stream Diagnostics
            </span>
            <button
              onClick={() => setShowStatsOverlay(false)}
              className="text-zinc-500 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-500">Engine:</span>
              <span className="font-semibold text-emerald-400 truncate max-w-[140px]">{stats.engine}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Resolution:</span>
              <span className="text-zinc-200">{stats.resolution || 'Adaptive'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Bitrate:</span>
              <span className="text-zinc-200">{stats.bitrateKbps ? `${stats.bitrateKbps} kbps` : 'Auto'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Buffer Health:</span>
              <span className={`${stats.bufferedSeconds < 1 ? 'text-amber-400' : 'text-emerald-400'} font-bold`}>
                {stats.bufferedSeconds}s
              </span>
            </div>
            {stats.latencySeconds !== undefined && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Live Latency:</span>
                <span className="text-cyan-400 font-bold">{stats.latencySeconds}s</span>
              </div>
            )}
            {stats.droppedFrames !== undefined && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Dropped Frames:</span>
                <span className="text-zinc-300">{stats.droppedFrames} / {stats.totalFrames || 0}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-500">Audio Equalizer:</span>
              <span className={settings.equalizer.enabled ? 'text-amber-400' : 'text-zinc-500'}>
                {settings.equalizer.enabled ? 'Active (Hi-Fi)' : 'Bypassed'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Quality & Audio Track Selector Popover */}
      {showQualityMenu && (
        <div className="absolute bottom-16 right-4 z-40 w-64 rounded-xl border border-white/10 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-lg">
          <div className="mb-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Stream Quality
          </div>
          <div className="space-y-1 mb-3">
            <button
              onClick={() => handleSelectQuality(-1)}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                currentQuality === -1 ? 'bg-amber-500 text-black' : 'text-zinc-300 hover:bg-white/5'
              }`}
            >
              <span>Auto (Adaptive Bitrate)</span>
              {currentQuality === -1 && <CheckCircle2 className="h-3.5 w-3.5" />}
            </button>
            {qualityLevels.map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => handleSelectQuality(lvl.id)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                  currentQuality === lvl.id ? 'bg-amber-500 text-black' : 'text-zinc-300 hover:bg-white/5'
                }`}
              >
                <span>{lvl.name} {lvl.bitrate ? `(${Math.round(lvl.bitrate / 1000)}k)` : ''}</span>
                {currentQuality === lvl.id && <CheckCircle2 className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>

          {audioTracks.length > 1 && (
            <>
              <div className="mb-2 text-xs font-bold text-zinc-400 uppercase tracking-wider border-t border-white/10 pt-2">
                Audio Language
              </div>
              <div className="space-y-1">
                {audioTracks.map((trk) => (
                  <button
                    key={trk.id}
                    onClick={() => handleSelectAudioTrack(trk.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                      currentAudioTrack === trk.id ? 'bg-amber-500 text-black' : 'text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    <span>{trk.name} {trk.lang ? `(${trk.lang})` : ''}</span>
                    {currentAudioTrack === trk.id && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Player Header Overlay (Channel Name & Info Bar) */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          {channel?.logo ? (
            <img
              src={channel.logo}
              alt={channel.name}
              className="h-9 w-9 rounded-lg object-contain bg-zinc-900/80 p-1 border border-white/10"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-bold text-sm border border-amber-500/30">
              {channel?.name?.charAt(0) || 'C'}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white sm:text-base">{channel?.name || 'Select a Channel'}</h2>
              <span className="rounded bg-red-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider animate-pulse">
                LIVE
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              {channel?.group || 'Live Stream'} • {channel?.channelNumber ? `Ch ${channel.channelNumber}` : 'Universal IPTV'}
            </p>
          </div>
        </div>

        {/* Quick Top Right Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setShowStatsOverlay((prev) => !prev)}
            title="Stats for Nerds (Bitrate, Buffer, Latency)"
            className={`rounded-lg p-2 text-xs transition-all ${
              showStatsOverlay ? 'bg-amber-500 text-black' : 'bg-black/40 text-zinc-300 hover:text-white hover:bg-black/60'
            }`}
          >
            <Activity className="h-4 w-4" />
          </button>
          <button
            onClick={onOpenEqualizer}
            title="Audio Equalizer & Sound Enhancer"
            className="rounded-lg bg-black/40 p-2 text-xs text-zinc-300 hover:text-white hover:bg-black/60 transition-all"
          >
            <Sliders className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Center Big Play / Pause Overlay Icon (Visible on pause) */}
      {!isPlaying && !isBuffering && (
        <button
          onClick={togglePlayPause}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-all cursor-pointer"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/90 text-black shadow-2xl transition-transform hover:scale-110 active:scale-95">
            <Play className="h-8 w-8 fill-current ml-1" />
          </div>
        </button>
      )}

      {/* Player Bottom Controls Overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3 sm:p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left Controls: Channel switch, Play/Pause, Volume */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={onPrevChannel}
              title="Previous Channel"
              className="rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
            >
              <SkipBack className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            <button
              onClick={togglePlayPause}
              title={isPlaying ? 'Pause' : 'Play'}
              className="rounded-xl bg-amber-500 p-2 text-black shadow-md hover:bg-amber-400 active:scale-95 transition-all"
            >
              {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={onNextChannel}
              title="Next Channel"
              className="rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
            >
              <SkipForward className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* Live indicator button: click to jump to live edge */}
            <button
              onClick={() => {
                if (videoRef.current && videoRef.current.seekable.length > 0) {
                  videoRef.current.currentTime = videoRef.current.seekable.end(videoRef.current.seekable.length - 1);
                }
              }}
              className="flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-1 text-[11px] font-bold text-white hover:bg-white/20 transition-all"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              LIVE
            </button>

            {/* Volume slider */}
            <div className="hidden sm:flex items-center gap-1.5 ml-2 group">
              <button
                onClick={toggleMute}
                className="rounded-lg p-1.5 text-zinc-300 hover:text-white"
              >
                {isMuted || volume === 0 ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={isMuted ? 0 : volume}
                onChange={(e) => changeVolume(parseFloat(e.target.value))}
                className="w-16 accent-amber-500 h-1 bg-zinc-700 rounded-lg cursor-pointer transition-all"
              />
            </div>
          </div>

          {/* Right Controls: Aspect Ratio, PiP, Quality, Settings, Fullscreen */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Aspect Ratio Toggle (Essential for iPhone 12 Pro Max OLED screen) */}
            <button
              onClick={cycleAspectRatio}
              title={`Aspect Ratio: ${settings.aspectRatio.toUpperCase()}`}
              className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold text-zinc-200 hover:bg-white/20 transition-all"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>{settings.aspectRatio.toUpperCase()}</span>
            </button>

            {/* Quality level switcher */}
            {qualityLevels.length > 0 && (
              <button
                onClick={() => setShowQualityMenu((prev) => !prev)}
                title="Select Stream Quality"
                className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold text-zinc-200 hover:bg-white/20 transition-all"
              >
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span>{currentQuality === -1 ? 'AUTO' : qualityLevels[currentQuality]?.name || 'HD'}</span>
              </button>
            )}

            {/* Picture in Picture */}
            <button
              onClick={togglePiP}
              title="Picture in Picture"
              className="rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
            >
              <PictureInPicture className="h-4 w-4" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              className="rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
