const path = require('path');
const { REST, Routes } = require('discord.js');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('Deleting global slash commands...');

        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
            body: commands ,
        });

        console.log('✅ Global commands deleted.');
    } catch (error) {
        console.error('❌ Failed to delete global commands:', error);
    }
})();
