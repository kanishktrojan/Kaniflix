import type { DownloadStream, DownloadResponse } from '@/types';

/**
 * Download Service
 * Fetches download streams from external APIs (UHDMovies, StreamFlix)
 * Uses Cloudflare Worker proxy to bypass CORS/blocking issues
 */

const DOWNLOAD_API_BASE = 'https://cinemaos.live/api';
const PROXY_BASE = 'https://proxy.royalarts-interior.workers.dev/?url=';

// Timeout for API requests (30 seconds since APIs can be slow)
const API_TIMEOUT = 30000;

/**
 * Get proxied URL with encoded original URL
 */
function getProxiedUrl(originalUrl: string): string {
    return `${PROXY_BASE}${encodeURIComponent(originalUrl)}`;
}

/**
 * Fetch with timeout wrapper - uses proxy for all requests
 */
async function fetchWithTimeout(url: string, timeout: number = API_TIMEOUT): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Use proxy for the request
    const proxiedUrl = getProxiedUrl(url);

    try {
        const response = await fetch(proxiedUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

/**
 * Safely parse JSON response
 */
async function safeParseJSON<T>(response: Response): Promise<T | null> {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

export const downloadService = {
    /**
     * Get movie download streams from multiple sources
     */
    async getMovieDownloads(tmdbId: number): Promise<DownloadStream[]> {
        const streams: DownloadStream[] = [];

        // Fetch from both sources in parallel
        const [uhdMoviesResult, streamFlixResult] = await Promise.allSettled([
            this.fetchUHDMovies(tmdbId),
            this.fetchStreamFlixMovie(tmdbId),
        ]);

        // Combine results from successful fetches
        if (uhdMoviesResult.status === 'fulfilled' && uhdMoviesResult.value) {
            streams.push(...uhdMoviesResult.value);
        }

        if (streamFlixResult.status === 'fulfilled' && streamFlixResult.value) {
            streams.push(...streamFlixResult.value);
        }

        return streams;
    },

    /**
     * Get TV show episode download streams
     */
    async getTVDownloads(
        tmdbId: number,
        season: number,
        episode: number
    ): Promise<DownloadStream[]> {
        try {
            const url = `${DOWNLOAD_API_BASE}/streamflix?type=tv&tmdbId=${tmdbId}&season=${season}&episode=${episode}`;
            const response = await fetchWithTimeout(url);

            if (!response.ok) {
                console.error(`StreamFlix TV API error: ${response.status}`);
                return [];
            }

            const data = await safeParseJSON<DownloadResponse>(response);
            return data?.streams || [];
        } catch (error) {
            console.error('Error fetching TV downloads:', error);
            return [];
        }
    },

    /**
     * Fetch from UHDMovies API
     */
    async fetchUHDMovies(tmdbId: number): Promise<DownloadStream[]> {
        try {
            const url = `${DOWNLOAD_API_BASE}/uhdmovies?type=movie&tmdbId=${tmdbId}`;
            const response = await fetchWithTimeout(url);

            if (!response.ok) {
                console.error(`UHDMovies API error: ${response.status}`);
                return [];
            }

            const data = await safeParseJSON<DownloadResponse>(response);
            return data?.streams || [];
        } catch (error) {
            console.error('Error fetching UHDMovies:', error);
            return [];
        }
    },

    /**
     * Fetch from StreamFlix API for movies
     */
    async fetchStreamFlixMovie(tmdbId: number): Promise<DownloadStream[]> {
        try {
            const url = `${DOWNLOAD_API_BASE}/streamflix?type=movie&tmdbId=${tmdbId}`;
            const response = await fetchWithTimeout(url);

            if (!response.ok) {
                console.error(`StreamFlix API error: ${response.status}`);
                return [];
            }

            const data = await safeParseJSON<DownloadResponse>(response);
            return data?.streams || [];
        } catch (error) {
            console.error('Error fetching StreamFlix:', error);
            return [];
        }
    },

    /**
     * Get quality color based on resolution
     */
    getQualityColor(quality: string): { bg: string; text: string; glow: string } {
        const qualityLower = quality.toLowerCase();

        if (qualityLower.includes('2160') || qualityLower.includes('4k') || qualityLower.includes('uhd')) {
            return {
                bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
                text: 'text-white',
                glow: 'shadow-amber-500/50',
            };
        }

        if (qualityLower.includes('1080')) {
            return {
                bg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
                text: 'text-white',
                glow: 'shadow-blue-500/50',
            };
        }

        if (qualityLower.includes('720')) {
            return {
                bg: 'bg-gradient-to-r from-gray-400 to-gray-500',
                text: 'text-white',
                glow: 'shadow-gray-400/50',
            };
        }

        // Default
        return {
            bg: 'bg-gradient-to-r from-gray-600 to-gray-700',
            text: 'text-white',
            glow: 'shadow-gray-500/30',
        };
    },

    /**
     * Get source icon/color based on provider name
     */
    getSourceStyle(name: string): { color: string; bgColor: string } {
        const nameLower = name.toLowerCase();

        if (nameLower.includes('uhd') || nameLower.includes('4k')) {
            return {
                color: 'text-amber-400',
                bgColor: 'bg-amber-500/10',
            };
        }

        if (nameLower.includes('streamflix')) {
            return {
                color: 'text-purple-400',
                bgColor: 'bg-purple-500/10',
            };
        }

        return {
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/10',
        };
    },

    /**
     * Group streams by source
     */
    groupStreamsBySource(streams: DownloadStream[]): Record<string, DownloadStream[]> {
        return streams.reduce((acc, stream) => {
            const source = stream.name || 'Other';
            if (!acc[source]) {
                acc[source] = [];
            }
            acc[source].push(stream);
            return acc;
        }, {} as Record<string, DownloadStream[]>);
    },

    /**
     * Remove duplicate streams based on URL
     */
    removeDuplicates(streams: DownloadStream[]): DownloadStream[] {
        const seen = new Set<string>();
        return streams.filter(stream => {
            if (seen.has(stream.url)) {
                return false;
            }
            seen.add(stream.url);
            return true;
        });
    },
};

export default downloadService;
