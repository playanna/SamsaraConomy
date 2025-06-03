// utils/upgradeConfig.js
module.exports = {
    loot: {
      key: 'lootUpgradeLevel',
      label: 'Spiritual Sense',
      emoji: '<a:flameice:1361606119906344996>',
      maxLevel: 10,
      getMultiplier: (level) => `x${Math.pow(2, level)} loot`,
    },
    xp: {
      key: 'xpupgradeLevel',
      label: 'Wisdom Enlightenment',
      emoji: '<a:flamepoisonspirit:1361606134900981790>',
      maxLevel: 10,
      getMultiplier: (level) => `x${Math.pow(2, level)} XP`,
    },
    shop: {
      key: 'shopupgradeLevel',
      label: 'Merchant Aura',
      emoji: '🛒',
      maxLevel: 10,
      getMultiplier: (level) => `Shop Tier ${level}`,
    },
    clan: {
      key: 'clanupgradeLevel',
      label: 'Clan Prestige',
      emoji: '🏯',
      maxLevel: 10,
      getMultiplier: (level) => `Clan Buff +${level * 5}%`,
    },
    discount: {
      key: 'discountupgradeLevel',
      label: 'Karmic Discounts',
      emoji: '💸',
      maxLevel: 10,
      getMultiplier: (level) => `-${level * 3}% Prices`,
    },
  };
  