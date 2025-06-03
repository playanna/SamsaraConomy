const Clan = require('../../models/Clan/clan');
const Clanpoints = require('../../models/Clan/clanpoints');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  async execute(interaction) {
    const userId = interaction.user.id;
    const amount = parseInt(interaction.fields.getTextInputValue('donation_amount'));

    if (isNaN(amount) || amount <= 0) {
      return interaction.reply({
        content: '❌ Invalid amount entered. Please enter a positive number.',
        ephemeral: true
      });
    }

    const clan = await Clan.findOne({ 'members.userId': userId });
    if (!clan) {
      return interaction.reply({ content: '❌ You are not part of any clan.', ephemeral: true });
    }

    const clanpoints = await Clanpoints.findOne({ userId });
    if (!clanpoints || clanpoints.balance < amount) {
      return interaction.reply({
        content: `❌ You don't have enough Clan Points. You currently have ${clanpoints?.balance || 0}.`,
        ephemeral: true
      });
    }

    clanpoints.balance -= amount;
    await clanpoints.save();

    clan.coins = (clan.coins || 0) + amount;
    await clan.save();

    const emoji = '🏅';
    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('✅ Donation Successful')
      .setDescription(`You donated **${amount} ${emoji}** to **${clan.name}**!\nYour new Clan Points balance: **${clanpoints.balance} ${emoji}**`);

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
