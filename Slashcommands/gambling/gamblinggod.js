const { SlashCommandBuilder } = require('discord.js');
const Loss = require('../../models/balance/loss');
const Treasury = require('../../models/balance/treasury');
const cron = require('node-cron');
const {emojis} = require('../../data/emojis');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const client = require('../../client'); // Adjust this path if needed

// Load .env
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const GUILD_ID = process.env.GUILD_ID;
const CHANNEL_ID = process.env.GAMBLING_GOD_CHANNEL_ID;

// Shared update logic
async function updateGamblingGod(guild) {
  try {
    const topLoser = await Loss.findOne().sort({ totalLoss: -1 });
    if (!topLoser) {
      console.log('[GamblingGod Update] No users found in the Loss database.');
      return '⚠️ No users found in the Loss database.';
    }

    await Treasury.findOneAndUpdate(
      { name: 'SECT_TREASURY' },
      {
        $set: {
          GamblingGod: topLoser.userId,
          GamblingGodLastupdate: new Date(),
        },
      },
      { new: true, upsert: true }
    );

    const roleName = 'Dog of Gambling';
    let role = guild.roles.cache.find(r => r.name === roleName);
    if (!role) {
      role = await guild.roles.create({
        name: roleName,
        color: '#FFD700',
        reason: 'Auto-created Gambling God role',
      });
    }

    for (const [_, member] of role.members) {
      await member.roles.remove(role);
    }

    const member = await guild.members.fetch(topLoser.userId);
    if (member) {
      await member.roles.add(role);
    }

    await Loss.deleteMany({});

    const message = `👑 <@${topLoser.userId}> is now the **Gambling God** for the week with ${topLoser.totalLoss} ${emojis.heavenlyorbs} gambled into oblivion!\n` +
                    `Their title has been granted, and the competition has been reset. 🔄`;

    console.log(`[GamblingGod Update] ${message}`);
    return message;
  } catch (err) {
    console.error('[GamblingGod Update] Failed:', err);
    return '❌ Failed to update Gambling God.';
  }
}

// Scheduled job: every Saturday at midnight UTC (adjusted for testing to every 5 minutes)
cron.schedule('0 0 * * 6', async () => {
  try {
    if (!GUILD_ID || !CHANNEL_ID) {
      console.error('[Cron Job] Missing GUILD_ID or GAMBLING_GOD_CHANNEL_ID in .env.');
      return;
    }

    const guild = await client.guilds.fetch(GUILD_ID);
    const channel = await guild.channels.fetch(CHANNEL_ID);

    if (!guild || !channel || !channel.isTextBased()) {
      console.warn('[Cron Job] Guild or channel not found or invalid.');
      return;
    }

    console.log('[Cron Job] Running scheduled Gambling God update...');
    const resultMessage = await updateGamblingGod(guild);

    if (resultMessage) {
      await channel.send(resultMessage);
    }
  } catch (err) {
    console.error('[Cron Job] Failed to update Gambling God:', err);
  }
}, {
  timezone: "UTC"
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName('updategamblinggod')
    .setDescription('gamba god.'),
  stage: 'beta',

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
    } catch (deferError) {
      console.error('Failed to defer reply:', deferError);
      return;
    }

    try {
      const message = await updateGamblingGod(interaction.guild);
      return interaction.editReply(message);
    } catch (err) {
      console.error('Error executing updategamblinggod:', err);
      try {
        return interaction.editReply('❌ An error occurred while updating the Gambling God.');
      } catch (replyError) {
        console.error('Failed to edit reply:', replyError);
      }
    }
  }
};
