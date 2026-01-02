import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { tmdbService, userContentService } from '@/services';
import { HeroBanner, MediaRow } from '@/components/media';
import { VideoModal } from '@/components/player';
import { useAuthStore } from '@/store';
import type { MediaItem, WatchHistory } from '@/types';

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

  // Fetch continue watching for authenticated users
  const { data: continueWatching, isLoading: continueWatchingLoading } = useQuery({
    queryKey: ['continue-watching'],
    queryFn: () => userContentService.getContinueWatching(20),
    enabled: isAuthenticated,
  });

  // Fetch watchlist status for all items (for + button functionality)
  const { data: watchlistData } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => userContentService.getWatchlist(1, 100),
    enabled: isAuthenticated,
  });

  // Create a set of watchlist item IDs for quick lookup
  const watchlistIds = useMemo(() => {
    const ids = new Set<string>();
    watchlistData?.results?.forEach(item => {
      ids.add(`${item.mediaType}-${item.tmdbId}`);
    });
    return ids;
  }, [watchlistData]);

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

  // Transform continue watching data to MediaItem format
  const continueWatchingItems = useMemo(() => {
    return (continueWatching || []).map((item: WatchHistory) => ({
      id: item.tmdbId,
      title: item.title,
      posterPath: item.posterPath,
      backdropPath: item.backdropPath,
      overview: '',
      voteAverage: 0,
      mediaType: item.mediaType,
      progress: item.progress,
      seasonNumber: item.seasonNumber,
      episodeNumber: item.episodeNumber,
    }));
  }, [continueWatching]);

  // Featured content for hero - rotate every 10 seconds
  const featuredContent = heroItems[featuredIndex];

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
    setIsPlayerOpen(false);
    setPlayingSeason(undefined);
    setPlayingEpisode(undefined);
    // Refresh continue watching after closing player
    queryClient.invalidateQueries({ queryKey: ['continue-watching'] });
  }, [queryClient]);

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

  // Continue watching handler - remove from history
  const handleRemoveFromContinueWatching = useCallback((item: MediaItem) => {
    removeFromHistoryMutation.mutate({ tmdbId: item.id, mediaType: item.mediaType });
  }, [removeFromHistoryMutation]);

  // Determine media type for the playing item
  const playingMediaType = playingItem?.mediaType || (playingItem?.title ? 'movie' : 'tv');

  return (
    <div className="min-h-screen bg-[#141414]">
      {/* Video Player Modal */}
      {playingItem && (
        <VideoModal
          isOpen={isPlayerOpen}
          onClose={handleClosePlayer}
          tmdbId={playingItem.id}
          mediaType={playingMediaType as 'movie' | 'tv'}
          title={(playingItem as any).title || (playingItem as any).name || ''}
          posterPath={playingItem.posterPath || undefined}
          backdropPath={playingItem.backdropPath || undefined}
          season={playingSeason || (playingMediaType === 'tv' ? 1 : undefined)}
          episode={playingEpisode || (playingMediaType === 'tv' ? 1 : undefined)}
        />
      )}

      {/* Hero Banner - Full width, Netflix style */}
      <div className="relative">
        {trendingLoading ? (
          <div className="h-[56.25vw] min-h-[400px] max-h-[100vh] bg-[#141414] animate-pulse" />
        ) : featuredContent ? (
          <HeroBanner
            item={featuredContent}
            onPlay={() => handlePlay(featuredContent)}
            onInfo={() => handleInfo(featuredContent)}
          />
        ) : null}

        {/* Hero indicator dots - Netflix style */}
        {heroItems.length > 1 && (
          <div className="absolute bottom-[30%] right-4 md:right-12 lg:right-16 flex flex-col gap-1">
            {heroItems.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setFeaturedIndex(idx)}
                className={`w-1 h-4 rounded-sm transition-all duration-300 ${
                  idx === featuredIndex ? 'bg-white' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content Rows - Netflix style with overlapping hero */}
      <div className="relative z-10 -mt-[10vw] pb-12 space-y-6 md:space-y-8">
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
          onAddToWatchlist={handleAddToWatchlist}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
          isInWatchlist={isInWatchlist}
        />

        {/* Popular Movies */}
        <MediaRow
          title="Popular on KANIFLIX"
          items={popularMovies?.results || []}
          isLoading={popularMoviesLoading}
          onAddToWatchlist={handleAddToWatchlist}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
          isInWatchlist={isInWatchlist}
        />

        {/* Popular TV Shows */}
        <MediaRow
          title="TV Shows"
          items={popularTV?.results || []}
          isLoading={popularTVLoading}
          onAddToWatchlist={handleAddToWatchlist}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
          isInWatchlist={isInWatchlist}
        />

        {/* Top Rated Movies */}
        <MediaRow
          title="Top 10 Movies Today"
          items={topRatedMovies?.results?.slice(0, 10) || []}
          isLoading={topRatedMoviesLoading}
          onAddToWatchlist={handleAddToWatchlist}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
          isInWatchlist={isInWatchlist}
        />

        {/* Now Playing */}
        <MediaRow
          title="New Releases"
          items={nowPlayingMovies?.results || []}
          isLoading={nowPlayingLoading}
          onAddToWatchlist={handleAddToWatchlist}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
          isInWatchlist={isInWatchlist}
        />

        {/* Top Rated TV Shows */}
        <MediaRow
          title="Top 10 TV Shows Today"
          items={topRatedTV?.results?.slice(0, 10) || []}
          isLoading={topRatedTVLoading}
          onAddToWatchlist={handleAddToWatchlist}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
          isInWatchlist={isInWatchlist}
        />

        {/* Airing Today */}
        <MediaRow
          title="Airing Today"
          items={airingTodayTV?.results || []}
          isLoading={airingTodayLoading}
          onAddToWatchlist={handleAddToWatchlist}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
          isInWatchlist={isInWatchlist}
        />

        {/* Upcoming Movies */}
        <MediaRow
          title="Coming This Week"
          items={upcomingMovies?.results || []}
          isLoading={upcomingLoading}
          onAddToWatchlist={handleAddToWatchlist}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
          isInWatchlist={isInWatchlist}
        />
      </div>
    </div>
  );
};

export default HomePage;
