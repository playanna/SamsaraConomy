const lootTables = {
    'verdant': [
        { name: 'Lost Soul Spark', value: 5, debt: 5, type: 'soul', emoji: '✨' },
        { name: 'Leader\'s IOU Note', value: 4, debt: 3, type: 'karma', emoji: '📝' },
        { name: 'Dust Bunny', value: 2, debt: 1, type: 'material', emoji: '🐇' },
        { name: 'Bent Spirit Coin', value: 2, debt: 1, type: 'artifact', emoji: '🪙' },
        { name: 'Weed of Wisdom', value: 3, debt: 2, type: 'alchemy', emoji: '🌿' }
    ],
    'moon': [
        { name: 'Ghost\'s Lunch Money', debt: 21, value: 5, type: 'soul', emoji: '👻' },
        { name: 'Karma Tax Evasion', debt: 25, value: 6, type: 'karma', emoji: '💸' },
        { name: 'Copper of Regret', debt: 2, value: 4, type: 'material', emoji: '🪙' },
        { name: 'Missing Leader Coin', debt: 3, value: 5, type: 'artifact', emoji: '🪙' },
        { name: 'Copium Herb', value: 7, debt: 4, type: 'alchemy', emoji: '🌱' }
    ],
    'crimson': [
        { name: 'Soul Coupon', debt: 85, value: 20, type: 'soul', emoji: '🎟️' },
        { name: 'Bad Karma Voucher', debt: 95, value: 25, type: 'karma', emoji: '🔖' },
        { name: 'Iron of Absence', debt: 9, value: 18, type: 'material', emoji: '🪨' },
        { name: 'Triple-Sided Coin', debt: 11, value: 22, type: 'artifact', emoji: '🪙' },
        { name: 'Flower', value: 24, debt: 12, type: 'alchemy', emoji: '🌸' }
    ],
    'abyssal': [
        { name: 'Soul Gem (Used)', debt: 500, value: 100, type: 'soul', emoji: '💎' },
        { name: 'Fate\'s Receipt', debt: 602, value: 120, type: 'karma', emoji: '🧾' },
        { name: 'Steel of Tomorrow', debt: 45, value: 90, type: 'material', emoji: '⚙️' },
        { name: 'Coin of Nine Regrets', debt: 55, value: 110, type: 'artifact', emoji: '🪙' },
        { name: 'Divine Procrastination', debt: 65, value: 130, type: 'alchemy', emoji: '🧪' }
    ],
    'chain': [
        { name: 'Soul Credit Card', debt: 2025, value: 500, type: 'soul', emoji: '💳' },
        { name: 'Karmic Loan', debt: 3025, value: 600, type: 'karma', emoji: '🏦' },
        { name: 'Metal of Promises', debt: 225, value: 450, type: 'material', emoji: '🔗' },
        { name: 'Medal of Participation', debt: 275, value: 550, type: 'artifact', emoji: '🏅' },
        { name: 'Samsara Ban Appeal', debt: 325, value: 650, type: 'alchemy', emoji: '📜' }
    ],
    'hells': [
        { name: 'Soul Mortgage', debt: 8530, value: 2500, type: 'soul', emoji: '🏠' },
        { name: 'Statue\'s To-Do List', debt: 9030, value: 3000, type: 'karma', emoji: '📋' },
        { name: 'Ore of Broken Vows', debt: 1100, value: 2200, type: 'material', emoji: '⛏️' },
        { name: 'Keystone to Nowhere', debt: 1400, value: 2800, type: 'artifact', emoji: '🗝️' },
        { name: 'Ascended Shitpost', debt: 1600, value: 3200, type: 'alchemy', emoji: '💩' }
    ],
    'summit': [
        { name: 'Soul of the Missing', debt: 18050, value: 10000, type: 'soul', emoji: '🕳️' },
        { name: 'Edict of "I\'ll Be Back"', debt: 15050, value: 15000, type: 'karma', emoji: '📜' },
        { name: 'Ban Hammer Fragment', debt: 6000, value: 12000, type: 'material', emoji: '🔨' },
        { name: 'Golden Wheel (Flat)', debt: 7000, value: 14000, type: 'artifact', emoji: '🛞' },
        { name: 'Elixir Base (Dry)', debt: 8000, value: 16000, type: 'alchemy', emoji: '🧴' }
    ],
};

