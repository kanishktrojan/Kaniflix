/**
 * Netflix-Grade Watch Progress Service
 * 
 * Architecture: Local-First with Backend Sync
 * 
 * This implements industry-standard streaming progress tracking used by:
 * - Netflix, Prime Video, Disney+, HBO Max
 * 
 * Key Principles:
 * 1. LOCAL-FIRST: localStorage is primary, backend is secondary
 * 2. INSTANT UX: UI never waits for backend
 * 3. EVENT-DRIVEN: Only sync on meaningful events (pause, ended, close)
 * 4. COMPLETION LOGIC: ~90-95% = completed (industry standard)
 * 5. TV SHOW HANDLING: Episode-level tracking with auto-advance
 */

// ============================================================================
// TYPE DEFINITIONS (matching VidRock's MEDIA_DATA format)
// ============================================================================

/** Progress data for a single episode */
export interface EpisodeProgress {
  season: string;
  episode: string;
  progress: {
    watched: number;  // seconds watched
    duration: number; // total duration
  };
  last_updated: number; // timestamp
}

/** Full media progress entry (matches VidRock's format) */
export interface MediaProgress {
  id: number;              // TMDB ID
  type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  progress: {
    watched: number;       // seconds watched (for movies, or current episode for TV)
    duration: number;      // total duration
  };
  last_updated: number;    // timestamp
  
  // TV-specific fields
  number_of_episodes?: number;
  number_of_seasons?: number;
  last_season_watched?: string;
  last_episode_watched?: string;
  show_progress?: Record<string, EpisodeProgress>; // key: "s1e1" format
}

/** Simplified progress for UI (Continue Watching row) */
export interface ContinueWatchingItem {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  progress: number;        // percentage (0-100)
  currentTime: number;     // seconds
  duration: number;        // seconds
  lastUpdated: number;     // timestamp
  // TV-specific
  seasonNumber?: number;
  episodeNumber?: number;
}

// ============================================================================
// CONSTANTS (Industry Standards)
// ============================================================================

const STORAGE_KEY = 'vidRockProgress';
const OLD_STORAGE_KEY = 'kaniflix-progress'; // Legacy key for migration
const BACKEND_SYNC_KEY = 'kaniflix_pending_sync';

/** 
 * Completion threshold - Industry standard is 90-95%
 * Netflix uses ~95%, Prime uses ~90%, Disney+ uses ~92%
 * We use 92% as a balanced approach
 */
export const COMPLETION_THRESHOLD = 0.92;

/**
 * Minimum watch time before tracking (prevents accidental clicks)
 * Industry standard: 5-15 seconds
 */
export const MIN_WATCH_TIME = 5; // seconds

/**
 * Time before content is considered "resumable"
 * If progress is < this, don't show in Continue Watching
 */
export const MIN_RESUME_TIME = 30; // seconds

// ============================================================================
// LOCAL STORAGE LAYER (Primary)
// ============================================================================

class ProgressService {
  private cache: Map<string, MediaProgress> = new Map();

  constructor() {
    this.loadFromStorage();
    this.cleanupCorruptedEntries();
  }

  /** 
   * Extract valid MediaProgress items from potentially corrupted data
   * Handles: arrays, nested arrays, objects with numeric keys
   */
  private extractValidItems(data: any): MediaProgress[] {
    const items: MediaProgress[] = [];
    
    if (!data) return items;
    
    // If it's an array
    if (Array.isArray(data)) {
      for (const item of data) {
        // Nested array like [[...]]
        if (Array.isArray(item)) {
          items.push(...this.extractValidItems(item));
        }
        // Valid MediaProgress object
        else if (item && typeof item === 'object' && item.id && item.type) {
          items.push(item);
        }
      }
    }
    // If it's an object (could be corrupted with numeric keys)
    else if (typeof data === 'object') {
      // Check if it has numeric keys (corrupted Map serialization)
      const keys = Object.keys(data);
      const hasNumericKeys = keys.some(k => /^\d+$/.test(k));
      
      if (hasNumericKeys) {
        // Extract items from numeric keys
        for (const key of keys) {
          if (/^\d+$/.test(key)) {
            const item = data[key];
            if (item && typeof item === 'object' && item.id && item.type) {
              items.push(item);
            }
          }
        }
      }
      // It's a single valid item
      else if (data.id && data.type) {
        items.push(data);
      }
    }
    
    return items;
  }

