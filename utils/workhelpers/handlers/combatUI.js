// Combat UI Components for a Xianxia-themed bot - Optimized Version
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const createBaseEmbed = require('../../../utils/embed.js');
const { createHealthBar, getElementColor, calculateUserStats } = require('./combatCalculator.js');
const { emojis } = require('../../../data/emojis.js');
const { getUserEquippedTechniques, getTechniqueWithMastery, canUseTechnique } = require('./qiTechniqueManager.js');

// Helper function to calculate and format technique damage exactly like in combat
async function formatTechniqueDamage(userId, technique) {
  try {
    // Get stored final stats that include all bonuses - use .lean() for read-only access
    const UserStats = require('../../../models/Combat/userStats');
    const userStats = await UserStats.findOne({ userId })
      .select('userId attack')
      .lean();
    
    let finalAttack = 20; // Default fallback
    if (userStats) {
      // Use the stored final attack value that includes all bonuses
      finalAttack = userStats.attack;
    } else {
      // Fallback to calculating if no stored stats exist
      const userData = { userId: userId };
      const calculatedStats = await calculateUserStats(userData);
      finalAttack = calculatedStats.attack || 20;
    }
    
    const techniqueDamageMin = technique.damage?.min || 0;
    const techniqueDamageMax = technique.damage?.max || 0;

    // Calculate damage ranges exactly like in combat (combatActions.js processQiTechnique)
    // Total damage = final attack (with all bonuses) + technique damage
    const totalBaseDamageMin = finalAttack + techniqueDamageMin;
    const totalBaseDamageMax = finalAttack + techniqueDamageMax;
    
    // Apply the same calculateDamage logic as in combat (with defense = 0 for qi techniques)
    const baseDamageMin = Math.max(1, totalBaseDamageMin);
    const baseDamageMax = Math.max(1, totalBaseDamageMax);
    
    // Add ±20% variance like in calculateDamage function
    const varianceMin = Math.floor(baseDamageMin * 0.2);
    const varianceMax = Math.floor(baseDamageMax * 0.2);
    
    // Calculate damage range without randomness (show the possible range)
    const minDamageWithVariance = baseDamageMin - varianceMin;
    const maxDamageWithVariance = baseDamageMax + varianceMax;
    
    // Account for critical hit possibility (1.5x damage)
    const maxDamageWithCrit = Math.floor(maxDamageWithVariance * 1.5);
    
    // Ensure minimum damage of 1
    const finalMinDamage = Math.max(1, minDamageWithVariance);
    const finalMaxDamage = Math.max(1, maxDamageWithCrit);

    return `⚔️ **Damage:** ${finalMinDamage}-${finalMaxDamage} (ignores defense)`;
  } catch (error) {
    console.error('Error calculating technique damage:', error);
    // Fallback to raw technique damage if calculation fails
    const techniqueDamageMin = technique.damage?.min || 0;
    const techniqueDamageMax = technique.damage?.max || 0;
    return `⚔️ **Damage:** ${techniqueDamageMin}-${techniqueDamageMax}`;
  }
}

// Pre-define constants used in frequently called functions
const COMBAT_REQUIRED_FIELDS = ['creature', 'userCurrentHealth', 'creatureCurrentHealth', 'userStats', 'round', 'turn', 'combatLog'];

// Shared validation and error handling utilities
const validators = {
  interaction: (interaction) => {
    if (!interaction) throw new Error('Missing interaction parameter');
    // Optional chaining for user.id in case user itself is null/undefined, though interaction should guarantee a user object.
    if (!interaction.user?.id) throw new Error('Invalid user in interaction');
  },
  
  combat: (combat) => {
    if (!combat || typeof combat !== 'object') 
      return { valid: false, error: 'Invalid combat object' };
    
    for (const field of COMBAT_REQUIRED_FIELDS) {
      if (!(field in combat)) return { valid: false, error: `Missing field: ${field}` };
    }
    
    // Optional chaining for safety, though 'creature' is in COMBAT_REQUIRED_FIELDS
    if (!combat.creature?.name || typeof combat.creature.health !== 'number' || !combat.creature.element) 
      return { valid: false, error: 'Incomplete creature data' };
    
    return { valid: true };
  }
};

