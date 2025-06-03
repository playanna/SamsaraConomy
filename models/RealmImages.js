// models/RealmImages.js
const mongoose = require('mongoose');

const realmImageSchema = new mongoose.Schema({
    realmKey: {
        type: String,
        required: true,
        unique: true,
        enum: ['verdant', 'moon', 'crimson', 'abyssal', 'chains', 'hells', 'summit']
    },
    images: [{
        type: String,
        required: true
    }],
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    source: {
        type: String,
        default: 'github',
        enum: ['github', 'manual', 'placeholder']
    }
}, {
    timestamps: true
});

// Index for faster queries
realmImageSchema.index({ realmKey: 1 });

// Static method to get random image for a realm
realmImageSchema.statics.getRandomImage = async function(realmKey) {
    try {
        const realmData = await this.findOne({ realmKey });
        if (!realmData || !realmData.images || realmData.images.length === 0) {
            console.warn(`No images available for realm: ${realmKey}`);
            return 'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg'; // Default placeholder
        }
        const randomIndex = Math.floor(Math.random() * realmData.images.length);
        return realmData.images[randomIndex];
    } catch (error) {
        console.error(`Error getting random image for realm ${realmKey}:`, error);
        return 'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg'; // Default placeholder
    }
};

// Static method to update realm images
realmImageSchema.statics.updateRealmImages = async function(realmKey, images, source = 'github') {
    try {
        const result = await this.findOneAndUpdate(
            { realmKey },
            { 
                images, 
                source,
                lastUpdated: new Date()
            },
            { 
                upsert: true, 
                new: true 
            }
        );
        return result;
    } catch (error) {
        console.error(`Error updating images for realm ${realmKey}:`, error);
        throw error;
    }
};

// Static method to initialize default placeholders
realmImageSchema.statics.initializeDefaults = async function() {
    const defaultRealms = ['verdant', 'moon', 'crimson', 'abyssal', 'chains', 'hells', 'summit'];
    const placeholderImage = 'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg';
    
    try {
        for (const realmKey of defaultRealms) {
            const existing = await this.findOne({ realmKey });
            if (!existing) {
                await this.create({
                    realmKey,
                    images: [placeholderImage],
                    source: 'placeholder'
                });
                console.log(`Initialized default placeholder for realm: ${realmKey}`);
            }
        }
        console.log('Default realm image initialization complete.');
    } catch (error) {
        console.error('Error initializing default realm images:', error);
        throw error;
    }
};

// Static method to get all realm images
realmImageSchema.statics.getAllRealmImages = async function() {
    try {
        const realms = await this.find({}).sort({ realmKey: 1 });
        const realmMap = {};
        realms.forEach(realm => {
            realmMap[realm.realmKey] = realm.images;
        });
        return realmMap;
    } catch (error) {
        console.error('Error getting all realm images:', error);
        throw error;
    }
};

module.exports = mongoose.model('RealmImage', realmImageSchema);
