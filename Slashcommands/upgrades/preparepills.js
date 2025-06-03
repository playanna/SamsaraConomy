const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Inventory = require('../../models/Multipliers/inventory.js');
const { pillData } = require('../../data/pills.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('preparepill')
        .setDescription('Select pills to activate for your next breakthrough (up to 10).'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const inventory = await Inventory.findOne({ userId });

        if (!inventory) {
            return interaction.reply({ content: "You must begin cultivation first!", ephemeral: true });
        }

        const ownedPills = inventory.pills || new Map();
        const activePills = inventory.activePills || new Map();

        const totalActive = [...activePills.values()].reduce((sum, val) => sum + val, 0);

        // Filter pills the user actually owns
        const availablePills = pillData.filter(p => ownedPills.get(p.name) > 0);

        if (availablePills.length === 0) {
            return interaction.reply({ content: "You don't own any pills!", ephemeral: true });
        }

        const options = availablePills.map(pill => {
            const owned = ownedPills.get(pill.name) || 0;
            const active = activePills.get(pill.name) || 0;
            return {
                label: pill.name,
                value: pill.name,
                description: `${pill.description} (Owned: ${owned}, Active: ${active})`
            };
        });

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('pill_prepare_select')
                .setPlaceholder('Select a pill to activate...')
                .addOptions(options)
        );

        const embed = new EmbedBuilder()
            .setTitle("💊 Prepare Pills for Breakthrough")
            .setDescription(`Select pills to activate for your next breakthrough.\nYou can activate up to **10 pills total**.\n\nAlready active: **${totalActive}**`)
            .setColor('#f97316');

        await interaction.reply({ embeds: [embed], components: [row] });

        const message = await interaction.fetchReply();
        const collector = message.createMessageComponentCollector({ time: 30000 });

        collector.on('collect', async i => {
            if (i.user.id !== userId) {
                return i.reply({ content: "This isn't your session!", ephemeral: true });
            }

            const selected = i.values[0];
            const currentOwned = ownedPills.get(selected) || 0;
            const currentActive = activePills.get(selected) || 0;

            if (currentOwned <= currentActive) {
                return i.reply({ content: `You can't activate more **${selected}** pills than you own!`, ephemeral: true });
            }

            if (totalActive + 1 > 10) {
                return i.reply({ content: "❌ You can't activate more than 10 pills at once!", ephemeral: true });
            }

            await Inventory.updateOne(
                { userId },
                { $inc: { [`activePills.${selected}`]: 1 } }
            );

            return i.update({
                content: `✅ Activated one **${selected}** pill.`,
                components: [],
                embeds: []
            });
        });

        collector.on('end', () => {
            if (!message.editable || message.deleted) return;
            message.edit({ components: [] }).catch(console.error);
        });
    }
};
