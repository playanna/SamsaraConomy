const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const createBaseEmbed = require('../../../utils/embed.js');
const { initializeUserDataWithCache } = require('../../../utils/workhelpers/handlers/userHandler.js');
const UserHealth = require('../../../models/Health/userHealth.js');
const Hand = require('../../../models/balance/hand.js');
const { emojis } = require('../../../data/emojis.js');

module.exports = {
  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      
      // Extract cost from customId (healer_heal_{cost})
      const costMatch = interaction.customId.match(/healer_heal_(\d+)/);
      if (!costMatch) {
        return await interaction.reply({
          content: '❌ Invalid healing request format.',
          ephemeral: true
        });
      }
      
      const totalCost = parseInt(costMatch[1]);
      
      // Initialize user data
      const userData = await initializeUserDataWithCache(userId);
      const { healthData, handDoc } = userData;
      
      // Verify current health state
      if (healthData.currentHealth >= healthData.maxHealth) {
        return await interaction.reply({
          content: '💚 You are already at full health! The healer smiles knowingly.',
          ephemeral: true
        });
      }
      
      // Check balance
      if (handDoc.balance < totalCost) {
        return await interaction.reply({
          content: `❌ Insufficient Karmic Jades! You need ${totalCost} but only have ${handDoc.balance}.`,
          ephemeral: true
        });
      }
      
      // Calculate healing amount
      const healthMissing = healthData.maxHealth - healthData.currentHealth;
      const isEmergency = (healthData.currentHealth / healthData.maxHealth) < 0.25;
      const baseHealingCost = 10; // 10 Jades per HP
      const emergencyMultiplier = isEmergency ? 2 : 1;
      const expectedCost = healthMissing * baseHealingCost * emergencyMultiplier;
      
      // Verify cost matches expected (prevent tampering)
      if (totalCost !== expectedCost) {
        return await interaction.reply({
          content: '❌ Healing cost mismatch. Please return to the healer and try again.',
          ephemeral: true
        });
      }
      
      // Perform the healing transaction
      handDoc.balance -= totalCost;
      healthData.currentHealth = healthData.maxHealth;
      
      // Save both documents
      await Promise.all([
        handDoc.save(),
        healthData.save()
      ]);
      
      // Create success embed
      const embed = createBaseEmbed({
        interaction,
        title: '💚 Divine Healing Complete',
        description: [
          '✨ *The healing chamber glows with gentle light as divine energy flows through you...*',
          '',
          `🩹 **Health Restored:** ${healthMissing} HP`,
          `${emojis.heavenlyorbs} **Cost:** ${totalCost} ${emojis.heavenlyorbs}`,
          `⚖️ **Remaining Balance:** ${handDoc.balance} ${emojis.heavenlyorbs}`,
          '',
          isEmergency 
            ? '*The healer nods gravely: "Emergency healing always comes at a premium, but your life is worth more than jade."*'
            : '*The healer bows respectfully: "May this healing serve you well on your cultivation path."*'
        ].join('\n'),
        color: 0x32CD32, // Lime green
        fields: [
          {
            name: '🌟 Current Status',
            value: `**Health:** ${healthData.currentHealth}/${healthData.maxHealth} HP\n**Condition:** Perfect Health`,
            inline: true
          }
        ]
      });
      
      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('sect_hall')
          .setLabel('Return to Sect Halls')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🏛️'),
        new ButtonBuilder()
          .setCustomId('fightstart_again')
          .setLabel('Seek Combat')
          .setStyle(ButtonStyle.Success)
          .setEmoji('⚔️')
      );
      
      await interaction.reply({
        embeds: [embed],
        components: [buttons]
      });
      
    } catch (error) {
      console.error('Error in healer heal transaction:', error);
      await interaction.reply({
        content: '❌ The healing ritual was disrupted by unstable spiritual energy. Please try again.',
        ephemeral: true
      });
    }
  }
};
