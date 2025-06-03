async function sendStorySequence(channel, lines, delay = 1500, batchSize = 1) {
  const webhookCache = Object.create(null); // Safer than literal
  const characterConfigs = {
    narrator: {
      name: 'Narrator',
      avatar: 'https://i.ibb.co/HDc9Zx23/artbreeder-image-2025-04-30-T07-43-31-650-Z.jpg',
    },
    guide_wen: {
      name: 'Guide Wen',
      avatar: 'https://i.ibb.co/Ngm30MYP/artbreeder-image-2025-04-30-T07-47-41-634-Z.jpg',
    },
   // mystic_feather: {
    //  name: 'Mystic Feather',
   //   avatar: 'https://i.ibb.co/PvcjqVRp/artbreeder-image-2025-04-30-T07-49-03-946-Z.jpg',
   // },
    bronze_cauldron: {
      name: 'Bronze Cauldron',
      avatar: 'https://i.ibb.co/Y4MPn8sY/artbreeder-image-2025-04-30-T07-49-26-155-Z.jpg',
    },
    elder: {
      name: 'The Elder',
      avatar: 'https://i.ibb.co/CsNYZ565/artbreeder-image-2025-04-30-T07-52-29-498-Z.jpg',
    },
  //  void_artifact: {
  //    name: 'Void Artifact',
  //    avatar: 'https://i.ibb.co/W4Vr0hGz/artbreeder-image-2025-04-30-T07-53-40-153-Z.jpg',
  // },
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
    for (let retries = 3; retries > 0; retries--) {
      try {
        await webhook.delete('Cleanup after sendStorySequence');
        return;
      } catch (err) {
        if (err.status === 429) {
          await sleep(err.retry_after || 3000);
        } else {
          console.warn(`Failed to delete webhook '${webhook.name}': ${err.message}`);
          return;
        }
      }
    }
  }

  async function getOrCreateWebhook(sender) {
    if (webhookCache[sender]) return webhookCache[sender];

    const config = characterConfigs[sender] || characterConfigs.narrator;
    const permissions = channel.permissionsFor(channel.guild.members.me);

    if (!permissions?.has('ManageWebhooks')) {
      throw new Error(`Missing "Manage Webhooks" permission in #${channel.name}`);
    }

    for (let retries = 3; retries > 0; retries--) {
      try {
        const existingWebhooks = await channel.fetchWebhooks();
        const webhook = existingWebhooks.find(w => w.name === config.name && w.owner?.id === channel.client.user.id);

        webhookCache[sender] = webhook || await channel.createWebhook({
          name: config.name,
          avatar: config.avatar,
          reason: `Auto-created webhook for ${config.name}`,
        });

        return webhookCache[sender];
      } catch (err) {
        if (err.status === 429) {
          console.warn(`Rate limited on webhook creation: ${err.message}`);
          await sleep(err.retry_after || 3000);
        } else {
          console.error(`Webhook creation failed: ${err.message}`);
          throw err;
        }
      }
    }

    throw new Error(`Failed to get/create webhook for "${sender}" after retries`);
  }

  try {
    const queue = [...lines];

    for (let i = 0; i < queue.length;) {
      const batch = [];
      const sender = queue[i].sender;

      while (i < queue.length && batch.length < batchSize && queue[i].sender === sender) {
        batch.push(queue[i]);
        i++;
      }

      const webhook = await getOrCreateWebhook(sender);

      for (const { text, embed } of batch) { // Add 'embed' destructuring
        try {
          await channel.sendTyping();
          await sleep(500);

          // Modified send logic to handle embeds
          const payload = {};
          if (text) payload.content = text;
          if (embed) payload.embeds = [embed]; // Wrap in array (Discord requirement)

          await webhook.send(payload);

        } catch (err) {
          console.warn(`Send failed via ${webhook.name}: ${err.message}`);
          if (err.status === 429) {
            await sleep(err.retry_after || 3000);
            try {
              await webhook.send(payload); // Retry with same payload
            } catch (retryErr) {
              console.error(`Retry failed: ${retryErr.message}`);
            }
          }
        }

        await sleep(delay);
      }
    }
  } catch (err) {
    console.error(`Error in sendStorySequence: ${err.message}`);
    throw err;
  }
}

async function sendWithMeditation(interaction, content) {
  try {
    await interaction.channel.sendTyping();
    await new Promise(res => setTimeout(res, 10)); // Simulated "typing"
    
    if (interaction.replied || interaction.deferred) {
      return await interaction.followUp(content);
    } else {
      return await interaction.reply(content);
    }
  } catch (err) {
    console.error(`Failed to send interaction message: ${err.message}`);
    throw err;
  }
}

module.exports = { sendStorySequence, sendWithMeditation };
