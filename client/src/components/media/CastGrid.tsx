import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Star } from 'lucide-react';
import { Image } from '@/components/ui';
import { getImageUrl } from '@/utils';
import type { CastMember } from '@/types';

interface CastGridProps {
  cast: CastMember[];
  maxItems?: number;
}

export const CastGrid: React.FC<CastGridProps> = ({ cast, maxItems = 20 }) => {
  const [selectedPerson, setSelectedPerson] = useState<CastMember | null>(null);

  const displayCast = cast.slice(0, maxItems);

  return (
    <>
      {/* Cast Grid - Horizontally scrollable */}
      <div className="relative -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8">
        <div className="flex gap-4 md:gap-5 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {displayCast.map((person) => (
            <motion.button
              key={person.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              className="flex-shrink-0 flex flex-col items-center gap-2 group cursor-pointer"
              onClick={() => setSelectedPerson(person)}
            >
              {/* Circular Photo */}
              <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-surface ring-2 ring-transparent group-hover:ring-primary/50 transition-all shadow-lg">
                {person.profilePath ? (
                  <Image
                    src={getImageUrl(person.profilePath, 'w185')}
                    alt={person.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-surface text-text-muted">
                    <User className="w-8 h-8" />
                  </div>
                )}
              </div>
              
              {/* Name & Character */}
              <div className="text-center w-20 md:w-24">
                <p className="text-xs md:text-sm font-medium truncate">{person.name}</p>
                <p className="text-[10px] md:text-xs text-text-muted truncate">
                  {person.character}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Cast Card Popup Modal */}
      <AnimatePresence>
        {selectedPerson && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={() => setSelectedPerson(null)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/90" />

            {/* Card Content */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative z-10 max-w-sm w-full bg-[#1a1a1a] rounded-xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedPerson(null)}
                className="absolute top-3 right-3 p-1.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Photo - Large */}
              <div className="relative aspect-[3/4] bg-surface">
                {selectedPerson.profilePath ? (
                  <img
                    src={getImageUrl(selectedPerson.profilePath, 'original')}
                    alt={selectedPerson.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted bg-gradient-to-b from-surface to-[#1a1a1a]">
                    <User className="w-24 h-24" />
                  </div>
                )}
                
                {/* Gradient overlay at bottom */}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#1a1a1a] to-transparent" />
              </div>

              {/* Info section */}
              <div className="px-5 pb-5 -mt-16 relative">
                <h3 className="text-xl font-bold mb-1">{selectedPerson.name}</h3>
                <p className="text-primary font-medium mb-3">as {selectedPerson.character}</p>
                
                {/* Department info */}
                <div className="flex flex-wrap gap-3 text-sm text-text-muted">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4" />
                    <span>Acting</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hide scrollbar styles */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
};

export default CastGrid;
