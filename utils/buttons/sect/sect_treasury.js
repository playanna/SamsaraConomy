module.exports = {
    data: {
      customId: 'sect_treasury',
      label: 'Go to Treasury',
      style: 'SECONDARY'
    },
  
    async execute(interaction) {
      const treasuryCommand = require('../../../Slashcommands/economy/trader_prices.js'); // Adjust path if needed
      await treasuryCommand.execute(interaction); // Runs the treasury logic
    }
  };
  // This is a button handler for the "Go to Treasury" button in a Discord bot. It imports the treasury command and executes it when the button is clicked.