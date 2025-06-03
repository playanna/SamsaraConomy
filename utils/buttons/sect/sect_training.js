module.exports = {
            data: {
              customId: 'sect_training',
              label: 'Go to Training Grounds',
              style: 'SECONDARY'
            },
          
            async execute(interaction) {
              const upgrades = require('../../../Slashcommands/upgrades/upgrades'); // Adjust path if needed
              await upgrades.execute(interaction); // Runs the training grounds logic
            }
          };
          // This is a button handler for the "Go to Treasury" button in a Discord bot. 
          // It imports the treasury command and executes it when the button is clicked.