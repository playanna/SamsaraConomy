// models/Equipment/sectRod/helpers.js

function applyStatModifiers(stats, modifiers) {
    for (const [key, value] of Object.entries(modifiers)) {
      if (typeof stats[key] === 'number') {
        stats[key] += value;
      }
    }
  }
  
  module.exports = { applyStatModifiers };
  