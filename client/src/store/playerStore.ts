import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WatchHistory, MediaType } from '@/types';

interface PlayerState {
  // Current playback
  isPlaying: boolean;
  currentMedia: {
    mediaType: MediaType;
    tmdbId: number;
    title: string;
    season?: number;
    episode?: number;
  } | null;
  streamToken: string | null;

  // Progress
  currentTime: number;
  duration: number;
  progress: number;

  // Settings
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  quality: string;
  isFullscreen: boolean;
  showControls: boolean;

  // Continue watching (local cache)
  continueWatching: WatchHistory[];
}

interface PlayerActions {
  // Playback control
  setPlaying: (playing: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentMedia: (media: PlayerState['currentMedia']) => void;
  setStreamToken: (token: string | null) => void;
  clearPlayer: () => void;

  // Progress
  setProgress: (progress: { currentTime: number; duration: number }) => void;
  updateProgress: (currentTime: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;

  // Settings
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setIsMuted: (muted: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setQuality: (quality: string) => void;
  setFullscreen: (fullscreen: boolean) => void;
  setIsFullscreen: (fullscreen: boolean) => void;
  setShowControls: (show: boolean) => void;

  // Continue watching
  setContinueWatching: (items: WatchHistory[]) => void;
  addToContinueWatching: (item: WatchHistory) => void;
  removeFromContinueWatching: (tmdbId: number, mediaType: MediaType) => void;
}

type PlayerStore = PlayerState & PlayerActions;

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isPlaying: false,
      currentMedia: null,
      streamToken: null,
      currentTime: 0,
      duration: 0,
      progress: 0,
      volume: 1,
      isMuted: false,
      playbackRate: 1,
      quality: 'auto',
      isFullscreen: false,
      showControls: true,
      continueWatching: [],

      // Actions
      setPlaying: (playing) => set({ isPlaying: playing }),
      setIsPlaying: (playing) => set({ isPlaying: playing }),

      setCurrentMedia: (media) => set({ currentMedia: media }),

      setStreamToken: (token) => set({ streamToken: token }),

      clearPlayer: () =>
        set({
          isPlaying: false,
          currentMedia: null,
          streamToken: null,
          currentTime: 0,
          duration: 0,
          progress: 0,
        }),

      setProgress: ({ currentTime, duration }) => {
        const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
        set({ currentTime, duration, progress });
      },

      updateProgress: (currentTime) => {
        const { duration } = get();
        const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
        set({ currentTime, progress });
      },

      setCurrentTime: (time) => set({ currentTime: time }),

      setDuration: (duration) => set({ duration }),

      setVolume: (volume) => set({ volume, isMuted: volume === 0 }),

      toggleMute: () =>
        set((state) => ({
          isMuted: !state.isMuted,
          volume: state.isMuted ? (state.volume || 1) : 0,
        })),

      setIsMuted: (muted) => set({ isMuted: muted }),

      setPlaybackRate: (rate) => set({ playbackRate: rate }),

      setQuality: (quality) => set({ quality }),

      setFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),
      setIsFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),

      setShowControls: (show) => set({ showControls: show }),

      setContinueWatching: (items) => set({ continueWatching: items }),

      addToContinueWatching: (item) =>
        set((state) => {
          // Remove existing entry for same content
          const filtered = state.continueWatching.filter(
            (i) => !(i.tmdbId === item.tmdbId && i.mediaType === item.mediaType)
          );
          // Add to beginning
          return { continueWatching: [item, ...filtered].slice(0, 20) };
        }),

      removeFromContinueWatching: (tmdbId, mediaType) =>
        set((state) => ({
          continueWatching: state.continueWatching.filter(
            (i) => !(i.tmdbId === tmdbId && i.mediaType === mediaType)
          ),
        })),
    }),
    {
      name: 'kaniflix-player',
      partialize: (state) => ({
        volume: state.volume,
        isMuted: state.isMuted,
        playbackRate: state.playbackRate,
        quality: state.quality,
        continueWatching: state.continueWatching,
      }),
    }
  )
);
