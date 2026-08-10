import { system, world } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { mainMenu } from "../mainmenu.js";
import {
  addStoredItems,
  capacityForStoredItem,
  deserializeItemStack,
  itemDisplayName,
  itemMetadataText,
  prepareShulkerAsEmpty,
  removeMatchingItems,
  serializeItemStack
} from "../core/itemData.js";
import {
  addListing,
  createShop,
  deleteShop,
  isShopOwner,
  listShops,
  removeListing,
  saveShop,
  updateListing
} from "../core/shops.js";
import {
  addEntityScore,
  getEntityScore,
  getFakeScore,
  trySpendEntityScore
} from "../core/scoreboard.js";

function positiveInteger(value, label) {
  const result = Number.parseInt(String(value), 10);
  if (!Number.isSafeInteger(result) || result < 1) {
    throw new Error(`${label} must be a positive whole number.`);
  }
  return result;
}

function ownedShops(player) {
  return listShops("player").filter((shop) => isShopOwner(player, shop));
}

export async function playerShop(player) {
  const stores = listShops("player");
  const owned = stores.filter((shop) => isShopOwner(player, shop));
  const form = new ActionFormData()
    .title("Player Shops")
    .body("Player names never become database keys; ownership follows the player's stable ID.")
    .button("Start a Store", "textures/ui/village_hero_effect")
    .button("View Stores", "textures/ui/night_vision_effect")
    .button("§l§cBack", "textures/ui/book_arrowleft_hover");

  if (owned.length) form.button("Manage My Stores", "textures/ui/gear");

  const response = await form.show(player);
  if (response.canceled) return;
  if (response.selection === 0) return startPlayerStore(player);
  if (response.selection === 1) return viewPlayerStores(player);
  if (response.selection === 2) return mainMenu(player);
  if (response.selection === 3 && owned.length) return chooseOwnedStore(player);
}

async function startPlayerStore(player) {
  const admin = world.scoreboard.getObjective("admin");
  const maxStores = Math.max(1, getFakeScore(admin, "P2Pcount", 1));
  const storeCost = Math.max(0, getFakeScore(admin, "P2Pcost", 0));

  if (ownedShops(player).length >= maxStores) {
    player.sendMessage(`§cYou already own the maximum of ${maxStores} player store(s).`);
    return playerShop(player);
  }
  if (getEntityScore("Money", player) < storeCost) {
    player.sendMessage(`§cOpening a store costs $${storeCost}.`);
    return playerShop(player);
  }

  const response = await new ModalFormData()
    .title("Start a Player Store")
    .textField(`Store name (cost: $${storeCost})`, "Store name")
    .show(player);
  if (response.canceled) return playerShop(player);

  const name = String(response.formValues[0] ?? "").trim();
  if (!name) {
    player.sendMessage("§cStore name cannot be empty.");
    return startPlayerStore(player);
  }
  if (!trySpendEntityScore("Money", player, storeCost)) {
    player.sendMessage("§cYour balance changed and the store could not be purchased.");
    return playerShop(player);
  }

  try {
    const shop = createShop({ type: "player", name, owner: player });
    player.sendMessage(`§aCreated “${shop.name}”.`);
    return manageOwnedStore(player, shop);
  } catch (error) {
    addEntityScore("Money", player, storeCost);
    player.sendMessage(`§c${error.message} Your payment was refunded.`);
    return playerShop(player);
  }
}

async function viewPlayerStores(player) {
  const stores = listShops("player").filter((shop) => !shop.disabled || isShopOwner(player, shop));
  const form = new ActionFormData()
    .title("Player Stores")
    .body(stores.length ? "Choose a store." : "No player stores are open.")
    .button("§l§cBack", "textures/ui/book_arrowleft_hover");
  for (const shop of stores) {
    form.button(`${shop.name}\n§7${shop.ownerName ?? "Unknown owner"}`, "textures/ui/MCoin");
  }

  const response = await form.show(player);
  if (response.canceled) return;
  if (response.selection === 0) return playerShop(player);
  const shop = stores[response.selection - 1];
  if (!shop) return;
  return isShopOwner(player, shop)
    ? manageOwnedStore(player, shop)
    : browseStore(player, shop);
}

