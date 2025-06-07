// utils/dataManagers/CreatureDataManager.js
// Lazy loading manager for creature data with realm-based optimization

const StaticDataManager = require('./StaticDataManager.js');

class CreatureDataManager extends StaticDataManager {
  constructor() {
    super('CREATURE_DATA', 20 * 60 * 1000); // 20 minute cleanup interval
    this.originalCreatures = null;
    this.realmIndex = null;
    this.levelIndex = null;
    this.elementIndex = null;
  }

  /**
   * Lazy load original creature data on first access
   */
  _ensureOriginalData() {
    if (!this.originalCreatures) {
      const creatures = require('../../data/creatures.js');
      this.originalCreatures = creatures;
      
      // Pre-compute indices for performance
      this._buildCreatureIndices();
      
      const totalCreatures = Object.values(creatures).reduce((sum, realmCreatures) => sum + realmCreatures.length, 0);
      console.log(`🐲 CreatureDataManager: Loaded ${totalCreatures} creatures across ${Object.keys(creatures).length} realms`);
    }
  }

  /**
   * Build optimized indices for faster lookups
   */
  _buildCreatureIndices() {
    this.realmIndex = new Map();
    this.levelIndex = new Map();
    this.elementIndex = new Map();

    for (const [realm, creatures] of Object.entries(this.originalCreatures)) {
      // Index by realm
      this.realmIndex.set(realm, creatures);
      
      // Index by level and element within each realm
      for (const creature of creatures) {
        // Level index
        const levelKey = `${realm}:level:${creature.level}`;
        if (!this.levelIndex.has(levelKey)) {
          this.levelIndex.set(levelKey, []);
        }
        this.levelIndex.get(levelKey).push(creature);
        
        // Element index
        if (creature.element) {
          const elementKey = `${realm}:element:${creature.element}`;
          if (!this.elementIndex.has(elementKey)) {
            this.elementIndex.set(elementKey, []);
          }
          this.elementIndex.get(elementKey).push(creature);
        }
      }
    }
  }

  /**
   * Get creatures for a specific realm
   * @param {string} realm - The realm name (e.g., 'verdant', 'crimson')
   * @returns {Array} Array of creatures in the realm
   */
  getCreaturesByRealm(realm = 'verdant') {
    const cacheKey = `realm:${realm}`;
    
    if (this._isLoaded(cacheKey)) {
      return this._getData(cacheKey);
    }

    this._ensureOriginalData();
    
    const realmCreatures = this.realmIndex.get(realm) || this.realmIndex.get('verdant') || [];
    this._storeData(cacheKey, realmCreatures);
    
    return realmCreatures;
  }

  /**
   * Get a random creature from a specific realm
   * @param {string} realm - The realm name
   * @returns {Object|null} Random creature from the realm
   */
  getRandomCreatureByRealm(realm = 'verdant') {
    const realmCreatures = this.getCreaturesByRealm(realm);
    
    if (realmCreatures.length === 0) {
      // Fallback to verdant realm
      const verdantCreatures = this.getCreaturesByRealm('verdant');
      return verdantCreatures.length > 0 ? verdantCreatures[Math.floor(Math.random() * verdantCreatures.length)] : null;
    }
    
    return realmCreatures[Math.floor(Math.random() * realmCreatures.length)];
  }

  /**
   * Get creatures by level within a realm
   * @param {string} realm - The realm name
   * @param {number} level - The creature level
   * @returns {Array} Array of creatures matching the criteria
   */
  getCreaturesByRealmAndLevel(realm = 'verdant', level) {
    if (level === undefined || level === null) {
      return this.getCreaturesByRealm(realm);
    }

    const cacheKey = `realm:${realm}:level:${level}`;
    
    if (this._isLoaded(cacheKey)) {
      return this._getData(cacheKey);
    }

    this._ensureOriginalData();
    
    const levelKey = `${realm}:level:${level}`;
    const levelCreatures = this.levelIndex.get(levelKey) || [];
    
    this._storeData(cacheKey, levelCreatures);
    
    return levelCreatures;
  }

  /**
   * Get creatures by element within a realm
   * @param {string} realm - The realm name
   * @param {string} element - The creature element
   * @returns {Array} Array of creatures matching the criteria
   */
  getCreaturesByRealmAndElement(realm = 'verdant', element) {
    if (!element) {
      return this.getCreaturesByRealm(realm);
    }

    const cacheKey = `realm:${realm}:element:${element}`;
    
    if (this._isLoaded(cacheKey)) {
      return this._getData(cacheKey);
    }

    this._ensureOriginalData();
    
    const elementKey = `${realm}:element:${element}`;
    const elementCreatures = this.elementIndex.get(elementKey) || [];
    
    this._storeData(cacheKey, elementCreatures);
    
    return elementCreatures;
  }

