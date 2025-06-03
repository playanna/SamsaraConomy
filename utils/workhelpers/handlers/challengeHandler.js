const ExpeditionSettings = require('../../../models/Multipliers/expeditionSetting.js');
const Clanpoints = require('../../../models/Clan/clanpoints.js');
const Inventory = require('../../../models/Multipliers/inventory.js');

/**
 * Check and reset daily challenges if needed
 * @param {Object} settings - ExpeditionSettings document
 * @returns {boolean} - True if daily reset occurred
 */
function checkAndResetDaily(settings) {
  const now = new Date();
  const lastReset = new Date(settings.challenges.daily.lastDailyReset);
  
  // Check if it's a new day (midnight has passed)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastResetDay = new Date(lastReset.getFullYear(), lastReset.getMonth(), lastReset.getDate());
  
  if (today > lastResetDay) {
    // Check if goal was completed yesterday
    const completedYesterday = settings.challenges.daily.expeditionsToday >= settings.challenges.daily.expeditionGoal;
    
    if (completedYesterday && !settings.challenges.daily.dailyRewardClaimed) {
      // Player completed goal but didn't claim reward - maintain streak
      settings.challenges.daily.dailyStreak += 1;
    } else if (!completedYesterday) {
      // Player didn't complete goal - reset streak
      settings.challenges.daily.dailyStreak = 0;
    }
    
    // Update longest streak
    settings.challenges.daily.longestDailyStreak = Math.max(
      settings.challenges.daily.longestDailyStreak, 
      settings.challenges.daily.dailyStreak
    );
    
    // Reset daily values
    settings.challenges.daily.expeditionsToday = 0;
    settings.challenges.daily.lastDailyReset = now;
    settings.challenges.daily.dailyRewardClaimed = false;
    
    return true;
  }
  
  return false;
}

/**
 * Check and reset weekly challenges if needed
 * @param {Object} settings - ExpeditionSettings document
 * @returns {boolean} - True if weekly reset occurred
 */
function checkAndResetWeekly(settings) {
  const now = new Date();
  const lastReset = new Date(settings.challenges.weekly.lastWeeklyReset);
  
  // Calculate the start of this week (Monday)
  const startOfThisWeek = new Date(now);
  const day = startOfThisWeek.getDay();
  const diff = startOfThisWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  startOfThisWeek.setDate(diff);
  startOfThisWeek.setHours(0, 0, 0, 0);
  
  // Calculate the start of last reset week
  const startOfResetWeek = new Date(lastReset);
  const resetDay = startOfResetWeek.getDay();
  const resetDiff = startOfResetWeek.getDate() - resetDay + (resetDay === 0 ? -6 : 1);
  startOfResetWeek.setDate(resetDiff);
  startOfResetWeek.setHours(0, 0, 0, 0);
  
  if (startOfThisWeek > startOfResetWeek) {
    // Check if goal was completed last week
    const completedLastWeek = settings.challenges.weekly.expeditionsThisWeek >= settings.challenges.weekly.expeditionGoal;
    
    if (completedLastWeek && !settings.challenges.weekly.weeklyRewardClaimed) {
      // Player completed goal but didn't claim reward - maintain streak
      settings.challenges.weekly.weeklyStreak += 1;
    } else if (!completedLastWeek) {
      // Player didn't complete goal - reset streak
      settings.challenges.weekly.weeklyStreak = 0;
    }
    
    // Update longest streak
    settings.challenges.weekly.longestWeeklyStreak = Math.max(
      settings.challenges.weekly.longestWeeklyStreak, 
      settings.challenges.weekly.weeklyStreak
    );
    
    // Reset weekly values
    settings.challenges.weekly.expeditionsThisWeek = 0;
    settings.challenges.weekly.lastWeeklyReset = now;
    settings.challenges.weekly.weeklyRewardClaimed = false;
    
    return true;
  }
  
  return false;
}

/**
 * Update expedition counts for challenges and check for resets
 * @param {Object} settings - ExpeditionSettings document
 * @param {string} userId - User ID for auto-claiming rewards
 * @returns {Object} - Information about challenge updates
 */
