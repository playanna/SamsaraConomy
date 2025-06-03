const ExpeditionSettings = require('../../../models/Multipliers/expeditionSetting.js');

async function updateQuestProgressFromLoot({ userId, loots }) {
  const settings = await ExpeditionSettings.findOne({ userId });
  if (!settings || !settings.activeQuests) {
    return;
  }
  // Step 1: Build loot lookup map using multiple formats for flexible matching
  const lootMap = new Map();
  for (const loot of loots) {
    if (loot.baseName) {
      const baseNameKey = loot.baseName.toLowerCase();
      lootMap.set(baseNameKey, (lootMap.get(baseNameKey) || 0) + loot.quantity);
      
      // Also map rarity_baseName format if rarity exists
      if (loot.rarity) {
        const rarityKey = `${loot.rarity.toLowerCase()}_${loot.baseName.toLowerCase()}`;
        const raritySpaceKey = `${loot.rarity.toLowerCase()} ${loot.baseName.toLowerCase()}`;
        lootMap.set(rarityKey, (lootMap.get(rarityKey) || 0) + loot.quantity);
        lootMap.set(raritySpaceKey, (lootMap.get(raritySpaceKey) || 0) + loot.quantity);
      }
    }
  }

  let modified = false;
  // Step 2: Process quests/objectives
  for (const quest of settings.activeQuests) {
    for (const objective of quest.objectives) {
      if (!objective.itemId) {
        continue;
      }

      // Handle both formats: with rarity prefix (e.g., "common_iron ore") and without (e.g., "iron ore")
      let expectedName = objective.itemId.toLowerCase();
      // remove the _ if it exists
      expectedName = expectedName.replace('_', ' ');
      
      // If itemId contains underscore, try both the full itemId and the part after underscore
      if (expectedName.includes('_')) {
        const withoutRarity = expectedName.split('_').slice(1).join(' ');
        // Check both formats
        if (lootMap.has(expectedName.replace('_', ' ')) || lootMap.has(withoutRarity)) {
          expectedName = lootMap.has(expectedName.replace('_', ' ')) ? expectedName.replace('_', ' ') : withoutRarity;
        } else {
          expectedName = withoutRarity;
        }
      }
      
      if (lootMap.has(expectedName)) {
        const quantityFound = lootMap.get(expectedName);
        objective.currentCount += quantityFound;
        if (objective.currentCount >= objective.targetCount) {
          objective.completed = true;
        }
        modified = true;
      }
    }
  }

  // Step 3: Save if modified
  if (modified) {
    settings.markModified('activeQuests');
    await settings.save();
  }
}

module.exports = {
  updateQuestProgressFromLoot
};
