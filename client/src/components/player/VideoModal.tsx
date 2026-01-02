import React, { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ChevronDown, Play, Clock } from 'lucide-react';
import { EmbedPlayer, type PlayerEventData, type MediaProgressData } from './EmbedPlayer';
import { cn } from '@/utils';
import { getImageUrl } from '@/utils';
import type { Episode, Season } from '@/types';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath?: string;
  backdropPath?: string;
  // TV-specific
  season?: number;
  episode?: number;
  episodeName?: string;
  seasonData?: Season;
  seasons?: Season[];
  onEpisodeChange?: (season: number, episode: number) => void;
  onSeasonChange?: (season: number) => void;
  /** Called on every player event (play, pause, timeupdate, ended) for progress tracking */
  onPlayerEvent?: (eventData: PlayerEventData) => void;
  /** Called when VidRock sends full progress snapshot (MEDIA_DATA) */
  onMediaData?: (data: MediaProgressData) => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({
  isOpen,
  onClose,
  tmdbId,
  mediaType,
  title,
  posterPath,
  backdropPath,
  season,
  episode,
  episodeName,
  seasonData,
  seasons,
  onEpisodeChange,
  onSeasonChange,
  onPlayerEvent,
  onMediaData,
}) => {
  // Track the displayed season in episode list (may differ from currently playing season)
  const [displayedSeason, setDisplayedSeason] = useState(season || 1);

  // Sync displayedSeason with the playing season when modal opens or season prop changes
  useEffect(() => {
    if (season) {
      setDisplayedSeason(season);
    }
  }, [season, isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Navigate to previous/next episode
  const navigateEpisode = useCallback((direction: 'prev' | 'next') => {
    if (!seasonData?.episodes || !season || !episode || !onEpisodeChange) return;

    const currentIndex = seasonData.episodes.findIndex(
      (ep: Episode) => ep.episodeNumber === episode
    );

    if (direction === 'prev' && currentIndex > 0) {
      const prevEp = seasonData.episodes[currentIndex - 1];
      onEpisodeChange(season, prevEp.episodeNumber);
    } else if (direction === 'next' && currentIndex < seasonData.episodes.length - 1) {
      const nextEp = seasonData.episodes[currentIndex + 1];
      onEpisodeChange(season, nextEp.episodeNumber);
    }
  }, [seasonData, episode, season, onEpisodeChange]);

  // Handle episode click from the episode list
  // Uses displayedSeason (the season shown in the list) not the currently playing season
  const handleEpisodeClick = useCallback((ep: Episode) => {
    if (displayedSeason && onEpisodeChange) {
      onEpisodeChange(displayedSeason, ep.episodeNumber);
    }
  }, [displayedSeason, onEpisodeChange]);

  // Handle season dropdown change
  const handleSeasonDropdownChange = useCallback((newSeason: number) => {
    setDisplayedSeason(newSeason);
    if (onSeasonChange) {
      onSeasonChange(newSeason);
    }
  }, [onSeasonChange]);

  // Get subtitle for TV shows
  const subtitle = mediaType === 'tv' && season && episode
    ? `S${season}:E${episode}${episodeName ? ` - ${episodeName}` : ''}`
    : undefined;

  // Check if can navigate (for prev/next buttons, use currently playing season)
  const canGoPrev = seasonData?.episodes && episode && season === displayedSeason && episode > (seasonData.episodes[0]?.episodeNumber ?? 1);
  const canGoNext = seasonData?.episodes && episode && season === displayedSeason && episode < (seasonData.episodes[seasonData.episodes.length - 1]?.episodeNumber ?? 1);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto py-6 md:py-10"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80"
            onClick={onClose}
          />

          {/* Modal Content - Netflix style sizing */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-[95vw] max-w-[850px] z-10"
          >
            {/* Modal Inner Container */}
            <div className="rounded-lg overflow-hidden shadow-2xl bg-[#181818]">
              {/* Close button - positioned inside top-right of modal */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 rounded-full transition-colors z-30"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
              {/* Video Player Container - 16:9 aspect ratio */}
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <div className="absolute inset-0">
                  <EmbedPlayer
                    tmdbId={tmdbId}
                    mediaType={mediaType}
                    season={season}
                    episode={episode}
                    title={title}
                    subtitle={subtitle}
                    posterPath={backdropPath || posterPath}
                    onPlayerEvent={onPlayerEvent}
                    onMediaData={onMediaData}
                  />
                  
                  {/* Episode Navigation Overlay for TV Shows */}
                  {mediaType === 'tv' && seasonData?.episodes && (
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Previous Episode Button */}
                      {canGoPrev && (
                        <button
                          onClick={() => navigateEpisode('prev')}
                          className="pointer-events-auto absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/80 rounded-full transition-all opacity-0 hover:opacity-100 group-hover:opacity-100"
                          style={{ opacity: 0.7 }}
                          title="Previous Episode"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                      )}
                      
                      {/* Next Episode Button */}
                      {canGoNext && (
                        <button
                          onClick={() => navigateEpisode('next')}
                          className="pointer-events-auto absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/80 rounded-full transition-all opacity-0 hover:opacity-100 group-hover:opacity-100"
                          style={{ opacity: 0.7 }}
                          title="Next Episode"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

            {/* Info Section Below Player */}
            <div className="p-4 md:p-6 lg:p-8">
              {/* Title Row */}
              <div className="flex items-start justify-between gap-2 md:gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg md:text-xl lg:text-2xl font-bold mb-1 truncate">{title}</h2>
                  {subtitle && (
                    <p className="text-base text-white/70">{subtitle}</p>
                  )}
                </div>

                {/* Episode Navigation for TV */}
                {mediaType === 'tv' && seasonData?.episodes && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigateEpisode('prev')}
                      disabled={!canGoPrev}
                      className={cn(
                        'p-1.5 rounded transition-colors',
                        canGoPrev 
                          ? 'hover:bg-white/10 text-white' 
                          : 'text-white/20 cursor-not-allowed'
                      )}
                      title="Previous Episode"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <span className="text-xs text-white/60 px-2">
                      {episode}/{seasonData.episodes.length}
                    </span>

                    <button
                      onClick={() => navigateEpisode('next')}
                      disabled={!canGoNext}
                      className={cn(
                        'p-1.5 rounded transition-colors',
                        canGoNext 
                          ? 'hover:bg-white/10 text-white' 
                          : 'text-white/20 cursor-not-allowed'
                      )}
                      title="Next Episode"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Episodes Section for TV */}
              {mediaType === 'tv' && seasonData?.episodes && (
                <div className="mt-6 border-t border-white/10 pt-6">
                  {/* Season Selector & Episodes Toggle */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Episodes</h3>
                    
                    {/* Season Dropdown */}
                    {seasons && seasons.length > 1 && (
                      <div className="relative">
                        <select
                          value={displayedSeason}
                          onChange={(e) => handleSeasonDropdownChange(Number(e.target.value))}
                          className="appearance-none bg-[#242424] border border-white/20 rounded px-3 py-1.5 pr-8 text-sm cursor-pointer hover:border-white/40 transition-colors focus:outline-none focus:border-white/60"
                        >
                          {seasons
                            .filter((s) => s.seasonNumber > 0)
                            .map((s) => (
                              <option key={s.seasonNumber} value={s.seasonNumber}>
                                Season {s.seasonNumber}
                              </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-white/60" />
                      </div>
                    )}
                  </div>

                  {/* Episode List - Scrollable */}
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {seasonData.episodes.map((ep) => (
                      <button
                        key={ep.id}
                        onClick={() => handleEpisodeClick(ep)}
                        className={cn(
                          'w-full flex gap-3 p-2 md:p-3 rounded-md text-left transition-colors group',
                          ep.episodeNumber === episode && season === displayedSeason
                            ? 'bg-white/10'
                            : 'hover:bg-white/5'
                        )}
                      >
                        {/* Episode Thumbnail */}
                        <div className="relative w-20 h-12 md:w-28 md:h-16 flex-shrink-0 rounded overflow-hidden bg-black/50">
                          {ep.stillPath ? (
                            <img
                              src={getImageUrl(ep.stillPath, 'w300')}
                              alt={ep.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/30">
                              <Play className="w-6 h-6" />
                            </div>
                          )}
                          {/* Play icon overlay */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                              <Play className="w-4 h-4 text-black" fill="black" />
                            </div>
                          </div>
                          {/* Current playing indicator */}
                          {ep.episodeNumber === episode && season === displayedSeason && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                          )}
                        </div>

                        {/* Episode Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {ep.episodeNumber}. {ep.name}
                            </span>
                          </div>
                          {ep.runtime && (
                            <div className="flex items-center gap-1 text-xs text-white/50 mb-1">
                              <Clock className="w-3 h-3" />
                              <span>{ep.runtime}m</span>
                            </div>
                          )}
                          {ep.overview && (
                            <p className="text-xs text-white/50 line-clamp-2">
                              {ep.overview}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VideoModal;
