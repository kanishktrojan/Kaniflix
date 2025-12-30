// Media Types
export type MediaType = 'movie' | 'tv';

// Base Media Item
export interface MediaItem {
  id: number;
  title: string;
  originalTitle?: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  voteCount?: number;
  popularity?: number;
  genreIds?: number[];
  genres?: Genre[];
  mediaType: MediaType;
}

// Movie specific
export interface Movie extends MediaItem {
  mediaType: 'movie';
  releaseDate: string;
  runtime?: number;
  adult?: boolean;
  tagline?: string;
  budget?: number;
  revenue?: number;
  status?: string;
  imdbId?: string;
  productionCompanies?: ProductionCompany[];
  cast?: CastMember[];
  crew?: CrewMember[];
  videos?: Video[];
  similar?: Movie[];
  recommendations?: Movie[];
}

// TV Show specific
export interface TVShow extends MediaItem {
  mediaType: 'tv';
  firstAirDate: string;
  lastAirDate?: string;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  status?: string;
  type?: string;
  tagline?: string;
  imdbId?: string;
  networks?: Network[];
  seasons?: Season[];
  cast?: CastMember[];
  videos?: Video[];
  similar?: TVShow[];
  recommendations?: TVShow[];
}

// Season
export interface Season {
  id: number;
  name: string;
  seasonNumber: number;
  episodeCount: number;
  airDate: string | null;
  posterPath: string | null;
  overview: string;
  episodes?: Episode[];
}

// Episode
export interface Episode {
  id: number;
  name: string;
  episodeNumber: number;
  seasonNumber: number;
  overview: string;
  airDate: string | null;
  runtime: number | null;
  stillPath: string | null;
  voteAverage: number;
  guestStars?: CastMember[];
}

// Genre
export interface Genre {
  id: number;
  name: string;
  mediaTypes?: MediaType[];
}

// Cast & Crew
export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

// Alias for backward compatibility
export type Cast = CastMember;

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  profilePath: string | null;
}

// Video (Trailer)
export interface Video {
  id: string;
  key: string;
  name: string;
  type: string;
  site: string;
}

// Network
export interface Network {
  id: number;
  name: string;
  logoPath: string | null;
}

// Production Company
export interface ProductionCompany {
  id: number;
  name: string;
  logoPath: string | null;
  originCountry: string;
}

// Watch History
export interface WatchHistory {
  _id: string;
  user: string;
  mediaType: MediaType;
  tmdbId: number;
  imdbId?: string;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  progress: number;
  currentTime: number;
  duration: number;
  isCompleted: boolean;
  completedAt?: string;
  watchCount: number;
  lastWatchedAt: string;
  createdAt: string;
  updatedAt: string;
}

// Watchlist Item
export interface WatchlistItem {
  _id: string;
  user: string;
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string | null;
  releaseDate: string | null;
  voteAverage: number;
  addedAt: string;
}

// API Response Types
export interface PaginatedResponse<T> {
  results: T[];
  page: number;
  total_pages: number;
  total_results: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

// Stream Config
export interface StreamConfig {
  embedUrl: string;
  mediaType: MediaType;
  tmdbId: number;
  season?: number;
  episode?: number;
  playerSettings: {
    allowFullscreen: boolean;
    allowAutoplay: boolean;
    sandbox: string;
  };
}

// User
export interface User {
  _id: string;
  email: string;
  username: string;
  avatar: string | null;
  role: 'user' | 'premium' | 'admin';
  isActive: boolean;
  isEmailVerified: boolean;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  language: string;
  maturityRating: string;
  autoplayNext: boolean;
  autoplayPreviews: boolean;
}

// Auth
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  username: string;
}

// Filters
export interface BrowseFilters {
  genre?: number;
  year?: number;
  sort?: string;
  minRating?: number;
  page?: number;
}

// Search
export interface SearchResult extends MediaItem {
  mediaType: MediaType;
}

// Player Events
export interface PlayerEvent {
  type: 'MEDIA_DATA' | 'PLAYER_EVENT' | 'PROGRESS_UPDATE' | 'ERROR';
  data: unknown;
}

// User Stats
export interface UserStats {
  totalWatched: number;
  completed: number;
  inProgress: number;
  watchlistSize: number;
  preferredMediaType: MediaType;
}
