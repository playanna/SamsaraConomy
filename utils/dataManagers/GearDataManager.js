// utils/dataManagers/GearDataManager.js
// Lazy loading manager for gear items with slot-based optimization

const StaticDataManager = require('./StaticDataManager.js');

class GearDataManager extends StaticDataManager {
  constructor() {
    super('GEAR_DATA', 30 * 60 * 1000); // 30 minute cleanup interval
    this.originalGearItems = null; // Will hold full gear data when first loaded
    this.slotIndex = null; // Pre-computed slot index for faster lookups
  }

  /**
   * Lazy load original gear data on first access
   */
  _ensureOriginalData() {
    if (!this.originalGearItems) {
      // Import gear data only when needed
      const { gearItems } = require('../gearTables.js');
      this.originalGearItems = gearItems;
      
      // Pre-compute slot index for performance
      this.slotIndex = new Map();
      for (const item of gearItems) {
        if (!this.slotIndex.has(item.slot)) {
          this.slotIndex.set(item.slot, []);
        }
        this.slotIndex.get(item.slot).push(item);
      }
      
      console.log(`⚙️ GearDataManager: Loaded ${gearItems.length} gear items with ${this.slotIndex.size} unique slots`);
    }
  }

  /**
   * Get gear items by slot with lazy loading
   * @param {string} slot - The gear slot (e.g., 'weapon', 'armor', 'amulet')
   * @returns {Array} Array of gear items for the slot
   */
  getGearBySlot(slot) {
    if (!slot) {
      throw new Error('Slot parameter is required');
    }

    const cacheKey = `slot:${slot}`;
    
    if (this._isLoaded(cacheKey)) {
      return this._getData(cacheKey);
    }

    this._ensureOriginalData();
    
    const slotItems = this.slotIndex.get(slot) || [];
    this._storeData(cacheKey, slotItems);
    
    return slotItems;
  }

  /**
   * Get all available gear slots
   * @returns {Array} Array of slot names
   */
  getAvailableSlots() {
    const cacheKey = 'all:slots';
    
    if (this._isLoaded(cacheKey)) {
      return this._getData(cacheKey);
    }

    this._ensureOriginalData();
    
    const slots = Array.from(this.slotIndex.keys());
    this._storeData(cacheKey, slots);
    
    return slots;
  }

  /**
   * Find gear item by name with optimized search
   * @param {string} name - The gear item name
   * @returns {Object|null} The gear item or null if not found
   */
  findGearByName(name) {
    if (!name) {
      return null;
    }

    const cacheKey = `item:${name}`;
    
    if (this._isLoaded(cacheKey)) {
      return this._getData(cacheKey);
    }

    this._ensureOriginalData();
    
    const item = this.originalGearItems.find(item => item.name === name) || null;
    this._storeData(cacheKey, item);
    
    return item;
  }

  /**
   * Get gear items by rarity with lazy loading
   * @param {string} rarity - The rarity level
   * @returns {Array} Array of gear items with specified rarity
   */
  getGearByRarity(rarity) {
    if (!rarity) {
      return [];
    }

    const cacheKey = `rarity:${rarity.toLowerCase()}`;
    
    if (this._isLoaded(cacheKey)) {
      return this._getData(cacheKey);
    }

    this._ensureOriginalData();
    
    const rarityItems = this.originalGearItems.filter(item => 
      item.rarity && item.rarity.toLowerCase() === rarity.toLowerCase()
    );
    this._storeData(cacheKey, rarityItems);
    
    return rarityItems;
  }

  /**
   * Get gear items by set with lazy loading
   * @param {string} setName - The gear set name
   * @returns {Array} Array of gear items in the set
   */
  getGearBySet(setName) {
    if (!setName) {
      return [];
    }

    const cacheKey = `set:${setName}`;
    
    if (this._isLoaded(cacheKey)) {
      return this._getData(cacheKey);
    }

    this._ensureOriginalData();
    
    const setItems = this.originalGearItems.filter(item => item.set === setName);
    this._storeData(cacheKey, setItems);
    
    return setItems;
  }

  /**
   * Get all gear items (fallback for compatibility)
   * Note: This loads all data but should be avoided in favor of specific queries
   * @param {string} [slot] - Optional slot filter
   * @returns {Array} All gear items or filtered by slot
   */
  getAllGearItems(slot = null) {
    if (slot) {
      return this.getGearBySlot(slot);
    }

    const cacheKey = 'all:items';
    
    if (this._isLoaded(cacheKey)) {
      return this._getData(cacheKey);
    }

    this._ensureOriginalData();
    
    // Store a copy to prevent mutations
    const allItems = [...this.originalGearItems];
    this._storeData(cacheKey, allItems);
    
    console.log('⚠️ GearDataManager: Loading all gear items at once. Consider using slot-specific queries for better performance.');
    
    return allItems;
  }

  /**
   * Get random gear items from specific slots
   * @param {Array} slots - Array of slot names
   * @param {number} maxPerSlot - Maximum items per slot
   * @returns {Array} Random selection of gear items
   */
  getRandomGearBySlots(slots = [], maxPerSlot = 4) {
    const result = [];
    
    for (const slot of slots) {
      const slotItems = this.getGearBySlot(slot);
      if (slotItems.length > 0) {
        const shuffled = [...slotItems].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, Math.min(maxPerSlot, slotItems.length));
        result.push(...selected);
      }
    }
    
    return result;
  }

  /**
   * Get gear statistics
   * @returns {Object} Statistics about gear data
   */
  getGearStats() {
    this._ensureOriginalData();
    
    const stats = {
      totalItems: this.originalGearItems.length,
      totalSlots: this.slotIndex.size,
      itemsBySlot: {},
      itemsByRarity: {},
      itemsBySet: {}
    };

    // Count items by slot
    for (const [slot, items] of this.slotIndex.entries()) {
      stats.itemsBySlot[slot] = items.length;
    }

    // Count items by rarity and set
    for (const item of this.originalGearItems) {
      if (item.rarity) {
        stats.itemsByRarity[item.rarity] = (stats.itemsByRarity[item.rarity] || 0) + 1;
      }
      if (item.set) {
        stats.itemsBySet[item.set] = (stats.itemsBySet[item.set] || 0) + 1;
      }
    }

    return stats;
  }
}

// Create singleton instance
const gearDataManager = new GearDataManager();

module.exports = {
  GearDataManager,
  gearDataManager
};
