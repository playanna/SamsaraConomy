const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');
const { gearDataManager } = require('../../utils/dataManagers'); // Lazy loading gear data
const ShopInventory = require('../../models/Gears/shopInventory'); // DB model

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gearshop')
    .setDescription('Populates the global gear shop with up to 4 items per gear slot.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Get all gear items using lazy loading manager
      const allGearItems = await gearDataManager.getAllGearItems();
      const newInventory = getRandomGearBySlot(allGearItems, 4); // Max 4 per slot

      await ShopInventory.updateOne(
        { shopId: 'global_shop' },
        {
          $set: {
            items: newInventory,
            lastUpdated: new Date()
          }
        },
        { upsert: true }
      );

      await interaction.editReply({ content: '🛡️ Gear Shop has been stocked with new items!', ephemeral: true });
    } catch (err) {
      console.error('⚠️ Gear Shop Update Error:', err);
      await interaction.editReply({ content: 'An error occurred while updating the Gear Shop.', ephemeral: true });
    }
  }
};

/**
 * Randomly selects up to `maxPerSlot` gear items for each unique slot.
 * @param {Array<Object>} gearList - The full list of gear items
 * @param {number} maxPerSlot - Maximum number of items per slot
 * @returns {Array<Object>} Array of selected gear items
 */
function getRandomGearBySlot(gearList, maxPerSlot = 4) {
  const groupedBySlot = gearList.reduce((acc, item) => {
    if (!acc[item.slot]) acc[item.slot] = [];
    acc[item.slot].push(item);
    return acc;
  }, {});

  const selected = [];

  for (const slot in groupedBySlot) {
    const items = groupedBySlot[slot];
    const count = Math.min(maxPerSlot, items.length);
    const shuffled = shuffleArray(items);
    selected.push(...shuffled.slice(0, count));
  }

  return selected;
}

/**
 * Simple in-place shuffle (Fisher-Yates)
 */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
