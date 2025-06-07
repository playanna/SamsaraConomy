const fs = require('fs');
const path = require('path');

// 🔒 Manually load .env TOKEN from the file (ignores global env)
const dotenvPath = path.resolve(__dirname, '.env');
let BOT_TOKEN = null;

if (fs.existsSync(dotenvPath)) {
    const envLines = fs.readFileSync(dotenvPath, 'utf8')
        .split('\n')
        .map(line => line.trim());

    for (const line of envLines) {
        if (line.startsWith('TOKEN=')) {
            BOT_TOKEN = line.split('=')[1].trim();
            break;
        }
    }
}

if (!BOT_TOKEN) {
    console.error('Error: No TOKEN found in local .env file.');
    process.exit(1);
}

// Optional: Load rest of dotenv variables (non-TOKEN)
require('dotenv').config();


if (process.env.NODE_ENV !== 'production') {
    require('./deploycommands');
}

const connectToMongoDB = require('./database/mongo');

// --- Import REALMS here ---
const { REALMS, getRandomRealmImage, initializeDefaultRealmImages } = require('./data/realms');

// --- Main Bot Initialization Flow ---
(async () => {
    // 1. Connect to MongoDB
    await connectToMongoDB();    // 2. Initialize Default Realm Images (placeholders) in MongoDB
    await initializeDefaultRealmImages();

    // 3. Initialize Discord Client & Login
    const client = require('./client'); // Ensure 'client' is defined after database and images are ready
    const { Collection } = require('discord.js'); // Assuming Collection is needed later

    // Load commands
    client.commands = new Collection();
    const commandsPath = './commands';
    if (!fs.existsSync(commandsPath)) {
        console.error(`Error: The commands directory (${commandsPath}) does not exist.`);
        process.exit(1);
    }
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(`./commands/${file}`);
        client.commands.set(command.name, command);
    }

    // Recursive function to get slash command files
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

    // Load slash commands
    client.slashCommands = new Collection();
    const slashCommandsPath = path.join(__dirname, 'Slashcommands');

    if (fs.existsSync(slashCommandsPath)) {
        const slashCommandFiles = getSlashCommandFiles(slashCommandsPath);

        for (const file of slashCommandFiles) {
            const command = require(file);
            client.slashCommands.set(command.data.name, command);
        }
    } else {
        console.warn(`Warning: The Slashcommands directory (${slashCommandsPath}) does not exist.`);
    }    const { refreshLeaderboardCache } = require('./commands/leaderboard');
    const cron = require('node-cron');
    // Scheduled cache refresh
    // Note: GitHub image loading is now handled via /github_images slash command

    // Load events
    const eventsPath = './events';
    if (fs.existsSync(eventsPath)) {
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
        
        for (const file of eventFiles) {
            const event = require(`./events/${file}`);
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args));
            } else {
                client.on(event.name, (...args) => event.execute(...args));
            }
        }
    } else {
        console.warn(`Warning: The events directory (${eventsPath}) does not exist.`);    }

    // Initialize unified cache manager and memory monitoring
    const { cacheManager } = require('./utils/cache/cacheManager');
    
    // Initialize lazy loading data managers
    const { dataManagerCoordinator } = require('./utils/dataManagers');
    console.log('🚀 Initializing static data lazy loading managers...');
    await dataManagerCoordinator.initializeAll();
    
    // Log cache statistics every 10 minutes
    setInterval(() => {
        cacheManager.logStats();
        dataManagerCoordinator.logStats();
    }, 600000);
    
    // Handle graceful shutdown and cache cleanup
    process.on('SIGINT', async () => {
        console.log('\n[SHUTDOWN] Gracefully shutting down...');
        cacheManager.logStats();
        dataManagerCoordinator.logStats();
        await dataManagerCoordinator.cleanup();
        console.log('[SHUTDOWN] Data managers cleaned up. Cache statistics logged. Exiting...');
        process.exit(0);
    });

    // Finally, login to Discord
    client.login(BOT_TOKEN).catch(error => {
        console.error('Failed to login:', error);
        process.exit(1);
    });

    // You can also place the cron job here, as it needs 'client' and 'REALMS' to be ready
    // cron.schedule('0 0 * * *', () => { // Example: daily at midnight
    //     console.log('Refreshing leaderboard cache...');
    //     refreshLeaderboardCache(client); // Assuming refreshLeaderboardCache uses client
    // });

})(); // End of IIAFE