// commands/clan/clan-leave.js
const { SlashCommandBuilder } = require('discord.js');
const clanService = require('../../utils/clanhelpers/clanhelpers.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('clan-leave')
    .setDescription('Leave your current clan'),

  async execute(interaction) {
    const userId = interaction.user.id;

    try {
      const clan = await clanService.leaveClan(userId);

      await interaction.reply({
        content: `👋 You have left **${clan.name}** [${clan.tag}]. Farewell, cultivator.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error(`[❌ Clan Leave Error]`, error);
      await interaction.reply({
        content: `❌ Could not leave clan: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
