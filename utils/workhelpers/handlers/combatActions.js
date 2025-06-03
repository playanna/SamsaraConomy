// Presumed imports - ensure these paths are correct for your project
const abilities = require('../../../data/abilities.js'); // Assuming this is a large object of ability definitions
const { calculateDamage } = require('./combatCalculator.js'); // Assuming calculateDamage(attack, defense)

// --- Configuration for Status Effects ---

const STATUS_EFFECT_CONFIG = {
    // Damage Over Time Effects
    poison: {
        type: 'dot',
        duration: 3, // Default duration when applied by an ability, if not specified otherwise
        onApplyMessage: (target) => target === 'player' ? ' Venom courses through your veins!' : ' The creature is poisoned!',        tick: (combat, targetName) => {
            const damage = Math.floor(Math.random() * 8) + 5;
            if (targetName === 'player') {
                combat.userCurrentHealth = Math.max(0, combat.userCurrentHealth - damage);
                return `👤 **[${combat.userDisplayName?.toUpperCase() || 'HERO'}]** 💚 Poison courses through your veins! (-${damage} HP)\n`;
            } else {
                combat.creatureCurrentHealth = Math.max(0, combat.creatureCurrentHealth - damage);
                const creatureName = combat.creature?.name || 'MONSTER';
                return `🐉 **[${creatureName.toUpperCase()}]** 💚 The creature writhes in poison! (-${damage} HP)\n`;
            }
        }
    },
    burn: {
        type: 'dot',
        duration: 3,
        onApplyMessage: (target) => target === 'player' ? ' You are set ablaze!' : ' The creature burns with inner fire!',        tick: (combat, targetName) => {
            const damage = Math.floor(Math.random() * 10) + 8;
            if (targetName === 'player') {
                combat.userCurrentHealth = Math.max(0, combat.userCurrentHealth - damage);
                return `👤 **[${combat.userDisplayName?.toUpperCase() || 'HERO'}]** 🔥 Flames consume your flesh! (-${damage} HP)\n`;
            } else {
                combat.creatureCurrentHealth = Math.max(0, combat.creatureCurrentHealth - damage);
                const creatureName = combat.creature?.name || 'MONSTER';
                return `🐉 **[${creatureName.toUpperCase()}]** 🔥 The creature burns with inner fire! (-${damage} HP)\n`;
            }
        }
    },
    bleeding: {
        type: 'dot',
        duration: 2,
        onApplyMessage: (target) => target === 'player' ? ' You begin to bleed!' : ' The creature bleeds!',        tick: (combat, targetName) => {
            const bleedDamage = Math.floor(Math.random() * 5) + 3;
            if (targetName === 'player') {
                combat.userCurrentHealth = Math.max(0, combat.userCurrentHealth - bleedDamage);
                return `👤 **[${combat.userDisplayName?.toUpperCase() || 'HERO'}]** 🩸 You lose ${bleedDamage} HP from bleeding!\n`;
            } else {
                combat.creatureCurrentHealth = Math.max(0, combat.creatureCurrentHealth - bleedDamage);
                const creatureName = combat.creature?.name || 'MONSTER';
                return `🐉 **[${creatureName.toUpperCase()}]** 🩸 The creature bleeds for ${bleedDamage} HP!\n`;
            }
        }
    },
    // Modifier Effects (applied at start of turn)
    fear: {
        type: 'modifier',
        duration: 2,
        onApplyMessage: (target) => target === 'player' ? ' Terror fills your heart!' : ' The creature cowers in fear!',
        modifiers: { attackReduction: 0.3, accuracyReduction: 0.2 },
        tickMessage: (target, combat) => target === 'player' ? `👤 **[${combat?.userDisplayName?.toUpperCase() || 'HERO'}]** 😰 Fear grips your heart, weakening your resolve!\n` : `🐉 **[MONSTER]** 😰 The creature is gripped by fear, its attacks falter!\n`
    },
    despair: {
        type: 'modifier',
        duration: 3,
        onApplyMessage: (target) => target === 'player' ? ' Overwhelming despair fills your heart!' : ' The creature is filled with despair!',
        modifiers: { attackReduction: 0.4, accuracyReduction: 0.3 },
        tickMessage: (target, combat) => target === 'player' ? `👤 **[${combat?.userDisplayName?.toUpperCase() || 'HERO'}]** 😭 Overwhelming despair crushes your spirit!\n` : `🐉 **[MONSTER]** 😭 The creature is crushed by despair, its movements hesitant!\n`
    },
    entangled: {
        type: 'modifier',
        duration: 2,
        onApplyMessage: (target) => target === 'player' ? ' You are entangled!' : ' The creature is entangled!',
        modifiers: { accuracyReduction: 0.5, evasionReduction: 0.4 }, // Note: original had accuracyReduction here, but in checkHit it increases hitChance (easier to hit). Clarified.
        tickMessage: (target, combat) => target === 'player' ? `👤 **[${combat?.userDisplayName?.toUpperCase() || 'HERO'}]** 🕸️ You struggle against your bindings!\n` : `🐉 **[MONSTER]** 🕸️ The creature struggles in bindings!\n`
    },
    slowed: {
        type: 'modifier',
        duration: 2,
        onApplyMessage: (target) => target === 'player' ? ' The water slows your movements!' : ' The creature is slowed by water!',
        modifiers: { speedReduction: 0.3 },
        tickMessage: (target, combat) => target === 'player' ? `👤 **[${combat?.userDisplayName?.toUpperCase() || 'HERO'}]** 🐌 Your movements are sluggish!\n` : `🐉 **[MONSTER]** 🐌 The creature's movements are sluggish!\n`    },
    // Simple Duration Effects (no specific tick logic other than countdown)
    stunned: { type: 'duration', duration: 1, onApplyMessage: (target) => target === 'player' ? ' You are stunned!' : ' The creature is stunned!' },
    defense_boost: { type: 'duration', duration: 3, onApplyMessage: (actor) => actor === 'player' ? ' Your defenses are strengthened!' : ' The creature\'s defenses harden!' },
    speed_boost: { type: 'duration', duration: 3, onApplyMessage: (actor) => actor === 'player' ? ' You feel lighter and faster!' : ' The creature moves with enhanced speed!' },
    evasion_boost: { type: 'duration', duration: 3, onApplyMessage: (actor) => actor === 'player' ? ' Your movements become more evasive!' : ' The creature becomes harder to hit!' },
    ethereal: { type: 'duration', duration: 2, onApplyMessage: (actor) => actor === 'player' ? ' You phase between dimensions!' : ' The creature becomes ethereal!' },
    damage_reduction: { type: 'duration', duration: 4, onApplyMessage: (actor) => actor === 'player' ? ' You are shielded from harm!' : ' The creature\'s form hardens!' },
    berserk: { type: 'duration', duration: 3, onApplyMessage: (actor) => actor === 'player' ? ' Rage fills your soul!' : ' The creature enters a berserker rage!' },
    reflect_damage: { type: 'duration', duration: 4, onApplyMessage: (actor) => actor === 'player' ? ' Your aura shimmers with reflective energy!' : ' Its skin shimmers with reflected power!' },
    minion_support: { type: 'duration', duration: 3, onApplyMessage: (actor) => actor === 'player' ? ' Your allies bolster your attacks!' : ' Minions appear to assist!' },
    knockdown: { type: 'duration', duration: 1, onApplyMessage: (target) => target === 'player' ? ' You are knocked to the ground!' : ' The creature is knocked down!' },
    
    // === NEW QI TECHNIQUE EFFECTS ===
    defense_reduction: { 
        type: 'modifier', 
        duration: 3, 
        onApplyMessage: (target) => target === 'player' ? ' Your defenses crumble!' : ' The creature\'s defenses weaken!',
        modifiers: { defenseReduction: 0.3 },
        tickMessage: (target, combat) => target === 'player' ? `👤 **[${combat?.userDisplayName?.toUpperCase() || 'HERO'}]** 🛡️ Your defenses are compromised!\n` : `🐉 **[MONSTER]** 🛡️ The creature's defenses are weakened!\n`
    },
    life_steal_aura: { 
        type: 'duration', 
        duration: 3, 
        onApplyMessage: (actor) => actor === 'player' ? ' Dark tendrils of life-drain surround you!' : ' The creature radiates vampiric energy!' 
    },
    temporary_immortality: { 
        type: 'duration', 
        duration: 1, 
        onApplyMessage: (actor) => actor === 'player' ? ' You transcend mortality itself!' : ' The creature becomes temporarily immortal!' 
    },
    corruption: {
        type: 'dot',
        duration: 4,
        onApplyMessage: (target) => target === 'player' ? ' Corruption spreads through your being!' : ' The creature is consumed by corruption!',
        tick: (combat, targetName) => {
            const damage = Math.floor(Math.random() * 12) + 8;
            if (targetName === 'player') {
                combat.userCurrentHealth = Math.max(0, combat.userCurrentHealth - damage);
                return `👤 **[${combat.userDisplayName?.toUpperCase() || 'HERO'}]** 🖤 Corruption eats at your soul! (-${damage} HP)\n`;
            } else {
                combat.creatureCurrentHealth = Math.max(0, combat.creatureCurrentHealth - damage);
                const creatureName = combat.creature?.name || 'MONSTER';
                return `🐉 **[${creatureName.toUpperCase()}]** 🖤 Corruption spreads through the creature! (-${damage} HP)\n`;
            }
        }
    },
    soul_damage: { 
        type: 'modifier', 
        duration: 2, 
        onApplyMessage: (target) => target === 'player' ? ' Your soul is wounded!' : ' The creature\'s essence is damaged!',
        modifiers: { soulDamage: true }, // Special flag for soul damage
        tickMessage: (target, combat) => target === 'player' ? `👤 **[${combat?.userDisplayName?.toUpperCase() || 'HERO'}]** 💀 Your soul bleeds!\n` : `🐉 **[MONSTER]** 💀 The creature's essence withers!\n`
    },
    karma_drain: { 
        type: 'duration', 
        duration: 2, 
        onApplyMessage: (target) => target === 'player' ? ' Your karma is being drained!' : ' The creature\'s karma is stolen!' 
    },
    pain_immunity: { 
        type: 'duration', 
        duration: 3, 
        onApplyMessage: (actor) => actor === 'player' ? ' You become immune to pain!' : ' The creature feels no pain!' 
    },
    transcendent_agony: { 
        type: 'duration', 
        duration: 4, 
        onApplyMessage: (actor) => actor === 'player' ? ' You transcend through absolute agony!' : ' The creature achieves transcendence through pain!' 
    },
    karmic_immunity: { 
        type: 'duration', 
        duration: 3, 
        onApplyMessage: (actor) => actor === 'player' ? ' You are immune to karmic effects!' : ' The creature transcends karma!' 
    },
    reality_distortion: { 
        type: 'modifier', 
        duration: 2, 
        onApplyMessage: (target) => target === 'player' ? ' Reality warps around you!' : ' Reality bends around the creature!',
        modifiers: { realityDistortion: true },
        tickMessage: (target, combat) => target === 'player' ? `👤 **[${combat?.userDisplayName?.toUpperCase() || 'HERO'}]** 🌀 Reality shifts unpredictably!\n` : `🐉 **[MONSTER]** 🌀 The creature phases through distorted reality!\n`
    },
    curse_of_misfortune: {
        type: 'modifier',
        duration: 4,
        onApplyMessage: (target) => target === 'player' ? ' You are cursed with terrible misfortune!' : ' The creature is cursed with ill fate!',
        modifiers: { accuracyReduction: 0.4, evasionReduction: 0.3 },
        tickMessage: (target, combat) => target === 'player' ? `👤 **[${combat?.userDisplayName?.toUpperCase() || 'HERO'}]** 🍀 Misfortune plagues your every move!\n` : `🐉 **[MONSTER]** 🍀 Ill fortune haunts the creature!\n`
    },
    suffering_mastery: { 
        type: 'duration', 
        duration: 5, 
        onApplyMessage: (actor) => actor === 'player' ? ' You master all forms of suffering!' : ' The creature becomes one with suffering!' 
    },
    enlightenment_theft: { 
        type: 'duration', 
        duration: 3, 
        onApplyMessage: (actor) => actor === 'player' ? ' Stolen enlightenment flows through you!' : ' The creature radiates stolen wisdom!' 
    },
    false_enlightenment: { 
        type: 'duration', 
        duration: 4, 
        onApplyMessage: (actor) => actor === 'player' ? ' False enlightenment corrupts your being!' : ' The creature is consumed by false wisdom!' 
    },
    
    // Ability-specific effects (handled by processAbilityEffects, but listed here for consistency if needed)
    chance_stun: { type: 'ability_trigger', onApplyMessage: (target) => target === 'player' ? ' You are stunned!' : ' The creature is stunned!' }, // Special handling in processAbilityEffects
    knockback: { 
        type: 'ability_trigger', 
        onApplyMessage: (target) => target === 'player' ? ' You are knocked back!' : ' The creature staggers back!',
        apply: (combat, targetName) => { combat.turnModifiers[targetName].stunChance = 0.3; }
    },
    area_damage: { type: 'ability_meta', onApplyMessage: () => ' The attack affects the entire area!' },
    spiritual_damage: { type: 'ability_meta', onApplyMessage: () => ' The attack strikes at your very soul!' },
    holy_damage: { type: 'ability_meta', onApplyMessage: () => ' Divine energy courses through the attack!' },
    metal_damage: { // This one is a trigger for 'bleeding'
        type: 'ability_trigger',
        apply: (combat, targetName) => {
            if (Math.random() < 0.3) {
                activateStatusEffect(combat, targetName, 'bleeding', 2); // Assuming bleeding has duration 2
                return STATUS_EFFECT_CONFIG.bleeding.onApplyMessage(targetName);
            }
            return '';
        }
    },
    flight: { // Applies other status effects
        type: 'ability_trigger',
        onApplyMessage: (actor) => actor === 'player' ? ' You take to the air!' : ' It takes to the air!',
        apply: (combat, actorName) => {
            activateStatusEffect(combat, actorName, 'evasion_boost', 3);
            activateStatusEffect(combat, actorName, 'speed_boost', 3);
        }
    },
    area_control: { // Applies effects to the opponent
        type: 'ability_trigger',
        onApplyMessage: () => ' The area becomes oppressive!',
        apply: (combat, targetName) => { // targetName here is the opponent of the user of area_control
            activateStatusEffect(combat, targetName, 'fear', 2);
            activateStatusEffect(combat, targetName, 'slowed', 2);
        }
    },
    // ... other specific ability effects might be defined here or handled directly if very unique
};

