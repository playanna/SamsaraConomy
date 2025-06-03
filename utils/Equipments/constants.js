// models/Equipment/sectRod/constants.js

const ELEMENTS = [
    'None', 'Fire', 'Water', 'Earth', 'Air', 'Lightning',
    'Holy', 'Void', 'Chaos', 'Order', 'Nature', 'Arcane', 'Celestial', 'Abyssal'
  ];
  
  const COMPONENTS = {
    mast: ['Bamboo', 'Ironwood', 'Obsidian', 'Dragonbone', 'Livingwood'], 
    line: ['Hemp', 'Silksteel', 'Voidstrand', 'Dragonhair', 'CelestialThread'],
    reel: ['Basic', 'Precision', 'Vortex', 'Temporal', 'Singularity'],
    grip: ['Leather', 'Crystal', 'Bone', 'Eldritch', 'Divine']
  };
  
  const ELEMENT_RELATIONSHIPS = {
    Fire: { strongAgainst: ['Nature', 'Ice'], weakAgainst: ['Water', 'Abyssal'] },
    Water: { strongAgainst: ['Fire', 'Lava'], weakAgainst: ['Lightning', 'Nature'] },
    Earth: { strongAgainst: ['Lightning', 'Air'], weakAgainst: ['Fire', 'Void'] },
    Air: { strongAgainst: ['Earth', 'Water'], weakAgainst: ['Fire', 'Abyssal'] },
    Lightning: { strongAgainst: ['Water', 'Earth'], weakAgainst: ['Fire', 'Abyssal'] },
    Holy: { strongAgainst: ['Void', 'Chaos'], weakAgainst: ['Darkness', 'Abyssal'] },
    Void: { strongAgainst: ['Holy', 'Order'], weakAgainst: ['Light', 'Abyssal'] },
    Chaos: { strongAgainst: ['Order', 'Nature'], weakAgainst: ['Holy', 'Abyssal'] },
    Order: { strongAgainst: ['Chaos', 'Darkness'], weakAgainst: ['Holy', 'Abyssal'] },
    Nature: { strongAgainst: ['Fire', 'Earth'], weakAgainst: ['Water', 'Abyssal'] },
    Arcane: { strongAgainst: ['Celestial', 'Abyssal'], weakAgainst: ['Void', 'Abyssal'] },
    Celestial: { strongAgainst: ['Abyssal', 'Void'], weakAgainst: ['Fire', 'Abyssal'] },
    Abyssal: { strongAgainst: ['Celestial', 'Void'], weakAgainst: ['Fire', 'Water'] }
  };
  
  module.exports = {
    ELEMENTS,
    COMPONENTS,
    ELEMENT_RELATIONSHIPS
  };
  