import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { X, Loader2, AlertCircle } from 'lucide-react';
import type { FeaturedContentItem } from '@/services/featuredService';
import { featuredService } from '@/services/featuredService';

import { useAuthStore } from '@/store';

// JW Player is typed globally

const JW_PLAYER_LIBRARY = '//content.jwplatform.com/libraries/SAHhwvZq.js';

interface FeaturedVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: FeaturedContentItem | null;
}

export const FeaturedVideoModal: React.FC<FeaturedVideoModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  const { isAuthenticated } = useAuthStore();
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [streamInfo, setStreamInfo] = useState<any>(null);

  // Fetch stream info
  useEffect(() => {
    let mounted = true;
    const fetchStream = async () => {
      if (!isOpen || !item || !isAuthenticated) return;
      
      setIsLoading(true);
      setError(null);
      setStreamInfo(null);
      
      try {
        const info = await featuredService.getFeaturedStreamInfo(item._id);
        if (mounted) setStreamInfo(info);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load stream');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    
    fetchStream();
    
    return () => {
      mounted = false;
    };
  }, [isOpen, item, isAuthenticated]);

  // Initialize JW Player
  useEffect(() => {
    let mounted = true;

    const initPlayer = async () => {
      if (!streamInfo || !isOpen || !item || !playerContainerRef.current) return;

      try {
        // Load JWPlayer script if needed
        if (typeof window.jwplayer !== 'function') {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = JW_PLAYER_LIBRARY;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load player script'));
            document.body.appendChild(script);
          });
        }

        if (!mounted) return;

        const streamUrl = streamInfo.streamUrl;

        const getStreamType = (url: string) => {
          const lowerUrl = url.toLowerCase();
          if (lowerUrl.includes('.m3u8') || lowerUrl.includes('m3u8')) return 'hls';
          if (lowerUrl.includes('.mpd')) return 'dash';
          if (lowerUrl.includes('.mp4')) return 'mp4';
          return 'hls';
        };

        const config = {
          sources: [{
            file: streamUrl,
            type: getStreamType(streamInfo.streamUrl),
          }],
          image: item.backdropImage || item.posterImage,
          title: item.title,
          width: '100%',
          height: '100%',
          aspectratio: '16:9',
          autostart: true,
          mute: false,
          controls: true,
          displaytitle: true,
          stretching: 'uniform',
          skin: {
            name: 'netflix',
            active: '#e50914',
            inactive: '#ffffff',
            background: 'rgba(0,0,0,0.7)',
          },
        };

        playerRef.current = window.jwplayer('featured-jw-player').setup(config);

        playerRef.current.on('error', () => {
          if (mounted) setError('Playback error occurred');
        });

        playerRef.current.on('setupError', () => {
          if (mounted) setError('Failed to initialize player');
        });

      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to initialize player');
      }
    };

    initPlayer();

    return () => {
      mounted = false;
      if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
      }
    };
  }, [streamInfo, isOpen, item]);

  if (!isOpen || !item) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 sm:p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-[#181818] hover:bg-white/20 rounded-full text-white transition-all hover:scale-105 z-[10000] border border-white/10"
        >
          <X className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>

        <div className="w-full max-w-4xl">
          <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10">
            {!isAuthenticated ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <AlertCircle className="w-16 h-16 text-primary mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Login Required</h2>
                <p className="text-white/60 text-center">
                  Please sign in to watch this content.
                </p>
              </div>
            ) : isLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-white/60">Loading player...</p>
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Stream Unavailable</h3>
                <p className="text-white/60 mb-6 max-w-md text-center">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-primary text-white font-semibold rounded hover:bg-primary/90 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div id="featured-jw-player" ref={playerContainerRef} className="absolute inset-0 w-full h-full" />
            )}
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
};