// --- Helper Functions ---

function ensureCombatEffectsInitialized(combat) {
    if (!combat.statusEffects) {
        combat.statusEffects = { player: {}, creature: {} };
    }
    if (!combat.turnModifiers) {
        combat.turnModifiers = { player: {}, creature: {} };
    }
}

function activateStatusEffect(combat, entityName, effectName, durationOverride) {
    ensureCombatEffectsInitialized(combat);
    const effectConfig = STATUS_EFFECT_CONFIG[effectName];
    if (!effectConfig) return;

    const currentDuration = combat.statusEffects[entityName][effectName] || 0;
    const applyDuration = durationOverride || effectConfig.duration || 1; // Default to 1 if no duration specified
    
    // Allow stacking durations or refreshing to max, depending on game design. Here, we refresh/set.
    combat.statusEffects[entityName][effectName] = Math.max(currentDuration, applyDuration);
}


// --- Core Combat Logic ---

function applyStatusEffects(combat, entityName) { // entityName is 'player' or 'creature'
    ensureCombatEffectsInitialized(combat);
    const effects = combat.statusEffects[entityName];
    const turnMods = combat.turnModifiers[entityName];
    let statusMessage = '';

    // Reset turn modifiers for the current entity
    combat.turnModifiers[entityName] = {};

    for (const effectName in effects) {
        if (effects[effectName] <= 0) { // Should not happen if cleanup is done right, but as a safeguard
            delete effects[effectName];
            continue;
        }

        const effectConfig = STATUS_EFFECT_CONFIG[effectName];
        if (!effectConfig) continue;

        if (effectConfig.type === 'dot' && effectConfig.tick) {
            statusMessage += effectConfig.tick(combat, entityName);
        } else if (effectConfig.type === 'modifier' && effectConfig.modifiers) {
            for (const mod in effectConfig.modifiers) {
                turnMods[mod] = (turnMods[mod] || 0) + effectConfig.modifiers[mod];
            }            if (effectConfig.tickMessage) {
                statusMessage += effectConfig.tickMessage(entityName, combat);
            }
        }
        // For all effects with a duration, decrement it
        if (typeof effects[effectName] === 'number') {
            effects[effectName]--;
            if (effects[effectName] <= 0) {
                delete effects[effectName];
            }
        }
    }
    return statusMessage;
}

