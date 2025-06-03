const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const Inventory = require('../../models/Multipliers/inventory.js');
const Clanpoints = require('../../models/Clan/clanpoints.js');
const { getAvailablePillsForRealm, pillData } = require('../../data/pills.js');
const { stageData } = require('../../data/stages.js');

function calculatePillCost(pill, currentRealm) {
    const realm = stageData.find(r => r.name === currentRealm);
    if (!realm) return 0;
    return Math.floor((realm.xpRequired / 100) * (pill.boost * 100));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pillshop')
        .setDescription('Buy a tribulation-enhancing pill'),

    async execute(interaction) {
        const userId = interaction.user.id;

        const inventory = await Inventory.findOne({ userId });
        const points = await Clanpoints.findOne({ userId });

        if (!inventory || !points) {
            return interaction.reply({ content: "You must begin cultivation first!", ephemeral: true });
        }

        const currentRealm = inventory.karmicRealms;
        const availablePills = getAvailablePillsForRealm(currentRealm, stageData);
        console.log(availablePills);

        const options = availablePills.map(pill => {
            const cost = calculatePillCost(pill, currentRealm);
            return {
                label: pill.name,
                value: pill.name,
                description: `${pill.description} (${cost} gold)`
            };
        });

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('pill_select')
                .setPlaceholder('Choose your pill...')
                .addOptions(options)
        );

        const embed = new EmbedBuilder()
            .setTitle("🧪 Pill Shop")
            .setDescription("Choose pills")
            .setColor('#22c55e');

        await interaction.reply({ embeds: [embed], components: [row] });

        // Handle selection
        const message = await interaction.fetchReply();
        const collector = message.createMessageComponentCollector({ time: 30000 });

        collector.on('collect', async i => {
            if (i.user.id !== userId) {
                return i.reply({ content: "This is not your transaction!", ephemeral: true });
            }

            const selectedPillName = i.values[0];
            const selectedPill = pillData.find(p => p.name === selectedPillName);
            const cost = calculatePillCost(selectedPill, currentRealm);

            if (points.balance < cost) {
                return i.update({
                    content: `❌ You don't have enough gold! (${points.balance}/${cost})`,
                    components: [],
                    embeds: []
                });
            }

            const pillCount = inventory.pills?.get(selectedPillName) || 0;
            const maxAllowed = selectedPill.maxOwned || 1;

            if (pillCount >= maxAllowed) {
                return i.update({
                    content: `❌ You can't own more than ${maxAllowed} **${selectedPill.grade}-Grade** pills.`,
                    components: [],
                    embeds: []
                });
            }

            const realmIndex = stageData.findIndex(r => r.name === currentRealm);
            const alreadyOwned = inventory.pills || [];

            // Pill ownership cap based on its grade
            const limitReached = pillCount >= (selectedPill.maxOwned || 1);

            if (limitReached) {
                return i.update({
                    content: `❌ You can't own more than ${selectedPill.maxOwned} **${selectedPill.grade}-Grade** pills.`,
                    components: [],
                    embeds: []
                });
            }

            // Deduct cost, update inventory
            await Clanpoints.updateOne(
                { userId },
                { $inc: { balance: -cost } }
            );

            await Inventory.updateOne(
                { userId },
                { $inc: { [`pills.${selectedPillName}`]: 1 } }
            );            

            const successEmbed = new EmbedBuilder()
                .setTitle("✅ Pill Acquired!")
                .setDescription(`You bought a **${selectedPill.name}** for **${cost} gold**.`)
                .setFooter({ text: selectedPill.description })
                .setColor('#38bdf8');

            await i.update({
                embeds: [successEmbed],
                components: []
            });
        });

        collector.on('end', () => {
            if (!message.editable || message.deleted) return;

            message.edit({
                components: []
            }).catch(console.error);
        });
    }
};
