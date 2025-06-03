// ./data/realms.js

const RealmImage = require('../models/RealmImages');

// Realm definitions (names and danger levels only - images stored in MongoDB)
const REALMS = {
  verdant: { name: 'Verdant Genesis Valley (青源谷)', danger: 'Earth Grade' },
  moon: { name: 'Shattered Moon Gorge (碎月峡)', danger: 'Sky Grade' },
  crimson: { name: 'Crimson Vein Peaks (赤脉山)', danger: 'Inferno Grade' },
  abyssal: { name: 'Abyssal Ghost Sea (幽冥鬼海)', danger: 'Nether Grade' },
  chains: { name: 'Celestial Chains Desolation (天链荒原)', danger: 'Heaven Grade' },
  hells: { name: 'Nine Hells Blood Pagoda (九狱血塔)', danger: 'Asura Grade' },
  summit: { name: 'Heaven-Devouring Summit (吞天巅)', danger: 'Cosmic Grade' },
};

// Updated function to get random realm image from MongoDB
async function getRandomRealmImage(realmKey) {
  try {
    return await RealmImage.getRandomImage(realmKey);
  } catch (error) {
    console.error(`Error getting random image for realm ${realmKey}:`, error);
    return 'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg'; // Fallback
  }
}

// Function to initialize default realm images in MongoDB
async function initializeDefaultRealmImages() {
  try {
    await RealmImage.initializeDefaults();
  } catch (error) {
    console.error('Error initializing default realm images:', error);
    throw error;
  }
}

module.exports = { REALMS, getRandomRealmImage, initializeDefaultRealmImages };