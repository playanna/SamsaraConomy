// Xianxia creatures organized by realm difficulty
module.exports = {
    verdant: [
        {
            id: 'spirit_fox',
            name: 'Young Spirit Fox',
            level: 1,
            health: 120,
            attack: 15,
            defense: 8,
            speed: 25,
            element: 'wind',
            description: 'A cunning fox spirit with barely a century of cultivation. Its amber eyes gleam with nascent intelligence.',
            abilities: ['wind_slash', 'illusion_step'],
            rewards: {
                xp: 25,
                coins: 15,        items: [
                    { name: 'Spirit Fox Tail', chance: 0.6 },
                    { name: 'Wind Essence Crystal', chance: 0.2 }
                ]
            },
            flavor: {
                intro: 'A silver-furred fox emerges from the misty bamboo, its three tails swaying hypnotically...',
                defeat: 'The spirit fox dissolves into motes of spiritual light, leaving behind whispers of ancient wisdom.',
                escape: 'With a mocking yip, the fox spirit vanishes into an illusion of dancing leaves.'
            }
        },
        {
            id: 'jade_serpent',
            name: 'Jade Scale Serpent',
            level: 2,
            health: 180,
            attack: 20,
            defense: 12,
            speed: 18,
            element: 'earth',
            description: 'An ancient serpent whose scales have crystallized into precious jade over millennia.',
            abilities: ['earth_spike', 'jade_armor', 'poison_fang'],
            rewards: {
                xp: 40,
                coins: 25,        items: [
                    { name: 'Jade Scale', chance: 0.5 },
                    { name: 'Serpent Venom Sac', chance: 0.15 }
                ]
            },
            flavor: {
                intro: 'Coiled around an ancient spirit tree, a massive serpent regards you with emerald eyes older than dynasties...',
                defeat: 'The great serpent\'s form crumbles to jade dust, its essence returning to the earth.',
                escape: 'The serpent burrows deep into the earth, its passing marked only by trembling roots.'
            }
        }
    ],
    
    moon: [
        {
            id: 'lunar_wolf',
            name: 'Moonlight Wolf',
            level: 4,
            health: 280,
            attack: 35,
            defense: 18,
            speed: 30,
            element: 'lunar',
            description: 'A spectral wolf that feeds on moonbeams and forgotten dreams.',
            abilities: ['lunar_howl', 'shadow_bite', 'moon_step'],
            rewards: {
                xp: 80,
                coins: 45,        items: [
                    { name: 'Moonlit Fur', chance: 0.4 },
                    { name: 'Lunar Fragment', chance: 0.25 }
                ]
            },
            flavor: {
                intro: 'Under the fractured moon\'s gaze, a translucent wolf materializes from silver mist...',
                defeat: 'The lunar wolf\'s form disperses like morning fog, its howl echoing across dimensions.',
                escape: 'The wolf bounds away on rays of moonlight, leaving only paw prints of starlight.'
            }
        },
        {
            id: 'void_wraith',
            name: 'Shattered Void Wraith',
            level: 5,
            health: 220,
            attack: 42,
            defense: 8,
            speed: 45,
            element: 'void',
            description: 'A tormented soul trapped between the moon fragments, feeding on spatial tears.',
            abilities: ['void_rend', 'phase_shift', 'despair_wail'],
            rewards: {
                xp: 120,
                coins: 60,        items: [
                    { name: 'Wraith Essence', chance: 0.3 },
                    { name: 'Void Shard', chance: 0.1 }
                ]
            },
            flavor: {
                intro: 'Reality tears open as a being of pure anguish claws its way from the void between worlds...',
                defeat: 'The wraith\'s screams fade to silence as it finally finds peace in dissolution.',
                escape: 'The wraith tears open a dimensional rift and vanishes, its laughter echoing from nowhere.'
            }
        }
    ],
    
    crimson: [
        {
            id: 'flame_dragon',
            name: 'Crimson Flame Dragon',
            level: 8,
            health: 500,
            attack: 65,
            defense: 35,
            speed: 22,
            element: 'fire',
            description: 'A young dragon whose breath can melt mountains and whose roar shakes the heavens.',
            abilities: ['dragon_breath', 'flame_coil', 'molten_scales', 'sky_soar'],
            rewards: {
                xp: 250,
                coins: 150,        items: [
                    { name: 'Dragon Scale', chance: 0.4 },
                    { name: 'Fire Dragon Core', chance: 0.05 },
                    { name: 'Molten Blood', chance: 0.6 }
                ]
            },
            flavor: {
                intro: 'The ground trembles as a magnificent crimson dragon descends from volcanic peaks, its eyes burning like twin suns...',
                defeat: 'The dragon\'s roar becomes a whisper as it acknowledges your strength, fading into embers.',
                escape: 'With a thunderous roar that splits the sky, the dragon soars away on wings of living flame.'
            }
        },
        {
            id: 'lava_golem',
            name: 'Primordial Lava Golem',
            level: 7,
            health: 600,
            attack: 50,
            defense: 60,
            speed: 8,
            element: 'earth-fire',
            description: 'An ancient construct born from the planet\'s molten core, infused with primordial fire qi.',
            abilities: ['molten_punch', 'earthquake_stomp', 'lava_spray', 'stone_armor'],
            rewards: {
                xp: 200,
                coins: 120,        items: [
                    { name: 'Primordial Stone', chance: 0.5 },
                    { name: 'Lava Core', chance: 0.2 },
                    { name: 'Earth Fire Crystal', chance: 0.08 }
                ]
            },
            flavor: {
                intro: 'The mountain itself seems to rise as a towering golem of molten rock emerges from the volcanic depths...',
                defeat: 'The golem crumbles back to stone and ash, its ancient duty finally fulfilled.',
                escape: 'The golem sinks back into the earth with a rumbling that will be felt for days.'
            }
        }
    ],
    
    abyssal: [
        {
            id: 'ghost_emperor',
            name: 'Drowned Ghost Emperor',
            level: 12,
            health: 800,
            attack: 80,
            defense: 45,
            speed: 35,
            element: 'water-death',
            description: 'The fallen ruler of an underwater kingdom, commanding legions of the drowned.',
            abilities: ['tidal_command', 'soul_drain', 'ghostly_legion', 'abyssal_current'],
            rewards: {
                xp: 400,
                coins: 300,        items: [
                    { name: 'Imperial Ghost Crown', chance: 0.15 },
                    { name: 'Abyssal Pearl', chance: 0.3 },
                    { name: 'Drowned Soul', chance: 0.7 }
                ]
            },
            flavor: {
                intro: 'From the depths of the ghost sea rises a magnificent specter wearing a crown of coral and despair...',
                defeat: 'The Ghost Emperor bows deeply before dissolving into peaceful mist, his reign finally ended.',
                escape: 'The Emperor retreats into the ocean depths, his hollow laughter echoing across the waves.'
            }
        }
    ],
    
    chains: [
        {
            id: 'chained_god',
            name: 'Chained Fallen God',
            level: 15,
            health: 1200,
            attack: 120,
            defense: 80,
            speed: 25,
            element: 'divine-dark',
            description: 'A once-mighty deity bound by celestial chains, driven mad by eons of imprisonment.',
            abilities: ['divine_wrath', 'chain_lash', 'fallen_blessing', 'godly_domain'],
            rewards: {
                xp: 800,
                coins: 600,        items: [
                    { name: 'Divine Chain Link', chance: 0.25 },
                    { name: 'Fallen Divinity Shard', chance: 0.03 },
                    { name: 'Celestial Tears', chance: 0.4 }
                ]
            },
            flavor: {
                intro: 'The very air screams as celestial chains rattle, and a bound god fixes you with eyes like dying stars...',
                defeat: 'The fallen god\'s chains shatter as it achieves a moment of clarity, thanking you before ascending.',
                escape: 'The god\'s mad laughter shakes reality as it sinks back into its eternal prison.'
            }
        }
    ]
};
