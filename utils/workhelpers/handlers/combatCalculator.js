// Combat calculations and stat management

const { cultivationStages, getStageIndexByRealm } = require('../../../utils/cultivationStages');
const EquippedGear = require('../../../models/Gears/EquippedGear');
const SectRod = require('../../../models/Equipment/sectrod');
const UserStats = require('../../../models/Combat/userStats');

async function calculateUserStats(userData) {
  // Check if we have existing persistent stats
  let userStats = await UserStats.findOne({ userId: userData.userId });
    // If stats exist and don't need recalculation, return cached values
  if (userStats && !userStats.needsRecalculation(userData)) {
    const currentHealth = userData.healthData?.currentHealth || userData.healthData?.maxHealth || 100;
    const maxHealth = userData.healthData?.maxHealth || 100;
      const cachedStats = {
      health: currentHealth,
      maxHealth: maxHealth,
      // Use the stored final stats (which include all bonuses)
      attack: userStats.attack,
      defense: userStats.defense,
      speed: userStats.speed,
      // Also provide base stats
      baseAttack: userStats.baseAttack || userStats.attack, // Fallback for older records
      baseDefense: userStats.baseDefense || userStats.defense,
      baseSpeed: userStats.baseSpeed || userStats.speed,      level: userStats.level,
      stage: userStats.stage,
      cultivationLevel: userStats.cultivationLevel,
      realmMultiplier: userStats.realmMultiplier,
      gearBonuses: userStats.gearBonuses,
      rodBonuses: userStats.rodBonuses
    };
    
    return cachedStats;
  }
  
  // Calculate new stats
  const newStats = await calculateBaseStats(userData);
  
  // Create or update persistent stats
  if (!userStats) {
    userStats = new UserStats({ userId: userData.userId });
  }
  
  userStats.updateStats(newStats);
  await userStats.save();    // Return complete stats including health
  const currentHealth = userData.healthData?.currentHealth || newStats.maxHealth;
  const finalStats = {
    health: currentHealth,
    maxHealth: newStats.maxHealth,
    // Use final stats (with all bonuses) for consistency across the codebase
    attack: newStats.finalAttack,
    defense: newStats.finalDefense,
    speed: newStats.finalSpeed,
    // Also provide base stats for reference
    baseAttack: newStats.baseAttack,
    baseDefense: newStats.baseDefense,
    baseSpeed: newStats.baseSpeed,
    level: newStats.level,
    stage: newStats.stage,
    cultivationLevel: newStats.cultivationLevel,    realmMultiplier: newStats.realmMultiplier,
    gearBonuses: newStats.gearBonuses,
    rodBonuses: newStats.rodBonuses
  };
  
  return finalStats;
}

