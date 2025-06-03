const { SlashCommandBuilder } = require('discord.js');
const { initializeUserDataWithCache } = require('../../utils/workhelpers/handlers/userHandler.js');
const { getRandomCreature, createCombatSession, hasActiveCombat } = require('../../utils/workhelpers/handlers/combatSessionManager.js');
const { calculateUserStats } = require('../../utils/workhelpers/handlers/combatCalculator.js');
const { createCombatEmbed, createCombatButtons } = require('../../utils/workhelpers/handlers/combatUI.js');
const { sendReply, isInteractionExpired } = require('../../utils/workhelpers/handlers/combatUtils.js');
const { processCombatAction } = require('../../utils/workhelpers/handlers/combatProcessor.js');
const UserHealth = require('../../models/Health/userHealth.js');
const getUsername = require('../../utils/usernamesCache.js');

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
    const creature = getRandomCreature(currentRealm);
    
    // Get user's display name (nickname > globalName > username)
    const userDisplayName = await getUsername(interaction.client, interaction.guild, userId);    // Create combat session with health document and display name
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
  },

  // Export startCombat for use by other modules
  async startCombat(interaction, isButton = true) {
    return await startCombat(interaction, isButton);
  },

  stage: 'beta',
};
