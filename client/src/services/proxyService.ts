/**
 * Proxy Service for Client
 * Helper functions to integrate the stream proxy with JW Player
 */

// Proxy server configuration
const PROXY_CONFIG = {
  // Change this to your Render proxy server URL in production
  baseUrl: import.meta.env.VITE_PROXY_URL || 'https://your-proxy.onrender.com',
  enableTokenAuth: import.meta.env.VITE_PROXY_TOKEN_AUTH === 'true',
};



/**
 * Generate a proxy URL for a given stream URL
 * @param url - Original stream URL
 * @param options - Optional configuration
 * @returns Proxied URL
 */
export const getProxyUrl = (
  url: string,
  options?: {
    token?: string;
    forceProxy?: boolean;
  }
): string => {
  if (!url) return '';

  // Check if URL needs proxying (external URLs)
  const needsProxy = options?.forceProxy || isExternalUrl(url);
  
  if (!needsProxy) {
    return url;
  }

  // Build proxy URL manually to avoid double-encoding issues
  // The URL might already contain encoded characters like %2F
  // Using searchParams.set() would encode % to %25, causing issues
  let proxyUrl = `${PROXY_CONFIG.baseUrl}/stream?url=${encodeURIComponent(url)}`;
  
  if (options?.token) {
    proxyUrl += `&token=${encodeURIComponent(options.token)}`;
  }

  return proxyUrl;
};

/**
 * Check if a URL is external (not same-origin)
 * @param url - URL to check
 * @returns True if external
 */
export const isExternalUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    const current = new URL(window.location.href);
    return parsed.origin !== current.origin;
  } catch {
    return false;
  }
};

/**
 * Get a signed proxy URL with token (for token auth mode)
 * @param url - Original stream URL
 * @param expiresIn - Token expiration in seconds (default: 3600)
 * @returns Promise with signed URL
 */
export const getSignedProxyUrl = async (
  url: string,
  expiresIn: number = 3600
): Promise<string> => {
  if (!PROXY_CONFIG.enableTokenAuth) {
    return getProxyUrl(url);
  }

  try {
    const tokenUrl = new URL('/token', PROXY_CONFIG.baseUrl);
    tokenUrl.searchParams.set('url', url);
    tokenUrl.searchParams.set('expires', String(expiresIn));

    const response = await fetch(tokenUrl.toString());
    
    if (!response.ok) {
      throw new Error('Failed to get token');
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Failed to get signed proxy URL:', error);
    // Fallback to unsigned URL
    return getProxyUrl(url);
  }
};

/**
 * Transform HLS/DASH playlist URLs to use proxy
 * Useful for pre-processing manifests on the client side
 * @param playlistContent - Playlist content
 * @param baseUrl - Base URL of the playlist
 * @returns Transformed playlist content
 */
export const transformPlaylistUrls = (
  playlistContent: string,
  baseUrl: string
): string => {
  const lines = playlistContent.split('\n');
  
  return lines.map(line => {
    const trimmed = line.trim();
    
    // Skip empty lines and comments (except URI= in tags)
    if (!trimmed || (trimmed.startsWith('#') && !trimmed.includes('URI="'))) {
      return line;
    }

    // Handle URI= in tags
    if (trimmed.includes('URI="')) {
      return line.replace(/URI="([^"]+)"/g, (_, uri) => {
        const absoluteUrl = new URL(uri, baseUrl).href;
        return `URI="${getProxyUrl(absoluteUrl)}"`;
      });
    }

    // Handle segment URLs
    if (!trimmed.startsWith('#')) {
      try {
        const absoluteUrl = new URL(trimmed, baseUrl).href;
        return getProxyUrl(absoluteUrl);
      } catch {
        return line;
      }
    }

    return line;
  }).join('\n');
};

/**
 * JW Player configuration helper
 * Returns proper configuration for proxied streams
 */
export interface ProxyPlayerConfig {
  file: string;
  type?: 'hls' | 'dash' | 'mp4';
  withCredentials?: boolean;
}

export const getJWPlayerConfig = (
  url: string,
  options?: {
    forceProxy?: boolean;
    token?: string;
  }
): ProxyPlayerConfig => {
  const proxiedUrl = getProxyUrl(url, options);
  
  // Detect stream type from URL
  let type: 'hls' | 'dash' | 'mp4' | undefined;
  
  if (url.includes('.m3u8') || url.includes('.m3u')) {
    type = 'hls';
  } else if (url.includes('.mpd')) {
    type = 'dash';
  } else if (url.includes('.mp4')) {
    type = 'mp4';
  }

  return {
    file: proxiedUrl,
    type,
    // withCredentials should be false when using proxy
    withCredentials: false,
  };
};

/**
 * Check proxy server health
 * @returns Promise with health status
 */
export const checkProxyHealth = async (): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> => {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${PROXY_CONFIG.baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    const latency = Date.now() - startTime;
    
    if (!response.ok) {
      return { healthy: false, latency, error: `HTTP ${response.status}` };
    }

    return { healthy: true, latency };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export default {
  getProxyUrl,
  getSignedProxyUrl,
  getJWPlayerConfig,
  checkProxyHealth,
  isExternalUrl,
  transformPlaylistUrls,
};
