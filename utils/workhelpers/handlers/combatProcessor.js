// Main combat processor - handles all combat actions and flow
const { getCombatSession, removeCombatSession } = require('./combatSessionManager.js');
const { processUserAttack, processUserDefend, processUserSpecial, processCreatureTurn, processQiTechnique } = require('./combatActions.js');
const { sendReply, updateCombatMessage, endCombat, isInteractionExpired } = require('./combatUtils.js');
const { createFleeEmbed, createTechniqueSelectionEmbed, createTechniqueSelectionButtons } = require('./combatUI.js');
const { hasEquippedTechniques, initializeUserTechniques, reduceCooldowns } = require('./qiTechniqueManager.js');

async function processCombatAction(interaction, action) {
  const combat = getCombatSession(interaction.user.id);
  if (!combat) {
    return sendReply(interaction, { content: 'No active combat found!', flags: 64 }, true); // MessageFlags.Ephemeral
  }

  // Check if combat session has been running too long
  const combatAge = Date.now() - combat.startTime;
  const COMBAT_MAX_DURATION = 12 * 60 * 1000; // 12 minutes max
  
  if (combatAge > COMBAT_MAX_DURATION) {
    console.warn(`Combat session too old for user ${interaction.user.id}, cleaning up`);
    
    // Save health state before cleanup
    try {
      await combat.saveHealthState();
    } catch (error) {
      console.error('Error saving health state during timeout cleanup:', error);
    }
    
    removeCombatSession(interaction.user.id);
    
    return sendReply(interaction, { 
      content: '⏰ Combat session expired due to inactivity. Your health has been saved. Please start a new fight.',
      flags: 64 
    }, true);
  }

  // Check interaction age - if expired, still process the action but handle response differently
  const interactionExpired = isInteractionExpired(interaction);
  if (interactionExpired) {
    console.warn(`Combat action interaction too old for user ${interaction.user.id}, but processing action silently`);
  }
  
  let logMessage = '';
  switch (action) {
    case 'attack':
      logMessage = await processUserAttack(combat);
      break;
    case 'defend':
      logMessage = await processUserDefend(combat);
      break;
    case 'special':
      // Show technique selection instead of using generic special
      if (!interactionExpired) {
        await showTechniqueSelection(interaction, combat);
      }
      return; // Don't continue with normal combat flow
    case 'technique_selection':
      // User clicked "Channel Qi" - show technique selection
      if (!interactionExpired) {
        await showTechniqueSelection(interaction, combat);
      }
      return;
    case 'back_to_actions':
      // User clicked back from technique selection
      if (!interactionExpired) {
        await updateCombatMessage(interaction, combat);
      }
      return;
    case 'flee':
      logMessage = await processUserFlee(combat, interaction);
      return; // Flee ends combat immediately
  }
  
  combat.combatLog.push(logMessage);
  
  // Reduce technique cooldowns at end of user turn
  reduceCooldowns(combat);
  
  // Check if creature is defeated
  if (combat.creatureCurrentHealth <= 0) {
    await endCombat(interaction, combat, 'victory');
    return;
  }
  
  // Switch to creature turn
  combat.turn = 'creature';
  
  // Only update combat message if interaction isn't expired
  if (!interactionExpired) {
    await updateCombatMessage(interaction, combat);
  }
    // Process creature turn after a delay
  setTimeout(async () => {
    try {
      // Check if combat still exists and hasn't expired
      const currentCombat = getCombatSession(interaction.user.id);
      if (!currentCombat) {
        return;
      }

      // Double-check combat age before processing creature turn
      const combatAge = Date.now() - currentCombat.startTime;
      if (combatAge > 12 * 60 * 1000) { // 12 minutes
        console.warn(`Combat too old during creature turn for user ${interaction.user.id}`);
        
        // Save health and cleanup
        try {
          await currentCombat.saveHealthState();
        } catch (error) {
          console.error('Error saving health during creature turn cleanup:', error);
        }
        
        removeCombatSession(interaction.user.id);
        return;
      }

      const creatureLogMessage = await processCreatureTurn(currentCombat);
      currentCombat.combatLog.push(creatureLogMessage);
      
      // Check if user is defeated
      if (currentCombat.userCurrentHealth <= 0) {
        await endCombat(interaction, currentCombat, 'defeat');
        return;
      }
      
      // Switch back to user turn
      currentCombat.turn = 'user';
      currentCombat.round++;
      await updateCombatMessage(interaction, currentCombat);
    } catch (error) {
      console.error('Error in creature turn timeout:', error);
      // Clean up combat if there's an error
      const currentCombat = getCombatSession(interaction.user.id);
      if (currentCombat) {
        try {
          await currentCombat.saveHealthState();
        } catch (saveError) {
          console.error('Error saving health during error cleanup:', saveError);
        }
      }
      removeCombatSession(interaction.user.id);
    }
  }, 2000);
}

