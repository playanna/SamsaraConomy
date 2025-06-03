const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
  } = require('discord.js');
  
  const Clan = require('../../models/Clan/clan');
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('clan-invite')
      .setDescription('Invite a user to your clan')
      .addUserOption(option =>
        option.setName('user')
          .setDescription('The user to invite to the clan')
          .setRequired(true)
      ),
  
    async execute(interaction) {
      const userId = interaction.user.id;
      const invitedUser = interaction.options.getUser('user');
  
      if (invitedUser.bot) {
        return interaction.reply({
          content: `You can't invite a bot to your clan.`,
          ephemeral: true
        });
      }
  
      // Get the clan the inviter belongs to
      const clan = await Clan.findOne({ 'members.userId': userId });
      if (!clan) {
        return interaction.reply({
          content: 'You are not in any clan.',
          ephemeral: true,
        });
      }
  
      const member = clan.members.find(m => m.userId === userId);
      if (!member || !clan.permissions.invite.includes(member.role)) {
        return interaction.reply({
          content: 'You do not have permission to invite members to this clan.',
          ephemeral: true,
        });
      }
  
      if (clan.isMember(invitedUser.id)) {
        return interaction.reply({
          content: `${invitedUser.username} is already a member of your clan.`,
          ephemeral: true,
        });
      }
  
      // Check if user is in another clan
      const inOtherClan = await Clan.findOne({ 'members.userId': invitedUser.id });
      if (inOtherClan) {
        return interaction.reply({
          content: `${invitedUser.username} is already in another clan.`,
          ephemeral: true,
        });
      }
  
      if (clan.members.length >= clan.upgrades.maxMembers) {
        return interaction.reply({
          content: `Your clan is full. Cannot invite new members.`,
          ephemeral: true,
        });
      }
  
      const embed = new EmbedBuilder()
        .setTitle('You have been invited to a clan!')
        .setDescription(`${interaction.user.username} has invited you to join **${clan.name}** \`[${clan.tag}]\`.\n\nClick a button below to respond.`)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setColor(0x2ecc71);
  
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('clan_accept')
          .setLabel('✅ Accept')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('clan_decline')
          .setLabel('❌ Decline')
          .setStyle(ButtonStyle.Danger)
      );
  
      await interaction.reply({
        content: `${invitedUser}`,
        embeds: [embed],
        components: [row],
      });
  
      const message = await interaction.fetchReply();
  
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 5 * 60 * 1000,
      });
  
      collector.on('collect', async i => {
        if (i.user.id !== invitedUser.id) {
          return i.reply({
            content: `Only ${invitedUser.username} can respond to this invite.`,
            ephemeral: true,
          });
        }
  
        if (i.customId === 'clan_decline') {
          collector.stop('declined');
          return i.update({
            content: `${invitedUser.username} has declined the clan invite.`,
            embeds: [],
            components: [],
          });
        }
  
        if (i.customId === 'clan_accept') {
          // Check again in case the clan filled up or something changed
          const updatedClan = await Clan.findById(clan._id);
          if (!updatedClan || updatedClan.members.length >= updatedClan.upgrades.maxMembers) {
            collector.stop('full');
            return i.update({
              content: `Sorry, the clan **${updatedClan.name}** is now full.`,
              embeds: [],
              components: [],
            });
          }
  
          updatedClan.addMember(invitedUser.id, 'member');
          await updatedClan.save();
  
          collector.stop('accepted');
          return i.update({
            content: `${invitedUser.username} has joined **${updatedClan.name}** \`[${updatedClan.tag}]\`! 🎉`,
            embeds: [],
            components: [],
          });
        }
      });
  
      collector.on('end', async (_collected, reason) => {
        if (reason === 'time') {
          await interaction.editReply({
            content: `The invite to ${invitedUser.username} has expired.`,
            embeds: [],
            components: [],
          });
        }
      });
    },
  };
  