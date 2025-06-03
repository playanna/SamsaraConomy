// Qi Technique Management System
const UserQiTechniques = require('../../../models/QiTechniques/userQiTechniques.js');
const { getTechniqueById } = require('../../../data/qiTechniques.js');

/**
 * Get user's equipped qi techniques
 */
async function getUserEquippedTechniques(userId) {
  try {
    const userTechniques = await UserQiTechniques.findOne({ userId });
    if (!userTechniques || !userTechniques.equippedTechniques.length) {
      return [];
    }
    
    // Filter out any techniques that might have invalid IDs
    return userTechniques.equippedTechniques
      .filter(slot => slot.techniqueId && getTechniqueById(slot.techniqueId))
      .sort((a, b) => a.slotNumber - b.slotNumber);
  } catch (error) {
    console.error('Error getting user equipped techniques:', error);
    return [];
  }
}

/**
 * Check if user has any qi techniques equipped
 */
async function hasEquippedTechniques(userId) {
  try {
    const techniques = await getUserEquippedTechniques(userId);
    return techniques.length > 0;
  } catch (error) {
    console.error('Error checking equipped techniques:', error);
    return false;
  }
}

/**
 * Get technique data by ID with user's mastery level
 */
function getTechniqueWithMastery(techniqueId, masteryLevel = 1) {
  const baseData = getTechniqueById(techniqueId);
  if (!baseData) return null;
  
  // Apply mastery bonuses
  const technique = { ...baseData };
  const masteryBonuses = baseData.masteryBonuses || {};
  
  // Apply bonuses for current mastery level and below
  for (let level = 1; level <= masteryLevel; level++) {
    const bonus = masteryBonuses[level];
    if (!bonus) continue;
    
    // Apply damage bonus
    if (bonus.damageBonus) {
      technique.damage = {
        min: Math.floor(technique.damage.min * (1 + bonus.damageBonus)),
        max: Math.floor(technique.damage.max * (1 + bonus.damageBonus))
      };
    }
    
    // Apply qi cost reduction
    if (bonus.qiCostReduction) {
      technique.qiCost = Math.floor(technique.qiCost * (1 - bonus.qiCostReduction));
    }
    
    // Apply cooldown reduction
    if (bonus.cooldownReduction) {
      technique.cooldown = Math.max(0, technique.cooldown - bonus.cooldownReduction);
    }
    
    // Apply accuracy bonus
    if (bonus.accuracy) {
      technique.accuracy = bonus.accuracy;
    }
    
    // Add additional effects
    if (bonus.effects) {
      technique.effects = [...(technique.effects || []), ...bonus.effects];
    }
  }
  
  return technique;
}

/**
 * Check if user can use a technique (qi cost, cooldown, etc.)
 */
function canUseTechnique(combat, technique, userTechniqueData) {
  const qiCost = Math.floor(combat.userStats.maxHealth * (technique.qiCost / 100));
  
  // Check qi cost
  if (combat.userCurrentHealth <= qiCost) {
    return { canUse: false, reason: 'insufficient_qi' };
  }
  
  // Check cooldown tracking in combat session
  if (combat.techniqueCooldowns && combat.techniqueCooldowns[technique.id]) {
    const cooldownRemaining = combat.techniqueCooldowns[technique.id];
    if (cooldownRemaining > 0) {
      return { canUse: false, reason: 'on_cooldown', cooldownRemaining };
    }
  }
  
  return { canUse: true };
}

/**
 * Apply technique cooldown in combat
 */
function applyCooldown(combat, techniqueId, cooldownTurns) {
  if (!combat.techniqueCooldowns) {
    combat.techniqueCooldowns = {};
  }
  
  if (cooldownTurns > 0) {
    combat.techniqueCooldowns[techniqueId] = cooldownTurns;
  }
}

/**
 * Reduce all technique cooldowns by 1 turn
 */
function reduceCooldowns(combat) {
  if (!combat.techniqueCooldowns) {
    combat.techniqueCooldowns = {};
    return;
  }
  
  for (const techniqueId in combat.techniqueCooldowns) {
    combat.techniqueCooldowns[techniqueId] = Math.max(0, combat.techniqueCooldowns[techniqueId] - 1);
    
    // Remove expired cooldowns
    if (combat.techniqueCooldowns[techniqueId] <= 0) {
      delete combat.techniqueCooldowns[techniqueId];
    }
  }
}

/**
 * Award karmic debt for combat victory (replaces technique points)
 */
async function awardKarmicDebt(userId, points = 1) {
  try {
    const Inventory = require('../../../models/Multipliers/inventory.js');
    let inventory = await Inventory.findOne({ userId });
    if (!inventory) {
      inventory = new Inventory({ userId, totalKarmicDebt: points });
      await inventory.save();
    } else {
      inventory.totalKarmicDebt += points;
      await inventory.save();
    }
    return true;
  } catch (error) {
    console.error('Error awarding karmic debt:', error);
    return false;
  }
}

/**
 * Use a qi technique and update mastery
 */
async function useTechnique(userId, techniqueId) {
  try {
    const userTechniques = await UserQiTechniques.findOne({ userId });
    if (!userTechniques) return;
    
    // Update usage count for equipped technique
    const equippedTechnique = userTechniques.equippedTechniques.find(
      slot => slot.techniqueId === techniqueId
    );
    
    if (equippedTechnique) {
      equippedTechnique.uses += 1;
      equippedTechnique.lastUsed = new Date();
      
      // Check for mastery level up (every 10 uses)
      const newMasteryLevel = Math.min(10, Math.floor(equippedTechnique.uses / 10) + 1);
      if (newMasteryLevel > equippedTechnique.masteryLevel) {
        equippedTechnique.masteryLevel = newMasteryLevel;
      }
    }
    
    // Update learned technique data
    const learnedTechnique = userTechniques.learnedTechniques.find(
      tech => tech.techniqueId === techniqueId
    );
    
    if (learnedTechnique) {
      learnedTechnique.totalUses += 1;
      const newMasteryLevel = Math.min(10, Math.floor(learnedTechnique.totalUses / 10) + 1);
      if (newMasteryLevel > learnedTechnique.masteryLevel) {
        learnedTechnique.masteryLevel = newMasteryLevel;
      }
    }
    
    userTechniques.lastUpdated = new Date();
    await userTechniques.save();
    
  } catch (error) {
    console.error('Error updating technique usage:', error);
  }
}

/**
 * Initialize user qi techniques if they don't exist
 */
async function initializeUserTechniques(userId) {
  try {
    let userTechniques = await UserQiTechniques.findOne({ userId });
    
    if (!userTechniques) {
      // Create new user techniques with basic starter technique
      userTechniques = new UserQiTechniques({
        userId,
        equippedTechniques: [{
          slotNumber: 1,
          techniqueId: 'iron_fist',
          name: 'Iron Fist Technique',
          description: 'Channel qi into your fists to deliver devastating blows',
          masteryLevel: 1,
          uses: 0        }],
        learnedTechniques: [{
          techniqueId: 'iron_fist',
          masteryLevel: 1,
          totalUses: 0
        }]
      });
      
      await userTechniques.save();
    }
    
    return userTechniques;
  } catch (error) {
    console.error('Error initializing user techniques:', error);
    return null;
  }
}

module.exports = {
  getUserEquippedTechniques,
  hasEquippedTechniques,
  getTechniqueWithMastery,
  canUseTechnique,
  applyCooldown,
  reduceCooldowns,
  awardKarmicDebt,
  useTechnique,
  initializeUserTechniques,
  // Legacy aliases for backward compatibility
  getEquippedTechniques: getUserEquippedTechniques
};
