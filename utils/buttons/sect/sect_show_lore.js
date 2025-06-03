const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ComponentType,
  } = require('discord.js');
  const sectLore = require('../../sectlore.js');
  
  function buildLoreEmbed(page) {
    const lore = sectLore[page];
    return new EmbedBuilder()
      .setTitle(lore.title)
      .setDescription(lore.description)
      .addFields(lore.fields || [])
      .setColor(0x8a2be2)
      .setFooter({ text: `Page ${page + 1}/${sectLore.length}` })
      .setImage(lore.image || null)
      .setThumbnail(lore.thumbnail || null);
  }
  
  module.exports = {
    async execute(interaction) {
      let currentPage = 0;
  
      const embed = buildLoreEmbed(currentPage);
  
      const getButtons = () =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('clan_prev_page')
            .setLabel('◀ Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0),
          new ButtonBuilder()
            .setCustomId('clan_next_page')
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage >= sectLore.length - 1)
        );
  
      // Send persistent message (not ephemeral)
      let msg;
      try {
        msg = await interaction.reply({
          embeds: [embed],
          components: [getButtons()],
          fetchReply: true,
        });
      } catch (err) {
        console.error('Failed to send initial lore embed:', err);
        return;
      }
  
      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120_000, // 2 minutes
      });
  
      collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({
            content: "❌ Only the original user can interact with these buttons.",
            ephemeral: true,
          });
        }
  
        if (i.customId === 'clan_prev_page' && currentPage > 0) currentPage--;
        else if (i.customId === 'clan_next_page' && currentPage < sectLore.length - 1) currentPage++;
  
        const newEmbed = buildLoreEmbed(currentPage);
  
        try {
          await i.update({
            embeds: [newEmbed],
            components: [getButtons()],
          });
        } catch (err) {
          console.warn('Failed to update message:', err);
        }
      });
  
      collector.on('end', async () => {
        try {
          await msg.edit({ components: [getButtons().setComponents(
            getButtons().components.map((btn) => btn.setDisabled(true))
          )] });
        } catch (err) {
          if (err.code === 10008) {
            console.warn('Message no longer exists — cannot disable buttons.');
          } else {
            console.error('Error disabling buttons after collector ended:', err);
          }
        }
      });
    },
  };
  