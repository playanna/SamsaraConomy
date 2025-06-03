const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
} = require('discord.js');
const Inventory = require('../../models/Multipliers/inventory');
const ExpeditionSettings = require('../../models/Multipliers/expeditionSetting');
const createBaseEmbed = require('../../utils/embed');
const { getRandomRealmImage } = require('../../data/realms');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('realms')
    .setDescription('Attune your spirit to the sacred realms in the Elder Astral Chamber'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    const rawUsername = member?.nickname || interaction.user?.globalName || interaction.user?.username || 'Unknown User';
    const username = rawUsername.replace(/[^a-zA-Z0-9\s]/g, '').trim();

    const stageNames = [
      "Karma-Bhāra", "Yīn Chán", "Preta-Gati", "Māyā-Jāla", "Durgati-Parivarta",
      "Naraka-Dvāra", "Kālāgni", "Adharma-Avatāra", "Asamkhya-Duḥkha", "Māra-Rājya",
      "Avīci-Cakra", "Yama-Dharma", "Tathāgata-Droha", "Samsara-Bhūmi",
      "Moksha-Vimokṣa", "Ananta-Agati"
    ];

    const stageData = stageNames.map(name => ({
      name,
      xpRequired: 0,
      tribulationRate: 0,
    }));

    try {
      const inventoryData = await Inventory.findOne({ userId }) || {};
      const currentStageName = inventoryData.karmicRealms || stageData[0].name;
      const currentIndex = stageData.findIndex(s => s.name === currentStageName);
      const cultivationStage = currentIndex >= 0 ? currentIndex : 0;
      console.log(`User ${username} has a cultivation stage of ${cultivationStage} (${currentStageName})`);      const realms = [
        { name: 'Verdant Genesis Valley (青源谷)', key: 'verdant', minStage: 0, danger: 'Earth Grade', dangerLevel: 1, lore: 'Where nascent cultivators take their first steps amidst singing spiritual herbs', image: 'https://i.ibb.co/N6gFKmFp/Verdant-Genesis-Valley-pixel-a-1.jpg' },
        { name: 'Shattered Moon Gorge (碎月峡)', key: 'moon', minStage: 3, danger: 'Sky Grade', dangerLevel: 3, lore: 'Celestial fragments hum with forgotten power under eternal twilight', image: 'https://i.ibb.co/m56sY2Qc/Shattered-Moon-Gorge-Su-yu-Xi.jpg' },
        { name: 'Crimson Vein Peaks (赤脉山)', key: 'crimson', minStage: 6, danger: 'Inferno Grade', dangerLevel: 5, lore: 'Volcanic arteries pulse with the primordial fire qi of creation', image: 'https://i.ibb.co/ZRxLXVmj/Crimson-Vein-Peaks-Ch-m-i-Sh-n.jpg' },
        { name: 'Abyssal Ghost Sea (幽冥鬼海)', key: 'abyssal', minStage: 9, danger: 'Nether Grade', dangerLevel: 6, lore: 'Drowned immortals whisper secrets in the endless yin mist', image: 'https://i.ibb.co/WWhpFSNc/Abyssal-Ghost-Sea-Y-um-ng-Gu-H.jpg' },
        { name: 'Celestial Chains Desolation (天链荒原)', key: 'chains', minStage: 12, danger: 'Heaven Grade', dangerLevel: 8, lore: 'Divine shackles rattle with the imprisoned fury of fallen gods', image: 'https://i.ibb.co/MkWm91r2/Celestial-Chains-Desolation-Ti-1.jpg' },
        { name: 'Nine Hells Blood Pagoda (九狱血塔)', key: 'hells', minStage: 14, danger: 'Asura Grade', dangerLevel: 9, lore: 'Each floor consumes a piece of your humanity in exchange for demonic power', image: 'https://i.ibb.co/LXHTWWqd/Nine-Hells-Blood-Pagoda-Ji-y-X.jpg' },
        { name: 'Heaven-Devouring Summit (吞天巅)', key: 'summit', minStage: 15, danger: 'Cosmic Grade', dangerLevel: 10, lore: 'The sky bleeds where reality fractures under celestial combat', image: 'https://i.ibb.co/ycf5Tysp/Heaven-Devouring-Summit-T-nti-1.jpg' }
      ];

      const [unlockedRealms, lockedRealms] = [
        realms.filter(r => cultivationStage >= r.minStage),
        realms.filter(r => cultivationStage < r.minStage)
      ];

      let settings = await ExpeditionSettings.findOne({ userId });
      if (!settings) {
        settings = new ExpeditionSettings({ userId });
        await settings.save();
      }

      const currentRealm = realms.find(r => r.key === settings.realm) || realms[0];

      const embed = createBaseEmbed({
        interaction,
        description: generateStatsBlock(username, cultivationStage, currentRealm, unlockedRealms, lockedRealms),
        color: 0x8A2BE2,
      });

      const menu = new StringSelectMenuBuilder()
        .setCustomId('realm-select')
        .setPlaceholder('Channel your qi to attune...')
        .addOptions(unlockedRealms.map(r =>
          new StringSelectMenuOptionBuilder()
            .setLabel(r.name)
            .setDescription(`Stage ${r.minStage}+ • ${r.danger}`)
            .setValue(r.key)
            .setEmoji(r.key === currentRealm.key ? '🀄' : '✨')
        ));

      const row = new ActionRowBuilder().addComponents(menu);      await interaction.reply({
        embeds: [embed],
        components: [row],
        flags: 64
      });

      const message = await interaction.fetchReply();

      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 5 * 60 * 1000,
        filter: i => i.user.id === userId,
      });

      collector.on('collect', async selectInteraction => {
        const selectedKey = selectInteraction.values[0];
        const selectedRealm = realms.find(r => r.key === selectedKey);
        const selectedIndex = realms.findIndex(r => r.key === selectedKey);        if (selectedKey === settings.realm) {
          return selectInteraction.reply({
            content: `🀄 You're already aligned with ${selectedRealm.name}!`,
            flags: 64
          });
        }

        settings.realm = selectedKey;
        settings.realmTier = selectedIndex;
        const image = await getRandomRealmImage(selectedKey);
        await settings.save();

        const confirmEmbed = createBaseEmbed({
          interaction,
          title: `🌊 **"Congratulations, You've Chosen ${selectedRealm.name} (Why?!)"**`,
          description: `
        > *The Astral Compass vomits sparks as your qi violently marries ${selectedRealm.name}*\n
        **${selectedRealm.danger} Trials Await** *(Guide Wen's Translation: "${selectedRealm.dangerLevel > 7 ? "Enjoy your funeral!" : "Might survive. No promises."}")*\n
        *(Guide Wen mutters: "${selectedRealm.name === 'Drowned Goddess’s Courtyard' ? 'I *told* you not to pick this one—' : '...well, could be worse. Maybe.'}")*
        
        `,
          color: getRealmColor(selectedKey),
          image: image,
          footer: {            text: `Guide Wen's Final Note: "${
              selectedRealm.dangerLevel > 5 
                ? 'Pack extra socks. And a will.' 
                : 'Try not to die? Just a suggestion.'
            }"`,
            iconURL: interaction.guild?.iconURL({ dynamic: true }) || null
          }
        });        await selectInteraction.reply({
          embeds: [confirmEmbed]
        });

        await interaction.editReply({
          embeds: [embed.setImage(selectedRealm.image)],
          components: []
        });
      });

      collector.on('end', () => {
        if (!message.editable) return;
        message.edit({ components: [] }).catch(() => {});
      });    } catch (err) {
      console.error('Astral Attunement Error:', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '💢 The Astral Compass shattered! Your qi destabilized the chamber...',
          flags: 64
        });
      }
    }
  },
};

