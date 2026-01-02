import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Plus, Check, Info, X } from 'lucide-react';
import { cn, getYear } from '@/utils';
import { Image, RatingBadge, MatchBadge } from '@/components/ui';
import type { MediaItem, Movie, TVShow } from '@/types';

interface MediaCardProps {
  item: MediaItem | Movie | TVShow;
  variant?: 'poster' | 'backdrop' | 'featured';
  showInfo?: boolean;
  inWatchlist?: boolean;
  onAddToWatchlist?: () => void;
  onRemoveFromWatchlist?: () => void;
  className?: string;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  variant = 'poster',
  showInfo = true,
  inWatchlist = false,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  className,
}) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = React.useState(false);

  const releaseDate = 'releaseDate' in item ? item.releaseDate : 'firstAirDate' in item ? item.firstAirDate : undefined;
  const year = getYear(releaseDate);
  const matchPercentage = Math.round((item.voteAverage || 0) * 10);

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/watch/${item.mediaType}/${item.id}`);
  };

  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inWatchlist) {
      onRemoveFromWatchlist?.();
    } else {
      onAddToWatchlist?.();
    }
  };

  const cardLink = item.mediaType === 'movie' 
    ? `/movie/${item.id}` 
    : `/tv/${item.id}`;

  if (variant === 'backdrop') {
    return (
      <Link to={cardLink}>
        <motion.div
          className={cn(
            'relative overflow-hidden rounded-md cursor-pointer group',
            'aspect-backdrop',
            className
          )}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.3 }}
        >
          <Image
            src={item.backdropPath || item.posterPath || ''}
            alt={item.title}
            aspectRatio="backdrop"
            className="w-full h-full"
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-semibold text-lg line-clamp-1">{item.title}</h3>
            {showInfo && (
              <div className="flex items-center gap-2 mt-1 text-sm text-text-secondary">
                <RatingBadge rating={item.voteAverage} />
                {year && <span>{year}</span>}
              </div>
            )}
          </div>

          {/* Hover Actions */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center gap-3 bg-black/40"
              >
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handlePlay}
                  className="p-3 bg-white rounded-full text-black"
                >
                  <Play className="w-6 h-6 fill-current" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </Link>
    );
  }

  // Default poster variant
  return (
    <Link to={cardLink}>
      <motion.div
        className={cn(
          'relative overflow-hidden rounded-md cursor-pointer group',
          className
        )}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileHover={{ scale: 1.05, zIndex: 10 }}
        transition={{ duration: 0.3 }}
      >
        <Image
          src={item.posterPath || ''}
          alt={item.title}
          aspectRatio="poster"
          className="w-full"
        />

        {/* Hover overlay */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent flex flex-col justify-end p-3"
            >
              <h3 className="font-semibold text-sm line-clamp-2 mb-2">{item.title}</h3>
              
              <div className="flex items-center gap-2 mb-2">
                <MatchBadge percentage={matchPercentage} className="text-xs" />
                {year && <span className="text-xs text-text-secondary">{year}</span>}
              </div>

              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handlePlay}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white text-black rounded text-sm font-semibold"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Play
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleWatchlistClick}
                  className="p-1.5 bg-surface-hover rounded-full"
                  title={inWatchlist ? 'Remove from list' : 'Add to list'}
                >
                  {inWatchlist ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </motion.button>
                
                <Link
                  to={cardLink}
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 bg-surface-hover rounded-full"
                >
                  <Info className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Link>
  );
};

// Continue Watching Card with progress bar
export const ContinueWatchingCard: React.FC<{
  item: MediaItem & { progress?: number; seasonNumber?: number; episodeNumber?: number };
  className?: string;
  onPlay?: (item: MediaItem & { progress?: number; seasonNumber?: number; episodeNumber?: number }) => void;
  onRemove?: (item: MediaItem & { progress?: number; seasonNumber?: number; episodeNumber?: number }) => void;
}> = ({ item, className, onPlay, onRemove }) => {
  const navigate = useNavigate();

  const handlePlay = () => {
    if (onPlay) {
      onPlay(item);
    } else if (item.mediaType === 'tv' && item.seasonNumber && item.episodeNumber) {
      navigate(`/watch/tv/${item.id}?s=${item.seasonNumber}&e=${item.episodeNumber}`);
    } else {
      navigate(`/watch/${item.mediaType}/${item.id}`);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.(item);
  };

  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded-md cursor-pointer group',
        'aspect-backdrop',
        className
      )}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.3 }}
      onClick={handlePlay}
    >
      <Image
        src={item.backdropPath || item.posterPath || ''}
        alt={item.title}
        aspectRatio="backdrop"
        className="w-full h-full"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      {/* Remove button - top right corner, always visible on hover */}
      {onRemove && (
        <button
          onClick={handleRemove}
          className="absolute top-2 right-2 p-1.5 bg-black/80 hover:bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 hover:scale-110"
          title="Remove from Continue Watching"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      )}

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h3 className="font-semibold text-sm line-clamp-1">{item.title}</h3>
        {item.mediaType === 'tv' && item.seasonNumber && item.episodeNumber && (
          <p className="text-xs text-text-secondary mt-0.5">
            S{item.seasonNumber}:E{item.episodeNumber}
          </p>
        )}
        
        {/* Progress bar */}
        {item.progress !== undefined && (
          <div className="mt-2 h-1 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Play button on hover */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <motion.div
          className="p-3 bg-white/90 rounded-full text-black"
        >
          <Play className="w-8 h-8 fill-current" />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default MediaCard;
