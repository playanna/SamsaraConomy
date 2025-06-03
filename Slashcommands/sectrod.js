const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const SectRod = require('../models/Equipment/sectrod');
const { getRodArt } = require('../utils/Equipments/rodthemes');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('rod')
    .setDescription('Display your fishing rod, stats, augments, and more.'),
    stage: 'prod',

  async execute(interaction) {
    const userId = interaction.user.id;
    let rod = await SectRod.findOne({ userId });
    // If they don't have one, give them a basic rod
    if (!rod) {
      const { execute } = require('./rod_start.js');
      return execute(interaction);
    }
    
    const {
      tier, xp, baseElement, currentElement,
      components, stats, augments, specializations,
      milestones, favorites
    } = rod;

    const asciiTheme = rod.cosmetics?.asciiTheme || components.mast || 'Bamboo';
    const rodArtBlock = `\`\`\`ml\n${getRodArt(asciiTheme, components)}\`\`\``;


    const componentBlock = `\`\`\`fix
[Rod Components]
Mast   : ${components.mast}
Line   : ${components.line}
Reel   : ${components.reel}
Grip   : ${components.grip}
\`\`\``;

    const statsBlock = `\`\`\`ini
[Core Stats]
Catch Rate : ${stats.catchRate.toFixed(2)}x
Cooldown   : ${stats.cooldown}s
Durability : ${stats.durability}/200
Precision  : ${stats.precision}
Luck       : ${stats.luck}
Resonance  : ${stats.resonance}
\`\`\``;

    const augmentsBlock = augments.length
      ? augments.map(slot => {
          const filled = slot.augmentId ? `✔️ ${slot.augmentId}` : '— Empty —';
          return `• ${slot.slotType.toUpperCase().padEnd(8)}: ${filled}`;
        }).join('\n')
      : 'No augments installed.';

    const embed = new EmbedBuilder()
      .setTitle(`🧵 ${interaction.user.username}'s Sect Rod`)
      .setDescription(`> *Tier ${tier} | ${xp} XP*\n> Elemental Alignment: **${currentElement}** *(Base: ${baseElement})*`)
      .setColor(getElementColor(currentElement))
      .addFields(
        { name: '⚙️ Components', value: rodArtBlock, inline: false },
        { name: '📊 Stats', value: statsBlock, inline: false },
        { name: '🔩 Augments', value: augmentsBlock || 'No augments installed.', inline: false },
        {
          name: '📖 Specialization',
          value: `Path: **${specializations.path}** | XP: **${specializations.xp}**`,
          inline: true
        },
        {
          name: '🏆 Milestones',
          value:
            `🎣 Catches: **${milestones.catches}** | 🌟 Rare: **${milestones.rareCatches}**\n` +
            `🗺 Current Realm: **${favorites.realms}**`,
          inline: true
        }
      )
      .setFooter({ text: `Rod Last Upgraded: ${rod.lastUpgraded ? rod.lastUpgraded.toLocaleDateString() : 'Never'}` })
      .setThumbnail('https://i.imgur.com/IH3szp3.png') // Replace with custom art later
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};

function getElementColor(element) {
  const colors = {
    Fire: 0xff6b6b,
    Water: 0x3b9eff,
    Earth: 0x8d6e63,
    Air: 0xcfd8dc,
    Lightning: 0xffea00,
    Holy: 0xfff9c4,
    Void: 0x9e9e9e,
    Chaos: 0xb388eb,
    Order: 0xffffff,
    Nature: 0x81c784,
    Arcane: 0xba68c8,
    Celestial: 0x00e5ff,
    Abyssal: 0x4e342e
  };
  return colors[element] || 0x888888;
}
