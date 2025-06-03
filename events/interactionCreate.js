const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            // Handle slash commands
            const command = interaction.client.slashCommands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);                await interaction.reply({
                    content: 'There was an error executing this command!',
                    flags: 64
                });
            }
        } else if (interaction.isButton()) {
            const id = interaction.customId;
            
            
            if (id.startsWith('clan_quests_page_')) {
              const command = interaction.client.slashCommands.get('quests');
                if (command && command.handleQuestsPage) {
                  await command.handleQuestsPage(interaction);
                }
              }


            if (
              id.startsWith('shop_') || 
              id.startsWith('clan_') || 
              id.startsWith('gear_') || 
              id.startsWith('accept-') || 
              id.startsWith('inv_') || 
              id.startsWith('reject-')
            ) return;
          
            let handlerPath = path.join(__dirname, '../utils/buttons', `${id}.js`);

                        
          
            // 🧠 If it's a dynamic `upgrade_*` button, route to upgrade_router
            if (id.startsWith('upgrade_')) {
              handlerPath = path.join(__dirname, '../utils/buttons/upgrades/upgrade_router.js');
            }

            if (id.startsWith('upg_')) {
              handlerPath = path.join(__dirname, '../utils/buttons/upgrades/upg_router.js');
            }            if (id.startsWith('sect_')) {
                handlerPath = path.join(__dirname, '../utils/buttons/sect', `${id}.js`);
              }

            // Handle healer healing buttons
            if (id.startsWith('healer_heal_')) {
                handlerPath = path.join(__dirname, '../utils/buttons/sect/healer_heal_router.js');
              }
            
            if (
              id.startsWith('viewQuest_') || 
              id.startsWith('acceptQuest_') || 
              id.startsWith('activeQuest_') || 
              id.startsWith('completeQuest_') || 
              id.startsWith('cancelQuest_')
            ) {
              handlerPath = path.join(
                __dirname, 
                '../utils/buttons/quests/quest_router.js'
              );
            }            if (id.startsWith('clanupgrade_')) {
                handlerPath = path.join(__dirname, '../utils/buttons/clan/clanupgrade_router.js');
              }            // Handle combat buttons (fightstart command)
            if (id.startsWith('combat_') || id === 'fightstart_again' || id.startsWith('technique_use_') || id === 'combat_back_to_actions') {
              const fightstart = require('../Slashcommands/work/fightstart.js');
              await fightstart.handleButton(interaction);
              return;
            }            // Handle qi technique replacement buttons
            if (id.startsWith('replace_technique_')) {
              handlerPath = path.join(__dirname, '../utils/buttons/replace_technique_router.js');
            }            // Handle qi view buttons (navigation and equip/unequip)
            if (id.startsWith('qi_view_') || id.startsWith('qi_equip_from_view_') || id.startsWith('qi_learn_') || id.startsWith('qi_learn_technique_')) {
              handlerPath = path.join(__dirname, '../utils/buttons/qi_router.js');
            }

            // Handle work buttons
            if (id === 'work_again') {
              const work = require('../Slashcommands/work/work.js');
              await work.handleButton(interaction);
              return;
            }
          
            if (fs.existsSync(handlerPath)) {
              const buttonHandler = require(handlerPath);
              await buttonHandler.execute(interaction);
            } else {
              console.error('Button handler not found for customId:', id);
            }
          }
          

        else if (interaction.isModalSubmit()) {
            const modalHandlerFile = path.join(__dirname, '../utils/modals', `${interaction.customId}.js`);
        
            if (fs.existsSync(modalHandlerFile)) {
                try {
                    const modalHandler = require(modalHandlerFile);
                    await modalHandler.execute(interaction);
                } catch (err) {
                    console.error('Error handling modal:', err);                    await interaction.reply({
                        content: '❌ Something went wrong while processing your input.',
                        flags: 64
                    });
                }
            } else {
                console.warn(`Modal handler not found for customId: ${interaction.customId}`);
                await interaction.reply({
                    content: '❌ This form is not supported or has expired.',
                    flag: 64
                });
            }        }
          // Handle StringSelectMenu interactions
        else if (interaction.isStringSelectMenu()) {
            const id = interaction.customId;
            
            // Skip interactions that are handled by collectors in slash commands
            const collectorHandledIds = ['realm-select'];
            if (collectorHandledIds.includes(id)) {
                return; // Let the collector handle this interaction
            }
            
            let handlerPath = path.join(__dirname, '../utils/buttons', `${id}.js`);
            
            if (fs.existsSync(handlerPath)) {
                try {
                    const selectHandler = require(handlerPath);
                    await selectHandler.execute(interaction);
                } catch (error) {
                    console.error('Error handling StringSelectMenu:', error);
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: '❌ There was an error processing your selection.',
                            flags: 64
                        });
                    }
                }
            } else {
                console.error('StringSelectMenu handler not found for customId:', id);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ This selection menu is not supported.',
                        flags: 64
                    });
                }
            }
        }
          
    }
};
