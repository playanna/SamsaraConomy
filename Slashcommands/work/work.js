const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { initializeUserDataWithCache } = require('../../utils/workhelpers/handlers/userHandler.js');
const { calculateExpeditionOutcome, applyLossOutcome, applySuccessOutcome } = require('../../utils/workhelpers/handlers/outcomeHandler.js');
const { createLossEmbed, createSuccessEmbed } = require('../../utils/workhelpers/embedHelpers.js');
const runExtraSuccessLogic = require('../../utils/workhelpers/extraSuccessHandler.js');
const {emojis} = require('../../data/emojis.js');
const rodStart = require('../rod_start.js');
const fightstart = require('./fightstart.js');

const retryRow = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('work_again').setLabel('Expedition!').setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId('sect_welcome').setLabel('Return to Sect').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('sell_all').setLabel('Sell All').setEmoji(`${emojis.heavenlyorbs}`).setStyle(ButtonStyle.Danger),
);

const cooldownTimestamps = new Map();

async function sendReply(interaction, payload, isButton) {
  try {
    // Check if interaction is still valid
    if (!interaction || !interaction.user) {
      console.error('Invalid interaction object');
      return;
    }

    // Determine the appropriate method to use
    if (interaction.replied) {
      await interaction.followUp(payload);
    } else if (interaction.deferred) {
      if (isButton) {
        await interaction.followUp(payload);
      } else {
        await interaction.editReply(payload);
      }
    } else {
      if (isButton) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    }
  } catch (err) {
    console.error('Reply error:', err);
    // If the original interaction failed, try to send a follow-up if possible
    try {
      if (!interaction.replied && !interaction.deferred) {        await interaction.reply({
          content: '❌ An error occurred while processing your request.',
          flags: 64 // MessageFlags.Ephemeral
        });
      }
    } catch (fallbackErr) {
      console.error('Fallback reply error:', fallbackErr);
    }
  }
}

async function performWork(interaction, isButton = false) {
  const { user: { id: userId } } = interaction;
  const timerLabel = `performWork for user ${userId}`;
  
  // Check if timer already exists to avoid duplicate warnings
  const timerExists = console._times && console._times.has && console._times.has(timerLabel);
  if (!timerExists) {
    console.time(timerLabel);
  }

  try {
    // Check if interaction is too old (Discord interactions expire after 15 minutes)
    const interactionAge = Date.now() - interaction.createdTimestamp;
    if (interactionAge > 14 * 60 * 1000) { // 14 minutes to be safe
      console.warn(`Interaction too old: ${interactionAge}ms for user ${userId}`);
      return;
    }

    if (!interaction.replied && !interaction.deferred) {
      await (isButton ? interaction.deferUpdate() : interaction.deferReply());
    }

    const userData = await initializeUserDataWithCache(userId);
    if (userData.isNewRod) {
      return rodStart.execute(interaction);
    }

    const reel = userData.multipliers?.reelUpgradeLevel || 0;
    const cooldown = Math.max(1000, 3000 - reel * 500);
    const now = Date.now();
    const lastUsed = cooldownTimestamps.get(userId) || 0;

    if (now - lastUsed < cooldown) {
      const timeLeft = cooldown - (now - lastUsed);      
      
    return sendReply(interaction, {
        content: `⏳ Your Qi is rebalancing.\n**Cooldown:** ${(cooldown / 1000).toFixed(1)}s\n**Time left:** ${(timeLeft / 1000).toFixed(1)}s`,
        flags: 64 // MessageFlags.Ephemeral, wonder if i should add buttons here
      }, isButton);
    }

    cooldownTimestamps.set(userId, now);

    const outcome = calculateExpeditionOutcome(
      userData.multipliers,
      userData.settings.realm,
      userData.settings.realmTier
    );

    if (outcome.isLoss) {
      const [result, embed] = await Promise.all([
        applyLossOutcome({
          handDoc: userData.handDoc,
          xpData: userData.xpData,
          settings: userData.settings,
          multipliers: userData.multipliers,
          outcome,
          sectrod: userData.sectrod,
          inventory: userData.inventory
        }),
        createLossEmbed(interaction, outcome, userData.settings, outcome)
      ]);

      return sendReply(interaction, { embeds: [embed], components: [retryRow] }, isButton);
    }    // --- Outcome is NOT a loss.
    if (Math.random() < 0.05) { // 5% chance cus im a lazy bitch and dont wanna fight
      try {
        // Show encounter choice instead of directly starting combat
        return await fightstart.showEncounterChoice(interaction, userData, true);
      } catch (extraErr) {
        console.error('Extra file error:', extraErr);
        return sendReply(interaction, {
          content: `⚠️ The heavens just crapped its pant: <@685154245548310534> ${extraErr.message || 'Unknown error'}`,
        }, isButton);
      }
    } else {
      // Run the regular success logic as usual.
      const successData = await applySuccessOutcome({
        outcome,
        handDoc: userData.handDoc,
        xpData: userData.xpData,
        settings: userData.settings,
        multipliers: userData.multipliers,
        inventory: userData.inventory,
        sectrod: userData.sectrod
      });      const [embed, extraEmbed] = await Promise.all([
        createSuccessEmbed({
          interaction,
          totalLootValue: successData.totalLootValue,
          xp: successData.xp,
          isJackpot: successData.isJackpot,
          autoSell: successData.autoSell,
          realm: userData.settings.realm
        }, successData.loots, userData.settings, userData.multipliers, userData.xpData, userData.sectrod, userData.inventory, successData.challengeInfo),runExtraSuccessLogic({
          userId,
          successData,
          isJackpot: successData.isJackpot,
          inventory: userData.inventory,
          settings: userData.settings
        })
      ]);

      const embeds = extraEmbed ? [embed, extraEmbed] : [embed];
      await sendReply(interaction, { embeds, components: [retryRow] }, isButton);
    }

    if (!timerExists) {
      console.timeEnd(timerLabel);
    }
  } catch (err) {
    console.error(`Work failure for ${userId}:`, err);
    await sendReply(interaction, {
      content: `❌ Chaotic energy disrupted your cultivation. ${err.message || 'Unknown error'}`,
      components: [],
      embeds: []
    }, isButton);
  }
}


module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Embark on a cultivation expedition to earn XP and rare items'),

  async execute(interaction) {
    await performWork(interaction, false);
  },

  async handleButton(interaction) {
    if (interaction.customId === 'work_again') {
      await performWork(interaction, true);
    }
  },

  // Export performWork for use by other modules
  async performWork(interaction, isButton = true) {
    return await performWork(interaction, isButton);
  },

  stage: 'beta',
};
