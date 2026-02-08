import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Filter, Grid, List } from 'lucide-react';
import { tmdbService } from '@/services';
import { MediaCard } from '@/components/media';
import { Button } from '@/components/ui';
import { cn } from '@/utils';
import type { Movie, TVShow, Genre, PaginatedResponse } from '@/types';

interface BrowsePageProps {
  mediaType: 'movie' | 'tv';
}

const sortOptions = [
  { value: 'popularity.desc', label: 'Most Popular' },
  { value: 'vote_average.desc', label: 'Highest Rated' },
  { value: 'release_date.desc', label: 'Newest First' },
  { value: 'release_date.asc', label: 'Oldest First' },
  { value: 'original_title.asc', label: 'A-Z' },
];

const BrowsePage: React.FC<BrowsePageProps> = ({ mediaType }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  
  const genreParam = searchParams.get('genre');
  const sortParam = searchParams.get('sort') || 'popularity.desc';
  const pageParam = parseInt(searchParams.get('page') || '1');

  // Fetch genres
  const { data: genres } = useQuery({
    queryKey: ['genres', mediaType],
    queryFn: () => 
      mediaType === 'movie' 
        ? tmdbService.getMovieGenres() 
        : tmdbService.getTVGenres(),
  });

  // Fetch content
  const { data, isLoading, isFetching } = useQuery<PaginatedResponse<Movie | TVShow>>({
    queryKey: ['browse', mediaType, genreParam, sortParam, pageParam],
    queryFn: async () => {
      if (genreParam) {
        if (mediaType === 'movie') {
          return tmdbService.getMoviesByGenre(parseInt(genreParam), pageParam);
        }
        return tmdbService.getTVShowsByGenre(parseInt(genreParam), pageParam) as unknown as PaginatedResponse<Movie | TVShow>;
      }
      if (mediaType === 'movie') {
        return tmdbService.getPopularMovies(pageParam);
      }
      return tmdbService.getPopularTV(pageParam) as unknown as PaginatedResponse<Movie | TVShow>;
    },
  });

  const handleGenreChange = (genreId: number | null) => {
    const params = new URLSearchParams(searchParams);
    if (genreId) {
      params.set('genre', genreId.toString());
    } else {
      params.delete('genre');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleSortChange = (sort: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', sort);
    params.set('page', '1');
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedGenre = genres?.find((g: Genre) => g.id === parseInt(genreParam || ''));
  const title = mediaType === 'movie' ? 'Movies' : 'TV Shows';

  return (
    <div className="min-h-screen pt-4 sm:pt-8">
      <div className="container-padding">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
              {selectedGenre ? `${selectedGenre.name} ${title}` : title}
            </h1>
            {data?.total_results && (
              <p className="text-text-muted mt-1 text-sm sm:text-base">
                {data.total_results.toLocaleString()} titles
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* View Mode Toggle */}
            <div className="flex bg-surface rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 sm:p-2 rounded transition-colors',
                  viewMode === 'grid' ? 'bg-white/10' : 'hover:bg-white/5'
                )}
              >
                <Grid className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 sm:p-2 rounded transition-colors',
                  viewMode === 'list' ? 'bg-white/10' : 'hover:bg-white/5'
                )}
              >
                <List className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortParam}
              onChange={(e) => handleSortChange(e.target.value)}
              className="bg-surface border border-surface rounded-lg px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary flex-1 sm:flex-none max-w-[150px] sm:max-w-none"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Filter Toggle */}
            <Button
              variant={showFilters ? 'primary' : 'secondary'}
              onClick={() => setShowFilters(!showFilters)}
              className="hidden md:flex"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 p-6 bg-surface rounded-xl"
          >
            <h3 className="text-lg font-semibold mb-4">Genres</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleGenreChange(null)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  !genreParam
                    ? 'bg-primary text-white'
                    : 'bg-background hover:bg-white/10'
                )}
              >
                All
              </button>
              {genres?.map((genre: Genre) => (
                <button
                  key={genre.id}
                  onClick={() => handleGenreChange(genre.id)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                    parseInt(genreParam || '') === genre.id
                      ? 'bg-primary text-white'
                      : 'bg-background hover:bg-white/10'
                  )}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Genre Pills (Mobile) */}
        <div className="md:hidden mb-4 sm:mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          <button
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors',
              !genreParam ? 'bg-primary text-white' : 'bg-surface hover:bg-white/10'
            )}
            onClick={() => handleGenreChange(null)}
          >
            All
          </button>
          {genres?.slice(0, 10).map((genre: Genre) => (
            <button
              key={genre.id}
              className={cn(
                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors',
                parseInt(genreParam || '') === genre.id ? 'bg-primary text-white' : 'bg-surface hover:bg-white/10'
              )}
              onClick={() => handleGenreChange(genre.id)}
            >
              {genre.name}
            </button>
          ))}
        </div>

        {/* Content Grid */}
        {isLoading ? (
          <div className={cn(
            viewMode === 'grid'
              ? 'media-card-grid'
              : 'grid grid-cols-1 gap-2 sm:gap-4'
          )}>
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-surface rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              viewMode === 'grid'
                ? 'media-card-grid'
                : 'grid grid-cols-1 gap-2 sm:gap-4'
            )}
          >
            {data?.results.map((item: Movie | TVShow) => (
              <MediaCard
                key={item.id}
                item={item}
                variant={viewMode === 'list' ? 'backdrop' : 'poster'}
              />
            ))}
          </motion.div>
        )}

        {/* Empty State */}
        {!isLoading && data?.results.length === 0 && (
          <div className="text-center py-16">
            <h3 className="text-xl font-medium mb-2">No results found</h3>
            <p className="text-text-muted">
              Try adjusting your filters or search for something else.
            </p>
          </div>
        )}

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <Button
              variant="secondary"
              disabled={pageParam === 1 || isFetching}
              onClick={() => handlePageChange(pageParam - 1)}
            >
              Previous
            </Button>

            <div className="flex items-center gap-1">
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, data.total_pages) }, (_, i) => {
                let pageNum;
                if (data.total_pages <= 5) {
                  pageNum = i + 1;
                } else if (pageParam <= 3) {
                  pageNum = i + 1;
                } else if (pageParam >= data.total_pages - 2) {
                  pageNum = data.total_pages - 4 + i;
                } else {
                  pageNum = pageParam - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={cn(
                      'w-10 h-10 rounded-lg font-medium transition-colors',
                      pageNum === pageParam
                        ? 'bg-primary text-white'
                        : 'hover:bg-surface'
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <Button
              variant="secondary"
              disabled={pageParam === data.total_pages || isFetching}
              onClick={() => handlePageChange(pageParam + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowsePage;
