module.exports = {
    data: {
      customId: 'sect_elder',
      label: 'Go to elder',
      style: 'SECONDARY'
    },
  
    async execute(interaction) {
      const elderCommand = require('../../../Slashcommands/xp/realms.js'); // Adjust path if needed
      await elderCommand.execute(interaction); // Runs the treasury logic
    }
  };
  // This is a button handler for the "Go to Treasury" button in a Discord bot. 
  // It imports the treasury command and executes it when the button is clicked.