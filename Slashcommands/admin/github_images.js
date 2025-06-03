const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fetch = require('node-fetch');
const RealmImage = require('../../models/RealmImages');
const fs = require('fs');
const path = require('path');

// 🔒 Manually load GitHub config from .env file (ignores global env)
const dotenvPath = path.resolve(__dirname, '../../.env');
let GITHUB_USERNAME = 'your-github-username';
let GITHUB_REPO_NAME = 'your-repo-name';
let GITHUB_BRANCH = 'main';
let GITHUB_PAT = null;

if (fs.existsSync(dotenvPath)) {
    const envLines = fs.readFileSync(dotenvPath, 'utf8')
        .split('\n')
        .map(line => line.trim());

    for (const line of envLines) {
        if (line.startsWith('GITHUB_USERNAME=')) {
            GITHUB_USERNAME = line.split('=')[1].trim();
        } else if (line.startsWith('GITHUB_REPO_NAME=')) {
            GITHUB_REPO_NAME = line.split('=')[1].trim();
        } else if (line.startsWith('GITHUB_BRANCH=')) {
            GITHUB_BRANCH = line.split('=')[1].trim();
        } else if (line.startsWith('GITHUB_PAT=')) {
            const patValue = line.split('=')[1].trim();
            // Remove any comments from the PAT value
            GITHUB_PAT = patValue.includes('#') ? patValue.split('#')[0].trim() : patValue;
        }
    }
}

// GitHub repository configuration
const GITHUB_CONFIG = {
    username: GITHUB_USERNAME,
    repo: GITHUB_REPO_NAME,
    branch: GITHUB_BRANCH,
    pat: GITHUB_PAT, // Personal Access Token (optional)
    folders: {
        verdant: 'images/verdant',
        moon: 'images/moon',
        crimson: 'images/crimson',
        abyssal: 'images/abyssal',
        chains: 'images/chains',
        hells: 'images/hells',
        summit: 'images/summit'
    }
};

async function fetchGitHubImages(realmKey, folderPath) {
    try {
        const url = `https://api.github.com/repos/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/contents/${folderPath}?ref=${GITHUB_CONFIG.branch}`;
        console.log(`Fetching images from: ${url}`);
        
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Discord-Bot-RealmImages'
        };
        
        if (GITHUB_CONFIG.pat) {
            headers['Authorization'] = `token ${GITHUB_CONFIG.pat}`;
        }
        
        const response = await fetch(url, { headers });
        
        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`GitHub API: Folder '${folderPath}' not found for realm ${realmKey}`);
                return [];
            } else if (response.status === 403) {
                console.error(`GitHub API: Rate limit exceeded or permission denied for ${realmKey}. Consider using a PAT.`);
                return [];
            }
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
        
        const files = await response.json();
        
        // Filter for image files and get their download URLs
        const imageUrls = files
            .filter(file => 
                file.type === 'file' && 
                /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name)
            )
            .map(file => file.download_url);
        
        console.log(`Found ${imageUrls.length} images for realm: ${realmKey}`);
        return imageUrls;
        
    } catch (error) {
        console.error(`Error fetching GitHub images for realm ${realmKey}:`, error);
        return [];
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('github_images')
        .setDescription('Load realm images from GitHub repository and store in database')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Action to perform')
                .setRequired(true)
                .addChoices(
                    { name: 'Load All Images', value: 'load_all' },
                    { name: 'Load Specific Realm', value: 'load_realm' },
                    { name: 'Check Database Status', value: 'status' },
                    { name: 'Clear Database', value: 'clear' }
                )
        )
        .addStringOption(option =>
            option.setName('realm')
                .setDescription('Specific realm to update (required for load_realm action)')
                .setRequired(false)
                .addChoices(
                    { name: 'Verdant Genesis Valley', value: 'verdant' },
                    { name: 'Shattered Moon Gorge', value: 'moon' },
                    { name: 'Crimson Vein Peaks', value: 'crimson' },
                    { name: 'Abyssal Ghost Sea', value: 'abyssal' },
                    { name: 'Celestial Chains Desolation', value: 'chains' },
                    { name: 'Nine Hells Blood Pagoda', value: 'hells' },
                    { name: 'Heaven-Devouring Summit', value: 'summit' }
                )
        ),
    stage : 'beta',

    async execute(interaction) {
        // Check if user has administrator permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ You need Administrator permissions to use this command.',
                ephemeral: true
            });
        }

        const action = interaction.options.getString('action');
        const specificRealm = interaction.options.getString('realm');
        
        await interaction.deferReply();

        try {
            switch (action) {
                case 'load_all':
                    await handleLoadAll(interaction);
                    break;
                    
                case 'load_realm':
                    if (!specificRealm) {
                        return interaction.editReply('❌ You must specify a realm when using the "load_realm" action.');
                    }
                    await handleLoadRealm(interaction, specificRealm);
                    break;
                    
                case 'status':
                    await handleStatus(interaction);
                    break;
                    
                case 'clear':
                    await handleClear(interaction);
                    break;
                    
                default:
                    await interaction.editReply('❌ Unknown action specified.');
            }

        } catch (error) {
            console.error('Error in github_images command:', error);
            await interaction.editReply({
                content: `❌ **Error executing GitHub images command:**\n\`\`\`\n${error.message}\n\`\`\`\n\nPlease check the console for more details.`
            });
        }
    },
};