function processAbilityEffects(combat, abilityName, attackerName, targetName) {
    const abilityData = abilities[abilityName];
    if (!abilityData || !abilityData.effects || abilityData.effects.length === 0) return '';
    
    ensureCombatEffectsInitialized(combat);
    let effectMessages = [];

    for (const effectKey of abilityData.effects) {
        const effectConfig = STATUS_EFFECT_CONFIG[effectKey];
        if (!effectConfig) {
            console.warn(`Unknown effect key: ${effectKey} in ability ${abilityName}`);
            continue;
        }

        let message = '';
        // Determine the actual subject of the effect (attacker or target)
        // This logic might need refinement based on how effects are designed (e.g., self-buffs vs. debuffs)
        let effectSubjectName = targetName; // Default to target
        if (['defense_boost', 'speed_boost', 'evasion_boost', 'ethereal', 'damage_reduction', 'berserk', 'reflect_damage', 'minion_support', 'flight'].includes(effectKey)) {
            effectSubjectName = attackerName;
        }
        
        if (effectConfig.onApplyMessage) {
            message += effectConfig.onApplyMessage(effectSubjectName); // Pass subject for message context
        }

        if (effectConfig.type === 'ability_trigger' && effectConfig.apply) {
            // For area_control, the 'targetName' passed to apply should be the opponent
            const applyTarget = (effectKey === 'area_control') ? targetName : effectSubjectName;
            const applyMessage = effectConfig.apply(combat, applyTarget, attackerName, abilityData); // Pass attacker too if needed by 'apply'
            if(applyMessage) message += applyMessage;

        } else if (effectKey === 'chance_stun') { // Special case for probability-based effects
            if (Math.random() < 0.3) { // Stun chance
                activateStatusEffect(combat, targetName, 'stunned', 1); // stun has its own config
                if(STATUS_EFFECT_CONFIG.stunned.onApplyMessage) { // Get message from stun's config
                     message += STATUS_EFFECT_CONFIG.stunned.onApplyMessage(targetName);
                } else {
                     message += targetName === 'player' ? ' You are stunned!' : ' The creature is stunned!';
                }
            }
        } else if (effectConfig.type !== 'ability_meta' && effectConfig.type !== 'ability_trigger') {
             // For DoTs, modifiers, simple duration effects, activate them on the subject
            activateStatusEffect(combat, effectSubjectName, effectKey, effectConfig.duration);
        }
        // Meta effects might just add to message, handled by onApplyMessage

        if (message) effectMessages.push(message.trim());
    }
    return effectMessages.length > 0 ? ' ' + effectMessages.join(' ') : '';
}


