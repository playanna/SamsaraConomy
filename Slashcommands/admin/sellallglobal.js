const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const Inventory = require('../../models/Multipliers/inventory');
const InventoryOptimized = require('../../models/Multipliers/inventoryOptimized');
const Hand = require('../../models/balance/hand');
const Clanpoints = require('../../models/Clan/clanpoints');
const ExpeditionSettings = require('../../models/Multipliers/expeditionSetting');
const {sendStorySequence} = require('../../utils/sendStorySequence');
const {emojis} = require('../../data/emojis');
const { getOrMigrateInventory, sellAllItemsOptimized } = require('../../utils/workhelpers/handlers/inventoryHandlerOptimized.js');

function calculateSellMultiplier(traderXP) {
  return 1.0 + (traderXP / 1000) * 0.01;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sellallglobal')
    .setDescription('ADMIN: Sell all items from every user\'s inventory in the database')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    stage: 'beta',

  async execute(interaction) {
    await interaction.deferReply();

    const heavenlyorbs = emojis.heavenlyorbs;    try {
      // Find all users with items in both old and new inventory systems
      const [oldInventories, optimizedInventories] = await Promise.all([
        Inventory.find({
          $or: [
            { 'souls.0': { $exists: true } },
            { 'artifacts.0': { $exists: true } },
            { 'materials.0': { $exists: true } },
            { 'alchemy.0': { $exists: true } },
            { 'karma.0': { $exists: true } }
          ]
        }),
        InventoryOptimized.find({
          $or: [
            { 'metadata.totalItems': { $gt: 0 } },
            { 'souls': { $ne: null, $exists: true } },
            { 'artifacts': { $ne: null, $exists: true } },
            { 'materials': { $ne: null, $exists: true } },
            { 'alchemy': { $ne: null, $exists: true } },
            { 'karma': { $ne: null, $exists: true } }
          ]
        })
      ]);

      // Combine all user IDs
      const allUserIds = new Set([
        ...oldInventories.map(inv => inv.userId),
        ...optimizedInventories.map(inv => inv.userId)
      ]);

      if (allUserIds.size === 0) {
        return interaction.editReply({
          content: '*The void portal scans all realms...* "Not a single trinket exists across all dimensions. Even rats have more treasure!"'
        });
      }

      let totalUsersProcessed = 0;
      let totalItemsSold = 0;
      let totalValueGenerated = 0;

      // Process each user using optimized system
      for (const userId of allUserIds) {
        try {
          // Use optimized sell function which handles migration automatically
          const { baseValue, soldItemsCount } = await sellAllItemsOptimized(userId);

          if (baseValue > 0) {
            // Get or create user's settings and balance records
            const [settings, clanpoints] = await Promise.all([
              ExpeditionSettings.findOneAndUpdate(
                { userId },
                { $inc: { traderXP: baseValue / 10 } },
                { upsert: true, new: true }
              ),
              Clanpoints.findOneAndUpdate(
                { userId },
                {},
                { upsert: true, new: true }
              )
            ]);

            const multiplier = calculateSellMultiplier(settings.traderXP);
            const finalValue = Math.floor(baseValue * multiplier);

            // Add to user's clan points balance
            clanpoints.balance += finalValue;
            await clanpoints.save();

            totalUsersProcessed++;
            totalItemsSold += soldItemsCount;
            totalValueGenerated += finalValue;
          }
        } catch (userError) {
          console.error(`Error processing user ${userId}:`, userError);
          // Continue processing other users
        }
      }

      // Send completion message
      await sendStorySequence(interaction.channel, [
        { 
          sender: 'statue',
          embed: {
            title: '◈ DIMENSIONAL VOID CLEANSING COMPLETE ◈',
            description: [
              `## 🌌 The Great Purge Has Concluded`,
              ``,
              `**Users Affected:** ${totalUsersProcessed.toLocaleString()}`,
              `**Items Consumed:** ${totalItemsSold.toLocaleString()} trinkets`,
              `**Total Value Generated:** \`${totalValueGenerated.toLocaleString()}\` ${heavenlyorbs}`,
              ``,
              `> *"From the ashes of a thousand hoarded treasures,*`,
              `> *the void birth currency anew. All possessions*`,
              `> *are but illusions—only karmic jade endures."*`,
              ``,
              `**The cosmic ledgers have been balanced.**`
            ].join('\n'),
            color: 0x8B0000,
            footer: {
              text: 'The Void Merchant thanks you for this offering. The cycle continues.',
              icon_url: interaction.guild.iconURL()
            },
            timestamp: new Date()
          }
        }
      ], 200);

    } catch (err) {
      console.error('Error during global sell command:', err);
      await interaction.editReply({
        content: '💢 *The Dimensional Void convulses violently!* "The cosmic ledgers have collapsed into chaos! Even I cannot process this magnitude of destruction..."'
      });
    }
  }
};
