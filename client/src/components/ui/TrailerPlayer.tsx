import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/utils';

// Declare YouTube IFrame API types
declare global {
    interface Window {
        YT: {
            Player: new (
                elementId: string,
                options: {
                    videoId: string;
                    playerVars?: Record<string, number | string>;
                    events?: {
                        onReady?: (event: { target: YTPlayer }) => void;
                        onStateChange?: (event: { data: number }) => void;
                    };
                }
            ) => YTPlayer;
            PlayerState: {
                ENDED: number;
                PLAYING: number;
                PAUSED: number;
            };
        };
        onYouTubeIframeAPIReady?: () => void;
    }
}

interface YTPlayer {
    playVideo: () => void;
    pauseVideo: () => void;
    mute: () => void;
    unMute: () => void;
    isMuted: () => boolean;
    seekTo: (seconds: number, allowSeekAhead: boolean) => void;
    getCurrentTime: () => number;
    getDuration: () => number;
    destroy: () => void;
}

interface TrailerPlayerProps {
    videoId: string;
    isPlaying: boolean;
    onClose: () => void;
    titleLogo?: string; // TMDB logo image URL
    title?: string; // Fallback title text
    className?: string;
}

// Load YouTube IFrame API script
let apiLoaded = false;
let apiLoading = false;
const loadYouTubeAPI = (): Promise<void> => {
    return new Promise((resolve) => {
        if (apiLoaded && window.YT) {
            resolve();
            return;
        }
        if (apiLoading) {
            // Wait for existing load
            const checkReady = setInterval(() => {
                if (window.YT && window.YT.Player) {
                    clearInterval(checkReady);
                    resolve();
                }
            }, 100);
            return;
        }
        apiLoading = true;
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
            apiLoaded = true;
            resolve();
        };
    });
};

/**
 * Premium Hotstar-style trailer player component
 * - Fullscreen video with 110% zoom to eliminate black bars
 * - Hidden YouTube branding via gradients
 * - YouTube IFrame API for mute control without restart
 * - Title logo at bottom-left
 * - Starts at 3s, ends 8s before end
 */
