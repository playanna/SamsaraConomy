const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const Inventory = require('../../models/Multipliers/inventory');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('View and manage your collected items'),
  stage: 'beta',

  async execute(interaction) {
    const userId = interaction.user.id;
    const itemsPerPage = 3;
    let page = 0;
    let currentCategory = 'all';

    // Fetch inventory
    let inventory;
    try {
      inventory = await Inventory.findOne({ userId }) || 
        new Inventory({ 
          userId, 
          souls: [], 
          artifacts: [], 
          materials: [], 
          alchemy: [], 
          karma: [] 
        });
    } catch (error) {
      console.error('Database error:', error);
      return interaction.reply({ 
        content: '❌ There was an error accessing your inventory. Please try again later.', 
        ephemeral: true 
      });
    }

    // Categories with emojis
    const categories = {
      all: { name: 'All Items', emoji: '📦', items: [] },
      souls: { name: 'Souls', emoji: '👻', items: inventory.souls },
      artifacts: { name: 'Artifacts', emoji: '🏺', items: inventory.artifacts },
      materials: { name: 'Materials', emoji: '🪨', items: inventory.materials },
      alchemy: { name: 'Alchemy', emoji: '🧪', items: inventory.alchemy },
      karma: { name: 'Karma', emoji: '☯️', items: inventory.karma }
    };

    // Combine all items for the 'all' category
    categories.all.items = [
      ...inventory.souls,
      ...inventory.artifacts,
      ...inventory.materials,
      ...inventory.alchemy,
      ...inventory.karma
    ];

    // Function to format items grouped by type
    const formatItemsGroupedByType = (items) => {
      if (!items.length) {
        return [{ name: 'No Items', value: 'This category is empty.', inline: false }];
      }

      // Group items by type
      const typeGroups = {};
      for (const item of items) {
        if (!typeGroups[item.type]) typeGroups[item.type] = [];
        typeGroups[item.type].push(item);
      }

      const fields = [];

      // For each type, create a header and list items
      for (const [type, typeItems] of Object.entries(typeGroups)) {
        // Sort items by baseName
        typeItems.sort((a, b) => a.baseName.localeCompare(b.baseName));

        const lines = typeItems.map(item => `- ${item.quantity}x ${item.baseName}`);
        fields.push({
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} Items:`,
          value: lines.join('\n'),
          inline: false
        });
      }

      return fields;
    };

    // Create inventory embed
    const createInventoryEmbed = (items, page, totalPages, category) => {
      const embed = new EmbedBuilder()
        .setAuthor({
          name: `Hi there! ${interaction.user.globalName || interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        })
        .setTitle(`${categories[category].emoji} ${categories[category].name} - Page ${page + 1}/${totalPages}`)
        .addFields(formatItemsGroupedByType(items))
        .setColor(0x6A5ACD)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({ 
          text: `Total Items: ${categories.all.items.length} • ${interaction.user.username}'s Inventory`,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

      return embed;
    };

    // Create only necessary buttons
    const createNecessaryButtons = () => {
      const components = [];

      const categorySelectRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('inv_category_select')
          .setPlaceholder('Select a category')
          .addOptions(
            Object.entries(categories)
              .filter(([key, cat]) => key === 'all' || cat.items.length > 0)
              .map(([key, cat]) => ({
                label: cat.name,
                value: key,
                emoji: cat.emoji,
                default: currentCategory === key
              }))
          )
      );
      components.push(categorySelectRow);

      const currentItems = categories[currentCategory].items;
      const totalPages = Math.max(1, Math.ceil(currentItems.length / itemsPerPage));
      if (totalPages > 1) {
        const navRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('inv_first').setLabel('⏮ First').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
          new ButtonBuilder().setCustomId('inv_previous').setLabel('◀ Previous').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
          new ButtonBuilder().setCustomId('inv_next').setLabel('Next ▶').setStyle(ButtonStyle.Primary).setDisabled(page >= totalPages - 1),
          new ButtonBuilder().setCustomId('inv_last').setLabel('Last ⏭').setStyle(ButtonStyle.Primary).setDisabled(page >= totalPages - 1)
        );
        components.push(navRow);
      }

      return components;
    };

    // Update the message with the current state
    const updateMessage = async (interactionToUpdate, newPage, newCategory) => {
      page = newPage;
      currentCategory = newCategory;

      const currentItems = categories[currentCategory].items;
      const totalPages = Math.max(1, Math.ceil(currentItems.length / itemsPerPage));
      page = Math.min(page, totalPages - 1);

      // Get the items for the current page
      const paginatedItems = currentItems.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

      const embed = createInventoryEmbed(paginatedItems, page, totalPages, currentCategory);
      const components = createNecessaryButtons();

      try {
        if (interactionToUpdate.deferred || interactionToUpdate.replied) {
          await interactionToUpdate.editReply({ embeds: [embed], components });
        } else {
          await interactionToUpdate.reply({ embeds: [embed], components });
        }
      } catch (error) {
        console.error('Error updating inventory message:', error);
      }
    };

    // Initial display
    await updateMessage(interaction, page, currentCategory);

    // Collector for navigation and category changes
    const filter = (i) => i.user.id === interaction.user.id && 
      (i.customId.startsWith('inv_') || i.customId === 'inv_category_select');
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 300000 });

    collector.on('collect', async (i) => {
      let newPage = page;
      let newCategory = currentCategory;

      if (i.customId === 'inv_category_select') {
        newCategory = i.values[0];
        newPage = 0;
      } else if (i.customId === 'inv_first') newPage = 0;
      else if (i.customId === 'inv_previous') newPage = Math.max(0, page - 1);
      else if (i.customId === 'inv_next') newPage = page + 1;
      else if (i.customId === 'inv_last') {
        const totalItems = categories[currentCategory].items.length;
        newPage = Math.max(0, Math.ceil(totalItems / itemsPerPage) - 1);
      }

      await i.deferUpdate();
      await updateMessage(i, newPage, newCategory);
    });

    collector.on('end', () => {
      const components = createNecessaryButtons().map(row => {
        row.components.forEach(component => component.setDisabled(true));
        return row;
      });
      interaction.editReply({ components }).catch(console.error);
    });
  }
};
