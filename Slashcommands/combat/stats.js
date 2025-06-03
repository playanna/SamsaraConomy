const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { calculateUserStats } = require('../../utils/workhelpers/handlers/combatCalculator');
const UserStats = require('../../models/Combat/userStats');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View your current combat statistics'),
    
    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            const userId = interaction.user.id;
            
            // Get current stats (this will use cached version if available)
            const stats = await calculateUserStats(userId);
            
            if (!stats) {
                return await interaction.editReply({
                    content: "❌ Unable to retrieve your combat statistics. Please try again.",
                    ephemeral: true
                });
            }
            
            // Get the UserStats record to show cache info
            const userStatsRecord = await UserStats.findOne({ userId });
            
            const embed = new EmbedBuilder()
                .setTitle('⚔️ Combat Statistics')
                .setColor(0x00AE86)
                .addFields(
                    {
                        name: '💥 Attack Power',
                        value: `${Math.round(stats.attack)}`,
                        inline: true
                    },
                    {
                        name: '🛡️ Defense',
                        value: `${Math.round(stats.defense)}`,
                        inline: true
                    },
                    {
                        name: '⚡ Speed',
                        value: `${Math.round(stats.speed)}`,
                        inline: true
                    },
                    {
                        name: '💖 Health',
                        value: `${Math.round(stats.health)}`,
                        inline: true
                    },
                    {
                        name: '⭐ Level',
                        value: `${stats.level}`,
                        inline: true
                    },
                    {
                        name: '🧘 Cultivation',
                        value: `${stats.cultivationStage}`,
                        inline: true
                    }
                )
                .setFooter({ 
                    text: userStatsRecord ? 
                        `Stats cached • Last updated: ${userStatsRecord.lastCalculated.toLocaleString()}` :
                        'Stats calculated in real-time'
                })
                .setTimestamp();
            
            // Add gear and cultivation bonuses if they exist
            if (stats.gearBonus && stats.gearBonus > 0) {
                embed.addFields({
                    name: '⚙️ Gear Bonus',
                    value: `+${Math.round(stats.gearBonus)} Attack`,
                    inline: true
                });
            }
            
            if (stats.sectRodBonus && stats.sectRodBonus > 0) {
                embed.addFields({
                    name: '🎣 Sect Rod Bonus',
                    value: `+${Math.round(stats.sectRodBonus)} Attack`,
                    inline: true
                });
            }
            
            if (stats.cultivationBonus && stats.cultivationBonus > 1) {
                embed.addFields({
                    name: '🌟 Cultivation Multiplier',
                    value: `${stats.cultivationBonus}x`,
                    inline: true
                });
            }
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error in stats command:', error);
            await interaction.editReply({
                content: "❌ An error occurred while retrieving your statistics. Please try again later.",
                ephemeral: true
            });
        }
    }
};
