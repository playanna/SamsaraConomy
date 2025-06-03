// Karmic Qi Techniques Database - Forbidden arts of karma theft and suffering
module.exports = {
  // === MORTAL TECHNIQUES (Karma-Bhāra to Māyā-Jāla) ===
  karmic_fist: {
    id: 'karmic_fist',
    name: 'Karmic Debt Strike',
    description: 'Channel stolen karma into your fists, striking with borrowed fate',
    damage: { min: 12, max: 18 },
    qiCost: 8,
    cooldown: 0,
    accuracy: 85,
    effects: ['armor_pierce'],
    flavor: 'Ghostly karmic threads coil around your fist as you strike with stolen destiny...',
    requiredCultivation: 1, // Karma-Bhāra
    masteryBonuses: {
      2: { damageBonus: 0.1 },
      5: { qiCostReduction: 0.2 },
      8: { effects: ['chance_stun'] },
      10: { damageBonus: 0.3, accuracy: 90 }
    },
    type: 'offensive',
    element: 'karma'
  },

  shadow_step: {
    id: 'shadow_step',
    name: 'Phantom Cicada Step',
    description: 'Move like the afterimage of stolen souls',
    damage: { min: 8, max: 12 },
    qiCost: 6,
    cooldown: 0,
    accuracy: 95,
    effects: ['evasion_boost'],
    flavor: 'You flicker like a cicada molting, leaving only shadows behind...',
    requiredCultivation: 2, // Yīn Chán
    masteryBonuses: {
      3: { effects: ['speed_boost'] },
      6: { damageBonus: 0.2 },
      9: { effects: ['ethereal'] },
      10: { qiCostReduction: 0.4 }
    },
    type: 'utility',
    element: 'shadow'
  },

  hunger_drain: {
    id: 'hunger_drain',
    name: 'Preta\'s Endless Hunger',
    description: 'Devour the life force of your enemies like a hungry ghost',
    damage: { min: 15, max: 22 },
    qiCost: 12,
    cooldown: 1,
    accuracy: 80,
    effects: ['life_steal'],
    healing: { min: 20, max: 30 }, // Percentage of damage dealt returned as health
    flavor: 'Your maw opens like a starving preta, consuming their very essence...',
    requiredCultivation: 3, // Preta-Gati
    masteryBonuses: {
      2: { healingBonus: 0.1 },
      4: { damageBonus: 0.15 },
      7: { effects: ['poison'] },
      10: { healingBonus: 0.3, cooldownReduction: 1 }
    },
    type: 'offensive',
    element: 'hunger'
  },

  // === SUFFERING TECHNIQUES (Durgati-Parivarta to Kālāgni) ===
  fate_weave: {
    id: 'fate_weave',
    name: 'Ill-Fate Weaving',
    description: 'Twist the threads of destiny to curse your enemy',
    damage: { min: 18, max: 25 },
    qiCost: 15,
    cooldown: 2,
    accuracy: 75,
    effects: ['despair', 'defense_reduction'],
    flavor: 'Reality warps as you knot false destinies around your foe...',
    requiredCultivation: 4, // Māyā-Jāla
    masteryBonuses: {
      3: { accuracy: 85 },
      5: { effects: ['fear'] },
      7: { damageBonus: 0.2 },
      10: { effects: ['curse_of_misfortune'] }
    },
    type: 'offensive',
    element: 'fate'
  },

  suffering_inversion: {
    id: 'suffering_inversion',
    name: 'Inversion of Suffering',
    description: 'Transform your pain into power, becoming stronger through agony',
    damage: { min: 0, max: 0 },
    qiCost: 20,
    cooldown: 4,
    accuracy: 100,
    effects: ['berserk', 'damage_reduction'],
    flavor: 'Your wounds become sources of power as suffering transforms into strength...',
    requiredCultivation: 5, // Durgati-Parivarta
    masteryBonuses: {
      2: { effects: ['reflect_damage'] },
      4: { cooldownReduction: 1 },
      6: { effects: ['pain_immunity'] },
      8: { duration: 2 },
      10: { effects: ['transcendent_agony'] }
    },
    type: 'enhancement',
    element: 'suffering'
  },

  karmic_restoration: {
    id: 'karmic_restoration',
    name: 'Stolen Life Restoration',
    description: 'Heal yourself by stealing the life force and karma of others',
    damage: { min: 0, max: 0 },
    qiCost: 18,
    cooldown: 3,
    accuracy: 100,
    effects: ['heal_self', 'life_steal_aura'],
    healing: { min: 25, max: 40 },
    flavor: 'Karmic threads reach out, drawing life from all around you...',
    requiredCultivation: 5, // Durgati-Parivarta
    masteryBonuses: {
      2: { healingBonus: 0.15 },
      4: { effects: ['cleanse_debuffs'] },
      6: { cooldownReduction: 1 },
      8: { healingBonus: 0.25 },
      10: { effects: ['karmic_immunity'] }
    },
    type: 'healing',
    element: 'karma'
  },

  naraka_gate: {
    id: 'naraka_gate',
    name: 'Herald of the Damned',
    description: 'Open a gateway to Naraka, unleashing hellish torment',
    damage: { min: 30, max: 45 },
    qiCost: 25,
    cooldown: 3,
    accuracy: 70,
    effects: ['true_damage', 'fear'],
    flavor: 'The gates of Naraka creak open, releasing the screams of the damned...',
    requiredCultivation: 6, // Naraka-Dvāra
    masteryBonuses: {
      3: { accuracy: 80 },
      5: { effects: ['burn'] },
      7: { damageBonus: 0.2 },
      10: { effects: ['summon_demons'] }
    },
    type: 'offensive',
    element: 'hell'
  },

  time_burn: {
    id: 'time_burn',
    name: 'Time\'s Pyre Sacrifice',
    description: 'Burn years of life for devastating power',
    damage: { min: 35, max: 55 },
    qiCost: 30,
    cooldown: 4,
    accuracy: 85,
    effects: ['burn', 'spiritual_damage'],
    flavor: 'Flames of lost time engulf your enemy as lifetimes turn to ash...',
    requiredCultivation: 7, // Kālāgni
    masteryBonuses: {
      3: { damageBonus: 0.15 },
      5: { effects: ['age_drain'] },
      7: { accuracy: 90 },
      10: { effects: ['temporal_stop'] }
    },
    type: 'offensive',
    element: 'time'
  },

  // === BLASPHEMOUS TECHNIQUES (Adharma-Avatāra to Māra-Rājya) ===
  unrighteous_aura: {
    id: 'unrighteous_aura',
    name: 'Avatar of Unrighteousness',
    description: 'Embody pure blasphemy, corrupting all around you',
    damage: { min: 40, max: 60 },
    qiCost: 35,
    cooldown: 5,
    accuracy: 80,
    effects: ['area_damage', 'corruption'],
    flavor: 'The cosmos recoils as your blasphemous aura spreads like a plague...',
    requiredCultivation: 8, // Adharma-Avatāra
    masteryBonuses: {
      3: { effects: ['despair'] },
      5: { damageBonus: 0.2 },
      7: { effects: ['reality_distortion'] },
      10: { effects: ['cosmic_rejection'] }
    },
    type: 'offensive',
    element: 'blasphemy'
  },

  infinite_agony: {
    id: 'infinite_agony',
    name: 'Crucible of Infinite Agony',
    description: 'Channel all suffering into a healing pool of torment',
    damage: { min: 0, max: 0 },
    qiCost: 40,
    cooldown: 6,
    accuracy: 100,
    effects: ['heal_self', 'absorb_all_debuffs'],
    healing: { min: 40, max: 60 },
    flavor: 'All pain flows into you, becoming the crucible where suffering transforms to vitality...',
    requiredCultivation: 9, // Asamkhya-Duḥkha
    masteryBonuses: {
      2: { healingBonus: 0.2 },
      4: { effects: ['pain_to_power'] },
      6: { cooldownReduction: 1 },
      8: { healingBonus: 0.3 },
      10: { effects: ['suffering_mastery'] }
    },
    type: 'healing',
    element: 'agony'
  },

  mara_usurpation: {
    id: 'mara_usurpation',
    name: 'Usurper of Māra\'s Throne',
    description: 'Command illusions so perfect even Māra bows before them',
    damage: { min: 50, max: 70 },
    qiCost: 45,
    cooldown: 5,
    accuracy: 75,
    effects: ['illusion_mastery', 'mind_control'],
    flavor: 'Even the King of Illusion kneels as your deceptions reshape reality...',
    requiredCultivation: 10, // Māra-Rājya
    masteryBonuses: {
      3: { accuracy: 85 },
      5: { effects: ['mass_confusion'] },
      7: { damageBonus: 0.25 },
      10: { effects: ['reality_rewrite'] }
    },
    type: 'offensive',
    element: 'illusion'
  },

  // === INFERNAL TECHNIQUES (Avīci-Cakra to Tathāgata-Droha) ===
  avici_wheel: {
    id: 'avici_wheel',
    name: 'Wheel of Avīci Grinding',
    description: 'Grind souls into karmic fuel with the wheel of endless torment',
    damage: { min: 60, max: 90 },
    qiCost: 50,
    cooldown: 6,
    accuracy: 85,
    effects: ['soul_damage', 'karma_drain'],
    flavor: 'Your soul becomes a grinding wheel, pulverizing the damned into pure power...',
    requiredCultivation: 11, // Avīci-Cakra
    masteryBonuses: {
      3: { damageBonus: 0.2 },
      5: { effects: ['permanent_soul_damage'] },
      7: { accuracy: 90 },
      10: { effects: ['avici_domain'] }
    },
    type: 'offensive',
    element: 'torment'
  },

  false_judgment: {
    id: 'false_judgment',
    name: 'False Judge of Hell',
    description: 'Decree punishments that even heaven fears to witness',
    damage: { min: 70, max: 100 },
    qiCost: 55,
    cooldown: 7,
    accuracy: 80,
    effects: ['divine_punishment', 'terror'],
    flavor: 'Your judgment echoes through realms as heaven itself trembles...',
    requiredCultivation: 12, // Yama-Dharma
    masteryBonuses: {
      3: { effects: ['mass_fear'] },
      5: { damageBonus: 0.3 },
      7: { effects: ['heaven_defiance'] },
      10: { effects: ['god_slaying'] }
    },
    type: 'offensive',
    element: 'judgment'
  },

  enlightenment_betrayal: {
    id: 'enlightenment_betrayal',
    name: 'Betrayer\'s Restoration',
    description: 'Steal enlightenment itself to achieve perfect healing',
    damage: { min: 0, max: 0 },
    qiCost: 60,
    cooldown: 8,
    accuracy: 100,
    effects: ['perfect_heal', 'steal_enlightenment'],
    healing: { min: 80, max: 100 },
    flavor: 'You spit upon Nirvana itself, stealing its perfect peace for your own restoration...',
    requiredCultivation: 13, // Tathāgata-Droha
    masteryBonuses: {
      2: { cooldownReduction: 1 },
      4: { effects: ['buddha_defiance'] },
      6: { healingBonus: 0.2 },
      8: { cooldownReduction: 2 },
      10: { effects: ['false_enlightenment'] }
    },
    type: 'healing',
    element: 'blasphemy'
  },

  // === APOCALYPTIC TECHNIQUES (Samsara-Bhūmi to Ananta-Agati) ===
  samsara_crack: {
    id: 'samsara_crack',
    name: 'Samsara\'s Despoiler',
    description: 'Crack the wheel of rebirth itself with your overwhelming corruption',
    damage: { min: 80, max: 120 },
    qiCost: 70,
    cooldown: 8,
    accuracy: 85,
    effects: ['true_damage', 'reality_break'],
    flavor: 'The wheel of rebirth cracks and bleeds as your weight shatters eternity...',
    requiredCultivation: 14, // Samsara-Bhūmi
    masteryBonuses: {
      3: { damageBonus: 0.25 },
      5: { effects: ['cycle_break'] },
      7: { accuracy: 90 },
      10: { effects: ['samsara_dominion'] }
    },
    type: 'offensive',
    element: 'entropy'
  },

  liberation_theft: {
    id: 'liberation_theft',
    name: 'Liberation\'s Thief',
    description: 'Steal the enlightenment of others to delay your own destruction',
    damage: { min: 0, max: 0 },
    qiCost: 75,
    cooldown: 10,
    accuracy: 100,
    effects: ['steal_moksha', 'temporary_immortality'],
    healing: { min: 60, max: 80 },
    flavor: 'You grasp the liberation of others, stealing their freedom to postpone your doom...',
    requiredCultivation: 15, // Moksha-Vimokṣa
    masteryBonuses: {
      2: { healingBonus: 0.3 },
      4: { effects: ['karmic_immunity'] },
      6: { cooldownReduction: 2 },
      8: { effects: ['death_immunity'] },
      10: { effects: ['ultimate_theft'] }
    },
    type: 'healing',
    element: 'theft'
  },

  endless_path: {
    id: 'endless_path',
    name: 'Endless Path of Corruption',
    description: 'You are no longer a cultivator - you ARE the corruption itself',
    damage: { min: 100, max: 150 },
    qiCost: 80,
    cooldown: 10,
    accuracy: 90,
    effects: ['apocalypse', 'universal_corruption'],
    flavor: 'Reality itself bends as you transcend cultivation to become pure, endless corruption...',
    requiredCultivation: 16, // Ananta-Agati
    masteryBonuses: {
      3: { damageBonus: 0.5 },
      5: { effects: ['existence_threat'] },
      7: { accuracy: 95 },
      10: { effects: ['omniversal_plague'] }
    },
    type: 'ultimate',
    element: 'corruption'
  }
};