export const TrailerPlayer: React.FC<TrailerPlayerProps> = ({
    videoId,
    isPlaying,
    onClose,
    titleLogo,
    title,
    className,
}) => {
    const [isMuted, setIsMuted] = useState(true);
    const [isLoaded, setIsLoaded] = useState(false);
    const [logoError, setLogoError] = useState(false);
    const playerRef = useRef<YTPlayer | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const playerIdRef = useRef(`yt-player-${Date.now()}`);
    const endCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Reset logo error state when titleLogo changes
    React.useEffect(() => {
        setLogoError(false);
    }, [titleLogo]);

    // Initialize YouTube player
    useEffect(() => {
        if (!isPlaying || !videoId) return;

        const initPlayer = async () => {
            await loadYouTubeAPI();

            // Create player div if it doesn't exist
            if (!document.getElementById(playerIdRef.current)) {
                const div = document.createElement('div');
                div.id = playerIdRef.current;
                containerRef.current?.appendChild(div);
            }

            playerRef.current = new window.YT.Player(playerIdRef.current, {
                videoId,
                playerVars: {
                    autoplay: 1,
                    mute: 1, // Start muted
                    controls: 0,
                    modestbranding: 1,
                    rel: 0,
                    showinfo: 0,
                    start: 3, // Skip first 3 seconds
                    iv_load_policy: 3,
                    disablekb: 1,
                    fs: 0,
                    playsinline: 1,
                },
                events: {
                    onReady: (event) => {
                        setIsLoaded(true);
                        event.target.playVideo();

                        // Check for end time (8s before end)
                        endCheckIntervalRef.current = setInterval(() => {
                            if (playerRef.current) {
                                const duration = playerRef.current.getDuration();
                                const currentTime = playerRef.current.getCurrentTime();
                                if (duration > 0 && currentTime >= duration - 8) {
                                    // Loop back to start (3s)
                                    playerRef.current.seekTo(3, true);
                                }
                            }
                        }, 500);
                    },
                    onStateChange: (event) => {
                        // If video ended, loop back to 3s
                        if (event.data === window.YT?.PlayerState?.ENDED) {
                            playerRef.current?.seekTo(3, true);
                            playerRef.current?.playVideo();
                        }
                    },
                },
            });
        };

        initPlayer();

        return () => {
            if (endCheckIntervalRef.current) {
                clearInterval(endCheckIntervalRef.current);
            }
            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
            setIsLoaded(false);
        };
    }, [isPlaying, videoId]);

    // Handle mute toggle without restarting
    const toggleMute = useCallback(() => {
        if (playerRef.current) {
            if (isMuted) {
                playerRef.current.unMute();
            } else {
                playerRef.current.mute();
            }
            setIsMuted(!isMuted);
        }
    }, [isMuted]);

    // Handle close - cleanup
    const handleClose = useCallback(() => {
        if (endCheckIntervalRef.current) {
            clearInterval(endCheckIntervalRef.current);
        }
        if (playerRef.current) {
            playerRef.current.destroy();
            playerRef.current = null;
        }
        setIsLoaded(false);
        onClose();
    }, [onClose]);

    if (!isPlaying || !videoId) return null;

    return (
        <AnimatePresence>
            {isPlaying && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isLoaded ? 1 : 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className={cn(
                        'absolute inset-0 z-20 overflow-hidden bg-black',
                        className
                    )}
                >
                    {/* Video Container with 130% scale to eliminate black bars */}
                    <div
                        ref={containerRef}
                        className="absolute inset-0 flex items-center justify-center"
                        style={{
                            transform: 'scale(1.3)',
                            transformOrigin: 'center center'
                        }}
                    >
                        {/* Player will be injected here by YouTube API */}
                        <div
                            id={playerIdRef.current}
                            className="w-full h-full"
                            style={{ pointerEvents: 'none' }}
                        />
                    </div>

                    {/* Overlay gradients - cinematic blend for seamless transition */}
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Top gradient - hide YouTube title bar */}
                        {/* <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black via-black/60 to-transparent" /> */}
                        {/* Bottom gradient stack - ultra smooth blend with #141414 content section */}
                        <div
                            className="absolute inset-x-0 bottom-0 h-80"
                            style={{
                                background: `linear-gradient(to top,
                                    #141414 0%,
                                    #141414 5%,
                                    rgba(20, 20, 20, 0.98) 10%,
                                    rgba(20, 20, 20, 0.92) 20%,
                                    rgba(20, 20, 20, 0.80) 35%,
                                    rgba(20, 20, 20, 0.60) 50%,
                                    rgba(20, 20, 20, 0.35) 65%,
                                    rgba(20, 20, 20, 0.15) 80%,
                                    rgba(0, 0, 0, 0.05) 90%,
                                    transparent 100%
                                )`
                            }}
                        />
                        {/* Left side vignette - full height */}
                        {/* <div
                            className="absolute inset-y-0 left-0 w-64"
                            style={{
                                background: `linear-gradient(to right,
                                    rgba(0, 0, 0, 0.7) 0%,
                                    rgba(0, 0, 0, 0.4) 30%,
                                    rgba(0, 0, 0, 0.1) 70%,
                                    transparent 100%
                                )`
                            }}
                        /> */}
                        {/* Right side vignette - full height */}
                        {/* <div
                            className="absolute inset-y-0 right-0 w-48"
                            style={{
                                background: `linear-gradient(to left,
                                    rgba(0, 0, 0, 0.5) 0%,
                                    rgba(0, 0, 0, 0.25) 30%,
                                    rgba(0, 0, 0, 0.05) 70%,
                                    transparent 100%
                                )`
                            }}
                        /> */}
                        {/* Bottom-left corner gradient - minimal edge blend */}
                        {/* <div
                            className="absolute bottom-0 left-0 w-24 h-24"
                            style={{
                                background: `radial-gradient(circle at bottom left,
                                    #141414 0%,
                                    rgba(20, 20, 20, 0.8) 30%,
                                    rgba(20, 20, 20, 0.4) 60%,
                                    transparent 100%
                                )`
                            }}
                        /> */}
                        {/* Bottom-right corner gradient - minimal edge blend */}
                        {/* <div
                            className="absolute bottom-0 right-0 w-24 h-24"
                            style={{
                                background: `radial-gradient(circle at bottom right,
                                    #141414 0%,
                                    rgba(20, 20, 20, 0.8) 30%,
                                    rgba(20, 20, 20, 0.4) 60%,
                                    transparent 100%
                                )`
                            }}
                        /> */}
                    </div>

                    {/* Title Logo - Bottom Left (prioritize logo over text, with proper fallback) */}
                    {(titleLogo || title) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                            className="absolute bottom-12 left-8 md:left-12 lg:left-16 z-30 max-w-md"
                        >
                            {titleLogo && !logoError ? (
                                <img
                                    src={titleLogo}
                                    alt={title || 'Title'}
                                    className="max-h-16 md:max-h-20 lg:max-h-24 w-auto object-contain drop-shadow-2xl"
                                    onError={() => {
                                        // If logo fails to load, show text fallback
                                        setLogoError(true);
                                    }}
                                />
                            ) : title ? (
                                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white drop-shadow-2xl">
                                    {title}
                                </h2>
                            ) : null}
                        </motion.div>
                    )}

                    {/* Controls - Bottom Right */}
                    <div className="absolute bottom-12 right-8 md:right-12 lg:right-16 flex items-center gap-3 z-30">
                        {/* Mute Toggle */}
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={toggleMute}
                            className="p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors border border-white/30"
                            title={isMuted ? 'Unmute' : 'Mute'}
                        >
                            {isMuted ? (
                                <VolumeX className="w-5 h-5 text-white" />
                            ) : (
                                <Volume2 className="w-5 h-5 text-white" />
                            )}
                        </motion.button>

                        {/* Close Button */}
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleClose}
                            className="p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors border border-white/30"
                            title="Close Trailer"
                        >
                            <X className="w-5 h-5 text-white" />
                        </motion.button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default TrailerPlayer;
