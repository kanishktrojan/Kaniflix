import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  SkipForward,
  ArrowLeft,
  Subtitles,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import { cn, formatDuration } from '@/utils';
import { usePlayerStore } from '@/store';

interface VideoPlayerProps {
  src: string;
  title?: string;
  subtitle?: string;
  poster?: string;
  onBack?: () => void;
  onProgressUpdate?: (progress: number, duration: number) => void;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  title,
  subtitle,
  poster,
  onBack,
  onProgressUpdate,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    isPlaying,
    isMuted,
    volume,
    currentTime,
    duration,
    isFullscreen,
    showControls,
    setIsPlaying,
    setIsMuted,
    setVolume,
    setCurrentTime,
    setIsFullscreen,
    setShowControls,
  } = usePlayerStore();

  const [isLoading, setIsLoading] = useState(true);

  // Handle fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, [setIsFullscreen]);

  // Handle mouse movement for controls visibility
  const handleMouseMove = useCallback(() => {
    setShowControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying, setShowControls]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [setIsFullscreen]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          setIsMuted(!isMuted);
          break;
        case 'Escape':
          if (isFullscreen) {
            document.exitFullscreen();
          } else if (onBack) {
            onBack();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setCurrentTime(Math.max(0, currentTime - 10));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setCurrentTime(Math.min(duration, currentTime + 10));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying, isMuted, volume, currentTime, duration, isFullscreen, onBack, setIsPlaying, setIsMuted, setVolume, setCurrentTime, toggleFullscreen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Update progress callback
  useEffect(() => {
    if (onProgressUpdate && currentTime > 0 && duration > 0) {
      onProgressUpdate(currentTime, duration);
    }
  }, [currentTime, duration, onProgressUpdate]);

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
    setIsPlaying(true);
  };

  // Progress percentage
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full bg-black overflow-hidden group',
        isFullscreen && 'fixed inset-0 z-50',
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Iframe (Vidrock embed) */}
      <iframe
        ref={iframeRef}
        src={src}
        className="absolute inset-0 w-full h-full"
        allowFullScreen
        allow="autoplay; encrypted-media; picture-in-picture"
        onLoad={handleIframeLoad}
      />

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black flex items-center justify-center z-10"
          >
            {poster && (
              <img
                src={poster}
                alt={title}
                className="absolute inset-0 w-full h-full object-cover opacity-30"
              />
            )}
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-xl font-medium">{title}</p>
              {subtitle && <p className="text-text-muted mt-1">{subtitle}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Gradient */}
      <motion.div
        initial={false}
        animate={{ opacity: showControls ? 1 : 0 }}
        className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none"
      />

      {/* Bottom Gradient */}
      <motion.div
        initial={false}
        animate={{ opacity: showControls ? 1 : 0 }}
        className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"
      />

      {/* Top Controls */}
      <motion.div
        initial={false}
        animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : -20 }}
        className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20"
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
          <span className="text-lg font-medium hidden md:inline">Back</span>
        </button>

        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-white/10 rounded transition-colors">
            <Subtitles className="w-6 h-6" />
          </button>
          <button className="p-2 hover:bg-white/10 rounded transition-colors">
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </motion.div>

      {/* Center Play/Pause */}
      <motion.div
        initial={false}
        animate={{ opacity: showControls ? 1 : 0 }}
        className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
      >
        <AnimatePresence>
          {!isPlaying && (
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={() => setIsPlaying(true)}
              className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center pointer-events-auto hover:bg-primary transition-colors"
            >
              <Play className="w-10 h-10 ml-1" fill="white" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Bottom Controls */}
      <motion.div
        initial={false}
        animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 20 }}
        className="absolute bottom-0 left-0 right-0 p-4 z-20"
      >
        {/* Title */}
        <div className="mb-4">
          <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
          {subtitle && <p className="text-text-secondary">{subtitle}</p>}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="relative h-1 bg-white/30 rounded-full group/progress cursor-pointer">
            <div
              className="absolute left-0 top-0 h-full bg-primary rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"
              style={{ left: `calc(${progressPercent}% - 8px)` }}
            />
          </div>
          <div className="flex justify-between text-sm text-text-muted mt-1">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            {/* Play/Pause */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 hover:bg-white/10 rounded transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" fill="white" />
              ) : (
                <Play className="w-6 h-6" fill="white" />
              )}
            </button>

            {/* Skip Back */}
            <button
              onClick={() => setCurrentTime(Math.max(0, currentTime - 10))}
              className="p-2 hover:bg-white/10 rounded transition-colors hidden md:block"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Skip Forward */}
            <button
              onClick={() => setCurrentTime(Math.min(duration, currentTime + 10))}
              className="p-2 hover:bg-white/10 rounded transition-colors hidden md:block"
            >
              <RotateCw className="w-5 h-5" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2 group/volume">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 hover:bg-white/10 rounded transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-6 h-6" />
                ) : (
                  <Volume2 className="w-6 h-6" />
                )}
              </button>
              <div className="w-0 group-hover/volume:w-24 overflow-hidden transition-all duration-200">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    setIsMuted(false);
                  }}
                  className="w-24 accent-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Skip Intro (if applicable) */}
            <button className="hidden md:flex items-center gap-2 px-4 py-2 border border-white/50 rounded hover:bg-white/10 transition-colors">
              <SkipForward className="w-4 h-4" />
              Skip Intro
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/10 rounded transition-colors"
            >
              {isFullscreen ? (
                <Minimize className="w-6 h-6" />
              ) : (
                <Maximize className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default VideoPlayer;
