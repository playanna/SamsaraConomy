// Slashcommands/embed.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Replies with a rich embed'),

  async execute(interaction) {
    const embed = createBaseEmbed({
      title: 'Hello from the embed command!',
      description: 'This is a clean and expandable embed.',
      color: 0x3498db, // blue
      fields: [
        { name: 'Field 1', value: 'This is a value', inline: true },
        { name: 'Field 2', value: 'Another value', inline: true },
      ],
    });

    await interaction.reply({ embeds: [embed] });
  }
};

/**
 * 🔧 Embed builder helper
 * Makes creating consistent embeds easy and reusable.
 */
function createBaseEmbed({ title, description, color, fields = [], footer, image, thumbnail, url, author }) {
    const embed = new EmbedBuilder()
      .setTitle(title || '')
      .setDescription(description || '')
      .setColor(color || 0x2ecc71); // default green
  
    if (fields.length) embed.addFields(fields);
    if (footer) embed.setFooter(footer);
    if (image) embed.setImage(image);
    if (thumbnail) embed.setThumbnail(thumbnail);
    if (url) embed.setURL(url);
    if (author) {
      if (!author.name) {
        console.warn('createBaseEmbed received author without a name:', author);
      } else {
        embed.setAuthor({
          name: author.name,
          iconURL: author.iconURL || undefined,
          url: author.url || undefined,
        });
      }
    }
    
  
    embed.setTimestamp(); // Add timestamp for all embeds
  
    return embed;
  }
  