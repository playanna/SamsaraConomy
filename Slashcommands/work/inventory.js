const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const Inventory = require('../../models/Multipliers/inventory');
const { getPaginatedInventory, getOrMigrateInventory } = require('../../utils/workhelpers/handlers/inventoryHandlerOptimized');
const {emojis} = require('../../data/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('View and manage your collected items'),
  stage: 'beta',

  async execute(interaction) {
    const userId = interaction.user.id;
    const itemsPerPage = 12; // Increased from 3 for better UX with optimized pagination
    let page = 0;
    let currentCategory = 'all';

    // Fetch inventory using optimized system with automatic migration
    let inventory;
    try {
      inventory = await getOrMigrateInventory(userId);
      
      if (!inventory) {
        return interaction.reply({ 
          content: '❌ There was an error accessing your inventory. Please try again later.', 
          ephemeral: true 
        });
      }
    } catch (error) {
      console.error('Database error:', error);
      return interaction.reply({ 
        content: '❌ There was an error accessing your inventory. Please try again later.', 
        ephemeral: true 
      });
    }    // Categories with emojis - using optimized category counting from Maps
    const categories = {
      all: { name: 'All Items', emoji: '📦', count: 0 },
      souls: { name: 'Souls', emoji: '👻', count: 0 },
      artifacts: { name: 'Artifacts', emoji: '🏺', count: 0 },
      materials: { name: 'Materials', emoji: '🪨', count: 0 },
      alchemy: { name: 'Alchemy', emoji: '🧪', count: 0 },
      karma: { name: 'Karma', emoji: '☯️', count: 0 }
    };

    // Count items properly handling both Maps and Objects
    const countItems = (collection) => {
      if (!collection) return 0;
      if (collection instanceof Map) {
        return collection.size;
      } else if (typeof collection === 'object') {
        return Object.keys(collection).length;
      }
      return 0;
    };

    categories.souls.count = countItems(inventory.souls);
    categories.artifacts.count = countItems(inventory.artifacts);
    categories.materials.count = countItems(inventory.materials);
    categories.alchemy.count = countItems(inventory.alchemy);
    categories.karma.count = countItems(inventory.karma);

    // Calculate total items for 'all' category
    categories.all.count = categories.souls.count + categories.artifacts.count + 
                          categories.materials.count + categories.alchemy.count + categories.karma.count;    // Function to format items grouped by type with optimized pagination
    const formatItemsGroupedByType = async (category, page) => {
      const paginatedData = await getPaginatedInventory(userId, category, page, itemsPerPage);
            
      if (!paginatedData.items.length) {
        return {
          fields: [{ name: 'No Items', value: 'This category is empty.', inline: false }],
          totalPages: 1,
          totalCount: 0
        };
      }

      // Group items by type for display
      const typeGroups = {};
      for (const item of paginatedData.items) {
        const itemType = item.type || item.category;
        if (!typeGroups[itemType]) typeGroups[itemType] = [];
        typeGroups[itemType].push(item);
      }      const fields = [];

      // For each type, create a header and list items
      for (const [type, typeItems] of Object.entries(typeGroups)) {
        // Sort items by baseName for consistent display, with fallback for undefined baseName
        typeItems.sort((a, b) => {
          const nameA = a.baseName || a.name || '';
          const nameB = b.baseName || b.name || '';
          return nameA.localeCompare(nameB);
        });        const lines = typeItems.map(item => {
          const emoji = item.emoji || '🔮';
          const quantity = item.quantity || 1;
          const value = item.value || 0;
          const displayName = item.baseName || item.name || 'Unknown Item';
          
            return `${emoji} **${quantity}x** ${displayName} \`[each: ${value}\` ${emojis.heavenlyorbs}]`;
        });
        
        fields.push({
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} Items:`,
          value: lines.join('\n'),
          inline: false
        });
      }

      return {
        fields,
        totalPages: paginatedData.totalPages,
        totalCount: paginatedData.totalCount,
        metadata: paginatedData.metadata
      };
    };

    // Create inventory embed with optimized pagination support
    const createInventoryEmbed = async (category, page) => {
      const formattedData = await formatItemsGroupedByType(category, page);
      const metadata = formattedData.metadata || { totalItems: 0, totalValue: 0 };
      
      const embed = new EmbedBuilder()
        .setAuthor({
          name: `Hi there! ${interaction.user.globalName || interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        })
        .setTitle(`${categories[category].emoji} ${categories[category].name} - Page ${page + 1}/${formattedData.totalPages}`)
        .addFields(formattedData.fields)
        .setColor(0x6A5ACD)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({ 
          text: `Total Items: ${metadata.totalItems} • Total Value: ${metadata.totalValue} • ${interaction.user.username}'s Inventory`,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

      return { embed, totalPages: formattedData.totalPages };
    };

    // Create navigation buttons with optimized category filtering
    const createNecessaryButtons = (currentPage, totalPages) => {
      const components = [];

      const categorySelectRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('inv_category_select')
          .setPlaceholder('Select a category')
          .addOptions(
            Object.entries(categories)
              .filter(([key, cat]) => key === 'all' || cat.count > 0)
              .map(([key, cat]) => ({
                label: `${cat.name} (${cat.count})`,
                value: key,
                emoji: cat.emoji,
                default: currentCategory === key
              }))
          )
      );
      components.push(categorySelectRow);

      if (totalPages > 1) {
        const navRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('inv_first').setLabel('⏮ First').setStyle(ButtonStyle.Primary).setDisabled(currentPage === 0),
          new ButtonBuilder().setCustomId('inv_previous').setLabel('◀ Previous').setStyle(ButtonStyle.Primary).setDisabled(currentPage === 0),
          new ButtonBuilder().setCustomId('inv_next').setLabel('Next ▶').setStyle(ButtonStyle.Primary).setDisabled(currentPage >= totalPages - 1),
          new ButtonBuilder().setCustomId('inv_last').setLabel('Last ⏭').setStyle(ButtonStyle.Primary).setDisabled(currentPage >= totalPages - 1)
        );
        components.push(navRow);
      }

      return components;
    };

    // Update the message with optimized pagination
    const updateMessage = async (interactionToUpdate, newPage, newCategory) => {
      page = newPage;
      currentCategory = newCategory;

      const embedData = await createInventoryEmbed(currentCategory, page);
      const components = createNecessaryButtons(page, embedData.totalPages);
      
      // Validate page bounds
      page = Math.max(0, Math.min(page, embedData.totalPages - 1));

      try {
        // For component interactions that are deferred
        if (interactionToUpdate.deferred) {
          await interactionToUpdate.editReply({ embeds: [embedData.embed], components });
        }
        // For component interactions that haven't been responded to yet (check if update method exists)
        else if (typeof interactionToUpdate.update === 'function' && !interactionToUpdate.replied && !interactionToUpdate.deferred) {
          await interactionToUpdate.update({ embeds: [embedData.embed], components });
        }
        // For already replied interactions
        else if (interactionToUpdate.replied) {
          await interactionToUpdate.editReply({ embeds: [embedData.embed], components });
        }
        // For initial slash command
        else {
          await interactionToUpdate.reply({ embeds: [embedData.embed], components });
        }
      } catch (error) {
        console.error('Error updating inventory message:', error);
        // Fallback: try editReply if the interaction has been replied to
        try {
          if (interactionToUpdate.replied || interactionToUpdate.deferred) {
            await interactionToUpdate.editReply({ embeds: [embedData.embed], components });
          }
        } catch (fallbackError) {
          console.error('Fallback editReply failed:', fallbackError);
        }
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
        newPage = 0; // Reset to first page when changing category
      } else if (i.customId === 'inv_first') {
        newPage = 0;
      } else if (i.customId === 'inv_previous') {
        newPage = Math.max(0, page - 1);
      } else if (i.customId === 'inv_next') {
        newPage = page + 1;
      } else if (i.customId === 'inv_last') {
        // Get actual total pages for current category
        const tempData = await formatItemsGroupedByType(currentCategory, 0);
        newPage = Math.max(0, tempData.totalPages - 1);
      }

      // Update the message with new page/category
      await updateMessage(i, newPage, newCategory);
    });

    collector.on('end', async () => {
      try {
        const embedData = await createInventoryEmbed(currentCategory, page);
        const components = createNecessaryButtons(page, embedData.totalPages).map(row => {
          row.components.forEach(component => component.setDisabled(true));
          return row;
        });
        await interaction.editReply({ components });
      } catch (error) {
        console.error('Error disabling components:', error);
      }
    });
  }
};
