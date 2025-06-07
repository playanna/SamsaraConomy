// utils/dataManagers/LootDataManager.js
// Lazy loading manager for loot tables with realm-based optimization

const StaticDataManager = require('./StaticDataManager.js');

class LootDataManager extends StaticDataManager {
  constructor() {
    super('LOOT_DATA', 25 * 60 * 1000); // 25 minute cleanup interval
    this.originalLootTables = null;
    this.originalAdvancedTables = null;
    this.realmIndex = null;
    this.typeIndex = null;
  }

  /**
   * Lazy load original loot data on first access
   */
  _ensureOriginalLootData() {
    if (!this.originalLootTables) {
      const { lootTables } = require('../loots.js');
      this.originalLootTables = lootTables;
      
      // Pre-compute indices for performance
      this._buildLootIndices();
      
      console.log(`🎁 LootDataManager: Loaded loot tables for ${Object.keys(lootTables).length} realms`);
    }
  }

  /**
   * Lazy load advanced loot tables on first access
   */
  _ensureAdvancedLootData() {
    if (!this.originalAdvancedTables) {
      const advancedTables = require('../advancedloottables.js');
      this.originalAdvancedTables = advancedTables;
      
      console.log(`🎯 LootDataManager: Loaded advanced loot tables`);
    }
  }

  /**
   * Build optimized indices for faster lookups
   */
  _buildLootIndices() {
    this.realmIndex = new Map();
    this.typeIndex = new Map();

    for (const [realm, items] of Object.entries(this.originalLootTables)) {
      // Index by realm
      this.realmIndex.set(realm, items);
      
      // Index by type within each realm
      const typeMap = new Map();
      for (const item of items) {
        if (!typeMap.has(item.type)) {
          typeMap.set(item.type, []);
        }
        typeMap.get(item.type).push(item);
      }
      this.typeIndex.set(realm, typeMap);
    }
  }

  /**
   * Get loot table for a specific realm
   * @param {string} realm - The realm name (e.g., 'verdant', 'crimson')
   * @returns {Array} Array of loot items for the realm
   */
  getLootTableByRealm(realm = 'verdant') {
    const cacheKey = `realm:${realm}`;
    
    if (this._isLoaded(cacheKey)) {
      return this._getData(cacheKey);
    }

    this._ensureOriginalLootData();
    
    const realmLoot = this.realmIndex.get(realm) || this.realmIndex.get('verdant') || [];
    this._storeData(cacheKey, realmLoot);
    
    return realmLoot;
  }

  /**
   * Get loot items by type within a realm
   * @param {string} realm - The realm name
   * @param {string} type - The item type (e.g., 'soul', 'material', 'artifact')
   * @returns {Array} Array of loot items matching the criteria
   */
  getLootByRealmAndType(realm = 'verdant', type) {
    if (!type) {
      return this.getLootTableByRealm(realm);
    }

    const cacheKey = `realm:${realm}:type:${type}`;
    
    if (this._isLoaded(cacheKey)) {
      return this._getData(cacheKey);
    }

    this._ensureOriginalLootData();
    
    const realmTypeMap = this.typeIndex.get(realm);
    const typeItems = realmTypeMap ? (realmTypeMap.get(type) || []) : [];
    
    this._storeData(cacheKey, typeItems);
    
    return typeItems;
  }

  /**
   * Get categorized loot items for a realm (soul vs material items)
   * @param {string} realm - The realm name
   * @returns {Object} Object with soulItems and materialItems arrays
   */
  getCategorizedLootByRealm(realm = 'verdant') {
    const cacheKey = `categorized:${realm}`;
    
    if (this._isLoaded(cacheKey)) {
      return this._getData(cacheKey);
    }

    const realmLoot = this.getLootTableByRealm(realm);
    
    const categorized = {
      soulItems: realmLoot.filter(item => item.type === 'soul' || item.type === 'karma'),
      materialItems: realmLoot.filter(item => item.type !== 'soul' && item.type !== 'karma')
    };
    
    this._storeData(cacheKey, categorized);
    
    return categorized;
  }

