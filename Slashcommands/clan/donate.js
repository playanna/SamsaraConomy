const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const Clan = require('../../models/Clan/clan');
const Clanpoints = require('../../models/Clan/clanpoints');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clan-donate')
    .setDescription('Donate Clan Points to your clan via modal input'),

  async execute(interaction) {
    const userId = interaction.user.id;

    // Check if user is in a clan
    const clan = await Clan.findOne({ 'members.userId': userId });
    if (!clan) {
      return interaction.reply({ content: '❌ You are not in a clan.', flag: 64 });
    }

    // Get or create clanpoints record
    let clanpoints = await Clanpoints.findOne({ userId });
    if (!clanpoints) {
      clanpoints = new Clanpoints({ userId, balance: 0 });
      await clanpoints.save();
    }

    const emoji = '<:heavenlyorbs:776075202849013770>'; 

    const embed = new EmbedBuilder()
      .setAuthor({ name: 'Clan Contribution Guide', iconURL: 'https://cdn.discordapp.com/emojis/776075202849013770.png' })
      .setTitle(`Your Clan Points Balance: ${clanpoints.balance} ${emoji}`)
      .setDescription('Use the button below to donate your Clan Points to your clan\'s vault.')
      .addFields(
        { name: 'How to Donate', value: `Click **Donate** and enter the amount of ${emoji} you want to contribute.` },
        { name: 'Requirements', value: '• You must be a member of a clan.\n• You must have enough Clan Points.' }
      )
      .setColor(0x3498DB)
      .setFooter({ text: 'May your generosity strengthen your sect!' });

    const donateButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('clan_donate_open_modal')
        .setLabel('Donate')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({ embeds: [embed], components: [donateButton], flag: 64 });
  },
};