async function updateChallengeProgress(settings, userId = null) {
  // Ensure challenges object exists (for existing users)
  if (!settings.challenges) {
    settings.challenges = {
      daily: {
        expeditionsToday: 0,
        expeditionGoal: 5,
        lastDailyReset: new Date(),
        dailyRewardClaimed: false,
        dailyStreak: 0,
        longestDailyStreak: 0
      },
      weekly: {
        expeditionsThisWeek: 0,
        expeditionGoal: 30,
        lastWeeklyReset: new Date(),
        weeklyRewardClaimed: false,
        weeklyStreak: 0,
        longestWeeklyStreak: 0
      },
      bonusRewards: {
        totalBonusXP: 0,
        totalBonusGold: 0,
        totalLootMultiplierBonus: 0,
        streakBonusActive: false,
        streakMultiplier: 1.0
      }
    };
  }
  
  const dailyReset = checkAndResetDaily(settings);
  const weeklyReset = checkAndResetWeekly(settings);
  
  // Increment expedition counts
  settings.challenges.daily.expeditionsToday += 1;
  settings.challenges.weekly.expeditionsThisWeek += 1;
  
  // Auto-claim rewards if goals are completed and userId is provided
  let autoClaimedDailyReward = null;
  let autoClaimedWeeklyReward = null;
  
  if (userId) {
    autoClaimedDailyReward = await autoClaimDailyReward(userId, settings);
    autoClaimedWeeklyReward = await autoClaimWeeklyReward(userId, settings);
  }
  
  // Calculate current progress
  const dailyProgress = {
    current: settings.challenges.daily.expeditionsToday,
    goal: settings.challenges.daily.expeditionGoal,
    completed: settings.challenges.daily.expeditionsToday >= settings.challenges.daily.expeditionGoal,
    rewardAvailable: settings.challenges.daily.expeditionsToday >= settings.challenges.daily.expeditionGoal && 
                    !settings.challenges.daily.dailyRewardClaimed
  };
  
  const weeklyProgress = {
    current: settings.challenges.weekly.expeditionsThisWeek,
    goal: settings.challenges.weekly.expeditionGoal,
    completed: settings.challenges.weekly.expeditionsThisWeek >= settings.challenges.weekly.expeditionGoal,
    rewardAvailable: settings.challenges.weekly.expeditionsThisWeek >= settings.challenges.weekly.expeditionGoal && 
                    !settings.challenges.weekly.weeklyRewardClaimed
  };
  
  // Calculate streak bonuses
  const streakBonus = calculateStreakBonus(settings);
  settings.challenges.bonusRewards.streakMultiplier = streakBonus.multiplier;
  settings.challenges.bonusRewards.streakBonusActive = streakBonus.active;
  
  return {
    dailyReset,
    weeklyReset,
    dailyProgress,
    weeklyProgress,
    streakBonus,
    autoClaimedRewards: {
      daily: autoClaimedDailyReward,
      weekly: autoClaimedWeeklyReward
    }
  };
}

/**
 * Calculate streak bonus multipliers
 * @param {Object} settings - ExpeditionSettings document
 * @returns {Object} - Streak bonus information
 */
function calculateStreakBonus(settings) {
  const dailyStreak = settings.challenges.daily.dailyStreak || 0;
  const weeklyStreak = settings.challenges.weekly.weeklyStreak || 0;
  
  // Daily streak bonuses (smaller but more frequent)
  let dailyBonus = 1.0;
  if (dailyStreak >= 3) dailyBonus += 0.05; // 5% bonus after 3 days
  if (dailyStreak >= 7) dailyBonus += 0.05; // Additional 5% after 1 week
  if (dailyStreak >= 14) dailyBonus += 0.1; // Additional 10% after 2 weeks
  if (dailyStreak >= 30) dailyBonus += 0.1; // Additional 10% after 1 month
  
  // Weekly streak bonuses (larger but less frequent)
  let weeklyBonus = 1.0;
  if (weeklyStreak >= 2) weeklyBonus += 0.1; // 10% bonus after 2 weeks
  if (weeklyStreak >= 4) weeklyBonus += 0.15; // Additional 15% after 1 month
  if (weeklyStreak >= 8) weeklyBonus += 0.2; // Additional 20% after 2 months
  if (weeklyStreak >= 12) weeklyBonus += 0.25; // Additional 25% after 3 months
  
  const totalMultiplier = dailyBonus * weeklyBonus;
  const active = totalMultiplier > 1.0;
  
  return {
    multiplier: totalMultiplier,
    active,
    dailyStreak,
    weeklyStreak,
    dailyBonus,
    weeklyBonus
  };
}

