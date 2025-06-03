module.exports = {
    data: {
      customId: 'sect_hall',
      label: 'Go to hall',
      style: 'SECONDARY'
    },
  
    async execute(interaction) {
      const hallCommand = require('../../../Slashcommands/sect/secthalls.js'); // Adjust path if needed
      await hallCommand.execute(interaction); // Runs the treasury logic
    }
  };
  // This is a button handler for the "Go to Treasury" button in a Discord bot. 
  // It imports the treasury command and executes it when the button is clicked.