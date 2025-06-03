// File: commands/addaugment.js

const { SlashCommandBuilder, InteractionType } = require('discord.js');
const SectRod = require('../models/Equipment/sectrod');
const augmentList = require('../utils/Equipments/augments');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addaugment')
    .setDescription('Add an augment to your Sect Rod.')
    .addStringOption(option =>
      option.setName('slot')
        .setDescription('Slot type for the augment')
        .setRequired(true)
        .addChoices(
          { name: 'Element', value: 'element' },
          { name: 'Reel', value: 'reel' },
          { name: 'Line', value: 'line' },
          { name: 'Handle', value: 'handle' },
          { name: 'Misc', value: 'misc' },
          { name: 'Sigil', value: 'sigil' },
          { name: 'Focus', value: 'focus' }
        ))
    .addStringOption(option =>
      option.setName('augmentid')
        .setDescription('The ID of the augment to install')
        .setAutocomplete(true)
        .setRequired(true))
    .addStringOption(option =>
      option.setName('data')
        .setDescription('Optional JSON-formatted data for the augment')
        .setRequired(false)),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const slot = interaction.options.getString('slot');
    const filtered = augmentList
      .filter(aug => aug.slotType === slot && aug.id.includes(focusedValue))
      .slice(0, 25) // Discord autocomplete limit

    await interaction.respond(
      filtered.map(aug => ({
        name: `${aug.name} [${aug.id}]`,
        value: aug.id
      }))
    );
  },

  async execute(interaction) {
    const userId = interaction.user.id;
    const slotType = interaction.options.getString('slot');
    const augmentId = interaction.options.getString('augmentid');
    const augmentDataInput = interaction.options.getString('data');

    let augmentData;
    try {
      augmentData = augmentDataInput ? JSON.parse(augmentDataInput) : {};
    } catch (err) {
      return interaction.reply({ content: '❌ Invalid JSON in augment data.', ephemeral: true });
    }

    const selectedAugment = augmentList.find(a => a.id === augmentId);
    if (!selectedAugment) {
      return interaction.reply({ content: '❌ Augment not found.', ephemeral: true });
    }

    if (selectedAugment.slotType !== slotType) {
      return interaction.reply({
        content: `❌ This augment must be installed in the \`${selectedAugment.slotType}\` slot.`,
        ephemeral: true
      });
    }

    const sectRod = await SectRod.findOne({ userId });
    if (!sectRod) {
      return interaction.reply({ content: '❌ No Sect Rod found.', ephemeral: true });
    }

    if (sectRod.augments.length >= sectRod.augmentCapacity) {
      return interaction.reply({
        content: `❌ Your Sect Rod is full. Capacity: ${sectRod.augmentCapacity}.`,
        ephemeral: true
      });
    }

    const isDuplicate = sectRod.augments.some(a => a.augmentId === augmentId && a.slotType === slotType);
    if (isDuplicate) {
      return interaction.reply({ content: '❌ This augment is already installed in that slot.', ephemeral: true });
    }

    if (selectedAugment.conditional?.currentElementMustBe &&
        selectedAugment.conditional.currentElementMustBe !== sectRod.currentElement) {
      return interaction.reply({
        content: `❌ This augment requires your rod's current element to be \`${selectedAugment.conditional.currentElementMustBe}\`.`,
        ephemeral: true
      });
    }

    sectRod.augments.push({
      slotType,
      augmentId,
      augmentData,
      installedAt: new Date(),
      durability: 100
    });

    sectRod.milestones.uniqueAugmentsUsed = [...new Set(sectRod.augments.map(a => a.augmentId))].length;
    await sectRod.save();

    return interaction.reply({
      content: `✅ \`${selectedAugment.name}\` has been added to your Sect Rod.`,
      ephemeral: false
    });
  }
};
