// /handlers/userHandler.js
const Xp = require('../../../models/XP/xp.js');
const Multipliers = require('../../../models/Multipliers/multipliers.js');
const ExpeditionSettings = require('../../../models/Multipliers/expeditionSetting.js');
const Inventory = require('../../../models/Multipliers/inventory.js');
const Hand = require('../../../models/balance/hand.js');
const Sectrod = require('../../../models/Equipment/sectrod.js');
const UserHealth = require('../../../models/Health/userHealth.js');
const UserStats = require('../../../models/Combat/userStats.js');
const { cultivationStages, getStageIndexByRealm } = require('../../../utils/cultivationStages.js');
const { cacheManager } = require('../../cache/cacheManager.js');

// Enhanced utility function with .lean() optimization for read operations
async function findOrCreate(Model, query, defaults = {}, returnIsNew = false) {
  const existingDoc = await Model.findOne(query);

  if (existingDoc) {
    return returnIsNew ? { doc: existingDoc, isNew: false } : existingDoc;
  }

  const newDoc = new Model({ ...query, ...defaults });
  await newDoc.save();

  return returnIsNew ? { doc: newDoc, isNew: true } : newDoc;
}

// Optimized version for read-only operations using .lean()
async function findOrCreateLean(Model, query, defaults = {}) {
  const existingDoc = await Model.findOne(query).lean();

  if (existingDoc) {
    return existingDoc;
  }

  const newDoc = new Model({ ...query, ...defaults });
  await newDoc.save();
  
  // Return lean version of newly created document
  return newDoc.toObject();
}


// Optimized user data initialization with .lean() queries and selective field loading
async function initializeUserDataOptimized(userId) {
  // Calculate proper starting health based on default cultivation stage
  const startingCultivationStage = "Karma-Bhāra"; // Default starting realm
  const stageIndex = getStageIndexByRealm(startingCultivationStage);
  const cultivationStage = cultivationStages[stageIndex] || cultivationStages[0];
  
  // Base health and stats
  const baseHealth = 100;
  const startingLevel = 1;
  const baseStatMultiplier = 1 + (startingLevel * 0.1);
  
  // Calculate cultivation realm health bonus (same logic as combatCalculator)
  let realmHealthMultiplier = 1;
  if (cultivationStage.level <= 5) {
    realmHealthMultiplier = 1 + (cultivationStage.level * 0.25);
  } else if (cultivationStage.level <= 10) {
    realmHealthMultiplier = 1 + (5 * 0.25) + ((cultivationStage.level - 5) * 0.20);
  } else {
    realmHealthMultiplier = 1 + (5 * 0.25) + (5 * 0.20) + ((cultivationStage.level - 10) * 0.15);
  }
  
  const totalHealthMultiplier = baseStatMultiplier * realmHealthMultiplier;
  const calculatedMaxHealth = Math.floor(baseHealth * totalHealthMultiplier);

  const [multipliers, settings, xpData, handDoc, inventory, healthData, userStats, sectrodData] = await Promise.all([
    // Use lean queries for read operations and select only needed fields
    Multipliers.findOne({ userId }).select('userId cooldownReduction jackpotBoost lootMultiplier xpMultiplier').lean() ||
      findOrCreateLean(Multipliers, { userId }),
    
    ExpeditionSettings.findOne({ userId }).select('userId autosell expeditions realm realmTier winStreak activeQuests').lean() ||
      findOrCreateLean(ExpeditionSettings, { userId }),
    
    Xp.findOne({ userId }).select('userId xp level totalxpmultiplier').lean() ||
      findOrCreateLean(Xp, { userId }, { xp: 0, level: 1 }),
    
    Hand.findOne({ userId }).select('userId balance').lean() ||
      findOrCreateLean(Hand, { userId }, { balance: 0 }),
    
    Inventory.findOne({ userId }).select('userId souls artifacts materials alchemy karma totalKarmicDebt karmicRealms').lean() ||
      findOrCreateLean(Inventory, { userId }, {
        souls: [],
        artifacts: [],
        materials: [],
        alchemy: [],
        karma: [],
        totalKarmicDebt: 0,
        karmicRealms: startingCultivationStage
      }),
    
    UserHealth.findOne({ userId }).select('userId currentHealth maxHealth').lean() ||
      findOrCreateLean(UserHealth, { userId }, { 
        currentHealth: calculatedMaxHealth, 
        maxHealth: calculatedMaxHealth 
      }),
    
    UserStats.findOne({ userId }).select('userId attack defense speed level stage cultivationLevel').lean() ||
      findOrCreateLean(UserStats, { userId }, {
        attack: 20,
        defense: 10,
        speed: 15,
        level: 1,
        stage: startingCultivationStage,
        cultivationLevel: 1
      }),
    
    // Sectrod needs special handling due to returnIsNew requirement
    findOrCreate(Sectrod, { userId }, {
      augments: [
        { slotType: 'element' },
        { slotType: 'reel' },
        { slotType: 'line' },
        { slotType: 'sigil' },
        { slotType: 'focus' },
        { slotType: 'handle' },
        { slotType: 'misc' }
      ],
    }, true)
  ]);
  
  const { doc: sectrod, isNew: isNewRod } = sectrodData;
  return { userId, multipliers, settings, xpData, handDoc, inventory, healthData, userStats, sectrod, isNewRod };
}