const errorHandler = (interaction, error, context = 'combat UI') => {
  console.error(`Combat UI Error in ${context}:`, error);
  // Ensure interaction is passed if available, otherwise handle gracefully if errorHandler is called without it
  const embedOptions = {
    title: '⚠️ **Spiritual Disturbance**',
    description: '🌫️ The spiritual energies are unstable...\n\nA temporary disturbance in the cultivation realm has occurred.\nPlease try again in a moment.\n\n*The heavens are realigning their cosmic forces...*',
    color: 0xFFAA00, // Orange for warning
    footer: { text: 'If this persists, contact the Sect Elders for guidance.' }
  };
  if (interaction) {
    embedOptions.interaction = interaction;
  }
  return createBaseEmbed(embedOptions);
};

// Utility functions for safe calculations
const safeCalc = {
  health: (current, max) => {
    const currentHp = current || 0;
    const maxHp = max || 1; // Ensure maxHp is at least 1 to prevent division by zero
    return {
      current: Math.max(0, currentHp),
      max: Math.max(1, maxHp), // Ensure max is at least 1
      percent: Math.min(100, Math.max(0, (currentHp / Math.max(1, maxHp)) * 100))
    };
  },
  
  healthBar: (percent) => {
    try {
      return createHealthBar(percent); // Assuming createHealthBar is efficient
    } catch (e) {
      // Fallback if createHealthBar fails
      return `[${Math.round(percent)}%]`; 
    }
  },
  
  color: (element) => {
    try {
      return getElementColor(element); // Assuming getElementColor is efficient
    } catch (e) {
      return 0x3498DB; // Default color
    }
  }
};

// Shared button creation utilities
const buttonUtils = {
  createBackButton: () => new ButtonBuilder()
    .setCustomId('combat_back_to_actions')
    .setLabel('🔙 Back')
    .setStyle(ButtonStyle.Secondary),
    
  createErrorButton: (label = '⚠️ Combat Error') => new ButtonBuilder()
    .setCustomId('combat_error_state')
    .setLabel(label)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true),
    
  createTechniqueButton: (techniqueId, index, name) => {
    const button = new ButtonBuilder()
      .setCustomId(`technique_use_${techniqueId}`)
      // Ensure label doesn't exceed Discord's 80 char limit for button labels.
      // `${index + 1}. ` takes some characters. `name.slice(0, 70)` might be safer.
      .setLabel(`${index + 1}. ${name.slice(0, 75)}`) 
      .setStyle(ButtonStyle.Success);
    try {
      // This try-catch is for extreme robustness. If '✨' is always valid and setEmoji is stable,
      // it could be removed for a micro-optimization.
      button.setEmoji('✨'); 
    } catch (e) {
      // Silently fail emoji setting if it errors, button remains functional.
    }
    return button;
  }
};