const stageNames = [
  "Karma-Bhāra", "Yīn Chán", "Preta-Gati", "Māyā-Jāla", "Durgati-Parivarta",
  "Naraka-Dvāra", "Kālāgni", "Adharma-Avatāra", "Asamkhya-Duḥkha", "Māra-Rājya",
  "Avīci-Cakra", "Yama-Dharma", "Tathāgata-Droha", "Samsara-Bhūmi",
  "Moksha-Vimokṣa", "Ananta-Agati"
];

const stageData = stageNames.map(name => ({
  name,
  xpRequired: 0,
  tribulationRate: 0,
}));

function getKarmicStageName(index) {
  return stageData[index] ? stageData[index].name : 'Unknown Stage';
}

// Utility: Embed Text Generator
function generateStatsBlock(username, stage, current, unlocked, locked) {
  const unlockedBlock = unlocked.length
      ? unlocked.map(r =>
          `> • ${r.name} (Stage **${getKarmicStageName(r.minStage)}** +)\n > -# • "${r.lore.slice(0, 60)}..."`).join('\n\n')
      : '> No Hablo Español...';
  const lockedBlock = locked.length
        ? `> • ${locked[0].name} (Stage **${getKarmicStageName(locked[0].minStage)}** required)\n > -# • "${locked[0].lore.slice(0, 60)}..."`
        : '> The Astral Compass is still calibrating...';

return `** GUIDE WEN'S EMERGENCY REALM NAVIGATION **  
==========================================  
[ A cracked jade token spins wildly as ${username}'s cultivation stage sets off alarm bells ]  

**[ Current Realm Alignment ]**  
> ${current.name}  
> -# "${current.lore}"  
${current.danger} Danger Threshold *(Guide Wen's verdict: "${current.dangerLevel > 7 ? "Oh fuck no" : "Probably fine? Maybe?"}")*  

> **[ Your Karmic Stage ]**
> ☯ **${getKarmicStageName(stage)}** (Translation: "${stage > 5 ? "Congratulations, you’re now a target" : "Still small fry. Enjoy it."}")

Listen carefully. Your realm choice determines:  
- How many limbs you keep
> -# loot Amount, karmic debt
- Whether I have to bribe a goddess to un-drown you  
> -# Tribulation rate
- My patience level (currently: fraying)
> -# Guide wen is just overreacting

**[ "Safe" Realms ]**  \n-# (Disclaimer: "safe" means "only mildly cursed") 
${unlockedBlock}  

**[ Sealed Realms ]** \n-# (Guide Wen's notes: "DO NOT TOUCH UNLESS YOU WANT TO MEET MY GRANDFATHER'S GHOST AGAIN")
${lockedBlock}  

-# **[ Bonus: Guide Wen's Live Commentary ]**
-# " ${current.dangerLevel > 5 ?  
  ' ⚠ *sound of frantic talisman-ripping* "Why do you people ALWAYS pick the worst options—"' :  
  ' ...*sigh* "Fine, but if this goes wrong, I’m keeping your shoes as collateral."'}"`;
}