function calculateModifiedDamage(combat, baseDamage, abilityData, attackerName, targetName) {
    ensureCombatEffectsInitialized(combat);
    let finalDamage = baseDamage;

    const attacker = { name: attackerName, stats: attackerName === 'player' ? combat.userStats : combat.creature, effects: combat.statusEffects[attackerName] || {}, turnMods: combat.turnModifiers[attackerName] || {} };
    const target = { name: targetName, stats: targetName === 'player' ? combat.userStats : combat.creature, effects: combat.statusEffects[targetName] || {}, turnMods: combat.turnModifiers[targetName] || {} };
    
    const abilityEffects = new Set(abilityData.effects || []);

    // Damage type modifications (vs defense)
    if (abilityEffects.has('true_damage')) {
        // finalDamage remains baseDamage (ignores defense, which was already bypassed for baseDamage if it's pre-calculated)
        // If baseDamage was attack value, then this is where we'd skip defense.
        // Assuming baseDamage from abilityData.damage is already 'raw' before defense.
    } else if (abilityEffects.has('armor_pierce')) {
        const reducedDefense = Math.floor(target.stats.defense * 0.5);
        finalDamage = calculateDamage(baseDamage, reducedDefense); // baseDamage here is raw attack power
    } else if (abilityEffects.has('spiritual_damage')) {
        const spiritualDefense = Math.floor(target.stats.defense * 0.7);
        finalDamage = calculateDamage(baseDamage, spiritualDefense);
    } else if (abilityEffects.has('holy_damage')) {
        let modifier = 1.0;
        if (target.name === 'creature' && (target.stats.element === 'void' || target.stats.element === 'divine-dark')) {
            modifier = 1.3;
        }
        finalDamage = Math.floor(calculateDamage(baseDamage, target.stats.defense) * modifier);
    } else {
        finalDamage = calculateDamage(baseDamage, target.stats.defense); // baseDamage is raw attack power from ability/stats
    }

    // Apply status effect modifiers
    if (attacker.effects.berserk) finalDamage = Math.floor(finalDamage * 1.5);
    if (attacker.effects.minion_support) finalDamage = Math.floor(finalDamage * 1.2);
    if (attacker.turnMods.attackReduction) finalDamage = Math.floor(finalDamage * (1 - attacker.turnMods.attackReduction));

    if (target.effects.damage_reduction) finalDamage = Math.floor(finalDamage * 0.7);
    if (target.effects.defense_boost) finalDamage = Math.floor(finalDamage * 0.8);
    if (target.effects.knockdown) finalDamage = Math.floor(finalDamage * 1.3); // More vulnerable

    if (target.effects.ethereal && Math.random() < 0.4) return 0; // Attack phases through

    return Math.max(1, finalDamage);
}

function checkHit(combat, abilityData, attackerName, targetName) {
    ensureCombatEffectsInitialized(combat);
    let hitChance = (abilityData.accuracy || 85) / 100; // Default accuracy 85%

    const attacker = { turnMods: combat.turnModifiers[attackerName] || {} };
    const target = { effects: combat.statusEffects[targetName] || {}, turnMods: combat.turnModifiers[targetName] || {} };

    if (attacker.turnMods.accuracyReduction) hitChance *= (1 - attacker.turnMods.accuracyReduction);
    
    if (target.effects.evasion_boost) hitChance *= 0.7;
    if (target.effects.speed_boost) hitChance *= 0.85;
    if (target.effects.ethereal) hitChance *= 0.6;
    
    // Effects making target easier to hit
    if (target.effects.entangled) hitChance *= 1.4; // Was affecting accuracyReduction, now directly impacts hitChance.
    if (target.effects.knockdown) hitChance *= 1.5;
    if (target.effects.slowed) hitChance *= 1.2;

    if (target.turnMods.evasionReduction) hitChance *= (1 + target.turnMods.evasionReduction); // e.g. from entangle

    return Math.random() < Math.min(0.95, Math.max(0.05, hitChance)); // Cap between 5% and 95%
}

// --- User Actions ---

async function processUserAttack(combat) {
    ensureCombatEffectsInitialized(combat);
    let statusMessage = applyStatusEffects(combat, 'player');

    const playerEffects = combat.statusEffects.player || {};
    const playerTurnMods = combat.turnModifiers.player || {};
    const creatureEffects = combat.statusEffects.creature || {};    if (playerEffects.stunned) {
        // Stun already decremented in applyStatusEffects
        return statusMessage + `👤 **[${combat.userDisplayName?.toUpperCase() || 'HERO'}]** ⚡ You are stunned and cannot attack this turn!`;
    }    // Enhanced attack damage calculation with critical hit support
    let rawDamage = combat.userStats.attack; // Use persistent attack stat from database
    
    // Use improved damage calculation with critical hit chance
    const { calculateDamageWithInfo } = require('./combatCalculator');
    const damageInfo = calculateDamageWithInfo(rawDamage, combat.creature.defense);
    let finalDamage = damageInfo.damage;

    // Apply relevant modifiers (subset of calculateModifiedDamage)
    if (playerEffects.berserk) finalDamage = Math.floor(finalDamage * 1.5);
    if (playerTurnMods.attackReduction) finalDamage = Math.floor(finalDamage * (1 - playerTurnMods.attackReduction));
    
    if (creatureEffects.damage_reduction) finalDamage = Math.floor(finalDamage * 0.7);    if (creatureEffects.ethereal && Math.random() < 0.4) {
        return statusMessage + `👤 **[${combat.userDisplayName?.toUpperCase() || 'HERO'}]** 👻 Your attack phases harmlessly through the ethereal creature!`;
    }
    if (creatureEffects.defense_boost) finalDamage = Math.floor(finalDamage * 0.8); // Added, was missing from original basic attack but logical

    finalDamage = Math.max(1, finalDamage);

    if (creatureEffects.reflect_damage) {
        const reflectedDamage = Math.floor(finalDamage * 0.3);
        combat.userCurrentHealth = Math.max(0, combat.userCurrentHealth - reflectedDamage);
        statusMessage += `🛡️ The creature's reflective aura burns you for ${reflectedDamage} damage! `;
    }    combat.creatureCurrentHealth = Math.max(0, combat.creatureCurrentHealth - finalDamage);

    // Enhanced attack flavors with critical hit support
    let attackMessage;
    if (damageInfo.isCritical) {
        const criticalFlavors = [
            `💥 **CRITICAL HIT!** Your perfect strike devastates for ${finalDamage} damage!`,
            `⚡ **DEVASTATING BLOW!** You find a vital point, dealing ${finalDamage} critical damage!`,
            `🎯 **FLAWLESS EXECUTION!** Your technique is perfect, inflicting ${finalDamage} damage!`,
            `💫 **TRANSCENDENT STRIKE!** You channel pure qi for ${finalDamage} critical damage!`
        ];
        attackMessage = criticalFlavors[Math.floor(Math.random() * criticalFlavors.length)];
    } else {
        const attackFlavors = [
            `You strike with righteous fury, dealing ${finalDamage} damage!`,
            `Your blade finds its mark for ${finalDamage} damage!`,
            `Channeling your qi, you deliver ${finalDamage} damage!`,
            `A solid strike! ${finalDamage} damage dealt!`,
            `Your martial prowess shows, inflicting ${finalDamage} damage!`,
            `With focused intent, you deal ${finalDamage} damage!`
        ];
        attackMessage = attackFlavors[Math.floor(Math.random() * attackFlavors.length)];
    }
    
    return statusMessage + `👤 **[${combat.userDisplayName?.toUpperCase() || 'HERO'}]** ` + attackMessage;
}

