// expeditionEngine
// Updated expeditionEngine.js
const Xp = require('../../models/XP/xp.js');
const Multipliers = require('../../models/Multipliers/multipliers.js');
const ExpeditionSettings = require('../../models/Multipliers/expeditionSetting.js');
const Inventory = require('../../models/Multipliers/inventory.js'); // Now uses the new schema
const Hand = require('../../models/balance/hand.js');
const Clan = require('../../models/Clan/clan.js');
const { getRandomLoot, getExpeditionLoot, getFishingLoot } = require('../loots.js');
const { computeLevel } = require('../../utils/levelUtils');
const { getRandomInt } = require('../../utils/mathUtils.js');
const Sectrod = require('../../models/Equipment/sectrod.js');

// Utility function remains the same
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
  const [multipliers, settings, xpData, handDoc, inventory, sectrodData] = await Promise.all([
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
      totalKarmicDebt: 0
    }),
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
    }, true) // true here tells findOrCreate to return { doc, isNew }
  ]);

  const { doc: sectrod, isNew: isNewRod } = sectrodData;

  return { multipliers, settings, xpData, handDoc, inventory, sectrod, isNewRod };
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


// Updated loot handling for expeditions - prioritizes material items
function generateLoot(lootCount, realm, lootMultiplier, sectrod) {
  const loots = [];
  for (let i = 0; i < lootCount; i++) {
    const loot = getExpeditionLoot(realm, sectrod); // Use expedition-specific loot function
    loots.push(loot);
  }
  if (Math.random() < lootMultiplier % 1) // Chance for bonus loot
    {
    const bonusLoot = getExpeditionLoot(realm, sectrod);
    loots.push(bonusLoot);
  }
  return loots;
}

// 🎣 Fishing-specific loot generation - prioritizes soul items
function generateFishingLoot(lootCount, realm, lootMultiplier, sectrod) {
  const loots = [];
  for (let i = 0; i < lootCount; i++) {
    const loot = getFishingLoot(realm, sectrod); // Use fishing-specific loot function
    loots.push(loot);
  }
  if (Math.random() < lootMultiplier % 1) // Chance for bonus loot
    {
    const bonusLoot = getFishingLoot(realm, sectrod);
    loots.push(bonusLoot);
  }
  return loots;
}

// New: Categorize loot by type for optimized storage
function categorizeLoot(loots) {
  return {
    souls: loots.filter(i => i.type === 'soul'),
    artifacts: loots.filter(i => i.type === 'artifact'),
    materials: loots.filter(i => i.type === 'material'),
    alchemy: loots.filter(i => i.type === 'alchemy'),
    karma: loots.filter(i => i.type === 'karma') // Added karma category
  };
}

// Updated to handle karmic debt and categorized storage
async function handleLootStorage({ settings, handDoc, inventory, loots }) {
  const categorized = categorizeLoot(loots);
  const totalLootValue = loots.reduce((acc, item) => acc + (item.value * item.quantity), 0);
  const totalKarmicDebt = loots.reduce((acc, item) => acc + (item.debt * item.quantity), 0);

  if (settings.autosell) {
    handDoc.balance += totalLootValue;
    await handDoc.save(); // Still safe since only this call touches handDoc
  } else {
    // Merge into in-memory object
    const updatedInventory = {
      souls: mergeLootIntoInventory(categorized.souls, inventory.souls),
      artifacts: mergeLootIntoInventory(categorized.artifacts, inventory.artifacts),
      materials: mergeLootIntoInventory(categorized.materials, inventory.materials),
      alchemy: mergeLootIntoInventory(categorized.alchemy, inventory.alchemy),
      karma: mergeLootIntoInventory(categorized.karma, inventory.karma),
      totalKarmicDebt: inventory.totalKarmicDebt + totalKarmicDebt
    };

    // Perform atomic update
    await Inventory.findOneAndUpdate(
      { userId: inventory.userId },
      { $set: updatedInventory },
      { new: true }
    );
  }

  return { totalLootValue, totalKarmicDebt };
}


// Removed updateQuestProgressFromLoot - now handled by dedicated questHandler.js

