const mongoose = require('mongoose');

const userHealthSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  currentHealth: { type: Number, default: 100 },
  maxHealth: { type: Number, default: 100 },
  lastCombatAt: { type: Date },
  healingSessions: {
    type: [{
      healedAt: { type: Date, default: Date.now },
      amountHealed: { type: Number, required: true },
      healingType: { type: String, enum: ['sect_healer', 'combat_ability', 'natural'], default: 'natural' },
      cost: { type: Number, default: 0 }
    }],
    default: []
  },
  lastUpdated: { type: Date, default: Date.now }
});

// Instance methods
userHealthSchema.methods.heal = function(amount, healingType = 'natural', cost = 0) {
  const oldHealth = this.currentHealth;
  this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
  const actualHealed = this.currentHealth - oldHealth;
  
  if (actualHealed > 0) {
    this.healingSessions.push({
      amountHealed: actualHealed,
      healingType,
      cost
    });
  }
  
  this.lastUpdated = new Date();
  return actualHealed;
};

userHealthSchema.methods.takeDamage = function(amount) {
  const oldHealth = this.currentHealth;
  this.currentHealth = Math.max(0, this.currentHealth - amount);
  this.lastUpdated = new Date();
  return oldHealth - this.currentHealth; // Return actual damage taken
};

userHealthSchema.methods.isFullHealth = function() {
  return this.currentHealth === this.maxHealth;
};

userHealthSchema.methods.getHealthPercentage = function() {
  return (this.currentHealth / this.maxHealth) * 100;
};

userHealthSchema.methods.updateMaxHealth = function(newMaxHealth) {
  // If max health increases, increase current health proportionally
  if (newMaxHealth > this.maxHealth) {
    const ratio = this.currentHealth / this.maxHealth;
    this.currentHealth = Math.floor(newMaxHealth * ratio);
  }
  // If max health decreases, ensure current health doesn't exceed it
  else if (newMaxHealth < this.maxHealth) {
    this.currentHealth = Math.min(this.currentHealth, newMaxHealth);
  }
  
  this.maxHealth = newMaxHealth;
  this.lastUpdated = new Date();
};

module.exports = mongoose.model('UserHealth', userHealthSchema);
