const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('clan_donate_submit')
      .setTitle('Donate Clan Points');

    const amountInput = new TextInputBuilder()
      .setCustomId('donation_amount')
      .setLabel('Enter amount to donate')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('e.g. 50');

    modal.addComponents(new ActionRowBuilder().addComponents(amountInput));

    await interaction.showModal(modal);
  }
};