// Modified to initialize categorized inventory (original non-optimized version)
async function initializeUserData(userId) {
  // Calculate proper starting health based on default cultivation stage
  const startingCultivationStage = "Karma-Bhāra"; // Default starting realm
  const stageIndex = getStageIndexByRealm(startingCultivationStage);
  const cultivationStage = cultivationStages[stageIndex] || cultivationStages[0];
  
  // Base health and stats
  const baseHealth = 100;
  const startingLevel = 1;
  const baseStatMultiplier = 1 + (startingLevel * 0.1);
  
  // Calculate cultivation realm health bonus (same logic as combatCalculator)
  let realmHealthMultiplier = 1;
  if (cultivationStage.level <= 5) {
    realmHealthMultiplier = 1 + (cultivationStage.level * 0.25);
  } else if (cultivationStage.level <= 10) {
    realmHealthMultiplier = 1 + (5 * 0.25) + ((cultivationStage.level - 5) * 0.20);
  } else {
    realmHealthMultiplier = 1 + (5 * 0.25) + (5 * 0.20) + ((cultivationStage.level - 10) * 0.15);
  }
  
  const totalHealthMultiplier = baseStatMultiplier * realmHealthMultiplier;
  const calculatedMaxHealth = Math.floor(baseHealth * totalHealthMultiplier);
  const [multipliers, settings, xpData, handDoc, inventory, healthData, userStats, sectrodData] = await Promise.all([
    findOrCreate(Multipliers, { userId }),
    findOrCreate(ExpeditionSettings, { userId }),
    findOrCreate(Xp, { userId }, { xp: 0, level: 1 }),
    findOrCreate(Hand, { userId }, { balance: 0 }),
    findOrCreate(Inventory, { userId }, {
      souls: [],
      artifacts: [],
      materials: [],
      alchemy: [],
      karma: [],
      totalKarmicDebt: 0,
      karmicRealms: startingCultivationStage
    }),
    findOrCreate(UserHealth, { userId }, { 
      currentHealth: calculatedMaxHealth, 
      maxHealth: calculatedMaxHealth 
    }),
    findOrCreate(UserStats, { userId }, {
      attack: 20,
      defense: 10,
      speed: 15,
      level: 1,
      stage: startingCultivationStage,
      cultivationLevel: 1
    }),
    findOrCreate(Sectrod, { userId }, {
      augments: [
        { slotType: 'element' },
        { slotType: 'reel' },
        { slotType: 'line' },
        { slotType: 'sigil' },
        { slotType: 'focus' },        { slotType: 'handle' },
        { slotType: 'misc' }
      ],
    }, true) // true here tells findOrCreate to return { doc, isNew }
  ]);
  const { doc: sectrod, isNew: isNewRod } = sectrodData;
  return { userId, multipliers, settings, xpData, handDoc, inventory, healthData, userStats, sectrod, isNewRod };
}

// Updated to use unified cache manager with regular data initialization for write operations
async function initializeUserDataWithCache(userId) {
  // Check cache first using the USER_DATA category
  const cached = cacheManager.get('USER_DATA', userId);
  if (cached) return cached;

  // Use regular version for operations that need to save data
  const data = await initializeUserData(userId);
  // Cache the user data using the unified cache manager
  cacheManager.set('USER_DATA', userId, data);
  return data;
}

module.exports = { initializeUserDataWithCache, initializeUserData, initializeUserDataOptimized };
