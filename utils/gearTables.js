// utils/gearTable.js

const gearItems = [
    {
      name: "Amulet of the Plains",
      slot: "amulet",
      rarity: "Common",
      price: 800000,
      set: "Wanderer",
      bonuses: {
        lootMultiplier: 1.02
      }
    },
    {
      name: "Robe of the Spirit Trees",
      slot: "robe",
      rarity: "Uncommon",
      price: 3000000,
      set: "Wanderer",
      bonuses: {
        cooldownReduction: 0.9
      }
    },
    {
      name: "Wanderer's Boots",
      slot: "boots",
      rarity: "Rare",
      price: 12000000,
      set: "Wanderer",
      bonuses: {
        cooldownReduction: 0.85
      }
    },
    {
      name: "Wanderer's Gloves",
      slot: "gloves",
      rarity: "Rare",
      price: 6500000,
      set: "Wanderer",
      bonuses: {
        lossProtection: 0.88
      }
    },
    {
      name: "Wanderer's Cap",
      slot: "helmet",
      rarity: "Common",
      price: 1500000,
      set: "Wanderer",
      bonuses: {
        jackpotBoost: 5
      }
    },
    {
      name: "Blade of the Howling Winds",
      slot: "weapon",
      rarity: "Epic",
      price: 35000000,
      set: "Stormcaller",
      bonuses: {
        cooldownReduction: 0.7,
        lootMultiplier: 1.07
      }
    },
    {
      name: "Stormcaller's Pauldrons",
      slot: "robe",
      rarity: "Rare",
      price: 14000000,
      set: "Stormcaller",
      bonuses: {
        lossProtection: 0.8,
        xpMultiplier: 1.10
      }
    },
    {
      name: "Ring of Endless Fortune",
      slot: "ring",
      rarity: "Legendary",
      price: 75000000,
      set: "FortuneSeeker",
      bonuses: {
        jackpotBoost: 20,
        lootMultiplier: 1.20
      }
    },
    {
      name: "FortuneSeeker's Belt",
      slot: "robe",
      rarity: "Epic",
      price: 28000000,
      set: "FortuneSeeker",
      bonuses: {
        jackpotBoost: 12,
        xpMultiplier: 1.08
      }
    },
    {
      name: "Pendant of Swiftness",
      slot: "amulet",
      rarity: "Uncommon",
      price: 4000000,
      set: "Swiftwind",
      bonuses: {
        cooldownReduction: 0.92
      }
    },
    {
      name: "Swiftwind Leggings",
      slot: "boots",
      rarity: "Rare",
      price: 11000000,
      set: "Swiftwind",
      bonuses: {
        cooldownReduction: 0.88,
        lossProtection: 0.92
      }
    },
    {
      name: "Helm of the Deep Caves",
      slot: "helmet",
      rarity: "Rare",
      price: 13000000,
      set: "Cave Dweller",
      bonuses: {
        lootMultiplier: 1.06,
        lossProtection: 0.85
      }
    },
    {
      name: "Gloves of the Mountain King",
      slot: "gloves",
      rarity: "Legendary",
      price: 90000000,
      set: "Mountain King",
      bonuses: {
        xpMultiplier: 1.25,
        lootMultiplier: 1.15
      }
    },
    {
      name: "Cloak of Eternal Night",
      slot: "robe",
      rarity: "Epic",
      price: 32000000,
      set: "Shadow Walker",
      bonuses: {
        xpMultiplier: 1.15,
        cooldownReduction: 0.85
      }
    },
    {
      name: "Boots of Silent Steps",
      slot: "boots",
      rarity: "Rare",
      price: 15000000,
      set: "Shadow Walker",
      bonuses: {
        xpMultiplier: 1.10,
        lossProtection: 0.9
      }
    },
    {
      name: "Crown of the Sun King",
      slot: "helmet",
      rarity: "Legendary",
      price: 95000000,
      set: "Sun King",
      bonuses: {
        xpMultiplier: 1.3,
        lootMultiplier: 1.2
      }
    },
    {
      name: "Sun King's Shield",
      slot: "shield",
      rarity: "Epic",
      price: 40000000,
      set: "Sun King",
      bonuses: {
        lossProtection: 0.95,
        xpMultiplier: 1.15
      }
    },
    {
      name: "Bracers of the Frost Warden",
      slot: "robe",
      rarity: "Rare",
      price: 18000000,
      set: "Frost Warden",
      bonuses: {
        cooldownReduction: 0.87,
        lossProtection: 0.9
      }
    },
    {
      name: "Frost Warden's Blade",
      slot: "weapon",
      rarity: "Legendary",
      price: 85000000,
      set: "Frost Warden",
      bonuses: {
        cooldownReduction: 0.75,
        lootMultiplier: 1.18
      }
    }
  ];
  
  /**
   * Returns all gear items, or filters by slot.
   * @param {string} [slot] Optional slot to filter by (e.g., 'amulet', 'boots').
   * @returns {Array}
   */
  function getGearItems(slot) {
    if (!slot) return gearItems;
    return gearItems.filter(item => item.slot === slot);
  }

  /**
   * Get gear item by name
   * @param {string} name
   * @returns {Object|null}
   */
  function findGearByName(name) {
    return gearItems.find(item => item.name === name) || null;
  }

  module.exports = {
    getGearItems,
    findGearByName,
    gearItems // Add gearItems to the exports
  };