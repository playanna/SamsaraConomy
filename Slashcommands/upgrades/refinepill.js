const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');
const Inventory = require('../../models/Multipliers/inventory.js');
const { pillData } = require('../../data/pills.js');

const pillFusionMap = {
    "Mortal-Grade Pill": "Earth-Grade Pill",
    "Earth-Grade Pill": "Sky-Grade Pill",
    "Sky-Grade Pill": "Celestial-Grade Pill",
    "Celestial-Grade Pill": "Divine-Grade Pill"
};

function getPillCount(pillsMap, pillName) {
    return pillsMap?.get(pillName) || 0;
}

function getEligibleFusions(pillsMap) {
    return pillData
        .filter(p => pillFusionMap[p.name] && getPillCount(pillsMap, p.name) >= 10)
        .map(p => ({
            base: p.name,
            result: pillFusionMap[p.name],
            count: getPillCount(pillsMap, p.name)
        }));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('refinepill')
        .setDescription('Fuse lower-grade pills into stronger ones'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const inventory = await Inventory.findOne({ userId });

        if (!inventory || !inventory.pills || inventory.pills.size === 0) {
            return interaction.reply({ content: "You don't have any pills to refine!", ephemeral: true });
        }

        const eligible = getEligibleFusions(inventory.pills);

        if (!eligible.length) {
            return interaction.reply({
                content: "You need at least 10 of a pill type to refine it.",
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle("🧪 Pill Refining")
            .setDescription("Choose a pill type to refine:")
            .setColor('#facc15');

        for (const e of eligible) {
            embed.addFields({
                name: e.base,
                value: `You have **${e.count}** → Refines into **${e.result}**`,
                inline: false
            });
        }

        const row = new ActionRowBuilder().addComponents(
            eligible.map((e) =>
                new ButtonBuilder()
                    .setCustomId(`refine|${e.base}`)
                    .setLabel(`Refine ${e.base}`)
                    .setStyle(ButtonStyle.Primary)
            )
        );

        await interaction.reply({ embeds: [embed], components: [row] });

        const message = await interaction.fetchReply();
        const collector = message.createMessageComponentCollector({ time: 30000 });

        collector.on('collect', async i => {
            if (i.user.id !== userId) {
                return i.reply({ content: "This isn't your session.", ephemeral: true });
            }

            const baseName = i.customId.split('|')[1];
            const resultName = pillFusionMap[baseName];
            const current = inventory.pills?.get(baseName) || 0;

            if (current < 10) {
                return i.update({
                    content: "❌ You no longer have enough pills.",
                    components: [],
                    embeds: []
                });
            }

            // Update inventory using atomic increment/decrement
            const updates = {
                [`pills.${baseName}`]: -10,
                [`pills.${resultName}`]: 1
            };

            await Inventory.updateOne({ userId }, { $inc: updates });

            const refinedEmbed = new EmbedBuilder()
                .setTitle("✅ Refinement Complete")
                .setDescription(`Fused 10 **${baseName}** into 1 **${resultName}**.`)
                .setColor('#4ade80');

            await i.update({ embeds: [refinedEmbed], components: [] });
        });

        collector.on('end', () => {
            if (!message.editable || message.deleted) return;
            message.edit({ components: [] }).catch(console.error);
        });
    }
};
