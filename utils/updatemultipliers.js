const EquippedGear = require('../models/Gears/EquippedGear');
const Multipliers = require('../models/Multipliers/multipliers');

const defaultBonuses = {
  cooldownReduction: 1.0,
  jackpotBoost: 0,
  lootMultiplier: 1.0,
  lossProtection: 1.0,
  xpMultiplier: 1.0
};

/**
 * Recalculates and updates the user's multipliers based on their equipped gear.
 * @param {string} userId - The Discord user ID.
 */
async function updateUserMultipliers(userId) {
  const equippedGear = await EquippedGear.findOne({ userId });
  if (!equippedGear || !equippedGear.gear?.length) {
    // No gear equipped, reset to defaults
    await Multipliers.updateOne(
      { userId },
      { $set: defaultBonuses },
      { upsert: true }
    );
    return;
  }

  const totalBonuses = { ...defaultBonuses };

  for (const { item } of equippedGear.gear) {
    const bonuses = item.bonuses || {};
    for (const [key, value] of Object.entries(bonuses)) {
      if (!(key in totalBonuses)) continue;

      if (['cooldownReduction', 'lossProtection', 'lootMultiplier', 'xpMultiplier'].includes(key)) {
        totalBonuses[key] *= value;
      } else if (key === 'jackpotBoost') {
        totalBonuses[key] += value;
      }
    }
  }

  await Multipliers.updateOne(
    { userId },
    { $set: totalBonuses },
    { upsert: true }
  );
}

module.exports = updateUserMultipliers;
