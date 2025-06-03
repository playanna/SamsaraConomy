const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const Clan = require('../../models/Clan/clan');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clan-requests')
    .setDescription('View and manage pending join requests for your clan'),

  async execute(interaction) {
    const leaderId = interaction.user.id;
    const clan = await Clan.findOne({ leaderId });

    if (!clan) {
      return interaction.reply({
        content: '❌ You are not the leader of any clan.',
        ephemeral: true,
      });
    }

    const requests = clan.settings.joinRequests;
    if (!requests.length) {
      return interaction.reply({
        content: '📭 There are no pending join requests.',
        ephemeral: true,
      });
    }

    // Prepare dropdown menu options
    const userOptions = await Promise.all(
      requests.map(async (userId) => {
        const user = await interaction.client.users.fetch(userId).catch(() => null);
        return user ? {
          label: user.username,
          value: user.id,
        } : null;
      })
    );

    const filteredOptions = userOptions.filter(Boolean);
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select-request')
      .setPlaceholder('Select a user to respond to...')
      .addOptions(filteredOptions.slice(0, 25)); // max 25 entries

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
      content: '📥 Here are the pending join requests:',
      components: [row],
      ephemeral: true,
    });

    // Handle dropdown selection
    const collector = interaction.channel.createMessageComponentCollector({
      componentType: 3, // select menu
      time: 60000,
    });

    collector.on('collect', async (selectInteraction) => {
      if (selectInteraction.customId !== 'select-request') return;

      const selectedUserId = selectInteraction.values[0];
      const selectedUser = await interaction.client.users.fetch(selectedUserId);

      const embed = new EmbedBuilder()
        .setTitle('🧍 Join Request')
        .setDescription(`User **${selectedUser.username}** has requested to join **${clan.name}**.`)
        .setThumbnail(selectedUser.displayAvatarURL({ dynamic: true }))
        .setColor(0xf1c40f)
        .setFooter({ text: `User ID: ${selectedUserId}` });

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`accept-${selectedUserId}`)
          .setLabel('✅ Accept')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`reject-${selectedUserId}`)
          .setLabel('❌ Reject')
          .setStyle(ButtonStyle.Danger),
      );

      await selectInteraction.update({
        embeds: [embed],
        components: [buttons],
      });

      // Now handle the accept/reject buttons
      const buttonCollector = selectInteraction.channel.createMessageComponentCollector({
        componentType: 2, // button
        time: 60000,
      });

      buttonCollector.on('collect', async (buttonInteraction) => {
        const [action, userId] = buttonInteraction.customId.split('-');

        if (userId !== selectedUserId) return;

        if (action === 'accept') {
          if (clan.members.length >= clan.upgrades.maxMembers) {
            await buttonInteraction.reply({
              content: `❌ Clan is full. Upgrade max members to accept more.`,
              ephemeral: true,
            });
            return;
          }

          clan.acceptJoinRequest(userId);
          await clan.save();

          await buttonInteraction.update({
            content: `✅ ${selectedUser.username} has been accepted into the clan.`,
            embeds: [],
            components: [],
          });
        }

        if (action === 'reject') {
          clan.rejectJoinRequest(userId);
          await clan.save();

          await buttonInteraction.update({
            content: `❌ ${selectedUser.username}'s join request was rejected.`,
            embeds: [],
            components: [],
          });
        }

        buttonCollector.stop();
        collector.stop();
      });
    });
  },
};
