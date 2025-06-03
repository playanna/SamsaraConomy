const { v4: uuidv4 } = require('uuid');
const {lootTables} = require('./loots');

// Utility functions
const random = arr => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Difficulty tiering based on total quest value
function getDifficultyFromValue(value) {
  if (value <= 25) return 'Easy';
  if (value <= 100) return 'Medium';
  if (value <= 500) return 'Hard';
  if (value <= 2000) return 'Epic';
  return 'Legendary';
}

function getQuestAuthor(itemtype) {
  switch (itemtype) {
    case 'soul':
      return 'Soulkeeper';
    case 'karma':
      return 'Karmic Seeker';
    case 'material':
      return 'Material Collector';
    case 'artifact':
      return 'Artifact Hunter';
    case 'alchemy':
      return 'Alchemist';
    default:
      return 'Anonymous';
  }
}

// Duration estimation based on value
function estimateDuration(totalValue) {
  const totalMinutes = totalValue * 1.5;

  if (totalMinutes < 60) return `${Math.round(totalMinutes)} minutes`;
  if (totalMinutes < 240) return `${Math.round(totalMinutes / 60)} hours`;
  return `${Math.round(totalMinutes / 60)}+ hours`;
}

// MAIN QUEST GENERATOR
function generateQuest(realm = 'verdant') {
  const lootTable = lootTables[realm];
  if (!lootTable) throw new Error(`Invalid realm: ${realm}`);

  const item = random(lootTable);

  // Base quantity determined randomly, but could scale with item value
  const baseQty = randInt(6, 15);
  const quantity = baseQty;

  const totalValue = item.value * quantity;
  const rewardGold = Math.round(totalValue);
  const rewardXP = Math.round(totalValue * 1.1);

  const questId = `${realm}_${uuidv4().slice(0, 8)}`;

  return {
    id: questId,
    QuestAuthor: getQuestAuthor(item.type),
    area: realm,
    name: `Gather ${item.name}`,
    description: `Collect ${quantity}x ${item.name} from the ${capitalize(realm)} Realm.`,
    difficulty: getDifficultyFromValue(totalValue),
    duration: estimateDuration(totalValue),
    objectives: [
      {
        description: `Collect ${quantity}x ${item.name}`,
        targetCount: quantity,
        itemId: item.name.replace(/\s+/g, '_') // No rarity prefix
      }
    ],
    rewards: {
      gold: rewardGold,
      xp: rewardXP
    }
  };
}

// Capitalize helper
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = generateQuest;
