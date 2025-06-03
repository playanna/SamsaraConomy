const lootTables = {
    'verdant': [
        { name: 'Flickering Soul Spark', value: 5, debt: 5, type: 'soul' },
        { name: 'Tattered Karma Thread', value: 4, debt: 3, type: 'karma' },
        { name: 'Mundane Spirit Ash', value: 2, debt: 0, type: 'material' },
        { name: 'Broken Cycle Coin', value: 2, debt: 0, type: 'artifact' },
        { name: 'Wispbound Herb', value: 3, debt: 0, type: 'alchemy' }
    ],
    'moon': [
        { name: 'Bound Ghost Ember', debt: 21, value: 5, type: 'soul' },
        { name: 'Knotted Karma Strand', debt: 25, value: 6, type: 'karma' },
        { name: 'Spirit-Sealed Copper', debt: 0, value: 4, type: 'material' },
        { name: 'Single Revolution Coin', debt: 0, value: 5, type: 'artifact' },
        { name: 'Soulroot Plant', value: 7, debt: 0, type: 'alchemy' }
    ],
    'crimson': [
        { name: 'Condensed Soul Core', debt: 85, value: 20, type: 'soul' },
        { name: 'Karmic Debt Shard', debt: 95, value: 25, type: 'karma' },
        { name: 'Ghost-Forged Iron', debt: 0, value: 18, type: 'material' },
        { name: 'Triple Revolution Coin', debt: 0, value: 22, type: 'artifact' },
        { name: 'Phantombloom', value: 24, debt: 0, type: 'alchemy' }
    ],
    'abyssal': [
        { name: 'Enlightened Soul Pearl', debt: 500, value: 100, type: 'soul' },
        { name: 'Fate-Severing Fragment', debt: 602, value: 120, type: 'karma' },
        { name: 'Samsara-Tempered Steel', debt: 0, value: 90, type: 'material' },
        { name: 'Nine Revolution Coin', debt: 0, value: 110, type: 'artifact' },
        { name: 'Nirvana Sprout', debt: 0, value: 130, type: 'alchemy' }
    ],
    'chain': [
        { name: 'Celestial Soul Gem', debt: 2025, value: 500, type: 'soul' },
        { name: 'Cosmic Balance Shard', debt: 3025, value: 600, type: 'karma' },
        { name: 'Heavenchain Alloy', debt: 0, value: 450, type: 'material' },
        { name: 'Eternity Cycle Medal', debt: 0, value: 550, type: 'artifact' },
        { name: 'Rebirth Lotus', debt: 0, value: 650, type: 'alchemy' }
    ],
    'hells': [
        { name: 'Primordial Soul Fragment', debt: 8530, value: 2500, type: 'soul' },
        { name: 'Destiny\'s Tapestry Thread', debt: 9030, value: 3000, type: 'karma' },
        { name: 'Karmic Annihilation Ore', debt: 0, value: 2200, type: 'material' },
        { name: 'Samsara Keystone Shard', debt: 0, value: 2800, type: 'artifact' },
        { name: 'Heavenly Dao Fruit Seed', debt: 0, value: 3200, type: 'alchemy' }
    ],
    'summit': [
        { name: 'Law-Infused Soul Origin', debt: 18050, value: 10000, type: 'soul' },
        { name: 'Cycle-Breaking Edict', debt: 15050, value: 15000, type: 'karma' },
        { name: 'Exalted Nirvana Metal', debt: 0, value: 12000, type: 'material' },
        { name: 'Golden Wheel Fragment', debt: 0, value: 14000, type: 'artifact' },
        { name: 'Supreme Unity Elixir Base', debt: 0, value: 16000, type: 'alchemy' }
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
        realm,
        value: baseItem.value,
        debt: baseItem.debt,
        quantity: 1,
        isBound: false,
        karmicHistory: []
    };
}

module.exports = { getRandomLoot, getExpeditionLoot, getFishingLoot, lootTables };