// Realm-specific bonuses
function getRealmBonus(realmKey) {
  const bonuses = {
    verdant: '+50% Spirit Herb discovery chance',
    moon: 'Moonlight enhances all yin-based techniques',
    crimson: 'Fire qi passively tempers your body',
    abyssal: 'Drowned spirits occasionally reveal secrets',
    chains: 'Divine shackle fragments boost defense',
    hells: 'Demonic pacts available in expeditions',
    summit: 'Heavenly dao fragments grant cosmic insights'
  };
  return bonuses[realmKey] || 'Unknown blessing';
}

// Realm-specific challenges
function getRealmChallenge(realmKey) {
  const challenges = {
    verdant: 'Ancient formations may trap the unwary',
    moon: 'Gravity anomalies distort spatial awareness',
    crimson: 'Volcanic eruptions occur unpredictably',
    abyssal: 'Leviathans may surface during storms',
    chains: 'Lightning tribulations strike randomly',
    hells: 'Demonic corruption accumulates over time',
    summit: 'Reality itself becomes unstable'
  };
  return challenges[realmKey] || 'Unknown trial';
}

// Realm-specific colors
function getRealmColor(realmKey) {
  const colors = {
    verdant: 0x2ECC71,
    moon: 0x3498DB,
    crimson: 0xE74C3C,
    abyssal: 0x9B59B6,
    chains: 0xF1C40F,
    hells: 0xE67E22,
    summit: 0x8A2BE2
  };
  return colors[realmKey] || 0xFFFFFF;
}