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
  onPlay?: (item: MediaItem | Movie | TVShow) => void;
  onAddToWatchlist?: () => void;
  onRemoveFromWatchlist?: () => void;
  className?: string;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  variant = 'poster',
  showInfo = true,
  inWatchlist = false,
  onPlay,
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
    if (onPlay) {
      onPlay(item);
    } else {
      // Fallback: navigate to details page which has VideoModal
      navigate(`/${item.mediaType}/${item.id}`);
    }
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
          whileHover={{ scale: 1.02 }}
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
        whileHover={{ scale: 1.02, zIndex: 10 }}
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

// Continue Watching Card with progress bar - Netflix Style
export const ContinueWatchingCard: React.FC<{
  item: MediaItem & { progress?: number; seasonNumber?: number; episodeNumber?: number };
  className?: string;
  onPlay?: (item: MediaItem & { progress?: number; seasonNumber?: number; episodeNumber?: number }) => void;
  onRemove?: (item: MediaItem & { progress?: number; seasonNumber?: number; episodeNumber?: number }) => void;
}> = ({ item, className, onPlay, onRemove }) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = React.useState(false);

  const handlePlay = () => {
    if (onPlay) {
      onPlay(item);
    } else {
      // Fallback: go to details page if no onPlay handler
      navigate(`/${item.mediaType}/${item.id}`);
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
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      onClick={handlePlay}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Image
        src={item.backdropPath || item.posterPath || ''}
        alt={item.title}
        aspectRatio="backdrop"
        className="w-full h-full"
      />

      {/* Dark overlay for better contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/10" />

      {/* Remove button - top right corner, Netflix style */}
      {onRemove && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: isHovered ? 1 : 0, 
            scale: isHovered ? 1 : 0.8 
          }}
          transition={{ duration: 0.15 }}
          onClick={handleRemove}
          className="absolute top-2 right-2 p-1 bg-black/70 hover:bg-black rounded-full z-20 border border-white/30 hover:border-white/50"
          title="Remove from Continue Watching"
        >
          <X className="w-4 h-4 text-white" />
        </motion.button>
      )}

      {/* Netflix-style centered play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ scale: 1 }}
          animate={{ 
            scale: isHovered ? 1.15 : 1,
            opacity: isHovered ? 1 : 0.85
          }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative"
        >
          {/* Outer ring */}
          <div className={cn(
            "w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center",
            "bg-black/40 border-2 border-white",
            "transition-all duration-200",
            isHovered && "bg-white border-white"
          )}>
            {/* Play icon */}
            <Play 
              className={cn(
                "w-5 h-5 md:w-6 md:h-6 ml-0.5 transition-colors duration-200",
                isHovered ? "text-black fill-black" : "text-white fill-white"
              )} 
            />
          </div>
        </motion.div>
      </div>

      {/* Content - bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h3 className="font-medium text-sm line-clamp-1 text-white drop-shadow-md">{item.title}</h3>
        {item.mediaType === 'tv' && item.seasonNumber && item.episodeNumber && (
          <p className="text-xs text-gray-300 mt-0.5 drop-shadow-sm">
            S{item.seasonNumber}:E{item.episodeNumber}
          </p>
        )}
        
        {/* Netflix-style progress bar */}
        {item.progress !== undefined && (
          <div className="mt-2 h-[3px] bg-gray-600 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-red-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${item.progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MediaCard;
