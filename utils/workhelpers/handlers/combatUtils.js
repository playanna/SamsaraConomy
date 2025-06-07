// Combat utility functions
const { getCombatSession, removeCombatSession } = require('./combatSessionManager.js');
const { createCombatEmbed, createCombatButtons, createVictoryEmbed, createDefeatEmbed, createFleeEmbed, createRetryButtons } = require('./combatUI.js');
const { distributeVictoryRewards } = require('./combatRewards.js');
const { ButtonBuilder } = require('discord.js');

async function sendReply(interaction, payload, isButton) {
  try {
    // Check if interaction is still valid
    if (!interaction || !interaction.user) {
      console.error('Invalid interaction object');
      return;
    }

    // Check if interaction has expired
    if (isInteractionExpired(interaction)) {
      console.warn(`Interaction too old for user ${interaction.user.id}, attempting channel send`);
      // Try to send to channel as fallback if interaction is expired
      if (interaction.channel) {
        try {
          // Create a simplified message for expired interactions
          const expiredMessage = {
            content: `${interaction.user} - Combat session expired. Please start a new fight.`
          };
          
          // Add embed content to the message if available
          if (payload.embeds && payload.embeds.length > 0) {
            const embed = payload.embeds[0];
            if (embed.title) {
              expiredMessage.content += `\n**${embed.title}**`;
            }
            if (embed.description) {
              // Truncate description if too long for a regular message
              const desc = embed.description.length > 1000 
                ? embed.description.substring(0, 1000) + '...' 
                : embed.description;
              expiredMessage.content += `\n${desc}`;
            }
          }
          
          await interaction.channel.send(expiredMessage);
        } catch (channelErr) {
          console.error('Channel send fallback failed:', channelErr);
        }
      }
      return;
    }

    // Determine the appropriate method to use
    if (interaction.replied) {
      await interaction.followUp(payload);
    } else if (interaction.deferred) {
      if (isButton) {
        await interaction.editReply(payload);
      } else {
        await interaction.editReply(payload);
      }
    } else {
      if (isButton) {
        await interaction.update(payload);
      } else {
        await interaction.reply(payload);
      }
    }
  } catch (err) {
    console.error('Reply error:', err);
    
    // Handle specific Discord API errors
    if (err.code === 10062) { // Unknown interaction
      console.warn(`Interaction expired for user ${interaction.user?.id} - attempting channel fallback`);
      // Clean up combat session if interaction expired
      if (interaction.user?.id) {
        removeCombatSession(interaction.user.id);
      }
      
      // Try to send to channel as final fallback
      if (interaction.channel && interaction.user) {
        try {
          const fallbackMessage = {
            content: `${interaction.user} - Your combat session has expired. The results have been processed, but the interface is no longer active. Please start a new fight.`
          };
          
          // Include basic embed info if available
          if (payload.embeds && payload.embeds.length > 0) {
            const embed = payload.embeds[0];
            if (embed.title) {
              fallbackMessage.content += `\n**Result:** ${embed.title}`;
            }
          }
          
          await interaction.channel.send(fallbackMessage);
        } catch (channelErr) {
          console.error('Channel fallback after 10062 error failed:', channelErr);
        }
      }
      return;
    }

    // If the original interaction failed, try to send a follow-up if possible
    try {
      if (!interaction.replied && !interaction.deferred && !isInteractionExpired(interaction)) {
        await interaction.reply({
          content: '❌ An error occurred while processing your request.',
          flags: 64 // MessageFlags.Ephemeral
        });
      }
    } catch (fallbackErr) {
      console.error('Fallback reply error:', fallbackErr);
      // Final fallback: try channel send
      if (interaction.channel && interaction.user) {
        try {
          await interaction.channel.send({
            content: `${interaction.user} - An error occurred processing your combat action.`
          });
        } catch (channelErr) {
          console.error('Final channel fallback failed:', channelErr);
        }
      }
    }
  }
}

