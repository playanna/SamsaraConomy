const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const Inventory = require('../../models/Multipliers/inventory');
const Hand = require('../../models/balance/hand');
const ExpeditionSettings = require('../../models/Multipliers/expeditionSetting');
const { sendStorySequence, sendWithMeditation } = require('../../utils/sendStorySequence.js');
const { getOrMigrateInventory, sellAllItemsOptimized } = require('../../utils/workhelpers/handlers/inventoryHandler.js');

function calculateSellMultiplier(traderXP) {
  return 1.0 + (traderXP / 1000) * 0.01;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sell')
    .setDescription('Begin a transaction with the Sect Treasury')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  async execute(interaction) {
    const userId = interaction.user.id;
    const spiritstones = '<:karmicstone:757981408143868034>';

    try {
      await interaction.deferUpdate();

      // First story: Entering the treasury
      await sendStorySequence(interaction.channel, [
        { sender: 'narrator', text: 'You walk beneath carved stone archways into the Treasury Pavilion. Incense coils in the air.' },
        { sender: 'narrator', text: 'Golden light spills from jade sconces, illuminating ancient relics locked in stasis.' },
        { sender: 'elder', text: '...You again. What do you want from me *today*?' }
      ], 150);

      // Elder prompt embed
      const promptEmbed = new EmbedBuilder()
        .setTitle('Treasury Elder Awaits')
        .setDescription('> *"Speak. Do you come to offer tribute... or waste my time?"*')
        .setColor(0x8B0000);

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('contribute_items')
          .setLabel('I want to contribute my items')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('cancel_sell')
          .setLabel('Nevermind')
          .setStyle(ButtonStyle.Secondary)
      );

      await sendWithMeditation(interaction, {
        embeds: [promptEmbed],
        components: [buttons],
      });

      // Button collector
      const collector = interaction.channel.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id, // Filter out other users
        time: 60000 // 1 minute timeout
      });

      collector.on('collect', async (i) => {
        if (i.customId === 'cancel_sell') {
          await i.deferUpdate();
          await sendWithMeditation(interaction, { content: '*You bow respectfully and step away from the pavilion.*', embeds: [], components: [], ephemeral: true });
          collector.stop();
          return;
        }        if (i.customId === 'contribute_items') {
          await i.deferUpdate();
          const inventory = await getOrMigrateInventory(userId);
          if (!inventory || !['souls', 'artifacts', 'materials', 'alchemy', 'karma'].some(k => inventory[k]?.size > 0)) {
            await sendWithMeditation( interaction, {
              content: '📜 *The Treasury Elder frowns:* "You bring me nothing of value. Return when your pouch is not empty."',
              components: [],
              embeds: [],
              ephemeral: true
            });
            collector.stop();
            return;
          }

          // Short story: inspecting items
          await sendWithMeditation( interaction, { components: [], embeds: [], content: '*The Elder’s eyes glow faintly as he peers through your wares...*' });

          await sendStorySequence(interaction.channel, [
            { sender: 'elder', text: '*Hmmm... these are... acceptable.*' },
            { sender: 'narrator', text: '*His hand flickers with divine light, assessing your belongings.*' }
          ], 120);          // Value calculation using optimized inventory
          let baseValue = 0;
          let soldItemsCount = 0;
          const categories = ['souls', 'artifacts', 'materials', 'alchemy', 'karma'];

          for (const category of categories) {
            if (inventory[category] && inventory[category].size > 0) {
              for (const [itemId, item] of inventory[category]) {
                const quantity = item.quantity || 1;
                baseValue += (item.value || 0) * quantity;
                soldItemsCount += quantity;
              }
            }
          }

          let settings = await ExpeditionSettings.findOne({ userId });
          if (!settings) settings = new ExpeditionSettings({ userId, traderXP: 0 });

          const traderXpGained = baseValue / 10;
          const newTraderXP = settings.traderXP + traderXpGained;
          const multiplier = calculateSellMultiplier(newTraderXP);
          const finalValue = Math.floor(baseValue * multiplier);

          const offerEmbed = new EmbedBuilder()
            .setTitle('📦 The Elder Evaluates Your Offerings')
            .setDescription('> *"This is what I’m prepared to offer you."*')
            .setColor(0x4b0082)
            .addFields(
              {
                name: 'Items Assessed',
                value: `\`${soldItemsCount}\` items | Base Value: \`${baseValue}\` ${spiritstones}`,
                inline: true
              },
              {
                name: 'Offered Tribute',
                value: `**\`${finalValue.toFixed(2)}\`** ${spiritstones} \n(Multiplier: \`x${multiplier.toFixed(2)}\`)`,
                inline: true
              }
            );

          const dealButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('accept_deal')
              .setLabel('Take the deal')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('decline_deal')
              .setLabel('Nevermind')
              .setStyle(ButtonStyle.Danger)
          );

          await sendWithMeditation(interaction, {
            embeds: [offerEmbed],
            components: [dealButtons],
          });
        }        // Handle deal acceptance using optimized system
        if (i.customId === 'accept_deal') {
          await i.deferUpdate();
          const hand = await Hand.findOneAndUpdate(
            { userId },
            {},
            { upsert: true, new: true }
          );
          const settings = await ExpeditionSettings.findOne({ userId });

          // Use optimized sell function
          const { baseValue, soldItemsCount } = await sellAllItemsOptimized(userId);

          const traderXpGained = baseValue / 10;
          settings.traderXP += traderXpGained;
          settings.sellMultiplier = calculateSellMultiplier(settings.traderXP);
          const finalValue = Math.floor(baseValue * settings.sellMultiplier);
          hand.balance += finalValue;

          await Promise.all([settings.save(), hand.save()]);

          // Final story and receipt
          await sendStorySequence(interaction.channel, [
            { sender: 'narrator', text: '*Your spirit pouch pulses as the Elder flings a golden seal toward you.*' },
            { sender: 'elder', text: `"It is done. May your fate improve... if only slightly."` }
          ], 120);

          const receiptEmbed = new EmbedBuilder()
            .setTitle('✅ Transaction Complete')
            .setColor(0x228B22)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
              { name: 'Total Received', value: `**\`${finalValue.toFixed(2)}\`** ${spiritstones}` },
              { name: 'Updated Balance', value: `**\`${hand.balance.toFixed(2)}\`** ${spiritstones}` }
            )
            .setFooter({
              text: `${interaction.user.username}'s Treasury Receipt`,
              iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

          await sendWithMeditation(interaction,{ embeds: [receiptEmbed]});
          collector.stop();
        }

        if (i.customId === 'decline_deal') {
          await i.deferUpdate();
          await sendWithMeditation( interaction, { content: '*You close your pouch and walk away without a word.*', embeds: [], components: [] });
          collector.stop();
        }
      });

    } catch (err) {
      console.error('Error during sell command:', err);
      await interaction.reply({
        content: '💢 *The Treasury Elder snarls:* "The karmic ledgers are broken... try again later."',
        ephemeral: true
      });
    }
  }
};
