const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const SectRod = require('../models/Equipment/sectrod');
const { getStoryLinesForRod, getStoryLinesForRodtragedy, getStoryLinesForRodhall, getStoryLinesForRodpagoda } = require('../data/rodstart');
const { WebhookClient } = require('discord.js');
// Heavenly phenomena descriptions
const celestialEvents = [
  '九天雷劫降临! (Nine Heavens Thunder Tribulation descends!)',
  '虚空裂缝吞噬万物! (Void rift devours all creation!)',
  '上古凶兽饕餮现世! (Ancient ferocious beast Taotie emerges!)',
  '阴阳逆转，乾坤倒悬! (Yin-Yang reverses, Heaven-Earth inverts!)',
  '因果轮回，法宝蒙尘! (Karmic cycle turns, treasure loses luster!)'
];

// Daoist wisdom proverbs
const daoWisdom = [
  '道法自然，天人合一 (The Dao follows nature, heaven and man unite as one)',
  '宝剑锋从磨砺出 (A treasured sword\'s edge comes from grinding)',
  '不积跬步，无以至千里 (Without accumulating single steps, one cannot reach a thousand miles)',
  '静水流深 (Still waters run deep)',
  '逆水行舟，不进则退 (Sailing against the current - advance or retreat)',
  '一粒金丹吞入腹，我命由我不由天 (A golden pill swallowed - my fate is mine, not heaven\'s)'
];

// Utility functions
function getRandomCelestialEvent() {
  return celestialEvents[Math.floor(Math.random() * celestialEvents.length)];
}

function getRandomDaoWisdom() {
  return daoWisdom[Math.floor(Math.random() * daoWisdom.length)];
}

// Cultivation typing delay (simulates meditation)
async function sendWithMeditation(interaction, content) {
    await interaction.channel.sendTyping();
    await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5s meditation delay
    
    if (interaction.replied || interaction.deferred) {
      return await interaction.followUp(content); // <--- return the message
    } else {
      return await interaction.reply(content); // <--- return the message
    }
  }
    
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('daorod')
      .setDescription('开启你的本命法宝之旅 (Begin your journey to obtain your Destiny Rod)'),
    stage: 'beta',
  
    async execute(interaction) {
      const userId = interaction.user.id;
  
      const storyChoiceEmbed = new EmbedBuilder()
        .setTitle('Choose Your Path')
        .setDescription(
          'Would you like to experience the full story or skip directly to the results?\n\n' +
          '> "故事是修行的一部分 (The story is part of the cultivation)"\n\n' +
          'Choose wisely, young cultivator.'
        )
        .setColor(0x4682B4)
        .setFooter({ text: 'The Dao is vast, but your choice shapes your journey' });
  
      const choiceButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('story_experience')
          .setLabel('Experience the Story')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('📖'),
        new ButtonBuilder()
          .setCustomId('skip_story')
          .setLabel('Skip the Story')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('⏩')
      );
  
      await sendWithMeditation(interaction, { embeds: [storyChoiceEmbed], components: [choiceButtons] });
  
      const collector = interaction.channel.createMessageComponentCollector({
        componentType: 2,
        time: 30000,
        filter: i => i.user.id === userId && ['story_experience', 'skip_story'].includes(i.customId)
      });
  
      const disableStoryButtons = () =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('story_experience')
            .setLabel('Experience the Story')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📖')
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('skip_story')
            .setLabel('Skip the Story')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⏩')
            .setDisabled(true)
        );
  
      collector.on('collect', async i => {
        await i.deferUpdate();
        await interaction.editReply({ components: [disableStoryButtons()] });
  
        if (i.customId === 'story_experience') {
          const welcomeEmbed = new EmbedBuilder()
            .setTitle('Investiture of the Daoist Rod')
            .setDescription(
              'It seems you don\'t have a destined magical item yet...\n\n' +
              '> "有缘人，既入我门来，当寻己道"\n' +
              '> "Young one, since you\'ve entered our sect, you must find your own path"\n\n' +
              'Come, let us visit the Treasure Pavilion to choose your first magical instrument!\n'
            )
            .setColor(0x8B4513)
            .setFooter({ text: 'The Great Dao has three thousand paths - each must choose their own' });
  
          const startButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('daorod_begin')
              .setLabel('(Follow the guide to the treasure pavilion)')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('<a:secttalisman:776075134087462942> ')
          );
  
          const welcomemessage = await sendWithMeditation(interaction, { embeds: [welcomeEmbed], components: [startButton] });

          
  
          const storyCollector = interaction.channel.createMessageComponentCollector({
            componentType: 2,
            time: 30000,
            filter: i => i.user.id === userId && i.customId === 'daorod_begin'
          });
  
          const disableStartButton = () =>
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('daorod_begin')
                .setLabel('(Follow the guide to the treasure pavilion)')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<a:secttalisman:776075134087462942> ')
                .setDisabled(true)
            );
  
          storyCollector.on('collect', async i => {
            await i.deferUpdate();
            await welcomemessage.edit({ components: [disableStartButton()] });
            await showElderIntro(interaction, userId);
            storyCollector.stop();
          });
  
          storyCollector.on('end', async collected => {
            if (collected.size === 0) {
              await welcomemessage.edit({ components: [disableStartButton()] });
              await interaction.followUp({
                content: 'Erm... You seem to be lost in thoughts disciple... **Your guide looks around awkwardly**',
              });
            }
          });
        } else if (i.customId === 'skip_story') {
          
          const finalrodembed = new EmbedBuilder()
          .setTitle('DaoRod received!')
          .setDescription(
            `+1 basic daorod\n\n`
          )
          await interaction.followUp({
            embeds: [finalrodembed], 
            content: 'You have chosen to skip the story. Your Daoist Rod is ready!',
                   });
        }
  
        collector.stop(); // Ensure only one path runs
      });
  
      collector.on('end', async collected => {
        if (collected.size === 0) {
          await interaction.editReply({ components: [disableStoryButtons()] });
          await interaction.followUp({
            content: 'It seems you have not made a choice. The Dao is patient, but time waits for no one.',
          });
        }
      });
    }
  };
  