// Core embed creation functions - now split into two embeds
function createCombatStatusEmbed(interaction, combat) {
  try {
    validators.interaction(interaction);
    const validation = validators.combat(combat);
    if (!validation.valid) throw new Error(validation.error);

    const { creature } = combat;
    
    const userHealth = safeCalc.health(combat.userCurrentHealth, combat.userStats.maxHealth);
    const creatureHealth = safeCalc.health(combat.creatureCurrentHealth, creature.health);
    
    const userHealthBar = safeCalc.healthBar(userHealth.percent);
    const creatureHealthBar = safeCalc.healthBar(creatureHealth.percent);
    const embedColor = safeCalc.color(creature.element);
      const userDisplayName = combat.userDisplayName || interaction.user.username || 'Unknown Cultivator';
    const userStage = combat.userStats.stage || 'Mortal Realm';    // Use the combat session stats which now store final calculated values consistently
    const displayStats = {
      attack: combat.userStats.attack || 0,
      defense: combat.userStats.defense || 0,
      speed: combat.userStats.speed || 0
    };

    return createBaseEmbed({
      interaction,
      title: `⚔️ Duel of Destiny: ${creature.name}`,
      description: `*${creature.flavor?.intro || 'A powerful adversary stands before you.'}*`,
      color: embedColor,
      fields: [
        {
          name: `👤 **${userDisplayName}** (${userStage})`,
          value: `❤️ ${userHealthBar} \`${userHealth.current}/${userHealth.max} HP\`\n⚔️ **ATK:** ${displayStats.attack} | 🛡️ **DEF:** ${displayStats.defense} | ⚡ **SPD:** ${displayStats.speed}`,
          inline: true
        },
        {
          name: `🐉 **${creature.name}** (Lv.${creature.level || '?'})`,
          value: `❤️ ${creatureHealthBar} \`${creatureHealth.current}/${creatureHealth.max} HP\`\n⚔️ **ATK:** ${creature.attack || 0} | 🛡️ **DEF:** ${creature.defense || 0} | ⚡ **SPD:** ${creature.speed || 0}`,
          inline: true
        }
      ],
      footer: {
        text: `Round ${combat.round || 1} • ${combat.turn === 'user' ? 'Your Turn' : 'Enemy Turn'} • Element: ${creature.element || 'Unknown'}`
      }
    });
  } catch (error) {
    return errorHandler(interaction, error, 'combat status embed creation');
  }
}

function createCombatLogEmbed(interaction, combat) {
  try {
    validators.interaction(interaction);
    const validation = validators.combat(combat);
    if (!validation.valid) throw new Error(validation.error);

    const combatLog = Array.isArray(combat.combatLog) ? combat.combatLog : [];
    // Display last 5 log entries for better context, or default message if no logs yet
    const logDisplay = combatLog.length > 0 ? combatLog.slice(-5).join('\n') : '*The clash of destinies begins...*';
    
    return createBaseEmbed({
      interaction,
      author: {
        name: 'Battle Logs',
      },
      description: logDisplay,
      color: 0x2F3136, // Dark gray for battle logs
      footer: {
        text: combatLog.length > 5 ? `Showing last 5 of ${combatLog.length} actions` : `${combatLog.length} action${combatLog.length !== 1 ? 's' : ''} recorded`
      }
    });
  } catch (error) {
    return errorHandler(interaction, error, 'combat log embed creation');
  }
}

// Legacy function for backward compatibility - now returns both embeds
function createCombatEmbed(interaction, combat) {
  try {
    const statusEmbed = createCombatStatusEmbed(interaction, combat);
    const logEmbed = createCombatLogEmbed(interaction, combat);
    return [statusEmbed, logEmbed];
  } catch (error) {
    return [errorHandler(interaction, error, 'combat embed creation')];
  }
}

function createCombatButtons(combat) {
  try {
    // Validate combat object minimally for button creation
    if (!combat || typeof combat !== 'object' || typeof combat.turn !== 'string') {
      console.error('Invalid combat object for createCombatButtons:', combat);
      return new ActionRowBuilder().addComponents(buttonUtils.createErrorButton());
    }

    if (combat.turn !== 'user') {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('combat_wait')
          .setLabel('⏳ Enemy Turn...')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );
    }

    // Standard action buttons
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('combat_attack').setLabel('⚔️ Strike').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('combat_defend').setLabel('🛡️ Guard').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('combat_special').setLabel('✨ Channel Qi').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('combat_flee').setLabel('💨 Withdraw').setStyle(ButtonStyle.Secondary)
    );
  } catch (error) {
    // This catch is for unexpected errors during button/row builder instantiation
    console.error('createCombatButtons error:', error);
    return new ActionRowBuilder().addComponents(buttonUtils.createErrorButton('⚠️ Button Error'));
  }
}

