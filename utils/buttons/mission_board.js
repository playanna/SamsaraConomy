module.exports = {
    data: {
      customId: 'mission-board',
      label: 'Mission Board',
      style: 'PRIMARY'
    },
  
    async execute(interaction) {
      const questCommand = require('../../Slashcommands/clan/quests');
      await questCommand.execute(interaction, 1, false); // Page 1, not update
    }
  };
  