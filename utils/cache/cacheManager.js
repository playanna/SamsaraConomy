// utils/cache/cacheManager.js
const NodeCache = require('node-cache');

/**
 * Unified Cache Manager for Discord Bot
 * Consolidates all caching functionality under a single manager
 * with proper TTL management and memory pressure handling
 */
class CacheManager {
    constructor(options = {}) {
        this.cache = new NodeCache({
            stdTTL: options.defaultTTL || 300, // 5 minutes default
            checkperiod: options.checkPeriod || 60, // Check for expired keys every minute
            useClones: false, // Reduce memory overhead by not cloning objects
            maxKeys: options.maxKeys || 10000, // Prevent unbounded growth
            deleteOnExpire: true,
            ...options.nodeCache
        });

        // Different cache categories with their own TTL settings
        this.categories = {
            USER_DATA: { ttl: 10, prefix: 'user:' }, // 10 seconds for user data
            USERNAMES: { ttl: 900, prefix: 'username:' }, // 15 minutes for usernames
            LEADERBOARD: { ttl: 300, prefix: 'leaderboard:' }, // 5 minutes for leaderboards
            STATIC_DATA: { ttl: 3600, prefix: 'static:' }, // 1 hour for static data
            IMAGES: { ttl: 1800, prefix: 'image:' }, // 30 minutes for images
            LOOT_TABLES: { ttl: 1800, prefix: 'loot:' } // 30 minutes for loot tables
        };

        // Setup event listeners for monitoring
        this.setupEventListeners();
        
        // Track cache statistics
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };

