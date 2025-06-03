// /handlers/lootHandler.js
const { getRandomLoot, getFishingLoot, getExpeditionLoot } = require('../../loots.js');

function generateLoot(lootCount, realm, lootMultiplier, sectrod) {
    const loots = [];
    for (let i = 0; i < lootCount; i++) {
      const loot = getExpeditionLoot(realm, sectrod);
      loots.push(loot);
    }
    if (Math.random() < lootMultiplier % 1) // 50% chance to get a bonus loot
      {
      const bonusLoot = getRandomLoot(realm, sectrod);
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

module.exports = { generateLoot, categorizeLoot };
