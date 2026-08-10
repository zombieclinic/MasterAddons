import { EnchantmentTypes, EquipmentSlot, ItemStack, world } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { playerMenuSettings } from "./playermenusettings.js";
import { getFakeScore } from "../core/scoreboard.js";
import {
  itemDisplayName,
  itemMetadataText,
  prepareShulkerAsEmpty,
  serializeItemStack
} from "../core/itemData.js";
import {
  addListing,
  createShop,
  deleteShop,
  listShops,
  removeListing,
  saveShop,
  updateListing
} from "../core/shops.js";

function getHeldItem(player) {
  const inventory = player.getComponent("minecraft:inventory")?.container;
  const selectedSlot = Number.isInteger(player.selectedSlotIndex)
    ? player.selectedSlotIndex
    : undefined;
  if (inventory && selectedSlot !== undefined) {
    const selected = inventory.getItem(selectedSlot);
    if (selected) return selected;
  }
  return player.getComponent("minecraft:equippable")
    ?.getEquipment(EquipmentSlot.Mainhand);
}

function parseInteger(value, minimum, label) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new Error(`${label} must be a whole number of at least ${minimum}.`);
  }
  return parsed;
}

export async function configureServerStores(player) {
  const admin = world.scoreboard.getObjective("admin")
    ?? world.scoreboard.addObjective("admin", "Admin Controls");
  const stores = listShops("server");
  const visible = getFakeScore(admin, "menu_serverStores", 0) === 1;

  const form = new ActionFormData()
    .title("Configure Server Stores")
    .body("Server products preserve the held item's enchantments, name, lore, durability, and custom data.")
    .button("Add Store", "textures/ui/mashup_world")
    .button(`Server Stores: ${visible ? "§aVisible" : "§cHidden"}`, "textures/ui/mining_fatigue_effect")
    .button("§l§cBack", "textures/ui/book_arrowleft_hover")
    .button("§l§cExit", "textures/ui/crossout");

  for (const store of stores) {
    form.button(store.name, "textures/ui/MCoin");
  }

  try {
    const response = await form.show(player);
    if (response.canceled) return;

    if (response.selection === 0) return addStore(player);
    if (response.selection === 1) {
      admin.setScore("menu_serverStores", visible ? 0 : 1);
      return configureServerStores(player);
    }
    if (response.selection === 2) return playerMenuSettings(player);
    if (response.selection === 3) return;

    const store = stores[response.selection - 4];
    if (store) return manageStore(player, store);
  } catch (error) {
    player.sendMessage(`§cCould not open server-store settings: ${error}`);
  }
}

async function addStore(player) {
  const form = new ModalFormData()
    .title("Add Server Store")
    .textField("Store name", "Example: Enchanted Equipment");

  const response = await form.show(player);
  if (response.canceled) return configureServerStores(player);

  try {
    const store = createShop({
      type: "server",
      name: response.formValues[0],
      owner: player
    });
    player.sendMessage(`§aCreated server store “${store.name}”.`);
    return manageStore(player, store);
  } catch (error) {
    player.sendMessage(`§c${error.message}`);
    return configureServerStores(player);
  }
}

async function manageStore(player, store) {
  const freshStore = listShops("server").find((entry) => entry.id === store.id);
  if (!freshStore) return configureServerStores(player);

  const form = new ActionFormData()
    .title(`Manage: ${freshStore.name}`)
    .body("Add an item from your hand, choose one from your inventory, or enter its identifier and enchantments.")
    .button("§l§cBack", "textures/ui/book_arrowleft_hover")
    .button("Add Item", "textures/ui/Add-Ons_Nav_Icon36x36")
    .button("Rename Store", "textures/ui/anvil_icon")
    .button("Remove Store", "textures/ui/bad_omen_effect")
    .button("§l§cExit", "textures/ui/crossout");

  for (const listing of freshStore.listings) {
    const enchanted = listing.item.enchantments?.length ? " §d✦" : "";
    form.button(
      `${itemDisplayName(listing.item)}${enchanted} x${listing.quantity} - $${listing.price}`,
      "textures/ui/icon_minecoin_9x9"
    );
  }

  const response = await form.show(player);
  if (response.canceled || response.selection === 0) return configureServerStores(player);
  if (response.selection === 1) return chooseItemSource(player, freshStore);
  if (response.selection === 2) return renameStore(player, freshStore);
  if (response.selection === 3) return confirmRemoveStore(player, freshStore);
  if (response.selection === 4) return;

  const listing = freshStore.listings[response.selection - 5];
  if (listing) return editListing(player, freshStore, listing);
}

