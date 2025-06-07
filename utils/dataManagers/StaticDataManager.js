// utils/dataManagers/StaticDataManager.js
// Unified lazy loading manager for large static data structures

const { cacheManager } = require('../cache/cacheManager.js');

/**
 * Base class for lazy loading static data with automatic cleanup
 */
class StaticDataManager {
  constructor(cacheCategory = 'STATIC_DATA', cleanupInterval = 30 * 60 * 1000) {
    this.cache = new Map();
    this.loadedKeys = new Set();
    this.lastAccessed = new Map();
    this.cacheCategory = cacheCategory;
    this.cleanupInterval = cleanupInterval;
    
    // Start periodic cleanup
    this.cleanupTimer = setInterval(() => this.cleanup(), cleanupInterval);
  }

  /**
   * Record access time for cleanup purposes
   */
  _recordAccess(key) {
    this.lastAccessed.set(key, Date.now());
  }

  /**
   * Check if data is loaded and not expired
   */
  _isLoaded(key) {
    return this.loadedKeys.has(key) && this.cache.has(key);
  }

  /**
   * Store data in both internal cache and unified cache manager
   */
  _storeData(key, data) {
    this.cache.set(key, data);
    this.loadedKeys.add(key);
    this._recordAccess(key);
    
    // Also cache in unified cache manager for cross-component access
    cacheManager.set(`${this.cacheCategory}:${key}`, data, this.cacheCategory);
  }

  /**
   * Retrieve data with access tracking
   */
  _getData(key) {
    this._recordAccess(key);
    return this.cache.get(key);
  }

  /**
   * Periodic cleanup of unused data
   */
  cleanup() {
    const cutoff = Date.now() - this.cleanupInterval;
    let removedCount = 0;

    for (const [key, lastAccessTime] of this.lastAccessed.entries()) {
      if (lastAccessTime < cutoff) {
        this.cache.delete(key);
        this.loadedKeys.delete(key);
        this.lastAccessed.delete(key);
        cacheManager.del(`${this.cacheCategory}:${key}`);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`🧹 StaticDataManager cleanup: removed ${removedCount} unused data entries`);
    }
  }

  /**
   * Force cleanup of all data
   */
  clear() {
    this.cache.clear();
    this.loadedKeys.clear();
    this.lastAccessed.clear();
    
    // Clear from unified cache as well
    const keys = cacheManager.getKeys().filter(key => key.startsWith(`${this.cacheCategory}:`));
    keys.forEach(key => cacheManager.del(key));
  }

  /**
   * Get current cache statistics
   */
  getStats() {
    return {
      loadedKeys: this.loadedKeys.size,
      cacheSize: this.cache.size,
      lastAccessedCount: this.lastAccessed.size,
      memoryUsage: this._estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  _estimateMemoryUsage() {
    let size = 0;
    for (const data of this.cache.values()) {
      try {
        size += JSON.stringify(data).length * 2; // Rough estimate (2 bytes per char)
      } catch (e) {
        size += 1000; // Fallback estimate for circular references
      }
    }
    return size;
  }

  /**
   * Graceful shutdown
   */
  shutdown() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
    console.log(`📊 StaticDataManager shutdown: ${this.cacheCategory} cleaned up`);
  }
}

module.exports = StaticDataManager;