async function processUserDefend(combat) {
    ensureCombatEffectsInitialized(combat);
    let statusMessage = applyStatusEffects(combat, 'player');
    
    // Player might be stunned, but defend is usually still possible or has a different outcome.
    // Original code didn't prevent defend if stunned. Assuming that's intended.
    // If stun should prevent defend, add:
    // if (combat.statusEffects.player && combat.statusEffects.player.stunned) {
    //    return statusMessage + "⚡ You are stunned and cannot defend!";
    // }

    const healAmount = Math.floor(combat.userStats.maxHealth * 0.1);
    combat.userCurrentHealth = Math.min(combat.userStats.maxHealth, combat.userCurrentHealth + healAmount);

    activateStatusEffect(combat, 'player', 'defense_boost', 2); // Duration of 2 turns for defend
    activateStatusEffect(combat, 'player', 'damage_reduction', 2);

    return statusMessage + `👤 **[${combat.userDisplayName?.toUpperCase() || 'HERO'}]** 🛡️ You focus your qi defensively, restoring ${healAmount} HP and increasing your guard!`;
}

async function processUserSpecial(combat) {
    ensureCombatEffectsInitialized(combat);
    let statusMessage = applyStatusEffects(combat, 'player');

    const playerEffects = combat.statusEffects.player || {};
    const playerTurnMods = combat.turnModifiers.player || {};
    const creatureEffects = combat.statusEffects.creature || {};    if (playerEffects.stunned) {
        return statusMessage + `👤 **[${combat.userDisplayName?.toUpperCase() || 'HERO'}]** ⚡ You are stunned and cannot use special techniques this turn!`;
    }

    const baseDamage = combat.userStats.attack * 1.5; // Raw power for special
    const cost = Math.floor(combat.userStats.maxHealth * 0.05);
      if (combat.userCurrentHealth <= cost && cost > 0) { // Check if player can afford the cost
        return statusMessage + `👤 **[${combat.userDisplayName?.toUpperCase() || 'HERO'}]** 💔 Not enough HP to use the special technique!`;
    }


    // Using a simplified damage calculation similar to processUserAttack for special.
    // For more complex specials, they should be defined as abilities and use calculateModifiedDamage.
    let finalDamage = calculateDamage(baseDamage, combat.creature.defense);

    if (playerEffects.berserk) finalDamage = Math.floor(finalDamage * 1.5);
    if (playerTurnMods.attackReduction) finalDamage = Math.floor(finalDamage * (1 - playerTurnMods.attackReduction));

    if (creatureEffects.damage_reduction) finalDamage = Math.floor(finalDamage * 0.7);    if (creatureEffects.ethereal && Math.random() < 0.4) {
        if (cost > 0) combat.userCurrentHealth = Math.max(1, combat.userCurrentHealth - cost);
        return statusMessage + `👤 **[${combat.userDisplayName?.toUpperCase() || 'HERO'}]** 👻 Your special technique phases harmlessly through the ethereal creature!`;
    }
    if (creatureEffects.defense_boost) finalDamage = Math.floor(finalDamage * 0.8);

    finalDamage = Math.max(1, finalDamage);

    if (creatureEffects.reflect_damage) {
        const reflectedDamage = Math.floor(finalDamage * 0.3);
        combat.userCurrentHealth = Math.max(0, combat.userCurrentHealth - reflectedDamage);
        statusMessage += `🛡️ The creature's reflective aura burns you for ${reflectedDamage} damage! `;
    }
    
    combat.creatureCurrentHealth = Math.max(0, combat.creatureCurrentHealth - finalDamage);
    if (cost > 0) combat.userCurrentHealth = Math.max(1, combat.userCurrentHealth - cost);
    const specialFlavors = [
        `🌟 Heavenly Sword Technique! ${finalDamage} damage dealt at the cost of ${cost} HP!`,
        `✨ Nine Suns Palm Strike! A devastating ${finalDamage} damage for ${cost} HP!`,
        `⚡ Lightning Dao Fist! ${finalDamage} damage erupts from your qi core, costing ${cost} HP!`
    ];
    return statusMessage + `👤 **[${combat.userDisplayName?.toUpperCase() || 'HERO'}]** ` + specialFlavors[Math.floor(Math.random() * specialFlavors.length)];
}

// --- Creature's Turn ---

async function processCreatureTurn(combat) {
    ensureCombatEffectsInitialized(combat);
    let statusMessage = applyStatusEffects(combat, 'creature');

    const creatureEffects = combat.statusEffects.creature || {};    if (creatureEffects.stunned) {
        return statusMessage + `🐉 **[${combat.creature.name.toUpperCase()}]** ⚡ ${combat.creature.name} is stunned and cannot act this turn!`;
    }    const creature = combat.creature;
    const availableAbilities = creature.abilities.filter(abilityName => abilities[abilityName]); // Filter out potentially missing abilities
    
    if (availableAbilities.length === 0) { // Fallback if no valid abilities
        const damage = calculateDamage(creature.attack, combat.userStats.defense);
        combat.userCurrentHealth = Math.max(0, combat.userCurrentHealth - damage);
        return statusMessage + `🐉 **[${creature.name.toUpperCase()}]** ${creature.name} thrashes wildly for ${damage} damage!`;
    }

    const abilityName = availableAbilities[Math.floor(Math.random() * availableAbilities.length)];
    const abilityData = abilities[abilityName];

    let resultMessage = statusMessage;    if (!checkHit(combat, abilityData, 'creature', 'player')) {
        return resultMessage + `🐉 **[${combat.creature.name.toUpperCase()}]** 💨 ${abilityData.name || 'Attack'}: ${abilityData.flavor || 'The creature lunges...'} (Miss!)`;
    }

    // Base damage from ability or creature stats
    let baseAbilityPower = 0;
    if (abilityData.damage && abilityData.damage.max > 0) {
        baseAbilityPower = Math.floor(Math.random() * (abilityData.damage.max - abilityData.damage.min + 1)) + abilityData.damage.min;
    } else if (abilityData.damage && typeof abilityData.damage === 'number') { // If damage is a flat number
        baseAbilityPower = abilityData.damage;
    } else if (!abilityData.damage && Object.keys(abilityData.effects || {}).length > 0) { // No damage, but has effects
         baseAbilityPower = 0; // Purely effect-based ability
    } else { // Fallback to creature's base attack if ability has no damage spec
        baseAbilityPower = creature.attack; 
    }


    if (baseAbilityPower > 0 || (abilityData.damage && (abilityData.damage.min > 0 || typeof abilityData.damage === 'number' && abilityData.damage > 0) ) ) {
        const finalDamage = calculateModifiedDamage(combat, baseAbilityPower, abilityData, 'creature', 'player');
          if (finalDamage > 0) {
            combat.userCurrentHealth = Math.max(0, combat.userCurrentHealth - finalDamage);
            resultMessage += `🐉 **[${combat.creature.name.toUpperCase()}]** 💥 ${abilityData.name}: ${abilityData.flavor} (${finalDamage} damage)`;

            if (abilityData.effects && abilityData.effects.includes('life_steal')) {
                const healAmount = Math.floor(finalDamage * (abilityData.lifeStealModifier || 0.5)); // Allow lifeStealModifier in abilityData
                combat.creatureCurrentHealth = Math.min(creature.health, combat.creatureCurrentHealth + healAmount);
                resultMessage += ` It drains ${healAmount} HP!`;
            }
        } else {
             resultMessage += `🐉 **[${combat.creature.name.toUpperCase()}]** 🛡️ ${abilityData.name}: ${abilityData.flavor} (Blocked or Phased Through!)`;
        }    } else { // Non-damaging ability or ability that missed its damage phase but still applies effects
        resultMessage += `🐉 **[${combat.creature.name.toUpperCase()}]** ✨ ${abilityData.name}: ${abilityData.flavor}`;
    }

    // Process all other effects of the ability (buffs, debuffs, etc.)
    const effectMessage = processAbilityEffects(combat, abilityName, 'creature', 'player');
    if (effectMessage) {
        resultMessage += effectMessage;
    }

    return resultMessage;
}

