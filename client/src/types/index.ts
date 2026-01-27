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

// Admin Types
export interface AdminUser extends User {
  stats?: {
    watchCount: number;
    watchlistCount: number;
  };
}

export interface AdminDashboardStats {
  users: {
    total: number;
    active: number;
    premium: number;
    verified: number;
    newThisMonth: number;
  };
  content: {
    totalWatched: number;
    completedWatches: number;
    totalWatchlistItems: number;
    recentActivity: number;
  };
  charts: {
    userGrowth: Array<{
      _id: { year: number; month: number };
      count: number;
    }>;
    topContent: Array<{
      tmdbId: number;
      mediaType: MediaType;
      title: string;
      totalWatches: number;
      uniqueViewers: number;
    }>;
    mediaDistribution: Array<{
      _id: MediaType;
      count: number;
    }>;
  };
}

export interface AdminUserDetails {
  user: AdminUser;
  watchHistory: WatchHistory[];
  watchlist: WatchlistItem[];
  stats: {
    totalWatched: number;
    completedWatches: number;
    watchlistSize: number;
    totalWatchTime: number;
  };
}

export interface AdminAnalytics {
  period: string;
  dailyActiveUsers: Array<{
    date: string;
    activeUsers: number;
  }>;
  watchByHour: Array<{
    _id: number;
    count: number;
  }>;
  genrePopularity: Array<{
    _id: MediaType;
    count: number;
    avgProgress: number;
  }>;
  registrations: Array<{
    date: string;
    registrations: number;
  }>;
}

export interface AdminActivity {
  recentWatches: Array<WatchHistory & {
    user: {
      _id: string;
      username: string;
      email: string;
      avatar: string | null;
    };
  }>;
  recentRegistrations: Array<{
    _id: string;
    username: string;
    email: string;
    avatar: string | null;
    createdAt: string;
  }>;
}

