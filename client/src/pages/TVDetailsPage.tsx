import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Plus,
  Check,
  Star,
  Calendar,
  Tv,
  Download,
  Film,
} from 'lucide-react';
import { tmdbService, userContentService } from '@/services';
import { MediaRow, CastGrid } from '@/components/media';
import { EpisodeList, SeasonSelector, VideoModal } from '@/components/player';
import { Button, Image, Badge, Skeleton, DownloadModal, TrailerPlayer } from '@/components/ui';
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
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isTrailerPlaying, setIsTrailerPlaying] = useState(false);
  const hasAutoPlayedRef = useRef(false); // Track if auto-play already triggered
  const [downloadEpisode, setDownloadEpisode] = useState<{ season: number; episode: number; name?: string }>({ season: 1, episode: 1 });
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

  // Logo URL is now included in TV show details response
  const logoUrl = show?.logoPath || undefined;

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

  // Handle episode download
  const handleEpisodeDownload = useCallback((episode: Episode) => {
    setDownloadEpisode({ season: selectedSeason, episode: episode.episodeNumber, name: episode.name });
    setIsDownloadOpen(true);
  }, [selectedSeason]);

  // Get top cast
  const topCast = credits?.cast?.slice(0, 10);

  // Get trailer from TMDB videos
  const trailer = videos?.results.find(
    (v: Video) => v.type === 'Trailer' && v.site === 'YouTube'
  );
  const trailerKey = trailer?.key;

  // Auto-play trailer after 10 seconds when page loads (only once)
  useEffect(() => {
    if (!trailerKey || hasAutoPlayedRef.current) return;

    const timer = setTimeout(() => {
      hasAutoPlayedRef.current = true;
      setIsTrailerPlaying(true);
    }, 5000); // 5 seconds

    return () => clearTimeout(timer);
  }, [trailerKey]);

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
        onDownload={() => {
          setDownloadEpisode(currentEpisode);
          setIsDownloadOpen(true);
        }}
        onPlayerEvent={handlePlayerEvent}
        onMediaData={handleMediaData}
      />

      {/* Download Modal */}
      <DownloadModal
        isOpen={isDownloadOpen}
        onClose={() => setIsDownloadOpen(false)}
        tmdbId={tmdbId}
        mediaType="tv"
        title={show.title}
        posterPath={show.posterPath || undefined}
        season={downloadEpisode.season}
        episode={downloadEpisode.episode}
        episodeName={downloadEpisode.name}
      />

      {/* Hero Section */}
      <div className="relative h-[75vh] sm:h-[80vh] md:h-[90vh]">
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

        {/* Trailer Player - Hotstar style */}
        <TrailerPlayer
          videoId={trailerKey || ''}
          isPlaying={isTrailerPlaying}
          onClose={() => setIsTrailerPlaying(false)}
          titleLogo={logoUrl}
          title={show.title}
        />

        {/* Content - positioned from bottom like Netflix */}
        <AnimatePresence>
          {!isTrailerPlaying && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              className="absolute bottom-[5%] sm:bottom-[8%] md:bottom-[10%] left-0 right-0 px-4 sm:px-6 md:px-12 lg:px-16"
            >
            <div className="flex flex-col md:flex-row gap-4 sm:gap-6 md:gap-8 items-start md:items-end">
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
                    'font-bold mb-3 sm:mb-4 leading-tight',
                    show.title.length > 30
                      ? 'text-xl sm:text-2xl md:text-3xl lg:text-4xl'
                      : show.title.length > 20
                        ? 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl'
                        : 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl'
                  )}
                >
                  {show.title}
                </h1>

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4 sm:mb-6 text-text-secondary text-sm">
                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" fill="currentColor" />
                    <span className="font-medium text-white">
                      {show.voteAverage?.toFixed(1)}
                    </span>
                    <span className="text-xs sm:text-sm hidden sm:inline">
                      ({show.voteCount?.toLocaleString()} votes)
                    </span>
                  </div>

                  {/* Year */}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>
                      {show.firstAirDate ? new Date(show.firstAirDate).getFullYear() : 'N/A'}
                      {show.status !== 'Ended' ? ' - Present' : show.lastAirDate ? ` - ${new Date(show.lastAirDate).getFullYear()}` : ''}
                    </span>
                  </div>

                  {/* Seasons */}
                  <div className="flex items-center gap-1">
                    <Tv className="w-3 h-3 sm:w-4 sm:h-4" />
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
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6">
                  {show.genres?.map((genre) => (
                    <Badge key={genre.id} variant="genre">
                      {genre.name}
                    </Badge>
                  ))}
                </div>

                {/* Tagline */}
                {show.tagline && (
                  <p className="text-sm sm:text-lg italic text-text-secondary mb-3 sm:mb-4">
                    "{show.tagline}"
                  </p>
                )}

                {/* Overview - max 3 lines */}
                <p className="text-sm sm:text-lg text-text-secondary mb-4 sm:mb-8 line-clamp-2 sm:line-clamp-3">
                  {show.overview}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 sm:gap-4">
                      <Button size="md" onClick={() => handlePlay()} className="sm:px-8">
                        <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" fill="white" />
                        Play S1 E1
                      </Button>

                      <Button
                        size="md"
                        variant="secondary"
                        onClick={handleWatchlistToggle}
                        disabled={addToWatchlist.isPending || removeFromWatchlist.isPending}
                      >
                        {watchlistStatus?.inWatchlist ? (
                          <>
                            <Check className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                            In My List
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                            My List
                          </>
                        )}
                      </Button>

                      <Button
                        size="md"
                        variant="secondary"
                        onClick={() => {
                          setDownloadEpisode({ season: 1, episode: 1 });
                          setIsDownloadOpen(true);
                        }}
                      >
                        <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                        Download
                      </Button>

                      {trailerKey && (
                        <Button
                          size="md"
                          variant="ghost"
                          onClick={() => setIsTrailerPlaying(true)}
                          className="hover:bg-white/10 flex-shrink-0"
                        >
                          <Film className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                          Watch Trailer
                        </Button>
                      )}
                </div>
              </motion.div>
            </div>
          </motion.div>
          )}
        </AnimatePresence>
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
              onDownload={handleEpisodeDownload}
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
