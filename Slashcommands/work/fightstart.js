const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { initializeUserDataWithCache } = require('../../utils/workhelpers/handlers/userHandler.js');
const { getRandomCreature, createCombatSession, hasActiveCombat } = require('../../utils/workhelpers/handlers/combatSessionManager.js');
const { calculateUserStats } = require('../../utils/workhelpers/handlers/combatCalculator.js');
const { createCombatEmbed, createCombatButtons } = require('../../utils/workhelpers/handlers/combatUI.js');
const { sendReply, isInteractionExpired } = require('../../utils/workhelpers/handlers/combatUtils.js');
const { processCombatAction } = require('../../utils/workhelpers/handlers/combatProcessor.js');
const UserHealth = require('../../models/Health/userHealth.js');
const getUsername = require('../../utils/usernamesCache.js');

async function showEncounterChoice(interaction, userData, isButton = false) {
  const userId = interaction.user.id;
  
  try {
    // Check if interaction is too old
    if (isInteractionExpired(interaction)) {
      console.warn(`Encounter choice interaction too old for user ${userId}`);
      return;
    }

    // Random encounter descriptions
    const encounterTypes = [
      {
        title: "🏯 Ancient Dungeon Discovered",
        description: "While cultivating, you stumble upon an ancient dungeon emanating powerful qi. Dark energy seeps from its entrance, and you sense dangerous spiritual beasts lurking within.",
        flavor: "The stone archway pulses with forbidden power..."
      },
      {
        title: "🌙 Moonlit Cave Entrance", 
        description: "A hidden cave reveals itself under the moonlight, its depths echoing with otherworldly growls. Spiritual energy flows like a river from within.",
        flavor: "Ancient carvings warn of trials ahead..."
      },
      {
        title: "🌊 Misty Portal",
        description: "A swirling portal of mist and qi appears before you, revealing glimpses of spiritual beasts through its ethereal veil.",
        flavor: "The portal hums with challenge and opportunity..."
      },
      {
        title: "⛰️ Sacred Mountain Pass",
        description: "You discover a treacherous mountain pass guarded by territorial spirit beasts. The path ahead promises both danger and cultivation rewards.",
        flavor: "The mountain spirits test all who dare to pass..."
      },
      {
        title: "🔮 Mysterious Rift",
        description: "A dimensional rift tears open nearby, revealing a pocket realm where powerful creatures dwell. The air crackles with unstable spiritual energy.",
        flavor: "Reality bends around this otherworldly breach..."
      }
    ];    const encounter = encounterTypes[Math.floor(Math.random() * encounterTypes.length)];
    const currentRealm = userData.settings?.realm || 'verdant';
    const creature = await getRandomCreature(currentRealm);

    const embed = new EmbedBuilder()
      .setTitle(encounter.title)
      .setDescription(`${encounter.description}\n\n*${encounter.flavor}*\n\n**Detected Threat:** ${creature.name} (${creature.element} element)\n**Danger Level:** ${creature.tier || 'Unknown'}`)
      .setColor(0x8B4513)
      .setFooter({ text: 'Choose wisely - glory awaits the brave, but death claims the foolish.' })
      .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('encounter_enter')
        .setLabel('⚔️ Enter and Fight')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('encounter_retreat')
        .setLabel('🚶 Retreat Safely')
        .setStyle(ButtonStyle.Secondary)
    );

    await sendReply(interaction, { embeds: [embed], components: [buttons] }, isButton);

  } catch (error) {
    console.error(`Encounter choice error for ${userId}:`, error);
    await sendReply(interaction, {
      content: `❌ The spiritual realm wavers: ${error.message || 'Unknown error'}`,
      components: [],
      embeds: []
    }, isButton);
  }
}

