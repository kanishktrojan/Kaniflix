import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, AlertCircle, RefreshCw, HardDrive, Film, Tv, Download } from 'lucide-react';
import { cn } from '@/utils';
import { useLockBodyScroll, useSubscription } from '@/hooks';
import { downloadService } from '@/services';
import { SubscriptionGate } from './SubscriptionGate';
import type { DownloadStream } from '@/types';

interface DownloadModalProps {
    isOpen: boolean;
    onClose: () => void;
    tmdbId: number;
    mediaType: 'movie' | 'tv';
    title: string;
    posterPath?: string;
    season?: number;
    episode?: number;
    episodeName?: string;
}

// Quality category info
interface QualityCategory {
    label: string;
    shortLabel: string;
    gradient: string;
    glow: string;
    icon: string;
}

const QUALITY_CATEGORIES: Record<string, QualityCategory> = {
    '4k': {
        label: '4K Ultra HD',
        shortLabel: '4K',
        gradient: 'from-amber-400 via-orange-500 to-red-500',
        glow: 'shadow-amber-500/40',
        icon: '✨',
    },
    '1080p': {
        label: 'Full HD',
        shortLabel: '1080p',
        gradient: 'from-blue-400 via-blue-500 to-indigo-600',
        glow: 'shadow-blue-500/40',
        icon: '🎬',
    },
    '720p': {
        label: 'HD',
        shortLabel: '720p',
        gradient: 'from-slate-400 via-slate-500 to-slate-600',
        glow: 'shadow-slate-400/30',
        icon: '📺',
    },
    'other': {
        label: 'Standard',
        shortLabel: 'SD',
        gradient: 'from-gray-500 via-gray-600 to-gray-700',
        glow: 'shadow-gray-500/20',
        icon: '📹',
    },
};

/**
 * Determine quality category from quality string
 */
function getQualityCategory(quality: string): string {
    const q = quality.toLowerCase();
    if (q.includes('2160') || q.includes('4k') || q.includes('uhd')) return '4k';
    if (q.includes('1080')) return '1080p';
    if (q.includes('720')) return '720p';
    return 'other';
}

/**
 * Group streams by quality category
 */
function groupStreamsByQuality(streams: DownloadStream[]): Record<string, DownloadStream[]> {
    const groups: Record<string, DownloadStream[]> = {};

    // Initialize in order of quality
    ['4k', '1080p', '720p', 'other'].forEach(key => {
        groups[key] = [];
    });

    streams.forEach(stream => {
        const category = getQualityCategory(stream.quality);
        groups[category].push(stream);
    });

    // Remove empty categories
    Object.keys(groups).forEach(key => {
        if (groups[key].length === 0) {
            delete groups[key];
        }
    });

    return groups;
}

// Quality section header
const QualityHeader: React.FC<{
    category: QualityCategory;
    count: number;
}> = ({ category, count }) => (
    <div className="flex items-center gap-3 mb-4">
        <div className={cn(
            'flex items-center justify-center w-10 h-10 rounded-xl',
            'bg-gradient-to-br',
            category.gradient,
            'shadow-lg',
            category.glow
        )}>
            <span className="text-lg">{category.icon}</span>
        </div>
        <div>
            <h3 className="font-semibold text-white">{category.label}</h3>
            <p className="text-xs text-text-muted">{count} {count === 1 ? 'option' : 'options'} available</p>
        </div>
    </div>
);

// Stream item - simplified premium design
const StreamItem: React.FC<{
    stream: DownloadStream;
    category: QualityCategory;
    index: number;
    mediaTitle: string;
}> = ({ stream, category, index, mediaTitle }) => {
    const [isDownloading, setIsDownloading] = useState(false);

    // Format size - show "-- GB" if not available
    const formatSize = (size: string | undefined): string => {
        if (!size || size.trim() === '' || size === 'undefined' || size === 'null') {
            return '-- GB';
        }
        // If it's a duration like "3h 14m" or "49min", it's not a file size
        if (size.includes('min') || size.includes('h ')) {
            return '-- GB';
        }
        return size;
    };

    const handleDownload = async () => {
        setIsDownloading(true);

        try {
            // Create a temporary anchor element for download
            const link = document.createElement('a');
            link.href = stream.url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';

            // For direct downloads, try to trigger download
            // If headers are needed, we use the direct URL approach
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Download error:', error);
            // Fallback: open in new tab
            window.open(stream.url, '_blank', 'noopener,noreferrer');
        }

        // Reset after delay
        setTimeout(() => setIsDownloading(false), 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
                'group flex items-center justify-between p-4 rounded-xl',
                'bg-white/[0.03] hover:bg-white/[0.06]',
                'border border-white/[0.05] hover:border-white/[0.1]',
                'transition-all duration-300'
            )}
        >
            {/* File Info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={cn(
                    'flex items-center justify-center w-12 h-12 rounded-lg flex-shrink-0',
                    'bg-gradient-to-br',
                    category.gradient,
                    'opacity-80'
                )}>
                    <HardDrive className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                            'px-2 py-0.5 text-xs font-bold rounded flex-shrink-0',
                            'bg-gradient-to-r',
                            category.gradient,
                            'text-white'
                        )}>
                            {category.shortLabel}
                        </span>
                        <span className="text-sm font-medium text-white truncate">
                            {mediaTitle}
                        </span>
                    </div>
                    <p className="text-sm text-text-muted mt-1 flex items-center gap-1.5">
                        <HardDrive className="w-3 h-3" />
                        <span className="font-medium text-text-secondary">{formatSize(stream.size)}</span>
                    </p>
                </div>
            </div>

            {/* Download Button */}
            <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleDownload}
                disabled={isDownloading}
                className={cn(
                    'flex items-center justify-center gap-2 px-6 py-3 rounded-xl',
                    'font-semibold text-sm text-white',
                    'bg-gradient-to-r from-primary via-red-500 to-primary',
                    'bg-[length:200%_100%] bg-left hover:bg-right',
                    'transition-all duration-500',
                    'shadow-lg shadow-primary/25 hover:shadow-primary/40',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'min-w-[130px]'
                )}
            >
                {isDownloading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Opening...</span>
                    </>
                ) : (
                    <>
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                    </>
                )}
            </motion.button>
        </motion.div>
    );
};

