import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { adminMenu } from "./admin_menu.js";
import {
  itemDisplayName,
  itemMetadataText,
  serializeItemStack
} from "./core/itemData.js";

export class EnderChestInspector {
  constructor(player) {
    this.player = player;
  }

  getContainer() {
    if (!this.player?.isValid) throw new Error("The selected player is no longer online.");
    const container = this.player
      .getComponent("minecraft:ender_inventory")
      ?.container;
    if (!container) {
      throw new Error("Bedrock has not made this player's Ender Chest available yet.");
    }
    return container;
  }

  async getEnderChestContents() {
    const container = this.getContainer();
    const contents = new Map();
    for (let slot = 0; slot < container.size; slot++) {
      const item = container.getItem(slot);
      if (!item) continue;
      contents.set(slot, {
        slot,
        amount: item.amount,
        item
      });
    }
    return contents;
  }
}

export async function inspectEnderChest(admin, selectedPlayer, options = {}) {
  try {
    const inspector = new EnderChestInspector(selectedPlayer);
    await showEnderChest(admin, selectedPlayer, inspector, options);
  } catch (error) {
    admin.sendMessage(`§cCould not open ${selectedPlayer?.name ?? "that player"}'s Ender Chest: ${error.message}`);
    return goBack(admin, options);
  }
}

async function showEnderChest(admin, selectedPlayer, inspector, options) {
  const contents = await inspector.getEnderChestContents();
  const entries = [...contents.values()];
  const form = new ActionFormData()
    .title(`§5${selectedPlayer.name}'s Ender Chest`)
    .body(
      entries.length
        ? `§f${entries.length}/27 occupied slots\nSelect an exact item stack to inspect.`
        : "§7This Ender Chest is empty."
    );

  for (const entry of entries) {
    const data = serializeItemStack(entry.item);
    const enchanted = data.enchantments?.length ? " §d✦" : "";
    form.button(
      `Slot ${entry.slot + 1}: ${entry.amount}x ${itemDisplayName(data)}${enchanted}`
    );
  }
  form.button("§l§cBack", "textures/ui/book_arrowleft_hover");
  form.button("§l§cExit", "textures/ui/crossout");

  const response = await form.show(admin);
  if (response.canceled || response.selection === entries.length + 1) return;
  if (response.selection === entries.length) return goBack(admin, options);

  const entry = entries[response.selection];
  if (entry) return showItem(admin, selectedPlayer, inspector, entry.slot, options);
}

async function showItem(admin, selectedPlayer, inspector, slot, options) {
  let item;
  try {
    item = inspector.getContainer().getItem(slot);
  } catch (error) {
    admin.sendMessage(`§cCould not refresh that slot: ${error.message}`);
    return showEnderChest(admin, selectedPlayer, inspector, options);
  }
  if (!item) {
    admin.sendMessage("§eThat Ender Chest slot changed and is now empty.");
    return showEnderChest(admin, selectedPlayer, inspector, options);
  }

  const form = new ActionFormData()
    .title(itemDisplayName(serializeItemStack(item)))
    .body(
      `§6Ender Chest Slot: §f${slot + 1}\n` +
      `§6Amount: §f${item.amount}\n\n` +
      itemMetadataText(item, { storageContext: "viewer" })
    )
    .button("Take Exact Stack", "textures/ui/icon_import")
    .button("Remove Exact Stack", "textures/ui/trash")
    .button("§l§cBack", "textures/ui/book_arrowleft_hover")
    .button("§l§cExit", "textures/ui/crossout");

  const response = await form.show(admin);
  if (response.canceled || response.selection === 3) return;
  if (response.selection === 2) {
    return showEnderChest(admin, selectedPlayer, inspector, options);
  }
  if (response.selection === 0) {
    return confirmStackAction(admin, selectedPlayer, inspector, slot, "take", options);
  }
  if (response.selection === 1) {
    return confirmStackAction(admin, selectedPlayer, inspector, slot, "remove", options);
  }
}

async function confirmStackAction(admin, selectedPlayer, inspector, slot, action, options) {
  const current = inspector.getContainer().getItem(slot);
  if (!current) {
    admin.sendMessage("§eThat Ender Chest slot is already empty.");
    return showEnderChest(admin, selectedPlayer, inspector, options);
  }

  const response = await new MessageFormData()
    .title(action === "take" ? "Take Ender Chest Stack?" : "Remove Ender Chest Stack?")
    .body(
      `${action === "take" ? "Transfer" : "Permanently delete"} this exact stack?\n\n` +
      `§f${current.amount}x ${itemDisplayName(serializeItemStack(current))}\n` +
      `§7Slot ${slot + 1} in ${selectedPlayer.name}'s Ender Chest`
    )
    .button1("Cancel")
    .button2(action === "take" ? "§aTake Stack" : "§cDelete Stack")
    .show(admin);
  if (response.canceled || response.selection !== 1) {
    return showItem(admin, selectedPlayer, inspector, slot, options);
  }

  try {
    const targetContainer = inspector.getContainer();
    const exactItem = targetContainer.getItem(slot);
    if (!exactItem) throw new Error("The slot changed before the action completed.");

    if (action === "take") {
      const adminInventory = admin.getComponent("minecraft:inventory")?.container;
      if (!adminInventory) throw new Error("Your inventory is unavailable.");
      if (exactItemCapacity(adminInventory, exactItem) < exactItem.amount) {
        admin.sendMessage("§cYou need more inventory space. Nothing was removed.");
        return showItem(admin, selectedPlayer, inspector, slot, options);
      }

      const overflow = adminInventory.addItem(exactItem.clone());
      if (overflow) {
        throw new Error("The exact stack could not be transferred; nothing was removed.");
      }
      targetContainer.setItem(slot);
      admin.sendMessage(
        `§aTransferred ${exactItem.amount}x ${itemDisplayName(serializeItemStack(exactItem))} from ${selectedPlayer.name}.`
      );
    } else {
      targetContainer.setItem(slot);
      admin.sendMessage(
        `§aRemoved ${exactItem.amount}x ${itemDisplayName(serializeItemStack(exactItem))} from ${selectedPlayer.name}.`
      );
    }
  } catch (error) {
    admin.sendMessage(`§cEnder Chest action failed: ${error.message}`);
  }
  return showEnderChest(admin, selectedPlayer, inspector, options);
}

function exactItemCapacity(container, template) {
  let capacity = 0;
  for (let slot = 0; slot < container.size; slot++) {
    const existing = container.getItem(slot);
    if (!existing) {
      capacity += template.maxAmount;
    } else if (existing.isStackableWith(template)) {
      capacity += Math.max(0, existing.maxAmount - existing.amount);
    }
  }
  return capacity;
}

function goBack(admin, options) {
  if (typeof options.onBack === "function") return options.onBack();
  return adminMenu(admin);
}