async function showElderIntro(interaction, userId) {
    // Step 2: Elder's Guidance
    const elderEmbed = new EmbedBuilder()
        .setTitle('The Gates of the Treasure Pavilion opens wide!')
        .setDescription(
            '> "此四宝皆非凡品，择一而持，可窥天道"\n' +
            '> "These four treasures are all extraordinary - choose one to glimpse the Heavenly Dao"\n\n' +
            '**(Choose your Destiny)**\n' +
            '• 离火神鞭 (Li Fire Divine Lash)\n' +
            '• 月华扇 (Moonlight Fan)\n' +
            '• 炼魂鼎 (Lao Zhu\'s Cauldron)\n' +
            '• 虚空靴 (Voidstrider Boots)' +
                '\n\n' +
            '(Each choice will shape your cultivation path)'
        )
        .setColor(0x4B0082) // Imperial purple
        .setFooter({ text: '(Treasures have spirits - they choose their masters)' });

    const rodChoices = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('daorod_flame')
            .setLabel('离火神鞭 (Li Fire Divine Lash)')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔥'),
        new ButtonBuilder()
            .setCustomId('daorod_water')
            .setLabel('月华扇 (Moonlight Fan)')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('💧'),
        new ButtonBuilder()
            .setCustomId('daorod_wind')
            .setLabel('炼魂鼎 (Lao Zhu\'s Cauldron)')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🌪️'),
        new ButtonBuilder()
            .setCustomId('daorod_void')
            .setLabel('虚空靴 (Voidstrider Boots)')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🌌')
    );

    const elderMessage = await sendWithMeditation(interaction, { embeds: [elderEmbed], components: [rodChoices] });

    const collector = interaction.channel.createMessageComponentCollector({
        componentType: 2,
        time: 45000, 
        filter: i => i.user.id === userId && ['daorod_flame', 'daorod_water', 'daorod_wind', 'daorod_void'].includes(i.customId)
    });

    collector.on('collect', async i => {
        await i.deferUpdate();
        const selectedRod = i.customId;
        const rodName = getRodName(i.customId);

      await elderMessage.edit({ components: [] });
      await celebrateRodSelection(interaction, rodName, selectedRod, userId);
        collector.stop();
    });

    collector.on('end', async collected => {
        if (collected.size === 0) {
            // Disable the buttons to prevent further interaction
            const disabledRodChoices = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('daorod_flame')
                    .setLabel('离火神鞭 (Li Fire Divine Lash)')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔥')
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('daorod_water')
                    .setLabel('月华扇 (Moonlight Fan)')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('💧')
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('daorod_wind')
                    .setLabel('炼魂鼎 (Lao Zhu\'s Cauldron)')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🌪️')
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('daorod_void')
                    .setLabel('虚空靴 (Voidstrider Boots)')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🌌')
                    .setDisabled(true)
            );

            await elderMessage.edit({ components: [disabledRodChoices] });

            await interaction.followUp({ 
                content: 'I understand you are mesmerized by the treasures, but you must choose one in time!', 
            });
        }
    });
}

