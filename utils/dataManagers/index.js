// utils/dataManagers/index.js
// Central export point for all data managers

const { gearDataManager, GearDataManager } = require('./GearDataManager.js');
const { lootDataManager, LootDataManager } = require('./LootDataManager.js');
const { creatureDataManager, CreatureDataManager } = require('./CreatureDataManager.js');
const StaticDataManager = require('./StaticDataManager.js');

/**
 * Global data manager coordinator
 * Provides centralized control over all static data managers
 */
class DataManagerCoordinator {
  constructor() {
    this.managers = {
      gear: gearDataManager,
      loot: lootDataManager,
      creature: creatureDataManager
    };
  }
  /**
   * Initialize all data managers
   */
  async initializeAll() {
    console.log('🚀 DataManagerCoordinator: Initializing all data managers...');
    
    const initPromises = [];
    
    for (const [name, manager] of Object.entries(this.managers)) {
      try {
        console.log(`📦 Initializing ${name} data manager...`);
        if (typeof manager.initialize === 'function') {
          initPromises.push(manager.initialize());
        }
      } catch (error) {
        console.error(`❌ Error initializing ${name} manager:`, error);
      }
    }
    
    // Wait for all managers to initialize (if they have async initialization)
    if (initPromises.length > 0) {
      await Promise.all(initPromises);
    }
    
    console.log('✅ DataManagerCoordinator: All data managers initialized successfully');
  }

  /**
   * Get comprehensive statistics for all data managers
   */
  getAllStats() {
    const stats = {
      timestamp: new Date().toISOString(),
      managers: {}
    };

    for (const [name, manager] of Object.entries(this.managers)) {
      stats.managers[name] = {
        cache: manager.getStats(),
        data: this._getDataStats(name, manager)
      };
    }

    return stats;
  }

  /**
   * Get data-specific statistics for a manager
   */
  _getDataStats(name, manager) {
    try {
      switch (name) {
        case 'gear':
          return manager.getGearStats();
        case 'loot':
          return manager.getLootStats();
        case 'creature':
          return manager.getCreatureStats();
        default:
          return {};
      }
    } catch (error) {
      console.error(`Error getting stats for ${name} manager:`, error);
      return { error: error.message };
    }
  }

  /**
   * Trigger cleanup on all managers
   */
  cleanupAll() {
    let totalCleaned = 0;
    
    for (const [name, manager] of Object.entries(this.managers)) {
      try {
        const beforeSize = manager.cache.size;
        manager.cleanup();
        const afterSize = manager.cache.size;
        const cleaned = beforeSize - afterSize;
        totalCleaned += cleaned;
        
        if (cleaned > 0) {
          console.log(`🧹 ${name} manager: cleaned ${cleaned} entries`);
        }
      } catch (error) {
        console.error(`Error cleaning up ${name} manager:`, error);
      }
    }

    console.log(`🎯 DataManagerCoordinator: Total cleanup completed, ${totalCleaned} entries removed`);
    return totalCleaned;
  }

  /**
   * Clear all manager caches
   */
  clearAll() {
    for (const [name, manager] of Object.entries(this.managers)) {
      try {
        manager.clear();
        console.log(`🗑️ ${name} manager: cache cleared`);
      } catch (error) {
        console.error(`Error clearing ${name} manager:`, error);
      }
    }
  }

  /**
   * Graceful shutdown of all managers
   */
  shutdown() {
    console.log('📊 DataManagerCoordinator: Initiating graceful shutdown...');
    
    for (const [name, manager] of Object.entries(this.managers)) {
      try {
        manager.shutdown();
      } catch (error) {
        console.error(`Error shutting down ${name} manager:`, error);
      }
    }
    
    console.log('✅ DataManagerCoordinator: All managers shut down successfully');
  }

  /**
   * Get a specific manager by name
   */
  getManager(name) {
    return this.managers[name] || null;
  }

  /**
   * Check if all managers are healthy
   */
  healthCheck() {
    const health = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      managers: {}
    };

    for (const [name, manager] of Object.entries(this.managers)) {
      try {
        const stats = manager.getStats();
        health.managers[name] = {
          status: 'healthy',
          loadedKeys: stats.loadedKeys,
          cacheSize: stats.cacheSize,
          memoryUsage: stats.memoryUsage
        };
      } catch (error) {
        health.managers[name] = {
          status: 'error',
          error: error.message
        };
        health.overall = 'degraded';
      }
    }

    return health;
  }
  /**
   * Log statistics for all data managers
   */
  logStats() {
    console.log('📊 DataManagerCoordinator Statistics:');
    
    for (const [name, manager] of Object.entries(this.managers)) {
      try {
        const stats = manager.getStats();
        console.log(`  ${name.toUpperCase()} Manager:`);
        console.log(`    Cache Size: ${stats.cacheSize} entries`);
        console.log(`    Hit Rate: ${stats.hitRate}%`);
        console.log(`    Memory Usage: ~${Math.round(stats.memoryUsage / 1024)}KB`);
        console.log(`    Last Cleanup: ${stats.lastCleanup || 'Never'}`);
      } catch (error) {
        console.error(`    Error getting stats for ${name}:`, error.message);
      }
    }
  }

  /**
   * Force memory pressure handling across all managers
   */
  handleMemoryPressure() {
    console.log('⚠️ DataManagerCoordinator: Handling memory pressure...');
    
    const beforeStats = this.getAllStats();
    this.cleanupAll();
    const afterStats = this.getAllStats();
    
    const memoryFreed = Object.keys(beforeStats.managers).reduce((total, name) => {
      const before = beforeStats.managers[name].cache.memoryUsage || 0;
      const after = afterStats.managers[name].cache.memoryUsage || 0;
      return total + (before - after);
    }, 0);

    console.log(`💾 DataManagerCoordinator: Memory pressure handled, ~${Math.round(memoryFreed / 1024)}KB freed`);
    return memoryFreed;
  }
}

// Create singleton coordinator
const dataManagerCoordinator = new DataManagerCoordinator();

// Export everything
module.exports = {
  // Individual managers
  gearDataManager,
  lootDataManager,
  creatureDataManager,
  
  // Manager classes for custom instances
  GearDataManager,
  LootDataManager,
  CreatureDataManager,
  StaticDataManager,
  
  // Coordinator
  dataManagerCoordinator,
  DataManagerCoordinator
};
