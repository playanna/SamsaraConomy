/**
 * Get the rank of a user based on a specific field in a Mongoose model.
 * @param {Object} model - The Mongoose model (e.g., Xp, Hand, Bank).
 * @param {string} userId - The Discord user ID.
 * @param {string} field - The field to rank by (e.g., 'xp', 'balance').
 * @returns {Promise<number|null>} - The 1-based rank or null if not found.
 */
async function getUserRank(model, userId, field) {
    const users = await model.find().sort({ [field]: -1 }).select(`userId ${field}`).lean();
  
    const rankIndex = users.findIndex(user => user.userId === userId);
    return rankIndex !== -1 ? rankIndex + 1 : null;
  }
  
  module.exports = getUserRank;
  