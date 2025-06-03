const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  // Core Identity
  itemId: { type: String, required: true }, // Prevents duplicates
  name: { type: String, required: true },
  baseName: { type: String, required: true }, // "Enlightened Soul Pearl" (without rarity prefix)
  
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

}, { timestamps: true });

const inventorySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  
  // Categorized storage (faster queries)
  souls: [itemSchema],
  artifacts: [itemSchema],
  materials: [itemSchema],
  alchemy: [itemSchema],
  karma: [itemSchema],
  
  // Metadata
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
  statics: {
    // Example method for debt calculation
    calculateTotalDebt(userId) {
      return this.aggregate([
        { $match: { userId } },
        { $project: { allItems: { $concatArrays: ["$souls", "$artifacts", "$karma"] } } },
        { $unwind: "$allItems" },
        { $group: { _id: null, total: { $sum: "$allItems.debt" } } }
      ]);
    }
  }
});

const Inventory = mongoose.model('Inventory', inventorySchema);
module.exports = Inventory;