// Helper function to calculate karmic debt cost using logarithmic scaling
// Helper function to calculate karmic debt cost using cubic scaling
function calculateTechniqueCost(technique) {
  if (!technique || !technique.requiredCultivation) {
    return 1000; // Default minimum cost for techniques without cultivation requirement
  }
  
  const cultivationLevel = technique.requiredCultivation;
  
  // Cubic scaling formula: baseCost + (growthRate * cultivationLevel^3) * multiplier
  // This creates a very steep rise at the start and sharp growth for higher levels
  const baseCost = 1000;
  const growthRate = 500; // Determines how steep the cost increases
  const multiplier = 2.0; // General multiplier for balancing
  
  // Calculate cost with cubic scaling
  let cost = Math.round(baseCost + (growthRate * Math.pow(cultivationLevel, 3)) * multiplier);
  
  // Apply technique type multipliers for balance
  const typeMultipliers = {
    'offensive': 1.0,
    'defensive': 0.8,
    'healing': 1.2,
    'utility': 0.9,
    'enhancement': 1.1,
    'ultimate': 3.0 // Increased multiplier for ultimate techniques
  };
  
  const typeMultiplier = typeMultipliers[technique.type] || 1.0;
  cost = Math.round(cost * typeMultiplier);
  
  // Add extra scaling for extremely high cultivation levels (10+)
  if (cultivationLevel >= 10) {
    const extraScaling = Math.pow(2.0, cultivationLevel - 9); // Exponential scaling for high levels
    cost = Math.round(cost * extraScaling);
  }
  
  // Add mega scaling for apocalyptic techniques (14+)
  if (cultivationLevel >= 14) {
    const apocalypticScaling = Math.pow(3.0, cultivationLevel - 13); // Stronger scaling for apocalyptic levels
    cost = Math.round(cost * apocalypticScaling);
  }
  
  return cost;
}

