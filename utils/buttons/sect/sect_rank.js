module.exports = {
  data: {
    customId: 'sect_rank',
    label: 'Check Cultivation Rank',
    style: 'SECONDARY'
  },

  async execute(interaction) {
    try {
      // Inject fallback logic for user option since buttons don't support options
      const rankCommand = require('../../../Slashcommands/xp/rank.js');
      // Add a stub options object with a getUser fallback
      interaction.options = {
        getUser: () => null // Will default to interaction.user in the command
      };

      await rankCommand.execute(interaction);

    } catch (err) {
      console.error('Error executing sect_rank button handler:', err);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: '❌ Something went wrong while consulting the karmic records.',
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: '❌ Something went wrong while consulting the karmic records.',
          ephemeral: true,
        });
      }
    }
  }
};