async function handleLoadAll(interaction) {
    // Validate GitHub configuration
    if (!GITHUB_CONFIG.username || !GITHUB_CONFIG.repo || GITHUB_CONFIG.username === 'your-github-username') {
        return interaction.editReply({
            content: '❌ **GitHub configuration incomplete!**\n\nPlease set the following in your `.env` file:\n• `GITHUB_USERNAME`\n• `GITHUB_REPO_NAME`\n• `GITHUB_BRANCH` (optional, defaults to "main")\n• `GITHUB_PAT` (optional, for higher rate limits)'
        });
    }

    const realmsToUpdate = Object.keys(GITHUB_CONFIG.folders);
    let successCount = 0;
    let totalImages = 0;
    const results = [];

    for (const realmKey of realmsToUpdate) {
        const folderPath = GITHUB_CONFIG.folders[realmKey];
        const imageUrls = await fetchGitHubImages(realmKey, folderPath);
        
        if (imageUrls.length > 0) {
            try {
                await RealmImage.updateRealmImages(realmKey, imageUrls, 'github');
                successCount++;
                totalImages += imageUrls.length;
                results.push(`✅ ${realmKey}: ${imageUrls.length} images`);
                console.log(`Successfully updated ${imageUrls.length} images for realm: ${realmKey}`);
            } catch (dbError) {
                console.error(`Database error updating realm ${realmKey}:`, dbError);
                results.push(`❌ ${realmKey}: Database error`);
            }
        } else {
            results.push(`⚠️ ${realmKey}: No images found`);
        }
    }

    const replyMessage = [
        `**GitHub Images Update Complete**`,
        ``,
        `📊 **Summary:**`,
        `• Realms updated: ${successCount}/${realmsToUpdate.length}`,
        `• Total images loaded: ${totalImages}`,
        ``,
        `📋 **Details:**`,
        ...results,
        ``,
        `🔧 **Configuration:**`,
        `• Repository: ${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}`,
        `• Branch: ${GITHUB_CONFIG.branch}`,
        ``,
        `*Images are now stored in MongoDB and ready for use!*`
    ].join('\n');

    await interaction.editReply(replyMessage);
}

async function handleLoadRealm(interaction, realmKey) {
    if (!GITHUB_CONFIG.folders[realmKey]) {
        return interaction.editReply(`❌ No folder configuration found for realm: ${realmKey}`);
    }

    const folderPath = GITHUB_CONFIG.folders[realmKey];
    const imageUrls = await fetchGitHubImages(realmKey, folderPath);
    
    if (imageUrls.length > 0) {
        try {
            await RealmImage.updateRealmImages(realmKey, imageUrls, 'github');
            await interaction.editReply({
                content: `✅ **Successfully updated realm: ${realmKey}**\n\n📊 **Images loaded:** ${imageUrls.length}\n🗂️ **Folder:** ${folderPath}\n💾 **Stored in:** MongoDB`
            });
        } catch (dbError) {
            console.error(`Database error updating realm ${realmKey}:`, dbError);
            await interaction.editReply(`❌ Database error while updating realm: ${realmKey}`);
        }
    } else {
        await interaction.editReply(`⚠️ **No images found for realm: ${realmKey}**\n\n🗂️ **Folder checked:** ${folderPath}\n\nPlease verify the folder exists and contains image files.`);
    }
}

async function handleStatus(interaction) {
    try {
        const allRealms = await RealmImage.find({}).sort({ realmKey: 1 });
        
        if (allRealms.length === 0) {
            return interaction.editReply('📋 **Database Status:** No realm images found in database.\n\nUse `/github_images load_all` to populate from GitHub.');
        }

        const statusLines = allRealms.map(realm => {
            const isPlaceholder = realm.source === 'placeholder';
            const icon = isPlaceholder ? '⚠️' : '✅';
            const ageText = realm.lastUpdated ? `(Updated: ${realm.lastUpdated.toLocaleDateString()})` : '';
            
            return `${icon} **${realm.realmKey}**: ${realm.images.length} image${realm.images.length !== 1 ? 's' : ''} ${ageText}`;
        });

        const totalImages = allRealms.reduce((sum, realm) => sum + realm.images.length, 0);
        const placeholderCount = allRealms.filter(realm => realm.source === 'placeholder').length;

        await interaction.editReply([
            `📋 **Database Status Report**`,
            ``,
            `📊 **Summary:**`,
            `• Total realms: ${allRealms.length}`,
            `• Total images: ${totalImages}`,
            `• Placeholders: ${placeholderCount}`,
            ``,
            `📋 **Realm Details:**`,
            ...statusLines
        ].join('\n'));

    } catch (error) {
        console.error('Error getting database status:', error);
        await interaction.editReply('❌ Error retrieving database status. Check console for details.');
    }
}

async function handleClear(interaction) {
    try {
        const result = await RealmImage.deleteMany({});
        await interaction.editReply(`✅ **Database cleared successfully!**\n\n📊 **Deleted:** ${result.deletedCount} realm image records\n\n⚠️ **Note:** You'll need to run \`/github_images load_all\` or restart the bot to reinitialize default placeholders.`);
    } catch (error) {
        console.error('Error clearing database:', error);
        await interaction.editReply('❌ Error clearing database. Check console for details.');
    }
}
