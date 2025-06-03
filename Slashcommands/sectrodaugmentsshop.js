const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getAugments } = require('../utils/Equipments/augmentshop');
const { getUserEquipment } = require('../utils/Equipments/getUserEquipment');


const SLOTS = ['element', 'reel', 'line', 'handle', 'misc', 'sigil', 'focus'];
const ITEMS_PER_PAGE = 5; // Reduced to leave room for buttons

module.exports = {
  data: new SlashCommandBuilder()
    .setName('augmentshop')
    .setDescription('Browse and select augments by slot type'),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      let currentSlotIndex = 0;
      let currentSlot = SLOTS[currentSlotIndex];
      let allAugments = getAugments(currentSlot);
      let currentPage = 0;
      const totalPages = Math.max(1, Math.ceil(allAugments.length / ITEMS_PER_PAGE));

      // Function to get augments for current page
      const getCurrentAugments = () => {
        const startIdx = currentPage * ITEMS_PER_PAGE;
        return allAugments.slice(startIdx, startIdx + ITEMS_PER_PAGE);
      };

      // Function to build all components
      const buildComponents = () => {
        const components = [];
        const currentAugments = getCurrentAugments();

        // Add item selection buttons (max 5 per row)
        if (currentAugments.length > 0) {
          const itemButtons = currentAugments.map((augment, idx) => 
            new ButtonBuilder()
              .setCustomId(`augment_${augment.id}`)
              .setLabel(augment.name)
              .setStyle(ButtonStyle.Primary)
          );

          // Split into rows if more than 5 items (though we limit to 5 per page)
          for (let i = 0; i < itemButtons.length; i += 5) {
            components.push(
              new ActionRowBuilder().addComponents(itemButtons.slice(i, i + 5))
            );
          }
        }

        // Add navigation buttons
        if (allAugments.length > ITEMS_PER_PAGE) {
          components.push(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('prev_page')
                .setLabel('◀ Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 0),
              new ButtonBuilder()
                .setCustomId('next_page')
                .setLabel('Next ▶')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage >= totalPages - 1)
            )
          );
        }

        // Add slot selection buttons if multiple slots exist
        if (SLOTS.length > 1) {
          components.push(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('prev_slot')
                .setLabel('⬅️ Change Slot')
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId('next_slot')
                .setLabel('Change Slot ➡️')
                .setStyle(ButtonStyle.Secondary)
            )
          );
        }

        return components;
      };

      // Build initial embed and components
      const embed = buildAugmentEmbed(currentSlot, getCurrentAugments(), currentPage, totalPages);
      const components = buildComponents();

      // Send initial message and get the message object
      const message = await interaction.reply({ 
        embeds: [embed], 
        components,
        fetchReply: true 
      });

      // Create collector for button interactions
      const collector = message.createMessageComponentCollector({
        filter: i => i.user.id === userId,
        time: 300000 // 5 minutes
      });

      collector.on('collect', async i => {
        try {
          await i.deferUpdate();
          let needsUpdate = false;
      
          // Handle augment selection
          if (i.customId.startsWith('augment_')) {
            const augmentId = i.customId.replace('augment_', '');
            const selectedAugment = allAugments.find(a => a.id === augmentId);
            console.log('Selected augment:', selectedAugment, 'for slot:', currentSlot, augmentId);
      
            if (!selectedAugment) {
              await interaction.followUp({ content: 'That augment was not found.', ephemeral: true });
              return;
            }
      
            try {
              const userEquipment = await getUserEquipment(i.user.id); // You must implement this function to load the user's gear
      
              await userEquipment.applyAugment({
                id: selectedAugment.id,
                slotType: selectedAugment.slotType,
                effects: selectedAugment.effects || {}
              });              
      
              await i.followUp({ content: `✅ Successfully installed **${selectedAugment.name}** into your equipment!`, ephemeral: true });
            } catch (err) {
              console.error('Error applying augment:', err);
              await i.followUp({ content: `❌ Could not install augment: ${err.message}`, ephemeral: true });
            }
      
            return; // Exit after handling augment
          }
          // --- Page navigation ---
          else if (i.customId === 'next_page') {
            currentPage = Math.min(currentPage + 1, totalPages - 1);
            needsUpdate = true;
          }
          else if (i.customId === 'prev_page') {
            currentPage = Math.max(currentPage - 1, 0);
            needsUpdate = true;
          }
          // --- Slot navigation ---
          else if (i.customId === 'next_slot') {
            currentSlotIndex = (currentSlotIndex + 1) % SLOTS.length;
            currentSlot = SLOTS[currentSlotIndex];
            allAugments = getAugments(currentSlot);
            currentPage = 0;
            needsUpdate = true;
          }
          else if (i.customId === 'prev_slot') {
            currentSlotIndex = (currentSlotIndex - 1 + SLOTS.length) % SLOTS.length;
            currentSlot = SLOTS[currentSlotIndex];
            allAugments = getAugments(currentSlot);
            currentPage = 0;
            needsUpdate = true;
          }
      
          if (needsUpdate) {
            await i.editReply({
              embeds: [buildAugmentEmbed(currentSlot, getCurrentAugments(), currentPage, totalPages)],
              components: buildComponents()
            });
          }
      
        } catch (error) {
          console.error('Error handling interaction:', error);
        }
      });      

      collector.on('end', () => {
        try {
          // Disable all buttons when collector ends
          const disabledComponents = buildComponents().map(row => {
            return new ActionRowBuilder().addComponents(
              row.components.map(button => 
                ButtonBuilder.from(button).setDisabled(true)
              )
            );
          });
          
          message.edit({ components: disabledComponents }).catch(console.error);
        } catch (error) {
          console.error('Error disabling buttons:', error);
        }
      });

    } catch (error) {
      console.error('Error in augment shop command:', error);
      if (!interaction.replied) {
        await interaction.reply({ 
          content: 'There was an error displaying the augment shop.', 
          ephemeral: true 
        }).catch(console.error);
      }
    }
  }
};

function buildAugmentEmbed(slot, augments, currentPage, totalPages) {
  const embed = new EmbedBuilder()
    .setTitle(`${slot.charAt(0).toUpperCase() + slot.slice(1)} Augments`)
    .setColor(0x00AE86)
    .setThumbnail('https://i.imgur.com/J5Q9y0G.png')
    .setFooter({ 
      text: `Page ${currentPage + 1}/${totalPages} | ${augments.length} augments shown`,
      iconURL: 'https://i.imgur.com/J5Q9y0G.png'
    });

  if (augments.length === 0) {
    embed.setDescription('*No augments currently available for this slot type.*');
    embed.addFields({
      name: 'Coming Soon',
      value: 'New augments are added regularly!',
      inline: true
    });
  } else {
    // Display all augments on the current page
    embed.setDescription(
      augments.map(a => 
        `**${a.name}** (Tier ${a.tier})\n` +
        `> ${a.description}\n` +
        `> **Cost:** ${a.cost} | **Requires:** ${a.requirements || 'None'}`
      ).join('\n\n')
    );
  }

  return embed;
}