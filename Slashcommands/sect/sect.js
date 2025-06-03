const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const createBaseEmbed = require('../../utils/embed');
const { generateGitHubImageUrl } = require('../../utils/githubUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sect-welcome')
    .setDescription('Welcome a disciple to the Heavenly Samsara Sect'),

  async execute(interaction) {
    try {
      const user = interaction.user;
      const sectArrivalLines = [
        // Environmental & Vibe
        'A gust of incense-laced wind rushes past, whispering forgotten names into your ear.',
        'Somewhere deep in the bamboo groves, a spirit gongs the wrong bell... twice.',
        'The koi in the reflecting pool leap simultaneously — an omen, or just rude.',
        'The jade lions at the gate wink at you in perfect sync. You try not to blink back.',
        'A novice cultivator sprints by on fire. No one reacts. Sect business as usual.',
        'The celestial cranes overhead form the shape of your name. Then immediately spell “oops.”',
        
        // STATUE shenanigans (she’s still lingering)
        'You hear the Statue giggling inside the offering box. The box denies this.',
        'Someone has replaced the sect’s banners with haiku about cheese. You suspect the Statue.',
        
        'Guide Wen is arguing with a broom about existential debt. The broom is winning.',
        'Your reflection in the koi pond makes finger guns at you. That’s probably fine.',

        'The clouds above part briefly, revealing a celestial eye that blinks... then vanishes.',
        'Wind chimes ring with no wind. A familiar chill settles over the courtyard.',
        'A disciple whispers your name — but their mouth never moved.',
        'A training dummy bows to you. Probably unrelated to your last accident here.',
        'The lotus pond bubbles for a moment. You decide not to ask.',
        
        // Statue appearances
        'The statue’s jade eyes flash as it emerges from the shadows. "Look who clawed their way back from mediocrity."',
        '"I ran simulations of your return," the statue says. "Most ended in fire. Let’s see what this timeline gives us."',
        'The statue hovers beside you, grinning. "You’re lucky I’m still emotionally invested in your spiritual stability."',
        '"Tired already?" it asks, examining your soul like a scroll. "Shall I call the Sect Healer or your emotional support chicken?"',
        '"You’ve improved," the statue says. Then pauses. "Marginally. But I’ll log it as a miracle."',
        '"I’ve replaced the welcome banner with your last spiritual error," it says, deadpan. "Want to sign it?"',

        // Guide Wen presence
        'Guide Wen drops a scroll and panics. "That wasn’t cursed. Probably. ...Don’t open it."',
        '"Did the fan follow you again?" Wen asks nervously. It has. It’s standing right behind him.',
        '"We had a vote," Wen says. "The pagoda’s haunted now. We’re pretending it isn’t."',
        '"Don’t ask questions," Wen mutters. "And if something offers you a contract, say no twice, then run."',

        // Strange phenomena
        'You see your own shadow bow to you. That’s either a compliment or a warning.',
        'Someone has replaced the disciples’ cultivation manuals with dramatic romance novels. Again.',
        'A spirit crane flies overhead. It drops a scroll labeled "Oops".',
        'You feel a soft pressure on your shoulder. There’s nothing there. Yet.',
        'The air tastes faintly of regret and roasted chestnuts. Neither is explained.',

        // Meta / breaking tone (statue-style)
        '"You returned just as the sect’s horoscope said you would," the statue muses. "Although it also predicted frog rain and spiritual indigestion."',
        'The statue gestures at the sect hall. "That door leads to answers. And possibly an existential crisis. Flip a coin."',
        '"We kept your spot in the mess hall," the statue says. "The rumors about it being cursed are *mostly* exaggerated."',
        '"You’re back! I was just about to start a betting pool on your next disaster," the statue says, grinning.',
        '"Welcome back! I’ve been keeping your seat warm. It’s still on fire, but that’s just a sect thing."',
        
        // Guide Wen reactions
        'Guide Wen appears with a puff of glitter and shame. "I wasn’t *hiding*, I was meditating... vertically."',
        '"Back so soon?" Wen mutters, clutching a scroll labeled "Contingency for When Things Inevitably Explode (Again)".',
        '"Please tell me the feather didn’t follow you home," Wen pleads. It has. It’s doing tai chi on your shoulder.',
        'Wen bows deeply, then whispers, "...Did the pagoda eat anyone this time?"',
        
        // Misc surreal events
        'Ancestral tablets flutter open like books, showing your browser history. You slam them shut.',
        'The clouds overhead swirl into the shape of your worst decision. Everyone politely pretends not to notice.',
        'A floating whisk judges your posture. You fail.',
        'You feel watched. It’s your own shadow, giving you a thumbs-up. You are unsure why.',
      ];
      const line = sectArrivalLines[Math.floor(Math.random() * sectArrivalLines.length)];


      const embed = createBaseEmbed({
        interaction,
        title: '🪷 天命轮回宗 | Destiny’s Samsara Sect 🪷',
        description: `> **☯️ 仙路漫漫，唯道作舟**\n> *"The Dao shall be your vessel."*\n ${line}\n\n${user}, the spiritual winds stir...`,
        color: 0x8a2be2,
        image: generateGitHubImageUrl('images/realms/secthall/sectinitial.jpeg', '8e7afabadfc058ef1813cc000cb62e797100b6bf'),
        footer: {
          text: '「轮回无终，大道永恒」\n"Samsara is endless, yet the Great Dao is eternal."',
          iconURL: interaction.guild?.iconURL({ dynamic: true }) || undefined,
        },
      }).setAuthor({ name: null, iconURL: null });

      const mainActionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('work_again')
          .setLabel('Set out to Adventure')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('sect_hall')
          .setLabel('Sect halls')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('sect_show_lore')
          .setLabel('Sect Lore')
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.reply({
        content: `🀄 **${user}**, the sect elders sense your arrival. Kneel and receive their wisdom!`,
        embeds: [embed],
        components: [mainActionRow]
      });

    } catch (err) {
      console.error('🚨 Command execution failed:', err);
      if (!interaction.replied) {
        await interaction.reply({ content: '❌ Failed to welcome the disciple.', flag: 64 }).catch(() => {});
      }
    }
  }
};

