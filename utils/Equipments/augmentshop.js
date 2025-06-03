// File: utils/augments.js
const augments = require('./augments');

/**
 * Returns all augments, or filters by slotType (e.g., 'reel', 'element').
 * @param {string} [slotType]
 * @returns {Array}
 */
function getAugments(slotType) {
  if (!slotType) return augments;
  return augments.filter(aug => aug.slotType === slotType);
}

/**
 * Get augment by name (case-insensitive match)
 * @param {string} name
 * @returns {Object|null}
 */
function findAugmentByName(name) {
  return augments.find(aug => aug.name.toLowerCase() === name.toLowerCase()) || null;
}

/**
 * Get augment by ID
 * @param {string} id
 * @returns {Object|null}
 */
function findAugmentById(id) {
  return augments.find(aug => aug.id === id) || null;
}

module.exports = {
  getAugments,
  findAugmentByName,
  findAugmentById,
  augments
};
