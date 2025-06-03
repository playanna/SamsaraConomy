// utils/buttons/upgrades/upg_router.js
const Multipliers = require('../../../models/Multipliers/multipliers');
const Clanpoints = require('../../../models/Clan/clanpoints');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const SCRIPTURES = [
  { 
    key: 'loot', 
    label: 'Samsara’s Net Sutra',  
    dao: "The Unreturning Catch",  
    Effect: "Loot Multiplier",
    color: 0x8B0000,
    quotes: [
      "> *'What sinks beneath the karmic waves was never meant to surface' — First Jade-Patriarch*",
      "> *'A soul once hooked forgets it ever swam free*'",
      "> *'The weight of your haul measures the depth of your descent*'",
      "> *'We do not steal treasures - we reclaim what the Wheel already forgot*'",
      "> *'Every artifact in your bag whispers the name of its true owner*'"
    ]
  },
  { 
    key: 'xp', 
    label: 'Drowning Enlightenment Sutra',  
    dao: "Depths-Clouded Wisdom",  
    Effect: "XP Multiplier",
    color: 0x4B0082,
    quotes: [
      "> *'The brightest insights come from the darkest waters*'",
      "> *'To understand a soul is to know how it will scream*'",
      "> *'What you learn today drowns what you knew yesterday*'",
      "> *'The Sect's truth: Enlightenment is just forgetting how to float*'"
    ]
  },
  { 
    key: 'shop', 
    label: 'Ghost Market Sutra',  
    dao: "Bargaining With the Drowned",  
    Effect: "Shop Bonus",
    color: 0xDAA520,
    quotes: [
      "> *'Even the dead must pay their debts*'",
      "> *'The best prices are found where living men cannot breathe*'",
      "> *'What is bought here is always sold elsewhere*'",
      "> *'The Sect's rule: Every coin spent is a weight around your neck*'"
    ]
  },
  { 
    key: 'clan', 
    label: 'Ancestral Currents Sutra',  
    dao: "Blood Like Riverwater",  
    Effect: "Pagoda Power",
    color: 0xDC143C,
    quotes: [
      "> *'What our line has caught, the ocean will never forgive*'",
      "> *'A family that fishes together drowns together*'",
      "> *'The deeper our shared sins, the stronger the undertow*'",
      "> *'The Sect's bond: We are all sinking, but at least we sink as one*'"
    ]
  },
  { 
    key: 'discount', 
    label: 'Dead Man\'s Deal Sutra',  
    dao: "Haggling With the Departed",  
    Effect: "Discount Power",
    color: 0x228B22,
    quotes: [
      "> *'The final price is always paid by someone else*'",
      "> *'A bargain struck in this life comes due in the next*'",
      "> *'Even the River of Souls has its backwaters*'",
      "> *'The Sect's art: Making the current work against itself*'"
    ]
  }
];

const REALM_TITLES = [
  "Mortal Apprentice", 
  "Earthly Initiate", 
  "Sky Enlightened", 
  "Celestial Adept", 
  "Divine Master",
  "Half-Step Transcendent",
  "Dao Embodiment",
  "Heavenly Law",
  "Cosmic Truth",
  "Great Dao Origin"
];

// Helper: Next Layer Hint
function getNextLayerHint(key, level) {
  const hints = {
    loot: [
      "The Jade Patriarch’s first catch was a drunkard’s soul by the riverside - 'Even the smallest fish fattens the net,' he whispered.",
      "When the Sect fished a magistrate’s soul from his gilded palanquin, we learned: 'The rich sink faster when weighted with karma.'",
      "A celestial crane’s soul fought our hooks for seven days - its wings now adorn the Patriarch’s throne of drowned vows.",
      "Last monsoon, we hauled up an entire sunken monastery - its prayer bells still ring with trapped enlightenment."
    ],
    xp: [
      "The Patriarch once meditated on a single teardrop for forty years - it now boils eternally in his alms bowl.",
      "Our scribes record time by how many souls dissolve in the Sect’s memory-pools - the count passed millennia last Tuesday.",
      "When Old Man Bell absorbed a thunder god’s shattered soul, the resulting insight burned his eyes to jade.",
      "The Sect’s deepest truth: 'Enlightenment is just another soul we haven’t caught yet.'"
    ],
    shop: [
      "The Night Market only appears when we toss soul-coins into puddles - its stallkeepers always short-change the dead.",
      "When the Patriarch bought a ghost-general’s loyalty with his own daughter’s soul, the river ran backwards for a week.",
      "Our vaults hold contracts signed in ichor - even Yama’s clerks cannot parse our compounding interest.",
      "Last equinox, we sold a Buddha’s discarded karma to a fox spirit - the resulting paradox birthed three new hells."
    ],
    clan: [
      "New initiates must swallow a pearl containing their ancestor’s screams - this is called 'family love.'",
      "During the Bloodlink Rite, cousins Robot and Thought traded left hands - their shared grip can strangle ghosts.",
      "The Sect’s nursery rhymes are sung in the language of drowned cities - infants who cry during them get extra rations.",
      "Our genealogy scroll is written on flayed destiny - adding a name requires erasing another bloodline entirely."
    ],
    discount: [
      "A beggar once traded his next life for a bowl of rice - we now serve that same bowl at every initiation feast.",
      "When the Patriarch haggled with a leper over his soul’s price, the resulting paradox created the first karma-debt.",
      "The 'Bargain of Broken Vows' lets you pay with others’ souls - popular at weddings and funerals alike.",
      "Last winter, we discounted a warlord’s damnation 90% - the resulting imbalance sank an entire providence."
    ]
  };
  return hints[key][Math.min(level, hints[key].length - 1)];
}