// Combat result embeds
function createResultEmbed(interaction, combat, type, rewardResults = null) {
  try {
    validators.interaction(interaction);
    // Flee and defeat might occur with a partially invalid combat state, so handle validation carefully.
    if (type !== 'flee' && type !== 'defeat') {
      const validation = validators.combat(combat);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
    }

    const creature = combat?.creature; // Use optional chaining
    const creatureName = creature?.name || 'Unknown Adversary';

    const configs = {
      victory: {
        title: '🏆 **Victory Attained!**',
        description: `*${creature?.flavor?.defeat || 'You have emerged victorious!'}*\n\n*"Through struggle comes enlightenment..."*`,
        color: 0x00FF00,
        getFields: () => {
          let xpGained = 0, coinsGained = 0;
          let newKarmicDebtText = '', newClanPointsText = '';
          const itemTexts = [];

          if (rewardResults && typeof rewardResults === 'object') {
            xpGained = rewardResults.xp || 0;
            coinsGained = rewardResults.coins || 0;
            newKarmicDebtText = `*New Balance: ${rewardResults.newKarmicDebt || 0} Debt`;
            newClanPointsText = `${rewardResults.newClanpointsBalance || 0} ${emojis?.heavenlyorbs || '💎'}*`;
            
            const sourceItems = Array.isArray(rewardResults.items) ? rewardResults.items : [];
            for (const item of sourceItems) {
              if (item?.name) {
                itemTexts.push(`${item.obtained ? '✨' : '💨'} ${item.name}${item.obtained ? '' : ' (missed)'}`);
              }
            }
          } else if (creature?.rewards) { // Fallback to creature default rewards if no specific results
            xpGained = creature.rewards.xp || 0;
            coinsGained = creature.rewards.coins || 0;
            // newKarmicDebtText and newClanPointsText remain empty or could have defaults if applicable
            
            const sourceItems = Array.isArray(creature.rewards.items) ? creature.rewards.items : [];
            for (const item of sourceItems) {
              if (item?.name) {
                const chance = typeof item.chance === 'number' ? item.chance : 0.5;
                const obtained = Math.random() <= chance;
                itemTexts.push(`${obtained ? '✨' : '💨'} ${item.name}${obtained ? '' : ' (missed)'}`);
              }
            }
          }

          const rewardsField = {
            name: '💰 **Spoils of Victory**',
            value: [
              `☯ **${xpGained} Karmic Debt**`,
              `${emojis?.heavenlyorbs || '💎'} **${coinsGained} Karmic Jades**`,
              ...(newKarmicDebtText ? [`${newKarmicDebtText} | ${newClanPointsText}`] : [])
            ].join('\n'),
            inline: true
          };

          const itemsField = {
            name: '🎁 **Treasures Unearthed**',
            value: itemTexts.join('\n') || 'The heavens held their treasures this time...',
            inline: true
          };

          return [
            rewardsField,
            itemsField,
            {
              name: '📈 **Combat Reflection**',
              value: [
                `**Rounds Survived:** ${combat?.round || 1}`,
                `**Final HP:** ${combat?.userCurrentHealth || 0}/${combat?.userStats?.maxHealth || 0}`
              ].join('\n'),
              inline: false
            }
          ];
        }
      },
      defeat: {
        title: '💀 **Defeat...**',
        description: `You fell before the might of **${creatureName}**.\n\n*"Every setback is a step closer to mastery..."*`,
        color: 0xFF0000,
        getFields: () => [
          {
            name: '⚰️ **Karmic Consequences**',
            value: 'Your cultivation base suffers a minor setback.\n*No permanent losses, only lessons learned.*',
            inline: false
          },
          {
            name: '🔄 **Renew Your Spirit**',
            value: 'Return when your cultivation has reached new heights, young cultivator.',
            inline: false
          }
        ]
      },
      flee: {
        title: '💨 **Tactical Withdrawal**',
        description: `*${creature?.flavor?.escape || 'You retreat to safety, wisdom guiding your steps.'}*\n\n*"Knowing when to retreat is wisdom itself..."*`,
        color: 0x808080, // Grey
        getFields: () => [
          {
            name: '🏃‍♂️ **Escape Successful**',
            value: 'You live to cultivate another day. Your pride is bruised, but your spirit remains resilient.',
            inline: false
          }
        ]
      }
    };

    const config = configs[type];
    if (!config) throw new Error(`Invalid result type: ${type}`);

    return createBaseEmbed({
      interaction,
      title: config.title,
      description: config.description,
      color: config.color,
      fields: config.getFields()
    });
  } catch (error) {
    // Log the specific type of embed creation that failed for better debugging
    console.error(`createResultEmbed (type: ${type}) error:`, error);
    return errorHandler(interaction, error, `${type} embed creation`);
  }
}