function aggregateLoot(loots, isJackpot) {
  let totalLootValue = 0;
  let lootXpBonus = 0;
  const lootMap = new Map();

  for (const item of loots) {
    totalLootValue += item.value;
    lootXpBonus += item.value >> 1; // faster than Math.floor(value / 2)
    const existing = lootMap.get(item.name);
    if (existing) {
      existing.quantity++;
    } else {
      lootMap.set(item.name, { ...item, quantity: 1 });
    }
  }

  if (isJackpot) lootXpBonus *= 2;
  return { lootMap, totalLootValue, lootXpBonus };
}



// Modified merge function for categorized items
function mergeLootIntoInventory(newItems = [], existingItems) {
  const inventoryMap = new Map();
  const safeExisting = Array.isArray(existingItems) ? existingItems : [];

  safeExisting.forEach(item => {
    inventoryMap.set(item.itemId, item);
  });

  newItems.forEach(item => {
    if (inventoryMap.has(item.itemId)) {
      inventoryMap.get(item.itemId).quantity += item.quantity;
    } else {
      inventoryMap.set(item.itemId, { ...item });
    }
  });

  return Array.from(inventoryMap.values());
}

// Updated success outcome handler
async function applySuccessOutcome({ outcome, xpData, settings, multipliers, inventory, handDoc, sectrod }) {
  const { isJackpot, lootCount, realm, lootMultiplier } = outcome;

  // 🔹 LOOT PHASE
  const totalLootCount = isJackpot ? lootCount * 2 : lootCount;
  const loots = generateLoot(totalLootCount, realm, lootMultiplier, sectrod);
  sectrod.favorites.realms = realm; // Update favorite realm in Sectrod
  //save the sectrod
  await sectrod.save();
  // console.log(`[Loot] Generated ${totalLootCount} loots with multiplier ${lootMultiplier}`);
  const soulcount = loots.reduce((acc, item) => acc + (item.type === 'soul' ? item.quantity : 0), 0); // Added soul count
  const karmacount = loots.reduce((acc, item) => acc + (item.type === 'karma' ? item.quantity : 0), 0); // Added karma count
  const soultypecount = soulcount + karmacount; // Total soul type count
  //boost by 5% for every soul type
  const soultypeboost = (1 + (soultypecount * 0.05)); // Added soul type boost
  // 🔹 INVENTORY OR AUTOSELL (now handles debt)
  const { totalLootValue, totalKarmicDebt } = await handleLootStorage({
    settings, 
    handDoc, 
    inventory, 
    loots 
  });

  // Quest progress is now handled by outcomeHandler.js

  // 🔹 XP PHASE (with karma modifier)
  const baseXp = (totalKarmicDebt + (totalLootValue >> 1)) * soultypeboost; // random XP + loot value bonus(/2)
  let totalMultiplier = await calculateXpMultiplier(xpData.userId, multipliers);
  if (isJackpot) {
    totalMultiplier *= 1;
  }
  console.log(`[XP] Base XP: ${baseXp}, Multiplier: ${totalMultiplier}, totalLootValue: ${totalLootValue}, soultypeboost: ${soultypeboost}`);
  const karmaModifier = 1; // Up to 50% XP reduction
  const finalXp = Math.floor(baseXp * totalMultiplier) * (karmaModifier);

  applyXpAndStats({ 
    xpData, 
    settings, 
    multipliers, 
    lootMultiplier,
    sectrod,
    inventory,
    xp: finalXp, 
    multiplier: totalMultiplier 
  });

  // 🔹 SPECIAL MYTHIC EFFECTS
  const mythicDrops = loots.filter(l => l.rarity === 'mythic');
  if (mythicDrops.length > 0) {
    await handleMythicDrops(xpData.userId, mythicDrops);
  }

  await persistAll([xpData, settings, multipliers, inventory, sectrod]);

  return {
    loots: categorizeLoot(loots),
    totalLootValue,
    totalKarmicDebt,
    xp: finalXp,
    isJackpot,
    autoSell: settings.autosell,
    realm,
    hasMythic: mythicDrops.length > 0
  };
}

// New: Mythic item handler
async function handleMythicDrops(userId, mythicItems) {
  await Clan.updateOne(
    { "members.userId": userId },
    { $push: { announcements: `${userId} obtained MYTHIC ${mythicItems[0].name}!` } }
  );
  // Add other mythic-specific logic here
}

