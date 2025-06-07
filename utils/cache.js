// utils/cache.js
// Backward compatibility wrapper for the unified cache manager
const { cacheManager } = require('./cache/cacheManager');

// Export the cache manager's NodeCache instance for direct compatibility
// This ensures existing code continues to work without modification
module.exports = cacheManager.cache;
