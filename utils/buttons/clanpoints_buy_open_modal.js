const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('clanpoints_buy_submit')
      .setTitle('Buy Clan Points');

    const amountInput = new TextInputBuilder()
      .setCustomId('buy_amount')
      .setLabel('Enter amount to buy?')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. 25')
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(amountInput));

    await interaction.showModal(modal);
  }
};
