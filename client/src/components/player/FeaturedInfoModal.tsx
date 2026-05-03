import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, Info } from 'lucide-react';
import type { FeaturedContentItem } from '@/services/featuredService';
import { useNavigate } from 'react-router-dom';

interface FeaturedInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: FeaturedContentItem | null;
  onPlay: () => void;
}

export const FeaturedInfoModal: React.FC<FeaturedInfoModalProps> = ({
  isOpen,
  onClose,
  item,
  onPlay,
}) => {
  const navigate = useNavigate();

  if (!item) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-0 pt-10 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl bg-[#181818] rounded-xl overflow-hidden shadow-2xl z-10 my-auto"
          >
            {/* Header/Hero Section */}
            <div className="relative aspect-video sm:aspect-[21/9] w-full">
              <div className="absolute inset-0">
                <img
                  src={item.backdropImage || item.posterImage}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/50 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#181818]/80 via-transparent to-transparent" />
              </div>

              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-[#181818] hover:bg-white/20 rounded-full text-white transition-colors z-50"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="absolute bottom-0 left-0 p-6 sm:p-10 w-full">
                {item.badgeLabel && (
                  <span className="inline-block px-2 py-1 bg-primary text-white text-xs font-bold rounded mb-3">
                    {item.badgeLabel}
                  </span>
                )}
                {item.logoImage ? (
                  <img
                    src={item.logoImage}
                    alt={item.title}
                    className="max-h-24 sm:max-h-32 w-auto max-w-[80%] object-contain drop-shadow-2xl mb-4"
                  />
                ) : (
                  <h1 className="text-3xl sm:text-5xl font-bold text-white mb-4 drop-shadow-lg">
                    {item.title}
                  </h1>
                )}

                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <button
                    onClick={onPlay}
                    className="flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded hover:bg-white/90 transition-colors font-semibold"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Play Stream
                  </button>
                  
                  {item.trailerUrl && (
                    <a
                      href={item.trailerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-2.5 bg-white/20 text-white rounded hover:bg-white/30 transition-colors font-semibold backdrop-blur-sm"
                    >
                      <Play className="w-5 h-5" />
                      Watch Trailer
                    </a>
                  )}

                  {item.tmdbId && (
                    <button
                      onClick={() => navigate(`/${item.contentType === 'movie' ? 'movie' : 'tv'}/${item.tmdbId}`)}
                      className="flex items-center gap-2 px-6 py-2.5 bg-white/20 text-white rounded hover:bg-white/30 transition-colors font-semibold backdrop-blur-sm"
                    >
                      <Info className="w-5 h-5" />
                      TMDB Info
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Details Section */}
            <div className="p-6 sm:p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {item.rating && (
                    <span className="px-2 py-0.5 border border-white/40 text-white rounded text-xs font-medium">
                      {item.rating}
                    </span>
                  )}
                  {item.year && (
                    <span className="text-white font-medium">{item.year}</span>
                  )}
                  {item.duration && (
                    <span className="text-white font-medium">{item.duration}</span>
                  )}
                  {item.genre && (
                    <span className="text-white font-medium">{item.genre}</span>
                  )}
                  <span className="px-2 py-0.5 bg-white/10 text-white rounded text-xs font-medium uppercase tracking-wider">
                    {item.contentType}
                  </span>
                </div>

                <p className="text-lg text-gray-300 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="space-y-4 text-sm">
                {item.genre && (
                  <div>
                    <span className="text-gray-400">Genres: </span>
                    <span className="text-white">{item.genre}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
