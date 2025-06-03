const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const Inventory = require('../../models/Multipliers/inventory');
const Hand = require('../../models/balance/hand');
const Clanpoints = require('../../models/Clan/clanpoints');
const ExpeditionSettings = require('../../models/Multipliers/expeditionSetting');
const {sendStorySequence} = require('../../utils/sendStorySequence');
const {emojis} = require('../../data/emojis');

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

    const heavenlyorbs = emojis.heavenlyorbs;
    
    try {
      // Find all inventories in the database that have items
      const allInventories = await Inventory.find({
        $or: [
          { 'souls.0': { $exists: true } },
          { 'artifacts.0': { $exists: true } },
          { 'materials.0': { $exists: true } },
          { 'alchemy.0': { $exists: true } },
          { 'karma.0': { $exists: true } }
        ]
      });

      if (allInventories.length === 0) {
        return interaction.editReply({
          content: '*The void portal scans all realms...* "Not a single trinket exists across all dimensions. Even rats have more treasure!"'
        });
      }

      let totalUsersProcessed = 0;
      let totalItemsSold = 0;
      let totalValueGenerated = 0;
      const categories = ['souls', 'artifacts', 'materials', 'alchemy', 'karma'];

      // Process each user's inventory
      for (const inventory of allInventories) {
        const userId = inventory.userId;
        
        let userBaseValue = 0;
        let userItemsCount = 0;

        // Calculate value for this user's inventory
        for (const category of categories) {
          if (inventory[category] && inventory[category].length > 0) {
            for (const item of inventory[category]) {
              const quantity = item.quantity || 1;
              userBaseValue += (item.value || 0) * quantity;
              userItemsCount += quantity;
            }
          }
        }

        if (userBaseValue > 0) {
          // Get or create user's settings and balance records
          const [settings, clanpoints] = await Promise.all([
            ExpeditionSettings.findOneAndUpdate(
              { userId },
              { $inc: { traderXP: userBaseValue / 10 } },
              { upsert: true, new: true }
            ),
            Clanpoints.findOneAndUpdate(
              { userId },
              {},
              { upsert: true, new: true }
            )
          ]);

          const multiplier = calculateSellMultiplier(settings.traderXP);
          const finalValue = Math.floor(userBaseValue * multiplier);

          // Add to user's clan points balance
          clanpoints.balance += finalValue;

          // Clear inventory
          categories.forEach(cat => inventory[cat] = []);

          // Save changes
          await Promise.all([
            settings.save(),
            clanpoints.save(),
            inventory.save()
          ]);

          totalUsersProcessed++;
          totalItemsSold += userItemsCount;
          totalValueGenerated += finalValue;
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
