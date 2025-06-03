const { EmbedBuilder } = require('discord.js');

/**
 * Create a consistent embed with a clean style and dynamic author/footer.
 *
 * @param {Object} options - Options for the embed.
 * @param {Object} [options.interaction] - The interaction object (for slash commands).
 * @param {Object} [options.message] - The message object (for text commands).
 * @param {string} options.title - Title of the embed.
 * @param {string} options.description - Description text.
 * @param {number} [options.color=0x2ecc71] - Embed color.
 * @param {Array} [options.fields=[]] - Fields array for the embed.
 * @param {Object} [options.footer] - Custom footer { text, iconURL }.
 * @param {string} [options.image] - Optional image URL.
 * @param {string} [options.thumbnail] - Optional thumbnail URL.
 * @param {string} [options.url] - Optional URL.
 * @returns {EmbedBuilder}
 */
function createBaseEmbed({
  interaction,
  author,
  message,
  title,
  description,
  color = 0x2ecc71,
  fields = [],
  footer,
  image,
  thumbnail,
  url,
}) {
  const embed = new EmbedBuilder();

  const user = interaction?.user || message?.author;
  const member = interaction?.member || message?.member;
  const guild = interaction?.guild || message?.guild;

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  embed.setColor(color);
  if (fields.length) embed.addFields(fields);

  if (footer && footer.text) {
    embed.setFooter({
      text: footer.text,
      iconURL: footer.iconURL || null,
    });
  } else {
    embed.setFooter({
      text: 'Keep working hard',
      iconURL: guild?.iconURL?.({ dynamic: true }) || null,
    });
  }
  
  if (author) {
  embed.setAuthor(author);
} else if (user) {
  const isSage = user.id === '685154245548310534';
  const name = isSage
    ? `Jade Sage, ${user.globalName || user.username}`
    : `Disciple ${member?.nickname || user.globalName || user.username}, Approach`;

  embed.setAuthor({
    name,
    iconURL: user.displayAvatarURL?.({ dynamic: true }) || null,
  });
}


  if (image) embed.setImage(image);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (url) embed.setURL(url);

  return embed;
}

module.exports = createBaseEmbed;
