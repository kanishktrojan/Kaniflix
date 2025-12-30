import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, X, Film, Tv, User } from 'lucide-react';
import { tmdbService } from '@/services';
import { MediaCard } from '@/components/media';
import { Badge } from '@/components/ui';
import { useDebounce } from '@/hooks';
import { cn } from '@/utils';
import type { MediaItem } from '@/types';

type SearchCategory = 'all' | 'movie' | 'tv' | 'person';

const categories: { value: SearchCategory; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'All', icon: Search },
  { value: 'movie', label: 'Movies', icon: Film },
  { value: 'tv', label: 'TV Shows', icon: Tv },
  { value: 'person', label: 'People', icon: User },
];

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const queryParam = searchParams.get('q') || '';
  const categoryParam = (searchParams.get('category') as SearchCategory) || 'all';
  
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [category, setCategory] = useState<SearchCategory>(categoryParam);
  
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Update URL when search changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) {
      params.set('q', debouncedQuery);
    }
    if (category !== 'all') {
      params.set('category', category);
    }
    setSearchParams(params);
  }, [debouncedQuery, category, setSearchParams]);

  // Search query
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', debouncedQuery, category],
    queryFn: () => {
      if (!debouncedQuery) return null;
      
      switch (category) {
        case 'movie':
          return tmdbService.searchMovies(debouncedQuery);
        case 'tv':
          return tmdbService.searchTV(debouncedQuery);
        case 'person':
          return tmdbService.searchPeople(debouncedQuery);
        default:
          return tmdbService.searchMulti(debouncedQuery);
      }
    },
    enabled: debouncedQuery.length > 0,
  });

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchParams({});
  };

  // Filter results by media type for 'all' category
  const getFilteredResults = () => {
    if (!data?.results) return { movies: [], tvShows: [], people: [] };
    
    if (category === 'all') {
      return {
        movies: data.results.filter((item: any) => item.mediaType === 'movie'),
        tvShows: data.results.filter((item: any) => item.mediaType === 'tv'),
        people: data.results.filter((item: any) => item.mediaType === 'person'),
      };
    }
    
    return {
      movies: category === 'movie' ? data.results : [],
      tvShows: category === 'tv' ? data.results : [],
      people: category === 'person' ? data.results : [],
    };
  };

  const { movies, tvShows, people } = getFilteredResults();
  const hasResults = movies.length > 0 || tvShows.length > 0 || people.length > 0;

  return (
    <div className="min-h-screen pt-8">
      <div className="container-padding">
        {/* Search Header */}
        <div className="max-w-3xl mx-auto mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-8">
            Search
          </h1>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for movies, TV shows, people..."
              className="w-full pl-12 pr-12 py-4 bg-surface border border-surface rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex justify-center gap-2 mt-6">
            {categories.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setCategory(value)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  category === value
                    ? 'bg-primary text-white'
                    : 'bg-surface text-text-secondary hover:text-white'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {(isLoading || isFetching) && debouncedQuery && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-surface rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!debouncedQuery && (
          <div className="text-center py-16">
            <Search className="w-16 h-16 mx-auto text-text-muted mb-4" />
            <h3 className="text-xl font-medium mb-2">Start searching</h3>
            <p className="text-text-muted">
              Find your favorite movies, TV shows, and more.
            </p>
          </div>
        )}

        {/* No Results */}
        {debouncedQuery && !isLoading && !hasResults && (
          <div className="text-center py-16">
            <h3 className="text-xl font-medium mb-2">No results found</h3>
            <p className="text-text-muted">
              We couldn't find anything matching "{debouncedQuery}".
              <br />
              Try different keywords or check for typos.
            </p>
          </div>
        )}

        {/* Results */}
        {!isLoading && hasResults && (
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
                  {movies.map((item: MediaItem) => (
                    <MediaCard
                      key={item.id}
                      item={{ ...item, mediaType: 'movie' }}
                    />
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
                  {tvShows.map((item: MediaItem) => (
                    <MediaCard
                      key={item.id}
                      item={{ ...item, mediaType: 'tv' }}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* People */}
            {people.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <User className="w-6 h-6 text-primary" />
                  People
                  <Badge variant="default">{people.length}</Badge>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {people.map((person: any) => (
                    <motion.div
                      key={person.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center group cursor-pointer"
                    >
                      <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2 bg-surface">
                        {person.profilePath ? (
                          <img
                            src={person.profilePath}
                            alt={person.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-12 h-12 text-text-muted" />
                          </div>
                        )}
                      </div>
                      <p className="font-medium line-clamp-1 group-hover:text-primary transition-colors">
                        {person.name}
                      </p>
                      <p className="text-sm text-text-muted line-clamp-1">
                        {person.knownFor}
                      </p>
                    </motion.div>
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

export default SearchPage;
