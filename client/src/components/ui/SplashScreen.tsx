import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '@/assets/kaniflix_logo.png';

interface SplashScreenProps {
  onComplete?: () => void;
  minDuration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  minDuration = 1500,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center"
        >
          {/* Logo animation */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <img 
              src={logo} 
              alt="KANIFLIX" 
              className="h-16 md:h-20"
            />
          </motion.div>

          {/* Loading indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-primary rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* Version or tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-8 text-xs text-text-muted"
          >
            Stream unlimited movies & shows
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Minimal loading skeleton for app-like experience
export const AppLoadingSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar skeleton */}
      <div className="h-16 bg-background-secondary/50 backdrop-blur" />
      
      {/* Hero skeleton */}
      <div className="relative h-[50vh] md:h-[70vh]">
        <div className="absolute inset-0 skeleton" />
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8">
          <div className="w-48 h-8 skeleton mb-4" />
          <div className="w-32 h-10 skeleton" />
        </div>
      </div>

      {/* Content rows skeleton */}
      <div className="px-4 md:px-12 py-8 space-y-8">
        {[1, 2, 3].map((row) => (
          <div key={row}>
            <div className="w-32 h-6 skeleton mb-4" />
            <div className="flex gap-2 md:gap-4 overflow-hidden">
              {[1, 2, 3, 4, 5].map((item) => (
                <div 
                  key={item} 
                  className="flex-shrink-0 w-[120px] md:w-[180px] aspect-poster skeleton rounded-md"
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile bottom nav skeleton */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-background-secondary/80 md:hidden" />
    </div>
  );
};

export default SplashScreen;