        // Memory pressure threshold (in MB)
        this.memoryPressureThreshold = 512;
        this.setupMemoryMonitoring();
    }

    /**
     * Set up event listeners for cache monitoring
     */
    setupEventListeners() {
        this.cache.on('set', (key, value) => {
            this.stats.sets++;
        });

        this.cache.on('del', (key, value) => {
            this.stats.deletes++;
        });

        this.cache.on('expired', (key, value) => {
            console.log(`[CACHE] Key expired: ${key}`);
        });
    }

    /**
     * Set up memory monitoring and pressure handling
     */
    setupMemoryMonitoring() {
        // Check memory usage every 2 minutes
        setInterval(() => {
            this.checkMemoryPressure();
        }, 120000);
    }

    /**
     * Check for memory pressure and handle accordingly
     */
    checkMemoryPressure() {
        const usage = process.memoryUsage();
        const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
        
        if (heapUsedMB > this.memoryPressureThreshold) {
            console.warn(`[CACHE] Memory pressure detected: ${heapUsedMB}MB. Cleaning cache...`);
            this.handleMemoryPressure();
        }
    }

    /**
     * Handle memory pressure by selectively clearing caches
     */
    handleMemoryPressure() {
        const keys = this.cache.keys();
        let clearedCount = 0;

        // Priority cleanup: clear oldest entries first
        const keyStats = keys.map(key => ({
            key,
            ttl: this.cache.getTtl(key),
            created: this.cache.getTtl(key) - (this.getCategoryTTL(key) * 1000)
        })).sort((a, b) => a.created - b.created);

        // Clear 25% of cache entries, starting with oldest
        const clearCount = Math.floor(keys.length * 0.25);
        for (let i = 0; i < clearCount && i < keyStats.length; i++) {
            this.cache.del(keyStats[i].key);
            clearedCount++;
        }

        console.log(`[CACHE] Cleared ${clearedCount} entries due to memory pressure`);
        this.logStats();
    }

    /**
     * Get the appropriate TTL for a key based on its category
     */
    getCategoryTTL(key) {
        for (const [category, config] of Object.entries(this.categories)) {
            if (key.startsWith(config.prefix)) {
                return config.ttl;
            }
        }
        return this.cache.options.stdTTL;
    }

    /**
     * Build a cache key with appropriate prefix
     */
    buildKey(category, identifier) {
        if (!this.categories[category]) {
            throw new Error(`Unknown cache category: ${category}`);
        }
        return `${this.categories[category].prefix}${identifier}`;
    }

    /**
     * Generic get method with category support
     */
    get(category, key) {
        const cacheKey = typeof category === 'string' && this.categories[category] 
            ? this.buildKey(category, key) 
            : category; // Allow direct key access for backward compatibility

        const value = this.cache.get(cacheKey);
        
        if (value !== undefined) {
            this.stats.hits++;
        } else {
            this.stats.misses++;
        }
        
        return value;
    }

    /**
     * Generic set method with category support
     */
    set(category, key, value, ttl) {
        let cacheKey, cacheTTL;
        
        if (typeof category === 'string' && this.categories[category]) {
            cacheKey = this.buildKey(category, key);
            cacheTTL = ttl || this.categories[category].ttl;
        } else {
            // Backward compatibility for direct key access
            cacheKey = category;
            value = key;
            cacheTTL = ttl || value;
        }

        return this.cache.set(cacheKey, value, cacheTTL);
    }

    /**
     * Generic delete method with category support
     */
    del(category, key) {
        const cacheKey = typeof category === 'string' && this.categories[category] 
            ? this.buildKey(category, key) 
            : category;

        return this.cache.del(cacheKey);
    }

    /**
     * Check if a key exists
     */
    has(category, key) {
        const cacheKey = typeof category === 'string' && this.categories[category] 
            ? this.buildKey(category, key) 
            : category;

        return this.cache.has(cacheKey);
    }

    /**
     * Flush all cache entries
     */
    flushAll() {
        const keyCount = this.cache.keys().length;
        this.cache.flushAll();
        console.log(`[CACHE] Flushed ${keyCount} cache entries`);
    }

    /**
     * Flush entries by category
     */
    flushCategory(category) {
        if (!this.categories[category]) {
            throw new Error(`Unknown cache category: ${category}`);
        }

        const prefix = this.categories[category].prefix;
        const keys = this.cache.keys().filter(key => key.startsWith(prefix));
        
        keys.forEach(key => this.cache.del(key));
        console.log(`[CACHE] Flushed ${keys.length} entries from category: ${category}`);
    }

    /**
     * Warm critical data cache - to be implemented based on usage patterns
     */
    async warmCriticalData() {
        console.log('[CACHE] Warming critical data cache...');
        // This will be implemented as we migrate other cache systems
        // For now, it's a placeholder for future enhancements
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const cacheStats = this.cache.getStats();
        return {
            ...this.stats,
            keys: cacheStats.keys,
            hits: cacheStats.hits,
            misses: cacheStats.misses,
            hitRate: cacheStats.hits > 0 ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100).toFixed(2) + '%' : '0%',
            vsize: cacheStats.vsize,
            ksize: cacheStats.ksize
        };
    }

    /**
     * Log current cache statistics
     */
    logStats() {
        const stats = this.getStats();
        console.log('[CACHE] Statistics:', {
            keys: stats.keys,
            hitRate: stats.hitRate,
            hits: stats.hits,
            misses: stats.misses,
            memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
        });
    }

    /**
     * Get all keys by category
     */
    getKeysByCategory(category) {
        if (!this.categories[category]) {
            throw new Error(`Unknown cache category: ${category}`);
        }

        const prefix = this.categories[category].prefix;
        return this.cache.keys().filter(key => key.startsWith(prefix));
    }

    /**
     * Clean up expired entries manually
     */
    cleanup() {
        const beforeKeys = this.cache.keys().length;
        // Force NodeCache to clean up expired keys
        this.cache.keys(); // This triggers internal cleanup
        const afterKeys = this.cache.keys().length;
        
        if (beforeKeys !== afterKeys) {
            console.log(`[CACHE] Cleaned up ${beforeKeys - afterKeys} expired entries`);
        }
    }
}

// Create singleton instance
const cacheManager = new CacheManager();

// Export both the class and the singleton for flexibility
module.exports = {
    CacheManager,
    cacheManager,
    // Backward compatibility exports
    cache: cacheManager.cache, // Direct access to NodeCache instance if needed
    default: cacheManager
};
