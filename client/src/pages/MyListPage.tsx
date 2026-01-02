import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, Play, Film, Tv } from 'lucide-react';
import { userContentService } from '@/services';
import { MediaCard } from '@/components/media';
import { VideoModal } from '@/components/player';
import { Button, Badge } from '@/components/ui';
import { useAuthStore } from '@/store';
import type { WatchlistItem, MediaItem } from '@/types';

const MyListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  // Video modal state
  const [isPlayerOpen, setIsPlayerOpen] = React.useState(false);
  const [playingItem, setPlayingItem] = React.useState<WatchlistItem | null>(null);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Fetch watchlist
  const { data: watchlist, isLoading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => userContentService.getWatchlist(),
    enabled: isAuthenticated,
  });

  // Remove from watchlist mutation
  const removeFromWatchlist = useMutation({
    mutationFn: ({ tmdbId, mediaType }: { tmdbId: number; mediaType: 'movie' | 'tv' }) =>
      userContentService.removeFromWatchlist(tmdbId, mediaType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  // Convert WatchlistItem to MediaItem for MediaCard
  const toMediaItem = (item: WatchlistItem): MediaItem => ({
    id: item.tmdbId,
    title: item.title,
    posterPath: item.posterPath,
    backdropPath: item.backdropPath,
    overview: item.overview || '',
    voteAverage: item.voteAverage,
    mediaType: item.mediaType,
  });

  const handlePlay = (item: WatchlistItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlayingItem(item);
    setIsPlayerOpen(true);
  };

  const handleClosePlayer = () => {
    setIsPlayerOpen(false);
    setPlayingItem(null);
  };

  const handleRemove = (item: WatchlistItem, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromWatchlist.mutate({ tmdbId: item.tmdbId, mediaType: item.mediaType });
  };

  // Get items from paginated response
  const items = watchlist?.results || [];
  
  // Filter items by type
  const movies = items.filter((item) => item.mediaType === 'movie');
  const tvShows = items.filter((item) => item.mediaType === 'tv');

  return (
    <div className="min-h-screen pt-8">
      {/* Video Player Modal */}
      {playingItem && (
        <VideoModal
          isOpen={isPlayerOpen}
          onClose={handleClosePlayer}
          tmdbId={playingItem.tmdbId}
          mediaType={playingItem.mediaType}
          title={playingItem.title}
          posterPath={playingItem.posterPath || undefined}
          backdropPath={playingItem.backdropPath || undefined}
          season={playingItem.mediaType === 'tv' ? 1 : undefined}
          episode={playingItem.mediaType === 'tv' ? 1 : undefined}
        />
      )}

      <div className="container-padding">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">My List</h1>
          <p className="text-text-muted">
            {items.length} titles saved
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-surface animate-pulse rounded-md" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && items.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 rounded-full bg-surface flex items-center justify-center mx-auto mb-6">
              <Film className="w-12 h-12 text-text-muted" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Your list is empty</h2>
            <p className="text-text-muted mb-6 max-w-md mx-auto">
              Add movies and TV shows to your list to keep track of what you want to watch.
            </p>
            <Button onClick={() => navigate('/')}>
              Browse Content
            </Button>
          </div>
        )}

        {/* Content */}
        {!isLoading && items.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-12"
          >
            {/* Movies */}
            {movies.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <Film className="w-6 h-6 text-primary" />
                  Movies
                  <Badge variant="default">{movies.length}</Badge>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {movies.map((item) => (
                    <div key={item._id} className="relative group">
                      <MediaCard item={toMediaItem(item)} />
                      {/* Quick Actions */}
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button
                          onClick={(e) => handlePlay(item, e)}
                          className="p-2 bg-primary rounded-full hover:bg-primary-hover transition-colors"
                        >
                          <Play className="w-4 h-4" fill="white" />
                        </button>
                        <button
                          onClick={(e) => handleRemove(item, e)}
                          className="p-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* TV Shows */}
            {tvShows.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <Tv className="w-6 h-6 text-primary" />
                  TV Shows
                  <Badge variant="default">{tvShows.length}</Badge>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {tvShows.map((item) => (
                    <div key={item._id} className="relative group">
                      <MediaCard item={toMediaItem(item)} />
                      {/* Quick Actions */}
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button
                          onClick={(e) => handlePlay(item, e)}
                          className="p-2 bg-primary rounded-full hover:bg-primary-hover transition-colors"
                        >
                          <Play className="w-4 h-4" fill="white" />
                        </button>
                        <button
                          onClick={(e) => handleRemove(item, e)}
                          className="p-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default MyListPage;
