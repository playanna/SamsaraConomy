const {
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
    SlashCommandBuilder,
    ButtonStyle
} = require('discord.js');
const { stageData, attemptBreakthrough, generateKarmaBar } = require('../../data/stages.js');
const Inventory = require('../../models/Multipliers/inventory.js');
const { pillData } = require('../../data/pills.js');

// Realm penalty logic
function getRealmPenaltyMultiplier(currentRealm, pillGrade) {
    const realmIndex = stageData.findIndex(r => r.name === currentRealm);
    const penaltyTable = {
        "Mortal": realmIndex <= 2 ? 1.0 : realmIndex <= 5 ? 0.3 : realmIndex <= 8 ? 0.1 : realmIndex <= 11 ? 0.05 : 0.01,
        "Earth": realmIndex <= 5 ? 1.0 : realmIndex <= 8 ? 0.6 : realmIndex <= 11 ? 0.4 : 0.2,
        "Sky": realmIndex <= 8 ? 1.0 : realmIndex <= 11 ? 0.8 : 0.65,
        "Celestial": realmIndex <= 11 ? 1.0 : realmIndex <= 13 ? 0.65 : 0.8,
        "Divine": 1.0
    };
    return penaltyTable[pillGrade] ?? 0.5;
}

function getDiminishingMultiplier(index) {
    return Math.max(1 - index * 0.05, 0.1);
}

function calculateTotalPillBoost(activePillsMap, currentRealm) {
    if (!activePillsMap) return 0;
    let totalBoost = 0;
    const allPills = [];

    for (const [pillName, count] of activePillsMap.entries()) {
        for (let i = 0; i < count; i++) allPills.push(pillName);
    }

    allPills.sort((a, b) => {
        const pA = pillData.find(p => p.name === a);
        const pB = pillData.find(p => p.name === b);
        return (pB?.boost || 0) - (pA?.boost || 0);
    });

    for (let i = 0; i < allPills.length; i++) {
        const pill = pillData.find(p => p.name === allPills[i]);
        if (!pill) continue;
        const penalty = getRealmPenaltyMultiplier(currentRealm, pill.grade);
        const diminish = getDiminishingMultiplier(i);
        totalBoost += pill.boost * penalty * diminish;
    }

    return totalBoost;
}

