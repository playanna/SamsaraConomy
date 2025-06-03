const { SlashCommandBuilder } = require('@discordjs/builders');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  StringSelectMenuBuilder
} = require('discord.js');
const UserGear = require('../../models/Gears/UserGear.js');
const EquippedGear = require('../../models/Gears/EquippedGear.js');
const createBaseEmbed = require('../../utils/embed');
const updateUserMultipliers = require('../../utils/updatemultipliers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('artifacts')
    .setDescription('Commune with your spiritual treasures and bind them to your soul'),

  async execute(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const userGear = await UserGear.findOne({ userId });

    if (!userGear?.gear?.length) {
      return interaction.editReply({
        content: '🧘 *The Void echoes:* "Your soul carries no treasures worthy of binding."\nVisit the **/armory** to acquire sacred artifacts.',
        ephemeral: true
      });
    }

    const grouped = groupItemsBySlot(userGear.gear);
    const slotKeys = Object.keys(grouped);
    let currentSlotIndex = 0;

    const getPageEmbed = () => buildSlotEmbed(interaction, slotKeys[currentSlotIndex], grouped[slotKeys[currentSlotIndex]]);
    const getCurrentEquipMenu = () => getEquipMenu(grouped[slotKeys[currentSlotIndex]]);

    const message = await interaction.editReply({
      embeds: [getPageEmbed()],
      components: [getPaginationRow(), getCurrentEquipMenu()]
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000,
      filter: i => i.user.id === interaction.user.id
    });

    collector.on('collect', async i => {
      if (i.customId === 'gear_prev') {
        currentSlotIndex = (currentSlotIndex - 1 + slotKeys.length) % slotKeys.length;
      } else if (i.customId === 'gear_next') {
        currentSlotIndex = (currentSlotIndex + 1) % slotKeys.length;
      }

      await i.update({
        embeds: [getPageEmbed()],
        components: [getPaginationRow(), getCurrentEquipMenu()]
      });
    });

    const equipCollector = message.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      filter: i => i.user.id === interaction.user.id && i.customId === 'gear_equip',
      time: 60_000
    });

    equipCollector.on('collect', async i => {
      const selectedName = i.values[0];
      const allItemsInSlot = grouped[slotKeys[currentSlotIndex]];
      const selectedItem = allItemsInSlot.find(item => item.name === selectedName);
      
      if (!selectedItem) {
        return i.reply({ 
          content: '🌀 *The artifact dissolves into stardust before your eyes!* "This treasure has returned to the cosmos."',
          ephemeral: true 
        });
      }

      const equippedGearDoc = await EquippedGear.findOne({ userId });
      const gearInSlot = equippedGearDoc ? equippedGearDoc.gear.filter(g => g.slot === selectedItem.slot) : [];

      if (gearInSlot.length) {
        // Unbind previous artifact
        await EquippedGear.updateOne(
          { userId },
          { $pull: { gear: { slot: selectedItem.slot } } }
        );
      }

      // Perform soul-binding ritual
      await EquippedGear.updateOne(
        { userId },
        {
          $push: { 
            gear: { 
              slot: selectedItem.slot, 
              item: selectedItem,
              bondedAt: new Date() // New field for lore
            } 
          },
          $set: { lastUpdated: new Date() }
        },
        { upsert: true }
      );
      
      await updateUserMultipliers(userId);
      
      return i.reply({
        content: `✨ **${selectedItem.name}** *shudders as it fuses with your meridians!*\n` +
                 `The artifact's ${getItemSoul(selectedItem.slot)} now flows with your qi.\n` +
                 `(${getBindingEffect(selectedItem.rarity)})`,
        ephemeral: true
      });
    });

    collector.on('end', async () => {
      await message.edit({ components: [getPaginationRow(true)] }).catch(() => {});
    });
  }
};

// ====== CULTIVATION UTILITIES ====== //
function getItemSoul(slot) {
  const souls = {
    weapon: "martial spirit",
    armor: "protective essence",
    accessory: "mystical core",
    head: "third eye",
    feet: "earthly roots"
  };
  return souls[slot] || "spiritual imprint";
}