async function chooseOwnedStore(player) {
  const stores = ownedShops(player);
  const form = new ActionFormData()
    .title("My Player Stores")
    .button("§l§cBack", "textures/ui/book_arrowleft_hover");
  for (const shop of stores) form.button(shop.name, "textures/ui/MCoin");

  const response = await form.show(player);
  if (response.canceled) return;
  if (response.selection === 0) return playerShop(player);
  const shop = stores[response.selection - 1];
  if (shop) return manageOwnedStore(player, shop);
}

async function manageOwnedStore(player, shop) {
  const current = ownedShops(player).find((entry) => entry.id === shop.id);
  if (!current) return playerShop(player);

  const form = new ActionFormData()
    .title(`Manage: ${current.name}`)
    .body(`Unclaimed earnings: $${current.pendingBalance ?? 0}`)
    .button("§l§cBack", "textures/ui/book_arrowleft_hover")
    .button("Stock an Inventory Item", "textures/ui/icon_import")
    .button("Claim Earnings", "textures/ui/icon_minecoin_9x9")
    .button("Rename Store", "textures/ui/anvil_icon")
    .button("Close Store", "textures/ui/crossout");

  for (const listing of current.listings) {
    const enchanted = listing.item.enchantments?.length ? " §d✦" : "";
    form.button(
      `${itemDisplayName(listing.item)}${enchanted}\n${listing.stock} in stock · $${listing.price} each`,
      "textures/ui/MCoin"
    );
  }

  const response = await form.show(player);
  if (response.canceled || response.selection === 0) return chooseOwnedStore(player);
  if (response.selection === 1) return chooseInventoryItem(player, current);
  if (response.selection === 2) return claimEarnings(player, current);
  if (response.selection === 3) return renameStore(player, current);
  if (response.selection === 4) return closeStore(player, current);

  const listing = current.listings[response.selection - 5];
  if (listing) return manageListing(player, current, listing);
}

async function chooseInventoryItem(player, shop) {
  const inventory = player.getComponent("minecraft:inventory")?.container;
  if (!inventory) {
    player.sendMessage("§cYour inventory is unavailable.");
    return manageOwnedStore(player, shop);
  }

  const entries = [];
  for (let slot = 0; slot < inventory.size; slot++) {
    const item = inventory.getItem(slot);
    if (item) entries.push({ slot, item });
  }
  if (!entries.length) {
    player.sendMessage("§cYour inventory is empty.");
    return manageOwnedStore(player, shop);
  }

  const form = new ActionFormData()
    .title("Choose Stock")
    .body("The selected item's complete data will be preserved.")
    .button("§l§cBack", "textures/ui/book_arrowleft_hover");
  for (const entry of entries) {
    const data = serializeItemStack(entry.item);
    const enchanted = data.enchantments?.length ? " §d✦" : "";
    form.button(`${itemDisplayName(data)}${enchanted} x${entry.item.amount}`);
  }

  const response = await form.show(player);
  if (response.canceled || response.selection === 0) return manageOwnedStore(player, shop);
  const entry = entries[response.selection - 1];
  if (entry) return setStockDetails(player, shop, entry.slot);
}