async function chooseItemSource(player, store) {
  const response = await new ActionFormData()
    .title("Add Store Item")
    .body("Choose how to create the store listing.")
    .button("From Held Item", "textures/ui/icon_recipe_equipment")
    .button("From Inventory", "textures/ui/icon_recipe_item")
    .button("From Item Identifier", "textures/ui/anvil_icon")
    .button("§l§cBack", "textures/ui/book_arrowleft_hover")
    .button("§l§cExit", "textures/ui/crossout")
    .show(player);

  if (response.canceled || response.selection === 3) return manageStore(player, store);
  if (response.selection === 4) return;
  if (response.selection === 0) return addHeldItem(player, store);
  if (response.selection === 1) return chooseInventoryItem(player, store);
  if (response.selection === 2) return addIdentifierItem(player, store);
}

async function addHeldItem(player, store) {
  const held = getHeldItem(player);
  if (!held) {
    player.sendMessage("§cHold the item you want to add to this store.");
    return manageStore(player, store);
  }

  return configureNewListing(player, store, held);
}

async function chooseInventoryItem(player, store) {
  const inventory = player.getComponent("minecraft:inventory")?.container;
  if (!inventory) {
    player.sendMessage("§cYour inventory is unavailable.");
    return chooseItemSource(player, store);
  }

  const entries = [];
  const form = new ActionFormData()
    .title("Choose Inventory Item")
    .body("Choose the exact item template for this unlimited server-store listing.")
    .button("§l§cBack", "textures/ui/book_arrowleft_hover");

  for (let slot = 0; slot < inventory.size; slot++) {
    const item = inventory.getItem(slot);
    if (!item) continue;
    entries.push(item);
    const data = serializeItemStack(item);
    const enchanted = data.enchantments?.length ? " §d✦" : "";
    form.button(`${itemDisplayName(data)}${enchanted} x${item.amount}`);
  }
  form.button("§l§cExit", "textures/ui/crossout");

  if (!entries.length) {
    player.sendMessage("§cYour inventory has no items to select.");
    return chooseItemSource(player, store);
  }

  const response = await form.show(player);
  if (response.canceled || response.selection === 0) return chooseItemSource(player, store);
  if (response.selection === entries.length + 1) return;
  const selected = entries[response.selection - 1];
  if (selected) return configureNewListing(player, store, selected);
}

async function addIdentifierItem(player, store) {
  const response = await new ModalFormData()
    .title("Add Item by Identifier")
    .textField("Item identifier", "Example: minecraft:diamond_sword")
    .textField(
      "Enchantments (optional)",
      "Example: sharpness=5, unbreaking=3"
    )
    .textField("Items per set", "Whole number", { defaultValue: "1" })
    .textField("Price per set", "Whole number", { defaultValue: "0" })
    .show(player);
  if (response.canceled) return chooseItemSource(player, store);

  try {
    const typeId = normalizeNamespacedId(response.formValues[0], "Item identifier");
    const quantity = parseInteger(response.formValues[2], 1, "Set size");
    const price = parseInteger(response.formValues[3], 0, "Price");
    const item = new ItemStack(typeId, 1);
    applyRequestedEnchantments(item, response.formValues[1]);
    const data = serializeItemStack(item);
    addListing(store, { item: data, quantity, price });
    player.sendMessage(`§aAdded ${itemDisplayName(data)} x${quantity} for $${price}.`);
  } catch (error) {
    player.sendMessage(`§cCould not add item: ${error.message}`);
  }
  return manageStore(player, store);
}

async function configureNewListing(player, store, item) {
  let data = serializeItemStack(item);
  if (data.storageUnavailable) {
    const continueEmpty = await confirmServerShulkerWarning(player);
    if (!continueEmpty) return manageStore(player, store);
    data = prepareShulkerAsEmpty(data);
  }
  const enchanted = data.enchantments?.length
    ? `\nEnchantments: ${data.enchantments.map((entry) => `${entry.id} ${entry.level}`).join(", ")}`
    : "";
  const form = new ModalFormData()
    .title(`Add ${itemDisplayName(data)}`)
    .label(itemMetadataText(data))
    .textField(`Items per set${enchanted}`, "Whole number", { defaultValue: String(item.amount) })
    .textField("Price per set", "Whole number", { defaultValue: "0" });

  const response = await form.show(player);
  if (response.canceled) return manageStore(player, store);
  const values = response.formValues.filter((value) => value !== undefined);

  try {
    const quantity = parseInteger(values[0], 1, "Set size");
    const price = parseInteger(values[1], 0, "Price");
    addListing(store, { item: data, quantity, price });
    player.sendMessage(`§aAdded ${itemDisplayName(data)} x${quantity} for $${price}.`);
  } catch (error) {
    player.sendMessage(`§c${error.message}`);
  }
  return manageStore(player, store);
}