function getBindingEffect(rarity) {
  const effects = {
    common: "A faint hum resonates through your dantian",
    uncommon: "Your qi circulation accelerates slightly",
    rare: "The artifact whispers forgotten mantras",
    epic: "Your meridians glow with newfound power",
    legendary: "The heavens tremble at your newfound strength"
  };
  return effects[rarity.toLowerCase()] || "Your cultivation base stabilizes";
}

function formatBonuses(bonuses) {
  const daoEffects = {
    cooldownReduction: "⏳ Temporal Compression",
    lossProtection: "🛡️ Karmic Shielding",
    lootMultiplier: "💰 Spiritual Attraction", 
    xpMultiplier: "🧠 Enlightenment Boost",
    jackpotBoost: "🍀 Heaven's Favor"
  };

  return Object.entries(bonuses).map(([key, val]) => {
    const effectName = daoEffects[key] || `☯ ${key}`;
    if (key === 'jackpotBoost') return `${effectName}: +${val}% celestial blessing`;
    if (['cooldownReduction', 'lossProtection'].includes(key))
      return `${effectName}: ${((1 - val) * 100).toFixed(0)}% reduction`;
    if (['lootMultiplier', 'xpMultiplier'].includes(key))
      return `${effectName}: ${((val - 1) * 100).toFixed(0)}% increased flow`;
    return `${effectName}: ${val}`;
  }).join('\n');
}

function buildSlotEmbed(interaction, slotName, items) {
  const slotTitles = {
    weapon: "⚔️ Bound Weapons",
    armor: "🛡️ Soul Armors",
    accessory: "💍 Mystical Regalia",
    head: "👑 Crown Chakras",
    feet: "👞 Earthly Foundations"
  };

  const fields = items.map(item => ({
    name: `✨ ${item.name} [${item.rarity.toUpperCase()}]`,
    value: `**Origin**: ${item.set || "Unknown Forge"}\n` +
           `**Inscription**: "${item.inscription || 'No recorded history'}"\n` +
           `**Dao Resonance**:\n${formatBonuses(item.bonuses || {})}`,
    inline: false
  }));

  return createBaseEmbed({
    interaction,
    title: `📿 **Spiritual Treasury - ${slotTitles[slotName] || slotName}**`,
    description: `> *"${getSlotLore(slotName)}"\n\nYou possess **${items.length}** ${items.length === 1 ? 'artifact' : 'artifacts'} of ${slotName}.*`,
    color: 0x5e35b1,
    thumbnail: 'https://i.imgur.com/treasury.png',
    fields,
    footer: {
      text: '「法宝认主，灵性自通」\n"When treasures recognize their master, their spirit awakens"',
      iconURL: interaction.guild?.iconURL({ dynamic: true })
    }
  });
}

function getSlotLore(slot) {
  const lore = {
    weapon: "A cultivator's weapon is the extension of their will",
    armor: "True defense comes from harmony with the cosmos",
    accessory: "The smallest trinket may contain universe-spanning secrets",
    head: "The crown chakra bridges mortal and divine",
    feet: "Even immortals must tread carefully upon the earth"
  };
  return lore[slot] || "This artifact hums with latent power";
}

// (Keep existing groupItemsBySlot, getEquipMenu, getPaginationRow, capitalize functions)

// Helpers
function groupItemsBySlot(items) {
  return items.reduce((acc, item) => {
    if (!acc[item.slot]) acc[item.slot] = [];
    acc[item.slot].push(item);
    return acc;
  }, {});
}

function getEquipMenu(items) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('gear_equip')
      .setPlaceholder('🧰 Choose an item to equip')
      .addOptions(
        items.map(item => ({
          label: `${item.name} (${item.rarity})`,
          description: `Set: ${item.set || 'None'}`,
          value: item.name
        }))
      )
  );
}


function getPaginationRow(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('gear_prev')
      .setLabel('◀️ Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('gear_next')
      .setLabel('▶️ Next')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled)
  );
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
