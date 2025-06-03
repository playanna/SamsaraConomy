const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

// Load .env manually
const dotenvPath = path.resolve(__dirname, '.env');
let BOT_TOKEN = null;
let CLIENT_ID = null;
let GUILD_ID = null;
let NODE_ENV = 'production'; // default to production

if (fs.existsSync(dotenvPath)) {
    const envLines = fs.readFileSync(dotenvPath, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));

    for (const line of envLines) {
        const [key, ...valParts] = line.split('=');
        const value = valParts.join('=').trim();

        switch (key.trim()) {
            case 'TOKEN': BOT_TOKEN = value; break;
            case 'CLIENT_ID': CLIENT_ID = value; break;
            case 'GUILD_ID': GUILD_ID = value; break;
            case 'NODE_ENV': NODE_ENV = value; break;
        }
    }
}

if (!BOT_TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error('Missing TOKEN, CLIENT_ID, or GUILD_ID from .env file.');
    process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'Slashcommands');

const getSlashCommandFiles = (dirPath) => {
    let commandFiles = [];

    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const file of files) {
        const fullPath = path.join(dirPath, file.name);
        if (file.isDirectory()) {
            commandFiles = commandFiles.concat(getSlashCommandFiles(fullPath));
        } else if (file.name.endsWith('.js')) {
            commandFiles.push(fullPath);
        }
    }

    return commandFiles;
};

const slashCommandFiles = getSlashCommandFiles(commandsPath);

// Determine if this is a development or production deploy
const DEPLOY_STAGE = NODE_ENV === 'development' ? 'beta' : 'prod';

for (const file of slashCommandFiles) {
    const command = require(file);
    const stage = command.stage || 'prod'; // default to prod

    if ('data' in command && 'execute' in command) {
        if (stage === DEPLOY_STAGE || stage === 'both') {
            commands.push(command.data.toJSON());
        } else {
            console.log(`Skipped command ${command.data.name} (stage: ${stage}) for deploy stage: ${DEPLOY_STAGE}`);
        }
    } else {
        console.warn(`Skipped file: ${file} - Missing "data" or "execute" export`);
    }
}

const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

(async () => {
    try {
        console.log(`Started refreshing application (/) commands for stage: ${DEPLOY_STAGE}`);

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
