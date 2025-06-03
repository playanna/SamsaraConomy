const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { initializeUserDataWithCache } = require('../../utils/workhelpers/handlers/userHandler.js');
const { calculateExpeditionOutcome, applyLossOutcome, applySuccessOutcome } = require('../../utils/workhelpers/handlers/outcomeHandler.js');
const { createLossEmbed, createSuccessEmbed } = require('../../utils/workhelpers/embedHelpers.js');

// Static buttons
const retryRow = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('work_again').setLabel('✨ Work Again').setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId('sect_welcome').setLabel('Return to Sect').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('sell_all').setLabel('💰 Sell All').setStyle(ButtonStyle.Danger),
);

const cooldowns = new Map();

async function fastReply(interaction, payload, isButton) {
  try {
    const reply = isButton || interaction.replied || interaction.deferred
      ? interaction.followUp
      : interaction.reply;
    reply.call(interaction, payload);
  } catch (err) {
    console.error('Reply error:', err);
  }
}

async function performWorkTrials(interaction, isButton = false) {
  const userId = interaction.user.id;

  try {
    if (!interaction.replied && !interaction.deferred) {
      isButton ? await interaction.deferUpdate() : await interaction.deferReply();
    }

    // Flat cooldown (1s)
    const now = Date.now();
    const lastUsed = cooldowns.get(userId) || 0;
    if (now - lastUsed < 1000) {
      return await fastReply(interaction, {
        content: `⏳ Resting...\n**Cooldown:** 1s`,
        ephemeral: true
      }, isButton);
    }
    cooldowns.set(userId, now);

    const userData = await initializeUserDataWithCache(userId);
    const outcome = calculateExpeditionOutcome(userData.multipliers, userData.settings.realm, userData.settings.realmTier);

    if (outcome.isLoss) {
      const result = await applyLossOutcome({
        handDoc: userData.handDoc,
        xpData: userData.xpData,
        settings: userData.settings,
        multipliers: userData.multipliers,
        outcome,
        sectrod: userData.sectrod,
        inventory: userData.inventory
      });
      const embed = createLossEmbed(interaction, result, userData.settings, outcome);
      return await fastReply(interaction, { embeds: [embed], components: [retryRow] }, isButton);
    }

    const successData = await applySuccessOutcome({
      outcome,
      handDoc: userData.handDoc,
      xpData: userData.xpData,
      settings: userData.settings,
      multipliers: userData.multipliers,
      inventory: userData.inventory,
      sectrod: userData.sectrod
    });    const embed = await createSuccessEmbed({
      interaction,
      totalLootValue: successData.totalLootValue,
      xp: successData.xp,
      isJackpot: successData.isJackpot,
      autoSell: successData.autoSell,
      realm: userData.settings.realm
    }, successData.loots, userData.settings, userData.multipliers, userData.xpData, userData.sectrod, userData.inventory);

    await fastReply(interaction, { embeds: [embed], components: [retryRow] }, isButton);
  } catch (err) {
    console.error(`WorkTrials failure for ${userId}:`, err);
    await fastReply(interaction, {
      content: `❌ Chaotic energy disrupted your cultivation. ${err.message || 'Unknown error'}`,
      components: [],
      embeds: []
    }, isButton);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('worktrials')
    .setDescription('⚡ Experimental high-speed cultivation run'),

  async execute(interaction) {
    await performWorkTrials(interaction, false);
  },

  async handleButton(interaction) {
    if (interaction.customId === 'work_again') {
      await performWorkTrials(interaction, true);
    }
  },

  stage: 'beta',
};
