import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names with Tailwind CSS support
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format runtime to hours and minutes
 */
export function formatRuntime(minutes: number | null | undefined): string {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Format date to readable string
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Get year from date string
 */
export function getYear(dateString: string | null | undefined): string {
  if (!dateString) return '';
  return new Date(dateString).getFullYear().toString();
}

/**
 * Format vote average to percentage
 */
export function formatRating(rating: number | undefined): string {
  if (!rating) return '0%';
  return `${Math.round(rating * 10)}%`;
}

/**
 * Format number with commas
 */
export function formatNumber(num: number | undefined): string {
  if (!num) return '0';
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format currency
 */
export function formatCurrency(amount: number | undefined): string {
  if (!amount) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format duration from seconds to human readable
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get TMDB image URL
 */
export function getImageUrl(
  path: string | null | undefined,
  size: 'w185' | 'w300' | 'w500' | 'w780' | 'w1280' | 'original' = 'w500'
): string {
  if (!path) return getPlaceholderImage(size.startsWith('w1280') || size === 'original' ? 'backdrop' : 'poster');
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Generate placeholder image URL
 */
export function getPlaceholderImage(type: 'poster' | 'backdrop' = 'poster'): string {
  const dimensions = type === 'poster' ? '300x450' : '1280x720';
  return `https://via.placeholder.com/${dimensions}/1a1a1a/666?text=No+Image`;
}

/**
 * Slugify string for URLs
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Parse query parameters from URL
 */
export function parseQueryParams(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/**
 * Build query string from object
 */
export function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
}

/**
 * Get media release date field
 */
export function getMediaDate(
  item: { releaseDate?: string; firstAirDate?: string }
): string | undefined {
  return item.releaseDate || item.firstAirDate;
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(current: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(Math.round((current / total) * 100), 100);
}

/**
 * Format seconds to time string (HH:MM:SS or MM:SS)
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Check if device is mobile
 */
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Check if device supports touch
 */
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Sleep/delay utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Local storage helpers with error handling
 */
export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },
};

/**
 * Wake up the backend server (for Render free tier cold starts)
 * Calls a lightweight health endpoint to spin up the server
 * This runs silently in the background when user visits the site
 * so that backend services (auth, watchlist, streaming) are ready
 * when needed.
 */
export const wakeUpBackend = async (): Promise<void> => {
  const API_URL = import.meta.env.VITE_API_URL || '/api';
  
  try {
    console.log('[Backend] Waking up server...');
    const startTime = Date.now();
    
    // Call health endpoint - don't wait too long as this is non-blocking
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const elapsed = Date.now() - startTime;
    
    if (response.ok) {
      console.log(`[Backend] Server is awake! (${elapsed}ms)`);
    } else {
      console.log(`[Backend] Health check returned ${response.status}`);
    }
  } catch (error) {
    // Silent fail - the server might be cold starting
    // This is expected behavior for Render free tier
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('[Backend] Server is taking longer to wake up (cold start in progress)');
    } else {
      console.log('[Backend] Server is starting up, please wait...');
    }
  }
};

/**
 * Periodically ping the backend to keep it warm during active sessions
 * This helps prevent cold starts during active user sessions
 */
let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

export const startBackendKeepAlive = (intervalMs = 10 * 60 * 1000): void => {
  // Default: ping every 10 minutes to prevent 15-minute sleep
  if (keepAliveInterval) {
    console.log('[Backend] Keep-alive already running');
    return;
  }
  
  console.log(`[Backend] Starting keep-alive (every ${intervalMs / 60000} minutes)`);
  keepAliveInterval = setInterval(async () => {
    const API_URL = import.meta.env.VITE_API_URL || '/api';
    try {
      await fetch(`${API_URL}/health`, { method: 'GET' });
      console.log('[Backend] Keep-alive ping sent');
    } catch {
      // Silent fail
    }
  }, intervalMs);
};

export const stopBackendKeepAlive = (): void => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
    console.log('[Backend] Keep-alive stopped');
  }
};

export { initDevToolsBlocker } from './devToolsBlocker';