  /** Load all progress from localStorage into memory cache */
  private loadFromStorage(): void {
    try {
      // Try new key first
      let stored = localStorage.getItem(STORAGE_KEY);
      let needsMigration = false;
      
      // If no data in new key, try old key (migration)
      if (!stored) {
        stored = localStorage.getItem(OLD_STORAGE_KEY);
        if (stored) {
          needsMigration = true;
          console.log('[ProgressService] Migrating from old storage key');
        }
      }
      
      if (stored) {
        const parsed = JSON.parse(stored);
        const items = this.extractValidItems(parsed);
        
        // Dedupe by key (keep most recent)
        const byKey = new Map<string, MediaProgress>();
        for (const item of items) {
          const key = this.getKey(item.id, item.type);
          const existing = byKey.get(key);
          if (!existing || (item.last_updated || 0) > (existing.last_updated || 0)) {
            byKey.set(key, item);
          }
        }
        
        this.cache = byKey;
        
        // If migrated or had corrupted data, save clean version
        if (needsMigration || items.length !== parsed.length) {
          this.saveToStorage();
          // Remove old key after successful migration
          if (needsMigration) {
            localStorage.removeItem(OLD_STORAGE_KEY);
            console.log('[ProgressService] Migration complete, removed old key');
          }
        }
      }
    } catch (error) {
      console.error('[ProgressService] Failed to load from localStorage:', error);
      this.cache.clear();
    }
  }

  /** Remove corrupted entries that lack required progress data */
  private cleanupCorruptedEntries(): void {
    let hasCorrupted = false;
    
    this.cache.forEach((item, key) => {
      // Remove entries without valid progress object
      if (!item.progress || typeof item.progress.watched !== 'number' || typeof item.progress.duration !== 'number') {
        console.warn('[ProgressService] Removing corrupted entry:', key, item);
        this.cache.delete(key);
        hasCorrupted = true;
      }
    });

    // Save cleaned data back to storage
    if (hasCorrupted) {
      this.saveToStorage();
    }
  }

