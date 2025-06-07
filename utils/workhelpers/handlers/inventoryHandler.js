const Inventory = require('../../../models/Multipliers/inventory.js');
const InventoryOptimized = require('../../../models/Multipliers/inventoryOptimized.js');
const { categorizeLoot } = require('./lootHandler.js');
const { cacheManager } = require('../../cache/cacheManager.js');

/**
 * Migration utility to convert array-based inventory to Map-based
 * @param {Object} arrayInventory - Inventory document with array storage
 * @returns {Object} Map-based inventory data
 */
function convertArrayToMapFormat(arrayInventory) {
  const mapFormat = {
    userId: arrayInventory.userId,
    souls: new Map(),
    artifacts: new Map(),
    materials: new Map(),
    alchemy: new Map(),
    karma: new Map(),
    pills: arrayInventory.pills || new Map(),
    activePills: arrayInventory.activePills || new Map(),
    totalKarmicDebt: arrayInventory.totalKarmicDebt || 0,
    karmicRealms: arrayInventory.karmicRealms || "Karma-Bhāra",
    tribulationBoost: arrayInventory.tribulationBoost || 0,
    lastPurification: arrayInventory.lastPurification,
    metadata: {
      totalItems: 0,
      totalValue: 0,
      lastUpdated: new Date(),
      version: 2
    }
  };

  // Convert arrays to Maps using itemId as key
  const categories = ['souls', 'artifacts', 'materials', 'alchemy', 'karma'];
  for (const category of categories) {
    if (arrayInventory[category] && Array.isArray(arrayInventory[category])) {
      for (const item of arrayInventory[category]) {
        if (item.itemId) {
          mapFormat[category].set(item.itemId, {
            ...item,
            lastAccessed: new Date(),
            accessCount: 1
          });
          mapFormat.metadata.totalItems += item.quantity || 1;
          mapFormat.metadata.totalValue += (item.value || 0) * (item.quantity || 1);
        }
      }
    }
  }

  return mapFormat;
}

/**
 * Get or migrate user inventory to optimized format
 * @param {string} userId - User ID
 * @returns {Object} Optimized inventory document
 */
async function getOrMigrateInventory(userId) {
  const cacheKey = `inventory_optimized:${userId}`;
  
  // Check cache first
  let cachedInventory = cacheManager.get('USER_DATA', cacheKey);
  if (cachedInventory) {
    return cachedInventory;
  }

  // Try to get optimized inventory first
  let optimizedInventory = await InventoryOptimized.findOne({ userId });
  
  if (!optimizedInventory) {
    // Check if old format exists and migrate
    const oldInventory = await Inventory.findOne({ userId });
    
    if (oldInventory) {
      // Migrate from array to Map format
      const mapData = convertArrayToMapFormat(oldInventory);
      optimizedInventory = new InventoryOptimized(mapData);
      await optimizedInventory.save();
      
      // Keep old inventory for safety (can be cleaned up later)
      console.log(`[MIGRATION] Migrated inventory for user ${userId} to optimized format`);
    } else {
      // Create new optimized inventory
      optimizedInventory = new InventoryOptimized({
        userId,
        souls: new Map(),
        artifacts: new Map(),
        materials: new Map(),
        alchemy: new Map(),
        karma: new Map(),
        metadata: {
          totalItems: 0,
          totalValue: 0,
          lastUpdated: new Date(),
          version: 2
        }
      });
      await optimizedInventory.save();
    }
  } else {
    // Convert Mongoose document Maps back to proper Maps if needed
    // This ensures consistent behavior between cached and fresh data
    const categories = ['souls', 'artifacts', 'materials', 'alchemy', 'karma'];
    for (const category of categories) {
      if (optimizedInventory[category] && !(optimizedInventory[category] instanceof Map)) {
        // Convert plain object back to Map
        const newMap = new Map();
        if (typeof optimizedInventory[category] === 'object') {
          for (const [key, value] of Object.entries(optimizedInventory[category])) {
            newMap.set(key, value);
          }
        }
        optimizedInventory[category] = newMap;
      }
    }
  }
  
  // Cache the result
  cacheManager.set('USER_DATA', cacheKey, optimizedInventory);
  
  return optimizedInventory;
}

/**
 * Optimized loot merging using Maps
 * @param {Array} newItems - New items to add
 * @param {Map} existingItemsMap - Existing items as Map
 * @returns {Map} Merged items Map
 */
function mergeLootIntoInventoryOptimized(newItems = [], existingItemsMap = new Map()) {
  const inventoryMap = new Map(existingItemsMap);

  newItems.forEach(item => {
    if (inventoryMap.has(item.itemId)) {
      const existingItem = inventoryMap.get(item.itemId);
      existingItem.quantity += item.quantity;
      existingItem.lastAccessed = new Date();
      existingItem.accessCount = (existingItem.accessCount || 0) + 1;
    } else {
      inventoryMap.set(item.itemId, {
        ...item,
        lastAccessed: new Date(),
        accessCount: 1
      });
    }
  });

  return inventoryMap;
}

/**
 * Optimized loot storage handler
 * @param {Object} params - Storage parameters
 * @returns {Object} Storage results
 */
