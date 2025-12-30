import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { tmdbService } from '@/services';
import { HeroBanner, MediaRow } from '@/components/media';
import { VideoModal } from '@/components/player';
import { useAuthStore } from '@/store';
import type { MediaItem } from '@/types';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [featuredIndex, setFeaturedIndex] = useState(0);
  
  // Video modal state
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [playingItem, setPlayingItem] = useState<MediaItem | null>(null);

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

  // Featured content for hero - rotate every 10 seconds
  const featuredContent = heroItems[featuredIndex];

  useEffect(() => {
    if (heroItems.length <= 1) return;
    
    const interval = setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % heroItems.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [heroItems.length]);

  const handlePlay = useCallback((item: MediaItem) => {
    if (!isAuthenticated) {
      const mediaType = item.mediaType || (item.title ? 'movie' : 'tv');
      navigate('/login', { state: { from: `/${mediaType}/${item.id}` } });
      return;
    }
    setPlayingItem(item);
    setIsPlayerOpen(true);
  }, [isAuthenticated, navigate]);

  const handleClosePlayer = useCallback(() => {
    setIsPlayerOpen(false);
  }, []);

  const handleInfo = (item: MediaItem) => {
    const mediaType = item.mediaType || (item.title ? 'movie' : 'tv');
    navigate(`/${mediaType}/${item.id}`);
  };

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
          season={playingMediaType === 'tv' ? 1 : undefined}
          episode={playingMediaType === 'tv' ? 1 : undefined}
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
        {/* Trending Now - Use slice to skip hero item */}
        <MediaRow
          title="Trending Now"
          items={trending?.results?.slice(1) || []}
          isLoading={trendingLoading}
        />

        {/* Popular Movies */}
        <MediaRow
          title="Popular on KANIFLIX"
          items={popularMovies?.results || []}
          isLoading={popularMoviesLoading}
        />

        {/* Popular TV Shows */}
        <MediaRow
          title="TV Shows"
          items={popularTV?.results || []}
          isLoading={popularTVLoading}
        />

        {/* Top Rated Movies */}
        <MediaRow
          title="Top 10 Movies Today"
          items={topRatedMovies?.results?.slice(0, 10) || []}
          isLoading={topRatedMoviesLoading}
        />

        {/* Now Playing */}
        <MediaRow
          title="New Releases"
          items={nowPlayingMovies?.results || []}
          isLoading={nowPlayingLoading}
        />

        {/* Top Rated TV Shows */}
        <MediaRow
          title="Top 10 TV Shows Today"
          items={topRatedTV?.results?.slice(0, 10) || []}
          isLoading={topRatedTVLoading}
        />

        {/* Airing Today */}
        <MediaRow
          title="Airing Today"
          items={airingTodayTV?.results || []}
          isLoading={airingTodayLoading}
        />

        {/* Upcoming Movies */}
        <MediaRow
          title="Coming This Week"
          items={upcomingMovies?.results || []}
          isLoading={upcomingLoading}
        />
      </div>
    </div>
  );
};

export default HomePage;
