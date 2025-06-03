// Combat reward distribution system
const Clanpoints = require('../../../models/Clan/clanpoints.js');
const Inventory = require('../../../models/Multipliers/inventory.js');
const ExpeditionSettings = require('../../../models/Multipliers/expeditionSetting.js');
const { handleLootStorage, mergeLootIntoInventory } = require('./inventoryHandler.js');
const { categorizeLoot } = require('./lootHandler.js');
const creatures = require('../../../data/creatures.js');

async function distributeVictoryRewards(userId, creature) {
  try {
    const rewards = creature.rewards;
    const creatureRealm = findCreatureRealm(creature.id);
      // Find or create user's clanpoints, inventory, and expedition settings
    const [clanpoints, inventory] = await Promise.all([
      Clanpoints.findOneAndUpdate(
        { userId },
        { $inc: { balance: rewards.coins } },
        { upsert: true, new: true }
      ),
      Inventory.findOneAndUpdate(
        { userId },
        { $inc: { totalKarmicDebt: rewards.xp } },
        { upsert: true, new: true }
      )
    ]);

    // Find or create expedition settings separately
    let expeditionSettings = await ExpeditionSettings.findOne({ userId });
    if (!expeditionSettings) {
      expeditionSettings = new ExpeditionSettings({ userId });
      await expeditionSettings.save();
    }

    // Handle item drops with RNG
    const itemsObtained = [];
    const lootItems = [];
    const obtainedItemsForLog = [];
    
    for (const item of rewards.items) {
      const chance = Math.random();
      if (chance <= item.chance) {
        itemsObtained.push({
          name: item.name,
          obtained: true
        });
        
        obtainedItemsForLog.push({
          itemName: item.name,
          quantity: 1,
          obtainedAt: new Date()
        });
        
        // Create loot item in the same format as loot system
        const lootItem = {
          itemId: item.name,
          name: item.name,
          baseName: item.name,
          value: getItemValue(item.name),
          debt: getItemDebt(item.name),
          quantity: 1,
          type: determineItemType(item.name),
          realm: creatureRealm,
          isBound: false,
          karmicHistory: [{
            event: 'combat_victory',
            timestamp: new Date(),
            creatureId: creature.id,
            creatureName: creature.name,
            realm: creatureRealm
          }]
        };
        
        lootItems.push(lootItem);
      } else {
        itemsObtained.push({
          name: item.name,
          obtained: false
        });
      }
    }

    // Use the same loot storage system for consistency
    if (lootItems.length > 0) {
      await handleLootStorage({
        settings: { autosell: false }, // Never autosell combat rewards
        handDoc: null, // Not needed since autosell is false
        inventory: inventory,
        loots: lootItems
      });
    }

    // Update monster slaying log
    await updateMonsterSlayingLog(expeditionSettings, creature, creatureRealm, rewards, obtainedItemsForLog);

    return {
      coins: rewards.coins,
      xp: rewards.xp,
      items: itemsObtained,
      newClanpointsBalance: clanpoints.balance,
      newKarmicDebt: inventory.totalKarmicDebt    };

  } catch (error) {
    console.error('Error distributing victory rewards:', error);
    throw error;
  }
}

function getItemValue(itemName) {
  const name = itemName.toLowerCase();
  
  // Base value on item type and name complexity
  if (name.includes('soul') || name.includes('spirit') || name.includes('essence')) {
    return 100; // Soul items are valuable
  } else if (name.includes('shard') || name.includes('fragment') || name.includes('tears')) {
    return 75; // Karma items
  } else if (name.includes('metal') || name.includes('ore') || name.includes('alloy')) {
    return 50; // Material items
  } else if (name.includes('pill') || name.includes('elixir') || name.includes('potion')) {
    return 25; // Alchemy items
  } else {
    return 35; // Artifact items (default)
  }
}