async function setStockDetails(player, shop, slot) {
  const inventory = player.getComponent("minecraft:inventory")?.container;
  const selected = inventory?.getItem(slot);
  if (!selected) {
    player.sendMessage("§cThat inventory slot changed.");
    return manageOwnedStore(player, shop);
  }
  let selectedData = serializeItemStack(selected);
  if (selectedData.storageUnavailable) {
    const continueEmpty = await confirmPlayerShulkerWarning(player);
    if (!continueEmpty) return manageOwnedStore(player, shop);
    selectedData = prepareShulkerAsEmpty(selectedData);
  }

  const response = await new ModalFormData()
    .title(`Stock ${itemDisplayName(selectedData)}`)
    .label(itemMetadataText(selectedData))
    .textField(`Quantity to stock (maximum ${selected.amount})`, "Whole number", { defaultValue: String(selected.amount) })
    .textField("Price per item", "Whole number", { defaultValue: "1" })
    .show(player);
  if (response.canceled) return manageOwnedStore(player, shop);
  const values = response.formValues.filter((value) => value !== undefined);

  try {
    const quantity = positiveInteger(values[0], "Quantity");
    const price = positiveInteger(values[1], "Price");
    const current = inventory.getItem(slot);
    if (!current || quantity > current.amount) {
      throw new Error("The selected stack no longer contains that quantity.");
    }

    const item = selectedData.shulkerContentsDiscarded
      ? prepareShulkerAsEmpty(serializeItemStack(current))
      : serializeItemStack(current);
    addListing(shop, { item, quantity: 1, price, stock: quantity });
    if (current.amount === quantity) {
      inventory.setItem(slot);
    } else {
      current.amount -= quantity;
      inventory.setItem(slot, current);
    }
    player.sendMessage(`§aStocked ${quantity}x ${itemDisplayName(item)} at $${price} each.`);
  } catch (error) {
    player.sendMessage(`§c${error.message}`);
  }
  return manageOwnedStore(player, shop);
}

async function confirmPlayerShulkerWarning(player) {
  const response = await new MessageFormData()
    .title("§cWARNING: Possible Item Loss")
    .body(
      "§cWorld Menu cannot see or copy items stored inside this vanilla shulker box.\n\n" +
      "§4If you continue, the original shulker will be removed from your inventory and stocked as AN EMPTY SHULKER BOX. " +
      "Anything hidden inside it will be permanently deleted and cannot be recovered.\n\n" +
      "§eCancel now and empty the shulker before listing it."
    )
    .button1("§aCancel — Keep Shulker")
    .button2("§cContinue — Delete Contents")
    .show(player);
  return !response.canceled && response.selection === 1;
}

async function manageListing(player, shop, listing) {
  const response = await new ModalFormData()
    .title(itemDisplayName(listing.item))
    .label(itemMetadataText(listing.item))
    .textField("Price per item", "Whole number", { defaultValue: String(listing.price) })
    .toggle("Remove listing and return remaining stock", { defaultValue: false })
    .show(player);
  if (response.canceled) return manageOwnedStore(player, shop);
  const values = response.formValues.filter((value) => value !== undefined);

  if (values[1]) {
    return returnListingStock(player, shop, listing);
  }
  try {
    updateListing(shop, listing.id, {
      price: positiveInteger(values[0], "Price")
    });
  } catch (error) {
    player.sendMessage(`§c${error.message}`);
  }
  return manageOwnedStore(player, shop);
}

function returnItemsOrDrop(player, item, amount) {
  if (amount <= 0) return;
  const inventory = player.getComponent("minecraft:inventory")?.container;
  const overflow = inventory ? addStoredItems(inventory, item, amount) : amount;
  if (overflow <= 0) return;

  const maxAmount = deserializeItemStack(item, 1).maxAmount;
  let remaining = overflow;
  system.run(() => {
    while (remaining > 0) {
      const stackAmount = Math.min(remaining, maxAmount);
      player.dimension.spawnItem(deserializeItemStack(item, stackAmount), player.location);
      remaining -= stackAmount;
    }
  });
  player.sendMessage("§eSome returned stock was dropped because your inventory was full.");
}

function returnListingStock(player, shop, listing) {
  removeListing(shop, listing.id);
  returnItemsOrDrop(player, listing.item, listing.stock ?? 0);
  player.sendMessage("§aListing removed and remaining stock returned.");
  return manageOwnedStore(player, shop);
}

function claimEarnings(player, shop) {
  const earnings = Math.max(0, Math.trunc(shop.pendingBalance ?? 0));
  if (earnings === 0) {
    player.sendMessage("§eThere are no earnings to claim.");
  } else {
    shop.pendingBalance = 0;
    saveShop(shop);
    addEntityScore("Money", player, earnings);
    player.sendMessage(`§aClaimed $${earnings}.`);
  }
  return manageOwnedStore(player, shop);
}

async function renameStore(player, shop) {
  const response = await new ModalFormData()
    .title("Rename Player Store")
    .textField("Store name", "Store name", { defaultValue: shop.name })
    .show(player);
  if (response.canceled) return manageOwnedStore(player, shop);

  const name = String(response.formValues[0] ?? "").trim();
  if (name) {
    shop.name = name;
    saveShop(shop);
  } else {
    player.sendMessage("§cStore name cannot be empty.");
  }
  return manageOwnedStore(player, shop);
}

