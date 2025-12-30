import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils';
import { MediaCard, ContinueWatchingCard } from './MediaCard';
import { SkeletonCard } from '@/components/ui';
import type { MediaItem } from '@/types';

interface MediaRowProps {
  title: string;
  items: MediaItem[];
  variant?: 'poster' | 'backdrop' | 'continue';
  isLoading?: boolean;
  className?: string;
}

export const MediaRow: React.FC<MediaRowProps> = ({
  title,
  items,
  variant = 'poster',
  isLoading = false,
  className,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const cardWidth = variant === 'poster' ? 180 : 300;
  const gap = 16;
  const scrollAmount = (cardWidth + gap) * 3;

  const handleScroll = () => {
    if (!scrollRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    
    const newScrollLeft = direction === 'left'
      ? scrollRef.current.scrollLeft - scrollAmount
      : scrollRef.current.scrollLeft + scrollAmount;

    scrollRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    });
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="h-8 w-48 skeleton rounded" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="flex-shrink-0 w-[180px]" />
          ))}
        </div>
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <div className={cn('relative group', className)}>
      {/* Title */}
      <h2 className="text-xl md:text-2xl font-semibold mb-4 px-4 md:px-12">
        {title}
      </h2>

      {/* Scroll container */}
      <div className="relative">
        {/* Left Arrow */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: showLeftArrow ? 1 : 0 }}
          className={cn(
            'absolute left-0 top-0 bottom-0 z-10 w-12 md:w-16',
            'flex items-center justify-center',
            'bg-gradient-to-r from-background via-background/80 to-transparent',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            !showLeftArrow && 'pointer-events-none'
          )}
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="w-8 h-8" />
        </motion.button>

        {/* Items */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={cn(
            'flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-12',
            'scroll-smooth'
          )}
        >
          {items.map((item) => (
            variant === 'continue' ? (
              <ContinueWatchingCard
                key={`${item.mediaType}-${item.id}`}
                item={item as MediaItem & { progress?: number }}
                className={cn(
                  'flex-shrink-0',
                  variant === 'continue' && 'w-[300px]'
                )}
              />
            ) : (
              <MediaCard
                key={`${item.mediaType}-${item.id}`}
                item={item}
                variant={variant}
                className={cn(
                  'flex-shrink-0',
                  variant === 'poster' && 'w-[140px] md:w-[180px]',
                  variant === 'backdrop' && 'w-[280px] md:w-[300px]'
                )}
              />
            )
          ))}
        </div>

        {/* Right Arrow */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: showRightArrow ? 1 : 0 }}
          className={cn(
            'absolute right-0 top-0 bottom-0 z-10 w-12 md:w-16',
            'flex items-center justify-center',
            'bg-gradient-to-l from-background via-background/80 to-transparent',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            !showRightArrow && 'pointer-events-none'
          )}
          onClick={() => scroll('right')}
        >
          <ChevronRight className="w-8 h-8" />
        </motion.button>
      </div>
    </div>
  );
};

export default MediaRow;
