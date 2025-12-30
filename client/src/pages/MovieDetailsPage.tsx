import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Play,
  Plus,
  Check,
  Star,
  Clock,
  Calendar,
  Film,
} from 'lucide-react';
import { tmdbService, userContentService } from '@/services';
import { MediaRow, CastGrid } from '@/components/media';
import { VideoModal } from '@/components/player';
import { Button, Image, Badge, Skeleton } from '@/components/ui';
import { useAuthStore } from '@/store';
import { getImageUrl, formatRuntime, formatCurrency, formatDate, cn } from '@/utils';
import type { Video, ProductionCompany } from '@/types';

const MovieDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  // Fetch movie details
  const { data: movie, isLoading } = useQuery({
    queryKey: ['movie', id],
    queryFn: () => tmdbService.getMovieDetails(parseInt(id!)),
    enabled: !!id,
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
    setIsPlayerOpen(false);
  }, []);

  // Handle progress updates for continue watching
  const updateProgress = useMutation({
    mutationFn: ({ progress, duration }: { progress: number; duration: number }) => {
      return userContentService.updateProgress({
        tmdbId: parseInt(id!),
        mediaType: 'movie',
        progress: Math.floor((progress / duration) * 100),
        currentTime: progress,
        duration,
        title: movie?.title || '',
        posterPath: movie?.posterPath,
        backdropPath: movie?.backdropPath,
      });
    },
  });

  const handleProgressUpdate = useCallback((progress: number, duration: number) => {
    if (!isAuthenticated) return;
    // Only save progress every 30 seconds to avoid too many requests
    const progressPercent = (progress / duration) * 100;
    if (progressPercent > 5 && (Math.floor(progress) % 30 === 0 || progressPercent > 90)) {
      updateProgress.mutate({ progress, duration });
    }
  }, [isAuthenticated, updateProgress]);

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

  // Get director
  const director = credits?.crew.find((c: any) => c.job === 'Director');

  // Get top cast
  const topCast = credits?.cast.slice(0, 10);

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
      {/* Video Player Modal */}
      <VideoModal
        isOpen={isPlayerOpen}
        onClose={handleClosePlayer}
        tmdbId={parseInt(id!)}
        mediaType="movie"
        title={movie.title}
        posterPath={movie.posterPath || undefined}
        backdropPath={movie.backdropPath || undefined}
        onProgressUpdate={handleProgressUpdate}
      />

      {/* Hero Section */}
      <div className="relative h-[85vh] md:h-[90vh]">
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
                    'font-bold mb-4 leading-tight',
                    movie.title.length > 30 
                      ? 'text-2xl md:text-3xl lg:text-4xl' 
                      : movie.title.length > 20 
                        ? 'text-3xl md:text-4xl lg:text-5xl'
                        : 'text-4xl md:text-5xl lg:text-6xl'
                  )}
                >
                  {movie.title}
                </h1>

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-4 mb-6 text-text-secondary">
                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-yellow-500" fill="currentColor" />
                    <span className="font-medium text-white">
                      {movie.voteAverage?.toFixed(1)}
                    </span>
                    <span className="text-sm">
                      ({movie.voteCount?.toLocaleString()} votes)
                    </span>
                  </div>

                  {/* Year */}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 'N/A'}</span>
                  </div>

                  {/* Runtime */}
                  {movie.runtime && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatRuntime(movie.runtime)}</span>
                    </div>
                  )}

                  {/* Certification */}
                  <Badge variant="hd">HD</Badge>
                </div>

                {/* Genres */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {movie.genres?.map((genre) => (
                    <Badge key={genre.id} variant="genre">
                      {genre.name}
                    </Badge>
                  ))}
                </div>

                {/* Tagline */}
                {movie.tagline && (
                  <p className="text-lg italic text-text-secondary mb-4">
                    "{movie.tagline}"
                  </p>
                )}

                {/* Overview */}
                <p className="text-lg text-text-secondary mb-8 line-clamp-3 md:line-clamp-none">
                  {movie.overview}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" onClick={handlePlay} className="px-8">
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
