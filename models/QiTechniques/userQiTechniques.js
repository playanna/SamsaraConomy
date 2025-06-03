const mongoose = require('mongoose');

// Schema for individual qi technique slots
const qiTechniqueSlotSchema = new mongoose.Schema({
  slotNumber: { type: Number, required: true, min: 1, max: 3 }, // 3 slots max
  techniqueId: { type: String, required: true }, // ID from techniques data
  name: { type: String, required: true },
  description: { type: String, required: true },
  equippedAt: { type: Date, default: Date.now },
  masteryLevel: { type: Number, default: 1, min: 1, max: 10 }, // Mastery improves with use
  uses: { type: Number, default: 0 }, // Track usage for mastery progression
  lastUsed: { type: Date }
}, { _id: false });

// Main schema for user's qi techniques
const userQiTechniquesSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  
  // Currently equipped techniques (max 3)
  equippedTechniques: [qiTechniqueSlotSchema],
  
  // All learned techniques (unlocked but not necessarily equipped)
  learnedTechniques: [{
    techniqueId: { type: String, required: true },
    learnedAt: { type: Date, default: Date.now },
    masteryLevel: { type: Number, default: 1, min: 1, max: 10 },
    totalUses: { type: Number, default: 0 }
  }],
    // Note: Technique learning now uses karmic debt from inventory system
  
  // Cultivation level affects available techniques
  lastCultivationCheck: { type: String, default: 'mortal-1' },
  
  // Settings
  autoEquipNewTechniques: { type: Boolean, default: true },
  showTechniqueDescriptions: { type: Boolean, default: true },
  
  lastUpdated: { type: Date, default: Date.now }
});

// Add indexes for faster queries
userQiTechniquesSchema.index({ userId: 1 });
userQiTechniquesSchema.index({ 'equippedTechniques.techniqueId': 1 });

const UserQiTechniques = mongoose.model('UserQiTechniques', userQiTechniquesSchema);
module.exports = UserQiTechniques;