// Process qi technique usage
async function processQiTechnique(combat, techniqueId, userId) {
    const { getTechniqueWithMastery, canUseTechnique, useTechnique, applyCooldown } = require('./qiTechniqueManager.js');
    const { getUserEquippedTechniques } = require('./qiTechniqueManager.js');
    
    ensureCombatEffectsInitialized(combat);
    let statusMessage = applyStatusEffects(combat, 'player');

    const playerEffects = combat.statusEffects.player || {};
    
    // Check if player is stunned
    if (playerEffects.stunned) {
        return statusMessage + `👤 **[${combat.userDisplayName?.toUpperCase() || 'HERO'}]** ⚡ You are stunned and cannot use qi techniques this turn!`;
    }

    // Get user's equipped technique
    const equippedTechniques = await getUserEquippedTechniques(userId);
    const userTechnique = equippedTechniques.find(slot => slot.techniqueId === techniqueId);
    
    if (!userTechnique) {
        return statusMessage + `👤 **[${combat.userDisplayName?.toUpperCase() || 'HERO'}]** ❌ Technique not found or not equipped!`;
    }

    // Get technique data with mastery bonuses
    const technique = getTechniqueWithMastery(techniqueId, userTechnique.masteryLevel);
    if (!technique) {
        return statusMessage + `👤 **[${combat.userDisplayName?.toUpperCase() || 'HERO'}]** ❌ Invalid technique data!`;
    }

    // Check if technique can be used
    const usageCheck = canUseTechnique(combat, technique, userTechnique);
    if (!usageCheck.canUse) {
        let reason;
        if (usageCheck.reason === 'insufficient_qi') {
            reason = 'Not enough qi to use this technique!';
        } else if (usageCheck.reason === 'on_cooldown') {
            reason = `Technique is on cooldown for ${usageCheck.cooldownRemaining} more turn(s)!`;
        } else {
            reason = 'Cannot use technique right now!';
        }
        return statusMessage + `👤 **[${combat.userDisplayName?.toUpperCase() || 'HERO'}]** ❌ ${reason}`;
    }

    // Calculate qi cost
    const qiCost = technique.qiCost || Math.floor(combat.userStats.maxHealth * 0.1); // Default to 10% of max health if not specified
    
    // Deduct qi cost
    combat.userCurrentHealth = Math.max(1, combat.userCurrentHealth - qiCost);

    // Apply technique cooldown
    if (technique.cooldown > 0) {
        applyCooldown(combat, techniqueId, technique.cooldown);
    }

    // Process technique effects
    let resultMessage = statusMessage;
    let damage = 0;
      // Calculate damage if technique deals damage
    if (technique.damage && technique.damage.max > 0) {
        // Calculate technique bonus damage
        const techniqueDamage = Math.floor(Math.random() * (technique.damage.max - technique.damage.min + 1)) + technique.damage.min;
        
        // Add technique damage to player's base attack for total damage
        const totalBaseDamage = combat.userStats.attack + techniqueDamage;
        const opponentdef = 0 // Fallback to 0 if defense is not defined
        damage = calculateDamage(totalBaseDamage, opponentdef);
        
        // Apply player modifiers
        const playerTurnMods = combat.turnModifiers.player || {};
        if (playerEffects.berserk) damage = Math.floor(damage * 1.5);
        if (playerTurnMods.attackReduction) damage = Math.floor(damage * (1 - playerTurnMods.attackReduction));
        
        // Apply creature defenses
        const creatureEffects = combat.statusEffects.creature || {};
        if (creatureEffects.damage_reduction) damage = Math.floor(damage * 0.7);
        if (creatureEffects.defense_boost) damage = Math.floor(damage * 0.8);
        
        // Check for ethereal miss
        if (creatureEffects.ethereal && Math.random() < 0.4) {
            resultMessage += `👤 **[${combat.userDisplayName?.toUpperCase() || 'HERO'}]** 👻 ${technique.name}: ${technique.flavor} (Phases through ethereal enemy!)`;
            await useTechnique(userId, techniqueId);
            return resultMessage;
        }
        
        damage = Math.max(1, damage);
        
        // Apply damage
        combat.creatureCurrentHealth = Math.max(0, combat.creatureCurrentHealth - damage);
        
        // Handle damage reflection
        if (creatureEffects.reflect_damage) {
            const reflectedDamage = Math.floor(damage * 0.3);
            combat.userCurrentHealth = Math.max(0, combat.userCurrentHealth - reflectedDamage);
            resultMessage += `🛡️ The creature's reflective aura burns you for ${reflectedDamage} damage! `;
        }
    }
    
    // Process technique effects
    if (technique.effects && technique.effects.length > 0) {
        resultMessage += processQiTechniqueEffects(combat, technique.effects, technique, userId);
    }
      // Create technique usage message
    const techniqueMessage = damage > 0 ? 
        `✨ ${technique.name}! ${damage} total damage for ${qiCost} health! ${technique.flavor}` :
        `✨ ${technique.name}! ${qiCost} qi consumed. ${technique.flavor}`;
    
    resultMessage += `👤 **[${combat.userDisplayName?.toUpperCase() || 'HERO'}]** ${techniqueMessage}`;
    
    // Update technique usage statistics
    await useTechnique(userId, techniqueId);
    
    return resultMessage;
}

