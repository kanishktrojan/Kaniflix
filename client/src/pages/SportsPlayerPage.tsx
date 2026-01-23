import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
} from 'lucide-react';
import { useSportsStore, useAuthStore } from '@/store';
import { sportsService, getProxyUrl } from '@/services';
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

// Countdown Timer for Upcoming Events
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

  return (
    <div className="flex items-center justify-center gap-4 md:gap-8">
      {[
        { value: timeLeft.days, label: 'Days' },
        { value: timeLeft.hours, label: 'Hours' },
        { value: timeLeft.minutes, label: 'Minutes' },
        { value: timeLeft.seconds, label: 'Seconds' },
      ].map((item, index) => (
        <div key={index} className="text-center">
          <div className="w-16 md:w-20 h-16 md:h-20 bg-surface rounded-xl flex items-center justify-center border border-white/10">
            <span className="text-2xl md:text-4xl font-bold text-white">
              {String(item.value).padStart(2, '0')}
            </span>
          </div>
          <span className="text-xs md:text-sm text-text-secondary mt-2 block">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};

const SportsPlayerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { currentEvent, isEventLoading, fetchEventById } = useSportsStore();

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
          // Default to HLS for most live streams
          return 'hls';
        };
        
        const streamType = getStreamType(streamInfo.streamUrl);

        // Build player config - use sources array to explicitly set type
        const config: JWPlayerConfig = {
          // Use sources instead of file to explicitly specify type
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

        // Add quality options if available (also proxy them if needed)
        if (streamInfo.qualityOptions && streamInfo.qualityOptions.length > 0) {
          config.sources = streamInfo.qualityOptions.map((q) => ({
            file: streamInfo.useProxy ? getProxyUrl(q.url, { forceProxy: true }) : q.url,
            label: q.label,
            type: getStreamType(q.url), // Detect type for each quality option
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
  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: currentEvent?.title,
        text: currentEvent?.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      // You could show a toast here
    }
  };

  // Loading state
  if (isEventLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  // Not found
  if (!currentEvent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Event Not Found</h1>
        <p className="text-text-secondary mb-6">
          The event you're looking for doesn't exist or has been removed.
        </p>
        <Link
          to="/sports"
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
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
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-b from-background via-background to-transparent">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/sports')}
            className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Sports</span>
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={cn(
                'p-2 rounded-full transition-colors',
                isLiked
                  ? 'bg-red-500/20 text-red-500'
                  : 'bg-white/10 text-white hover:bg-white/20'
              )}
            >
              <Heart className={cn('w-5 h-5', isLiked && 'fill-current')} />
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-screen-2xl mx-auto px-4 md:px-8 pb-12">
        {/* Player Section */}
        <div className="relative rounded-2xl overflow-hidden bg-black mb-8">
          {isUpcoming ? (
            // Upcoming Event - Show Countdown
            <div
              className="relative aspect-video bg-cover bg-center"
              style={{ backgroundImage: `url(${currentEvent.banner || currentEvent.thumbnail})` }}
            >
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center px-4">
                <div className="text-center mb-8">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-bold mb-4">
                    <Clock className="w-4 h-4" />
                    UPCOMING
                  </span>
                  <h2 className="text-2xl md:text-4xl font-bold text-white mb-2">
                    {currentEvent.title}
                  </h2>
                  <p className="text-text-secondary">
                    {new Date(currentEvent.scheduledAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <CountdownTimer
                  targetDate={currentEvent.scheduledAt}
                  onComplete={() => window.location.reload()}
                />
                <p className="text-text-secondary mt-8 text-center max-w-md">
                  Set a reminder! The stream will start when the event goes live.
                </p>
              </div>
            </div>
          ) : !isAuthenticated ? (
            // Not authenticated - Show login prompt
            <div
              className="relative aspect-video bg-cover bg-center"
              style={{ backgroundImage: `url(${currentEvent.banner || currentEvent.thumbnail})` }}
            >
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center px-4">
                <Play className="w-20 h-20 text-white/30 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Login Required</h2>
                <p className="text-text-secondary text-center mb-6 max-w-md">
                  Please login to watch this stream
                </p>
                <Link
                  to="/login"
                  className="px-8 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Login to Watch
                </Link>
              </div>
            </div>
          ) : isStreamLoading ? (
            // Loading stream
            <div className="aspect-video flex items-center justify-center bg-surface">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                <p className="text-text-secondary">Loading stream...</p>
              </div>
            </div>
          ) : streamError ? (
            // Stream error
            <div className="aspect-video flex items-center justify-center bg-surface">
              <div className="text-center px-4">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Stream Unavailable</h3>
                <p className="text-text-secondary mb-4">{streamError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            // JW Player
            <div ref={playerContainerRef} className="relative">
              <div id="jw-player" className="aspect-video" />
              
              {/* Live Badge Overlay */}
              {isLive && isPlayerReady && (
                <div className="absolute top-4 left-4 z-10">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600 text-white text-sm font-bold">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    LIVE
                  </span>
                </div>
              )}

              {/* View Count Overlay */}
              {isLive && currentEvent.viewCount > 0 && isPlayerReady && (
                <div className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-black/60 rounded-full text-white text-sm">
                  <Eye className="w-4 h-4" />
                  {currentEvent.viewCount > 1000
                    ? `${(currentEvent.viewCount / 1000).toFixed(1)}K`
                    : currentEvent.viewCount}{' '}
                  watching
                </div>
              )}
            </div>
          )}
        </div>

        {/* Event Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & Status */}
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="text-primary uppercase text-sm font-medium tracking-wider">
                  {currentEvent.category}
                </span>
                {currentEvent.tournament && (
                  <>
                    <span className="text-text-secondary">•</span>
                    <span className="text-text-secondary text-sm">
                      {currentEvent.tournament}
                    </span>
                  </>
                )}
                {isLive && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold">
                    <Radio className="w-3 h-3" />
                    LIVE
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {currentEvent.title}
              </h1>
            </div>

            {/* Teams */}
            {currentEvent.team1?.name && currentEvent.team2?.name && (
              <div className="bg-surface rounded-xl p-6 border border-white/5">
                <div className="flex items-center justify-between">
                  {/* Team 1 */}
                  <div className="flex-1 text-center">
                    {currentEvent.team1.logo && (
                      <img
                        src={currentEvent.team1.logo}
                        alt={currentEvent.team1.name}
                        className="w-16 h-16 md:w-20 md:h-20 object-contain mx-auto mb-3"
                      />
                    )}
                    <h3 className="text-lg md:text-xl font-bold text-white">
                      {currentEvent.team1.name}
                    </h3>
                    {isLive && currentEvent.team1.score && (
                      <p className="text-3xl md:text-4xl font-bold text-primary mt-2">
                        {currentEvent.team1.score}
                      </p>
                    )}
                  </div>

                  {/* VS */}
                  <div className="px-4 md:px-8">
                    <span className="text-2xl font-bold text-text-secondary">VS</span>
                  </div>

                  {/* Team 2 */}
                  <div className="flex-1 text-center">
                    {currentEvent.team2.logo && (
                      <img
                        src={currentEvent.team2.logo}
                        alt={currentEvent.team2.name}
                        className="w-16 h-16 md:w-20 md:h-20 object-contain mx-auto mb-3"
                      />
                    )}
                    <h3 className="text-lg md:text-xl font-bold text-white">
                      {currentEvent.team2.name}
                    </h3>
                    {isLive && currentEvent.team2.score && (
                      <p className="text-3xl md:text-4xl font-bold text-primary mt-2">
                        {currentEvent.team2.score}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="bg-surface rounded-xl p-6 border border-white/5">
              <h2 className="text-lg font-semibold text-white mb-3">About</h2>
              <p className="text-text-secondary leading-relaxed">
                {currentEvent.description}
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Event Info Card */}
            <div className="bg-surface rounded-xl p-6 border border-white/5 space-y-4">
              <h2 className="text-lg font-semibold text-white">Event Details</h2>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-text-secondary">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-white">
                      {new Date(currentEvent.scheduledAt).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm">
                      {new Date(currentEvent.scheduledAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {currentEvent.venue && (
                  <div className="flex items-center gap-3 text-text-secondary">
                    <MapPin className="w-5 h-5 text-primary" />
                    <span className="text-white">{currentEvent.venue}</span>
                  </div>
                )}

                <div className="flex items-center gap-3 text-text-secondary">
                  <Trophy className="w-5 h-5 text-primary" />
                  <span className="text-white capitalize">{currentEvent.category}</span>
                </div>

                {currentEvent.viewCount > 0 && (
                  <div className="flex items-center gap-3 text-text-secondary">
                    <Eye className="w-5 h-5 text-primary" />
                    <span className="text-white">
                      {currentEvent.viewCount.toLocaleString()} views
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Status Card */}
            <div
              className={cn(
                'rounded-xl p-6 border',
                isLive
                  ? 'bg-red-500/10 border-red-500/30'
                  : isUpcoming
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : 'bg-gray-500/10 border-gray-500/30'
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                {isLive ? (
                  <>
                    <Radio className="w-5 h-5 text-red-500" />
                    <span className="font-bold text-red-500">Live Now</span>
                  </>
                ) : isUpcoming ? (
                  <>
                    <Clock className="w-5 h-5 text-blue-500" />
                    <span className="font-bold text-blue-500">Upcoming</span>
                  </>
                ) : (
                  <>
                    <Trophy className="w-5 h-5 text-gray-400" />
                    <span className="font-bold text-gray-400">Ended</span>
                  </>
                )}
              </div>
              <p className="text-sm text-text-secondary">
                {isLive
                  ? 'This event is currently streaming live.'
                  : isUpcoming
                  ? 'The stream will start when the event goes live.'
                  : 'This event has ended. Watch the replay if available.'}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SportsPlayerPage;