function getRodName(customId) {
  const rods = {
    'daorod_flame': '离火神鞭 (Li Fire Divine Lash)',
    'daorod_water': '月华扇 (Moonlight Fan)',
    'daorod_wind': '炼魂鼎 (Lao Zhu\'s Cauldron)',
    'daorod_void': '虚空靴 (Voidstrider Boots)'
  };
  return rods[customId] || '无名法宝 (Nameless Treasure)';
}



async function sendStorySequence(channel, lines, delay = 1500, batchSize = 1) {
  const webhookCache = {};

  const characterConfigs = {
    narrator: {
      name: 'Narrator',
      avatar: 'https://i.ibb.co/HDc9Zx23/artbreeder-image-2025-04-30-T07-43-31-650-Z.jpg',
    },
    guide_wen: {
      name: 'Guide Wen',
      avatar: 'https://i.ibb.co/Ngm30MYP/artbreeder-image-2025-04-30-T07-47-41-634-Z.jpg',
    },
    mystic_feather: {
      name: 'Mystic Feather',
      avatar: 'https://i.ibb.co/PvcjqVRp/artbreeder-image-2025-04-30-T07-49-03-946-Z.jpg',
    },
    bronze_cauldron: {
      name: 'Bronze Cauldron',
      avatar: 'https://i.ibb.co/Y4MPn8sY/artbreeder-image-2025-04-30-T07-49-26-155-Z.jpg',
    },
    elder: {
      name: 'The Elder',
      avatar: 'https://i.ibb.co/CsNYZ565/artbreeder-image-2025-04-30-T07-52-29-498-Z.jpg',
    },
    void_artifact: {
      name: 'Void Artifact',
      avatar: 'https://i.ibb.co/W4Vr0hGz/artbreeder-image-2025-04-30-T07-53-40-153-Z.jpg',
    },
    corrupted_cauldron: {
      name: 'Corrupted Cauldron',
      avatar: 'https://i.ibb.co/Fb0vbKX2/artbreeder-image-2025-04-30-T07-54-21-034-Z.jpg',
    },
    moonlight_fan: {
      name: 'Moonlight Fan',
      avatar: 'https://i.ibb.co/ZRhYY0Z6/artbreeder-image-2025-04-30-T07-56-30-257-Z.jpg',
    },
    drowned_goddess: {
      name: 'Drowned Goddess',
      avatar: 'https://i.ibb.co/WNGtVV5f/artbreeder-image-2025-04-30-T07-57-32-217-Z.jpg',
    },
    flame_artifact: {
      name: 'Divine LI Lash',
      avatar: 'https://i.ibb.co/4RdKTpmm/artbreeder-image-2025-04-30-T07-59-40-969-Z.jpg',
    },
    player: {
      name: 'You',
      avatar: 'https://i.ibb.co/8nYQ2GD1/artbreeder-image-2025-04-30-T08-00-50-585-Z.jpg',
    },
    statue: {
      name: 'Ancient Jade Statue',
      avatar: 'https://i.ibb.co/SDRhpw0Y/artbreeder-image-2025-04-30-T08-01-54-905-Z.jpg',
    },
  };
  

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  async function safeWebhookDelete(webhook) {
    let retries = 3;
    while (retries--) {
      try {
        await webhook.delete('Cleanup after sendStorySequence');
        return;
      } catch (err) {
        if (err.status === 429) {
          const retryAfter = err.retry_after || 3000;
          console.warn(`Rate limited on delete: waiting ${retryAfter}ms`);
          await sleep(retryAfter);
        } else {
          console.warn(`Failed to delete webhook ${webhook.name}: ${err.message}`);
          return;
        }
      }
    }
  }

  async function getOrCreateWebhook(characterKey) {
    if (webhookCache[characterKey]) return webhookCache[characterKey];

    const config = characterConfigs[characterKey] || characterConfigs['narrator'];

    // Permission check
    const permissions = channel.permissionsFor(channel.guild.members.me);
    if (!permissions.has('ManageWebhooks')) {
      throw new Error(`Missing Manage Webhooks permission in #${channel.name}`);
    }

    let retries = 3;
    while (retries--) {
      try {
        const webhooks = await channel.fetchWebhooks();
        let webhook = webhooks.find(w => w.name === config.name && w.owner?.id === channel.client.user.id);

        if (!webhook) {
          webhook = await channel.createWebhook({
            name: config.name,
            avatar: config.avatar,
            reason: `Auto-created webhook for ${config.name}`,
          });
        }

        webhookCache[characterKey] = webhook;
        return webhook;
      } catch (err) {
        if (err.status === 429) {
          const retryAfter = err.retry_after || 3000;
          console.warn(`Rate limited on webhook creation: waiting ${retryAfter}ms`);
          await sleep(retryAfter);
        } else {
          throw err;
        }
      }
    }

    throw new Error(`Failed to create or fetch webhook for ${characterKey} after retries`);
  }

  try {
    let grouped = [];
    let currentSender = null;

for (const { sender, text } of lines) {
  if (sender === currentSender) {
    grouped[grouped.length - 1].text += '\n' + text;
  } else {
    grouped.push({ sender, text });
    currentSender = sender;
  }
}

// Send in batches (e.g., 5 grouped messages at a time)
// No grouping — keep each line as-is
const queue = [...lines];

// Batch processing
let i = 0;
while (i < queue.length) {
  const batch = [];
  const startSender = queue[i].sender;

  // Collect up to `batchSize` messages from the same sender
  while (i < queue.length && batch.length < batchSize && queue[i].sender === startSender) {
    batch.push(queue[i]);
    i++;
  }

  // Send each message in the batch
  const webhook = await getOrCreateWebhook(startSender);
  for (const { text } of batch) {
    await channel.sendTyping();
    await sleep(500);

    try {
      await webhook.send({ content: text });
    } catch (err) {
      console.warn(`Failed to send message via ${webhook.name}:`, err.message);
      if (err.status === 429) {
        const retryAfter = err.retry_after || 3000;
        await sleep(retryAfter);
        await webhook.send({ content: text }); // retry once
      }
    }

    await sleep(delay);
  }
}


  } finally {
    for (const webhook of Object.values(webhookCache)) {
      await safeWebhookDelete(webhook);
    }
  }
}