  /**
   * Get all available realms
   * @returns {Array} Array of realm names
   */
  getAvailableRealms() {
    const cacheKey = 'all:realms';
    
    if (this._isLoaded(cacheKey)) {
      return this._getData(cacheKey);
    }

    this._ensureOriginalLootData();
    
    const realms = Array.from(this.realmIndex.keys());
    this._storeData(cacheKey, realms);
    
    return realms;
  }

  /**
   * Get all available item types across all realms
   * @returns {Array} Array of unique item types
   */
  getAvailableItemTypes() {
    const cacheKey = 'all:types';
    
    if (this._isLoaded(cacheKey)) {
      return this._getData(cacheKey);
    }

    this._ensureOriginalLootData();
    
    const types = new Set();
    for (const typeMap of this.typeIndex.values()) {
      for (const type of typeMap.keys()) {
        types.add(type);
      }
    }
    
    const typeArray = Array.from(types);
    this._storeData(cacheKey, typeArray);
    
    return typeArray;
  }

  /**
   * Get advanced loot tables
   * @returns {Object} Advanced loot table system
   */
  getAdvancedLootTables() {
    const cacheKey = 'advanced:all';
    
    if (this._isLoaded(cacheKey)) {
      return this._getData(cacheKey);
    }

    this._ensureAdvancedLootData();
    
    this._storeData(cacheKey, this.originalAdvancedTables);
    
    return this.originalAdvancedTables;
  }

  /**
   * Get advanced loot for specific realm
   * @param {string} realmKey - The realm key
   * @param {number} playerLevel - Player level for scaling
   * @returns {Object} Generated loot item
   */
  getAdvancedRealmLoot(realmKey = 'verdant', playerLevel = 1) {
    const advancedTables = this.getAdvancedLootTables();
    
    if (advancedTables.getRealmLoot) {
      return advancedTables.getRealmLoot(realmKey, playerLevel);
    }
    
    // Fallback to basic loot
    const realmLoot = this.getLootTableByRealm(realmKey);
    if (realmLoot.length > 0) {
      return realmLoot[Math.floor(Math.random() * realmLoot.length)];
    }
    
    return null;
  }

  /**
   * Find loot item by name across all realms
   * @param {string} itemName - The item name to search for
   * @returns {Object|null} The loot item and its realm, or null if not found
   */
  findLootItemByName(itemName) {
    if (!itemName) {
      return null;
    }

    const cacheKey = `item:${itemName}`;
    
    if (this._isLoaded(cacheKey)) {
      return this._getData(cacheKey);
    }

    this._ensureOriginalLootData();
    
    for (const [realm, items] of this.realmIndex.entries()) {
      const item = items.find(item => item.name === itemName);
      if (item) {
        const result = { ...item, realm };
        this._storeData(cacheKey, result);
        return result;
      }
    }
    
    this._storeData(cacheKey, null);
    return null;
  }

  /**
   * Get loot statistics
   * @returns {Object} Statistics about loot data
   */
  getLootStats() {
    this._ensureOriginalLootData();
    
    const stats = {
      totalRealms: this.realmIndex.size,
      totalItems: 0,
      itemsByRealm: {},
      itemsByType: {}
    };

    for (const [realm, items] of this.realmIndex.entries()) {
      stats.totalItems += items.length;
      stats.itemsByRealm[realm] = items.length;
    }

    for (const [realm, typeMap] of this.typeIndex.entries()) {
      for (const [type, items] of typeMap.entries()) {
        if (!stats.itemsByType[type]) {
          stats.itemsByType[type] = 0;
        }
        stats.itemsByType[type] += items.length;
      }
    }

    return stats;
  }

  /**
   * Get all loot tables (compatibility method)
   * Note: Loads all data at once, use specific methods when possible
   * @returns {Object} All loot tables
   */
  getAllLootTables() {
    const cacheKey = 'all:tables';
    
    if (this._isLoaded(cacheKey)) {
      return this._getData(cacheKey);
    }

    this._ensureOriginalLootData();
    
    // Create a copy to prevent mutations
    const allTables = { ...this.originalLootTables };
    this._storeData(cacheKey, allTables);
    
    console.log('⚠️ LootDataManager: Loading all loot tables at once. Consider using realm-specific queries for better performance.');
    
    return allTables;
  }
}

// Create singleton instance
const lootDataManager = new LootDataManager();

module.exports = {
  LootDataManager,
  lootDataManager
};
