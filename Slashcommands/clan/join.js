// commands/clan/clan-join.js
const { SlashCommandBuilder } = require('discord.js');
const clanService = require('../../utils/clanhelpers/clanhelpers.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('clan-join')
    .setDescription('Join a clan by its ID')
    .addStringOption(option =>
      option
        .setName('tag')
        .setDescription('The tag of the clan you want to join')
        .setRequired(true)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const tag = interaction.options.getString('tag').toUpperCase().trim();

    try {
        const result = await clanService.joinClan(userId, tag);
        const { clan, joinType } = result;

        if (clan.settings?.inviteOnly && !clan.settings.autoAccept) {
          await interaction.reply({
            content: `📨 Your request to join **${clan.name}** has been submitted. You will be notified once it's approved by the leader.`,
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: `✅ You have successfully joined **${clan.name}** [${clan.tag}]. Welcome to the clan!`,
            ephemeral: true,
          });
        }       
    } catch (error) {
      console.error(`[❌ Clan Join Error]`, error);
      await interaction.reply({
        content: `❌ Unable to join clan: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