/**
 * Calculate daily reward based on streak and progress
 * @param {Object} settings - ExpeditionSettings document
 * @returns {Object} - Daily reward details
 */
function calculateDailyReward(settings) {
  const baseReward = {
    xp: 100,
    gold: 50,
    lootMultiplier: 0.05 // 5% temporary loot multiplier bonus
  };
  
  const streakMultiplier = Math.min(2.0, 1.0 + (settings.challenges.daily.dailyStreak * 0.1)); // Max 2x at 10 day streak
  
  return {
    xp: Math.floor(baseReward.xp * streakMultiplier),
    gold: Math.floor(baseReward.gold * streakMultiplier),
    lootMultiplier: baseReward.lootMultiplier * streakMultiplier,
    streakBonus: streakMultiplier > 1.0
  };
}

/**
 * Calculate weekly reward based on streak and progress
 * @param {Object} settings - ExpeditionSettings document
 * @returns {Object} - Weekly reward details
 */
function calculateWeeklyReward(settings) {
  const baseReward = {
    xp: 500,
    gold: 300,
    lootMultiplier: 0.15 // 15% temporary loot multiplier bonus
  };
  
  const streakMultiplier = Math.min(3.0, 1.0 + (settings.challenges.weekly.weeklyStreak * 0.2)); // Max 3x at 10 week streak
  
  return {
    xp: Math.floor(baseReward.xp * streakMultiplier),
    gold: Math.floor(baseReward.gold * streakMultiplier),
    lootMultiplier: baseReward.lootMultiplier * streakMultiplier,
    streakBonus: streakMultiplier > 1.0
  };
}

/**
 * Claim daily reward
 * @param {string} userId - User ID
 * @returns {Object} - Reward claim result
 */
async function claimDailyReward(userId) {
  const settings = await ExpeditionSettings.findOne({ userId });
  if (!settings || !settings.challenges) {
    throw new Error('Challenge data not found');
  }
  
  if (settings.challenges.daily.dailyRewardClaimed) {
    throw new Error('Daily reward already claimed');
  }
  
  if (settings.challenges.daily.expeditionsToday < settings.challenges.daily.expeditionGoal) {
    throw new Error('Daily goal not completed yet');
  }
  
  const reward = calculateDailyReward(settings);
    // Mark as claimed
  settings.challenges.daily.dailyRewardClaimed = true;
  
  // Update totals
  settings.challenges.bonusRewards.totalBonusXP += reward.xp;
  settings.challenges.bonusRewards.totalBonusGold += reward.gold;
  settings.challenges.bonusRewards.totalLootMultiplierBonus += reward.lootMultiplier;
  
  // Apply rewards to user accounts
  await Promise.all([
    Clanpoints.findOneAndUpdate(
      { userId },
      { $inc: { balance: reward.gold } },
      { upsert: true }
    ),
    Inventory.findOneAndUpdate(
      { userId },
      { $inc: { totalKarmicDebt: reward.xp } },
      { upsert: true }
    )
  ]);
  
  await settings.save();
  
  return {
    success: true,
    reward,
    streak: settings.challenges.daily.dailyStreak
  };
}

/**
 * Claim weekly reward
 * @param {string} userId - User ID
 * @returns {Object} - Reward claim result
 */
