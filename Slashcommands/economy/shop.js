const { SlashCommandBuilder } = require('@discordjs/builders');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType
} = require('discord.js');
const ShopInventory = require('../../models/Gears/shopInventory.js');
const UserGear = require('../../models/Gears/UserGear.js');
const Hand = require('../../models/balance/hand.js');
const createBaseEmbed = require('../../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('armory')
    .setDescription('Visit the Heavenly Armory to acquire sacred artifacts'),

    async execute(interaction) {
      await executeArmory(interaction, false); // Slash command
    }
  };

  module.exports.executeArmory = executeArmory;


async function executeArmory(interaction, followUpMode = false) {
  if (!interaction.deferred && !interaction.replied) {
    if (followUpMode) {
      await interaction.deferReply({ ephemeral: true });
    } else {
      await interaction.deferReply();
    }
  }

  try {
    const shop = await ShopInventory.findOne({ shopId: 'global_shop' });
      if (!shop?.items?.length) {
        return interaction.editReply({ 
          content: '🔮 *The Armory Master sighs:* "The celestial forges are cold today. Return when the stars align."' 
        });
      }

      const groupedBySlot = groupItemsBySlot(shop.items);
      const slotKeys = Object.keys(groupedBySlot);
      let currentSlotIndex = 0;

      let currentSlotName = slotKeys[currentSlotIndex];
      let items = groupedBySlot[currentSlotName];

      const embed = buildSlotEmbed(interaction, currentSlotName, items);
      const row = getPaginationRow();
      const select = getSelectMenu(items);

      const message = await interaction.editReply({
        embeds: [embed],
        components: [row, select]
      });

      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i => i.user.id === interaction.user.id,
        time: 90_000
      });

      const selectCollector = message.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        filter: i => i.user.id === interaction.user.id,
        time: 90_000
      });

      collector.on('collect', async i => {
        if (i.customId === 'shop_prev') {
          currentSlotIndex = (currentSlotIndex - 1 + slotKeys.length) % slotKeys.length;
        } else if (i.customId === 'shop_next') {
          currentSlotIndex = (currentSlotIndex + 1) % slotKeys.length;
        }

        currentSlotName = slotKeys[currentSlotIndex];
        items = groupedBySlot[currentSlotName];

        await i.update({
          embeds: [buildSlotEmbed(interaction, currentSlotName, items)],
          components: [getPaginationRow(), getSelectMenu(items)]
        });
      });

      selectCollector.on('collect', async i => {
        const selectedItemName = i.values[0];
        const selectedItem = items.find(item => item.name === selectedItemName);
        if (!selectedItem) {
          return i.reply({ 
            content: '💢 *The artifact dissolves into mist before your eyes!* "This treasure no longer exists."',
            ephemeral: true 
          });
        }

        const hand = await Hand.findOne({ userId: i.user.id }) || new Hand({ userId: i.user.id, balance: 0 });

        if (hand.balance < selectedItem.price) {
          return i.reply({ 
            content: `💰 *The Armory Master scoffs:* "Your ${hand.balance} spirit stones wouldn't buy a mortal's kitchen knife!" (Requires: ${selectedItem.price.toLocaleString()})`,
            ephemeral: true 
          });
        }

        hand.balance -= selectedItem.price;
        await hand.save();

        await UserGear.findOneAndUpdate(
          { userId: i.user.id },
          {
            $push: { 
              gear: { 
                ...selectedItem, 
                acquiredAt: new Date(),
                inscription: getRandomInscription() // New lore field
              } 
            },
            $set: { lastModified: new Date() }
          },
          { upsert: true }
        );

        return i.reply({
          content: `✨ **${selectedItem.name}** *shudders as it bonds with your soul!*\n` +
                   `The Armory Master nods: "This ${getArtifactType(selectedItem.slot)} shall serve you well."\n` +
                   `(Paid: ${selectedItem.price.toLocaleString()} ${spiritstones})`,
          ephemeral: true
        });
      });
      
  } catch (err) {
    console.error('Armory error:', err);
    const replyFn = isFollowUp ? interaction.followUp : interaction.editReply;
    await replyFn({ 
      content: '☯️ *The Bagua formation flickers!* "The armory seals are unstable... try again later."' 
    });
  }
}


