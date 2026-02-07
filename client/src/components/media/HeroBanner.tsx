import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Info, VolumeX, Volume2 } from 'lucide-react';
import { cn, truncate } from '@/utils';
import type { MediaItem } from '@/types';

interface HeroBannerProps {
  item: MediaItem;
  logoPath?: string | null; // TMDB logo URL
  onPlay?: () => void;
  onInfo?: () => void;
  className?: string;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  item,
  logoPath,
  onPlay,
  onInfo,
  className,
}) => {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Reset logo error when logoPath changes
  React.useEffect(() => {
    setLogoError(false);
  }, [logoPath]);

  const mediaType = item.mediaType || (item.title ? 'movie' : 'tv');

  const handlePlay = () => {
    if (onPlay) {
      onPlay();
    } else {
      navigate(`/watch/${mediaType}/${item.id}`);
    }
  };

  const handleMoreInfo = () => {
    if (onInfo) {
      onInfo();
    } else {
      navigate(`/${mediaType}/${item.id}`);
    }
  };

  return (
    <div className={cn('relative w-full h-[70vw] sm:h-[56.25vw] min-h-[320px] sm:min-h-[400px] max-h-[80vh] lg:max-h-[90vh]', className)}>
      {/* Background Image */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.img
          src={item.backdropPath || ''}
          alt={item.title}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: imageLoaded ? 1 : 0, scale: 1 }}
          transition={{ duration: 1 }}
          onLoad={() => setImageLoaded(true)}
          className="w-full h-full object-cover object-top"
        />

        {/* Loading state */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-background animate-pulse" />
        )}
      </div>

      {/* Netflix-style gradient overlay - bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[50%] sm:h-[40%]"
        style={{
          background: 'linear-gradient(to top, rgb(20, 20, 20) 0%, rgba(20, 20, 20, 0.7) 50%, transparent 100%)'
        }}
      />

      {/* Netflix-style gradient overlay - left side for content readability */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to right, rgba(20, 20, 20, 0.9) 0%, rgba(20, 20, 20, 0.6) 25%, transparent 50%)'
        }}
      />

      {/* Vignette effect */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, transparent 50%, rgba(20, 20, 20, 0.3) 100%)'
        }}
      />

      {/* Content Container - Netflix positions content in bottom-left */}
      <div className="absolute bottom-[15%] sm:bottom-[20%] md:bottom-[25%] lg:bottom-[30%] left-0 right-0 px-4 md:px-12 lg:px-16">
        <motion.div
          className="max-w-[85%] sm:max-w-lg md:max-w-xl lg:max-w-2xl space-y-2 sm:space-y-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          {/* Netflix "N" Series badge - optional */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-2"
          >
            <span className="text-primary font-bold text-lg">K</span>
            <span className="text-xs uppercase tracking-[0.2em] text-gray-300 font-semibold">
              {mediaType === 'tv' ? 'SERIES' : 'FILM'}
            </span>
          </motion.div>

          {/* Title - Logo or Text (prioritize logo with fallback) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {logoPath && !logoError ? (
              <img
                src={logoPath}
                alt={item.title}
                className="max-h-14 sm:max-h-20 md:max-h-28 lg:max-h-36 w-auto max-w-[80%] object-contain drop-shadow-2xl"
                onError={() => setLogoError(true)}
              />
            ) : (
              <h1
                className="text-xl sm:text-3xl md:text-5xl lg:text-6xl font-bold leading-tight"
                style={{
                  textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                }}
              >
                {item.title}
              </h1>
            )}
          </motion.div>

          {/* Description - Netflix shows this on hover/featured */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-200 line-clamp-2 sm:line-clamp-3 leading-relaxed"
            style={{
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
            }}
          >
            {truncate(item.overview || '', 150)}
          </motion.p>

          {/* Action Buttons - Netflix style */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.4 }}
            className="flex items-center gap-2 sm:gap-3 pt-1 sm:pt-2"
          >
            {/* Play Button - White with black text, Netflix style */}
            <button
              onClick={handlePlay}
              className="flex items-center gap-1.5 sm:gap-2 bg-white hover:bg-white/80 text-black font-semibold px-3 py-1.5 sm:px-5 sm:py-2 md:px-8 md:py-3 rounded-md transition-all duration-200 text-xs sm:text-sm md:text-base"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 fill-current" />
              <span>Play</span>
            </button>

            {/* More Info Button - Gray semi-transparent, Netflix style */}
            <button
              onClick={handleMoreInfo}
              className="flex items-center gap-1.5 sm:gap-2 bg-gray-500/70 hover:bg-gray-500/50 text-white font-semibold px-3 py-1.5 sm:px-5 sm:py-2 md:px-8 md:py-3 rounded-md transition-all duration-200 text-xs sm:text-sm md:text-base"
            >
              <Info className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              <span>More Info</span>
            </button>
          </motion.div>
        </motion.div>
      </div>

      {/* Maturity Rating & Mute Button - Netflix style bottom right - hidden on mobile */}
      <div className="absolute bottom-[15%] sm:bottom-[20%] md:bottom-[25%] lg:bottom-[30%] right-0 hidden sm:flex items-center gap-3 px-4 md:px-12 lg:px-16">
        {/* Mute/Unmute button */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 rounded-full border border-gray-400 hover:border-white transition-colors bg-transparent"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 md:w-6 md:h-6 text-gray-300" />
          ) : (
            <Volume2 className="w-5 h-5 md:w-6 md:h-6 text-gray-300" />
          )}
        </button>

        {/* Maturity Rating Badge */}
        <div className="flex items-center bg-gray-800/60 border-l-[3px] border-gray-400 pl-3 pr-4 py-1">
          <span className="text-sm md:text-base text-gray-200">
            {item.voteAverage >= 7 ? 'TV-14' : item.voteAverage >= 5 ? 'TV-MA' : 'PG-13'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default HeroBanner;
