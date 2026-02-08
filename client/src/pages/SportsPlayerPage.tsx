import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Share2,
  Heart,
  Radio,
  Calendar,
  MapPin,
  Clock,
  Eye,
  Trophy,
  AlertCircle,
  Play,
  Loader2,
  Users,
  Zap,
} from 'lucide-react';
import { useSportsStore, useAuthStore } from '@/store';
import { sportsService, getProxyUrl } from '@/services';
import { useSubscription } from '@/hooks';
import { SubscriptionGate } from '@/components/ui';
import { cn } from '@/utils';
import type { SportsStreamInfo } from '@/types';

// JWPlayer type declarations
declare global {
  interface Window {
    jwplayer: (id: string) => JWPlayer;
  }
}

interface JWPlayer {
  setup: (config: JWPlayerConfig) => JWPlayer;
  on: (event: string, callback: () => void) => void;
  play: () => void;
  pause: () => void;
  seek: (position: number) => void;
  setVolume: (volume: number) => void;
  setMute: (mute: boolean) => void;
  getVolume: () => number;
  getMute: () => boolean;
  getPosition: () => number;
  getDuration: () => number;
  getState: () => string;
  remove: () => void;
  setFullscreen: (fullscreen: boolean) => void;
}

interface JWPlayerConfig {
  file?: string;
  sources?: Array<{
    file: string;
    label?: string;
    type?: string;
  }>;
  image?: string;
  title?: string;
  width?: string;
  height?: string;
  aspectratio?: string;
  autostart?: boolean;
  mute?: boolean;
  repeat?: boolean;
  controls?: boolean;
  displaytitle?: boolean;
  displaydescription?: boolean;
  stretching?: string;
  skin?: {
    name?: string;
    active?: string;
    inactive?: string;
    background?: string;
  };
  logo?: {
    file?: string;
    position?: string;
    link?: string;
  };
  drm?: {
    clearkey?: {
      keyId: string;
      key: string;
    };
    widevine?: {
      url: string;
    };
  };
}

// JW Player Library URL
const JW_PLAYER_LIBRARY = '//content.jwplatform.com/libraries/SAHhwvZq.js';

// Premium Animated Countdown Timer
const CountdownTimer: React.FC<{ targetDate: string; onComplete?: () => void }> = ({
  targetDate,
  onComplete,
}) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();
      if (difference <= 0) {
        onComplete?.();
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  const timeUnits = [
    { value: timeLeft.days, label: 'Days' },
    { value: timeLeft.hours, label: 'Hours' },
    { value: timeLeft.minutes, label: 'Mins' },
    { value: timeLeft.seconds, label: 'Secs' },
  ];

  return (
    <div className="flex items-center justify-center gap-3 md:gap-4">
      {timeUnits.map((item, index) => (
        <motion.div
          key={index}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.1 }}
          className="text-center"
        >
          {/* Clean timer box */}
          <div className="w-14 md:w-20 h-14 md:h-20 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={item.value}
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="text-2xl md:text-3xl font-bold text-white"
              >
                {String(item.value).padStart(2, '0')}
              </motion.span>
            </AnimatePresence>
          </div>
          <span className="text-xs text-white/50 mt-2 block font-medium uppercase tracking-wider">
            {item.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
};

// Premium Live Badge with Pulse Animation
const LiveBadge: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1.5',
    md: 'px-3 py-1.5 text-sm gap-2',
    lg: 'px-4 py-2 text-base gap-2',
  };

  return (
    <span className={cn(
      'inline-flex items-center rounded-md bg-red-600 text-white font-semibold',
      sizeClasses[size]
    )}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
      </span>
      LIVE
    </span>
  );
};

// Animated Viewer Count
const ViewerCount: React.FC<{ count: number }> = ({ count }) => {
  const [displayCount, setDisplayCount] = useState(count);

  useEffect(() => {
    // Animate number changes
    const animateValue = () => {
      const duration = 500;
      const steps = 20;
      const stepTime = duration / steps;
      const increment = (count - displayCount) / steps;
      let currentStep = 0;

      const timer = setInterval(() => {
        currentStep++;
        setDisplayCount((prev) => Math.round(prev + increment));
        if (currentStep >= steps) {
          clearInterval(timer);
          setDisplayCount(count);
        }
      }, stepTime);

      return () => clearInterval(timer);
    };

    if (count !== displayCount) {
      animateValue();
    }
  }, [count, displayCount]);

  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10"
    >
      <Eye className="w-4 h-4 text-primary" />
      <span className="text-white font-semibold">{formatCount(displayCount)}</span>
      <span className="text-white/60 text-sm">watching</span>
    </motion.div>
  );
};

