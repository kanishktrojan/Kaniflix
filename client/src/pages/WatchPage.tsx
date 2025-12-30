import React, { useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, List } from 'lucide-react';
import { tmdbService, userContentService } from '@/services';
import { EmbedPlayer } from '@/components/player';
import { useAuthStore } from '@/store';
import type { Episode, Movie, TVShow } from '@/types';

interface WatchPageProps {
  mediaType: 'movie' | 'tv';
}

const WatchPage: React.FC<WatchPageProps> = ({ mediaType }) => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  // TV-specific params
  const season = parseInt(searchParams.get('season') || '1');
  const episode = parseInt(searchParams.get('episode') || '1');
  const tmdbId = parseInt(id || '0');

  // Fetch content details
  const { data: content, isLoading: contentLoading } = useQuery<Movie | TVShow>({
    queryKey: [mediaType, id, 'details'],
    queryFn: async () => {
      if (mediaType === 'movie') {
        return tmdbService.getMovieDetails(tmdbId);
      }
      return tmdbService.getTVDetails(tmdbId);
    },
    enabled: !!id,
  });

  // Fetch episode details for TV
  const { data: episodeData } = useQuery({
    queryKey: ['tv', id, 'season', season, 'episode', episode],
    queryFn: async () => {
      const seasonData = await tmdbService.getSeasonDetails(tmdbId, season);
      return seasonData.episodes?.find((ep: Episode) => ep.episodeNumber === episode);
    },
    enabled: mediaType === 'tv' && !!id,
  });

  // Fetch season data for navigation
  const { data: seasonData } = useQuery({
    queryKey: ['tv', id, 'season', season],
    queryFn: () => tmdbService.getSeasonDetails(tmdbId, season),
    enabled: mediaType === 'tv' && !!id,
  });

  // Update watch progress mutation
  const updateProgress = useMutation({
    mutationFn: ({ progress, duration }: { progress: number; duration: number }) => {
      const title = content?.title || '';
      return userContentService.updateProgress({
        tmdbId,
        mediaType,
        progress: Math.floor((progress / duration) * 100),
        currentTime: progress,
        duration,
        title,
        posterPath: content?.posterPath,
        backdropPath: content?.backdropPath,
        seasonNumber: mediaType === 'tv' ? season : undefined,
        episodeNumber: mediaType === 'tv' ? episode : undefined,
      });
    },
  });

  // Handle progress updates from the embedded player
  const handleProgressUpdate = useCallback((progress: number, duration: number) => {
    if (!isAuthenticated) return;
    
    // Only save progress every 30 seconds to avoid too many requests
    const progressPercent = (progress / duration) * 100;
    if (progressPercent > 5 && (Math.floor(progress) % 30 === 0 || progressPercent > 90)) {
      updateProgress.mutate({ progress, duration });
    }
  }, [isAuthenticated, updateProgress]);

  // Navigate to previous/next episode
  const navigateEpisode = useCallback((direction: 'prev' | 'next') => {
    if (!seasonData?.episodes) return;

    const currentIndex = seasonData.episodes.findIndex(
      (ep: Episode) => ep.episodeNumber === episode
    );

    if (direction === 'prev' && currentIndex > 0) {
      const prevEp = seasonData.episodes[currentIndex - 1];
      navigate(`/watch/tv/${id}?season=${season}&episode=${prevEp.episodeNumber}`);
    } else if (direction === 'next' && currentIndex < seasonData.episodes.length - 1) {
      const nextEp = seasonData.episodes[currentIndex + 1];
      navigate(`/watch/tv/${id}?season=${season}&episode=${nextEp.episodeNumber}`);
    }
  }, [seasonData, episode, season, id, navigate]);

  // Handle back navigation
  const handleBack = () => {
    navigate(-1);
  };

  // Get title and subtitle
  const title = content?.title || 'Loading...';
  
  const subtitle = mediaType === 'tv' && episodeData
    ? `S${season}:E${episode} - ${episodeData.name}`
    : undefined;

  // Loading state - shows detailed info
  if (contentLoading && !content) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-2">Loading...</h2>
          <p className="text-white/50">Preparing your stream...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Embed Player - Using vidrock.net */}
      <EmbedPlayer
        tmdbId={tmdbId}
        mediaType={mediaType}
        season={mediaType === 'tv' ? season : undefined}
        episode={mediaType === 'tv' ? episode : undefined}
        title={title}
        subtitle={subtitle}
        posterPath={content?.backdropPath || content?.posterPath || undefined}
        onBack={handleBack}
        onProgressUpdate={handleProgressUpdate}
      />

      {/* Episode Navigation (TV only) */}
      {mediaType === 'tv' && seasonData?.episodes && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 bg-black/80 backdrop-blur-sm rounded-full px-4 py-2"
          >
            <button
              onClick={() => navigateEpisode('prev')}
              disabled={episode === seasonData.episodes?.[0]?.episodeNumber}
              className="p-2 hover:bg-white/10 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="text-sm px-4">
              Episode {episode} of {seasonData.episodes?.length || 0}
            </span>

            <button
              onClick={() => navigateEpisode('next')}
              disabled={episode === seasonData.episodes?.[seasonData.episodes.length - 1]?.episodeNumber}
              className="p-2 hover:bg-white/10 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => navigate(`/tv/${id}`)}
              className="p-2 hover:bg-white/10 rounded-full ml-2"
              title="All Episodes"
            >
              <List className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default WatchPage;
