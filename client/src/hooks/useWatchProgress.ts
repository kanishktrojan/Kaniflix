/**
 * useWatchProgress Hook
 * 
 * Netflix-Grade Watch Progress System
 * 
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                      VidRock iframe                             │
 * │                          │                                      │
 * │        ┌─────────────────┼─────────────────┐                   │
 * │        │                 │                 │                   │
 * │        ▼                 ▼                 ▼                   │
 * │   PLAYER_EVENT      MEDIA_DATA        timeupdate               │
 * │   (play/pause)    (full progress)    (periodic)                │
 * │        │                 │                 │                   │
 * │        └────────────┬────┴─────────────────┘                   │
 * │                     │                                          │
 * │                     ▼                                          │
 * │          ┌──────────────────┐                                  │
 * │          │ useWatchProgress │                                  │
 * │          └──────────────────┘                                  │
 * │                     │                                          │
 * │        ┌────────────┼────────────┐                             │
 * │        ▼            ▼            ▼                             │
 * │   localStorage   in-memory   Backend Sync                      │
 * │   (persistent)   (instant)   (on pause/end/close)              │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * Sync Triggers (Industry Standard):
 * - pause event: User might leave
 * - ended event: Content finished
 * - visibility change: Tab switched/closed
 * - beforeunload: Page closing
 * 
 * Does NOT sync on:
 * - Every timeupdate (too expensive)
 * - play event (no meaningful change)
 * - seeked (handled by MEDIA_DATA)
 */

import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  progressService, 
  queueBackendSync,
  COMPLETION_THRESHOLD,
  MIN_WATCH_TIME,
  type MediaProgress 
} from '@/services/progressService';
import { userContentService } from '@/services';
import { useAuthStore } from '@/store';

// ============================================================================
// TYPES
// ============================================================================

interface WatchProgressOptions {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  seasonNumber?: number;
  episodeNumber?: number;
}

/** Player event from VidRock */
interface PlayerEventData {
  event: 'play' | 'pause' | 'seeked' | 'ended' | 'timeupdate';
  currentTime: number;
  duration: number;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
}

// ============================================================================
// HOOK
// ============================================================================

