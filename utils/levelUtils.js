function computeLevel(xp, baseXP = 100) {
    let level = 0;
    let nextLevelXP = 0;
    while (true) {
      nextLevelXP = baseXP * Math.pow(level + 1, 2);
      if (xp < nextLevelXP) break;
      level++;
    }
    return level;
  }

module.exports = {
  computeLevel
};