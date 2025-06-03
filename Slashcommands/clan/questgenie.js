const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const generateQuest = require('../../utils/questgen');
const QuestContainer = require('../../models/Clan/quests');
const { lootTables } = require('../../utils/loots');
const cron = require('node-cron');

// Shared function for generating and updating quests
async function updateQuests(forceUpdate = false) {
    const allRealms = Object.keys(lootTables);
    const allNewQuests = [];

    try {
        let questContainer = await QuestContainer.findById('global_quest_list');
        
        // Check if update is needed
        if (!forceUpdate && questContainer && questContainer.lastUpdated) {
            const timeSinceLastUpdate = Date.now() - questContainer.lastUpdated.getTime();
            const tenHoursInMs = 10 * 60 * 60 * 1000; // 10 hours in milliseconds
            
            // If less than 10 hours have passed and quests exist, skip update
            if (timeSinceLastUpdate < tenHoursInMs && questContainer.quests && questContainer.quests.length > 0) {
                console.log(`[Quests Skipped] Last update was ${Math.round(timeSinceLastUpdate / (60 * 60 * 1000))} hours ago. Skipping update.`);
                return;
            }
        }
        
        // Create container if it doesn't exist or is corrupted
        if (!questContainer) {
            questContainer = new QuestContainer({ _id: 'global_quest_list', quests: [], lastUpdated: new Date() });
            await questContainer.save();
            console.log('[Quests] Created new quest container.');
        }

        for (const realm of allRealms) {
            for (let i = 0; i < 5; i++) {
                const questData = generateQuest(realm);
                allNewQuests.push(questData);
            }
        }

        await QuestContainer.findByIdAndUpdate(
            'global_quest_list',
            { 
                $set: { 
                    quests: allNewQuests,
                    lastUpdated: new Date()
                }
            },
            { upsert: true }
        );

        console.log(`[Quests Updated] ${allNewQuests.length} quests saved to DB.`);
    } catch (err) {
        console.error('❌ Failed to auto-update quests:', err);
    }
}

// Run once at bot start
updateQuests();

// Schedule to run every 12 hours
cron.schedule('0 */12 * * *', () => {  //
    console.log('[Cron Job] Running automatic quest update...');
    updateQuests();
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('generatequests')
        .setDescription('Admin-only: Generate 5 quests per realm and store them in the database.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    stage: 'beta',    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            await updateQuests(true); // Force update when manually triggered
            return interaction.editReply({
                content: `✅ Quests were generated and stored successfully.`
            });
        } catch (err) {
            console.error('Error during manual quest generation:', err);
            return interaction.editReply({
                content: '❌ Failed to generate quests. Check logs.'
            });
        }
    }
};