// Helper function to get techniques by cultivation level
function getTechniquesByCultivation(cultivationLevel) {
  const techniques = module.exports;
  const available = [];
  
  for (const [id, technique] of Object.entries(techniques)) {
    if (typeof technique === 'object' && technique.requiredCultivation) {
      // Check if player's cultivation level meets requirement
      if (cultivationLevel >= technique.requiredCultivation) {
        available.push(technique);
      }
    }
  }
  
  return available;
}

// Helper function to get technique by ID
function getTechniqueById(id) {
  return module.exports[id] || null;
}

// Helper function to get techniques by type
function getTechniquesByType(type) {
  const techniques = module.exports;
  const filtered = [];
  
  for (const [id, technique] of Object.entries(techniques)) {
    if (typeof technique === 'object' && technique.type === type) {
      filtered.push(technique);
    }
  }
  
  return filtered;
}

// Helper function to get techniques by element
function getTechniquesByElement(element) {
  const techniques = module.exports;
  const filtered = [];
  
  for (const [id, technique] of Object.entries(techniques)) {
    if (typeof technique === 'object' && technique.element === element) {
      filtered.push(technique);
    }
  }
  
  return filtered;
}

// Helper function to calculate technique effectiveness with mastery
function calculateTechniqueStats(technique, masteryLevel = 1) {
  const stats = {
    damage: { ...technique.damage },
    qiCost: technique.qiCost,
    cooldown: technique.cooldown,
    accuracy: technique.accuracy,
    effects: [...technique.effects],
    healing: technique.healing ? { ...technique.healing } : null
  };
  
  // Apply mastery bonuses
  if (technique.masteryBonuses && masteryLevel > 1) {
    for (let level = 2; level <= masteryLevel; level++) {
      const bonus = technique.masteryBonuses[level];
      if (bonus) {
        // Apply damage bonus
        if (bonus.damageBonus) {
          stats.damage.min = Math.floor(stats.damage.min * (1 + bonus.damageBonus));
          stats.damage.max = Math.floor(stats.damage.max * (1 + bonus.damageBonus));
        }
        
        // Apply healing bonus
        if (bonus.healingBonus && stats.healing) {
          stats.healing.min = Math.floor(stats.healing.min * (1 + bonus.healingBonus));
          stats.healing.max = Math.floor(stats.healing.max * (1 + bonus.healingBonus));
        }
        
        // Apply qi cost reduction
        if (bonus.qiCostReduction) {
          stats.qiCost = Math.floor(stats.qiCost * (1 - bonus.qiCostReduction));
        }
        
        // Apply cooldown reduction
        if (bonus.cooldownReduction) {
          stats.cooldown = Math.max(0, stats.cooldown - bonus.cooldownReduction);
        }
        
        // Apply accuracy bonus
        if (bonus.accuracy) {
          stats.accuracy = bonus.accuracy;
        }
        
        // Add new effects
        if (bonus.effects) {
          if (Array.isArray(bonus.effects)) {
            stats.effects.push(...bonus.effects);
          } else {
            stats.effects.push(bonus.effects);
          }
        }
      }
    }
  }
  
  return stats;
}

module.exports.getTechniquesByCultivation = getTechniquesByCultivation;
module.exports.getTechniqueById = getTechniqueById;
module.exports.getTechniquesByType = getTechniquesByType;
module.exports.getTechniquesByElement = getTechniquesByElement;
module.exports.calculateTechniqueStats = calculateTechniqueStats;
module.exports.calculateTechniqueCost = calculateTechniqueCost;