async function closeStore(player, shop) {
  const response = await new MessageFormData()
    .title("Close Player Store")
    .body("Closing returns all remaining stock and claims all earnings.")
    .button1("Cancel")
    .button2("§cClose Store")
    .show(player);
  if (response.canceled || response.selection !== 1) return manageOwnedStore(player, shop);

  for (const listing of shop.listings) {
    returnItemsOrDrop(player, listing.item, listing.stock ?? 0);
  }
  if (shop.pendingBalance > 0) addEntityScore("Money", player, shop.pendingBalance);
  deleteShop(shop.id);
  player.sendMessage("§aStore closed; stock and earnings were returned.");
  return playerShop(player);
}

async function browseStore(player, shop) {
  const current = listShops("player").find((entry) => entry.id === shop.id);
  if (!current) return viewPlayerStores(player);
  if (current.disabled && !isShopOwner(player, current)) {
    player.sendMessage("§cThis store is currently disabled.");
    return viewPlayerStores(player);
  }

  const available = current.listings.filter((listing) => (listing.stock ?? 0) > 0);
  const form = new ActionFormData()
    .title(current.name)
    .body(`Owner: ${current.ownerName ?? "Unknown"}\nBalance: $${getEntityScore("Money", player)}`)
    .button("§l§cBack", "textures/ui/book_arrowleft_hover");
  for (const listing of available) {
    const enchanted = listing.item.enchantments?.length ? " §d✦" : "";
    form.button(
      `${itemDisplayName(listing.item)}${enchanted}\n${listing.stock} available · $${listing.price} each`,
      "textures/ui/MCoin"
    );
  }

  const response = await form.show(player);
  if (response.canceled) return;
  if (response.selection === 0) return viewPlayerStores(player);
  const listing = available[response.selection - 1];
  if (listing) return buyPlayerListing(player, current, listing);
}

async function buyPlayerListing(player, shop, listing) {
  const response = await new ModalFormData()
    .title(`Buy ${itemDisplayName(listing.item)}`)
    .label(itemMetadataText(listing.item))
    .textField(`Quantity (maximum ${listing.stock}, $${listing.price} each)`, "Whole number", { defaultValue: "1" })
    .show(player);
  if (response.canceled) return browseStore(player, shop);
  const values = response.formValues.filter((value) => value !== undefined);

  let quantity;
  try {
    quantity = positiveInteger(values[0], "Quantity");
  } catch (error) {
    player.sendMessage(`§c${error.message}`);
    return browseStore(player, shop);
  }
  if (quantity > listing.stock) {
    player.sendMessage("§cThe store does not have that much stock.");
    return browseStore(player, shop);
  }

  const total = quantity * listing.price;
  if (!Number.isSafeInteger(total)) {
    player.sendMessage("§cThat transaction is too large.");
    return browseStore(player, shop);
  }
  const inventory = player.getComponent("minecraft:inventory")?.container;
  if (!inventory || capacityForStoredItem(inventory, listing.item) < quantity) {
    player.sendMessage("§cYou do not have enough inventory space.");
    return browseStore(player, shop);
  }
  if (!trySpendEntityScore("Money", player, total)) {
    player.sendMessage(`§cYou need $${total}.`);
    return browseStore(player, shop);
  }

  const overflow = addStoredItems(inventory, listing.item, quantity);
  if (overflow > 0) {
    removeMatchingItems(inventory, listing.item, quantity - overflow);
    addEntityScore("Money", player, total);
    player.sendMessage("§cDelivery failed and your payment was refunded.");
    return browseStore(player, shop);
  }

  listing.stock -= quantity;
  shop.pendingBalance = (shop.pendingBalance ?? 0) + total;
  if (listing.stock === 0) removeListing(shop, listing.id);
  else saveShop(shop);

  player.sendMessage(`§aBought ${quantity}x ${itemDisplayName(listing.item)} for $${total}.`);
  return browseStore(player, shop);
}
