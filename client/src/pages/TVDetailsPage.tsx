import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Play,
  Plus,
  Check,
  Star,
  Calendar,
  Film,
  Tv,
} from 'lucide-react';
import { tmdbService, userContentService } from '@/services';
import { MediaRow, CastGrid } from '@/components/media';
import { EpisodeList, SeasonSelector, VideoModal } from '@/components/player';
import { Button, Image, Badge, Skeleton } from '@/components/ui';
import { useAuthStore } from '@/store';
import { useWatchProgress } from '@/hooks';
import { getImageUrl, formatDate, cn } from '@/utils';
import type { Season, Episode, Video } from '@/types';

const TVDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const tmdbId = parseInt(id || '0');

  const [selectedSeason, setSelectedSeason] = useState(1);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState<{ season: number; episode: number; name?: string }>({ season: 1, episode: 1 });

  // Fetch TV show details
  const { data: show, isLoading } = useQuery({
    queryKey: ['tv', id],
    queryFn: () => tmdbService.getTVDetails(tmdbId),
    enabled: !!id,
  });

  // Netflix-grade progress tracking hook
  const { handlePlayerEvent, handleMediaData, saveOnClose } = useWatchProgress({
    tmdbId,
    mediaType: 'tv',
    title: show?.title || '',
    posterPath: show?.posterPath,
    backdropPath: show?.backdropPath,
    seasonNumber: currentEpisode.season,
    episodeNumber: currentEpisode.episode,
  });

  // Fetch credits
  const { data: credits } = useQuery({
    queryKey: ['tv', id, 'credits'],
    queryFn: () => tmdbService.getTVCredits(parseInt(id!)),
    enabled: !!id,
  });

  // Fetch season details
  const { data: seasonData } = useQuery({
    queryKey: ['tv', id, 'season', selectedSeason],
    queryFn: () => tmdbService.getSeasonDetails(parseInt(id!), selectedSeason),
    enabled: !!id && selectedSeason > 0,
  });

  // Fetch similar shows
  const { data: similar } = useQuery({
    queryKey: ['tv', id, 'similar'],
    queryFn: () => tmdbService.getSimilarTV(parseInt(id!)),
    enabled: !!id,
  });

  // Fetch recommendations
  const { data: recommendations } = useQuery({
    queryKey: ['tv', id, 'recommendations'],
    queryFn: () => tmdbService.getTVRecommendations(parseInt(id!)),
    enabled: !!id,
  });

  // Fetch videos (trailers)
  const { data: videos } = useQuery({
    queryKey: ['tv', id, 'videos'],
    queryFn: () => tmdbService.getTVVideos(parseInt(id!)),
    enabled: !!id,
  });

  // Check if in watchlist
  const { data: watchlistStatus } = useQuery({
    queryKey: ['watchlist', 'tv', id],
    queryFn: () => userContentService.checkWatchlistStatus('tv', parseInt(id!)),
    enabled: isAuthenticated && !!id,
  });

  // Add to watchlist mutation
  const addToWatchlist = useMutation({
    mutationFn: () => userContentService.addToWatchlist({
      tmdbId: parseInt(id!),
      mediaType: 'tv',
      title: show?.title || '',
      posterPath: show?.posterPath,
      backdropPath: show?.backdropPath,
      overview: show?.overview,
      releaseDate: show?.firstAirDate,
      voteAverage: show?.voteAverage,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['watchlist', 'tv', id] });
    },
  });

  // Remove from watchlist mutation
  const removeFromWatchlist = useMutation({
    mutationFn: () => userContentService.removeFromWatchlist(parseInt(id!), 'tv'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['watchlist', 'tv', id] });
    },
  });

  const handlePlay = (episode?: Episode) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/tv/${id}` } });
      return;
    }
    if (episode) {
      setCurrentEpisode({ season: selectedSeason, episode: episode.episodeNumber, name: episode.name });
    } else {
      setCurrentEpisode({ season: 1, episode: 1 });
    }
    setIsPlayerOpen(true);
  };

  const handleClosePlayer = useCallback(() => {
    saveOnClose();
    setIsPlayerOpen(false);
  }, [saveOnClose]);

  const handleEpisodeChange = useCallback((season: number, episode: number) => {
    // Find episode name
    const ep = seasonData?.episodes?.find((e: Episode) => e.episodeNumber === episode);
    setCurrentEpisode({ season, episode, name: ep?.name });
  }, [seasonData]);

  const handleWatchlistToggle = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (watchlistStatus?.inWatchlist) {
      removeFromWatchlist.mutate();
    } else {
      addToWatchlist.mutate();
    }
  };

  // Get trailer
  const trailer = videos?.results.find(
    (v: Video) => v.type === 'Trailer' && v.site === 'YouTube'
  );

  // Get top cast
  const topCast = credits?.cast?.slice(0, 10);

  // Handle season change in modal - only loads episode list, does NOT change current video
  // IMPORTANT: This hook must be defined before any conditional returns
  const handleSeasonChangeInModal = useCallback((newSeason: number) => {
    setSelectedSeason(newSeason);
    // Do NOT change currentEpisode here - user should click an episode to change video
  }, []);

  // Initialize selected season when show loads
  React.useEffect(() => {
    if (show?.seasons) {
      const firstSeason = show.seasons.find((s: Season) => s.seasonNumber > 0);
      if (firstSeason) {
        setSelectedSeason(firstSeason.seasonNumber);
      }
    }
  }, [show]);

  if (isLoading) {
    return <TVDetailsSkeleton />;
  }

  if (!show) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Show not found</h2>
          <p className="text-text-muted mb-4">
            The TV show you're looking for doesn't exist.
          </p>
          <Button onClick={() => navigate('/tv')}>Browse TV Shows</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Video Player Modal with Progress Tracking */}
      <VideoModal
        isOpen={isPlayerOpen}
        onClose={handleClosePlayer}
        tmdbId={tmdbId}
        mediaType="tv"
        title={show.title}
        posterPath={show.posterPath || undefined}
        backdropPath={show.backdropPath || undefined}
        season={currentEpisode.season}
        episode={currentEpisode.episode}
        episodeName={currentEpisode.name}
        seasonData={seasonData}
        seasons={show.seasons}
        onEpisodeChange={handleEpisodeChange}
        onSeasonChange={handleSeasonChangeInModal}
        onPlayerEvent={handlePlayerEvent}
        onMediaData={handleMediaData}
      />

      {/* Hero Section */}
      <div className="relative h-[85vh] md:h-[90vh]">
        {/* Backdrop */}
        <div className="absolute inset-0">
          <Image
            src={getImageUrl(show.backdropPath, 'original')}
            alt={show.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
        </div>

        {/* Content - positioned from bottom like Netflix */}
        <div className="absolute bottom-[8%] md:bottom-[10%] left-0 right-0 px-6 md:px-12 lg:px-16">
          <div className="container-padding">
            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-end">
              {/* Poster */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="hidden md:block flex-shrink-0 w-44 lg:w-56 rounded-xl overflow-hidden shadow-2xl"
              >
                <Image
                  src={getImageUrl(show.posterPath, 'w500')}
                  alt={show.title}
                  className="w-full h-auto"
                />
              </motion.div>

              {/* Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex-1 max-w-3xl"
              >
                {/* Title */}
                <h1 
                  className={cn(
                    'font-bold mb-4 leading-tight',
                    show.title.length > 30 
                      ? 'text-2xl md:text-3xl lg:text-4xl' 
                      : show.title.length > 20 
                        ? 'text-3xl md:text-4xl lg:text-5xl'
                        : 'text-4xl md:text-5xl lg:text-6xl'
                  )}
                >
                  {show.title}
                </h1>

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-4 mb-6 text-text-secondary">
                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-yellow-500" fill="currentColor" />
                    <span className="font-medium text-white">
                      {show.voteAverage?.toFixed(1)}
                    </span>
                    <span className="text-sm">
                      ({show.voteCount?.toLocaleString()} votes)
                    </span>
                  </div>

                  {/* Year */}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {show.firstAirDate ? new Date(show.firstAirDate).getFullYear() : 'N/A'}
                      {show.status !== 'Ended' ? ' - Present' : show.lastAirDate ? ` - ${new Date(show.lastAirDate).getFullYear()}` : ''}
                    </span>
                  </div>

                  {/* Seasons */}
                  <div className="flex items-center gap-1">
                    <Tv className="w-4 h-4" />
                    <span>
                      {show.numberOfSeasons} Season{show.numberOfSeasons !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <Badge variant={show.status === 'Returning Series' ? 'new' : 'default'}>
                    {show.status}
                  </Badge>
                </div>

                {/* Genres */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {show.genres?.map((genre) => (
                    <Badge key={genre.id} variant="genre">
                      {genre.name}
                    </Badge>
                  ))}
                </div>

                {/* Tagline */}
                {show.tagline && (
                  <p className="text-lg italic text-text-secondary mb-4">
                    "{show.tagline}"
                  </p>
                )}

                {/* Overview */}
                <p className="text-lg text-text-secondary mb-8 line-clamp-3 md:line-clamp-none">
                  {show.overview}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" onClick={() => handlePlay()} className="px-8">
                    <Play className="w-5 h-5 mr-2" fill="white" />
                    Play S1 E1
                  </Button>

                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={handleWatchlistToggle}
                    disabled={addToWatchlist.isPending || removeFromWatchlist.isPending}
                  >
                    {watchlistStatus?.inWatchlist ? (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        In My List
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5 mr-2" />
                        My List
                      </>
                    )}
                  </Button>

                  {trailer && (
                    <Button
                      size="lg"
                      variant="ghost"
                      onClick={() => window.open(`https://www.youtube.com/watch?v=${trailer.key}`, '_blank')}
                    >
                      <Film className="w-5 h-5 mr-2" />
                      Watch Trailer
                    </Button>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="container-padding py-12">
        {/* Season & Episodes */}
        <section id="episodes-section" className="mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold">Episodes</h2>
            <SeasonSelector
              seasons={show.seasons || []}
              currentSeason={selectedSeason}
              onSeasonChange={setSelectedSeason}
            />
          </div>

          {seasonData && seasonData.episodes && (
            <EpisodeList
              season={seasonData}
              episodes={seasonData.episodes || []}
              currentEpisode={undefined}
              onEpisodeSelect={handlePlay}
              watchedEpisodes={new Set()}
            />
          )}
        </section>

        {/* Cast */}
        {topCast && topCast.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Cast</h2>
            <CastGrid cast={topCast} maxItems={12} />
          </section>
        )}

        {/* Show Info */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {show.networks && show.networks.length > 0 && (
              <div>
                <h4 className="text-text-muted text-sm mb-1">Network</h4>
                <p className="font-medium">
                  {show.networks.map((n) => n.name).join(', ')}
                </p>
              </div>
            )}
            <div>
              <h4 className="text-text-muted text-sm mb-1">First Air Date</h4>
              <p className="font-medium">{show.firstAirDate ? formatDate(show.firstAirDate) : 'N/A'}</p>
            </div>
            {show.lastAirDate && (
              <div>
                <h4 className="text-text-muted text-sm mb-1">Last Air Date</h4>
                <p className="font-medium">{formatDate(show.lastAirDate)}</p>
              </div>
            )}
            <div>
              <h4 className="text-text-muted text-sm mb-1">Episodes</h4>
              <p className="font-medium">{show.numberOfEpisodes}</p>
            </div>
          </div>
        </section>

        {/* Similar Shows */}
        {similar?.results && similar.results.length > 0 && (
          <MediaRow
            title="More Like This"
            items={similar.results}
            className="mb-8"
          />
        )}

        {/* Recommendations */}
        {recommendations?.results && recommendations.results.length > 0 && (
          <MediaRow
            title="Recommended For You"
            items={recommendations.results}
          />
        )}
      </div>
    </div>
  );
};

// Loading skeleton
const TVDetailsSkeleton: React.FC = () => (
  <div className="min-h-screen">
    <div className="relative h-[70vh] md:h-[80vh] bg-surface animate-pulse">
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
        <div className="flex gap-8">
          <Skeleton className="hidden md:block w-64 h-96 rounded-xl" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <div className="flex gap-4">
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-12 w-32" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default TVDetailsPage;
