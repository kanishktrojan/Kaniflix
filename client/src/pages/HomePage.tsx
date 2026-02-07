import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { tmdbService, userContentService, progressService } from '@/services';
import { HeroBanner, MediaRow } from '@/components/media';
import { VideoModal } from '@/components/player';
import { useAuthStore } from '@/store';
import { useWatchProgress } from '@/hooks';
import type { MediaItem } from '@/types';

// Helper to enrich minimal data (just tmdbId/mediaType) with TMDB details
interface MinimalHistoryItem {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  progress?: number;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}

interface MinimalWatchlistItem {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  addedAt?: string | Date;
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const [featuredIndex, setFeaturedIndex] = useState(0);

  // Video modal state
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [playingItem, setPlayingItem] = useState<MediaItem | null>(null);
  const [playingSeason, setPlayingSeason] = useState<number | undefined>();
  const [playingEpisode, setPlayingEpisode] = useState<number | undefined>();

  // State to trigger re-computation of local continue watching
  const [localCWVersion, setLocalCWVersion] = useState(0);

  // Determine media type for the playing item
  const playingMediaType = (playingItem?.mediaType || 'movie') as 'movie' | 'tv';

  // Netflix-grade progress tracking hook (local-first with backend sync)
  const { handlePlayerEvent, handleMediaData, saveOnClose } = useWatchProgress({
    tmdbId: playingItem?.id || 0,
    mediaType: playingMediaType,
    title: playingItem?.title || '',
    posterPath: playingItem?.posterPath,
    backdropPath: playingItem?.backdropPath,
    seasonNumber: playingSeason,
    episodeNumber: playingEpisode,
  });

  // ==========================================================================
  // CONTINUE WATCHING - Local-First with Backend Merge
  // Primary: localStorage (instant, offline-capable)
  // Secondary: Backend (cross-device sync for authenticated users)
  // ==========================================================================

  // Get local continue watching instantly
  const localContinueWatching = useMemo(() => {
    return progressService.getContinueWatching(20);
  }, [isPlayerOpen, localCWVersion]); // Refresh when modal closes or item removed

  // Fetch backend continue watching for authenticated users
  const { data: backendContinueWatchingRaw } = useQuery({
    queryKey: ['continue-watching-backend'],
    queryFn: () => userContentService.getContinueWatching(20),
    enabled: isAuthenticated,
    staleTime: 30000, // Cache for 30 seconds (backend sync is secondary)
  });