// Separate function to calculate base stats with improved formulas
async function calculateBaseStats(userData) {
  const baseHealth = 100;
  const baseAttack = 20;
  const baseDefense = 10;
  const baseSpeed = 15;
  
  // Calculate stats based on user progression
  const stage = userData.inventory?.karmicRealms || 'Karma-Bhāra';
  const xp = userData.xpData?.xp || 0;
  const multipliers = userData.multipliers || {};
  
  // Improved level calculation with smoother progression
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  
  // Enhanced base stat multiplier with diminishing returns
  const baseStatMultiplier = 1 + (level * 0.08) + (Math.log(level + 1) * 0.05);
  
  // Calculate cultivation realm bonuses
  const stageIndex = getStageIndexByRealm(stage);
  const cultivationStage = cultivationStages[stageIndex] || cultivationStages[0];
  
  // Each cultivation stage provides significant health bonuses
  // Early stages (1-5): +25% per stage
  // Mid stages (6-10): +20% per stage  
  // Late stages (11-16): +15% per stage
  let realmHealthMultiplier = 1;
  
  if (cultivationStage.level <= 5) {
    realmHealthMultiplier = 1 + (cultivationStage.level * 0.25);
  } else if (cultivationStage.level <= 10) {
    realmHealthMultiplier = 1 + (5 * 0.25) + ((cultivationStage.level - 5) * 0.20);
  } else {
    realmHealthMultiplier = 1 + (5 * 0.25) + (5 * 0.20) + ((cultivationStage.level - 10) * 0.15);
  }

  // Fetch equipped gear bonuses
  const gearBonuses = await getEquippedGearBonuses(userData.userId);
  
  // Fetch sect rod component bonuses
  const rodBonuses = await getSectRodBonuses(userData.userId);
  
  // Combine all multipliers for health calculation
  const totalHealthMultiplier = baseStatMultiplier * realmHealthMultiplier * 
    (1 + gearBonuses.healthBonus + rodBonuses.healthBonus);
  
  // Calculate max health with realm progression bonuses
  const maxHealth = Math.floor(baseHealth * totalHealthMultiplier);
  
  // Update max health in database if it changed
  if (userData.healthData && userData.healthData.maxHealth !== maxHealth) {
    userData.healthData.updateMaxHealth(maxHealth);
  }

  // Enhanced combat stat calculation with improved formulas
  const combatMultiplier = Math.sqrt(realmHealthMultiplier) * (1 + (level * 0.02));
  
  // Improved attack formula with better scaling and variety
  const attackVarianceMultiplier = 1  //+ (Math.random() * 0.1 - 0.05); // ±5% variance for uniqueness
  const finalAttack = Math.floor(
    baseAttack * baseStatMultiplier * combatMultiplier * attackVarianceMultiplier *
    (1 + gearBonuses.attackBonus + rodBonuses.attackBonus) *
    (1 + (cultivationStage.level * 0.03)) // Additional attack bonus per cultivation level
  );
  
  // Enhanced defense formula with cultivation wisdom bonus
  const defenseWisdomBonus = 1 + (cultivationStage.level * 0.025); // Wisdom makes you harder to hit
  const finalDefense = Math.floor(
    baseDefense * baseStatMultiplier * combatMultiplier * defenseWisdomBonus *
    (1 + gearBonuses.defenseBonus + rodBonuses.defenseBonus)
  );
  
  // Enhanced speed formula with cultivation agility bonus
  const speedAgilityBonus = 1 + (cultivationStage.level * 0.035); // Higher cultivation = better reflexes
  const finalSpeed = Math.floor(
    baseSpeed * baseStatMultiplier * combatMultiplier * speedAgilityBonus *
    (1 + gearBonuses.speedBonus + rodBonuses.speedBonus)
  );
    return {
    maxHealth: maxHealth,
    // Base stats (without equipment bonuses)
    baseAttack: Math.floor(
      baseAttack * baseStatMultiplier * combatMultiplier * attackVarianceMultiplier *
      (1 + (cultivationStage.level * 0.03))
    ),
    baseDefense: Math.floor(
      baseDefense * baseStatMultiplier * combatMultiplier * defenseWisdomBonus
    ),
    baseSpeed: Math.floor(
      baseSpeed * baseStatMultiplier * combatMultiplier * speedAgilityBonus
    ),
    // Final stats (with all bonuses applied)
    finalAttack: finalAttack,
    finalDefense: finalDefense,
    finalSpeed: finalSpeed,
    // Legacy fields for compatibility
    attack: finalAttack,
    defense: finalDefense,
    speed: finalSpeed,
    level: level,
    stage: stage,
    cultivationLevel: cultivationStage.level,
    baseStatMultiplier: baseStatMultiplier,
    realmMultiplier: realmHealthMultiplier,
    combatMultiplier: combatMultiplier,
    gearBonuses: gearBonuses,
    rodBonuses: rodBonuses
  };
}

