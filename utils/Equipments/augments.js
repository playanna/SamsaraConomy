// File: data/augments.js

module.exports = [
    {
      id: 'ember_core',
      name: 'Ember Core',
      tier: 2,
      slotType: 'element',
      elementAffinity: 'Fire',
      description: 'Infuses your rod with fire, changing its current element.',
      effects: {
        setCurrentElement: 'Void'
      }
    },
    {
      id: 'tidal_orb',
      name: 'Tidal Orb',
      tier: 2,
      slotType: 'element',
      elementAffinity: 'Water',
      description: 'Imbues the rod with water energy.',
      effects: {
        setCurrentElement: 'Chaos'
      }
    },
    {
      id: 'lucky_loop',
      name: 'Lucky Loop',
      tier: 1,
      slotType: 'reel',
      elementAffinity: 'None',
      description: 'Boosts your luck slightly while reeling.',
      effects: {
        luck: +5
      }
    },
    {
      id: 'thundergrip',
      name: 'Thundergrip',
      tier: 3,
      slotType: 'handle',
      elementAffinity: 'Electric',
      description: 'Adds precision when wielding electric rods.',
      effects: {
        precision: +10
      },
      conditional: {
        currentElementMustBe: 'Chaos'
      }
    },
    {
      id: 'focus_lens',
      name: 'Focus Lens',
      tier: 1,
      slotType: 'focus',
      elementAffinity: 'None',
      description: 'Improves resonance slightly, regardless of element.',
      effects: {
        resonance: +3
      }
    },
    {
      id: 'chaos_sigil',
      name: 'Chaos Sigil',
      tier: 4,
      slotType: 'sigil',
      elementAffinity: 'Void',
      description: 'Greatly enhances resonance when attuned to the Void.',
      effects: {
        resonance: +20
      },
      conditional: {
        currentElementMustBe: 'Void'
      }
    }
  ];
  