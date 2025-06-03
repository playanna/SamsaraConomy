const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} = require('discord.js');
const createBaseEmbed = require('../../utils/embed');
const Inventory = require('../../models/Multipliers/inventory.js');
const ExpeditionSettings = require('../../models/Multipliers/expeditionSetting.js');
const { generateKarmaBar } = require('../../data/stages.js');
const { REALMS, getRandomRealmImage } = require('../../data/realms');
const { cultivationStages, getStageIndexByRealm } = require('../../utils/cultivationStages.js');
const generateCultivationImage = require('../../utils/generateCultivationImage');

const getRealmData = (key) => {
  const realm = REALMS[key];
  if (!realm) {
    return {
      name: 'Mortal Plains (凡尘)',
      image: 'https://i.ibb.co/mnT2LZF/WANEELLA-pixel-art.gif',
      danger: 'Mortal Grade'
    };
  }

  const { name, danger, images } = realm;
  const image = Array.isArray(images)
    ? images[Math.floor(Math.random() * images.length)]
    : images;

  return { name, danger, image };
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cultivation')
    .setDescription('Peer into the karmic ledger of a cultivator')
    .addUserOption(option =>
      option.setName('disciple')
        .setDescription('Whose karmic descent shall you witness?')
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('disciple') || interaction.user;
    if (!targetUser?.id) {
      return interaction.reply({
        content: '⚠️ *The karmic echo lacks a soul to trace.*',
        ephemeral: true,
      });
    }

    const userId = targetUser.id;

    try {
      const [settings, inventoryData = {}] = await Promise.all([
        ExpeditionSettings.findOne({ userId }),
        Inventory.findOne({ userId }),
      ]);

      if (!settings) {
        return interaction.editReply({
          content: '💢 *The karmic ledger is blank—this one has yet to sin against the Dao.*',
          ephemeral: true,
        });
      }

      const currentRealm = inventoryData.karmicRealms || 'Karma-Bhāra';
      const stageIndex = getStageIndexByRealm(currentRealm);
      const currentStage = cultivationStages[stageIndex] || cultivationStages[0];
      const nextStage = cultivationStages[stageIndex + 1] || null;

      const karmicXp = inventoryData.totalKarmicDebt || 0;
      const sinCount = settings.expeditions || 0;

      const corruptionEmoji = currentStage.level >= 10 
        ? '<a:flameheavenlymight:1361606122410086441>' 
        : '▓';
      const seconemoji = '░';

      const { name: expeditionrealm } = getRealmData(settings.realm);
      
      const imageBuffer = await generateCultivationImage(
        targetUser.displayAvatarURL({ extension: 'png', size: 128 })
      );
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'cultivation.png' });

      const embed = createBaseEmbed({
        interaction,
        author: {
          name: `☸ ${targetUser.globalName || targetUser.username}'s Cultivation Overview`,
          iconURL: targetUser.displayAvatarURL({ dynamic: true }),
        },
        description: [
          `**Cuurently Adventuring in**: ${expeditionrealm}`,
          `**Cultivation Title**: ${currentStage.title}`,
          `> -# *"${currentStage.description}"*\n`,
          `**Current Realm**: ${currentStage.name}`,
          `**Next Realm**: ${nextStage?.name || '—'}`,
          generateKarmaBar(currentRealm, karmicXp, corruptionEmoji, seconemoji),
          nextStage ? '' : `-# **Final Truth**: The Dao itself rejects you.`
        ].join('\n'),
        color: currentStage.level >= 10 ? 0x8b0000 : 0x4b0082,
        footer: {
          text: currentStage.level >= 10
            ? '"Karmic flames consume—there is no return."' 
            : '"Karma turns; retribution is inevitable."',
          iconURL: interaction.guild?.iconURL({ dynamic: true }) || undefined
        }
      });

      embed.setImage('attachment://cultivation.png');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('sect_hall')
          .setLabel('Sect halls')
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.editReply({
        embeds: [embed],
        components: [row],
        files: [attachment],  
      });

    } catch (err) {
      console.error(`Error in /cultivation for user ${userId}:`, err);
      const errorMessage = {
        content: '💢 *The karmic ledger is sealed—by whose hand?*',
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  },
};