async function processUserFlee(combat, interaction) {
  // Save health state before fleeing
  try {
    await combat.saveHealthState();
  } catch (error) {
    console.error('Error saving health state after fleeing:', error);
  }
  
  const embed = createFleeEmbed(interaction, combat);
  removeCombatSession(interaction.user.id);
  await sendReply(interaction, { embeds: [embed], components: [] }, true);
}

// Show technique selection UI
async function showTechniqueSelection(interaction, combat) {
  try {
    // Initialize user techniques if they don't exist
    await initializeUserTechniques(interaction.user.id);
    
    const embed = await createTechniqueSelectionEmbed(interaction, combat);
    const buttons = await createTechniqueSelectionButtons(interaction.user.id);
    
    await sendReply(interaction, { 
      embeds: [embed], 
      components: Array.isArray(buttons) ? buttons : [buttons]
    }, true);
  } catch (error) {
    console.error('Error showing technique selection:', error);
    await sendReply(interaction, { 
      content: '❌ Error displaying qi techniques. Please try again.',
      flags: 64 
    }, true);
  }
}

// Process technique usage
async function processTechniqueUsage(interaction, techniqueId) {
  try {
    const combat = getCombatSession(interaction.user.id);
    if (!combat) {
      return sendReply(interaction, { content: 'No active combat found!', flags: 64 }, true);
    }

    if (combat.turn !== 'user') {
      return sendReply(interaction, { content: 'It\'s not your turn!', flags: 64 }, true);
    }
    
    // Check if interaction is expired
    const interactionExpired = isInteractionExpired(interaction);
    if (interactionExpired) {
      console.warn(`Technique usage interaction expired for user ${interaction.user.id}, processing silently`);
    }
    
    const logMessage = await processQiTechnique(combat, techniqueId, interaction.user.id);
    combat.combatLog.push(logMessage);
    
    // Reduce technique cooldowns at end of user turn
    reduceCooldowns(combat);
    
    // Check if creature is defeated
    if (combat.creatureCurrentHealth <= 0) {
      await endCombat(interaction, combat, 'victory');
      return;
    }
    
    // Switch to creature turn
    combat.turn = 'creature';
    
    // Only update combat message if interaction isn't expired
    if (!interactionExpired) {
      await updateCombatMessage(interaction, combat);
    }
    
    // Process creature turn after delay (same as normal combat flow)
    setTimeout(async () => {
      try {
        const currentCombat = getCombatSession(interaction.user.id);
        if (!currentCombat) return;

        const combatAge = Date.now() - currentCombat.startTime;
        if (combatAge > 12 * 60 * 1000) {
          console.warn(`Combat too old during creature turn for user ${interaction.user.id}`);
          try {
            await currentCombat.saveHealthState();
          } catch (error) {
            console.error('Error saving health during creature turn cleanup:', error);
          }
          removeCombatSession(interaction.user.id);
          return;
        }

        const creatureLogMessage = await processCreatureTurn(currentCombat);
        currentCombat.combatLog.push(creatureLogMessage);
        
        if (currentCombat.userCurrentHealth <= 0) {
          await endCombat(interaction, currentCombat, 'defeat');
          return;
        }
        
        currentCombat.turn = 'user';
        currentCombat.round++;
        await updateCombatMessage(interaction, currentCombat);
      } catch (error) {
        console.error('Error in creature turn timeout:', error);
        const currentCombat = getCombatSession(interaction.user.id);
        if (currentCombat) {
          try {
            await currentCombat.saveHealthState();
          } catch (saveError) {
            console.error('Error saving health during error cleanup:', saveError);
          }
        }
        removeCombatSession(interaction.user.id);
      }
    }, 2000);
    
  } catch (error) {
    console.error('Error processing technique usage:', error);
    await sendReply(interaction, { 
      content: '❌ Error using qi technique. Please try again.',
      flags: 64 
    }, true);
  }
}

module.exports = {
  processCombatAction,
  processTechniqueUsage
}

