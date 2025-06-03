module.exports = {
  data: {
    customId: 'sell_all',
    label: '💰 Sell All',
    style: 'SECONDARY'
  },
  
  async execute(interaction) {
    const sellCommand = require('../../Slashcommands/economy/sellquick'); // Adjust path if needed
    await sellCommand.execute(interaction); // Passes true as the boolean value
  }
  };
    // This is a button handler for the "Sell All" button in a Discord bot. It imports the sell command and executes it when the button is clicked. 