// Convenience wrappers for result embeds
const createVictoryEmbed = (interaction, combat, rewardResults) => createResultEmbed(interaction, combat, 'victory', rewardResults);
const createDefeatEmbed = (interaction, combat) => createResultEmbed(interaction, combat, 'defeat');
const createFleeEmbed = (interaction, combat) => createResultEmbed(interaction, combat, 'flee');

function createRetryButtons() {
  try {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('fightstart_again').setLabel('🗡️ Seek Another Battle').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('sect_welcome').setLabel('🏯 Return to Sect').setStyle(ButtonStyle.Secondary)
    );
  } catch (error) {
    // Fallback if ActionRowBuilder or ButtonBuilder fails
    console.error('createRetryButtons error:', error);
    return new ActionRowBuilder().addComponents(
      // Provide at least one functional button if possible
      new ButtonBuilder().setCustomId('sect_welcome').setLabel('🏯 Return to Sect').setStyle(ButtonStyle.Secondary)
    );
  }
}

// Technique selection functions
// Performance of these functions heavily depends on the speed of getUserEquippedTechniques and getTechniqueWithMastery.
async function createTechniqueSelectionEmbed(interaction, combat) {
  try {
    validators.interaction(interaction);
    const validation = validators.combat(combat);
    if (!validation.valid) throw new Error(validation.error);

    let techniques = [];
    try {
      techniques = await getUserEquippedTechniques(interaction.user.id);
      if (!Array.isArray(techniques)) techniques = [];
    } catch (error) {
      console.error('Error fetching user techniques:', error);
      techniques = [];
    }

    if (techniques.length === 0) {
      return createBaseEmbed({
        interaction,
        title: '✨ Channel Qi - No Techniques Available',
        description: '🔮 **Your qi channels are empty!**\n\nYou have not equipped any qi techniques yet. Visit a sect master or use technique commands to learn and equip qi techniques.\n\n*Available techniques will appear here once equipped.*',
        color: 0x808080,
        footer: { text: 'Learn qi techniques to unlock the power of cultivation!' }
      });
    }    // Process up to 20 techniques for the embed to keep it manageable.
    const techniqueFields = [];
    const techniquesToProcess = techniques.slice(0, 20);
    
    for (const slot of techniquesToProcess) {
      if (!slot?.techniqueId) continue;

      try {
        const technique = getTechniqueWithMastery(slot.techniqueId, slot.masteryLevel || 1);
        if (!technique) continue;

        const usageCheck = canUseTechnique(combat, technique, slot);
        const maxHealth = combat.userStats?.maxHealth || 1; // Default to 1 to avoid division by zero
        const qiCost = Math.floor((technique.qiCost || 0) * (combat.userStats?.baseStatMultiplier || 1));

        let statusIcon = '🟢', statusText = 'Ready';
        if (usageCheck && !usageCheck.canUse) {
          statusIcon = '🔴';
          switch (usageCheck.reason) {
            case 'insufficient_qi':
              statusText = 'Not Enough Qi';
              break;
            case 'on_cooldown':
              statusText = `Cooldown: ${usageCheck.cooldownRemaining || 1} turn(s)`;
              break;
            default:
              statusText = 'Unavailable';
          }
        }

        // Use centralized damage calculation function for consistency
        const damageDisplay = await formatTechniqueDamage(interaction.user.id, technique);

        const fieldValueParts = [
          `*${technique.description || 'Ancient technique of great power.'}*`,
          `⚡ **Qi Cost:** ${qiCost} HP | 🎯 **Accuracy:** ${technique.accuracy || 100}%`,
          damageDisplay
        ];

        if (technique.effects?.length > 0) {
          fieldValueParts.push(`✨ **Effects:** ${technique.effects.join(', ')}`);
        }
        fieldValueParts.push(`📊 **Status:** ${statusText}`);
        if (technique.cooldown > 0) {
          fieldValueParts.push(`⏱️ **Cooldown:** ${technique.cooldown} turns`);
        }

        techniqueFields.push({
          name: `${statusIcon} **${technique.name || 'Unknown Technique'}** (Mastery ${slot.masteryLevel || 1})`,
          value: fieldValueParts.join('\n'),
          inline: false
        });
      } catch (error) {
        console.error(`Error processing technique ${slot.techniqueId} for embed:`, error);
      }
    }

    return createBaseEmbed({
      interaction,
      title: '✨ Channel Qi - Select Your Technique',
      description: '🔮 **Choose a qi technique to unleash your cultivation power!**\n\n*Select from your equipped techniques below:*',
      color: 0x9932CC, // Purple for mystical/qi
      fields: techniqueFields.length > 0 ? techniqueFields : [{ name: "No Valid Techniques Found", value: "Please check your equipped techniques."}],
      footer: { text: `Round ${combat.round || 1} • Choose wisely, young cultivator...` }
    });
  } catch (error) {
    console.error('createTechniqueSelectionEmbed error:', error);
    return errorHandler(interaction, error, 'technique selection embed creation');
  }
}

