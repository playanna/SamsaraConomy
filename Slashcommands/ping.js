const { SlashCommandBuilder } = require('discord.js');
const UserPing = require('../models/UserPing');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong and tracks usage.'),
    async execute(interaction) {
        const userId = interaction.user.id;

        let userPing = await UserPing.findOne({ userId });

        if (!userPing) {
            userPing = new UserPing({ userId, count: 1 });
        } else {
            userPing.count += 1;
        }

        await userPing.save();

        await interaction.reply(`🏓 Pong! You've used this command ${userPing.count} times.`);
    }
};
