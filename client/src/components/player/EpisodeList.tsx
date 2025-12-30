import React from 'react';
import { motion } from 'framer-motion';
import { Play, Check, Plus, Clock } from 'lucide-react';
import { cn, formatRuntime, getImageUrl } from '@/utils';
import { Episode, Season } from '@/types';
import { Image } from '@/components/ui';

interface EpisodeListProps {
  season: Season;
  episodes: Episode[];
  currentEpisode?: number;
  onEpisodeSelect: (episode: Episode) => void;
  watchedEpisodes?: Set<number>;
  className?: string;
}

export const EpisodeList: React.FC<EpisodeListProps> = ({
  season,
  episodes,
  currentEpisode,
  onEpisodeSelect,
  watchedEpisodes = new Set(),
  className,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      <h3 className="text-xl font-semibold">
        Season {season.seasonNumber}: {season.name}
      </h3>
      
      <div className="grid gap-4">
        {episodes.map((episode) => {
          const isCurrent = currentEpisode === episode.episodeNumber;
          const isWatched = watchedEpisodes.has(episode.episodeNumber);

          return (
            <motion.button
              key={episode.id}
              onClick={() => onEpisodeSelect(episode)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={cn(
                'flex gap-4 p-3 rounded-lg text-left transition-colors',
                isCurrent ? 'bg-surface' : 'hover:bg-surface/50'
              )}
            >
              {/* Thumbnail */}
              <div className="relative flex-shrink-0 w-32 md:w-40 aspect-video rounded overflow-hidden">
                <Image
                  src={getImageUrl(episode.stillPath, 'w300')}
                  alt={episode.name}
                  className="w-full h-full object-cover"
                />
                
                {/* Play Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="w-5 h-5 text-background ml-0.5" fill="currentColor" />
                  </div>
                </div>

                {/* Status Badge */}
                {(isCurrent || isWatched) && (
                  <div className={cn(
                    'absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium',
                    isCurrent ? 'bg-primary text-white' : 'bg-white/90 text-background'
                  )}>
                    {isCurrent ? 'Now Playing' : 'Watched'}
                  </div>
                )}
              </div>

              {/* Episode Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-text-muted text-sm">
                    Episode {episode.episodeNumber}
                  </span>
                  {episode.runtime && (
                    <>
                      <span className="text-text-muted">•</span>
                      <span className="text-text-muted text-sm flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRuntime(episode.runtime)}
                      </span>
                    </>
                  )}
                </div>
                
                <h4 className="font-medium mt-1 line-clamp-1">{episode.name}</h4>
                
                <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                  {episode.overview || 'No description available.'}
                </p>

                {/* Air Date */}
                {episode.airDate && (
                  <p className="text-xs text-text-muted mt-2">
                    Aired: {new Date(episode.airDate).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Watched Indicator */}
              <div className="flex-shrink-0 flex items-center">
                {isWatched ? (
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full border border-surface flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-4 h-4" />
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

interface SeasonSelectorProps {
  seasons: Season[];
  currentSeason: number;
  onSeasonChange: (seasonNumber: number) => void;
  className?: string;
}

export const SeasonSelector: React.FC<SeasonSelectorProps> = ({
  seasons,
  currentSeason,
  onSeasonChange,
  className,
}) => {
  // Filter out specials (season 0) and sort by season number
  const validSeasons = seasons
    .filter(s => s.seasonNumber > 0)
    .sort((a, b) => a.seasonNumber - b.seasonNumber);

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {validSeasons.map((season) => (
        <button
          key={season.id}
          onClick={() => onSeasonChange(season.seasonNumber)}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-colors',
            currentSeason === season.seasonNumber
              ? 'bg-white text-background'
              : 'bg-surface text-text-secondary hover:text-white hover:bg-surface/80'
          )}
        >
          Season {season.seasonNumber}
        </button>
      ))}
    </div>
  );
};

export default EpisodeList;