// Process qi technique special effects
function processQiTechniqueEffects(combat, effects, technique, userId) {
    let effectMessage = '';
    
    for (const effect of effects) {
        switch (effect) {
            // === HEALING EFFECTS ===
            case 'heal_self':
                const healAmount = technique.healing ? 
                    Math.floor(Math.random() * (technique.healing.max - technique.healing.min + 1)) + technique.healing.min :
                    Math.floor(combat.userStats.maxHealth * 0.3);
                const actualHeal = Math.floor(combat.userStats.maxHealth * (healAmount / 100));
                combat.userCurrentHealth = Math.min(combat.userStats.maxHealth, combat.userCurrentHealth + actualHeal);
                effectMessage += ` Restored ${actualHeal} HP!`;
                break;
                
            case 'full_heal':
            case 'perfect_heal':
                const fullHealAmount = combat.userStats.maxHealth - combat.userCurrentHealth;
                combat.userCurrentHealth = combat.userStats.maxHealth;
                effectMessage += ` Fully restored ${fullHealAmount} HP!`;
                break;
                
            case 'life_steal':
                const stealAmount = Math.floor(combat.userStats.maxHealth * 0.15);
                combat.userCurrentHealth = Math.min(combat.userStats.maxHealth, combat.userCurrentHealth + stealAmount);
                effectMessage += ` Drained ${stealAmount} life force!`;
                break;
                
            case 'life_steal_aura':
                activateStatusEffect(combat, 'player', 'life_steal_aura', 3);
                effectMessage += ' Life-draining aura activated!';
                break;
                
            // === DAMAGE MODIFIERS ===
            case 'armor_pierce':
            case 'true_damage':
                effectMessage += ' Ignores all defenses!';
                break;
                
            case 'spiritual_damage':
                effectMessage += ' Strikes at the very soul!';
                break;
                
            case 'soul_damage':
                effectMessage += ' Damages the essence itself!';
                break;
                
            case 'karma_drain':
                const karmaDrain = Math.floor(Math.random() * 10) + 5;
                combat.creatureCurrentHealth = Math.max(0, combat.creatureCurrentHealth - karmaDrain);
                effectMessage += ` Karma drained for ${karmaDrain} additional damage!`;
                break;
                
            // === STATUS CLEANSING ===
            case 'cleanse_debuffs':
                const playerDebuffs = ['poison', 'burn', 'fear', 'despair', 'entangled', 'slowed', 'stunned'];
                let cleansedCount = 0;
                for (const debuff of playerDebuffs) {
                    if (combat.statusEffects.player[debuff]) {
                        delete combat.statusEffects.player[debuff];
                        cleansedCount++;
                    }
                }
                effectMessage += cleansedCount > 0 ? ` Cleansed ${cleansedCount} debuff(s)!` : ' No debuffs to cleanse.';
                break;
                
            case 'cleanse_all':
                combat.statusEffects.player = {};
                effectMessage += ' All effects cleansed!';
                break;
                
            case 'absorb_all_debuffs':
                const allDebuffs = Object.keys(combat.statusEffects.player);
                let absorbedPower = 0;
                for (const debuff of allDebuffs) {
                    absorbedPower += combat.statusEffects.player[debuff] * 5;
                    delete combat.statusEffects.player[debuff];
                }
                if (absorbedPower > 0) {
                    combat.userCurrentHealth = Math.min(combat.userStats.maxHealth, combat.userCurrentHealth + absorbedPower);
                    effectMessage += ` Absorbed suffering for ${absorbedPower} HP!`;
                }
                break;
                
            // === SELF BUFFS ===
            case 'damage_reduction':
                activateStatusEffect(combat, 'player', 'damage_reduction', 4);
                effectMessage += ' Damage resistance activated!';
                break;
                
            case 'defense_boost':
                activateStatusEffect(combat, 'player', 'defense_boost', 3);
                effectMessage += ' Defenses strengthened!';
                break;
                
            case 'speed_boost':
                activateStatusEffect(combat, 'player', 'speed_boost', 3);
                effectMessage += ' Movement enhanced!';
                break;
                
            case 'evasion_boost':
                activateStatusEffect(combat, 'player', 'evasion_boost', 3);
                effectMessage += ' Evasion increased!';
                break;
                
            case 'ethereal':
                activateStatusEffect(combat, 'player', 'ethereal', 2);
                effectMessage += ' You phase between dimensions!';
                break;
                
            case 'berserk':
                activateStatusEffect(combat, 'player', 'berserk', 3);
                effectMessage += ' Rage fills your soul!';
                break;
                
            case 'reflect_damage':
                activateStatusEffect(combat, 'player', 'reflect_damage', 4);
                effectMessage += ' Reflective aura activated!';
                break;
                
            case 'temporary_immortality':
            case 'death_immunity':
                activateStatusEffect(combat, 'player', 'temporary_immortality', 1);
                effectMessage += ' You become temporarily immortal!';
                break;
                
            case 'temporary_invulnerability':
                activateStatusEffect(combat, 'player', 'ethereal', 2);
                activateStatusEffect(combat, 'player', 'damage_reduction', 2);
                effectMessage += ' You become invulnerable!';
                break;
                
            // === ENEMY DEBUFFS ===
            case 'chance_stun':
                if (Math.random() < 0.3) {
                    activateStatusEffect(combat, 'creature', 'stunned', 1);
                    effectMessage += ' Target stunned!';
                }
                break;
                
            case 'fear':
                activateStatusEffect(combat, 'creature', 'fear', 2);
                effectMessage += ' Terror grips the enemy!';
                break;
                
            case 'despair':
                activateStatusEffect(combat, 'creature', 'despair', 3);
                effectMessage += ' Overwhelming despair crushes the enemy!';
                break;
                
            case 'defense_reduction':
                activateStatusEffect(combat, 'creature', 'defense_reduction', 3);
                effectMessage += ' Enemy defenses crumble!';
                break;
                
            case 'slowed':
                activateStatusEffect(combat, 'creature', 'slowed', 2);
                effectMessage += ' Enemy movements slowed!';
                break;
                
            case 'entangled':
                activateStatusEffect(combat, 'creature', 'entangled', 2);
                effectMessage += ' Enemy bound by dark threads!';
                break;
                
            case 'poison':
                activateStatusEffect(combat, 'creature', 'poison', 3);
                effectMessage += ' Karmic poison courses through the enemy!';
                break;
                
            case 'burn':
                activateStatusEffect(combat, 'creature', 'burn', 3);
                effectMessage += ' Enemy set ablaze by dark flames!';
                break;
                
            // === SPECIAL KARMIC EFFECTS ===
            case 'corruption':
                activateStatusEffect(combat, 'creature', 'poison', 4);
                activateStatusEffect(combat, 'creature', 'defense_reduction', 3);
                effectMessage += ' Corruption spreads through the enemy!';
                break;
                
            case 'curse_of_misfortune':
                activateStatusEffect(combat, 'creature', 'despair', 4);
                activateStatusEffect(combat, 'creature', 'defense_reduction', 4);
                effectMessage += ' Cursed with eternal misfortune!';
                break;
                
            case 'pain_to_power':
                const painCount = Object.keys(combat.statusEffects.player).length;
                if (painCount > 0) {
                    activateStatusEffect(combat, 'player', 'berserk', painCount);
                    effectMessage += ` Pain transformed to power! (+${painCount} rage)`;
                }
                break;
                
            case 'suffering_mastery':
                activateStatusEffect(combat, 'player', 'damage_reduction', 5);
                activateStatusEffect(combat, 'player', 'reflect_damage', 5);
                effectMessage += ' You master all suffering!';
                break;
                
            case 'steal_enlightenment':
                const enlightenmentHeal = Math.floor(combat.userStats.maxHealth * 0.5);
                combat.userCurrentHealth = Math.min(combat.userStats.maxHealth, combat.userCurrentHealth + enlightenmentHeal);
                activateStatusEffect(combat, 'creature', 'despair', 5);
                effectMessage += ` Stole enlightenment for ${enlightenmentHeal} HP!`;
                break;
                
            case 'steal_moksha':
                const mokshaHeal = Math.floor(combat.userStats.maxHealth * 0.6);
                combat.userCurrentHealth = Math.min(combat.userStats.maxHealth, combat.userCurrentHealth + mokshaHeal);
                activateStatusEffect(combat, 'player', 'temporary_immortality', 2);
                effectMessage += ` Liberation stolen for ${mokshaHeal} HP and immortality!`;
                break;
                
            case 'karmic_immunity':
                activateStatusEffect(combat, 'player', 'ethereal', 3);
                combat.statusEffects.player = {}; // Clear all debuffs
                effectMessage += ' Immune to all karmic effects!';
                break;
                
            // === AREA AND DOMAIN EFFECTS ===
            case 'area_damage':
                const areaDamage = Math.floor(Math.random() * 15) + 10;
                combat.creatureCurrentHealth = Math.max(0, combat.creatureCurrentHealth - areaDamage);
                effectMessage += ` Area devastation deals ${areaDamage} additional damage!`;
                break;
                
            case 'area_control':
                activateStatusEffect(combat, 'creature', 'fear', 3);
                activateStatusEffect(combat, 'creature', 'slowed', 3);
                effectMessage += ' You dominate the battlefield!';
                break;
                
            case 'reality_break':
            case 'reality_distortion':
                activateStatusEffect(combat, 'creature', 'stunned', 2);
                activateStatusEffect(combat, 'creature', 'despair', 3);
                effectMessage += ' Reality itself cracks around the enemy!';
                break;
                
            case 'apocalypse':
                const apocalypseDamage = Math.floor(combat.creatureCurrentHealth * 0.25);
                combat.creatureCurrentHealth = Math.max(0, combat.creatureCurrentHealth - apocalypseDamage);
                activateStatusEffect(combat, 'creature', 'fear', 5);
                activateStatusEffect(combat, 'creature', 'despair', 5);
                effectMessage += ` Apocalyptic power deals ${apocalypseDamage} true damage!`;
                break;
                
            case 'universal_corruption':
                activateStatusEffect(combat, 'creature', 'poison', 6);
                activateStatusEffect(combat, 'creature', 'burn', 6);
                activateStatusEffect(combat, 'creature', 'despair', 6);
                effectMessage += ' Universal corruption spreads!';
                break;
                
            // === ILLUSION AND MIND EFFECTS ===
            case 'illusion_mastery':
                activateStatusEffect(combat, 'creature', 'entangled', 3);
                activateStatusEffect(combat, 'player', 'evasion_boost', 4);
                effectMessage += ' Perfect illusions confuse the enemy!';
                break;
                
            case 'mind_control':
                if (Math.random() < 0.3) {
                    activateStatusEffect(combat, 'creature', 'stunned', 2);
                    effectMessage += ' Enemy mind briefly controlled!';
                } else {
                    activateStatusEffect(combat, 'creature', 'entangled', 2);
                    effectMessage += ' Enemy will dominated!';
                }
                break;
                
            case 'mass_confusion':
                activateStatusEffect(combat, 'creature', 'entangled', 4);
                activateStatusEffect(combat, 'creature', 'defense_reduction', 4);
                effectMessage += ' Mass confusion overwhelms the enemy!';
                break;
                
            // === DIVINE/BLASPHEMOUS EFFECTS ===
            case 'divine_punishment':
                const divineDamage = Math.floor(combat.creatureCurrentHealth * 0.2);
                combat.creatureCurrentHealth = Math.max(0, combat.creatureCurrentHealth - divineDamage);
                effectMessage += ` Divine punishment deals ${divineDamage} holy damage!`;
                break;
                
            case 'terror':
                activateStatusEffect(combat, 'creature', 'fear', 4);
                activateStatusEffect(combat, 'creature', 'despair', 4);
                effectMessage += ' Absolute terror paralyzes the enemy!';
                break;
                
            case 'cosmic_rejection':
                activateStatusEffect(combat, 'creature', 'despair', 6);
                const cosmicDamage = Math.floor(combat.creatureCurrentHealth * 0.15);
                combat.creatureCurrentHealth = Math.max(0, combat.creatureCurrentHealth - cosmicDamage);
                effectMessage += ` The cosmos rejects the enemy for ${cosmicDamage} damage!`;
                break;
                
            // === TIME EFFECTS ===
            case 'age_drain':
                activateStatusEffect(combat, 'creature', 'slowed', 5);
                const ageDamage = Math.floor(Math.random() * 20) + 15;
                combat.creatureCurrentHealth = Math.max(0, combat.creatureCurrentHealth - ageDamage);
                effectMessage += ` Ages drained for ${ageDamage} damage!`;
                break;
                
            case 'temporal_stop':
                activateStatusEffect(combat, 'creature', 'stunned', 3);
                effectMessage += ' Time stops around the enemy!';
                break;
                
            // === ULTIMATE EFFECTS ===
            case 'existence_threat':
                const existentialDamage = Math.floor(combat.creatureCurrentHealth * 0.4);
                combat.creatureCurrentHealth = Math.max(0, combat.creatureCurrentHealth - existentialDamage);
                activateStatusEffect(combat, 'creature', 'despair', 10);
                effectMessage += ` Existence itself threatened for ${existentialDamage} damage!`;
                break;
                
            case 'omniversal_plague':
                activateStatusEffect(combat, 'creature', 'poison', 10);
                activateStatusEffect(combat, 'creature', 'burn', 10);
                activateStatusEffect(combat, 'creature', 'despair', 10);
                activateStatusEffect(combat, 'creature', 'fear', 10);
                effectMessage += ' Omniversal plague spreads across all realities!';
                break;
                
            // === FALLBACK ===
            default:
                effectMessage += ` [${effect}]`;
                break;
        }
    }
    
    return effectMessage;
}

// Helper function to apply status effects from techniques
function applyStatusEffect(combat, target, effect, duration) {
    ensureCombatEffectsInitialized(combat);
    
    if (!combat.statusEffects[target]) {
        combat.statusEffects[target] = {};
    }
    
    combat.statusEffects[target][effect] = duration;
}

module.exports = {
    processUserAttack,
    processUserDefend,
    processUserSpecial,
    processCreatureTurn,
    processQiTechnique,
    // Expose for testing or direct use if needed
    applyStatusEffects,
    processAbilityEffects,
    calculateModifiedDamage,
    checkHit,
    ensureCombatEffectsInitialized,
    activateStatusEffect,
    STATUS_EFFECT_CONFIG // Could be useful for UI or other game logic
};