  /**
   * Find creature by ID across all realms
   * @param {string} creatureId - The creature ID
   * @returns {Object|null} The creature and its realm, or null if not found
   */
  findCreatureById(creatureId) {
    if (!creatureId) {
      return null;
    }

    const cacheKey = `id:${creatureId}`;
    
    if (this._isLoaded(cacheKey)) {
      return this._getData(cacheKey);
    }

    this._ensureOriginalData();
    
    for (const [realm, creatures] of this.realmIndex.entries()) {
      const creature = creatures.find(c => c.id === creatureId);
      if (creature) {
        const result = { ...creature, realm };
        this._storeData(cacheKey, result);
        return result;
      }
    }
    
    this._storeData(cacheKey, null);
    return null;
  }

  /**
   * Find creature by name across all realms
   * @param {string} creatureName - The creature name
   * @returns {Object|null} The creature and its realm, or null if not found
   */
  findCreatureByName(creatureName) {
    if (!creatureName) {
      return null;
    }

    const cacheKey = `name:${creatureName}`;
    
    if (this._isLoaded(cacheKey)) {
      return this._getData(cacheKey);
    }

    this._ensureOriginalData();
    
    for (const [realm, creatures] of this.realmIndex.entries()) {
      const creature = creatures.find(c => c.name === creatureName);
      if (creature) {
        const result = { ...creature, realm };
        this._storeData(cacheKey, result);
        return result;
      }
    }
    
    this._storeData(cacheKey, null);
    return null;
  }

  /**
   * Get creatures within a level range in a realm
   * @param {string} realm - The realm name
   * @param {number} minLevel - Minimum level (inclusive)
   * @param {number} maxLevel - Maximum level (inclusive)
   * @returns {Array} Array of creatures within the level range
   */
  getCreaturesByLevelRange(realm = 'verdant', minLevel = 1, maxLevel = 100) {
    const cacheKey = `realm:${realm}:range:${minLevel}-${maxLevel}`;
    
    if (this._isLoaded(cacheKey)) {
      return this._getData(cacheKey);
    }

    const realmCreatures = this.getCreaturesByRealm(realm);
    const rangeCreatures = realmCreatures.filter(creature => 
      creature.level >= minLevel && creature.level <= maxLevel
    );
    
    this._storeData(cacheKey, rangeCreatures);
    
    return rangeCreatures;
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

    this._ensureOriginalData();
    
    const realms = Array.from(this.realmIndex.keys());
    this._storeData(cacheKey, realms);
    
    return realms;
  }

  /**
   * Get all available elements across all realms
   * @returns {Array} Array of unique elements
   */
  getAvailableElements() {
    const cacheKey = 'all:elements';
    
    if (this._isLoaded(cacheKey)) {
      return this._getData(cacheKey);
    }

    this._ensureOriginalData();
    
    const elements = new Set();
    for (const creatures of this.realmIndex.values()) {
      for (const creature of creatures) {
        if (creature.element) {
          elements.add(creature.element);
        }
      }
    }
    
    const elementArray = Array.from(elements);
    this._storeData(cacheKey, elementArray);
    
    return elementArray;
  }

  /**
   * Get creature statistics
   * @returns {Object} Statistics about creature data
   */
  getCreatureStats() {
    this._ensureOriginalData();
    
    const stats = {
      totalRealms: this.realmIndex.size,
      totalCreatures: 0,
      creaturesByRealm: {},
      creaturesByElement: {},
      levelRange: { min: Infinity, max: -Infinity }
    };

    for (const [realm, creatures] of this.realmIndex.entries()) {
      stats.totalCreatures += creatures.length;
      stats.creaturesByRealm[realm] = creatures.length;
      
      for (const creature of creatures) {
        // Track level range
        if (creature.level < stats.levelRange.min) {
          stats.levelRange.min = creature.level;
        }
        if (creature.level > stats.levelRange.max) {
          stats.levelRange.max = creature.level;
        }
        
        // Count by element
        if (creature.element) {
          if (!stats.creaturesByElement[creature.element]) {
            stats.creaturesByElement[creature.element] = 0;
          }
          stats.creaturesByElement[creature.element]++;
        }
      }
    }

    if (stats.levelRange.min === Infinity) {
      stats.levelRange = { min: 0, max: 0 };
    }

    return stats;
  }

  /**
   * Get all creatures (compatibility method)
   * Note: Loads all data at once, use specific methods when possible
   * @returns {Object} All creature data
   */
  getAllCreatures() {
    const cacheKey = 'all:creatures';
    
    if (this._isLoaded(cacheKey)) {
      return this._getData(cacheKey);
    }

    this._ensureOriginalData();
    
    // Create a copy to prevent mutations
    const allCreatures = {};
    for (const [realm, creatures] of this.realmIndex.entries()) {
      allCreatures[realm] = [...creatures];
    }
    
    this._storeData(cacheKey, allCreatures);
    
    console.log('⚠️ CreatureDataManager: Loading all creature data at once. Consider using realm-specific queries for better performance.');
    
    return allCreatures;
  }
}

// Create singleton instance
const creatureDataManager = new CreatureDataManager();

module.exports = {
  CreatureDataManager,
  creatureDataManager
};
