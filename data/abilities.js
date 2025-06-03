// Combat abilities for creatures and their effects
module.exports = {
  // Wind abilities
  wind_slash: {
    name: 'Wind Slash',
    description: 'A cutting gust that slices through defenses',
    damage: { min: 12, max: 18 },
    accuracy: 85,
    effects: ['armor_pierce'],
    flavor: 'Razor-sharp wind blades dance through the air...'
  },
  
  illusion_step: {
    name: 'Illusion Step',
    description: 'Creates false images to confuse enemies',
    damage: { min: 8, max: 12 },
    accuracy: 95,
    effects: ['evasion_boost'],
    flavor: 'Multiple afterimages shimmer as the fox moves...'
  },
  
  // Earth abilities
  earth_spike: {
    name: 'Earth Spike',
    description: 'Jagged stones erupt from the ground',
    damage: { min: 15, max: 22 },
    accuracy: 75,
    effects: ['chance_stun'],
    flavor: 'The earth trembles as stone spikes burst forth...'
  },
  
  jade_armor: {
    name: 'Jade Armor',
    description: 'Crystalline scales provide enhanced protection',
    damage: { min: 0, max: 0 },
    accuracy: 100,
    effects: ['defense_boost'],
    flavor: 'Jade scales glimmer with protective qi...'
  },
  
  poison_fang: {
    name: 'Poison Fang',
    description: 'Venomous bite that weakens over time',
    damage: { min: 18, max: 25 },
    accuracy: 80,
    effects: ['poison'],
    flavor: 'Emerald venom drips from crystalline fangs...'
  },
  
  // Lunar abilities
  lunar_howl: {
    name: 'Lunar Howl',
    description: 'A haunting cry that chills the soul',
    damage: { min: 20, max: 30 },
    accuracy: 90,
    effects: ['fear'],
    flavor: 'A mournful howl echoes across the shattered moonscape...'
  },
  
  shadow_bite: {
    name: 'Shadow Bite',
    description: 'Fangs of pure darkness tear at the spirit',
    damage: { min: 25, max: 35 },
    accuracy: 85,
    effects: ['spiritual_damage'],
    flavor: 'Spectral jaws snap with the hunger of the void...'
  },
  
  moon_step: {
    name: 'Moon Step',
    description: 'Moves like flowing moonlight',
    damage: { min: 0, max: 0 },
    accuracy: 100,
    effects: ['speed_boost'],
    flavor: 'The wolf flows like liquid moonbeams...'
  },
  
  // Void abilities
  void_rend: {
    name: 'Void Rend',
    description: 'Tears reality itself to wound the target',
    damage: { min: 30, max: 45 },
    accuracy: 70,
    effects: ['true_damage'],
    flavor: 'Reality tears open with a sound like breaking glass...'
  },
  
  phase_shift: {
    name: 'Phase Shift',
    description: 'Becomes partially ethereal',
    damage: { min: 0, max: 0 },
    accuracy: 100,
    effects: ['ethereal'],
    flavor: 'The wraith\'s form flickers between dimensions...'
  },
  
  despair_wail: {
    name: 'Despair Wail',
    description: 'A cry that crushes hope and will',
    damage: { min: 35, max: 50 },
    accuracy: 80,
    effects: ['despair'],
    flavor: 'A soul-rending scream echoes from the void...'
  },
  
  // Fire abilities
  dragon_breath: {
    name: 'Dragon Breath',
    description: 'Scorching flames that melt even stone',
    damage: { min: 50, max: 80 },
    accuracy: 85,
    effects: ['burn'],
    flavor: 'Torrents of crimson flame roar forth like the sun\'s fury...'
  },
  
  flame_coil: {
    name: 'Flame Coil',
    description: 'Wraps the enemy in living fire',
    damage: { min: 35, max: 50 },
    accuracy: 75,
    effects: ['burn', 'entangle'],
    flavor: 'Serpentine flames coil around you like burning chains...'
  },
  
  molten_scales: {
    name: 'Molten Scales',
    description: 'Superheated armor that burns attackers',
    damage: { min: 0, max: 0 },
    accuracy: 100,
    effects: ['reflect_damage'],
    flavor: 'The dragon\'s scales glow white-hot with inner fire...'
  },
  
  sky_soar: {
    name: 'Sky Soar',
    description: 'Takes to the air for aerial advantage',
    damage: { min: 0, max: 0 },
    accuracy: 100,
    effects: ['flight'],
    flavor: 'Massive wings spread as the dragon takes to the skies...'
  },
  
  // Earth-Fire abilities
  molten_punch: {
    name: 'Molten Punch',
    description: 'A devastating blow with fists of liquid rock',
    damage: { min: 40, max: 60 },
    accuracy: 70,
    effects: ['knockback'],
    flavor: 'A massive fist of molten stone crashes down...'
  },
  
  earthquake_stomp: {
    name: 'Earthquake Stomp',
    description: 'Shakes the very foundations of the earth',
    damage: { min: 45, max: 65 },
    accuracy: 80,
    effects: ['area_damage'],
    flavor: 'The ground splits and buckles under tremendous force...'
  },
  
  lava_spray: {
    name: 'Lava Spray',
    description: 'Erupts molten rock in all directions',
    damage: { min: 35, max: 55 },
    accuracy: 75,
    effects: ['burn', 'area_damage'],
    flavor: 'Volcanic fury erupts in a shower of molten death...'
  },
  
  stone_armor: {
    name: 'Stone Armor',
    description: 'Encases self in protective granite',
    damage: { min: 0, max: 0 },
    accuracy: 100,
    effects: ['damage_reduction'],
    flavor: 'Layers of ancient stone coat the golem\'s form...'
  },
  
  // Water-Death abilities
  tidal_command: {
    name: 'Tidal Command',
    description: 'Summons crushing waves of spectral water',
    damage: { min: 60, max: 90 },
    accuracy: 85,
    effects: ['knockdown'],
    flavor: 'Ghostly tides rise at the emperor\'s command...'
  },
  
  soul_drain: {
    name: 'Soul Drain',
    description: 'Absorbs life force to heal wounds',
    damage: { min: 40, max: 60 },
    accuracy: 90,
    effects: ['life_steal'],
    flavor: 'Spectral tendrils reach out to grasp your very essence...'
  },
  
  ghostly_legion: {
    name: 'Ghostly Legion',
    description: 'Summons an army of drowned souls',
    damage: { min: 70, max: 100 },
    accuracy: 80,
    effects: ['summon_minions'],
    flavor: 'Countless spirits rise from the depths to serve their emperor...'
  },
  
  abyssal_current: {
    name: 'Abyssal Current',
    description: 'Drags enemies into crushing depths',
    damage: { min: 50, max: 80 },
    accuracy: 75,
    effects: ['entangle', 'water_damage'],
    flavor: 'Dark currents pull you into the endless depths...'
  },
  
  // Divine-Dark abilities
  divine_wrath: {
    name: 'Divine Wrath',
    description: 'Channels fallen divinity into pure destruction',
    damage: { min: 80, max: 120 },
    accuracy: 85,
    effects: ['holy_damage'],
    flavor: 'Divine light twisted by eons of torment blazes forth...'
  },
  
  chain_lash: {
    name: 'Chain Lash',
    description: 'Strikes with the very chains that bind',
    damage: { min: 70, max: 100 },
    accuracy: 80,
    effects: ['entangle', 'metal_damage'],
    flavor: 'Celestial chains whip through the air with divine fury...'
  },
  
  fallen_blessing: {
    name: 'Fallen Blessing',
    description: 'Grants dark power at terrible cost',
    damage: { min: 0, max: 0 },
    accuracy: 100,
    effects: ['berserk'],
    flavor: 'Corrupted divine energy courses through divine veins...'
  },
  
  godly_domain: {
    name: 'Godly Domain',
    description: 'Expands divine presence to control the battlefield',
    damage: { min: 60, max: 90 },
    accuracy: 90,
    effects: ['area_control'],
    flavor: 'Reality bends to the will of a mad deity...'
  }
};
// Test function to verify creature realms

