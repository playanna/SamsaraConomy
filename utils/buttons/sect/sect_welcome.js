module.exports = {
    data: {
      customId: 'sect_welcome',
      label: 'Return to sect',
      style: 'SECONDARY'
    },
  
    async execute(interaction) {
      const sectCommand = require('../../../Slashcommands/sect/sect.js'); // Adjust path if needed
      await sectCommand.execute(interaction); // Runs the profile logic
    }
  };
    // This is a button handler for the "Return to sect" button in a Discord bot. It imports the sect command and executes it when the button is clicked.