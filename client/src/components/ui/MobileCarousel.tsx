import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils';
import { useIsMobile } from '@/hooks';

interface MobileCarouselProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  showArrows?: boolean;
  itemClassName?: string;
}

export const MobileCarousel: React.FC<MobileCarouselProps> = ({
  children,
  title,
  className,
  showArrows = true,
  itemClassName,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = () => {
    if (!scrollRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    updateScrollState();
    scrollElement.addEventListener('scroll', updateScrollState, { passive: true });
    
    return () => scrollElement.removeEventListener('scroll', updateScrollState);
  }, [children]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    
    const scrollAmount = scrollRef.current.clientWidth * 0.8;
    const newScrollLeft = scrollRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
    
    scrollRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    });
  };

  return (
    <div className={cn('relative group', className)}>
      {title && (
        <h2 className="text-lg md:text-xl font-semibold text-white mb-3 px-4 md:px-0">
          {title}
        </h2>
      )}
      
      <div className="relative">
        {/* Left scroll button - desktop only */}
        {showArrows && !isMobile && canScrollLeft && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute left-0 top-0 bottom-0 z-10 w-12 md:w-16
                     bg-gradient-to-r from-background/90 to-transparent
                     flex items-center justify-start pl-2
                     opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => scroll('left')}
          >
            <div className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
              <ChevronLeft className="w-5 h-5 text-white" />
            </div>
          </motion.button>
        )}

        {/* Scrollable container */}
        <div
          ref={scrollRef}
          className={cn(
            'flex gap-2 md:gap-3 overflow-x-auto scrollbar-hide',
            'px-4 md:px-0', // Mobile padding
            '-webkit-overflow-scrolling: touch',
            'scroll-smooth',
            // Snap scrolling on mobile
            isMobile && 'snap-x snap-mandatory'
          )}
          style={{
            scrollSnapType: isMobile ? 'x mandatory' : undefined,
          }}
        >
          {React.Children.map(children, (child, index) => (
            <div 
              key={index}
              className={cn(
                'flex-shrink-0',
                isMobile && 'snap-start',
                itemClassName
              )}
            >
              {child}
            </div>
          ))}
        </div>

        {/* Right scroll button - desktop only */}
        {showArrows && !isMobile && canScrollRight && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute right-0 top-0 bottom-0 z-10 w-12 md:w-16
                     bg-gradient-to-l from-background/90 to-transparent
                     flex items-center justify-end pr-2
                     opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => scroll('right')}
          >
            <div className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
              <ChevronRight className="w-5 h-5 text-white" />
            </div>
          </motion.button>
        )}
      </div>

      {/* Mobile scroll indicator dots */}
      {isMobile && (
        <div className="flex justify-center mt-3 gap-1.5">
          <div className={cn(
            'w-8 h-1 rounded-full transition-colors',
            !canScrollLeft ? 'bg-primary' : 'bg-white/20'
          )} />
          <div className={cn(
            'w-8 h-1 rounded-full transition-colors',
            canScrollLeft && canScrollRight ? 'bg-primary' : 'bg-white/20'
          )} />
          <div className={cn(
            'w-8 h-1 rounded-full transition-colors',
            !canScrollRight ? 'bg-primary' : 'bg-white/20'
          )} />
        </div>
      )}
    </div>
  );
};

export default MobileCarousel;