async function startCombat(interaction, isButton = false) {
  const userId = interaction.user.id;
  
  try {
    // Check if interaction is too old (Discord interactions expire after 15 minutes)
    if (isInteractionExpired(interaction)) {
      console.warn(`Combat interaction too old for user ${userId}`);
      return;
    }

    if (!interaction.replied && !interaction.deferred) {
      await (isButton ? interaction.deferUpdate() : interaction.deferReply());
    }
    
    // Check if user is already in combat
    if (hasActiveCombat(userId)) {
      return sendReply(interaction, {
        content: '⚔️ You are already engaged in combat! Finish your current battle first.',
        flags: 64 // MessageFlags.Ephemeral
      }, isButton);    }      const userData = await initializeUserDataWithCache(userId);
    
    // Ensure user's health is fresh from database before combat
    const freshHealthData = await UserHealth.findOne({ userId });
    if (freshHealthData) {
      userData.healthData.currentHealth = freshHealthData.currentHealth;
      userData.healthData.maxHealth = freshHealthData.maxHealth;
      userData.healthData.lastCombatAt = freshHealthData.lastCombatAt;
      userData.healthData.lastUpdated = freshHealthData.lastUpdated;
    }
      const userStats = await calculateUserStats(userData);
    
    // Initialize user qi techniques if they don't exist
    const { initializeUserTechniques } = require('../../utils/workhelpers/handlers/qiTechniqueManager.js');
    await initializeUserTechniques(userId);
    
    // Check if user has enough health to fight
    if (userStats.health <= 0) {
      return sendReply(interaction, {
        content: '💀 You are too injured to fight! Visit the sect healer to restore your health.',
        flags: 64 // MessageFlags.Ephemeral
      }, isButton);
    }
      // Get user's current realm for creature selection
    const currentRealm = userData.settings?.realm || 'verdant';
    const creature = await getRandomCreature(currentRealm);
    
    // Get user's display name (nickname > globalName > username)
    const userDisplayName = await getUsername(interaction.client, interaction.guild, userId);
    
    // Create combat session with health document and display name
    const combat = createCombatSession(userId, creature, userStats, userData.healthData, userDisplayName);
    
    // Create initial combat message with dual embeds
    const embeds = createCombatEmbed(interaction, combat);
    const buttons = createCombatButtons(combat);
    
    // Handle both single embed (legacy) and dual embed (new) returns
    const embedsArray = Array.isArray(embeds) ? embeds : [embeds];
    
    await sendReply(interaction, { embeds: embedsArray, components: [buttons] }, isButton);
    
  } catch (error) {
    console.error(`Combat error for ${userId}:`, error);
    await sendReply(interaction, {
      content: `❌ The spiritual realm rejects your challenge: ${error.message || 'Unknown error'}`,
      components: [],
      embeds: []
    }, isButton);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fightstart')
    .setDescription('🗡️ Challenge the spiritual beasts of your current realm'),

  async execute(interaction) {
    await startCombat(interaction, false);
  },  async handleButton(interaction) {
    const customId = interaction.customId;
    
    try {
      // Check if interaction is expired before processing
      if (isInteractionExpired(interaction)) {
        console.warn(`Button interaction expired for user ${interaction.user.id}`);
        // Try to inform user via channel
        try {
          await interaction.channel.send({
            content: `${interaction.user} - Your combat session has expired. Please start a new fight.`
          });
        } catch (err) {
          console.error('Failed to send expiry message to channel:', err);
        }
        return;
      }
      
      // Handle encounter choice buttons
      if (customId === 'encounter_enter') {
        await startCombat(interaction, true);
        return;
      }
      
      if (customId === 'encounter_retreat') {
        // Continue with normal work flow - get userData and process success outcome
        try {
          const userId = interaction.user.id;
          const userData = await initializeUserDataWithCache(userId);
          
          // We need to trigger the success outcome logic from work.js
          // Import required functions
          const { calculateExpeditionOutcome, applySuccessOutcome } = require('../../utils/workhelpers/handlers/outcomeHandler.js');
          const { createSuccessEmbed } = require('../../utils/workhelpers/embedHelpers.js');
          const runExtraSuccessLogic = require('../../utils/workhelpers/extraSuccessHandler.js');
          
          // Calculate a success outcome
          const outcome = calculateExpeditionOutcome(
            userData.multipliers,
            userData.settings.realm,
            userData.settings.realmTier
          );
          
          // Force it to be a success (since they're retreating from combat)
          outcome.isLoss = false;
          
          // Apply success outcome
          const successData = await applySuccessOutcome({
            outcome,
            handDoc: userData.handDoc,
            xpData: userData.xpData,
            settings: userData.settings,
            multipliers: userData.multipliers,
            inventory: userData.inventory,
            sectrod: userData.sectrod
          });

          const retryRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('work_again').setLabel('🗡️ Seek Another Battle').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('sect_welcome').setLabel('🏯 Return to Sect').setStyle(ButtonStyle.Secondary),
          );

          const [embed, extraEmbed] = await Promise.all([
            createSuccessEmbed({
              interaction,
              totalLootValue: successData.totalLootValue,
              xp: successData.xp,
              isJackpot: successData.isJackpot,
              autoSell: successData.autoSell,
              realm: userData.settings.realm
            }, successData.loots, userData.settings, userData.multipliers, userData.xpData, userData.sectrod, userData.inventory, successData.challengeInfo),
            runExtraSuccessLogic({
              userId,
              successData,
              isJackpot: successData.isJackpot,
              inventory: userData.inventory,
              settings: userData.settings
            })
          ]);

          const embeds = extraEmbed ? [embed, extraEmbed] : [embed];
          await sendReply(interaction, { embeds, components: [retryRow] }, true);
          
        } catch (error) {
          console.error('Error in encounter retreat:', error);
          await sendReply(interaction, {
            content: `❌ Error processing retreat: ${error.message || 'Unknown error'}`,
            components: [],
            embeds: []
          }, true);
        }
        return;
      }
      
      if (customId === 'fightstart_again') {
        await startCombat(interaction, true);
        return;
      }
      
      if (customId.startsWith('technique_use_')) {
        // Extract technique ID from the custom ID
        const techniqueId = customId.replace('technique_use_', '');
        const { processTechniqueUsage } = require('../../utils/workhelpers/handlers/combatProcessor.js');
        await processTechniqueUsage(interaction, techniqueId);
        return;
      }
      
      if (customId === 'combat_back_to_actions') {
        // User clicked back from technique selection
        await processCombatAction(interaction, 'back_to_actions');
        return;
      }
      
      if (customId.startsWith('combat_')) {
        const action = customId.replace('combat_', '');
        await processCombatAction(interaction, action);
        return;
      }
      
    } catch (error) {
      console.error(`Button handler error for user ${interaction.user.id}:`, error);
      
      // Handle specific Discord API errors
      if (error.code === 10062) { // Unknown interaction
        console.warn(`Interaction expired during button handling for user ${interaction.user.id}`);
        // Try to send via channel as fallback
        try {
          await interaction.channel.send({
            content: `${interaction.user} - Your combat session has expired and the action could not be processed. Please start a new fight.`
          });
        } catch (channelErr) {
          console.error('Channel fallback in button handler failed:', channelErr);
        }
        return;
      }
      
      // Try to send error message if possible
      try {
        if (!isInteractionExpired(interaction)) {
          await sendReply(interaction, {
            content: `❌ An error occurred processing your action: ${error.message || 'Unknown error'}`,
            flags: 64
          }, true);
        }
      } catch (replyErr) {
        console.error('Error reply in button handler failed:', replyErr);
      }
    }
  },

  // Export startCombat for use by other modules
  async startCombat(interaction, isButton = true) {
    return await startCombat(interaction, isButton);
  },

  // Export showEncounterChoice for use by other modules
  async showEncounterChoice(interaction, userData, isButton = true) {
    return await showEncounterChoice(interaction, userData, isButton);
  },

  stage: 'beta',
};