export interface PaginatedUsersResponse {
  users: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'user' | 'premium' | 'admin' | '';
  status?: 'active' | 'inactive' | '';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface BulkUpdateRequest {
  userIds: string[];
  updates: {
    role?: 'user' | 'premium' | 'admin';
    isActive?: boolean;
    isEmailVerified?: boolean;
  };
}

// ==================== SPORTS TYPES ====================

export type SportCategory = 
  | 'cricket'
  | 'football'
  | 'basketball'
  | 'tennis'
  | 'hockey'
  | 'baseball'
  | 'motorsport'
  | 'mma'
  | 'boxing'
  | 'wrestling'
  | 'golf'
  | 'esports'
  | 'olympics'
  | 'other';

export type SportsEventStatus = 'upcoming' | 'live' | 'ended' | 'cancelled';

export interface SportsTeam {
  name: string;
  logo: string;
  score: string;
}

export interface DRMConfig {
  type: 'widevine' | 'clearkey' | 'fairplay';
  licenseUrl: string;
  clearkey: {
    keyId: string;
    key: string;
  };
}

export interface QualityOption {
  label: string;
  url: string;
}

export interface SportsEvent {
  _id: string;
  title: string;
  description: string;
  thumbnail: string;
  banner: string | null;
  category: SportCategory;
  team1: SportsTeam;
  team2: SportsTeam;
  isLive: boolean;
  status: SportsEventStatus;
  scheduledAt: string;
  endedAt: string | null;
  streamUrl?: string;
  useProxy: boolean;
  drmEnabled: boolean;
  drmConfig?: DRMConfig;
  qualityOptions: QualityOption[];
  venue: string;
  tournament: string;
  isActive: boolean;
  isFeatured: boolean;
  viewCount: number;
  createdBy?: {
    _id: string;
    username: string;
    email: string;
  };
  updatedBy?: {
    _id: string;
    username: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SportsStreamInfo {
  _id: string;
  title: string;
  streamUrl: string;
  useProxy: boolean;
  drmEnabled: boolean;
  drmConfig?: DRMConfig;
  qualityOptions: QualityOption[];
}

export interface SportsCategoryInfo {
  id: SportCategory;
  name: string;
  icon: string;
  count: number;
}

export interface SportsEventFilters {
  page?: number;
  limit?: number;
  category?: SportCategory;
  status?: SportsEventStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  featured?: boolean;
}

export interface PaginatedSportsResponse {
  events: SportsEvent[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface SportsStats {
  totalEvents: number;
  liveEvents: number;
  upcomingEvents: number;
  endedEvents: number;
  categoryStats: Array<{
    _id: SportCategory;
    count: number;
  }>;
  totalViews: number;
}

export interface CreateSportsEventRequest {
  title: string;
  description: string;
  thumbnail: string;
  banner?: string;
  category: SportCategory;
  team1?: Partial<SportsTeam>;
  team2?: Partial<SportsTeam>;
  isLive?: boolean;
  status?: SportsEventStatus;
  scheduledAt: string;
  streamUrl: string;
  useProxy?: boolean;
  drmEnabled?: boolean;
  drmConfig?: Partial<DRMConfig>;
  qualityOptions?: QualityOption[];
  venue?: string;
  tournament?: string;
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface UpdateSportsEventRequest extends Partial<CreateSportsEventRequest> {
  endedAt?: string;
}

export interface BulkUpdateSportsRequest {
  eventIds: string[];
  updates: {
    isActive?: boolean;
    isFeatured?: boolean;
    status?: SportsEventStatus;
  };
}

// Rate Limit Settings Types
export interface RateLimitCategorySettings {
  enabled: boolean;
  windowMs: number;
  maxRequests: number;
  skipPremium: boolean;
  skipAdmin: boolean;
}

export interface RateLimitSettings {
  general: RateLimitCategorySettings;
  auth: RateLimitCategorySettings;
  search: RateLimitCategorySettings;
  stream: RateLimitCategorySettings;
  sports: RateLimitCategorySettings;
}

export type RateLimitCategory = keyof RateLimitSettings;

// ==================== SUBSCRIPTION & PROFILE TYPES ====================

// Subscription Plan
export interface SubscriptionPlanFeature {
  name: string;
  included: boolean;
  value?: string | null;
}

export interface SubscriptionPlanLimits {
  maxStreams: number;
  maxProfiles?: number;
  maxDownloads: number;
  videoQuality: string;
  adsEnabled: boolean;
}

export interface SubscriptionPlan {
  _id: string;
  name: string;
  displayName: string;
  description?: string;
  price: {
    monthly: number;
    yearly: number;
    currency?: string;
  };
  features?: SubscriptionPlanFeature[];
  limits?: SubscriptionPlanLimits;
  badge?: string | {
    text: string;
    color: string;
  };
  sortOrder?: number;
  isActive: boolean;
  isPopular?: boolean;
  subscriberCount?: number;
}

// User Subscription
export interface PaymentMethod {
  type: 'card' | 'upi' | 'paypal' | 'none';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

export interface AppliedCoupon {
  code: string;
  discountAmount: number;
  discountType: string;
  appliedAt: string;
  expiresAt: string;
}

export interface Invoice {
  invoiceId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  paidAt: string;
  description: string;
}

export interface UserSubscription {
  _id: string;
  user: string;
  plan: SubscriptionPlan;
  status: 'active' | 'cancelled' | 'expired' | 'paused' | 'trial';
  billingCycle: 'monthly' | 'yearly';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string | null;
  paymentMethod: PaymentMethod;
  appliedCoupon?: AppliedCoupon;
  invoices: Invoice[];
  createdAt: string;
  updatedAt: string;
}

// Coupon Code
export interface CouponCode {
  _id: string;
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed' | 'trial_extension' | 'free_month';
  discountValue: number;
  currency?: string;
  applicablePlans?: (SubscriptionPlan | string)[];
  minPurchaseAmount?: number;
  validFrom: string;
  validUntil: string;
  maxUses?: number | null;
  maxUsesPerUser?: number;
  currentUses: number;
  firstTimeOnly?: boolean;
  isActive: boolean;
  campaign?: string;
  createdBy?: {
    _id: string;
    username: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CouponUsage {
  user: {
    _id: string;
    username: string;
    email: string;
    avatar?: string;
  };
  usedAt: string;
  orderId?: string;
}

// Redeem Code (Free Subscriptions - SEPARATE from Coupons)
export interface RedeemCode {
  _id: string;
  code: string;
  description?: string;
  plan: SubscriptionPlan | string;
  duration: {
    value: number;
    unit: 'day' | 'week' | 'month' | 'year';
  };
  validFrom: string;
  validUntil: string;
  maxUses?: number | null;
  maxUsesPerUser?: number;
  currentUses: number;
  isActive: boolean;
  usedBy?: {
    user: string;
    usedAt: string;
    subscriptionId?: string;
  }[];
  createdBy?: {
    _id: string;
    username: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface RedeemCodeUsage {
  user: {
    _id: string;
    username: string;
    email: string;
    avatar?: string;
  };
  usedAt: string;
  subscriptionId?: string;
}

// Device Session
export interface DeviceSession {
  _id: string;
  deviceId: string;
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'tv' | 'unknown';
  browser: {
    name: string;
    version: string;
  };
  os: {
    name: string;
    version: string;
  };
  location: {
    ip: string;
    city?: string;
    country?: string;
    countryCode?: string;
  };
  isCurrentDevice: boolean;
  lastActiveAt: string;
  loginAt: string;
  isStreaming: boolean;
  currentlyWatching?: {
    mediaType: string;
    tmdbId: number;
    title: string;
    startedAt: string;
  };
  createdAt: string;
}

// Extended User Preferences
export interface ExtendedUserPreferences {
  language: string;
  maturityRating: string;
  autoplayNext: boolean;
  autoplayPreviews: boolean;
  defaultVideoQuality: 'auto' | '360p' | '480p' | '720p' | '1080p' | '4k';
  dataSaverMode: boolean;
  defaultAudioLanguage: string;
  defaultSubtitleLanguage: string;
  subtitlesEnabled: boolean;
}

export interface NotificationSettings {
  email: {
    newReleases: boolean;
    recommendations: boolean;
    accountUpdates: boolean;
    marketing: boolean;
    watchlistReminders: boolean;
  };
  push: {
    enabled: boolean;
    newEpisodes: boolean;
    continueWatching: boolean;
  };
}

export interface UserProfile {
  bio: string;
  favoriteGenres: number[];
  profileLock: {
    enabled: boolean;
  };
}

// Profile Stats
export interface ProfileStats {
  totalWatched: number;
  totalWatchTime: number;
  totalWatchTimeFormatted: string;
  completedMovies: number;
  completedEpisodes: number;
  inProgress: number;
  watchlistSize: number;
  movieWatchlistCount: number;
  tvWatchlistCount: number;
  memberSince: string;
  lastActive: string;
}

// Extended User type for profile page
export interface ExtendedUser extends User {
  preferences: ExtendedUserPreferences;
  notifications: NotificationSettings;
  profile: UserProfile;
}

// Profile API Response
export interface ProfileResponse {
  user: ExtendedUser;
  subscription: UserSubscription | null;
  deviceCount: number;
}

// Subscription Stats (Admin)
export interface SubscriptionStats {
  totalSubscribers: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  activeTrials: number;
  activeCoupons: number;
  cancelledThisMonth: number;
  overview?: {
    totalUsers: number;
    activeSubscriptions: number;
    conversionRate: string;
  };
  planDistribution: Array<{
    _id: string;
    planId?: string;
    name: string;
    count: number;
  }>;
  revenueByPlan: Array<{
    _id: string;
    monthlyRevenue: number;
    subscribers: number;
  }>;
  totalMonthlyRevenue?: number;
}

// Coupon Validation Response
export interface CouponValidationResult {
  valid: boolean;
  reason?: string;
}

export interface RedeemCouponResponse {
  message: string;
  discount: {
    code: string;
    type: string;
    value: number;
    amount: number;
  };
}