function getItemDebt(itemName) {
  const name = itemName.toLowerCase();
  
  // Base debt on item type and name complexity
  if (name.includes('soul') || name.includes('spirit') || name.includes('essence')) {
    return 50; // Soul items have high debt
  } else if (name.includes('shard') || name.includes('fragment') || name.includes('tears')) {
    return 35; // Karma items
  } else if (name.includes('metal') || name.includes('ore') || name.includes('alloy')) {
    return 25; // Material items
  } else if (name.includes('pill') || name.includes('elixir') || name.includes('potion')) {
    return 15; // Alchemy items
  } else {
    return 20; // Artifact items (default)
  }
}

function determineItemType(itemName) {
  const name = itemName.toLowerCase();
  
  if (name.includes('soul') || name.includes('spirit') || name.includes('essence')) {
    return 'soul';
  } else if (name.includes('shard') || name.includes('fragment') || name.includes('tears')) {
    return 'karma';
  } else if (name.includes('metal') || name.includes('ore') || name.includes('alloy')) {
    return 'material';
  } else if (name.includes('pill') || name.includes('elixir') || name.includes('potion')) {
    return 'alchemy';
  } else {
    return 'artifact';
  }
}

function determineItemRealm(element) {
  const realmMapping = {
    'wind': 'verdant',
    'earth': 'verdant',
    'fire': 'crimson',
    'water': 'moon',
    'lunar': 'moon',
    'void': 'abyssal',
    'divine-dark': 'chains',
    'water-death': 'abyssal',
    'earth-fire': 'crimson'
  };
  return realmMapping[element] || 'verdant';
}

function findCreatureRealm(creatureId) {
  // Search through all realms to find which one contains this creature
  for (const [realmName, creatureList] of Object.entries(creatures)) {
    const foundCreature = creatureList.find(creature => creature.id === creatureId);
    if (foundCreature) {
      return realmName;
    }
  }
  
  // Fallback to verdant if creature not found
  return 'verdant';
}

async function updateMonsterSlayingLog(expeditionSettings, creature, creatureRealm, rewards, obtainedItems) {
  try {
    // Initialize monster slaying log if it doesn't exist
    if (!expeditionSettings.monsterSlayingLog) {
      expeditionSettings.monsterSlayingLog = {
        totalMonstersSlain: 0,
        slainByRealm: {
          verdant: 0,
          moon: 0,
          crimson: 0,
          abyssal: 0,
          chains: 0,
          hells: 0,
          summit: 0
        },
        slainByMonster: [],
        achievements: [],
        statistics: {
          longestKillStreak: 0,
          currentKillStreak: 0,
          favoriteRealm: 'verdant',
          strongestMonsterSlain: {},
          weeklyKills: 0,
          weeklyResetDate: new Date()
        }
      };
    }

    const log = expeditionSettings.monsterSlayingLog;
    
    // Update total and realm counts
    log.totalMonstersSlain = (log.totalMonstersSlain || 0) + 1;
    if (log.slainByRealm[creatureRealm] !== undefined) {
      log.slainByRealm[creatureRealm] = (log.slainByRealm[creatureRealm] || 0) + 1;
    }

    // Update kill streak
    log.statistics.currentKillStreak = (log.statistics.currentKillStreak || 0) + 1;
    if (log.statistics.currentKillStreak > (log.statistics.longestKillStreak || 0)) {
      log.statistics.longestKillStreak = log.statistics.currentKillStreak;
    }

    // Update weekly kills (reset if needed)
    const now = new Date();
    const weeklyReset = new Date(log.statistics.weeklyResetDate || now);
    const weeksSinceReset = Math.floor((now - weeklyReset) / (7 * 24 * 60 * 60 * 1000));
    
    if (weeksSinceReset >= 1) {
      log.statistics.weeklyKills = 1;
      log.statistics.weeklyResetDate = now;
    } else {
      log.statistics.weeklyKills = (log.statistics.weeklyKills || 0) + 1;
    }

    // Update strongest monster slain
    if (!log.statistics.strongestMonsterSlain.level || creature.level > log.statistics.strongestMonsterSlain.level) {
      log.statistics.strongestMonsterSlain = {
        monsterId: creature.id,
        monsterName: creature.name,
        level: creature.level,
        slainAt: now
      };
    }

    // Update favorite realm based on kill counts
    let maxKills = 0;
    let favoriteRealm = 'verdant';
    for (const [realm, kills] of Object.entries(log.slainByRealm)) {
      if (kills > maxKills) {
        maxKills = kills;
        favoriteRealm = realm;
      }
    }
    log.statistics.favoriteRealm = favoriteRealm;

    // Update or create monster-specific entry
    let monsterEntry = log.slainByMonster.find(entry => entry.monsterId === creature.id);
    
    if (monsterEntry) {
      // Update existing entry
      monsterEntry.killCount = (monsterEntry.killCount || 0) + 1;
      monsterEntry.lastSlainAt = now;
      monsterEntry.totalXpGained = (monsterEntry.totalXpGained || 0) + rewards.xp;
      monsterEntry.totalCoinsGained = (monsterEntry.totalCoinsGained || 0) + rewards.coins;
      
      // Add obtained items
      for (const item of obtainedItems) {
        monsterEntry.itemsObtained.push(item);
      }
    } else {
      // Create new entry
      log.slainByMonster.push({
        monsterId: creature.id,
        monsterName: creature.name,
        realm: creatureRealm,
        level: creature.level,
        element: creature.element,
        killCount: 1,
        firstSlainAt: now,
        lastSlainAt: now,
        totalXpGained: rewards.xp,
        totalCoinsGained: rewards.coins,
        itemsObtained: obtainedItems
      });
    }

    // Check for achievements
    await checkAndUnlockAchievements(log, creature, creatureRealm);

    // Save the updated expedition settings
    await expeditionSettings.save();

  } catch (error) {
    console.error('Error updating monster slaying log:', error);
    // Don't throw here to avoid breaking combat rewards
  }
}

