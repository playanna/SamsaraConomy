const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

async function loadDatabaseEvents() {
    const eventsPath = path.join(__dirname, 'events');
    const files = fs.readdirSync(eventsPath).filter(file =>
        file.endsWith('.js') || file.endsWith('.mjs')
    );

    for (const file of files) {
        const fullPath = path.join(eventsPath, file);

        let event;
        if (file.endsWith('.mjs')) {
            const imported = await import(pathToFileURL(fullPath).href);
            event = imported.default;
        } else {
            event = require(fullPath);
        }

        if (!event?.name || typeof event.execute !== 'function') {
            console.warn(`[DB Event Loader] Skipped invalid event file: ${file}`);
            continue;
        }

        mongoose.connection.on(event.name, (...args) => {
            event.execute(...args);
        });
    }
}

async function connectToMongoDB() {
    try {
        // Force loading from .env file in this specific directory
        const dotenvPath = path.resolve(__dirname, '../.env');
        delete process.env.MONGODB_URI; // clear any global value
        require('dotenv').config({ path: dotenvPath });

        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI is not defined in the .env file at:', dotenvPath);
            process.exit(1);
        }

        await loadDatabaseEvents();
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ MongoDB connection successful. State:", mongoose.connection.readyState);
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
        process.exit(1);
    }
}

module.exports = connectToMongoDB;