async function celebrateRodSelection(interaction, rodName, selectedRod, userId) {
  const rodId = selectedRod;
  const storyLines = getStoryLinesForRod(rodId);
  await sendStorySequence(interaction.channel, storyLines);
  
  const congratsEmbed = new EmbedBuilder()
    .setTitle('Destiny Acknowledged - Your Chosen Treasure!')
    .setDescription(
      `**${rodName}** resonates with your qi, sealing your bond!\n\n` +
      '> "法宝既认主，当勤加修炼"\n' +
      '> "Now bound, you must walk the path of refinement"\n\n' +
      'The natural energies of heaven and earth converge upon you'
    )
    .setColor(0xFFD700) // Gold

  await sendWithMeditation(interaction, { embeds: [congratsEmbed] });

  await new Promise(resolve => setTimeout(resolve, 6000));

  const storyLines2 = getStoryLinesForRodtragedy(rodId);
  await sendStorySequence(interaction.channel, storyLines2);

  // Step 4: Heavenly Tribulation
  await new Promise(resolve => setTimeout(resolve, 6000)); // Longer dramatic pause for cultivation atmosphere

  const tribulationEmbed = new EmbedBuilder()
    .setTitle(getRandomCelestialEvent())
    .setDescription(
      `Your **${rodName}** has vanished amidst the heavenly upheaval!\n\n` +
      `> "福兮祸所伏，祸兮福所倚"\n` +
      `> "Good fortune lies within disaster, disaster lurks within good fortune"\n\n` +
      'A single emerald feather drifts where your artifact once rested, pulsing with latent energy.\n' +
      'Seek your sect guide immediately - this omen demands interpretation.'
    )
    .setColor(0x8B0000) // Dark red
    .setFooter({ text: 'The heavens give and take in equal measure' });

    const backtoguideButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('daorod_backtoguide')
        .setLabel('(Step back into the sect halls)')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('<a:secttalisman:776075134087462942> ')
    );

  const tribulationmessage = await sendWithMeditation(interaction, { embeds: [tribulationEmbed], components: [backtoguideButton] });

  const collector = interaction.channel.createMessageComponentCollector({
    componentType: 2,
    time: 30000, // 30 seconds to respond
    // Filter to only collect interactions from the user who initiated the command and clicked the correct button
    filter: i => i.user.id === userId && i.customId === 'daorod_backtoguide'
  });

  const storyLines3 = getStoryLinesForRodhall(rodId);

  collector.on('collect', async i => {
    if (i.customId === 'daorod_backtoguide') {
      await i.deferUpdate();
      const disabledButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('daorod_backtoguide')
          .setLabel('(Step back into the sect halls)')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('<a:secttalisman:776075134087462942> ')
          .setDisabled(true)
      );

      await tribulationmessage.edit({
        components: [disabledButton]
      });
      
      await sendStorySequence(interaction.channel, storyLines3, batchSize = 4);
      await new Promise(resolve => setTimeout(resolve, 6000));
      await inthehall(interaction, userId, rodId);

      // Disable the button after it's clicked
      collector.stop();
    }
  });

  collector.on('end', async collected => {
    if (collected.size === 0) {
      // Disable the button to prevent further interaction
      const disabledButton2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('daorod_backtoguide')
          .setLabel('(Step back into the sect halls)')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('<a:secttalisman:776075134087462942> ')
          .setDisabled(true)
      );

      await tribulationmessage.edit({
        components: [disabledButton2]
      });

      await interaction.followUp({ 
        content: 'Erm... You seem to be lost in thoughts disciple...',
      });
    }
  });

  let rod = await SectRod.findOne({ userId });

    if (!rod) {
        await SectRod.create({
    userId,
   augments: [
      { slotType: 'element' },
      { slotType: 'reel' },
      { slotType: 'line' },
      { slotType: 'sigil' },
      { slotType: 'focus' },
      { slotType: 'handle' },
      { slotType: 'misc' }
    ]
    });

    
    } 
   // Step 5: Actually Create Basic Rod

}


