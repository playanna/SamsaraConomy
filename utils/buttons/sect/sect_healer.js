const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const createBaseEmbed = require('../../../utils/embed.js');
const { initializeUserDataWithCache } = require('../../../utils/workhelpers/handlers/userHandler.js');
const UserHealth = require('../../../models/Health/userHealth.js');
const { emojis } = require('../../../data/emojis.js');

module.exports = {
  data: {
    customId: 'sect_healer',
    label: 'Divine Healer',
    style: 'SUCCESS'
  },

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      
      // Get user data including health
      const userData = await initializeUserDataWithCache(userId);
      const healthDoc = userData.healthData;
      
      if (!healthDoc) {
        return interaction.reply({
          content: '❌ Your spiritual essence could not be found. Please try starting a journey first.',
          ephemeral: true
        });
      }
      
      const currentHealth = healthDoc.currentHealth;
      const maxHealth = healthDoc.maxHealth;
      const healthPercentage = healthDoc.getHealthPercentage();
      
      // Check if already at full health
      if (currentHealth >= maxHealth) {
        const embed = createBaseEmbed({
          interaction,
          title: '💚 Divine Healer\'s Chamber',
          description: [
            '> *Warm spiritual energy emanates from the jade healing formations.*',
            '',
            '**Elder Physician\'s Assessment:**',
            `"Your spiritual vessel pulses with perfect vitality, young cultivator."`,
            '',
            `🔋 **Health:** ${currentHealth}/${maxHealth} HP (100%)`,
            '',
            '*"Return when your qi foundation requires restoration."*'
          ].join('\n'),
          color: 0x00FF7F,
          image: 'https://github.com/playanna/Samsara-bot/blob/main/images/realms/secthall/healer.jpeg?raw=true'
        });
        
        const backButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('sect_hall')
            .setLabel('Return to Sect Halls')
            .setStyle(ButtonStyle.Secondary)
        );
        
        return interaction.reply({
          embeds: [embed],
          components: [backButton]
        });
      }
      
      // Calculate healing cost - higher for lower health
      const healingNeeded = maxHealth - currentHealth;
      const baseCost = 10; // Base cost per HP point
      const emergencyCost = healthPercentage < 25 ? 2 : 1; // Emergency healing costs more
      const totalCost = Math.ceil(healingNeeded * baseCost * emergencyCost);
        // Get user's balance
      const ClanPoints = require('../../../models/Clan/clanpoints.js');
      let clanPointsDoc = await ClanPoints.findOne({ userId });
      if (!clanPointsDoc) {
        clanPointsDoc = new ClanPoints({ userId, balance: 0 });
        await clanPointsDoc.save();
      }
      
      const canAfford = clanPointsDoc.balance >= totalCost;
      const healingType = healthPercentage < 25 ? 'Emergency' : 'Standard';
      
      const embed = createBaseEmbed({
        interaction,
        title: '💚 Divine Healer\'s Chamber',
        description: [
          '> *Ancient healing formations glow softly as the Elder Physician examines your spiritual wounds.*',
          '',
          '**Spiritual Assessment:**',
          `🔋 **Current Health:** ${currentHealth}/${maxHealth} HP (${healthPercentage.toFixed(1)}%)`,
          `🩹 **Healing Required:** ${healingNeeded} HP`,
          `💊 **Treatment Type:** ${healingType} Restoration`,
          '',
          '**Healing Cost:**',
          `**${totalCost} ${emojis.heavenlyorbs} ** ${canAfford ? '✅' : '❌'}`,
          `**Your Balance:** ${clanPointsDoc.balance} ${emojis.heavenlyorbs}`,
          '',
          healthPercentage < 25 
            ? '*"Your spiritual foundation is gravely wounded! Emergency healing protocols required."*'
            : '*"The celestial healing formation can restore your qi circulation."*'
        ].join('\n'),
        color: healthPercentage < 25 ? 0xFF6B6B : 0x00FF7F,
        footer: {
          text: canAfford 
            ? 'Click below to begin the healing process' 
            : 'Insufficient Karmic Jades for treatment'
        }
      });
      
      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`healer_heal_${totalCost}`)
          .setLabel(`Receive Healing (${totalCost} Jades)`)
          .setStyle(ButtonStyle.Success)
          .setEmoji('💚')
          .setDisabled(!canAfford),
        new ButtonBuilder()
          .setCustomId('sect_hall')
          .setLabel('Return to Sect Halls')
          .setStyle(ButtonStyle.Secondary)
      );
      
      await interaction.reply({
        embeds: [embed],
        components: [buttons]
      });
      
    } catch (error) {
      console.error('Error in sect healer:', error);
      await interaction.reply({
        content: '❌ The healing chamber\'s formations are currently unstable. Please try again later.',
        ephemeral: true
      });
    }
  }
};