async function safeReply(interaction, options) {
    try {
        if (interaction.replied || interaction.deferred) {
            return await interaction.followUp({ ...options});
        } else {
            return await interaction.reply({ ...options });
        }
    } catch (err) {
        console.error("Interaction reply failed:", err);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('breakthrough')
        .setDescription('Attempt to ascend to the next karmic realm'),
    stage: 'beta',

    async execute(interaction) {
        const userId = interaction.user.id;
        let inventory;

        try {
            inventory = await Inventory.findOne({ userId });
        } catch (err) {
            console.error("Database error fetching inventory:", err);
            return safeReply(interaction, { content: "An error occurred while accessing your inventory." });
        }

        if (!inventory) {
            return safeReply(interaction, { content: "You haven't begun your cultivation journey yet!" });
        }

        const currentRealm = inventory.karmicRealms;
        const xp = inventory.totalKarmicDebt || 0;
        const currentStage = stageData.find(s => s.name === currentRealm);
        const previousStage = stageData[stageData.indexOf(currentStage) - 1] || null;
        const maxXP = (stageData.find(s => s.name === currentRealm)?.xpRequired || 0) - (stageData[stageData.indexOf(currentStage) - 1]?.xpRequired || 0);
        currenXP = xp - (stageData[stageData.indexOf(currentStage) - 1]?.xpRequired || 0);
        const tribBoost = inventory.tribulationBoost || 0;
        const pillBoost = calculateTotalPillBoost(inventory.activePills, currentRealm);
        const totalBoost = tribBoost + pillBoost;

        if (!currentStage) {
            return safeReply(interaction, { content: "Your current realm is unknown or corrupted. Please contact an admin." });
        }

        if (stageData.indexOf(currentStage) === stageData.length - 1) {
            return safeReply(interaction, {
                embeds: [new EmbedBuilder()
                    .setTitle("**Cosmic Apex Reached**")
                    .setDescription("You've transcended the cycle of samsara. No higher realms exist!")
                    .setColor('#f59e0b')],
            });
        }

        const tribulationEmbed = new EmbedBuilder()
            .setTitle(`**${currentRealm} Tribulation**`)
            .setDescription([
                `**${interaction.user.username}** stands at the precipice of breakthrough...`,
                `> *"The Heavenly Dao tests those who defy the cycle of rebirth."*\n`,
                generateKarmaBar(currentRealm, xp),
                `\n`,
                `**Karmic Requirements:**`,
                `✦ ${xp >= currentStage.xpRequired ? '✅' : '❌'} ${maxXP} XP (${currenXP}/${maxXP})`,
                `✦ Pill Boost: +${(pillBoost * 100).toFixed(1)}%`,
                `✦ Total Success Chance: **${((currentStage.tribulationRate + totalBoost) * 100).toFixed(1)}%**`,
                `\n*Will you tempt the wrath of karma?*`
            ].join('\n'))
            .setColor('#7c3aed')
            .setThumbnail('https://i.imgur.com/lightning_cloud.png');

        const confirmButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_tribulation')
                .setLabel('Face Heavenly Judgment')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('⚡')
        );

        await safeReply(interaction, {
            embeds: [tribulationEmbed],
            components: [confirmButton],
            ephemeral: false
        });

        let message;
        try {
            message = await interaction.fetchReply();
        } catch (err) {
            console.error("Failed to fetch interaction reply message:", err);
            return;
        }

        const collector = message.createMessageComponentCollector({ time: 30000 }); // 30 seconds to respond

        collector.on('collect', async i => {
            if (i.user.id !== userId) {
                return i.reply({ content: "This tribulation belongs to another cultivator!", ephemeral: true }).catch(console.error);
            }
        
            try {
                const updatedInventory = await Inventory.findOne({ userId });
                if (!updatedInventory) {
                    return i.reply({ content: "Inventory not found. Try again later.", ephemeral: true }).catch(console.error);
                }
        
                const pillBoost = calculateTotalPillBoost(updatedInventory.activePills, currentRealm);
                const totalBoost = (updatedInventory.tribulationBoost || 0) + pillBoost;
                const userXP = xp;
        
                const result = attemptBreakthrough(currentRealm, userXP, totalBoost);
        
                if (!result.allowed) {
                    return i.reply({
                        content: result.reason || "You cannot attempt this tribulation.",
                        ephemeral: true
                    }).catch(console.error);
                }
        
                const xpLost = isNaN(result.xpLost) ? 0 : result.xpLost;
                const updatedXP = result.success ? xp : Math.max(0, xp - xpLost);                await Inventory.updateOne(
                    { userId },
                    {
                        $set: {
                            karmicRealms: result.nextStage,
                            totalKarmicDebt: updatedXP,
                            activePills: {} // clear used pills
                        }
                    }
                );

                // If breakthrough was successful, trigger stat recalculation
                if (result.success) {
                    const { invalidateUserStatsCache } = require('../../utils/workhelpers/handlers/combatCalculator');
                    await invalidateUserStatsCache(userId);
                }
        
                const resultEmbed = new EmbedBuilder()
                    .setTitle(result.success ? "**Realm Ascended!**" : "**Tribulation Failed!**")
                    .setDescription([
                        result.message,
                        `\n${result.success ? '✨' : '💀'} **${result.nextStage}** ${result.success ? 'unlocked!' : 'remains elusive...'}`,
                        result.xpLost > 0 ? `\n**Karmic Backlash:** Lost ${result.xpLost} XP` : ''
                    ].join('\n'))
                    .setColor(result.success ? '#10b981' : '#dc2626')
                    .setImage(result.success
                        ? 'https://i.imgur.com/golden_lotus.png'
                        : 'https://i.imgur.com/qi_deviation.png');
        
                await i.update({ embeds: [resultEmbed], components: [] }).catch(console.error);
            } catch (err) {
                console.error("Error during breakthrough handling:", err);
                return i.reply({ content: "Something went wrong with the tribulation. Please try again.", ephemeral: true }).catch(console.error);
            }
        });
        

        collector.on('end', () => {
            if (!message.editable || message.deleted) return;
            const disabledRow = new ActionRowBuilder().addComponents(
                ButtonBuilder.from(confirmButton.components[0]).setDisabled(true)
            );
            message.edit({ components: [disabledRow] }).catch(console.error);
        });
    }
};
