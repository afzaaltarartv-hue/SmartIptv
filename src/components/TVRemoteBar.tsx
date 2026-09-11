import React from 'react';
import { Tv, X, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, CornerDownLeft, Maximize2, Volume2 } from 'lucide-react';

interface TVRemoteBarProps {
  onClose: () => void;
}

export const TVRemoteBar: React.FC<TVRemoteBarProps> = ({ onClose }) => {
  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-4xl rounded-2xl border border-cyan-500/30 bg-black/90 px-4 py-2.5 shadow-2xl backdrop-blur-xl animate-fade-in text-white">
      <div className="flex items-center justify-between gap-4">
        {/* TV Mode Badge */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500 text-black">
            <Tv className="h-4 w-4" />
          </div>
          <div className="hidden sm:block">
            <span className="text-xs font-bold text-cyan-300">Smart TV Remote Active</span>
          </div>
        </div>

        {/* Remote Keys Guidance */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[11px] font-medium text-zinc-300">
          <div className="flex items-center gap-1">
            <span className="flex h-5 items-center justify-center rounded bg-white/10 px-1.5 font-mono text-[10px] text-cyan-300 border border-white/10">
              ▲ / ▼
            </span>
            <span>Vol / Ch</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="flex h-5 items-center justify-center rounded bg-white/10 px-1.5 font-mono text-[10px] text-cyan-300 border border-white/10">
              ◄ / ►
            </span>
            <span>Seek ±10s</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="flex h-5 items-center justify-center rounded bg-white/10 px-1.5 font-mono text-[10px] text-cyan-300 border border-white/10">
              ENTER / OK
            </span>
            <span>Play / Select</span>
          </div>

          <div className="hidden md:flex items-center gap-1">
            <span className="flex h-5 items-center justify-center rounded bg-white/10 px-1.5 font-mono text-[10px] text-cyan-300 border border-white/10">
              [F]
            </span>
            <span>Fullscreen</span>
          </div>

          <div className="hidden md:flex items-center gap-1">
            <span className="flex h-5 items-center justify-center rounded bg-white/10 px-1.5 font-mono text-[10px] text-cyan-300 border border-white/10">
              [M]
            </span>
            <span>Mute</span>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onClose}
          title="Hide Remote Bar"
          className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