// Helper function to calculate equipped gear bonuses for combat
async function getEquippedGearBonuses(userId) {
  const bonuses = {
    healthBonus: 0,
    attackBonus: 0,
    defenseBonus: 0,
    speedBonus: 0
  };

  try {
    const equippedGear = await EquippedGear.findOne({ userId });
    if (!equippedGear || !equippedGear.gear?.length) {
      return bonuses;
    }

    for (const gearSlot of equippedGear.gear) {
      const item = gearSlot.item;
      if (!item?.bonuses) continue;

      // Map gear bonuses to combat stats
      // XP multiplier affects health regeneration in combat
      if (item.bonuses.xpMultiplier) {
        bonuses.healthBonus += (item.bonuses.xpMultiplier - 1) * 0.1; // 10% of XP bonus to health
      }
      
      // Cooldown reduction affects speed
      if (item.bonuses.cooldownReduction) {
        const reductionPercent = 1 - item.bonuses.cooldownReduction;
        bonuses.speedBonus += reductionPercent * 0.15; // Convert cooldown reduction to speed bonus
      }
      
      // Loss protection affects defense
      if (item.bonuses.lossProtection) {
        const protectionPercent = 1 - item.bonuses.lossProtection;
        bonuses.defenseBonus += protectionPercent * 0.2; // Convert protection to defense bonus
      }
      
      // Loot multiplier affects attack (better at finding weak spots)
      if (item.bonuses.lootMultiplier) {
        bonuses.attackBonus += (item.bonuses.lootMultiplier - 1) * 0.15; // 15% of loot bonus to attack
      }
      
      // Jackpot boost affects critical hit chance (speed boost for reactions)
      if (item.bonuses.jackpotBoost) {
        bonuses.speedBonus += item.bonuses.jackpotBoost * 0.002; // 0.2% speed per jackpot point
      }

      // Weapon slot provides direct attack bonus
      if (gearSlot.slot === 'weapon') {
        bonuses.attackBonus += 0.15; // Base weapon bonus
      }
      
      // Armor/robe slots provide defense bonus
      if (['armor', 'robe'].includes(gearSlot.slot)) {
        bonuses.defenseBonus += 0.1; // Base armor bonus
      }
      
      // Boot slots provide speed bonus
      if (gearSlot.slot === 'boots') {
        bonuses.speedBonus += 0.1; // Base boots bonus
      }
      
      // Accessory slots provide balanced bonuses
      if (['ring', 'amulet', 'gloves', 'helmet'].includes(gearSlot.slot)) {
        bonuses.attackBonus += 0.05;
        bonuses.defenseBonus += 0.05;
        bonuses.speedBonus += 0.05;
      }
    }
  } catch (error) {
    console.error('Error calculating gear bonuses:', error);
  }

  return bonuses;
}

// Helper function to calculate sect rod component bonuses for combat  
async function getSectRodBonuses(userId) {
  const bonuses = {
    healthBonus: 0,
    attackBonus: 0,
    defenseBonus: 0,
    speedBonus: 0
  };

  try {
    const sectRod = await SectRod.findOne({ userId });
    if (!sectRod) {
      return bonuses;
    }

    // Mast upgrades affect cultivation speed -> health regeneration
    const mastBonuses = {
      'Bamboo': { healthBonus: 0 },
      'Ironwood': { healthBonus: 0.05 }, // +5% health
      'Obsidian': { healthBonus: 0.12 }, // +12% health
      'Dragonbone': { healthBonus: 0.20 }, // +20% health
      'Livingwood': { healthBonus: 0.30 } // +30% health
    };

    // Line upgrades affect fishing strength -> attack power
    const lineBonuses = {
      'Hemp': { attackBonus: 0 },
      'Silksteel': { attackBonus: 0.08 }, // +8% attack
      'Voidstrand': { attackBonus: 0.18 }, // +18% attack
      'Dragonhair': { attackBonus: 0.28 }, // +28% attack
      'CelestialThread': { attackBonus: 0.40 } // +40% attack
    };

    // Reel upgrades affect efficiency -> speed
    const reelBonuses = {
      'Basic': { speedBonus: 0 },
      'Precision': { speedBonus: 0.10 }, // +10% speed
      'Vortex': { speedBonus: 0.20 }, // +20% speed
      'Temporal': { speedBonus: 0.35 }, // +35% speed
      'Singularity': { speedBonus: 0.50 } // +50% speed
    };

    // Grip upgrades affect control -> defense
    const gripBonuses = {
      'Leather': { defenseBonus: 0 },
      'Crystal': { defenseBonus: 0.08 }, // +8% defense
      'Bone': { defenseBonus: 0.18 }, // +18% defense
      'Eldritch': { defenseBonus: 0.32 }, // +32% defense
      'Divine': { defenseBonus: 0.45 } // +45% defense
    };

    // Apply component bonuses
    if (mastBonuses[sectRod.components.mast]) {
      Object.assign(bonuses, mastBonuses[sectRod.components.mast]);
    }
    if (lineBonuses[sectRod.components.line]) {
      bonuses.attackBonus += lineBonuses[sectRod.components.line].attackBonus || 0;
    }
    if (reelBonuses[sectRod.components.reel]) {
      bonuses.speedBonus += reelBonuses[sectRod.components.reel].speedBonus || 0;
    }
    if (gripBonuses[sectRod.components.grip]) {
      bonuses.defenseBonus += gripBonuses[sectRod.components.grip].defenseBonus || 0;
    }

    // Rod stats also provide minor combat bonuses
    if (sectRod.stats) {
      bonuses.attackBonus += (sectRod.stats.precision || 0) * 0.001; // Precision -> attack accuracy
      bonuses.speedBonus += (sectRod.stats.luck || 0) * 0.001; // Luck -> reaction speed
      bonuses.defenseBonus += (sectRod.stats.resonance || 0) * 0.001; // Resonance -> spiritual defense
    }

  } catch (error) {
    console.error('Error calculating rod bonuses:', error);
  }

  return bonuses;
}

