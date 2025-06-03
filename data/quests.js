module.exports = {
  verdant: [
    {
      id: 'verdant_ash_gather', // Unique identifier
      name: 'Gather 10 ashes',
      description: 'Collect 10 ashes from the Verdant Realm.',
      difficulty: 'Easy',
      duration: '30 minutes',
      objectives: [
        {
          description: 'Collect Whispering Herbs',
          targetCount: 10,
          itemId: 'UNCOMMON_Mundane_Spirit_Ash'
        }
      ],
      rewards: {
        gold: 50,
        xp: 100,
      }
    },
    {
      id: 'verdant_wolf_hunt',
      name: 'Collect Souls Spark',
      description: 'Hunt down and collect the souls of 5 Forest Wolves.',
      difficulty: 'Medium',
      duration: '1 hour',
      objectives: [
        {
          description: 'Defeat Forest Wolf',
          targetCount: 1,
          itemId: 'COMMON_Flickering_Soul_Spark' // Optional drop
        }
      ],
      rewards: {
        gold: 150,
        xp: 250,
      }
    }
  ],
  Desert: [
    {
      id: 'desert_oasis_search',
      name: 'Find the Hidden Oasis',
      description: 'Locate the secret oasis hidden deep within the sands.',
      difficulty: 'Medium',
      duration: '2 hours',
      objectives: [
        {
          description: 'Explore desert regions',
          targetCount: 5 // Number of locations to search
        }
      ],
      rewards: {
        gold: 200,
        xp: 150
        // No items or reputation specified
      }
    },
    {
      id: 'desert_wyrm_slayer',
      name: 'Defeat the Sand Wyrm',
      description: 'Challenge and defeat the mighty Sand Wyrm.',
      difficulty: 'Hard',
      duration: '3 hours',
      objectives: [
        {
          description: 'Defeat Sand Wyrm',
          targetCount: 1
        },
        {
          description: 'Collect Wyrm Scales',
          targetCount: 5,
          itemId: 'wyrm_scale'
        }
      ],
      rewards: {
        gold: 500,
        xp: 750,
        items: [
          { itemId: 'wyrmbone_amulet', quantity: 1 }
        ],
        reputation: 25
      }
    }
  ],
  Default: [
    {
      id: 'default_welcome',
      name: 'Welcome Quest',
      description: 'Begin your adventure by completing this simple quest!',
      difficulty: 'Easy',
      duration: '15 minutes',
      objectives: [
        {
          description: 'Talk to the Quest Giver',
          targetCount: 1
        }
      ],
      rewards: {
        gold: 10,
        xp: 20,
        items: [
          { itemId: 'starter_pack', quantity: 1 }
        ]
      }
    }
  ]
};