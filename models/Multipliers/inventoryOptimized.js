const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  // Core Identity
  itemId: { type: String, required: true }, // Prevents duplicates
  name: { type: String, required: true },
  baseName: { type: String, required: true }, // "Enlightened Soul Pearl" (without rarity prefix)
  emoji: { type: String, default: '🔮' }, // Default emoji for items
  
  // Gameplay Stats
  value: { type: Number, required: true },
  debt: { type: Number, default: 0 },
  quantity: { type: Number, default: 1, min: 1 },
  
  // Classification
  type: { 
    type: String, 
    required: true,
    enum: ['soul', 'karma', 'material', 'artifact', 'alchemy']
  },
  realm: { 
    type: String, 
    required: true,
    enum: ['verdant', 'moon', 'crimson', 'abyssal', 'chain', 'hells', 'summit']
  },
  
  // Special Properties
  isBound: { type: Boolean, default: false },
  specialEffect: { type: String },
  karmicHistory: [{ 
    event: String, // "captured", "traded", "purified"
    timestamp: { type: Date, default: Date.now }
  }],

  // Optimization fields
  lastAccessed: { type: Date, default: Date.now },
  accessCount: { type: Number, default: 0 }
}, { timestamps: true });

const inventorySchemaOptimized = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  
  // Use Maps for better performance on large datasets
  souls: { type: Map, of: itemSchema },
  artifacts: { type: Map, of: itemSchema },
  materials: { type: Map, of: itemSchema },
  alchemy: { type: Map, of: itemSchema },
  karma: { type: Map, of: itemSchema },
  
  // Separate metadata for quick access
  metadata: {
    totalItems: { type: Number, default: 0 },
    totalValue: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
    version: { type: Number, default: 2 } // Track schema version for migrations
  },
  
  // Existing fields maintained for compatibility
  pills: {
    type: Map,
    of: Number,
    default: {}
  },
  activePills: {
    type: Map,
    of: Number,
    default: {}
  },
  totalKarmicDebt: { type: Number, default: 0 },
  karmicRealms: { 
    type: String, 
    default: "Karma-Bhāra", // Default realm
  },
  tribulationBoost: { type: Number, default: 0 }, // Boost for tribulation success rate
  lastPurification: { type: Date }
}, { 
  // Enable versioning for safe migrations
  versionKey: '__v',
  timestamps: true,
  
  statics: {
    // Enhanced debt calculation using Maps
    async calculateTotalDebt(userId) {
      const doc = await this.findOne({ userId }).lean();
      if (!doc) return 0;
      
      let totalDebt = 0;
      const categories = ['souls', 'artifacts', 'materials', 'alchemy', 'karma'];
      
      for (const category of categories) {
        if (doc[category]) {
          for (const [itemId, item] of Object.entries(doc[category])) {
            totalDebt += (item.debt || 0) * (item.quantity || 1);
          }
        }
      }
      
      return totalDebt;
    },
    
    // Fast total value calculation
    async calculateTotalValue(userId) {
      const doc = await this.findOne({ userId }).lean();
      if (!doc) return 0;
      
      let totalValue = 0;
      const categories = ['souls', 'artifacts', 'materials', 'alchemy', 'karma'];
      
      for (const category of categories) {
        if (doc[category]) {
          for (const [itemId, item] of Object.entries(doc[category])) {
            totalValue += (item.value || 0) * (item.quantity || 1);
          }
        }
      }
      
      return totalValue;
    },
    
    // Get paginated items from a specific category
    async getPaginatedItems(userId, category = 'all', page = 0, limit = 10) {
      const doc = await this.findOne({ userId }).lean();
      if (!doc) return { items: [], totalCount: 0, totalPages: 0 };
      
      let items = [];
      
      if (category === 'all') {
        const categories = ['souls', 'artifacts', 'materials', 'alchemy', 'karma'];
        for (const cat of categories) {
          if (doc[cat]) {
            for (const [itemId, item] of Object.entries(doc[cat])) {
              items.push({ ...item, itemId, category: cat });
            }
          }
        }
      } else if (doc[category]) {
        for (const [itemId, item] of Object.entries(doc[category])) {
          items.push({ ...item, itemId, category });
        }
      }
      
      const totalCount = items.length;
      const totalPages = Math.ceil(totalCount / limit);
      const startIndex = page * limit;
      const paginatedItems = items.slice(startIndex, startIndex + limit);
      
      return {
        items: paginatedItems,
        totalCount,
        totalPages,
        currentPage: page
      };
    }
  },
  
  methods: {
    // Convert Map data to Array format for backward compatibility
    toArrayFormat() {
      const result = {
        userId: this.userId,
        souls: this.souls ? Array.from(this.souls.values()) : [],
        artifacts: this.artifacts ? Array.from(this.artifacts.values()) : [],
        materials: this.materials ? Array.from(this.materials.values()) : [],
        alchemy: this.alchemy ? Array.from(this.alchemy.values()) : [],
        karma: this.karma ? Array.from(this.karma.values()) : [],
        pills: this.pills,
        activePills: this.activePills,
        totalKarmicDebt: this.totalKarmicDebt,
        karmicRealms: this.karmicRealms,
        tribulationBoost: this.tribulationBoost,
        lastPurification: this.lastPurification,
        metadata: this.metadata
      };
      
      // Update metadata
      const allItems = [
        ...result.souls,
        ...result.artifacts, 
        ...result.materials,
        ...result.alchemy,
        ...result.karma
      ];
      
      result.metadata = {
        ...result.metadata,
        totalItems: allItems.length,
        totalValue: allItems.reduce((sum, item) => sum + ((item.value || 0) * (item.quantity || 1)), 0),
        lastUpdated: new Date()
      };
      
      return result;
    },
    
    // Update metadata after operations
    updateMetadata() {
      let totalItems = 0;
      let totalValue = 0;
      
      const categories = ['souls', 'artifacts', 'materials', 'alchemy', 'karma'];
      for (const category of categories) {
        if (this[category]) {
          for (const [itemId, item] of this[category]) {
            totalItems += item.quantity || 1;
            totalValue += (item.value || 0) * (item.quantity || 1);
          }
        }
      }
      
      this.metadata = {
        ...this.metadata,
        totalItems,
        totalValue,
        lastUpdated: new Date(),
        version: 2
      };
    }
  }
});

// Note: userId index not needed - unique constraint creates implicit index
// Other indexes for performance optimization
inventorySchemaOptimized.index({ 'metadata.lastUpdated': 1 });
inventorySchemaOptimized.index({ 'metadata.totalValue': 1 });

const InventoryOptimized = mongoose.model('InventoryOptimized', inventorySchemaOptimized);
module.exports = InventoryOptimized;
