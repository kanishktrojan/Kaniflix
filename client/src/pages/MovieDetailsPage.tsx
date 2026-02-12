import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Plus,
  Check,
  Star,
  Clock,
  Calendar,
  Download,
  Film,
} from 'lucide-react';
import { tmdbService, userContentService } from '@/services';
import { MediaRow, CastGrid } from '@/components/media';
import { VideoModal } from '@/components/player';
import { Button, Image, Badge, Skeleton, DownloadModal, TrailerPlayer } from '@/components/ui';
import { useAuthStore } from '@/store';
import { useWatchProgress } from '@/hooks';
import { getImageUrl, formatRuntime, formatCurrency, formatDate, cn } from '@/utils';
import type { Video, ProductionCompany } from '@/types';

const MovieDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isTrailerPlaying, setIsTrailerPlaying] = useState(false);
  const hasAutoPlayedRef = useRef(false); // Track if auto-play already triggered
  const tmdbId = parseInt(id || '0');

  // Fetch movie details
  const { data: movie, isLoading } = useQuery({
    queryKey: ['movie', id],
    queryFn: () => tmdbService.getMovieDetails(tmdbId),
    enabled: !!id,
  });

  // Netflix-grade progress tracking hook
  const { handlePlayerEvent, handleMediaData, saveOnClose } = useWatchProgress({
    tmdbId,
    mediaType: 'movie',
    title: movie?.title || '',
    posterPath: movie?.posterPath,
    backdropPath: movie?.backdropPath,
  });

  // Fetch credits
  const { data: credits } = useQuery({
    queryKey: ['movie', id, 'credits'],
    queryFn: () => tmdbService.getMovieCredits(parseInt(id!)),
    enabled: !!id,
  });

  // Fetch similar movies
  const { data: similar } = useQuery({
    queryKey: ['movie', id, 'similar'],
    queryFn: () => tmdbService.getSimilarMovies(parseInt(id!)),
    enabled: !!id,
  });

  // Fetch recommendations
  const { data: recommendations } = useQuery({
    queryKey: ['movie', id, 'recommendations'],
    queryFn: () => tmdbService.getMovieRecommendations(parseInt(id!)),
    enabled: !!id,
  });

  // Fetch videos (trailers)
  const { data: videos } = useQuery({
    queryKey: ['movie', id, 'videos'],
    queryFn: () => tmdbService.getMovieVideos(parseInt(id!)),
    enabled: !!id,
  });

  // Logo URL is now included in movie details response
  const logoUrl = movie?.logoPath || undefined;

  // Check if in watchlist
  const { data: watchlistStatus } = useQuery({
    queryKey: ['watchlist', 'movie', id],
    queryFn: () => userContentService.checkWatchlistStatus('movie', parseInt(id!)),
    enabled: isAuthenticated && !!id,
  });

  // Add to watchlist mutation
  const addToWatchlist = useMutation({
    mutationFn: () => userContentService.addToWatchlist({
      tmdbId: parseInt(id!),
      mediaType: 'movie',
      title: movie?.title || '',
      posterPath: movie?.posterPath,
      backdropPath: movie?.backdropPath,
      overview: movie?.overview,
      releaseDate: movie?.releaseDate,
      voteAverage: movie?.voteAverage,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['watchlist', 'movie', id] });
    },
  });

  // Remove from watchlist mutation
  const removeFromWatchlist = useMutation({
    mutationFn: () => userContentService.removeFromWatchlist(parseInt(id!), 'movie'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['watchlist', 'movie', id] });
    },
  });

  const handlePlay = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/movie/${id}` } });
      return;
    }
    setIsPlayerOpen(true);
  };

  const handleClosePlayer = useCallback(() => {
    saveOnClose();
    setIsPlayerOpen(false);
  }, [saveOnClose]);

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

  // Get director
  const director = credits?.crew.find((c: any) => c.job === 'Director');

  // Get top cast
  const topCast = credits?.cast.slice(0, 10);

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

  if (isLoading) {
    return <MovieDetailsSkeleton />;
  }

  if (!movie) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Movie not found</h2>
          <p className="text-text-muted mb-4">
            The movie you're looking for doesn't exist.
          </p>
          <Button onClick={() => navigate('/movies')}>Browse Movies</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Video Player Modal with Netflix-grade Progress Tracking */}
      <VideoModal
        isOpen={isPlayerOpen}
        onClose={handleClosePlayer}
        tmdbId={tmdbId}
        mediaType="movie"
        title={movie.title}
        posterPath={movie.posterPath || undefined}
        backdropPath={movie.backdropPath || undefined}
        onDownload={() => setIsDownloadOpen(true)}
        onPlayerEvent={handlePlayerEvent}
        onMediaData={handleMediaData}
      />

      {/* Download Modal */}
      <DownloadModal
        isOpen={isDownloadOpen}
        onClose={() => setIsDownloadOpen(false)}
        tmdbId={tmdbId}
        mediaType="movie"
        title={movie.title}
        posterPath={movie.posterPath || undefined}
      />

      {/* Hero Section */}
      <div className="relative h-[75vh] sm:h-[80vh] md:h-[90vh]">
        {/* Backdrop */}
        <div className="absolute inset-0">
          <Image
            src={getImageUrl(movie.backdropPath, 'original')}
            alt={movie.title}
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
          title={movie.title}
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
                  src={getImageUrl(movie.posterPath, 'w500')}
                  alt={movie.title}
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
                {/* Title - Dynamic sizing based on length */}
                <h1
                  className={cn(
                    'font-bold mb-3 sm:mb-4 leading-tight',
                    movie.title.length > 30
                      ? 'text-xl sm:text-2xl md:text-3xl lg:text-4xl'
                      : movie.title.length > 20
                        ? 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl'
                        : 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl'
                  )}
                >
                  {movie.title}
                </h1>

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4 sm:mb-6 text-text-secondary text-sm">
                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" fill="currentColor" />
                    <span className="font-medium text-white">
                      {movie.voteAverage?.toFixed(1)}
                    </span>
                    <span className="text-xs sm:text-sm hidden sm:inline">
                      ({movie.voteCount?.toLocaleString()} votes)
                    </span>
                  </div>

                  {/* Year */}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 'N/A'}</span>
                  </div>

                  {/* Runtime */}
                  {movie.runtime && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>{formatRuntime(movie.runtime)}</span>
                    </div>
                  )}

                  {/* Certification */}
                  <Badge variant="hd">HD</Badge>
                </div>

                {/* Genres */}
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6">
                  {movie.genres?.map((genre) => (
                    <Badge key={genre.id} variant="genre">
                      {genre.name}
                    </Badge>
                  ))}
                </div>

                {/* Tagline */}
                {movie.tagline && (
                  <p className="text-sm sm:text-lg italic text-text-secondary mb-3 sm:mb-4">
                    "{movie.tagline}"
                  </p>
                )}

                {/* Overview - max 3 lines */}
                <p className="text-sm sm:text-lg text-text-secondary mb-4 sm:mb-8 line-clamp-2 sm:line-clamp-3">
                  {movie.overview}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 sm:gap-4">
                      <Button size="lg" onClick={handlePlay} className="px-4 sm:px-8 text-sm sm:text-base">
                        <Play className="w-5 h-5 mr-2" fill="white" />
                        Play
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

                      <Button
                        size="lg"
                        variant="secondary"
                        onClick={() => setIsDownloadOpen(true)}
                      >
                        <Download className="w-5 h-5 mr-2" />
                        Download
                      </Button>

                      {trailerKey && (
                        <Button
                          size="lg"
                          variant="ghost"
                          onClick={() => setIsTrailerPlaying(true)}
                          className="hover:bg-white/10 flex-shrink-0"
                        >
                          <Film className="w-5 h-5 mr-2" />
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
        {/* Cast */}
        {topCast && topCast.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Cast</h2>
            <CastGrid cast={topCast} maxItems={12} />
          </section>
        )}

        {/* Movie Info */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {director && (
              <div>
                <h4 className="text-text-muted text-sm mb-1">Director</h4>
                <p className="font-medium">{director.name}</p>
              </div>
            )}
            {movie.productionCompanies && movie.productionCompanies.length > 0 && (
              <div>
                <h4 className="text-text-muted text-sm mb-1">Production</h4>
                <p className="font-medium">
                  {movie.productionCompanies.map((c: ProductionCompany) => c.name).join(', ')}
                </p>
              </div>
            )}
            {movie.budget && movie.budget > 0 && (
              <div>
                <h4 className="text-text-muted text-sm mb-1">Budget</h4>
                <p className="font-medium">{formatCurrency(movie.budget)}</p>
              </div>
            )}
            {movie.revenue && movie.revenue > 0 && (
              <div>
                <h4 className="text-text-muted text-sm mb-1">Revenue</h4>
                <p className="font-medium">{formatCurrency(movie.revenue)}</p>
              </div>
            )}
            <div>
              <h4 className="text-text-muted text-sm mb-1">Release Date</h4>
              <p className="font-medium">{movie.releaseDate ? formatDate(movie.releaseDate) : 'N/A'}</p>
            </div>
          </div>
        </section>

        {/* Similar Movies */}
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
const MovieDetailsSkeleton: React.FC = () => (
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

export default MovieDetailsPage;
