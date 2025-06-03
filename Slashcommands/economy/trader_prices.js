const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const Inventory = require('../../models/Multipliers/inventory');
const ExpeditionSettings = require('../../models/Multipliers/expeditionSetting');

function calculateSellMultiplier(traderXP) {
  return 1.0 + Math.floor(traderXP / 1000) * 0.1;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('treasury')
    .setDescription('Visit the sect treasury to appraise your spiritual treasures'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const user = interaction.user;
    const emoji = '<a:flameice:1361606119906344996> ';
    const spiritstones = '<:karmicstone:757981408143868034> ';

    try {
      const inventory = await Inventory.findOne({ userId });
      if (!inventory || inventory.items.length === 0) {
        return await interaction.reply({
          content: '🀄 Your qiankun pouch is empty, disciple. Go gather treasures first.',
          ephemeral: true,
        });
      }

      let settings = await ExpeditionSettings.findOne({ userId });
      if (!settings) {
        settings = new ExpeditionSettings({ userId });
        await settings.save();
      }

      const multiplier = calculateSellMultiplier(settings.traderXP);
      settings.sellMultiplier = multiplier;
      await settings.save();

      // Calculate total value
      const totalBaseValue = inventory.items.reduce((sum, item) => sum + (item.value * item.quantity), 0);
      const totalMultipliedValue = totalBaseValue * multiplier;

      const itemLines = inventory.items.map(item => {
        const basePrice = item.value * item.quantity;
        const newPrice = (basePrice * multiplier).toFixed(2);
        return `${emoji} **${item.name}** ×${item.quantity} — ~~${basePrice}~~ → **${newPrice}** ${spiritstones}`;
      });

      const embed = new EmbedBuilder()
        .setDescription([
          `> *"The Treasury Elder strokes his beard as he examines your spiritual treasures..."*`,
          `\n **Current Favor Multiplier:** x${multiplier.toFixed(2)}`,
          ` **Total Spiritual Value:** ~~${totalBaseValue}~~ → **${totalMultipliedValue.toFixed(2)}** ${spiritstones}`,
          `\n **Treasure Appraisal:**`
        ].join('\n'))
        .addFields(
          {
            name: 'Sacred Items',
            value: itemLines.slice(0, Math.ceil(itemLines.length/2)).join('\n'),
            inline: false
          },
          {
            name: 'Rare Artifacts',
            value: itemLines.slice(Math.ceil(itemLines.length/2)).join('\n') || 'No additional items',
            inline: false
          }
        )
        .setColor(0x8E44AD) // Imperial purple
        .setAuthor({
            name: `Hi there! ${interaction.user.globalName || interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
          })
        .setFooter({ 
          text: '「货真价实，童叟无欺」\n"Genuine goods at fair prices for all"',
          iconURL: interaction.guild?.iconURL({ dynamic: true }) || null,
        });

      return await interaction.reply({ embeds: [embed],components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('sect_hall')
            .setLabel('Back to hall')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('sell_all').setLabel('Sell All').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('work_again').setLabel('Set out to Adventure').setStyle(ButtonStyle.Primary),
        )
      ] });

    } catch (err) {
      console.error('Error in treasury command:', err);
      return interaction.reply({
        content: '💢 The treasury formation malfunctioned! Try again later.',
        ephemeral: true,
      });
    }
  }
};