function calculateDamage(attack, defense) {
  // Enhanced damage formula with better balance
  const baseDamage = Math.max(1, attack - Math.floor(defense * 0.4)); // Defense reduces damage by 40% instead of 50%
  
  // Add variance for more interesting combat (±20% variance)
  const variance = Math.floor(baseDamage * 0.2);
  const damageWithVariance = baseDamage + Math.floor(Math.random() * variance * 2) - variance;
  
  // Add critical hit chance (5% chance for 1.5x damage)
  const isCritical = Math.random() < 0.05;
  const finalDamage = isCritical ? Math.floor(damageWithVariance * 1.5) : damageWithVariance;
  
  // Ensure minimum damage of 1
  return Math.max(1, finalDamage);
}

// New function to get damage with critical hit info
function calculateDamageWithInfo(attack, defense) {
  const baseDamage = Math.max(1, attack - Math.floor(defense * 0.4));
  const variance = Math.floor(baseDamage * 0.2);
  const damageWithVariance = baseDamage + Math.floor(Math.random() * variance * 2) - variance;
  
  const isCritical = Math.random() < 0.05;
  const finalDamage = isCritical ? Math.floor(damageWithVariance * 1.5) : damageWithVariance;
  
  return {
    damage: Math.max(1, finalDamage),
    isCritical: isCritical,
    baseDamage: baseDamage
  };
}

function createHealthBar(percentage) {
  const fullBlocks = Math.floor(percentage / 10);
  const emptyBlocks = 10 - fullBlocks;
  
  let bar = '';
  for (let i = 0; i < fullBlocks; i++) {
    bar += '█';
  }
  for (let i = 0; i < emptyBlocks; i++) {
    bar += '░';
  }
  
  return `\`${bar}\``;
}

function getElementColor(element) {
  const colors = {
    'wind': 0x87CEEB,
    'earth': 0x8B4513,
    'fire': 0xFF4500,
    'water': 0x1E90FF,
    'lunar': 0x9932CC,
    'void': 0x2F4F4F,
    'divine-dark': 0x8B008B,
    'water-death': 0x483D8B,
    'earth-fire': 0xCD853F
  };
  return colors[element] || 0x808080;
}

// Function to force stat recalculation (call when user levels up or changes cultivation)
async function forceStatRecalculation(userId, userData) {
  let userStats = await UserStats.findOne({ userId });
  
  if (!userStats) {
    userStats = new UserStats({ userId });
  }
  
  // Force recalculation by incrementing version
  userStats.statVersion++;
  userStats.lastCalculated = new Date(0); // Set to epoch to force recalculation
  
  const newStats = await calculateBaseStats(userData);
  userStats.updateStats(newStats);
  await userStats.save();
  
  return userStats;
}

// Function to check if a user's stats are up to date
async function areStatsUpToDate(userId, userData) {
  const userStats = await UserStats.findOne({ userId });
  if (!userStats) return false;
  
  return !userStats.needsRecalculation(userData);
}

// Function to invalidate a user's cached stats (call when cultivation changes)
async function invalidateUserStatsCache(userId) {
  try {
    const userStats = await UserStats.findOne({ userId });
    if (userStats) {
      userStats.statVersion++;
      userStats.lastCalculated = new Date(0); // Force recalculation
      await userStats.save();
    }
    return true;
  } catch (error) {
    console.error('Error invalidating user stats cache:', error);
    return false;
  }
}

module.exports = {
  calculateUserStats,
  calculateBaseStats,
  calculateDamage,
  calculateDamageWithInfo,
  createHealthBar,
  getElementColor,
  getEquippedGearBonuses,
  getSectRodBonuses,
  forceStatRecalculation,
  areStatsUpToDate,
  invalidateUserStatsCache
};