function calculateExpeditionOutcome(multipliers, realm, realmTier) {
  const lootLevel = multipliers.lootupgradeLevel || 0;
  const lineLevel = multipliers.lineUpgradeLevel || 0;
  const lineMultiplier = 1 + (lineLevel * 0.2); // Each level adds a 20% increase
  const lootMultiplierbase = Math.max(
    1,
    ((multipliers?.lootMultiplier ?? 1) * Math.pow(2, lootLevel || 0)) * (lineMultiplier || 1)
  ); // Each level adds a 100% increase
  const lootMultiplier = Math.floor(lootMultiplierbase / (2 ** realmTier)); // Divide by 2^realmTier
  console.log(`[Expedition] Loot Multiplier: ${lootMultiplier}`);
  let lootCount = lootMultiplier > 10 
    ? getRandomInt(Math.floor(lootMultiplier * 0.95), lootMultiplier) 
    : lootMultiplier;
  console.log(`[Expedition] Loot Count: ${lootCount}`);  
  const gripLevel = multipliers.gripUpgradeLevel || 0;
  const gripMultiplier = (gripLevel * 0.05); // Each level adds a 5% increase
  const isJackpot = Math.random() < (0.05 + ((multipliers.jackpotBoost || 0) / 100) + gripMultiplier ); // 5% base chance + grip boost
  const isLoss = Math.random() < (0.05 * (multipliers.lossProtection || 1)); // 5% base chance
  const lossProtection = multipliers.lossProtection || 1;
  return { isJackpot, isLoss, lootCount, lootMultiplier, lossProtection, realm };
}

async function applyLossOutcome({ handDoc, xpData, settings, outcome, sectrod, inventory }) {
  let lootCount = outcome.lootCount;
  const loots = generateLoot(lootCount, outcome.realm, outcome.lootMultiplier, sectrod);
  let totalLootValue = loots.reduce((acc, item) => acc + (item.value * item.quantity), 0);
  const estimatedValue = totalLootValue * (outcome.lossProtection || 1);
  const lossCoins = estimatedValue * 4;
  const lostXpValue = inventory.totalKarmicDebt * 0.01; // 1% of total karmic debt
  const lostXp = Math.floor(lostXpValue * (outcome.lossProtection || 1)); // Apply loss protection

  inventory.totalKarmicDebt = Math.max(0, inventory.totalKarmicDebt - lostXp); // Assuming xp is the karmic debt
  xpData.xp = Math.max(0, xpData.xp - lostXp);
  xpData.level = computeLevel(xpData.xp);
  handDoc.balance = Math.max(0, handDoc.balance - lossCoins);
  settings.misfortuneCount = (settings.misfortuneCount || 0) + 1;
  settings.winStreak = 0;

  await Promise.all([xpData.save(), handDoc.save(), settings.save(), inventory.save()]);
  return { lostXp, lossCoins };
}


async function calculateXpMultiplier(userId, multipliers) {
  const xpLevel = multipliers.xpupgradeLevel || 0;
  const mastLevel = multipliers.mastUpgradeLevel || 0;
  const mastMultiplier = 1 + (mastLevel * 0.2); // Each level adds a 20% increase
  const baseMultiplier = multipliers.xpMultiplier || 1;
  const personal = (baseMultiplier * Math.pow(2, xpLevel)) * mastMultiplier;

  const clan = await Clan.findOne({ "members.userId": userId }).lean();
  const clanBoost = clan?.upgrades?.xpBoost || 0;

  return personal * (1 + clanBoost);
}

function applyXpAndStats({ xpData, settings, multipliers, lootMultiplier, sectrod, inventory, xp, multiplier }) {
  // console.log(`[XP] Applying ${xp} XP. Total before: ${xpData.xp}`);
  xpData.xp += xp;
  xpData.level = computeLevel(xpData.xp);
  xpData.totalxpmultiplier = multiplier;
  sectrod.stats.catchRate = lootMultiplier;
  inventory.totalKarmicDebt += xp; // Assuming xp is the karmic debt
  console.log(`sectrod.stats.catchRate: ${sectrod.stats.catchRate}, lootMultiplier: ${lootMultiplier}`);

  settings.expeditions++;
  settings.winStreak++;
  settings.longestWinStreak = Math.max(settings.winStreak, settings.longestWinStreak);
}

async function persistAll(models) {
  await Promise.allSettled(models.map(doc => doc.save()));
}


module.exports = {
  initializeUserDataWithCache,
  calculateExpeditionOutcome,
  applyLossOutcome,
  applySuccessOutcome,
  generateFishingLoot, // Export for fishing commands
  _testing: {
    categorizeLoot,
    mergeLootIntoInventory
  }
};