async function claimWeeklyReward(userId) {
  const settings = await ExpeditionSettings.findOne({ userId });
  if (!settings || !settings.challenges) {
    throw new Error('Challenge data not found');
  }
  
  if (settings.challenges.weekly.weeklyRewardClaimed) {
    throw new Error('Weekly reward already claimed');
  }
  
  if (settings.challenges.weekly.expeditionsThisWeek < settings.challenges.weekly.expeditionGoal) {
    throw new Error('Weekly goal not completed yet');
  }
  
  const reward = calculateWeeklyReward(settings);
    // Mark as claimed
  settings.challenges.weekly.weeklyRewardClaimed = true;
  
  // Update totals
  settings.challenges.bonusRewards.totalBonusXP += reward.xp;
  settings.challenges.bonusRewards.totalBonusGold += reward.gold;
  settings.challenges.bonusRewards.totalLootMultiplierBonus += reward.lootMultiplier;
  
  // Apply rewards to user accounts
  await Promise.all([
    Clanpoints.findOneAndUpdate(
      { userId },
      { $inc: { balance: reward.gold } },
      { upsert: true }
    ),
    Inventory.findOneAndUpdate(
      { userId },
      { $inc: { totalKarmicDebt: reward.xp } },
      { upsert: true }
    )
  ]);
  
  await settings.save();
  
  return {
    success: true,
    reward,
    streak: settings.challenges.weekly.weeklyStreak
  };
}

/**
 * Auto-claim daily reward if goal is completed and reward not claimed
 * @param {string} userId - User ID
 * @param {Object} settings - ExpeditionSettings document
 * @returns {Object|null} - Reward claim result or null if not applicable
 */
async function autoClaimDailyReward(userId, settings) {
  // Check if daily goal is completed and reward not claimed
  if (settings.challenges.daily.expeditionsToday >= settings.challenges.daily.expeditionGoal && 
      !settings.challenges.daily.dailyRewardClaimed) {
    
    const reward = calculateDailyReward(settings);
      // Mark as claimed
    settings.challenges.daily.dailyRewardClaimed = true;
    
    // Update totals
    settings.challenges.bonusRewards.totalBonusXP += reward.xp;
    settings.challenges.bonusRewards.totalBonusGold += reward.gold;
    settings.challenges.bonusRewards.totalLootMultiplierBonus += reward.lootMultiplier;
    
    // Apply rewards to user accounts
    await Promise.all([
      Clanpoints.findOneAndUpdate(
        { userId },
        { $inc: { balance: reward.gold } },
        { upsert: true }
      ),
      Inventory.findOneAndUpdate(
        { userId },
        { $inc: { totalKarmicDebt: reward.xp } },
        { upsert: true }
      )
    ]);
    
    return {
      success: true,
      reward,
      streak: settings.challenges.daily.dailyStreak,
      type: 'daily'
    };
  }
  
  return null;
}

/**
 * Auto-claim weekly reward if goal is completed and reward not claimed
 * @param {string} userId - User ID
 * @param {Object} settings - ExpeditionSettings document
 * @returns {Object|null} - Reward claim result or null if not applicable
 */
async function autoClaimWeeklyReward(userId, settings) {
  // Check if weekly goal is completed and reward not claimed
  if (settings.challenges.weekly.expeditionsThisWeek >= settings.challenges.weekly.expeditionGoal && 
      !settings.challenges.weekly.weeklyRewardClaimed) {
    
    const reward = calculateWeeklyReward(settings);
      // Mark as claimed
    settings.challenges.weekly.weeklyRewardClaimed = true;
    
    // Update totals
    settings.challenges.bonusRewards.totalBonusXP += reward.xp;
    settings.challenges.bonusRewards.totalBonusGold += reward.gold;
    settings.challenges.bonusRewards.totalLootMultiplierBonus += reward.lootMultiplier;
    
    // Apply rewards to user accounts
    await Promise.all([
      Clanpoints.findOneAndUpdate(
        { userId },
        { $inc: { balance: reward.gold } },
        { upsert: true }
      ),
      Inventory.findOneAndUpdate(
        { userId },
        { $inc: { totalKarmicDebt: reward.xp } },
        { upsert: true }
      )
    ]);
    
    return {
      success: true,
      reward,
      streak: settings.challenges.weekly.weeklyStreak,
      type: 'weekly'
    };
  }
  
  return null;
}

module.exports = {
  updateChallengeProgress,
  calculateStreakBonus,
  calculateDailyReward,
  calculateWeeklyReward,
  claimDailyReward,
  claimWeeklyReward,
  checkAndResetDaily,
  checkAndResetWeekly,
  autoClaimDailyReward,
  autoClaimWeeklyReward
};
