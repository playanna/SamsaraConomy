// Combat state management for fight system
const creatures = require('../../../data/creatures.js');

// Store active combat sessions
const activeCombats = new Map();

// Combat state class
class CombatSession {
  constructor(userId, creature, userStats, userHealthDoc, userDisplayName = 'HERO') {
    this.userId = userId;
    this.creature = { ...creature };
    this.creatureCurrentHealth = creature.health;
    this.userStats = userStats;
    this.userCurrentHealth = userStats.health;
    this.userHealthDoc = userHealthDoc; // Reference to database document
    this.userDisplayName = userDisplayName; // Store user's display name
    this.turn = 'user'; // 'user' or 'creature'
    this.round = 1;
    this.statusEffects = {
      player: {},
      creature: {}
    };
    this.turnModifiers = {
      player: {},
      creature: {}
    };
    this.combatLog = [];
    this.startTime = Date.now(); // Track when the combat started
    this.techniqueCooldowns = {}; // Track technique cooldowns by techniqueId
  }// Save current health to database
  async saveHealthState() {
    if (this.userHealthDoc) {
      // Always update health to current state, whether damaged or healed
      this.userHealthDoc.currentHealth = this.userCurrentHealth;
      this.userHealthDoc.lastCombatAt = new Date();
      await this.userHealthDoc.save();
    }
  }
}

function getRandomCreature(realm) {
  const realmCreatures = creatures[realm];
  if (!realmCreatures || realmCreatures.length === 0) {
    // Fallback to verdant realm
    return creatures.verdant[Math.floor(Math.random() * creatures.verdant.length)];
  }
  return realmCreatures[Math.floor(Math.random() * realmCreatures.length)];
}

function createCombatSession(userId, creature, userStats, userHealthDoc, userDisplayName = 'HERO') {
  const combat = new CombatSession(userId, creature, userStats, userHealthDoc, userDisplayName);
  activeCombats.set(userId, combat);
  return combat;
}

function getCombatSession(userId) {
  return activeCombats.get(userId);
}

function removeCombatSession(userId) {
  activeCombats.delete(userId);
}

function hasActiveCombat(userId) {
  return activeCombats.has(userId);
}

// Cleanup expired combat sessions
function cleanupExpiredCombats() {
  const now = Date.now();
  const COMBAT_TIMEOUT = 15 * 60 * 1000; // 15 minutes

  for (const [userId, combat] of activeCombats.entries()) {
    // Check if combat has been running too long
    const combatAge = now - (combat.startTime || now);
    if (combatAge > COMBAT_TIMEOUT) {
      console.log(`Cleaning up expired combat session for user ${userId}`);
      
      // Save health state before cleanup
      if (combat.saveHealthState) {
        combat.saveHealthState().catch(err => {
          console.error(`Error saving health state during cleanup for user ${userId}:`, err);
        });
      }
      
      activeCombats.delete(userId);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredCombats, 5 * 60 * 1000);

module.exports = {
  CombatSession,
  getRandomCreature,
  createCombatSession,
  getCombatSession,
  removeCombatSession,
  hasActiveCombat,
  cleanupExpiredCombats
};
