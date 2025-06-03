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

async function findOrCreate(Model, query, defaults = {}, returnIsNew = false) {
  const existingDoc = await Model.findOne(query);

  if (existingDoc) {
    return returnIsNew ? { doc: existingDoc, isNew: false } : existingDoc;
  }

  const newDoc = new Model({ ...query, ...defaults });
  await newDoc.save();

  return returnIsNew ? { doc: newDoc, isNew: true } : newDoc;
}


// Modified to initialize categorized inventory
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


const userDataCache = new Map();
const CACHE_DURATION_MS = 10 * 1000; // 10 seconds

async function initializeUserDataWithCache(userId) {
  const now = Date.now();

  if (userDataCache.has(userId)) {
    const { expires, data } = userDataCache.get(userId);
    if (now < expires) {
      return data;
    } else {
      userDataCache.delete(userId);
    }
  }

  const data = await initializeUserData(userId);
  userDataCache.set(userId, { expires: now + CACHE_DURATION_MS, data });
  return data;
}

module.exports = { initializeUserDataWithCache, initializeUserData };
