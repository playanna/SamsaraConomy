const { SlashCommandBuilder } = require('discord.js');
const clanService = require('../../utils/clanhelpers/clanhelpers.js');
const createBaseEmbed = require('../../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clan-view')
    .setDescription('View your or another user’s clan')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user whose clan you want to view')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const userId = target.id;

    const result = await clanService.getClanByUser(userId);
    if (!result.success) {
      return interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
    }

    const clan = result.clan;

    const embed = createBaseEmbed({
      interaction,
      title: `🏯 Clan: ${clan.name}`,
      description: [
        `👑 Leader: <@${clan.leaderId}>`,
        `👥 Members: ${clan.members.length} / ${clan.upgrades?.maxMembers || 10}`,
        `🔥 Level: ${clan.level || 0}`,
        `📜 Description: ${clan.description || 'No description yet.'}`,
        `🏷️ Tag: \`${clan.tag}\``,
      ].join('\n'),
      thumbnail: target.displayAvatarURL({ dynamic: true }),
    });

    return interaction.reply({ embeds: [embed] });
  },
};
