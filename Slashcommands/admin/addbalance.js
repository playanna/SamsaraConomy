const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');
const Hand = require('../../models/balance/hand.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addbalance')
    .setDescription('Add balance to a user\'s balance.')
    
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('The amount of balance to add')
        .setRequired(true) 
    )
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The user to give balance to (defaults to yourself)')
        .setRequired(false)
    )
    
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // 🔐 Admins only
    stage: 'beta',

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target') || interaction.user;
    const amount = interaction.options.getInteger('amount');

    if (amount <= 0) {
      return interaction.reply({ content: '❌ Please specify a positive amount of balance to add.', flag: 64 });
    }

    const hand = await Hand.findOneAndUpdate(
      { userId: targetUser.id },
      { $inc: { balance: amount } },
      { upsert: true, new: true }
    );

    await interaction.reply({
      content: `💰 Successfully added **${amount.toLocaleString()} balance** to **${targetUser.username}**.\nNew Balance: **${hand.balance.toLocaleString()} balance**`,
      flag: 64
    });
  }
};