async function handleLootStorageOptimized({ settings, handDoc, inventory, loots }) {
  const categorized = categorizeLoot(loots);
  const totalLootValue = loots.reduce((acc, item) => acc + (item.value * item.quantity), 0);
  const totalKarmicDebt = loots.reduce((acc, item) => acc + (item.debt * item.quantity), 0);

  if (settings.autosell) {
    handDoc.balance += totalLootValue;
    await handDoc.save();
  } else {
    // Get or migrate inventory
    const optimizedInventory = await getOrMigrateInventory(inventory.userId);
    
    // Merge using optimized Maps
    optimizedInventory.souls = mergeLootIntoInventoryOptimized(categorized.souls, optimizedInventory.souls);
    optimizedInventory.artifacts = mergeLootIntoInventoryOptimized(categorized.artifacts, optimizedInventory.artifacts);
    optimizedInventory.materials = mergeLootIntoInventoryOptimized(categorized.materials, optimizedInventory.materials);
    optimizedInventory.alchemy = mergeLootIntoInventoryOptimized(categorized.alchemy, optimizedInventory.alchemy);
    optimizedInventory.karma = mergeLootIntoInventoryOptimized(categorized.karma, optimizedInventory.karma);
    
    // Update karmic debt and metadata
    optimizedInventory.totalKarmicDebt += totalKarmicDebt;
    optimizedInventory.updateMetadata();
    
    // Perform atomic update
    await optimizedInventory.save();    // Invalidate cache
    const cacheKey = `inventory_optimized:${inventory.userId}`;
    cacheManager.del('USER_DATA', cacheKey);
  }

  return { totalLootValue, totalKarmicDebt };
}

/**
 * Backward compatibility function - converts optimized inventory to array format
 * @param {string} userId - User ID
 * @returns {Object} Array-format inventory for backward compatibility
 */
async function getInventoryInArrayFormat(userId) {
  const optimizedInventory = await getOrMigrateInventory(userId);
  return optimizedInventory.toArrayFormat();
}

/**
 * Get inventory items with pagination support
 * @param {string} userId - User ID
 * @param {string} category - Category to fetch ('all', 'souls', etc.)
 * @param {number} page - Page number (0-based)
 * @param {number} limit - Items per page
 * @returns {Object} Paginated inventory data
 */
async function getPaginatedInventory(userId, category = 'all', page = 0, limit = 10) {
  const optimizedInventory = await getOrMigrateInventory(userId);
  
  let items = [];
    // Helper function to safely iterate over Maps or Objects
  const iterateCollection = (collection, categoryName) => {
    if (!collection) return;
    
    // Handle Map objects
    if (collection instanceof Map) {
      for (const [itemId, item] of collection) {
        // Extract data from Mongoose document if needed
        const itemData = item._doc || item;
        items.push({ 
          ...itemData,
          itemId, 
          category: categoryName,
          type: categoryName // Ensure type is set
        });
      }
    } 
    // Handle plain objects (when loaded from DB, Maps might become Objects)
    else if (typeof collection === 'object') {
      for (const [itemId, item] of Object.entries(collection)) {
        // Extract data from Mongoose document if needed
        const itemData = item._doc || item;
        items.push({ 
          ...itemData,
          itemId, 
          category: categoryName,
          type: categoryName // Ensure type is set
        });
      }
    }
  };
  
  if (category === 'all') {
    const categories = ['souls', 'artifacts', 'materials', 'alchemy', 'karma'];
    for (const cat of categories) {
      iterateCollection(optimizedInventory[cat], cat);
    }
  } else {
    iterateCollection(optimizedInventory[category], category);
  }
  
  // Sort by name for consistent pagination - handle undefined baseName
  items.sort((a, b) => {
    const nameA = a.baseName || a.name || '';
    const nameB = b.baseName || b.name || '';
    return nameA.localeCompare(nameB);
  });
  
  const totalCount = items.length;
  const totalPages = Math.ceil(totalCount / limit);
  const startIndex = page * limit;
  const paginatedItems = items.slice(startIndex, startIndex + limit);
  
  return {
    items: paginatedItems,
    totalCount,
    totalPages,
    currentPage: page,
    metadata: optimizedInventory.metadata
  };
}

/**
 * Sell all items from inventory (optimized)
 * @param {string} userId - User ID
 * @returns {Object} Sell results
 */
async function sellAllItemsOptimized(userId) {
  const optimizedInventory = await getOrMigrateInventory(userId);
  
  let baseValue = 0;
  let soldItemsCount = 0;
  const categories = ['souls', 'artifacts', 'materials', 'alchemy', 'karma'];
  
  // Calculate value in single pass
  for (const category of categories) {
    if (optimizedInventory[category] && optimizedInventory[category].size > 0) {
      for (const [itemId, item] of optimizedInventory[category]) {
        const quantity = item.quantity || 1;
        baseValue += (item.value || 0) * quantity;
        soldItemsCount += quantity;
      }
    }
  }
  
  if (baseValue > 0) {
    // Clear all categories
    for (const category of categories) {
      optimizedInventory[category].clear();
    }
    
    // Update metadata
    optimizedInventory.updateMetadata();
    await optimizedInventory.save();    // Invalidate cache
    const cacheKey = `inventory_optimized:${userId}`;
    cacheManager.del('USER_DATA', cacheKey);
  }
  
  return { baseValue, soldItemsCount };
}

module.exports = {
  // New optimized functions
  getOrMigrateInventory,
  handleLootStorageOptimized,
  mergeLootIntoInventoryOptimized,
  getPaginatedInventory,
  sellAllItemsOptimized,
  
  // Backward compatibility functions
  getInventoryInArrayFormat,
  convertArrayToMapFormat,
  
  // Legacy exports for compatibility
  handleLootStorage: handleLootStorageOptimized,
  mergeLootIntoInventory: mergeLootIntoInventoryOptimized
};
