// models/Equipment/methods.js

const { COMPONENTS, ELEMENT_RELATIONSHIPS } = require('./constants');
const { applyStatModifiers } = require('./helpers');

module.exports = {
  async applyAugment(augmentItem) {
    const { id, slotType, effects } = augmentItem;
  
    // Step 1: Find a slot of the correct type
    let slot = this.augments.find(s => s.slotType === slotType && !s.augmentId);
  
    // If no empty slot, find an occupied one
    if (!slot) {
      slot = this.augments.find(s => s.slotType === slotType);
      if (!slot) throw new Error(`No compatible slot found for slot type: ${slotType}`);
    }
  
    // Step 2: If same augment already installed, skip
    if (slot.augmentId === id) {
      console.log(`Augment ${id} is already installed in ${slotType} slot.`);
      return false;
    }
  
    // Step 3: If replacing a different augment, remove its stat effects
    if (slot.augmentId && slot.augmentData) {
      this.removeAugmentEffects(slot.augmentData);
    }
  
    // Step 4: Special case for 'element' type augments
    if (slotType === 'element') {
      this.currentElement = 'None'; // Reset before applying new element
    }
  
    // Step 5: Apply new augment
    slot.augmentId = id;
    slot.augmentData = effects || {};
    slot.installedAt = new Date();
    slot.durability = 100; // Reset durability to full on install (optional)
  
    // Apply stat modifiers from the new augment
    if (effects) {
      this.applyAugmentEffects(effects);
    }
  
    // Step 6: Set current element if applicable
    if (effects?.setCurrentElement) {
      this.currentElement = effects.setCurrentElement;
    }
  
    // Step 7: Mark save needed (up to you if you batch save later)
    await this.save(); // Save the changes to the database
    return true;
  },

  applyAugmentEffects(effects) {
    const validStats = ['catchRate', 'cooldown', 'durability', 'precision', 'luck', 'resonance'];
  
    for (const stat in effects) {
      if (validStats.includes(stat)) {
        this.stats[stat] += effects[stat];
      }

    }
    console.log('Applied augment effects:', effects, 'New stats:', this.stats);
  },
  
  removeAugmentEffects(effects) {
    const validStats = ['catchRate', 'cooldown', 'durability', 'precision', 'luck', 'resonance'];
  
    for (const stat in effects) {
      if (validStats.includes(stat)) {
        this.stats[stat] -= effects[stat];
      }
    }
  },
   
    
  async upgradeComponent(type, value) {
    const valid = COMPONENTS[type];
    if (!valid || !valid.includes(value)) throw new Error(`Invalid ${type} component`);

    const oldValue = this.components[type];
    this.upgradeHistory.push({ action: 'COMPONENT_UPGRADE', changedFrom: oldValue, changedTo: value });
    this.components[type] = value;

    // You can dynamically fetch effects from a config file here if needed
    const dummyEffects = {
      mast: { 'Dragonbone': { durability: 40, resonance: 5 } }
    };

    applyStatModifiers(this.stats, dummyEffects[type]?.[value] || {});
    await this.save();
    return true;
  },
  
  
  calculateElementalAffinity(targetElement) {
    const current = this.currentElement;
    if (current === 'None') return 1.0;

    const rel = ELEMENT_RELATIONSHIPS[current];
    if (!rel) return 1.0;

    if (rel.strongAgainst.includes(targetElement)) return 1.75;
    if (rel.weakAgainst.includes(targetElement)) return 0.6;
    if (current === targetElement) return 1.5;
    return 1.0;
  },

  checkIntegrity() {
    const maxDurability = 200;
    if (this.stats.durability <= 0) throw new Error('Rod is broken!');
    return this.stats.durability <= maxDurability * 0.2 ? 'warning' : 'ok';
  },

  async chooseSpecialization(path) {
    if (this.specializations.path !== 'None') throw new Error('Already specialized');
    if (!['Angler', 'Hunter', 'Scholar', 'Explorer', 'Mystic'].includes(path)) throw new Error('Invalid specialization path');

    this.specializations.path = path;
    await this.save();
    return true;
  }
};
