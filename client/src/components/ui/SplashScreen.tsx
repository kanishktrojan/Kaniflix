import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '@/assets/kaniflix_logo.png';

interface SplashScreenProps {
  onComplete?: () => void;
  minDuration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  minDuration = 2500,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [phase, setPhase] = useState<'enter' | 'glow' | 'exit'>('enter');

  useEffect(() => {
    // Phase timeline: enter -> glow -> exit
    const glowTimer = setTimeout(() => setPhase('glow'), 600);
    const exitTimer = setTimeout(() => setPhase('exit'), minDuration - 500);
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, minDuration);

    return () => {
      clearTimeout(glowTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [minDuration, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
          style={{ backgroundColor: '#0a0a0a' }}
        >
          {/* Animated background glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: phase === 'glow' || phase === 'exit' ? 0.4 : 0,
              scale: phase === 'glow' ? 1.5 : phase === 'exit' ? 2 : 0.5,
            }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute w-[300px] h-[300px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(229, 9, 20, 0.35) 0%, rgba(229, 9, 20, 0.08) 50%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />

          {/* Secondary ambient glow ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{
              opacity: phase === 'glow' ? 0.2 : 0,
              scale: phase === 'glow' ? 2 : 0.3,
            }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
            className="absolute w-[200px] h-[200px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(229, 9, 20, 0.2) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
          />

          {/* Logo with cinematic entrance */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 10 }}
            animate={{
              scale: phase === 'exit' ? 1.1 : 1,
              opacity: phase === 'exit' ? 0 : 1,
              y: 0,
            }}
            transition={{
              scale: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: phase === 'exit' ? 0.4 : 0.6 },
              y: { duration: 0.6, ease: 'easeOut' },
            }}
            className="relative z-10"
          >
            {/* Logo glow effect behind the image */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === 'glow' ? 1 : 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 -m-4"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(229, 9, 20, 0.25) 0%, transparent 70%)',
                filter: 'blur(20px)',
              }}
            />
            <img 
              src={logo} 
              alt="KANIFLIX" 
              className="h-14 sm:h-16 md:h-20 relative z-10 drop-shadow-2xl"
            />
          </motion.div>

          {/* Sleek progress bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="mt-10 relative z-10"
          >
            <div className="w-32 h-[2px] bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="w-full h-full bg-gradient-to-r from-transparent via-primary to-transparent"
              />
            </div>
          </motion.div>

          {/* Bottom tagline with subtle fade */}
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 0.4, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="absolute bottom-10 text-[11px] tracking-[0.2em] uppercase text-white/40 font-medium"
          >
            Stream unlimited movies & shows
          </motion.p>

          {/* Top-edge subtle line accent */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
            className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent origin-center"
          />
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