// Helper: Tribulation Warning
function getTribulationWarning(level) {
  if (level >= 8) return "⚡ **Heavenly Tribulation Imminent!**";
  if (level >= 5) return "☁️ Minor Qi Deviation Risk";
  return "";
}

module.exports = {
  async execute(interaction) {
    const userId = interaction.user.id;
    const customId = interaction.customId;
    const isNext = customId.startsWith('upg_next_');
    const currentPage = parseInt(customId.split('_')[2]);
    const newPage = isNext ? currentPage + 1 : currentPage - 1;
    const emoji = '<:heavenlyorbs:776075202849013770>';

    const multipliers =
      (await Multipliers.findOne({ userId })) ||
      await Multipliers.create({ userId });
    const clanpoints =
      (await Clanpoints.findOne({ userId })) ||
      await Clanpoints.create({ userId });

    const generateEmbed = async (page) => {
      if (page === 0) {
        return new EmbedBuilder()
          .setTitle('《 Samsara Slave’s Tethic Tome 》')
          .setDescription([
            "> *'What sinks beneath the karmic waves was never meant to surface' — First Jade-Patriarch*",
            "",
            "**Soul Manual:**",
            "• Convert your Karmic Debt into Karmic Jade",
            `• Spend Karmic Jade (${emoji}) to deepen your entanglement with fate`,
            "• Each scripture has 10 abyssal layers of forbidden wisdom",
            "• Deeper layers demand exponentially more Karmic Jade",
            "",
            "*Beyond the 10th layer lies the Sunken City of Deez - where even the Wheel forgets to turn...*",
            "",
            "**Warning:** Attempting deep trawls without sufficient karmic weight may attract Naraka’s Bailiffs!"
          ].join('\n'))
          .setColor(0x4B0082)
          .setFooter({ 
            text: "The current pulls you toward the next page →", 
            iconURL: interaction.guild.iconURL()
          });
      }

      const scripture = SCRIPTURES[page - 1];
      const level = multipliers[`${scripture.key}upgradeLevel`];
      const baseCost = 100;
      const multiplier = 100;
      const cost = baseCost + (multiplier * (level ** 6));

      return new EmbedBuilder()
        .setTitle(`《 ${scripture.label} 》`)
        .setDescription([
          `**Karmic Current:** ${scripture.dao}`,
          `**Abyssal Depth:** ${level}/10 (${REALM_TITLES[Math.min(level, REALM_TITLES.length - 1)]})`,
          `**Next Descent Cost:** ${cost} ${emoji} (Karmic Jade)`,
          `**Your Karmic Jade Balance:** ${clanpoints.balance} ${emoji}`,
          "",
          `${scripture.quotes[Math.min(level, scripture.quotes.length - 1)]}\n`,
          `**Scripture Effect:** ${scripture.Effect}`,
          level >= 10 
            ? "**The Wheel turns no further here**"
            : `*"${getNextLayerHint(scripture.key, level)}"*`,
          "",
          getTribulationWarning(level),
          "",
          level < 10 
            ? "*The riverbed grows darker beneath you...*" 
            : "*You've reached where even light drowns*"
        ].join('\n'))
        .setColor(scripture.color)
        .setFooter({
          text: level >= 10 ? "The End is nigh" : "The current pulls you deeper...",
          iconURL: interaction.guild?.iconURL()
        });
    };

    const generateComponents = (page) => {
      const components = [];

      const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`upg_prev_${page}`)
          .setLabel('⬅️ Previous Scripture')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),

        new ButtonBuilder()
          .setCustomId(`upg_next_${page}`)
          .setLabel('Next Scripture ➡️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === SCRIPTURES.length)
      );
      components.push(navRow);

      if (page > 0) {
        const scripture = SCRIPTURES[page - 1];
        const level = multipliers[`${scripture.key}upgradeLevel`];
        const baseCost = 100;
        const multiplier = 100;
        const cost = baseCost + multiplier * level ** 6;
        const canAfford = clanpoints.balance >= cost;
        const notMaxed = level < 10;

        const upgradeRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`upgrade_${scripture.key}`)
            .setLabel(`Comprehend ${scripture.label}`)
            .setStyle(level >= 8 ? ButtonStyle.Danger : ButtonStyle.Success)
            .setDisabled(!canAfford || !notMaxed)
        );
        components.push(upgradeRow);
      }

      return components;
    };

    const embed = await generateEmbed(newPage);
    const components = generateComponents(newPage);

    await interaction.update({
      embeds: [embed],
      components,
    });
  },
};