async function checkAndUnlockAchievements(log, creature, creatureRealm) {
  const achievements = [];
  
  // Kill count achievements
  const totalKills = log.totalMonstersSlain;
  const killMilestones = [
    { count: 10, name: 'First Blood', description: 'Slain 10 monsters' },
    { count: 50, name: 'Monster Hunter', description: 'Slain 50 monsters' },
    { count: 100, name: 'Beast Slayer', description: 'Slain 100 monsters' },
    { count: 500, name: 'Apex Predator', description: 'Slain 500 monsters' },
    { count: 1000, name: 'Legendary Hunter', description: 'Slain 1000 monsters' }
  ];

  for (const milestone of killMilestones) {
    if (totalKills === milestone.count) {
      const existingAchievement = log.achievements.find(a => a.name === milestone.name);
      if (!existingAchievement) {
        log.achievements.push({
          name: milestone.name,
          description: milestone.description,
          unlockedAt: new Date(),
          category: 'kill_count'
        });
      }
    }
  }

  // Realm mastery achievements
  const realmKills = log.slainByRealm[creatureRealm];
  if (realmKills === 25) {
    const achievementName = `${creatureRealm.charAt(0).toUpperCase() + creatureRealm.slice(1)} Realm Explorer`;
    const existingAchievement = log.achievements.find(a => a.name === achievementName);
    if (!existingAchievement) {
      log.achievements.push({
        name: achievementName,
        description: `Slain 25 monsters in the ${creatureRealm} realm`,
        unlockedAt: new Date(),
        category: 'realm_mastery'
      });
    }
  }

  // High-level monster achievements
  if (creature.level >= 10) {
    const achievementName = 'Giant Slayer';
    const existingAchievement = log.achievements.find(a => a.name === achievementName);
    if (!existingAchievement) {
      log.achievements.push({
        name: achievementName,
        description: 'Defeated a monster of level 10 or higher',
        unlockedAt: new Date(),
        category: 'legendary_slayer'
      });
    }
  }

  // Kill streak achievements
  const streak = log.statistics.currentKillStreak;
  if (streak === 20) {
    const achievementName = 'Unstoppable Force';
    const existingAchievement = log.achievements.find(a => a.name === achievementName);
    if (!existingAchievement) {
      log.achievements.push({
        name: achievementName,
        description: 'Achieved a 20-kill streak',
        unlockedAt: new Date(),
        category: 'kill_streak'
      });
    }
  }
}

module.exports = {
  distributeVictoryRewards,
  findCreatureRealm,
  updateMonsterSlayingLog,
  checkAndUnlockAchievements
};
