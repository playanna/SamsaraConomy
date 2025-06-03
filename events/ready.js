// In events/ready.js
const cron = require('node-cron');
const { refreshLeaderboardCache } = require('../Slashcommands/economy/leaderboard');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`Bot is online! Logged in as ${client.user.tag}`);

    try {
      await refreshLeaderboardCache(client, 'INIT');  // Pass client here!
    } catch (err) {
      console.error('Initial leaderboard cache failed:', err);
    }

    cron.schedule('*/5 * * * *', () => {
      console.log('[CRON] Refreshing leaderboard cache...');
      refreshLeaderboardCache(client, 'CRON').catch(console.error); // Pass client here too!
    });
  },
};
