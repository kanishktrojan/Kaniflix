const NodeCache = require('node-cache');

/**
 * In-Memory Cache Service
 * Provides caching layer for API responses
 */
class CacheService {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 600, // 10 minutes default TTL
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false, // For better performance
      deleteOnExpire: true
    });

    // Cache statistics
    this.cache.on('set', (key) => {
      console.log(`📦 Cache SET: ${key}`);
    });

    this.cache.on('expired', (key) => {
      console.log(`⏰ Cache EXPIRED: ${key}`);
    });
  }

  /**
   * Get item from cache
   */
  get(key) {
    return this.cache.get(key);
  }

  /**
   * Set item in cache
   */
  set(key, value, ttl = undefined) {
    return this.cache.set(key, value, ttl);
  }

  /**
   * Delete item from cache
   */
  delete(key) {
    return this.cache.del(key);
  }

  /**
   * Delete items matching pattern
   */
  deleteByPattern(pattern) {
    const keys = this.cache.keys();
    const regex = new RegExp(pattern);
    const matchedKeys = keys.filter(key => regex.test(key));
    return this.cache.del(matchedKeys);
  }

  /**
   * Check if key exists
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Get or set with callback
   */
  async getOrSet(key, fetchFn, ttl = undefined) {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await fetchFn();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Clear all cache
   */
  flush() {
    this.cache.flushAll();
    console.log('🗑️ Cache flushed');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * Get all keys
   */
  keys() {
    return this.cache.keys();
  }

  /**
   * Generate cache key for TMDB requests
   */
  static generateTMDBKey(endpoint, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `tmdb:${endpoint}:${sortedParams}`;
  }
}

// Singleton instance
const cacheService = new CacheService();

// Cache TTL constants
const CACHE_TTL = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 1800,    // 30 minutes
  LONG: 3600,      // 1 hour
  VERY_LONG: 86400 // 24 hours
};

module.exports = { cacheService, CACHE_TTL, CacheService };
