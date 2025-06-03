const Hand = require('../models/balance/hand'); // Adjust path as needed
const cooldown = new Set();
require('dotenv').config();

const allowedGuildId = process.env.GUILD_ID;

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot) return;
    if (message.guild && message.guild.id !== allowedGuildId) return;

    const prefix = '-';

    // 💰 Passive Chat Reward
    if (!message.content.startsWith(prefix)) {
      const userId = message.author.id;

      if (cooldown.has(userId)) return;
      cooldown.add(userId);
      setTimeout(() => cooldown.delete(userId), 2000); // 2s cooldown

      try {
        const reward = Math.floor(Math.random() * 11) + 5;
        await Hand.updateOne(
          { userId },
          { $inc: { balance: reward } },
          { upsert: true }
        );
      } catch (err) {
        console.error('Error adding chat reward:', err);
      }

      return;
    }

    // 🔧 Command Handling
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    let command = message.client.commands.get(commandName) ||
                  message.client.commands.find(cmd => cmd.aliases?.includes(commandName));

    if (!command) {
      return; //message.reply(`Unknown command: \`${commandName}\`.`);
    }

    try {
      if (typeof command.trigger === 'function') {
        await command.trigger(message);
      } else if (typeof command.execute === 'function') {
        await command.execute(message, args);
      } else {
        await message.reply(`Command \`${commandName}\` is misconfigured. No valid handler found.`);
      }
    } catch (err) {
      console.error(`Error executing command ${commandName}:`, err);
      await message.reply('There was an error executing that command!');
    }
  },
};
