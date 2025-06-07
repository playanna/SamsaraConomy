const mongoose = require('mongoose');

const userStatsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // unique already creates index
    // Core combat stats - these are persistent and calculated based on progression
  // These now store the FINAL values including all bonuses for consistency
  attack: { type: Number, default: 20 },
  defense: { type: Number, default: 10 },
  speed: { type: Number, default: 15 },
  
  // Base stats before equipment bonuses (for reference)
  baseAttack: { type: Number, default: 20 },
  baseDefense: { type: Number, default: 10 },
  baseSpeed: { type: Number, default: 15 },
  
  // Derived stats for quick access
  level: { type: Number, default: 1 },
  stage: { type: String, default: 'Karma-Bhāra' },
  cultivationLevel: { type: Number, default: 1 },
  
  // Multipliers that affect stats (cached for performance)
  baseStatMultiplier: { type: Number, default: 1 },
  realmMultiplier: { type: Number, default: 1 },
  combatMultiplier: { type: Number, default: 1 },
  
  // Bonuses from equipment (cached to avoid recalculating)
  gearBonuses: {
    healthBonus: { type: Number, default: 0 },
    attackBonus: { type: Number, default: 0 },
    defenseBonus: { type: Number, default: 0 },
    speedBonus: { type: Number, default: 0 }
  },
  
  rodBonuses: {
    healthBonus: { type: Number, default: 0 },
    attackBonus: { type: Number, default: 0 },
    defenseBonus: { type: Number, default: 0 },
    speedBonus: { type: Number, default: 0 }
  },
  
  // Version tracking for cache invalidation
  statVersion: { type: Number, default: 1 },
  lastCalculated: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now }
});

// Instance method to check if stats need recalculation
userStatsSchema.methods.needsRecalculation = function(userData) {
  const cacheTime = 5 * 60 * 1000; // 5 minutes
  const isStale = (Date.now() - this.lastCalculated.getTime()) > cacheTime;
  
  // Check if level or stage changed
  const levelChanged = this.level !== userData.xpData?.level;
  const stageChanged = this.stage !== userData.inventory?.karmicRealms;
  
  return isStale || levelChanged || stageChanged;
};

// Instance method to update stats
userStatsSchema.methods.updateStats = function(newStats) {
  // Store base stats (without equipment bonuses)
  this.baseAttack = newStats.baseAttack;
  this.baseDefense = newStats.baseDefense;
  this.baseSpeed = newStats.baseSpeed;
  
  // Store final stats (with all bonuses applied)
  this.attack = newStats.finalAttack;
  this.defense = newStats.finalDefense;
  this.speed = newStats.finalSpeed;
  
  this.level = newStats.level;
  this.stage = newStats.stage;
  this.cultivationLevel = newStats.cultivationLevel;
  this.baseStatMultiplier = newStats.baseStatMultiplier;
  this.realmMultiplier = newStats.realmMultiplier;
  this.combatMultiplier = newStats.combatMultiplier;
  this.gearBonuses = newStats.gearBonuses;
  this.rodBonuses = newStats.rodBonuses;
  this.statVersion++;
  this.lastCalculated = new Date();
  this.lastUpdated = new Date();
};

// Instance method to get final combat stats with equipment bonuses
// Note: The attack/defense/speed fields now already store final values
userStatsSchema.methods.getFinalStats = function() {
  return {
    attack: this.attack, // Already includes all bonuses
    defense: this.defense, // Already includes all bonuses  
    speed: this.speed // Already includes all bonuses
  };
};

// Instance method to get base stats without equipment bonuses
userStatsSchema.methods.getBaseStats = function() {
  return {
    attack: this.baseAttack,
    defense: this.baseDefense,
    speed: this.baseSpeed
  };
};

module.exports = mongoose.model('UserStats', userStatsSchema);
