// /handlers/inventoryHandler.js
const Inventory = require('../../../models/Multipliers/inventory.js');
const {categorizeLoot} = require('./lootHandler.js');

function mergeLootIntoInventory(newItems = [], existingItems) {
    const inventoryMap = new Map();
    const safeExisting = Array.isArray(existingItems) ? existingItems : [];
  
    safeExisting.forEach(item => {
      inventoryMap.set(item.itemId, item);
    });
  
    newItems.forEach(item => {
      if (inventoryMap.has(item.itemId)) {
        inventoryMap.get(item.itemId).quantity += item.quantity;
      } else {
        inventoryMap.set(item.itemId, { ...item });
      }
    });
  
    return Array.from(inventoryMap.values());
  }

async function handleLootStorage({ settings, handDoc, inventory, loots }) {
    const categorized = categorizeLoot(loots);
    const totalLootValue = loots.reduce((acc, item) => acc + (item.value * item.quantity), 0);
    const totalKarmicDebt = loots.reduce((acc, item) => acc + (item.debt * item.quantity), 0);
  
    if (settings.autosell) {
      handDoc.balance += totalLootValue;
      await handDoc.save(); // Still safe since only this call touches handDoc
    } else {
      // Merge into in-memory object
      const updatedInventory = {
        souls: mergeLootIntoInventory(categorized.souls, inventory.souls),
        artifacts: mergeLootIntoInventory(categorized.artifacts, inventory.artifacts),
        materials: mergeLootIntoInventory(categorized.materials, inventory.materials),
        alchemy: mergeLootIntoInventory(categorized.alchemy, inventory.alchemy),
        karma: mergeLootIntoInventory(categorized.karma, inventory.karma),
        totalKarmicDebt: inventory.totalKarmicDebt + totalKarmicDebt
      };
  
      // Perform atomic update
      await Inventory.findOneAndUpdate(
        { userId: inventory.userId },
        { $set: updatedInventory },
        { new: true }
      );
    }
  
    return { totalLootValue, totalKarmicDebt };
  }

module.exports = { handleLootStorage, mergeLootIntoInventory };