async function updateCombatMessage(interaction, combat) {
  const embeds = createCombatEmbed(interaction, combat);
  const buttons = createCombatButtons(combat);
  
  // Handle both single embed (legacy) and dual embed (new) returns
  const embedsArray = Array.isArray(embeds) ? embeds : [embeds];
  
  const response = await sendReply(interaction, { embeds: embedsArray, components: [buttons] }, true);
  
  // Set up a collector timeout to disable buttons after 10 minutes
  if (response && combat.turn === 'user') {
    try {
      const message = await interaction.fetchReply();
      
      const collector = message.createMessageComponentCollector({
        time: 10 * 60 * 1000 // 10 minutes
      });
      
      collector.on('end', async (collected, reason) => {
        if (reason === 'time' && getCombatSession(interaction.user.id)) {
          // Only disable if combat still exists and hasn't been handled
          try {
            const disabledButtons = createCombatButtons(combat).setComponents(
              createCombatButtons(combat).components.map(button => 
                ButtonBuilder.from(button).setDisabled(true)
              )
            );
            
            await message.edit({ 
              embeds: embedsArray, 
              components: [disabledButtons] 
            });
            
            // Clean up expired combat
            if (combat.saveHealthState) {
              await combat.saveHealthState();
            }
            removeCombatSession(interaction.user.id);
            
          } catch (editError) {
            console.error('Error disabling buttons after timeout:', editError);
          }
        }
      });
      
    } catch (fetchError) {
      // If we can't set up the collector, that's okay - the other timeout mechanisms will handle it
      console.warn('Could not set up button timeout collector:', fetchError);
    }
  }
}

async function endCombat(interaction, combat, result) {
  const creature = combat.creature;
  
  // Save health state before removing combat session
  try {
    await combat.saveHealthState();
  } catch (error) {
    console.error('Error saving health state after combat:', error);
  }
  
  removeCombatSession(interaction.user.id);
  
  let embed;
  if (result === 'victory') {
    try {      
      // Distribute victory rewards and update user's balance/XP
      const rewardResults = await distributeVictoryRewards(interaction.user.id, creature);
      
      // Award technique points for combat victory
      const { awardKarmicDebt } = require('./qiTechniqueManager.js');
      await awardKarmicDebt(interaction.user.id, 1);
      
      // Create victory embed with actual reward results
      embed = createVictoryEmbed(interaction, combat, rewardResults);
    } catch (error) {
      console.error('Error distributing victory rewards:', error);
      // Fallback to original embed without reward details
      embed = createVictoryEmbed(interaction, combat);
    }
  } else if (result === 'defeat') {
    embed = createDefeatEmbed(interaction, combat);
  } else if (result === 'flee') {
    embed = createFleeEmbed(interaction, combat);
    // Save health state for flee as well
    await sendReply(interaction, { embeds: [embed], components: [] }, true);
    return;
  }
  
  // Check if interaction is still valid before trying to send results
  if (isInteractionExpired(interaction)) {
    console.warn(`Combat ended but interaction expired for user ${interaction.user.id}`);
    // Still try to send via channel fallback (sendReply will handle this)
    await sendReply(interaction, { embeds: [embed], components: [] }, true);
    return;
  }
  
  const retryButton = createRetryButtons();
  await sendReply(interaction, { embeds: [embed], components: [retryButton] }, true);
}

function isInteractionExpired(interaction) {
  try {
    if (!interaction || !interaction.createdTimestamp) {
      console.warn('Invalid interaction object for expiry check');
      return true; // Treat as expired if we can't determine age
    }
    
    const interactionAge = Date.now() - interaction.createdTimestamp;
    return interactionAge > 12 * 60 * 1000; // 12 minutes to be more conservative
  } catch (error) {
    console.error('Error checking interaction expiry:', error);
    return true; // Treat as expired on error
  }
}

module.exports = {
  sendReply,
  updateCombatMessage,
  endCombat,
  isInteractionExpired
};
