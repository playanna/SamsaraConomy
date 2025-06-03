const Clan = require("../../../models/Clan/clan");
const { computeLevel } = require("../../../utils/levelUtils.js");
const { updateChallengeProgress, calculateStreakBonus } = require("./challengeHandler.js");
const { forceStatRecalculation } = require("./combatCalculator.js");

async function calculateXpMultiplier(userId, multipliers) {
  const xpLevel = multipliers.xpupgradeLevel || 0;
  const mastLevel = multipliers.mastUpgradeLevel || 0;
  const mastMultiplier = 1 + (mastLevel * 0.2); // Each level adds a 20% increase
  const baseMultiplier = multipliers.xpMultiplier || 1;
  const personal = (baseMultiplier * Math.pow(2, xpLevel)) * mastMultiplier;

  const clan = await Clan.findOne({ "members.userId": userId }).lean();
    if (!clan) return personal; // No clan found, return personal multiplier
  const clanBoost = clan?.upgrades?.xpBoost || 0;

  return personal * (1 + clanBoost);
}

async function applyXpAndStats({ xpData, settings, multipliers, lootMultiplier, sectrod, inventory, xp, multiplier, userId }) {
  // Store old level for comparison
  const oldLevel = xpData.level;
  
  // Update challenge progress and get streak bonuses
  const challengeInfo = await updateChallengeProgress(settings, userId);
  
  // Apply streak bonus to XP if active
  const finalXp = challengeInfo.streakBonus.active ? Math.floor(xp * challengeInfo.streakBonus.multiplier) : xp;
  
  // console.log(`[XP] Applying ${finalXp} XP (base: ${xp}, streak bonus: ${challengeInfo.streakBonus.multiplier}x). Total before: ${xpData.xp}`);
  xpData.xp += finalXp;
  const newLevel = computeLevel(xpData.xp);
  xpData.level = newLevel;
  xpData.totalxpmultiplier = multiplier;
  
  // Check if level changed and trigger stat recalculation
  if (newLevel > oldLevel) {
    console.log(`[COMBAT] Level up detected! ${oldLevel} -> ${newLevel}. Triggering stat recalculation.`);
    try {
      // Force recalculation of combat stats when level changes
      await forceStatRecalculation(userId, { 
        xpData, 
        multipliers, 
        inventory, 
        userId,
        healthData: null // Will be handled in the calculator
      });
    } catch (error) {
      console.error('Error recalculating stats after level up:', error);
    }
  }
  
  // Apply streak bonus to loot multiplier if active
  const finalLootMultiplier = challengeInfo.streakBonus.active ? 
    lootMultiplier * challengeInfo.streakBonus.multiplier : lootMultiplier;
  
  sectrod.stats.catchRate = finalLootMultiplier;
  inventory.totalKarmicDebt += finalXp; // Using final XP for karmic debt
  console.log(`sectrod.stats.catchRate: ${sectrod.stats.catchRate}, lootMultiplier: ${finalLootMultiplier}`);

  settings.expeditions++;
  settings.winStreak++;
  settings.longestWinStreak = Math.max(settings.winStreak, settings.longestWinStreak);
  
  return {
    challengeInfo,
    appliedXp: finalXp,
    appliedLootMultiplier: finalLootMultiplier,
    levelChanged: newLevel > oldLevel,
    oldLevel,
    newLevel
  };
}

async function persistAll(models) {
    // If models is a large array, consider batching them in groups
    const batchSize = 100; // Adjust batch size as needed
    const modelBatches = [];
    
    for (let i = 0; i < models.length; i += batchSize) {
      modelBatches.push(models.slice(i, i + batchSize));
    }
  
    for (const batch of modelBatches) {
      await Promise.allSettled(batch.map(doc => doc.save()));
    }
  }
  


module.exports = {
  calculateXpMultiplier,
  applyXpAndStats,
  persistAll,
};