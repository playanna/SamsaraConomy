const { generateLoot, categorizeLoot } = require('./lootHandler');
const { handleLootStorage } = require('./inventoryHandler');
const { updateQuestProgressFromLoot } = require('./questHandler');
const { applyXpAndStats, calculateXpMultiplier, persistAll } = require('./xpHandler');
const { getRandomInt } = require('../../../utils/mathUtils');
const { computeLevel } = require('../../../utils/levelUtils');
const Clan = require('../../../models/Clan/clan');

const computeLoot = (outcome, sectrod) => {
  const count = outcome.isJackpot ? outcome.lootCount * 2 : outcome.lootCount;
  sectrod.favorites.realms = outcome.realm;
  return generateLoot(count, outcome.realm, outcome.lootMultiplier, sectrod);
};

const analyzeLoot = (loots) => {
  let soul = 0, karma = 0;
  const mythics = [];

  for (const item of loots) {
    if (item.type === 'soul') soul += item.quantity;
    else if (item.type === 'karma') karma += item.quantity;
    if (item.rarity === 'mythic') mythics.push(item);
  }

  const soulTypeCount = soul + karma;
  return {
    soulTypeBoost: 1 + (soulTypeCount * 0.05),
    mythicDrops: mythics
  };
};

async function applySuccessOutcome({ outcome, xpData, settings, multipliers, inventory, handDoc, sectrod }) {
  const loots = computeLoot(outcome, sectrod);
  const { soulTypeBoost, mythicDrops } = analyzeLoot(loots);

  const { totalLootValue, totalKarmicDebt } = await handleLootStorage({ settings, handDoc, inventory, loots });

  const baseXp = (totalKarmicDebt + (totalLootValue / 2)) * soulTypeBoost;
  const totalMultiplier = await calculateXpMultiplier(xpData.userId, multipliers);
  const finalXp = Math.floor(baseXp * totalMultiplier);
  const xpResult = await applyXpAndStats({
    xpData,
    settings,
    multipliers,
    lootMultiplier: outcome.lootMultiplier,
    sectrod,
    inventory,
    xp: finalXp,
    multiplier: totalMultiplier,
    userId: xpData.userId
  });

  await Promise.all([
    updateQuestProgressFromLoot({ userId: xpData.userId, loots }),
    mythicDrops.length > 0 ? handleMythicDrops(xpData.userId, mythicDrops) : Promise.resolve(),
    persistAll([xpData, settings, multipliers, inventory, sectrod])
  ]);

  return {
    loots: categorizeLoot(loots),
    totalLootValue,
    totalKarmicDebt,
    xp: xpResult.appliedXp,
    baseXp: finalXp,
    isJackpot: outcome.isJackpot,
    autoSell: settings.autosell,
    realm: outcome.realm,
    hasMythic: mythicDrops.length > 0,
    challengeInfo: xpResult.challengeInfo
  };
}

async function handleMythicDrops(userId, mythicItems) {
  await Clan.updateOne(
    { "members.userId": userId },
    { $push: { announcements: `${userId} obtained MYTHIC ${mythicItems[0].name}!` } }
  );
  // Extend logic as needed
}

function calculateExpeditionOutcome(multipliers, realm, realmTier) {
  const {
    lootupgradeLevel = 0,
    lineUpgradeLevel = 0,
    lootMultiplier: rawMultiplier = 1,
    gripUpgradeLevel = 0,
    jackpotBoost = 0,
    lossProtection = 1
  } = multipliers;

  const lineMultiplier = 1 + (lineUpgradeLevel * 0.2);
  const effectiveMultiplier = Math.max(1, rawMultiplier * (2 ** lootupgradeLevel) * lineMultiplier);
  const lootMultiplier = Math.floor(effectiveMultiplier / (2 ** realmTier));
  const lootCount = lootMultiplier > 10
    ? getRandomInt(Math.floor(lootMultiplier * 0.95), lootMultiplier)
    : lootMultiplier;

  const isJackpot = Math.random() < (0.05 + jackpotBoost / 100 + gripUpgradeLevel * 0.05);
  const isLoss = Math.random() < (0.01 * lossProtection);

  return { isJackpot, isLoss, lootCount, lootMultiplier, lossProtection, realm };
}

async function applyLossOutcome({ handDoc, xpData, settings, outcome, sectrod, inventory }) {
  const loots = generateLoot(outcome.lootCount, outcome.realm, outcome.lootMultiplier, sectrod);
  const totalLootValue = loots.reduce((sum, item) => sum + item.value * item.quantity, 0);
  const estimatedValue = totalLootValue * outcome.lossProtection;

  const lostXp = Math.floor(inventory.totalKarmicDebt * 0.01 * outcome.lossProtection);
  const lossCoins = estimatedValue * 4;

  inventory.totalKarmicDebt = Math.max(0, inventory.totalKarmicDebt - lostXp);
  xpData.xp = Math.max(0, xpData.xp - lostXp);
  xpData.level = computeLevel(xpData.xp);
  handDoc.balance = Math.max(0, handDoc.balance - lossCoins);
  settings.misfortunes = (settings.misfortunes || 0) + 1;
  settings.winStreak = 0;

  await Promise.all([
    xpData.save(),
    handDoc.save(),
    settings.save(),
    inventory.save()
  ]);

  return { lostXp, lossCoins };
}

module.exports = {
  applySuccessOutcome,
  calculateExpeditionOutcome,
  applyLossOutcome,
  handleMythicDrops
};
