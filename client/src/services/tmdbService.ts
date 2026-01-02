/**
 * TMDB Service
 * 
 * This service uses direct TMDB API calls for faster content loading.
 * It bypasses the backend for TMDB data fetching, which significantly
 * improves load times, especially when the backend is on a cold start
 * (e.g., Render free tier that sleeps after 15 min of inactivity).
 * 
 * The backend is still used for:
 * - Authentication (login, signup, etc.)
 * - User-specific data (watchlist, watch history, etc.)
 * - Streaming URLs
 * 
 * Benefits of direct TMDB calls:
 * - Instant content loading (no backend latency)
 * - Works even when backend is cold starting
 * - Reduces backend load and API calls
 * - Better user experience with faster page loads
 */

import { tmdbDirectService } from './tmdbDirectService';

// Re-export the direct service as the main tmdbService
// This maintains backward compatibility with existing imports
export const tmdbService = tmdbDirectService;

export default tmdbService;