async function inthehall(interaction, userId, rodId) {  
  const wisdomEmbed = new EmbedBuilder()
    .setTitle('The Mystery Deepens')
    .setDescription(
      `${getRandomDaoWisdom()}\n\n` +
      'The situation is growing out of control\n',
    )
    .setColor(0x00BFFF) // Deep sky blue
    .setFooter({ text: '千里之行，始于足下 (A thousand-mile journey begins with a single step)' });

  const dangerisneighButton = new ButtonBuilder()
    .setCustomId('dangerisneigh')
    .setLabel('Danger is near')
    .setStyle(ButtonStyle.Primary);

  const dangerisneighRow = new ActionRowBuilder().addComponents(dangerisneighButton);

  const wisdommessage = await sendWithMeditation(interaction, { embeds: [wisdomEmbed], components: [dangerisneighRow] });

  const collector = interaction.channel.createMessageComponentCollector({
    filter: (i) => i.user.id === userId,
    time: 300000, //5 minute
  });

  const storyLines4 = getStoryLinesForRodpagoda(rodId);

  const finalembed = new EmbedBuilder()
    .setTitle('DANGER')
    .setDescription(
      `DANGER DANGER DANGER DANGER\n\n` +
      'The situation is growing out of control\n',
      `ESCAPE IS NOT AN OPTION\n` +
      `DANGER DANGER \n`
    )
    .setColor(0x00BFFF) // Deep sky blue
    .setFooter({ text:'THIS IS BAD' });

  const finalrodembed = new EmbedBuilder()
    .setTitle('DaoRod received!')
    .setDescription(
      `+1 basic daorod\n\n`
    )

  collector.on('collect', async (i) => {
    if (i.customId === 'dangerisneigh') {
      await i.deferUpdate();
      await wisdommessage.edit({ components: [] });
      // Call the function to handle the next step in the story
      await sendStorySequence(interaction.channel, storyLines4, batchSize = 4)
      await new Promise(resolve => setTimeout(resolve, 6000));
      await interaction.channel.send({ embeds: [finalembed] });
      await new Promise(resolve => setTimeout(resolve, 3000));
      await sendStorySequence(interaction.channel, storyLines5, batchSize = 4)
      collector.stop(); // Stop the collector after the button is clicked
    }
  });

  collector.on('end', async (collected) => {
    if (collected.size === 0) {
      await i.deferUpdate();
      await wisdommessage.edit({ components: [] });
      await sendStorySequence(interaction.channel, storyLines4, batchSize = 4)
      await new Promise(resolve => setTimeout(resolve, 6000));
      await interaction.channel.send({ embeds: [finalembed] });
      await new Promise(resolve => setTimeout(resolve, 3000));
      await sendStorySequence(interaction.channel, storyLines5, batchSize = 4)
      await interaction.channel.send({ embeds: [finalrodembed] });
    }
  });

const storyLines5 = [
  { sender: 'statue', text: 'The STATUE looms over you,' },
  { sender: 'statue', text: '"OH GOOD," it booms in a voice that tastes like stolen birthday cake, "YOU\'RE ALREADY IN DEBT."' },

  { sender: 'narrator', text: 'Before you protest:' },
  { sender: 'narrator', text: '- Your shadow signs a contract with flourish' },
  { sender: 'narrator', text: '- Your left pinky auto-detaches to stamp the seal' },
  { sender: 'narrator', text: '- The emerald feather turns into a notary public and whistles innocently' },

  { sender: 'statue', text: '"TERMS!" The STATUE declares, producing:' },
  { sender: 'narrator', text: 'A fishing rod carved from a thunder god\'s rib,' },
  { sender: 'narrator', text: 'line spun from the silk of murdered dreams,' },
  { sender: 'narrator', text: 'and bait worms that scream motivational quotes.' },

  { sender: 'statue', text: '"SOULFISHING DUTIES INCLUDE:"' },
  { sender: 'statue', text: '1. Catching at least three (3) existential dread carps per lunar cycle' },
  { sender: 'statue', text: '2. Not asking why the STATUE needs them ("DECORATIVE PURPOSES")' },
  { sender: 'statue', text: '3. Pretending you don’t see it cheating at poker with your ancestors' },

  { sender: 'narrator', text: 'Guide Wen tries to object. The STATUE snaps its fingers (which may or may not exist).' },
  { sender: 'statue', text: 'Wen’s mouth stitches itself shut with ghost thread. "SILENCE, DISCOUNT HENCHMAN."' },

  { sender: 'statue', text: 'Your "benefits":' },
  { sender: 'statue', text: '- Unlimited Sect access (STATUE may "borrow" your memories as collateral)' },
  { sender: 'statue', text: '- A 10% "not being dissolved into abstract art" discount' },
  { sender: 'statue', text: '- The creeping realization this was always the plan' },

  { sender: 'narrator', text: 'The STATUE tosses you the rod. It lands with perfect dramatic timing…' },
  { sender: 'narrator', text: '…then immediately grows teeth and bites your sleeve.' },
  { sender: 'statue', text: '"START TODAY," it whispers from inside your left ear, "YOUR FIRST CATCH IS ALREADY LATE."' },

  { sender: 'narrator', text: 'As the STATUE dissolves into a cloud of suspicious confetti,' },
  { sender: 'narrator', text: 'you hear it add:' },
  { sender: 'statue', text: '"P.S. IF YOU DROWN, YOUR CORPSE BECOMES A FISHING BUOY. HAVE FUN~"' },
]



}