// Loading skeleton - premium style
const LoadingSkeleton: React.FC = () => (
    <div className="space-y-6">
        {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 animate-pulse" />
                    <div className="space-y-1.5">
                        <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                        <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.03] animate-pulse">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-white/10" />
                            <div className="space-y-1.5">
                                <div className="h-4 w-12 bg-white/10 rounded" />
                                <div className="h-3 w-16 bg-white/5 rounded" />
                            </div>
                        </div>
                        <div className="h-10 w-28 bg-white/10 rounded-xl" />
                    </div>
                </div>
            </div>
        ))}
    </div>
);

// Empty state - premium style
const EmptyState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-center"
    >
        <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center shadow-lg">
            <AlertCircle className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2 text-white">No Downloads Available</h3>
        <p className="text-text-muted text-sm mb-8 max-w-xs leading-relaxed">
            Downloads for this title aren't available right now. Please try again later.
        </p>
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onRetry}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 transition-all font-medium"
        >
            <RefreshCw className="w-4 h-4" />
            Try Again
        </motion.button>
    </motion.div>
);

// Error state - premium style
const ErrorState: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-center"
    >
        <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-red-900/50 to-red-800/30 flex items-center justify-center shadow-lg">
            <AlertCircle className="w-10 h-10 text-red-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2 text-white">Something went wrong</h3>
        <p className="text-text-muted text-sm mb-8 max-w-xs leading-relaxed">{error}</p>
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onRetry}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 transition-all font-medium"
        >
            <RefreshCw className="w-4 h-4" />
            Try Again
        </motion.button>
    </motion.div>
);

export const DownloadModal: React.FC<DownloadModalProps> = ({
    isOpen,
    onClose,
    tmdbId,
    mediaType,
    title,
    season,
    episode,
}) => {
    useLockBodyScroll(isOpen);
    const { hasFeatureAccess, isLoading: subscriptionLoading } = useSubscription();
    const downloadAccess = hasFeatureAccess('downloads');

    const [streams, setStreams] = useState<DownloadStream[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch downloads when modal opens
    const fetchDownloads = async () => {
        setIsLoading(true);
        setError(null);

        try {
            let result: DownloadStream[];

            if (mediaType === 'movie') {
                result = await downloadService.getMovieDownloads(tmdbId);
            } else {
                result = await downloadService.getTVDownloads(tmdbId, season || 1, episode || 1);
            }

            // Remove duplicates
            const uniqueStreams = downloadService.removeDuplicates(result);
            setStreams(uniqueStreams);
        } catch (err) {
            console.error('Error fetching downloads:', err);
            setError('Failed to load download sources. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchDownloads();
        }
    }, [isOpen, tmdbId, mediaType, season, episode]);

    // Group streams by quality
    const groupedStreams = groupStreamsByQuality(streams);

    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
            return () => window.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
                    {/* Backdrop with blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="absolute inset-0 bg-black/85 backdrop-blur-xl"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 30 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className={cn(
                            'relative w-full max-w-xl max-h-[85vh] overflow-hidden',
                            'bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d]',
                            'rounded-2xl shadow-2xl',
                            'border border-white/10'
                        )}
                    >
                        {/* Subtle gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />

                        {/* Header */}
                        <div className="relative px-6 py-5 border-b border-white/10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                                        {mediaType === 'movie' ? (
                                            <Film className="w-6 h-6 text-primary" />
                                        ) : (
                                            <Tv className="w-6 h-6 text-primary" />
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Download</h2>
                                        <p className="text-sm text-text-muted line-clamp-1 max-w-[280px]">
                                            {title}
                                            {mediaType === 'tv' && season && episode && (
                                                <span className="text-text-secondary ml-1">
                                                    S{season}:E{episode}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={onClose}
                                    className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                                    aria-label="Close"
                                >
                                    <X className="w-5 h-5" />
                                </motion.button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="relative px-6 py-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {!downloadAccess.hasAccess ? (
                                <SubscriptionGate feature="downloads" showInline />
                            ) : subscriptionLoading || isLoading ? (
                                <LoadingSkeleton />
                            ) : error ? (
                                <ErrorState error={error} onRetry={fetchDownloads} />
                            ) : streams.length === 0 ? (
                                <EmptyState onRetry={fetchDownloads} />
                            ) : (
                                <div className="space-y-6">
                                    {Object.entries(groupedStreams).map(([categoryKey, categoryStreams]) => {
                                        const category = QUALITY_CATEGORIES[categoryKey];
                                        return (
                                            <div key={categoryKey}>
                                                <QualityHeader category={category} count={categoryStreams.length} />
                                                <div className="space-y-2">
                                                    {categoryStreams.map((stream, index) => (
                                                        <StreamItem
                                                            key={`${stream.url}-${index}`}
                                                            stream={stream}
                                                            category={category}
                                                            index={index}
                                                            mediaTitle={title}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="relative px-6 py-4 border-t border-white/5 bg-black/20">
                            <p className="text-xs text-text-muted text-center">
                                Select your preferred quality • Downloads open in a new tab
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default DownloadModal;
