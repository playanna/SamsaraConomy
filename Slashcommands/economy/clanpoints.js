const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Clanpoints = require('../../models/Clan/clanpoints');
const createBaseEmbed = require('../../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy-clanpoints')
    .setDescription('Buy clanpoints with your hand balance (10 hand = 1 clanpoint)'),

  async execute(interaction) {
    const userId = interaction.user.id;

    let clanpoints = await Clanpoints.findOne({ userId });
    if (!clanpoints) {
      clanpoints = new Clanpoints({ userId });
      await clanpoints.save();
    }

    const emoji = '<:heavenlyorbs:776075202849013770>';
    const embed = createBaseEmbed({
      interaction,
      title: 'Buy Clan Points',
      description: `Purchase clan points using your hand balance!\n\n💰 **Rate:** $10 per ${emoji}`,
      fields: [
        { name: 'Your Current Clan Points', value: `${clanpoints.balance} ${emoji}`, inline: true }
      ]
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('clanpoints_buy_open_modal')
        .setLabel('Buy Clan Points')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }
};