async function confirmServerShulkerWarning(player) {
  const response = await new MessageFormData()
    .title("§cWARNING: Shulker Contents")
    .body(
      "§cWorld Menu cannot see or copy items stored inside this vanilla shulker box.\n\n" +
      "§eIf you continue, the server-store listing will contain ONLY AN EMPTY SHULKER BOX. " +
      "Buyers will not receive anything stored inside it.\n\n" +
      "§aYour original held shulker will remain unchanged.\n\n" +
      "Remove the contents first if you are unsure."
    )
    .button1("§aCancel — Go Back")
    .button2("§cContinue — List Empty")
    .show(player);
  return !response.canceled && response.selection === 1;
}

function normalizeNamespacedId(value, label) {
  const entered = String(value ?? "").trim().toLowerCase();
  if (!entered) throw new Error(`${label} is required.`);
  const id = entered.includes(":") ? entered : `minecraft:${entered}`;
  if (!/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(id)) {
    throw new Error(`${label} is not valid.`);
  }
  return id;
}

function applyRequestedEnchantments(item, value) {
  const entered = String(value ?? "").trim();
  if (!entered) return;

  const enchantable = item.getComponent("minecraft:enchantable");
  if (!enchantable) throw new Error(`${item.typeId} cannot be enchanted.`);

  for (const rawEntry of entered.split(",")) {
    const match = rawEntry.trim().match(/^([a-z0-9_.:-]+)\s*(?:=|:|\s)\s*(\d+)$/i);
    if (!match) {
      throw new Error(`Invalid enchantment “${rawEntry.trim()}”. Use sharpness=5.`);
    }

    const enchantmentId = normalizeNamespacedId(match[1], "Enchantment identifier");
    const enchantmentType = EnchantmentTypes.get(enchantmentId);
    if (!enchantmentType) throw new Error(`Unknown enchantment: ${enchantmentId}.`);

    const level = parseInteger(match[2], 1, `${enchantmentId} level`);
    enchantable.addEnchantment({ type: enchantmentType, level });
  }
}

async function editListing(player, store, listing) {
  const form = new ModalFormData()
    .title(`Edit ${itemDisplayName(listing.item)}`)
    .label(itemMetadataText(listing.item))
    .textField("Items per set", "Whole number", { defaultValue: String(listing.quantity) })
    .textField("Price per set", "Whole number", { defaultValue: String(listing.price) })
    .toggle("Remove this listing", { defaultValue: false });

  const response = await form.show(player);
  if (response.canceled) return manageStore(player, store);
  const values = response.formValues.filter((value) => value !== undefined);

  try {
    if (values[2]) {
      removeListing(store, listing.id);
      player.sendMessage("§aListing removed.");
    } else {
      updateListing(store, listing.id, {
        quantity: parseInteger(values[0], 1, "Set size"),
        price: parseInteger(values[1], 0, "Price")
      });
      player.sendMessage("§aListing updated.");
    }
  } catch (error) {
    player.sendMessage(`§c${error.message}`);
  }
  return manageStore(player, store);
}

async function renameStore(player, store) {
  const form = new ModalFormData()
    .title("Rename Server Store")
    .textField("Store name", "Store name", { defaultValue: store.name });
  const response = await form.show(player);
  if (response.canceled) return manageStore(player, store);

  const name = String(response.formValues[0] ?? "").trim();
  if (!name) {
    player.sendMessage("§cStore name cannot be empty.");
  } else {
    store.name = name;
    saveShop(store);
    player.sendMessage(`§aStore renamed to “${name}”.`);
  }
  return manageStore(player, store);
}

async function confirmRemoveStore(player, store) {
  const response = await new MessageFormData()
    .title("Remove Server Store")
    .body(`Remove “${store.name}” and all of its listings?`)
    .button1("Cancel")
    .button2("§cRemove")
    .show(player);

  if (!response.canceled && response.selection === 1) {
    deleteShop(store.id);
    player.sendMessage(`§aRemoved “${store.name}”.`);
    return configureServerStores(player);
  }
  return manageStore(player, store);
}