  /** Save memory cache to localStorage */
  private saveToStorage(): void {
    try {
      const data = Array.from(this.cache.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[ProgressService] Failed to save to localStorage:', error);
    }
  }

  /** Generate cache key */
  private getKey(id: number, type: 'movie' | 'tv'): string {
    return `${type}-${id}`;
  }

  /** Generate episode key for TV shows */
  private getEpisodeKey(season: number, episode: number): string {
    return `s${season}e${episode}`;
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Update progress from VidRock MEDIA_DATA event
   * This is the PRIMARY way progress is updated
   */
  updateFromMediaData(data: MediaProgress): void {
    const key = this.getKey(data.id, data.type);
    const existing = this.cache.get(key);

    // Ensure progress object exists with defaults
    const progress = data.progress || existing?.progress || { watched: 0, duration: 0 };

    // Merge with existing data (preserve show_progress for TV)
    const updated: MediaProgress = {
      ...existing,
      ...data,
      progress, // Ensure progress is always defined
      last_updated: Date.now(),
      // For TV shows, merge show_progress
      show_progress: data.type === 'tv' 
        ? { ...existing?.show_progress, ...data.show_progress }
        : undefined,
    };

    this.cache.set(key, updated);
    this.saveToStorage();
  }

  /**
   * Update progress from player events (play, pause, timeupdate, seeked, ended)
   * Used for real-time tracking between MEDIA_DATA events
   */
  updateProgress(params: {
    tmdbId: number;
    mediaType: 'movie' | 'tv';
    currentTime: number;
    duration: number;
    title?: string;
    posterPath?: string | null;
    backdropPath?: string | null;
    season?: number;
    episode?: number;
  }): void {
    const { tmdbId, mediaType, currentTime, duration, title, posterPath, backdropPath, season, episode } = params;
    const key = this.getKey(tmdbId, mediaType);
    const existing = this.cache.get(key);

    // Build updated entry
    const updated: MediaProgress = {
      id: tmdbId,
      type: mediaType,
      title: title || existing?.title || 'Unknown',
      poster_path: posterPath ?? existing?.poster_path ?? null,
      backdrop_path: backdropPath ?? existing?.backdrop_path ?? null,
      progress: {
        watched: currentTime,
        duration: duration,
      },
      last_updated: Date.now(),
    };

    // Handle TV-specific progress
    if (mediaType === 'tv' && season && episode) {
      const episodeKey = this.getEpisodeKey(season, episode);
      updated.last_season_watched = String(season);
      updated.last_episode_watched = String(episode);
      updated.show_progress = {
        ...existing?.show_progress,
        [episodeKey]: {
          season: String(season),
          episode: String(episode),
          progress: { watched: currentTime, duration },
          last_updated: Date.now(),
        },
      };
      // Keep number_of_episodes/seasons if we have them
      updated.number_of_episodes = existing?.number_of_episodes;
      updated.number_of_seasons = existing?.number_of_seasons;
    }

    this.cache.set(key, updated);
    this.saveToStorage();
  }

  /**
   * Get progress for a specific item
   */
  getProgress(tmdbId: number, mediaType: 'movie' | 'tv'): MediaProgress | null {
    return this.cache.get(this.getKey(tmdbId, mediaType)) || null;
  }

  /**
   * Get progress for a specific episode
   */
  getEpisodeProgress(tmdbId: number, season: number, episode: number): EpisodeProgress | null {
    const show = this.cache.get(this.getKey(tmdbId, 'tv'));
    if (!show?.show_progress) return null;
    
    const episodeKey = this.getEpisodeKey(season, episode);
    return show.show_progress[episodeKey] || null;
  }

  /**
   * Calculate completion percentage
   */
  getCompletionPercent(watched: number, duration: number): number {
    if (duration <= 0) return 0;
    return Math.min(100, (watched / duration) * 100);
  }

  /**
   * Check if content is completed (>= COMPLETION_THRESHOLD)
   */
  isCompleted(watched: number, duration: number): boolean {
    if (duration <= 0) return false;
    return (watched / duration) >= COMPLETION_THRESHOLD;
  }

  /**
   * Get Continue Watching list
   * Returns items that:
   * 1. Have been watched for at least MIN_RESUME_TIME
   * 2. Are NOT completed (< COMPLETION_THRESHOLD)
   * 3. Sorted by last_updated (most recent first)
   */
  getContinueWatching(limit: number = 20): ContinueWatchingItem[] {
    const items: ContinueWatchingItem[] = [];

    this.cache.forEach(item => {
      // Safety check - skip items without progress data
      if (!item.progress) return;
      
      const { watched, duration } = item.progress;
      
      // Skip if duration is invalid
      if (!duration || duration <= 0) return;
      
      // Skip if not enough watch time
      if (watched < MIN_RESUME_TIME) return;
      
      // Skip if completed
      if (this.isCompleted(watched, duration)) return;

      // For TV shows, use the last watched episode's progress
      let currentTime = watched;
      let totalDuration = duration;
      let seasonNumber: number | undefined;
      let episodeNumber: number | undefined;

      if (item.type === 'tv' && item.last_season_watched && item.last_episode_watched) {
        seasonNumber = parseInt(item.last_season_watched);
        episodeNumber = parseInt(item.last_episode_watched);
        
        const episodeKey = this.getEpisodeKey(seasonNumber, episodeNumber);
        const epProgress = item.show_progress?.[episodeKey];
        if (epProgress) {
          currentTime = epProgress.progress.watched;
          totalDuration = epProgress.progress.duration;
          
          // Check if this episode is completed
          if (this.isCompleted(currentTime, totalDuration)) {
            // Don't skip - they might want to watch the next episode
            // This will be handled by the UI
          }
        }
      }

      items.push({
        id: item.id,
        type: item.type,
        title: item.title,
        posterPath: item.poster_path,
        backdropPath: item.backdrop_path,
        progress: this.getCompletionPercent(currentTime, totalDuration),
        currentTime,
        duration: totalDuration,
        lastUpdated: item.last_updated,
        seasonNumber,
        episodeNumber,
      });
    });

    // Sort by most recently watched
    items.sort((a, b) => b.lastUpdated - a.lastUpdated);
    
    return items.slice(0, limit);
  }

  /**
   * Mark content as completed (removes from Continue Watching)
   */
  markCompleted(tmdbId: number, mediaType: 'movie' | 'tv', season?: number, episode?: number): void {
    const key = this.getKey(tmdbId, mediaType);
    const existing = this.cache.get(key);
    
    if (!existing) return;

    if (mediaType === 'tv' && season && episode) {
      // Mark specific episode as completed
      const episodeKey = this.getEpisodeKey(season, episode);
      if (existing.show_progress?.[episodeKey]) {
        const duration = existing.show_progress[episodeKey].progress.duration;
        existing.show_progress[episodeKey].progress.watched = duration; // Set to 100%
        existing.show_progress[episodeKey].last_updated = Date.now();
      }
    } else {
      // Mark movie as completed
      existing.progress.watched = existing.progress.duration;
    }

    existing.last_updated = Date.now();
    this.cache.set(key, existing);
    this.saveToStorage();
  }

  /**
   * Remove item from progress (user manually removes from Continue Watching)
   */
  removeProgress(tmdbId: number, mediaType: 'movie' | 'tv'): void {
    const key = this.getKey(tmdbId, mediaType);
    this.cache.delete(key);
    this.saveToStorage();
  }

  /**
   * Clear all progress data
   */
  clearAll(): void {
    this.cache.clear();
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Get all progress data (for backend sync)
   */
  getAllProgress(): MediaProgress[] {
    return Array.from(this.cache.values());
  }

  /**
   * Import progress from backend (on login/initial load)
   * Merges with local data, keeping the most recent
   */
  importFromBackend(data: MediaProgress[]): void {
    data.forEach(item => {
      const key = this.getKey(item.id, item.type);
      const existing = this.cache.get(key);
      
      // Keep whichever is more recent
      if (!existing || item.last_updated > existing.last_updated) {
        this.cache.set(key, item);
      }
    });
    
    this.saveToStorage();
  }
}

// Singleton instance
export const progressService = new ProgressService();

// ============================================================================
// BACKEND SYNC UTILITIES
// ============================================================================

/** Queue a sync operation (called on pause, ended, tab close) */
export function queueBackendSync(item: MediaProgress): void {
  try {
    const pending = JSON.parse(localStorage.getItem(BACKEND_SYNC_KEY) || '[]');
    
    // Replace existing entry for same item or add new
    const index = pending.findIndex((p: MediaProgress) => 
      p.id === item.id && p.type === item.type
    );
    
    if (index >= 0) {
      pending[index] = item;
    } else {
      pending.push(item);
    }
    
    localStorage.setItem(BACKEND_SYNC_KEY, JSON.stringify(pending));
  } catch (error) {
    console.error('[ProgressService] Failed to queue sync:', error);
  }
}

/** Get pending sync items */
export function getPendingSyncs(): MediaProgress[] {
  try {
    return JSON.parse(localStorage.getItem(BACKEND_SYNC_KEY) || '[]');
  } catch {
    return [];
  }
}

/** Clear pending sync queue after successful sync */
export function clearPendingSyncs(): void {
  localStorage.removeItem(BACKEND_SYNC_KEY);
}

export default progressService;
