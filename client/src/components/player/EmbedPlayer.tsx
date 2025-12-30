import React, { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils';

// Vidrock.net base URL
const VIDROCK_BASE_URL = 'https://vidrock.net';

interface EmbedPlayerProps {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  title?: string;
  subtitle?: string;
  posterPath?: string;
  onBack?: () => void;
  onProgressUpdate?: (progress: number, duration: number) => void;
  className?: string;
}

// Build the embed URL according to vidrock.net documentation
const buildEmbedUrl = (
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  season?: number,
  episode?: number,
  options?: {
    autoplay?: boolean;
    autonext?: boolean;
    theme?: string;
    download?: boolean;
    nextbutton?: boolean;
    episodeselector?: boolean;
    lang?: string;
    muted?: boolean;
  }
) => {
  let url = VIDROCK_BASE_URL;
  
  if (mediaType === 'movie') {
    url += `/movie/${tmdbId}`;
  } else {
    url += `/tv/${tmdbId}/${season || 1}/${episode || 1}`;
  }
  
  // Add query parameters
  const params = new URLSearchParams();
  
  if (options?.autoplay) params.append('autoplay', 'true');
  if (options?.autonext) params.append('autonext', 'true');
  if (options?.theme) params.append('theme', options.theme);
  if (options?.download === false) params.append('download', 'false');
  if (options?.nextbutton === false) params.append('nextbutton', 'false');
  if (options?.episodeselector === false) params.append('episodeselector', 'false');
  if (options?.lang) params.append('lang', options.lang);
  if (options?.muted === false) params.append('muted', '0');
  
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
};

export const EmbedPlayer: React.FC<EmbedPlayerProps> = ({
  tmdbId,
  mediaType,
  season,
  episode,
  title,
  subtitle,
  posterPath,
  onBack,
  onProgressUpdate,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const clickShieldRef = useRef<HTMLDivElement>(null);
  const [clickCount, setClickCount] = useState(0);
  const [shieldActive, setShieldActive] = useState(true);
  const lastClickTime = useRef<number>(0);
  const clickTimestamps = useRef<number[]>([]);

  // Reset loading state when video source changes (season, episode, or tmdbId changes)
  useEffect(() => {
    setIsLoading(true);
    setClickCount(0); // Reset click shield
    setShieldActive(true); // Re-enable shield for new video
    clickTimestamps.current = [];
  }, [tmdbId, season, episode]);

  // Build embed URL with default/white theme
  // Note: We disable embedded player's episode selector since we have our own navigation
  const embedUrl = buildEmbedUrl(tmdbId, mediaType, season, episode, {
    autoplay: true,
    autonext: mediaType === 'tv',
    // No theme = default white theme
    download: false,
    nextbutton: false, // We have our own episode navigation
    episodeselector: false, // We have our own episode selector
    muted: false, // Start with audio enabled
  });

  // Block navigation attempts from iframe
  useEffect(() => {
    // Intercept beforeunload to prevent redirects
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // If we're being redirected while player is open, block it
      const currentUrl = window.location.href;
      if (currentUrl.includes('/watch') || currentUrl.includes('/movie') || currentUrl.includes('/tv')) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    // Block any new window/tab that the embed might try to open
    const handleBlur = () => {
      // When window loses focus, it might be due to a popup
      // Refocus back to our window
      setTimeout(() => {
        window.focus();
      }, 50);
    };

    // Block middle-click and ctrl+click that might open ads
    const handleAuxClick = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('auxclick', handleAuxClick, true);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Prevent location changes via history API
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      const url = args[2]?.toString() || '';
      if (url.includes('tmll') || url.includes('rg4') || url.includes('.xyz') || url.includes('.top')) {
        console.log('[AdBlocker] Blocked pushState redirect:', url);
        return;
      }
      return originalPushState.apply(history, args);
    };
    
    history.replaceState = function(...args) {
      const url = args[2]?.toString() || '';
      if (url.includes('tmll') || url.includes('rg4') || url.includes('.xyz') || url.includes('.top')) {
        console.log('[AdBlocker] Blocked replaceState redirect:', url);
        return;
      }
      return originalReplaceState.apply(history, args);
    };

    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('auxclick', handleAuxClick, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  // Click shield: Block first few clicks which are usually ad-redirects
  const handleClickShield = useCallback((e: React.MouseEvent) => {
    const now = Date.now();
    
    // Track click timestamps to detect rapid clicking
    clickTimestamps.current.push(now);
    // Keep only last 5 clicks
    if (clickTimestamps.current.length > 5) {
      clickTimestamps.current.shift();
    }
    
    // Check for rapid clicking (more than 3 clicks in 2 seconds = suspicious)
    const recentClicks = clickTimestamps.current.filter(t => now - t < 2000);
    if (recentClicks.length > 3) {
      e.preventDefault();
      e.stopPropagation();
      console.log('[AdBlocker] Blocked rapid clicking pattern');
      return;
    }

    const timeSinceLastClick = now - lastClickTime.current;
    lastClickTime.current = now;

    // If clicks are coming too fast (< 500ms), they're likely automated/ads
    if (timeSinceLastClick < 500 && clickCount > 0) {
      e.preventDefault();
      e.stopPropagation();
      console.log('[AdBlocker] Blocked rapid click (likely ad)');
      return;
    }

    // Single click to dismiss shield - just absorb the first click
    e.preventDefault();
    e.stopPropagation();
    setClickCount(prev => prev + 1);
    
    // Immediately disable shield after first click
    setShieldActive(false);
    console.log('[AdBlocker] Shield disabled - player is now interactive');
  }, [clickCount]);

  // Handle messages from the iframe (vidrock.net postMessage API)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from vidrock.net
      if (event.origin !== VIDROCK_BASE_URL) return;

      // Handle media data (continue watching feature)
      if (event.data?.type === 'MEDIA_DATA') {
        const mediaData = event.data.data;
        // Store in localStorage for continue watching
        const existingData = JSON.parse(localStorage.getItem('kaniflix-progress') || '[]');
        const updatedData = existingData.filter((item: { id: number }) => item.id !== mediaData.id);
        updatedData.push(mediaData);
        localStorage.setItem('kaniflix-progress', JSON.stringify(updatedData));
      }

      // Handle player events
      if (event.data?.type === 'PLAYER_EVENT') {
        const { event: eventType, currentTime, duration } = event.data.data;
        
        if (eventType === 'timeupdate' && onProgressUpdate) {
          onProgressUpdate(currentTime, duration);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onProgressUpdate]);

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    // Keep shield active even after load - user must click 3 times to dismiss
    // Don't auto-disable, let user clicks handle it
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          if (onBack) {
            onBack();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  // Generate poster URL for loading state
  const posterUrl = posterPath 
    ? `https://image.tmdb.org/t/p/w1280${posterPath}`
    : null;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full bg-black overflow-hidden',
        className
      )}
    >
      {/* Loading State with Details */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-20 bg-black flex items-center justify-center"
          >
            {/* Background poster blur */}
            {posterUrl && (
              <div 
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: `url(${posterUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(20px)',
                }}
              />
            )}
            
            {/* Loading content */}
            <div className="relative z-10 text-center px-6">
              {/* Spinner */}
              <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-6" />
              
              {/* Title */}
              {title && (
                <h2 className="text-2xl md:text-3xl font-bold mb-2">{title}</h2>
              )}
              
              {/* Subtitle (episode info) */}
              {subtitle && (
                <p className="text-lg text-white/70 mb-4">{subtitle}</p>
              )}
              
              {/* Loading message */}
              <p className="text-white/50">
                {mediaType === 'movie' 
                  ? 'Preparing your movie...'
                  : 'Loading episode...'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click Shield - Absorbs first ad-triggering click silently */}
      {shieldActive && !isLoading && (
        <div
          ref={clickShieldRef}
          onClick={handleClickShield}
          className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer"
          style={{ background: 'transparent' }}
        >
          {/* Invisible shield - just absorbs first click */}
        </div>
      )}

      {/* Iframe Player - Ad blocking handled by JS/CSS instead of sandbox */}
      <iframe
        ref={iframeRef}
        src={embedUrl}
        className="absolute inset-0 w-full h-full"
        allowFullScreen
        scrolling="no"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        referrerPolicy="no-referrer"
        style={{ 
          border: 'none',
          overflow: 'hidden',
          scrollbarWidth: 'none',
        }}
        onLoad={handleIframeLoad}
      />

      {/* Invisible overlay to catch popup attempts at edges */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 z-20" 
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      />
      <div 
        className="absolute bottom-0 left-0 right-0 h-1 z-20" 
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      />
    </div>
  );
};

export default EmbedPlayer;
