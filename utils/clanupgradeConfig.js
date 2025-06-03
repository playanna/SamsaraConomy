// utils/clanupgradeConfig.js
module.exports = {
    jackpot: {
      key: 'jackpotchance',
      label: 'jackpot',
      emoji: '<a:flameice:1361606119906344996>',
      maxLevel: 10,
      getMultiplier: (level) => `x${Math.pow(2, level)} loot`,
    },
    xp: {
      key: 'xpBoost',
      label: 'xpboost',
      emoji: '<a:flamepoisonspirit:1361606134900981790>',
      maxLevel: 10,
      getMultiplier: (level) => `x${Math.pow(2, level)} XP`,
    },
    loot: {
      key: 'loot',
      label: 'loot',
      emoji: '🛒',
      maxLevel: 10,
      getMultiplier: (level) => `x${Math.pow(2, level)} loot`,
    },
    member: {
      key: 'maxMembers',
      label: 'Clan Size',
      emoji: '🏯',
      maxLevel: 10,
      getMultiplier: (level) => `Clan Size +${level}`,
    },
    sellboost: {
      key: 'sellBoost',
      label: 'sellboost',
      emoji: '💸',
      maxLevel: 10,
      getMultiplier: (level) => `+${level * 3}% Prices`,
    },
  };
  