  // Fetch watchlist status for all items (for + button functionality)
  const { data: watchlistRaw } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => userContentService.getWatchlist(1, 100),
    enabled: isAuthenticated,
  });

  // ==========================================================================
  // CONTINUE WATCHING DATA - Merge local + backend
  // Local data has poster/backdrop from VidRock's MEDIA_DATA
  // Backend data might have different items (from other devices)
  // ==========================================================================

  // Merge local and backend continue watching (deduplicated, most recent wins)
  const mergedContinueWatching = useMemo(() => {
    const itemMap = new Map<string, any>();

    // Add local items first (these have poster/backdrop from VidRock)
    localContinueWatching.forEach(item => {
      const key = `${item.type}-${item.id}`;
      itemMap.set(key, {
        tmdbId: item.id,
        mediaType: item.type,
        title: item.title,
        posterPath: item.posterPath,
        backdropPath: item.backdropPath,
        progress: item.progress,
        seasonNumber: item.seasonNumber,
        episodeNumber: item.episodeNumber,
        lastUpdated: item.lastUpdated,
      });
    });

    // Merge backend items (for cross-device sync)
    if (backendContinueWatchingRaw) {
      backendContinueWatchingRaw.forEach((item: MinimalHistoryItem) => {
        const key = `${item.mediaType}-${item.tmdbId}`;
        const existing = itemMap.get(key);

        // Only add/update if backend is more recent or doesn't exist locally
        if (!existing) {
          itemMap.set(key, {
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
            progress: item.progress,
            seasonNumber: item.seasonNumber,
            episodeNumber: item.episodeNumber,
            // These will be enriched
            title: undefined,
            posterPath: undefined,
            backdropPath: undefined,
          });
        }
      });
    }

    return Array.from(itemMap.values());
  }, [localContinueWatching, backendContinueWatchingRaw]);

  // Enrich continue watching items that don't have TMDB data
  const { data: continueWatching, isLoading: continueWatchingLoading } = useQuery({
    queryKey: ['continue-watching-enriched', mergedContinueWatching],
    queryFn: async () => {
      if (mergedContinueWatching.length === 0) return [];

      const enriched = await Promise.all(
        mergedContinueWatching.map(async (item: any) => {
          // If we already have title (from localStorage), no need to fetch
          if (item.title) {
            return item;
          }

          // Fetch TMDB data for items without metadata
          try {
            const details: any = item.mediaType === 'movie'
              ? await tmdbService.getMovieDetails(item.tmdbId)
              : await tmdbService.getTVDetails(item.tmdbId);

            return {
              ...item,
              title: details.title || 'Unknown',
              posterPath: details.posterPath,
              backdropPath: details.backdropPath,
              overview: details.overview,
              voteAverage: details.voteAverage,
            };
          } catch {
            return {
              ...item,
              title: 'Unknown',
              posterPath: null,
              backdropPath: null,
            };
          }
        })
      );
      return enriched;
    },
    enabled: mergedContinueWatching.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Enrich watchlist with TMDB data (prefetching for potential future use)
  const { data: _watchlistData } = useQuery({
    queryKey: ['watchlist-enriched', watchlistRaw?.results],
    queryFn: async () => {
      const items = watchlistRaw?.results || [];
      if (items.length === 0) return { results: [] };

      const enriched = await Promise.all(
        items.map(async (item: MinimalWatchlistItem) => {
          try {
            const details: any = item.mediaType === 'movie'
              ? await tmdbService.getMovieDetails(item.tmdbId)
              : await tmdbService.getTVDetails(item.tmdbId);

            return {
              ...item,
              title: details.title || 'Unknown',
              posterPath: details.posterPath,
              backdropPath: details.backdropPath,
              overview: details.overview,
              voteAverage: details.voteAverage,
              releaseDate: details.releaseDate || details.firstAirDate,
            };
          } catch {
            return {
              ...item,
              title: 'Unknown',
              posterPath: null,
              backdropPath: null,
            };
          }
        })
      );
      return { results: enriched };
    },
    enabled: !!watchlistRaw?.results && watchlistRaw.results.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Create a set of watchlist item IDs for quick lookup
  const watchlistIds = useMemo(() => {
    const ids = new Set<string>();
    (watchlistRaw?.results || []).forEach((item: MinimalWatchlistItem) => {
      ids.add(`${item.mediaType}-${item.tmdbId}`);
    });
    return ids;
  }, [watchlistRaw?.results]);

  // Add to watchlist mutation
  const addToWatchlistMutation = useMutation({
    mutationFn: (item: MediaItem) => userContentService.addToWatchlist({
      mediaType: item.mediaType,
      tmdbId: item.id,
      title: item.title,
      posterPath: item.posterPath,
      backdropPath: item.backdropPath,
      overview: item.overview,
      releaseDate: 'releaseDate' in item ? (item as any).releaseDate : (item as any).firstAirDate,
      voteAverage: item.voteAverage,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  // Remove from watchlist mutation
  const removeFromWatchlistMutation = useMutation({
    mutationFn: ({ tmdbId, mediaType }: { tmdbId: number; mediaType: 'movie' | 'tv' }) =>
      userContentService.removeFromWatchlist(tmdbId, mediaType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  // Remove from watch history mutation
  const removeFromHistoryMutation = useMutation({
    mutationFn: ({ tmdbId, mediaType }: { tmdbId: number; mediaType: 'movie' | 'tv' }) =>
      userContentService.removeFromHistory(mediaType, tmdbId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['continue-watching'] });
    },
  });

  // Fetch featured content
  const { data: trending, isLoading: trendingLoading } = useQuery({
    queryKey: ['trending'],
    queryFn: () => tmdbService.getTrending('all', 'day'),
  });

  // Fetch movie categories
  const { data: popularMovies, isLoading: popularMoviesLoading } = useQuery({
    queryKey: ['movies', 'popular'],
    queryFn: () => tmdbService.getPopularMovies(),
  });

  const { data: topRatedMovies, isLoading: topRatedMoviesLoading } = useQuery({
    queryKey: ['movies', 'top-rated'],
    queryFn: () => tmdbService.getTopRatedMovies(),
  });

  const { data: nowPlayingMovies, isLoading: nowPlayingLoading } = useQuery({
    queryKey: ['movies', 'now-playing'],
    queryFn: () => tmdbService.getNowPlayingMovies(),
  });

  const { data: upcomingMovies, isLoading: upcomingLoading } = useQuery({
    queryKey: ['movies', 'upcoming'],
    queryFn: () => tmdbService.getUpcomingMovies(),
  });

  // Fetch TV categories
  const { data: popularTV, isLoading: popularTVLoading } = useQuery({
    queryKey: ['tv', 'popular'],
    queryFn: () => tmdbService.getPopularTV(),
  });

  const { data: topRatedTV, isLoading: topRatedTVLoading } = useQuery({
    queryKey: ['tv', 'top-rated'],
    queryFn: () => tmdbService.getTopRatedTV(),
  });

  const { data: airingTodayTV, isLoading: airingTodayLoading } = useQuery({
    queryKey: ['tv', 'airing-today'],
    queryFn: () => tmdbService.getAiringTodayTV(),
  });

  // Get top 5 trending items for hero rotation
  const heroItems = useMemo(() => {
    return trending?.results?.slice(0, 5) || [];
  }, [trending?.results]);

  // Transform continue watching data to MediaItem format (already enriched with TMDB data)
  const continueWatchingItems = useMemo(() => {
    return (continueWatching || []).map((item: any) => ({
      id: item.tmdbId,
      title: item.title || 'Unknown',
      posterPath: item.posterPath,
      backdropPath: item.backdropPath,
      overview: item.overview || '',
      voteAverage: item.voteAverage || 0,
      mediaType: item.mediaType,
      progress: item.progress,
      seasonNumber: item.seasonNumber,
      episodeNumber: item.episodeNumber,
    }));
  }, [continueWatching]);

  // Featured content for hero - rotate every 10 seconds
  const featuredContent = heroItems[featuredIndex];

  // Fetch logo for featured content (details endpoint includes logoPath)
  const { data: featuredDetails } = useQuery({
    queryKey: ['featured-details', featuredContent?.id, featuredContent?.mediaType],
    queryFn: async (): Promise<{ logoPath?: string | null } | null> => {
      if (!featuredContent) return null;
      const mediaType = featuredContent.mediaType || (featuredContent.title ? 'movie' : 'tv');
      const details = mediaType === 'movie'
        ? await tmdbService.getMovieDetails(featuredContent.id)
        : await tmdbService.getTVDetails(featuredContent.id);
      return details as { logoPath?: string | null };
    },
    enabled: !!featuredContent?.id,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  // Get logo path from featured details
  const featuredLogoPath = featuredDetails?.logoPath || null;

  useEffect(() => {
    if (heroItems.length <= 1) return;

    const interval = setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % heroItems.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [heroItems.length]);

  const handlePlay = useCallback((item: MediaItem, season?: number, episode?: number) => {
    if (!isAuthenticated) {
      const mediaType = item.mediaType || (item.title ? 'movie' : 'tv');
      navigate('/login', { state: { from: `/${mediaType}/${item.id}` } });
      return;
    }
    setPlayingItem(item);
    setPlayingSeason(season);
    setPlayingEpisode(episode);
    setIsPlayerOpen(true);
  }, [isAuthenticated, navigate]);

  const handleClosePlayer = useCallback(() => {
    // Save progress before closing
    saveOnClose();
    setIsPlayerOpen(false);
    setPlayingSeason(undefined);
    setPlayingEpisode(undefined);
  }, [saveOnClose]);

  const handleInfo = (item: MediaItem) => {
    const mediaType = item.mediaType || (item.title ? 'movie' : 'tv');
    navigate(`/${mediaType}/${item.id}`);
  };

  // Watchlist handlers
  const handleAddToWatchlist = useCallback((item: MediaItem) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    addToWatchlistMutation.mutate(item);
  }, [isAuthenticated, navigate, addToWatchlistMutation]);

  const handleRemoveFromWatchlist = useCallback((item: MediaItem) => {
    removeFromWatchlistMutation.mutate({ tmdbId: item.id, mediaType: item.mediaType });
  }, [removeFromWatchlistMutation]);

  const isInWatchlist = useCallback((item: MediaItem) => {
    return watchlistIds.has(`${item.mediaType}-${item.id}`);
  }, [watchlistIds]);

  // Continue watching handler - remove from history (both local and backend)
  const handleRemoveFromContinueWatching = useCallback((item: MediaItem) => {
    // Remove from localStorage (instant update)
    progressService.removeProgress(item.id, item.mediaType);

    // Trigger immediate UI update by incrementing version
    setLocalCWVersion(v => v + 1);

    // Remove from backend (async, non-blocking)
    if (isAuthenticated) {
      removeFromHistoryMutation.mutate({ tmdbId: item.id, mediaType: item.mediaType });
    }

    // Also invalidate backend queries for consistency
    queryClient.invalidateQueries({ queryKey: ['continue-watching-backend'] });
    queryClient.invalidateQueries({ queryKey: ['continue-watching-enriched'] });
  }, [isAuthenticated, removeFromHistoryMutation, queryClient]);

  return (
    <div className="min-h-screen bg-[#141414]">
      {/* Video Player Modal with Netflix-grade Progress Tracking */}
      {playingItem && (
        <VideoModal
          isOpen={isPlayerOpen}
          onClose={handleClosePlayer}
          tmdbId={playingItem.id}
          mediaType={playingMediaType}
          title={(playingItem as any).title || (playingItem as any).name || ''}
          posterPath={playingItem.posterPath || undefined}
          backdropPath={playingItem.backdropPath || undefined}
          season={playingSeason || (playingMediaType === 'tv' ? 1 : undefined)}
          episode={playingEpisode || (playingMediaType === 'tv' ? 1 : undefined)}
          onPlayerEvent={handlePlayerEvent}
          onMediaData={handleMediaData}
        />
      )}

      {/* Hero Banner - Full width, Netflix style */}
      <div className="relative">
        {trendingLoading ? (
          <div className="h-[70vw] sm:h-[56.25vw] min-h-[320px] sm:min-h-[400px] max-h-[80vh] lg:max-h-[90vh] bg-[#141414] animate-pulse" />
        ) : featuredContent ? (
          <HeroBanner
            item={featuredContent}
            logoPath={featuredLogoPath}
            onPlay={() => handlePlay(featuredContent)}
            onInfo={() => handleInfo(featuredContent)}
          />
        ) : null}

        {/* Hero indicator dots - Netflix style */}
        {heroItems.length > 1 && (
          <div className="absolute bottom-[18%] sm:bottom-[28%] md:bottom-[30%] right-4 md:right-12 lg:right-16 flex flex-col gap-1">
            {heroItems.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setFeaturedIndex(idx)}
                className={`w-1 h-4 rounded-sm transition-all duration-300 ${idx === featuredIndex ? 'bg-white' : 'bg-gray-600'
                  }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content Rows - Netflix style with overlapping hero */}
      <div className="relative z-10 -mt-8 sm:-mt-[8vw] md:-mt-[10vw] pb-12 space-y-4 sm:space-y-6 md:space-y-8">
        {/* Continue Watching - Only show for authenticated users with history */}
        {isAuthenticated && continueWatchingItems.length > 0 && (
          <MediaRow
            title="Continue Watching"
            items={continueWatchingItems}
            variant="continue"
            isLoading={continueWatchingLoading}
            onPlay={(item) => handlePlay(item, (item as any).seasonNumber, (item as any).episodeNumber)}
            onRemove={handleRemoveFromContinueWatching}
          />
        )}

        {/* Trending Now - Use slice to skip hero item */}
        <MediaRow
          title="Trending Now"
          items={trending?.results?.slice(1) || []}
          isLoading={trendingLoading}
          onPlay={handlePlay}
          onAddToWatchlist={handleAddToWatchlist}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
          isInWatchlist={isInWatchlist}
        />

        {/* Popular Movies */}
        <MediaRow
          title="Popular on KANIFLIX"
          items={popularMovies?.results || []}
          isLoading={popularMoviesLoading}
          onPlay={handlePlay}
          onAddToWatchlist={handleAddToWatchlist}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
          isInWatchlist={isInWatchlist}
        />

        {/* Popular TV Shows */}
        <MediaRow
          title="TV Shows"
          items={popularTV?.results || []}
          isLoading={popularTVLoading}
          onPlay={handlePlay}
          onAddToWatchlist={handleAddToWatchlist}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
          isInWatchlist={isInWatchlist}
        />

        {/* Top Rated Movies */}
        <MediaRow
          title="Top 10 Movies Today"
          items={topRatedMovies?.results?.slice(0, 10) || []}
          isLoading={topRatedMoviesLoading}
          onPlay={handlePlay}
          onAddToWatchlist={handleAddToWatchlist}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
          isInWatchlist={isInWatchlist}
        />

        {/* Now Playing */}
        <MediaRow
          title="New Releases"
          items={nowPlayingMovies?.results || []}
          isLoading={nowPlayingLoading}
          onPlay={handlePlay}
          onAddToWatchlist={handleAddToWatchlist}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
          isInWatchlist={isInWatchlist}
        />

        {/* Top Rated TV Shows */}
        <MediaRow
          title="Top 10 TV Shows Today"
          items={topRatedTV?.results?.slice(0, 10) || []}
          isLoading={topRatedTVLoading}
          onPlay={handlePlay}
          onAddToWatchlist={handleAddToWatchlist}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
          isInWatchlist={isInWatchlist}
        />

        {/* Airing Today */}
        <MediaRow
          title="Airing Today"
          items={airingTodayTV?.results || []}
          isLoading={airingTodayLoading}
          onPlay={handlePlay}
          onAddToWatchlist={handleAddToWatchlist}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
          isInWatchlist={isInWatchlist}
        />

        {/* Upcoming Movies */}
        <MediaRow
          title="Coming This Week"
          items={upcomingMovies?.results || []}
          isLoading={upcomingLoading}
          onPlay={handlePlay}
          onAddToWatchlist={handleAddToWatchlist}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
          isInWatchlist={isInWatchlist}
        />
      </div>
    </div>
  );
};

export default HomePage;
