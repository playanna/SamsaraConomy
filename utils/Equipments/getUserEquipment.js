const SectRod = require('../../models/Equipment/sectrod'); // ✅ Correct

/**
 * Fetches the user's equipment.
 * @param {string} userId - Discord user ID
 * @returns {Promise<Object>} - Equipment instance
 */
async function getUserEquipment(userId) {
  if (!userId) throw new Error('User ID is required');

  const equipment = await SectRod.findOne({ userId });
  
  if (!equipment) {
    throw new Error('No equipment found. You may need to acquire a rod first!');
  }

  return equipment;
}

module.exports = { getUserEquipment };
