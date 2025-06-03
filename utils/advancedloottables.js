const lootTables = {
    rarities: {
      common: { weight: 60, valueMultiplier: 1.0 },
      uncommon: { weight: 25, valueMultiplier: 1.8 },
      rare: { weight: 10, valueMultiplier: 3.5 },
      epic: { weight: 4, valueMultiplier: 8.0 },
      legendary: { weight: 1, valueMultiplier: 20.0 }
    },
    realms: {
      verdant: {
        tier: 1,
        materials: [
          {
            id: "vf_herb_1",
            name: "Young Spirit Herb", 
            type: "alchemy",
            baseValue: 10,
            effects: { healthRestore: 50 }
          },
          {
            id: "vf_mineral_1",
            name: "Rough Spirit Stone",
            type: "crafting",
            baseValue: 8,
            requiredFor: { gear: ["wooden"] }
          }
        ],
        gear: [
          {
            id: "vf_gear_1",
            name: "Wooden Qi-Gathering Talisman",
            rarity: 'common',
            baseValue: 20,
            slot: "neck",
            stats: { cultivationSpeed: 0.05 },
            set: "Beginner's Fortune"
          }
        ],
        consumables: [
          {
            id: "vf_potion_1",
            name: "Basic Healing Pill",
            duration: 300,
            effects: { hpRegen: 10 }
          }
        ]
      },
      crimson: {
        tier: 2,
        materials: [
          {
            id: "cw_herb_1",
            name: "Blazing Lotus Petal",
            type: "alchemy",
            baseValue: 35,
            effects: { fireResist: 0.1 }
          }
        ],
        gear: [
          {
            id: "cw_gear_1",
            name: "Flame-Resistance Charm",
            slot: "trinket",
            stats: { fireResist: 0.25 },
            set: "Phoenix Blessing"
          }
        ],
        specials: [
          {
            id: "cw_special_1",
            name: "Ember of the Phoenix",
            type: "clan",
            effects: { reviveAllies: true }
          }
        ]
      },
      abyssal: {
        tier: 3,
        materials: [
          {
            id: "at_mineral_1",
            name: "Abyssal Yin Metal",
            type: "crafting",
            baseValue: 45,
            requiredFor: { gear: ["abyssal"] }
          }
        ],
        consumables: [
          {
            id: "at_scroll_1",
            name: "Tidal Escape Scroll",
            effects: { instantTeleport: "safe_zone" }
          }
        ]
      },
      summit: {
        tier: 4,
        gear: [
          {
            id: "cs_gear_1",
            name: "Starfire Essence",
            slot: "relic",
            stats: { allDamage: 0.15 },
            set: "Cosmic Ascension"
          }
        ],
        progression: [
          {
            id: "cs_prog_1",
            name: "Tribulation-Proof Spirit Jade",
            unlocks: "Divine Tribulation Stage"
          }
        ]
      }
    },
    gearSets: {
      "Beginner's Fortune": {
        2: "Health regen +10/s",
        4: "Auto-collect common materials"
      },
      "Phoenix Blessing": {
        2: "Fire attacks ignite enemies",
        4: "Resurrect once per day"
      }
    },
    getRarity: function() {
      const roll = Math.random() * 100;
      if (roll < 60) return 'common';
      if (roll < 85) return 'uncommon';
      if (roll < 95) return 'rare';
      if (roll < 99) return 'epic';
      return 'legendary';
    },
  
    getRealmLoot: function(realmKey, playerLevel = 1) {
      const realm = this.realms[realmKey] || this.realms.verdant;
      const rarity = this.getRarity();
      const typeRoll = Math.random();
    
      // Define loot categories in priority order
      const lootSources = [
        realm.materials,
        realm.gear,
        realm.specials || [],
        realm.consumables || []
      ].filter(Array.isArray); // Remove undefined ones
    
      // Decide type based on weights, fallback to first valid pool
      let lootPool;
      if (typeRoll < 0.55 && realm.materials) lootPool = realm.materials;
      else if (typeRoll < 0.9 && realm.gear) lootPool = realm.gear;
      else lootPool = realm.specials || realm.consumables;
    
      // If lootPool is still undefined or empty, fallback to first valid pool
      if (!lootPool || lootPool.length === 0) {
        lootPool = lootSources[0];
      }
    
      const baseItem = lootPool[Math.floor(Math.random() * lootPool.length)];
      return this.augmentItem(baseItem, rarity, playerLevel);
    },
    
  
    augmentItem: function(item, rarity, playerLevel) {
      const rarityData = this.rarities[rarity];
      return {
        ...item,
        rarity,
        value: Math.floor(item.baseValue * rarityData.valueMultiplier * playerLevel),
        displayName: `${rarity} ${item.name}`,
        effects: this.getRarityEffects(item.effects, rarity)
      };
    },
  
    getRarityEffects: function(baseEffects, rarity) {
      const multiplier = {
        common: 1,
        uncommon: 1.5,
        rare: 2,
        epic: 3,
        legendary: 5
      }[rarity];
  
      return Object.fromEntries(
        Object.entries(baseEffects || {}).map(([key, val]) => 
          [key, typeof val === 'number' ? val * multiplier : val]
        )
      );
    }
  };

  function getSmartLoot(player) {
    const { realm, level, clan } = player;
    let loot = lootTables.getRealmLoot(realm, level);
  

    if (clan) {
      const luckBonus = clan.upgrades.luck || 0;
      if (Math.random() < luckBonus / 100) {
        loot = { ...loot, isClanBlessed: true };
      }
    }
  
    return loot;
  }
  
  module.exports = { 
    getSmartLoot,
    lootTables // For debugging
  };