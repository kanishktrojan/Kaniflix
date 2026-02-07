import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Clock,
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Radio,
  Trophy,
  Eye,
  Star,
} from 'lucide-react';
import { useSportsStore } from '@/store';
import { cn } from '@/utils';
import type { SportsEvent, SportCategory } from '@/types';

// Countdown Timer Component
const CountdownTimer: React.FC<{ targetDate: string }> = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {timeLeft.days > 0 && (
        <div className="text-center">
          <span className="text-xl font-bold text-white">{timeLeft.days}</span>
          <span className="text-xs text-text-secondary block">days</span>
        </div>
      )}
      <div className="text-center">
        <span className="text-xl font-bold text-white">{String(timeLeft.hours).padStart(2, '0')}</span>
        <span className="text-xs text-text-secondary block">hrs</span>
      </div>
      <span className="text-white text-xl">:</span>
      <div className="text-center">
        <span className="text-xl font-bold text-white">{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className="text-xs text-text-secondary block">min</span>
      </div>
      <span className="text-white text-xl">:</span>
      <div className="text-center">
        <span className="text-xl font-bold text-white">{String(timeLeft.seconds).padStart(2, '0')}</span>
        <span className="text-xs text-text-secondary block">sec</span>
      </div>
    </div>
  );
};

// Live Badge Component
const LiveBadge: React.FC<{ pulse?: boolean }> = ({ pulse = true }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white text-sm font-bold">
    {pulse && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
    LIVE
  </span>
);

// Hero Banner Slideshow Component for Live Events
const HeroBannerSlideshow: React.FC<{
  events: SportsEvent[];
  onEventClick: (id: string) => void;
}> = ({ events, onEventClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<number | null>(null);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % events.length);
  }, [events.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + events.length) % events.length);
  }, [events.length]);

  // Auto-advance timer
  useEffect(() => {
    if (events.length <= 1 || isPaused) return;

    timerRef.current = setInterval(goToNext, 5000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [events.length, isPaused, goToNext]);

  if (events.length === 0) return null;

  const currentEvent = events[currentIndex];

  return (
    <div
      className="relative w-full aspect-[16/10] sm:aspect-[21/9] rounded-2xl overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentEvent._id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 cursor-pointer"
          onClick={() => onEventClick(currentEvent._id)}
        >
          <img
            src={currentEvent.banner || currentEvent.thumbnail}
            alt={currentEvent.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          
          {/* Live Badge */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            {currentEvent.isLive && currentEvent.status === 'live' ? (
              <LiveBadge />
            ) : currentEvent.status === 'upcoming' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white text-sm font-bold">
                <Clock className="w-3.5 h-3.5" />
                UPCOMING
              </span>
            ) : null}
            {currentEvent.isFeatured && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-500/90 text-black text-xs font-bold">
                <Star className="w-3 h-3 fill-current" />
                FEATURED
              </span>
            )}
          </div>

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8">
            <div className="flex items-center gap-2 text-text-secondary text-xs sm:text-sm mb-2 sm:mb-3">
              <span className="uppercase tracking-wider">{currentEvent.category}</span>
              {currentEvent.tournament && (
                <>
                  <span>•</span>
                  <span className="truncate">{currentEvent.tournament}</span>
                </>
              )}
            </div>

            {/* Teams */}
            {currentEvent.team1?.name && currentEvent.team2?.name ? (
              <div className="flex items-center gap-2 sm:gap-4 md:gap-8 mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  {currentEvent.team1.logo && (
                    <img src={currentEvent.team1.logo} alt={currentEvent.team1.name} className="w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 object-contain" />
                  )}
                  <div>
                    <p className="text-white font-bold text-sm sm:text-xl md:text-2xl">{currentEvent.team1.name}</p>
                    {currentEvent.isLive && currentEvent.team1.score && (
                      <p className="text-lg sm:text-2xl md:text-3xl font-bold text-primary">{currentEvent.team1.score}</p>
                    )}
                  </div>
                </div>
                <div className="text-text-secondary text-sm sm:text-xl font-medium">VS</div>
                <div className="flex items-center gap-2 sm:gap-3">
                  {currentEvent.team2.logo && (
                    <img src={currentEvent.team2.logo} alt={currentEvent.team2.name} className="w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 object-contain" />
                  )}
                  <div>
                    <p className="text-white font-bold text-sm sm:text-xl md:text-2xl">{currentEvent.team2.name}</p>
                    {currentEvent.isLive && currentEvent.team2.score && (
                      <p className="text-lg sm:text-2xl md:text-3xl font-bold text-primary">{currentEvent.team2.score}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <h2 className="text-lg sm:text-2xl md:text-4xl font-bold text-white mb-3 sm:mb-4">{currentEvent.title}</h2>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {currentEvent.status === 'upcoming' && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-text-secondary" />
                  <span className="text-text-secondary">
                    {new Date(currentEvent.scheduledAt).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <CountdownTimer targetDate={currentEvent.scheduledAt} />
                </div>
              )}
              {currentEvent.venue && (
                <div className="flex items-center gap-2 text-text-secondary">
                  <MapPin className="w-4 h-4" />
                  <span>{currentEvent.venue}</span>
                </div>
              )}
            </div>

            {/* Watch Button */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="mt-3 sm:mt-4 inline-flex items-center gap-1.5 sm:gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors text-sm sm:text-base"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              {currentEvent.isLive ? 'Watch Live' : 'View Details'}
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      {events.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors z-10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Slide Indicators */}
      {events.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {events.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                goToSlide(index);
              }}
              className={cn(
                'transition-all duration-300',
                index === currentIndex
                  ? 'w-8 h-2 bg-white rounded-full'
                  : 'w-2 h-2 bg-white/50 hover:bg-white/80 rounded-full'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Sports Card Component
const SportsCard: React.FC<{
  event: SportsEvent;
  variant?: 'default' | 'featured' | 'compact';
  onClick: () => void;
}> = ({ event, variant = 'default', onClick }) => {
  const isLive = event.isLive && event.status === 'live';
  const isUpcoming = event.status === 'upcoming';

  if (variant === 'featured') {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        onClick={onClick}
        className="relative w-full aspect-[21/9] rounded-2xl overflow-hidden cursor-pointer group"
      >
        <img
          src={event.banner || event.thumbnail}
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        
        {/* Live/Upcoming Badge */}
        <div className="absolute top-4 left-4">
          {isLive ? (
            <LiveBadge />
          ) : isUpcoming ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white text-sm font-bold">
              <Clock className="w-3.5 h-3.5" />
              UPCOMING
            </span>
          ) : null}
        </div>

        {/* Featured Badge */}
        {event.isFeatured && (
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-500/90 text-black text-xs font-bold">
              <Star className="w-3 h-3 fill-current" />
              FEATURED
            </span>
          </div>
        )}

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="flex items-center gap-2 text-text-secondary text-sm mb-3">
            <span className="uppercase tracking-wider">{event.category}</span>
            {event.tournament && (
              <>
                <span>•</span>
                <span>{event.tournament}</span>
              </>
            )}
          </div>

          {/* Teams */}
          {event.team1?.name && event.team2?.name ? (
            <div className="flex items-center gap-4 md:gap-8 mb-4">
              <div className="flex items-center gap-3">
                {event.team1.logo && (
                  <img src={event.team1.logo} alt={event.team1.name} className="w-12 h-12 md:w-16 md:h-16 object-contain" />
                )}
                <div>
                  <p className="text-white font-bold text-xl md:text-2xl">{event.team1.name}</p>
                  {isLive && event.team1.score && (
                    <p className="text-2xl md:text-3xl font-bold text-primary">{event.team1.score}</p>
                  )}
                </div>
              </div>
              <div className="text-text-secondary text-xl font-medium">VS</div>
              <div className="flex items-center gap-3">
                {event.team2.logo && (
                  <img src={event.team2.logo} alt={event.team2.name} className="w-12 h-12 md:w-16 md:h-16 object-contain" />
                )}
                <div>
                  <p className="text-white font-bold text-xl md:text-2xl">{event.team2.name}</p>
                  {isLive && event.team2.score && (
                    <p className="text-2xl md:text-3xl font-bold text-primary">{event.team2.score}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">{event.title}</h2>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {isUpcoming && (
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-text-secondary" />
                <span className="text-text-secondary">
                  {new Date(event.scheduledAt).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <CountdownTimer targetDate={event.scheduledAt} />
              </div>
            )}
            {event.venue && (
              <div className="flex items-center gap-2 text-text-secondary">
                <MapPin className="w-4 h-4" />
                <span>{event.venue}</span>
              </div>
            )}
          </div>

          {/* Watch Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors"
          >
            <Play className="w-5 h-5 fill-current" />
            {isLive ? 'Watch Live' : 'View Details'}
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // Default Card
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -3 }}
      onClick={onClick}
      className={cn(
        'relative rounded-xl overflow-hidden cursor-pointer group bg-surface-dark',
        variant === 'compact' ? 'flex h-24' : 'flex-col'
      )}
    >
      {/* Image */}
      <div className={cn(
        'relative overflow-hidden',
        variant === 'compact' ? 'w-36 h-full' : 'aspect-video'
      )}>
        <img
          src={event.thumbnail}
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        
        {/* Badge */}
        {isLive && (
          <div className="absolute top-2 left-2">
            <LiveBadge />
          </div>
        )}
        
        {/* Views */}
        {isLive && event.viewCount > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-black/60 rounded text-xs text-white">
            <Eye className="w-3 h-3" />
            {event.viewCount > 1000 ? `${(event.viewCount / 1000).toFixed(1)}K` : event.viewCount}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cn(
        'flex flex-col',
        variant === 'compact' ? 'flex-1 p-3 justify-center' : 'p-4'
      )}>
        {/* Category */}
        <div className="flex items-center gap-2 text-xs text-primary mb-1 uppercase tracking-wider">
          <span>{event.category}</span>
          {event.tournament && (
            <>
              <span className="text-text-secondary">•</span>
              <span className="text-text-secondary">{event.tournament}</span>
            </>
          )}
        </div>

        {/* Teams or Title */}
        {event.team1?.name && event.team2?.name && variant !== 'compact' ? (
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {event.team1.logo && (
                <img src={event.team1.logo} alt="" className="w-6 h-6 object-contain" />
              )}
              <span className="text-white font-medium truncate">{event.team1.name}</span>
              {isLive && event.team1.score && (
                <span className="text-primary font-bold">{event.team1.score}</span>
              )}
            </div>
            <span className="text-text-secondary text-xs">vs</span>
            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
              {isLive && event.team2.score && (
                <span className="text-primary font-bold">{event.team2.score}</span>
              )}
              <span className="text-white font-medium truncate">{event.team2.name}</span>
              {event.team2.logo && (
                <img src={event.team2.logo} alt="" className="w-6 h-6 object-contain" />
              )}
            </div>
          </div>
        ) : (
          <h3 className={cn(
            'text-white font-semibold truncate',
            variant === 'compact' ? 'text-sm' : 'text-base mb-2'
          )}>
            {event.title}
          </h3>
        )}

        {/* Schedule */}
        {isUpcoming && variant !== 'compact' && (
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <Clock className="w-4 h-4" />
            <span>
              {new Date(event.scheduledAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}

        {/* Compact Schedule */}
        {variant === 'compact' && (
          <div className="flex items-center gap-2 text-text-secondary text-xs mt-1">
            {isLive ? (
              <span className="text-red-500 font-medium flex items-center gap-1">
                <Radio className="w-3 h-3" />
                Live Now
              </span>
            ) : (
              <>
                <Calendar className="w-3 h-3" />
                <span>
                  {new Date(event.scheduledAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Hover Play Button */}
      {variant !== 'compact' && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          <motion.div
            initial={{ scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            className="w-14 h-14 rounded-full bg-primary flex items-center justify-center"
          >
            <Play className="w-6 h-6 text-white fill-current ml-1" />
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

// Horizontal Scroll Section
const HorizontalSection: React.FC<{
  title: string;
  icon?: React.ReactNode;
  events: SportsEvent[];
  isLoading: boolean;
  onEventClick: (id: string) => void;
  viewAllLink?: string;
}> = ({ title, icon, events, isLoading, onEventClick }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      setShowLeftArrow(scrollRef.current.scrollLeft > 0);
      setShowRightArrow(
        scrollRef.current.scrollLeft <
          scrollRef.current.scrollWidth - scrollRef.current.clientWidth - 10
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-48 h-8 bg-surface animate-pulse rounded" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-80 aspect-video bg-surface animate-pulse rounded-xl flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) return null;

  return (
    <div className="relative group/section">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
          {icon}
          {title}
        </h2>
      </div>

      {/* Scroll Container */}
      <div className="relative">
        {/* Left Arrow */}
        <AnimatePresence>
          {showLeftArrow && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-black/80 hover:bg-black rounded-full flex items-center justify-center text-white shadow-lg -ml-4 opacity-0 group-hover/section:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-6 h-6" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Right Arrow */}
        <AnimatePresence>
          {showRightArrow && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-black/80 hover:bg-black rounded-full flex items-center justify-center text-white shadow-lg -mr-4 opacity-0 group-hover/section:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-6 h-6" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Events */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4"
        >
          {events.map((event) => (
            <div key={event._id} className="w-64 sm:w-72 md:w-80 flex-shrink-0">
              <SportsCard event={event} onClick={() => onEventClick(event._id)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Main Sports Page Component
const SportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category') as SportCategory | null;

  const {
    events,
    liveEvents,
    upcomingEvents,
    featuredEvents,
    categories,
    pagination,
    isLoading,
    isLiveLoading,
    isUpcomingLoading,
    isFeaturedLoading,
    fetchAllEvents,
    fetchLiveEvents,
    fetchUpcomingEvents,
    fetchFeaturedEvents,
    fetchCategories,
    fetchEventsByCategory,
  } = useSportsStore();

  useEffect(() => {
    fetchCategories();
    fetchLiveEvents();
    fetchFeaturedEvents(5);
    fetchUpcomingEvents(10);
    
    if (selectedCategory) {
      fetchEventsByCategory(selectedCategory);
    } else {
      fetchAllEvents();
    }
  }, [
    fetchCategories,
    fetchLiveEvents,
    fetchFeaturedEvents,
    fetchUpcomingEvents,
    fetchAllEvents,
    fetchEventsByCategory,
    selectedCategory,
  ]);

  const handleEventClick = (id: string) => {
    navigate(`/sports/${id}`);
  };

  const handleCategorySelect = (category: SportCategory | null) => {
    if (category) {
      setSearchParams({ category });
    } else {
      setSearchParams({});
    }
  };

  // Combine live and featured events for hero slideshow
  // Prioritize live events, then featured upcoming events
  const heroEvents = [
    ...liveEvents,
    ...featuredEvents.filter(e => !liveEvents.some(l => l._id === e._id))
  ].slice(0, 5);

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Hero Section - Slideshow for multiple live/featured events */}
      {heroEvents.length > 0 && (
        <div className="relative">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-8 pt-4">
            {heroEvents.length > 1 ? (
              <HeroBannerSlideshow
                events={heroEvents}
                onEventClick={handleEventClick}
              />
            ) : (
              <SportsCard
                event={heroEvents[0]}
                variant="featured"
                onClick={() => handleEventClick(heroEvents[0]._id)}
              />
            )}
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-2">
          <button
            onClick={() => handleCategorySelect(null)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap',
              !selectedCategory
                ? 'bg-primary text-white'
                : 'bg-surface text-text-secondary hover:text-white hover:bg-surface-dark'
            )}
          >
            All Sports
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2',
                selectedCategory === cat.id
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary hover:text-white hover:bg-surface-dark'
              )}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
              {cat.count > 0 && (
                <span className="text-xs opacity-70">({cat.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Sections */}
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 space-y-12">
        {/* Live Now Section */}
        {liveEvents.length > 0 && (
          <HorizontalSection
            title="Live Now"
            icon={<Radio className="w-6 h-6 text-red-500" />}
            events={liveEvents}
            isLoading={isLiveLoading}
            onEventClick={handleEventClick}
          />
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <HorizontalSection
            title="Upcoming"
            icon={<Clock className="w-6 h-6 text-blue-500" />}
            events={upcomingEvents}
            isLoading={isUpcomingLoading}
            onEventClick={handleEventClick}
          />
        )}

        {/* Featured Events */}
        {featuredEvents.length > 1 && (
          <HorizontalSection
            title="Featured"
            icon={<Star className="w-6 h-6 text-yellow-500" />}
            events={featuredEvents.slice(1)}
            isLoading={isFeaturedLoading}
            onEventClick={handleEventClick}
          />
        )}

        {/* All Events / Category Events */}
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3 mb-6">
            <Trophy className="w-6 h-6 text-primary" />
            {selectedCategory
              ? `${categories.find((c) => c.id === selectedCategory)?.name || selectedCategory} Events`
              : 'All Events'}
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="aspect-video bg-surface animate-pulse rounded-xl" />
              ))}
            </div>
          ) : events.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {events.map((event) => (
                  <SportsCard
                    key={event._id}
                    event={event}
                    onClick={() => handleEventClick(event._id)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => {
                        if (selectedCategory) {
                          fetchEventsByCategory(selectedCategory, page);
                        } else {
                          fetchAllEvents({ page });
                        }
                      }}
                      className={cn(
                        'w-10 h-10 rounded-lg font-medium transition-colors',
                        pagination.page === page
                          ? 'bg-primary text-white'
                          : 'bg-surface text-text-secondary hover:text-white hover:bg-surface-dark'
                      )}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <Trophy className="w-16 h-16 text-text-secondary mx-auto mb-4" />
              <p className="text-text-secondary text-lg">No events found</p>
              {selectedCategory && (
                <button
                  onClick={() => handleCategorySelect(null)}
                  className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  View All Sports
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SportsPage;