// Premium Team Card
const TeamCard: React.FC<{
  team: { name: string; logo?: string; score?: string };
  isHome?: boolean;
  isLive?: boolean;
}> = ({ team, isHome, isLive }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: isHome ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex-1 text-center"
    >
      {/* Team Logo - Clean styling */}
      <div className="inline-block mb-3">
        {team.logo ? (
          <img
            src={team.logo}
            alt={team.name}
            className="w-16 h-16 md:w-24 md:h-24 object-contain"
          />
        ) : (
          <div className="w-16 h-16 md:w-24 md:h-24 bg-white/10 rounded-full flex items-center justify-center">
            <Trophy className="w-8 h-8 text-white/40" />
          </div>
        )}
      </div>

      {/* Team Name */}
      <h3 className="text-base md:text-xl font-semibold text-white mb-2 line-clamp-1">
        {team.name}
      </h3>

      {/* Score - Clean display */}
      {isLive && team.score && (
        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-3xl md:text-5xl font-bold text-white"
        >
          {team.score}
        </motion.span>
      )}
    </motion.div>
  );
};

// VS Divider with glow
const VSDivider: React.FC<{ isLive?: boolean }> = () => {
  return (
    <div className="px-3 md:px-6">
      <div className="bg-white/10 rounded-full px-3 py-2 md:px-4 md:py-3 border border-white/10">
        <span className="text-lg md:text-2xl font-bold text-white/60">
          VS
        </span>
      </div>
    </div>
  );
};

const SportsPlayerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { currentEvent, isEventLoading, fetchEventById } = useSportsStore();
  const { hasFeatureAccess, isLoading: subscriptionLoading } = useSubscription();
  const sportsAccess = hasFeatureAccess('sports');

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<JWPlayer | null>(null);
  const [streamInfo, setStreamInfo] = useState<SportsStreamInfo | null>(null);
  const [isStreamLoading, setIsStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  // Fetch event details
  useEffect(() => {
    if (id) {
      fetchEventById(id);
    }
  }, [id, fetchEventById]);

  // Fetch stream info when authenticated and event is available
  useEffect(() => {
    const loadStreamInfo = async () => {
      if (!id || !isAuthenticated || !currentEvent) return;

      // Only load stream for live or ended events
      if (currentEvent.status === 'upcoming') return;

      setIsStreamLoading(true);
      setStreamError(null);

      try {
        const info = await sportsService.getSportsStreamInfo(id);
        setStreamInfo(info);
      } catch (error) {
        setStreamError(
          error instanceof Error ? error.message : 'Failed to load stream'
        );
      } finally {
        setIsStreamLoading(false);
      }
    };

    loadStreamInfo();
  }, [id, isAuthenticated, currentEvent]);

  // Initialize JW Player
  useEffect(() => {
    if (!streamInfo || !playerContainerRef.current) return;

    // Load JWPlayer script if not already loaded
    const loadJWPlayer = () => {
      return new Promise<void>((resolve, reject) => {
        if (typeof window.jwplayer === 'function') {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = JW_PLAYER_LIBRARY;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load the stream'));
        document.body.appendChild(script);
      });
    };

    const initPlayer = async () => {
      try {
        await loadJWPlayer();

        // Determine the stream URL - use proxy if enabled
        const streamUrl = streamInfo.useProxy
          ? getProxyUrl(streamInfo.streamUrl, { forceProxy: true })
          : streamInfo.streamUrl;

        // Detect stream type from original URL (before proxying)
        const getStreamType = (url: string): string => {
          const lowerUrl = url.toLowerCase();
          if (lowerUrl.includes('.m3u8') || lowerUrl.includes('m3u8')) return 'hls';
          if (lowerUrl.includes('.mpd')) return 'dash';
          if (lowerUrl.includes('.mp4')) return 'mp4';
          return 'hls';
        };

        const streamType = getStreamType(streamInfo.streamUrl);

        // Build player config
        const config: JWPlayerConfig = {
          sources: [{
            file: streamUrl,
            type: streamType,
          }],
          image: currentEvent?.thumbnail,
          title: streamInfo.title,
          width: '100%',
          aspectratio: '16:9',
          autostart: true,
          mute: false,
          controls: true,
          displaytitle: true,
          stretching: 'uniform',
          skin: {
            name: 'sport',
            active: '#e50914',
            inactive: '#ffffff',
            background: 'rgba(0,0,0,0.7)',
          },
        };

        // Add quality options if available
        if (streamInfo.qualityOptions && streamInfo.qualityOptions.length > 0) {
          config.sources = streamInfo.qualityOptions.map((q) => ({
            file: streamInfo.useProxy ? getProxyUrl(q.url, { forceProxy: true }) : q.url,
            label: q.label,
            type: getStreamType(q.url),
          }));
        }

        // Add DRM config if enabled
        if (streamInfo.drmEnabled && streamInfo.drmConfig) {
          if (streamInfo.drmConfig.type === 'clearkey' && streamInfo.drmConfig.clearkey) {
            config.drm = {
              clearkey: {
                keyId: streamInfo.drmConfig.clearkey.keyId,
                key: streamInfo.drmConfig.clearkey.key,
              },
            };
          } else if (streamInfo.drmConfig.type === 'widevine' && streamInfo.drmConfig.licenseUrl) {
            config.drm = {
              widevine: {
                url: streamInfo.drmConfig.licenseUrl,
              },
            };
          }
        }

        // Initialize player
        playerRef.current = window.jwplayer('jw-player').setup(config);

        playerRef.current.on('ready', () => {
          setIsPlayerReady(true);
        });

        playerRef.current.on('error', () => {
          setStreamError('Playback error occurred');
        });

        playerRef.current.on('setupError', () => {
          setStreamError('Failed to initialize player');
        });
      } catch (error) {
        setStreamError(
          error instanceof Error ? error.message : 'Failed to initialize player'
        );
      }
    };

    initPlayer();

    // Cleanup
    return () => {
      if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
      }
      setIsPlayerReady(false);
    };
  }, [streamInfo, currentEvent?.thumbnail]);

  // Handle share
  const handleShare = useCallback(async () => {
    if (navigator.share) {
      await navigator.share({
        title: currentEvent?.title,
        text: currentEvent?.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  }, [currentEvent]);

  // Loading state
  if (isEventLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-white/60 mt-4">Loading event...</p>
        </div>
      </div>
    );
  }

  // Not found
  if (!currentEvent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-6" />
        <h1 className="text-2xl font-bold text-white mb-3">Event Not Found</h1>
        <p className="text-white/60 mb-8 text-center max-w-md">
          The event you're looking for doesn't exist or has been removed.
        </p>
        <Link
          to="/sports"
          className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors"
        >
          Browse Sports
        </Link>
      </div>
    );
  }

  const isLive = currentEvent.isLive && currentEvent.status === 'live';
  const isUpcoming = currentEvent.status === 'upcoming';

  return (
    <div className="min-h-screen bg-background">
      {/* Premium Header with Glassmorphism */}
      {/* Main Content */}
      <main className="pt-5">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 mb-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/sports')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group"
          >
            <div className="p-2 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="hidden sm:inline font-medium">Back to Sports</span>
          </button>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsLiked(!isLiked)}
              className={cn(
                'p-3 rounded-full transition-all duration-300',
                isLiked
                  ? 'bg-red-500/20 text-red-500 shadow-lg shadow-red-500/20'
                  : 'bg-white/10 text-white hover:bg-white/20'
              )}
            >
              <Heart className={cn('w-5 h-5', isLiked && 'fill-current')} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleShare}
              className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </motion.button>
          </div>
        </div>


        {/* Player Section with Premium Container */}
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8">
          <div className="mb-6">
            <div className="rounded-xl overflow-hidden bg-black border border-white/10">
              {isUpcoming ? (
                // Upcoming Event - Premium Countdown
                <div
                  className="relative aspect-video bg-cover bg-center"
                  style={{ backgroundImage: `url(${currentEvent.banner || currentEvent.thumbnail})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/60 backdrop-blur-sm" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
                    {/* Status Badge */}
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="mb-6"
                    >
                      <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold shadow-lg shadow-blue-500/25">
                        <Clock className="w-5 h-5" />
                        STARTING SOON
                      </span>
                    </motion.div>

                    {/* Event Title */}
                    <motion.h2
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="text-2xl md:text-4xl font-black text-white mb-2 text-center"
                    >
                      {currentEvent.title}
                    </motion.h2>

                    <motion.p
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-white/60 mb-8"
                    >
                      {new Date(currentEvent.scheduledAt).toLocaleDateString('en-IN', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Asia/Kolkata',
                      })} IST
                    </motion.p>

                    {/* Countdown */}
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <CountdownTimer
                        targetDate={currentEvent.scheduledAt}
                        onComplete={() => window.location.reload()}
                      />
                    </motion.div>

                    <motion.p
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-white/40 mt-8 text-center text-sm"
                    >
                      <Zap className="w-4 h-4 inline mr-1" />
                      Stream will auto-start when the event goes live
                    </motion.p>
                  </div>
                </div>
              ) : !isAuthenticated ? (
                // Not authenticated - Premium Login Prompt
                <div
                  className="relative aspect-video bg-cover bg-center"
                  style={{ backgroundImage: `url(${currentEvent.banner || currentEvent.thumbnail})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-black/70 backdrop-blur-sm" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl" />
                      <div className="relative p-6 bg-white/10 rounded-full border border-white/20">
                        <Play className="w-12 h-12 text-white" />
                      </div>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Login Required</h2>
                    <p className="text-white/60 text-center mb-8 max-w-md">
                      Sign in to your account to watch this live stream
                    </p>
                    <Link
                      to="/login"
                      className="px-10 py-4 bg-gradient-to-r from-primary to-red-600 text-white font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-primary/30"
                    >
                      Sign In to Watch
                    </Link>
                  </div>
                </div>
              ) : !sportsAccess.hasAccess ? (
                // No sports subscription - Show upgrade prompt
                <div
                  className="relative aspect-video bg-cover bg-center"
                  style={{ backgroundImage: `url(${currentEvent.banner || currentEvent.thumbnail})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-black/70 backdrop-blur-sm" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <SubscriptionGate feature="sports" showInline />
                  </div>
                </div>
              ) : subscriptionLoading || isStreamLoading ? (
                // Loading State - Clean
                <div className="aspect-video flex items-center justify-center bg-surface">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-white/60">Connecting to stream...</p>
                  </div>
                </div>
              ) : streamError ? (
                // Error State - Clean
                <div className="aspect-video flex items-center justify-center bg-surface">
                  <div className="text-center px-4">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Stream Unavailable</h3>
                    <p className="text-white/60 mb-6 max-w-md">{streamError}</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              ) : (
                // JW Player with overlays
                <div ref={playerContainerRef} className="relative">
                  <div id="jw-player" className="aspect-video" />

                  {/* Live Badge Overlay */}
                  {isLive && isPlayerReady && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="absolute top-4 left-4 z-10"
                    >
                      <LiveBadge size="md" />
                    </motion.div>
                  )}

                  {/* View Count Overlay */}
                  {isLive && currentEvent.viewCount > 0 && isPlayerReady && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="absolute top-4 right-4 z-10"
                    >
                      <ViewerCount count={currentEvent.viewCount} />
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Event Details */}
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title & Status */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-semibold uppercase tracking-wider">
                    {currentEvent.category}
                  </span>
                  {currentEvent.tournament && (
                    <>
                      <span className="text-white/30">•</span>
                      <span className="text-white/60 text-sm">
                        {currentEvent.tournament}
                      </span>
                    </>
                  )}
                  {isLive && <LiveBadge size="sm" />}
                </div>
                <h1 className="text-2xl md:text-4xl font-black text-white">
                  {currentEvent.title}
                </h1>
              </motion.div>

              {/* Teams Card */}
              {currentEvent.team1?.name && currentEvent.team2?.name && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white/5 rounded-xl p-6 border border-white/10"
                >
                  <div className="flex items-center justify-between">
                    <TeamCard team={currentEvent.team1} isHome isLive={isLive} />
                    <VSDivider isLive={isLive} />
                    <TeamCard team={currentEvent.team2} isLive={isLive} />
                  </div>
                </motion.div>
              )}

              {/* Description Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/5 rounded-xl p-5 border border-white/10"
              >
                <h2 className="text-base font-semibold text-white mb-3">About This Event</h2>
                <p className="text-white/70 text-sm leading-relaxed">
                  {currentEvent.description}
                </p>
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Event Info Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
              >
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Event Details
                </h2>

                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                    <Calendar className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-white font-medium">
                        {new Date(currentEvent.scheduledAt).toLocaleDateString('en-IN', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          timeZone: 'Asia/Kolkata',
                        })}
                      </p>
                      <p className="text-white/50 text-sm">
                        {new Date(currentEvent.scheduledAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Kolkata',
                        })} IST
                      </p>
                    </div>
                  </div>

                  {currentEvent.venue && (
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                      <MapPin className="w-5 h-5 text-primary" />
                      <span className="text-white">{currentEvent.venue}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                    <Trophy className="w-5 h-5 text-primary" />
                    <span className="text-white capitalize">{currentEvent.category}</span>
                  </div>

                  {currentEvent.viewCount > 0 && (
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                      <Users className="w-5 h-5 text-primary" />
                      <span className="text-white">
                        {currentEvent.viewCount.toLocaleString()} total views
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Status Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className={cn(
                  'rounded-xl p-5 border',
                  isLive
                    ? 'bg-red-500/10 border-red-500/20'
                    : isUpcoming
                      ? 'bg-blue-500/10 border-blue-500/20'
                      : 'bg-white/5 border-white/10'
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  {isLive ? (
                    <>
                      <Radio className="w-5 h-5 text-red-500" />
                      <span className="font-semibold text-red-400">Broadcasting Live</span>
                    </>
                  ) : isUpcoming ? (
                    <>
                      <Clock className="w-5 h-5 text-blue-500" />
                      <span className="font-semibold text-blue-400">Coming Soon</span>
                    </>
                  ) : (
                    <>
                      <Trophy className="w-5 h-5 text-white/50" />
                      <span className="font-semibold text-white/50">Event Ended</span>
                    </>
                  )}
                </div>
                <p className="text-white/60 text-sm">
                  {isLive
                    ? 'You\'re watching this event live.'
                    : isUpcoming
                      ? 'Stream will start when the event begins.'
                      : 'This event has ended.'}
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SportsPlayerPage;