function calculateDynamicWeights(rodStats) {
    const baseSoulWeight = 0.4;
    const baseMaterialWeight = 0.6;

    const RESONANCE_SCALE = 0.75;
    const PRECISION_SCALE = 0.5;
    const LUCK_SCALE = 0.2;

    const resonanceEffect = (rodStats.resonance / 100) * RESONANCE_SCALE;
    const precisionEffect = (rodStats.precision / 100) * PRECISION_SCALE;
    const luckEffect = (rodStats.luck || 0) * LUCK_SCALE;

    let soulWeight = baseSoulWeight * (1 + resonanceEffect + luckEffect);
    let materialWeight = baseMaterialWeight * (1 + precisionEffect + luckEffect);

    soulWeight = Math.max(0.1, soulWeight);
    materialWeight = Math.max(0.1, materialWeight);

    const total = soulWeight + materialWeight;
    return {
        soulItems: soulWeight / total,
        materialItems: materialWeight / total
    };
}

function getRandomLoot(realm = 'verdant', rodStats = { resonance: 0, precision: 0 }) {
    const lootPool = lootTables[realm] || lootTables.verdant;
    const stats = rodStats.stats || rodStats;
    const weights = calculateDynamicWeights(stats);

    const categorizedItems = {
        soulItems: lootPool.filter(item => item.type === 'soul' || item.type === 'karma'),
        materialItems: lootPool.filter(item => item.type !== 'soul' && item.type !== 'karma')
    };

    const categoryRoll = Math.random();
    const selectedItems = categoryRoll < weights.soulItems && categorizedItems.soulItems.length > 0
        ? categorizedItems.soulItems
        : (categorizedItems.materialItems.length > 0
            ? categorizedItems.materialItems
            : categorizedItems.soulItems);

    const baseItem = selectedItems[Math.random() * selectedItems.length | 0];

    return {
        itemId: baseItem.name,
        name: baseItem.name,
        baseName: baseItem.name,
        type: baseItem.type,
        emoji: baseItem.emoji || '🎲', // Default emoji for random loot
        realm,
        value: baseItem.value,
        debt: baseItem.debt,
        quantity: 1,
        isBound: false,
        karmicHistory: []
    };
}

// 🔹 EXPEDITION LOOT - 95% chance for material items (ores, artifacts, alchemy)
function getExpeditionLoot(realm = 'verdant', rodStats = { resonance: 0, precision: 0 }) {
    const lootPool = lootTables[realm] || lootTables.verdant;
    
    const categorizedItems = {
        soulItems: lootPool.filter(item => item.type === 'soul' || item.type === 'karma'),
        materialItems: lootPool.filter(item => item.type === 'material' || item.type === 'artifact' || item.type === 'alchemy')
    };

    // 95% chance for material items during expeditions
    const categoryRoll = Math.random();
    const selectedItems = categoryRoll < 0.95 && categorizedItems.materialItems.length > 0
        ? categorizedItems.materialItems
        : (categorizedItems.soulItems.length > 0
            ? categorizedItems.soulItems
            : categorizedItems.materialItems);

    const baseItem = selectedItems[Math.random() * selectedItems.length | 0];

    return {
        itemId: baseItem.name,
        name: baseItem.name,
        baseName: baseItem.name,
        type: baseItem.type,
        emoji: baseItem.emoji || '⛏️', // Default emoji for expedition loot
        realm,
        value: baseItem.value,
        debt: baseItem.debt,
        quantity: 1,
        isBound: false,
        karmicHistory: []
    };
}

// 🔹 FISHING LOOT - Higher chance for soul items based on rod resonance
function getFishingLoot(realm = 'verdant', rodStats = { resonance: 0, precision: 0 }) {
    const lootPool = lootTables[realm] || lootTables.verdant;
    const stats = rodStats.stats || rodStats;
    
    const categorizedItems = {
        soulItems: lootPool.filter(item => item.type === 'soul' || item.type === 'karma'),
        materialItems: lootPool.filter(item => item.type !== 'soul' && item.type !== 'karma')
    };

    // Base 70% chance for soul items, enhanced by resonance
    const resonanceBonus = Math.min(0.25, (stats.resonance || 0) / 400); // Up to 25% bonus
    const soulChance = 0.70 + resonanceBonus;
    
    const categoryRoll = Math.random();
    const selectedItems = categoryRoll < soulChance && categorizedItems.soulItems.length > 0
        ? categorizedItems.soulItems
        : (categorizedItems.materialItems.length > 0
            ? categorizedItems.materialItems
            : categorizedItems.soulItems);

    const baseItem = selectedItems[Math.random() * selectedItems.length | 0];

    return {
        itemId: baseItem.name,
        name: baseItem.name,
        baseName: baseItem.name,
        type: baseItem.type,
        emoji: baseItem.emoji || '🎣', // Default emoji if not specified
        realm,
        value: baseItem.value,
        debt: baseItem.debt,
        quantity: 1,
        isBound: false,
        karmicHistory: []
    };
}

module.exports = { getRandomLoot, getExpeditionLoot, getFishingLoot, lootTables };