async function createTechniqueSelectionButtons(userId) {
  try {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID provided for technique buttons');
    }

    let techniques = [];
    try {
      // This external call is a potential performance bottleneck.
      techniques = await getUserEquippedTechniques(userId);
      if (!Array.isArray(techniques)) techniques = [];
    } catch (error) {
      console.error('Error fetching techniques for buttons:', error);
      techniques = [];
    }
    
    const backButtonRow = new ActionRowBuilder().addComponents(buttonUtils.createBackButton());

    if (techniques.length === 0) {
      return [backButtonRow];
    }

    const buttons = techniques.slice(0, 20).map((slot, i) => { // Max 20 techniques = 4 rows of buttons + back button
      if (!slot?.techniqueId) return null;
      
      try {
        // Assuming slot.name is available from getUserEquippedTechniques or should be fetched.
        // If slot.name is not guaranteed, a call to getTechniqueWithMastery might be needed here too,
        // which could be another performance consideration. For now, assume slot.name exists.
        const techniqueName = slot.name || `Technique ${i + 1}`;
        return buttonUtils.createTechniqueButton(slot.techniqueId, i, techniqueName);
      } catch (error) {
        console.error(`Error creating button for technique ${slot.techniqueId}:`, error);
        return null;
      }
    }).filter(Boolean);

    if (buttons.length === 0) {
        return [backButtonRow]; // Only back button if no technique buttons could be created
    }

    const rows = [];
    // Efficiently create rows with max 5 buttons per row
    for (let i = 0; i < buttons.length; i += 5) {
      try {
        const rowButtons = buttons.slice(i, i + 5);
        if (rowButtons.length > 0) { // Should always be true given the loop condition
          rows.push(new ActionRowBuilder().addComponents(rowButtons));
        }
      } catch (error) {
        // This catch is for safety, errors here would likely be from addComponents
        console.error(`Error creating button row starting at index ${i}:`, error);
      }
    }
    
    // Add the back button as the last row, ensuring it doesn't exceed max rows (5) if other rows are full.
    if (rows.length < 5) {
        rows.push(backButtonRow);
    } else {
        console.warn("Max button rows reached, back button might not be displayed as a new row.");
        // Optionally, replace the last button of the last row with the back button if it's critical.
    }

    return rows.length > 0 ? rows : [backButtonRow]; // Fallback if all row creations failed.
  } catch (error) {
    console.error('createTechniqueSelectionButtons error:', error);
    // Fallback to a row with just the back button on major error
    return [new ActionRowBuilder().addComponents(buttonUtils.createBackButton())];
  }
}

module.exports = {
  createCombatEmbed,
  createCombatStatusEmbed,
  createCombatLogEmbed,
  createCombatButtons,
  createVictoryEmbed,
  createDefeatEmbed,
  createFleeEmbed,
  createRetryButtons,
  createTechniqueSelectionEmbed,
  createTechniqueSelectionButtons
};