export function useWatchProgress(options: WatchProgressOptions) {
  const { tmdbId, mediaType, title, posterPath, backdropPath, seasonNumber, episodeNumber } = options;
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  // Refs to track state without re-renders
  const hasMetMinWatchTime = useRef(false);
  const lastSyncedProgress = useRef<number>(0);
  const currentProgress = useRef<{ currentTime: number; duration: number }>({ 
    currentTime: 0, 
    duration: 0 
  });
  // Track current episode being watched (can change during playback)
  const currentEpisodeRef = useRef<{ season?: number; episode?: number }>({
    season: seasonNumber,
    episode: episodeNumber,
  });

  // Update episode ref when options change
  useEffect(() => {
    currentEpisodeRef.current = { season: seasonNumber, episode: episodeNumber };
  }, [seasonNumber, episodeNumber]);

  // ==========================================================================
  // BACKEND SYNC MUTATION (only called on meaningful events)
  // ==========================================================================
  const syncToBackend = useMutation({
    mutationFn: async (data: { currentTime: number; duration: number }) => {
      if (!isAuthenticated) return;
      
      const progressPercent = data.duration > 0 
        ? Math.floor((data.currentTime / data.duration) * 100)
        : 0;

      return userContentService.updateProgress({
        tmdbId,
        mediaType,
        progress: Math.min(progressPercent, 100),
        currentTime: data.currentTime,
        duration: data.duration,
        title,
        posterPath: posterPath || undefined,
        backdropPath: backdropPath || undefined,
        seasonNumber: mediaType === 'tv' ? seasonNumber : undefined,
        episodeNumber: mediaType === 'tv' ? episodeNumber : undefined,
      });
    },
    onSuccess: () => {
      // Invalidate continue watching to reflect updates
      queryClient.invalidateQueries({ queryKey: ['continue-watching'] });
    },
  });

  // Backend sync with dynamic season/episode (used by player events)
  const syncToBackendWithEpisode = useCallback(async (data: { 
    currentTime: number; 
    duration: number; 
    season?: number; 
    episode?: number;
  }) => {
    if (!isAuthenticated) return;
    
    const progressPercent = data.duration > 0 
      ? Math.floor((data.currentTime / data.duration) * 100)
      : 0;

    try {
      await userContentService.updateProgress({
        tmdbId,
        mediaType,
        progress: Math.min(progressPercent, 100),
        currentTime: data.currentTime,
        duration: data.duration,
        title,
        posterPath: posterPath || undefined,
        backdropPath: backdropPath || undefined,
        seasonNumber: mediaType === 'tv' ? (data.season ?? seasonNumber) : undefined,
        episodeNumber: mediaType === 'tv' ? (data.episode ?? episodeNumber) : undefined,
      });
      // Invalidate continue watching to reflect updates
      queryClient.invalidateQueries({ queryKey: ['continue-watching'] });
    } catch (error) {
      console.error('[WatchProgress] Backend sync failed:', error);
    }
  }, [tmdbId, mediaType, title, posterPath, backdropPath, seasonNumber, episodeNumber, isAuthenticated, queryClient]);

  // ==========================================================================
  // RESET ON CONTENT CHANGE
  // ==========================================================================
  useEffect(() => {
    hasMetMinWatchTime.current = false;
    lastSyncedProgress.current = 0;
    currentProgress.current = { currentTime: 0, duration: 0 };
    currentEpisodeRef.current = { season: seasonNumber, episode: episodeNumber };
  }, [tmdbId, seasonNumber, episodeNumber]);

  // ==========================================================================
  // VISIBILITY CHANGE HANDLER (sync when tab becomes hidden)
  // ==========================================================================
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && hasMetMinWatchTime.current && currentProgress.current.duration > 0) {
        const { season, episode } = currentEpisodeRef.current;
        
        // Save to localStorage immediately
        progressService.updateProgress({
          tmdbId,
          mediaType,
          currentTime: currentProgress.current.currentTime,
          duration: currentProgress.current.duration,
          title,
          posterPath,
          backdropPath,
          season,
          episode,
        });
        
        // Sync to backend with current episode info
        if (isAuthenticated) {
          syncToBackendWithEpisode({
            ...currentProgress.current,
            season,
            episode,
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [tmdbId, mediaType, title, posterPath, backdropPath, isAuthenticated, syncToBackendWithEpisode]);

  // ==========================================================================
  // BEFOREUNLOAD HANDLER (sync when page closes)
  // ==========================================================================
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasMetMinWatchTime.current && currentProgress.current.duration > 0) {
        const { season, episode } = currentEpisodeRef.current;
        
        // Save to localStorage (synchronous, will persist)
        progressService.updateProgress({
          tmdbId,
          mediaType,
          currentTime: currentProgress.current.currentTime,
          duration: currentProgress.current.duration,
          title,
          posterPath,
          backdropPath,
          season,
          episode,
        });
        
        // Queue for next session sync (sendBeacon could be used here too)
        const progress = progressService.getProgress(tmdbId, mediaType);
        if (progress) {
          queueBackendSync(progress);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [tmdbId, mediaType, title, posterPath, backdropPath]);

  // ==========================================================================
  // PLAYER EVENT HANDLER (from VidRock postMessage)
  // ==========================================================================
  const handlePlayerEvent = useCallback((eventData: PlayerEventData) => {
    const { event, currentTime, duration, season, episode } = eventData;
    
    // Use season/episode from event if available, otherwise fall back to options
    const currentSeason = season ?? seasonNumber;
    const currentEpisode = episode ?? episodeNumber;
    
    // Update refs for use in visibility/beforeunload handlers
    currentProgress.current = { currentTime, duration };
    currentEpisodeRef.current = { season: currentSeason, episode: currentEpisode };
    
    // Calculate progress percentage
    const progressPercent = duration > 0 ? currentTime / duration : 0;
    
    // =======================================================================
    // RULE 1: Track minimum watch time (prevent accidental clicks)
    // =======================================================================
    if (!hasMetMinWatchTime.current && currentTime >= MIN_WATCH_TIME) {
      hasMetMinWatchTime.current = true;
      console.log('[WatchProgress] Minimum watch time reached, tracking started');
    }

    // Only proceed if we've met minimum watch time
    if (!hasMetMinWatchTime.current) return;

    // =======================================================================
    // Update localStorage on every meaningful progress change
    // (localStorage writes are cheap, this ensures persistence)
    // =======================================================================
    if (event === 'timeupdate' || event === 'seeked') {
      progressService.updateProgress({
        tmdbId,
        mediaType,
        currentTime,
        duration,
        title,
        posterPath,
        backdropPath,
        season: currentSeason,
        episode: currentEpisode,
      });
    }

    // =======================================================================
    // RULE 2: PAUSE - Sync to backend (user might be leaving)
    // =======================================================================
    if (event === 'pause') {
      console.log('[WatchProgress] Paused - syncing to backend');
      
      if (isAuthenticated) {
        syncToBackendWithEpisode({ currentTime, duration, season: currentSeason, episode: currentEpisode });
      }
      lastSyncedProgress.current = currentTime;
    }

    // =======================================================================
    // RULE 3: ENDED or COMPLETION_THRESHOLD reached
    // =======================================================================
    if (event === 'ended' || progressPercent >= COMPLETION_THRESHOLD) {
      console.log('[WatchProgress] Content completed');
      
      // Mark as completed in localStorage
      progressService.markCompleted(tmdbId, mediaType, currentSeason, currentEpisode);
      
      // Sync to backend
      if (isAuthenticated) {
        syncToBackendWithEpisode({ currentTime, duration, season: currentSeason, episode: currentEpisode });
      }
    }
  }, [tmdbId, mediaType, title, posterPath, backdropPath, seasonNumber, episodeNumber, isAuthenticated]);

  // ==========================================================================
  // MEDIA_DATA HANDLER (from VidRock - full progress snapshot)
  // This is the PRIMARY data source from VidRock's Continue Watching feature
  // ==========================================================================
  const handleMediaData = useCallback((data: MediaProgress) => {
    console.log('[WatchProgress] Received MEDIA_DATA:', data);
    
    // Update localStorage with full data from VidRock
    progressService.updateFromMediaData(data);
    
    // Check if we should mark minimum watch time as met
    if (data.progress.watched >= MIN_WATCH_TIME) {
      hasMetMinWatchTime.current = true;
    }
    
    // Update current progress ref
    currentProgress.current = {
      currentTime: data.progress.watched,
      duration: data.progress.duration,
    };
  }, []);

  // ==========================================================================
  // SAVE ON MODAL CLOSE (called by parent component)
  // ==========================================================================
  const saveOnClose = useCallback(() => {
    if (hasMetMinWatchTime.current && currentProgress.current.duration > 0) {
      // Save to localStorage
      progressService.updateProgress({
        tmdbId,
        mediaType,
        currentTime: currentProgress.current.currentTime,
        duration: currentProgress.current.duration,
        title,
        posterPath,
        backdropPath,
        season: seasonNumber,
        episode: episodeNumber,
      });
      
      // Sync to backend
      if (isAuthenticated) {
        syncToBackend.mutate(currentProgress.current);
      }
    }
    
    // Invalidate queries to refresh UI
    queryClient.invalidateQueries({ queryKey: ['continue-watching'] });
  }, [tmdbId, mediaType, title, posterPath, backdropPath, seasonNumber, episodeNumber, isAuthenticated, syncToBackend, queryClient]);

  // ==========================================================================
  // GET RESUME POSITION (for starting playback)
  // ==========================================================================
  const getResumePosition = useCallback((): number => {
    if (mediaType === 'tv' && seasonNumber && episodeNumber) {
      const epProgress = progressService.getEpisodeProgress(tmdbId, seasonNumber, episodeNumber);
      if (epProgress && !progressService.isCompleted(epProgress.progress.watched, epProgress.progress.duration)) {
        return epProgress.progress.watched;
      }
    } else {
      const progress = progressService.getProgress(tmdbId, mediaType);
      if (progress && !progressService.isCompleted(progress.progress.watched, progress.progress.duration)) {
        return progress.progress.watched;
      }
    }
    return 0;
  }, [tmdbId, mediaType, seasonNumber, episodeNumber]);

  return {
    handlePlayerEvent,
    handleMediaData,
    saveOnClose,
    getResumePosition,
    isSyncing: syncToBackend.isPending,
  };
}

export default useWatchProgress;
