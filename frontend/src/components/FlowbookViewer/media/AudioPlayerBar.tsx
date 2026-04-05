import { GripVertical, Volume2, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { PLAYBACK_SPEEDS, useFlowbookAudioStore } from "../stores";
import { AudioPlayer } from "./AudioPlayer";

export function AudioPlayerBar() {
  const {
    currentSrc,
    volume,
    isMuted,
    playbackRate,
    stop,
    setVolume,
    setPlaybackRate,
    toggleMute,
  } = useFlowbookAudioStore();

  const isVisible = !!currentSrc;

  // --- Drag state ---
  const widgetRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Set initial position when widget becomes visible
  useEffect(() => {
    if (isVisible && !position) {
      // Bottom-center, 80px above the bottom
      setPosition({
        x: Math.round(window.innerWidth / 2 - 200),
        y: window.innerHeight - 120,
      });
    }
    if (!isVisible) {
      setPosition(null);
    }
  }, [isVisible, position]);

  // Clamp position within viewport
  const clamp = useCallback(
    (x: number, y: number) => {
      const w = widgetRef.current?.offsetWidth || 400;
      const h = widgetRef.current?.offsetHeight || 56;
      return {
        x: Math.max(0, Math.min(window.innerWidth - w, x)),
        y: Math.max(0, Math.min(window.innerHeight - h, y)),
      };
    },
    [],
  );

  // Mouse drag handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!widgetRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      const rect = widgetRef.current.getBoundingClientRect();
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const newPos = clamp(
        e.clientX - dragOffset.current.x,
        e.clientY - dragOffset.current.y,
      );
      setPosition(newPos);
    },
    [isDragging, clamp],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    },
    [isDragging],
  );

  const handleEnded = useCallback(() => {
    stop();
  }, [stop]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const cyclePlaybackRate = () => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    setPlaybackRate(PLAYBACK_SPEEDS[nextIndex]);
  };

  if (!isVisible || !position) return null;

  return (
    <div
      ref={widgetRef}
      className={cn(
        "fixed z-50 flex items-center gap-2 rounded-xl px-3 py-2",
        "bg-slate-900/95 backdrop-blur-sm shadow-2xl",
        "ring-1 ring-white/10",
        isDragging ? "cursor-grabbing" : "cursor-default",
        "select-none",
      )}
      style={{
        left: position.x,
        top: position.y,
        minWidth: 360,
        maxWidth: 440,
        touchAction: "none",
      }}
    >
      {/* Drag Handle */}
      <div
        className="flex items-center justify-center cursor-grab active:cursor-grabbing text-white/40 hover:text-white/70 transition-colors shrink-0"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        title="Drag to move"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Main Audio Player */}
      <div className="flex-1 min-w-0">
        <AudioPlayer
          src={currentSrc!}
          volume={isMuted ? 0 : volume}
          playbackRate={playbackRate}
          onEnded={handleEnded}
          autoPlay
          compact
        />
      </div>

      {/* Playback Speed */}
      <button
        type="button"
        onClick={cyclePlaybackRate}
        className={cn(
          "flex h-7 w-11 items-center justify-center rounded shrink-0",
          "bg-white/10 text-xs font-medium text-white",
          "hover:bg-white/20 transition-colors",
        )}
        title="Change playback speed"
      >
        {playbackRate}x
      </button>

      {/* Volume Control */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={toggleMute}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded",
            "text-white hover:bg-white/10 transition-colors",
          )}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="h-3.5 w-3.5" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="h-1 w-16 cursor-pointer accent-cyan-500"
          title={`Volume: ${Math.round(volume * 100)}%`}
        />
      </div>

      {/* Close Button */}
      <button
        type="button"
        onClick={stop}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full shrink-0",
          "text-white/60 hover:text-white hover:bg-white/10 transition-colors",
        )}
        title="Close audio player"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