// ====== LORE-INFUSED UTILITIES ====== //
const spiritstones = '<:karmicstone:757981408143868034>';

function getArtifactType(slot) {
  const types = {
    weapon: "spirit weapon",
    armor: "divine armor",
    accessory: "mystical artifact",
    head: "heavenly crown",
    feet: "phoenix treads"
  };
  return types[slot] || "sacred treasure";
}

function getRandomInscription() {
  const inscriptions = [
    "Forged in the heart of Mount Kunlun",
    "Bathed in dragon's blood for 49 days",
    "Contains a fragment of the Broken Heavenly Mirror",
    "Whispers with the voice of a long-dead immortal",
    "Glows faintly with unreadable ancient runes",
    "Warm to the touch despite being ice-cold",
    "The weight changes depending on who holds it"
  ];
  return inscriptions[Math.floor(Math.random() * inscriptions.length)];
}

function formatBonuses(bonuses) {
  const loreEffects = {
    cooldownReduction: "Temporal Compression",
    lossProtection: "Karmic Shielding",
    lootMultiplier: "Spiritual Attraction",
    xpMultiplier: "Enlightenment Acceleration", 
    jackpotBoost: "Heaven's Favor"
  };

  return Object.entries(bonuses).map(([key, val]) => {
    const effectName = loreEffects[key] || key;
    if (key === 'jackpotBoost') return `☯ ${effectName}: +${val}% celestial blessing`;
    if (['cooldownReduction', 'lossProtection'].includes(key))
      return `☯ ${effectName}: ${((1 - val) * 100).toFixed(0)}% damage reduction`;
    if (['lootMultiplier', 'xpMultiplier'].includes(key))
      return `☯ ${effectName}: ${((val - 1) * 100).toFixed(0)}% increased flow`;
    return `☯ ${key}: ${val}`;
  }).join('\n');
}

function buildSlotEmbed(interaction, slotName, items) {
  const slotTitles = {
    weapon: "⚔️ Divine Weapons",
    armor: "🛡️ Celestial Armors", 
    accessory: "💍 Mystical Accessories",
    head: "👑 Heavenly Crowns",
    feet: "👞 Phoenix Treads"
  };

  const emoji = `<a:flamegreenspiritlight:1361606150067327098>` ;

  const fields = items.map(item => {
    return {
      name: `${emoji} ${item.name} [${item.rarity.toUpperCase()}]`,
      value: `**Origin**: ${item.set || "Unknown Forge"}\n` +
             `**Cost**: ${item.price.toLocaleString()} ${spiritstones}\n` +
             `**Dao Effects**:\n${formatBonuses(item.bonuses || {})}`,
      inline: false
    };
  });

  return createBaseEmbed({
    interaction,
    title: `**Heavenly Armory - ${slotTitles[slotName] || slotName}**`,
    description: `> *"The air hums with primordial energy as you behold ${slotName === 'weapon' ? 'these instruments of divine will' : 'these vessels of protection'}..."*\n`,
    color: 0x5e35b1,
    thumbnail: 'https://i.ibb.co/5gjS0Lsy/GWWz-Lt-Wb-QAMEkx-Y.jpg',
    fields,
    footer: {
      text: '「神兵利器，待主而栖」\n"Divine weapons await their destined masters"',
      iconURL: interaction.guild?.iconURL({ dynamic: true })
    }
  });
}

// (Keep existing groupItemsBySlot, getPaginationRow, getSelectMenu, capitalize functions)

// Utility functions
function groupItemsBySlot(items) {
  return items.reduce((acc, item) => {
    if (!acc[item.slot]) acc[item.slot] = [];
    acc[item.slot].push(item);
    return acc;
  }, {});
}


function getPaginationRow(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('shop_prev')
      .setLabel('◀️ Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('shop_next')
      .setLabel('▶️ Next')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled)
  );
}

function getSelectMenu(items) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('gear_buy')
      .setPlaceholder('🛒 Choose an item to buy')
      .addOptions(
        items.map(item => ({
          label: `${item.name} (${item.rarity})`,
          description: `Price: ${item.price.toLocaleString()} gold`,
          value: item.name
        }))
      )
  );
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}