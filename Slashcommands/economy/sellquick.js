const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const Inventory = require('../../models/Multipliers/inventory');
const Hand = require('../../models/balance/hand');
const Clanpoints = require('../../models/Clan/clanpoints');
const ExpeditionSettings = require('../../models/Multipliers/expeditionSetting');
const {emojis} = require('../../data/emojis');

function calculateSellMultiplier(traderXP) {
  return 1.0 + (traderXP / 1000) * 0.01;
}

// Webhook cache to avoid repeated fetches
const webhookCache = new Map();

// Fast webhook function for sellquick
async function sendQuickWebhookMessage(channel, embed) {
  try {
    const channelId = channel.id;
    
    // Check cache first
    let webhook = webhookCache.get(channelId);
    
    if (!webhook) {
      // Check permissions once
      const permissions = channel.permissionsFor(channel.guild.members.me);
      if (!permissions?.has('ManageWebhooks')) {
        // Fallback to regular message if no webhook permissions
        return await channel.send({ embeds: [embed] });
      }

      // Try to find existing webhook or create one
      const webhooks = await channel.fetchWebhooks();
      webhook = webhooks.find(w => 
        w.name === 'Ancient Jade Statue' && 
        w.owner?.id === channel.client.user.id
      );

      if (!webhook) {
        webhook = await channel.createWebhook({
          name: 'Ancient Jade Statue',
          avatar: 'https://i.ibb.co/SDRhpw0Y/artbreeder-image-2025-04-30-T08-01-54-905-Z.jpg',
          reason: 'Sellquick merchant webhook'
        });
      }
      
      // Cache the webhook for future use
      webhookCache.set(channelId, webhook);
    }

    // Send immediately via webhook
    await webhook.send({ embeds: [embed] });

  } catch (err) {
    console.warn('Webhook failed, falling back to regular message:', err.message);
    // Remove from cache if webhook is invalid
    webhookCache.delete(channel.id);
    // Fallback to regular channel message
    await channel.send({ embeds: [embed] });
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sellquick')
    .setDescription('Sell all items from your inventory for spiritstones')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),  async execute(interaction) {
    const userId = interaction.user.id;
    const heavenlyorbs = emojis.heavenlyorbs;

    // Quick acknowledgment
    await interaction.reply({ content: '🔄 *The void merchant examines your offerings...*', ephemeral: true });

    try {
      // Single database query to get inventory
      const inventory = await Inventory.findOne({ userId }).lean();
      if (!inventory) {
        const errorEmbed = new EmbedBuilder()
          .setDescription('*A disgruntled scoff comes from the void portal:* "Your inventory is emptier than a mortal\'s spiritual roots!"')
          .setColor(0xE74C3C);
        return sendQuickWebhookMessage(interaction.channel, errorEmbed);
      }

      // Fast empty check using array lengths
      const categories = ['souls', 'artifacts', 'materials', 'alchemy', 'karma'];
      const hasItems = categories.some(cat => inventory[cat]?.length > 0);
      
      if (!hasItems) {
        const errorEmbed = new EmbedBuilder()
          .setDescription('*A disgruntled scoff comes from the void portal:* "Your inventory is emptier than a mortal\'s spiritual roots!"')
          .setColor(0xE74C3C);
        return sendQuickWebhookMessage(interaction.channel, errorEmbed);
      }

      // Calculate values in a single pass
      let baseValue = 0;
      let soldItemsCount = 0;
      
      for (const category of categories) {
        if (inventory[category]?.length > 0) {
          for (const item of inventory[category]) {
            const quantity = item.quantity || 1;
            baseValue += (item.value || 0) * quantity;
            soldItemsCount += quantity;
          }
        }
      }      // Early exit if no valuable items
      if (baseValue === 0) {
        const errorEmbed = new EmbedBuilder()
          .setDescription('*The void merchant snorts:* "These worthless trinkets aren\'t even worth my time!"')
          .setColor(0xE74C3C);
        return sendQuickWebhookMessage(interaction.channel, errorEmbed);
      }

      // Parallel database operations for better performance
      const [settings, clanpoints] = await Promise.all([
        ExpeditionSettings.findOneAndUpdate(
          { userId },
          { $inc: { traderXP: Math.floor(baseValue / 10) } },
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

      // Update balance and clear inventory in parallel
      const inventoryUpdate = Inventory.updateOne(
        { userId },
        { 
          $set: {
            souls: [],
            artifacts: [],
            materials: [],
            alchemy: [],
            karma: []
          }
        }
      );

      const balanceUpdate = Clanpoints.updateOne(
        { userId },
        { $inc: { balance: finalValue } },
        { upsert: true }
      );

      await Promise.all([inventoryUpdate, balanceUpdate]);      // Create and send embed
      const sellEmbed = new EmbedBuilder()
        .setDescription(`## ◈ Merchant Express Service◈ \n**${soldItemsCount} trinkets** dissolve into the void—barely worth its notice.\n> -# *A pitiful offering.*\n\n**\`${finalValue}\` ${heavenlyorbs}** clatter before you as the void's portal closes.`)
        .setColor(0x2ECC71)
        .setFooter({
          text: 'Thank you for using our express service! But the void expects better next time.',
          iconURL: interaction.guild.iconURL()
        });
      
      await sendQuickWebhookMessage(interaction.channel, sellEmbed);

    } catch (err) {
      console.error('Error during sell command:', err);
      const errorEmbed = new EmbedBuilder()
        .setDescription('💢 *The Void shuts down abruptly!* "The karmic ledgers are in chaos... try again later."')
        .setColor(0xE74C3C);
      await sendQuickWebhookMessage(interaction.channel, errorEmbed);
    }
  }
};
