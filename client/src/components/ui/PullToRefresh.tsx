import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export const PullToRefreshIndicator: React.FC<PullToRefreshIndicatorProps> = ({
  pullDistance,
  isRefreshing,
  threshold = 80,
}) => {
  if (pullDistance <= 0 && !isRefreshing) return null;

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = isRefreshing ? 0 : progress * 180;
  const scale = 0.5 + progress * 0.5;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ 
        opacity: pullDistance > 10 || isRefreshing ? 1 : 0,
        y: pullDistance > 10 || isRefreshing ? 0 : -20,
      }}
      className="fixed top-0 left-0 right-0 z-[60] flex justify-center pt-safe-top"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}
    >
      <motion.div
        className="bg-background-secondary rounded-full p-3 shadow-lg border border-white/10"
        style={{
          transform: `translateY(${Math.min(pullDistance, threshold)}px)`,
        }}
      >
        <motion.div
          animate={isRefreshing ? { rotate: 360 } : { rotate: rotation }}
          transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: 'linear' } : { duration: 0.1 }}
          style={{ scale }}
        >
          <RefreshCw 
            className={`w-6 h-6 ${pullDistance >= threshold || isRefreshing ? 'text-primary' : 'text-text-secondary'}`}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

interface PullToRefreshContainerProps {
  children: React.ReactNode;
  pullDistance: number;
  isRefreshing: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  threshold?: number;
}

export const PullToRefreshContainer: React.FC<PullToRefreshContainerProps> = ({
  children,
  pullDistance,
  isRefreshing,
  containerRef,
  threshold = 80,
}) => {
  return (
    <div 
      ref={containerRef}
      className="relative min-h-screen"
      style={{
        transform: `translateY(${isRefreshing ? threshold / 2 : pullDistance / 2}px)`,
        transition: isRefreshing || pullDistance === 0 ? 'transform 0.3s ease' : 'none',
      }}
    >
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        threshold={threshold}
      />
      {children}
    </div>
  );
};

export default PullToRefreshContainer;
