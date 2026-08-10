import { world } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { mainMenu } from "./mainmenu.js";
import {
  addStoredItems,
  capacityForStoredItem,
  itemDisplayName,
  itemMetadataText,
  removeMatchingItems
} from "./core/itemData.js";
import { listShops } from "./core/shops.js";
import {
  addEntityScore,
  getEntityScore,
  trySpendEntityScore
} from "./core/scoreboard.js";

export async function serverStoresMenu(player) {
  const stores = listShops("server");
  const form = new ActionFormData()
    .title("§6Server Stores")
    .body(stores.length ? "Choose a store." : "No server stores are available.")
    .button("§l§cBack", "textures/ui/book_arrowleft_hover");

  for (const store of stores) form.button(store.name, "textures/ui/MCoin");

  try {
    const response = await form.show(player);
    if (response.canceled) return;
    if (response.selection === 0) return mainMenu(player);
    const store = stores[response.selection - 1];
    if (store) return openStore(player, store);
  } catch (error) {
    player.sendMessage(`§cCould not open server stores: ${error}`);
  }
}

async function openStore(player, store) {
  const form = new ActionFormData()
    .title(`§6${store.name}`)
    .body(`Balance: $${getEntityScore("Money", player)}`)
    .button("§l§cBack", "textures/ui/book_arrowleft_hover");

  for (const listing of store.listings) {
    const enchanted = listing.item.enchantments?.length ? " §d✦" : "";
    form.button(
      `${itemDisplayName(listing.item)}${enchanted} x${listing.quantity}\n$${listing.price}`,
      "textures/ui/MCoin"
    );
  }

  const response = await form.show(player);
  if (response.canceled) return;
  if (response.selection === 0) return serverStoresMenu(player);
  const listing = store.listings[response.selection - 1];
  if (listing) return chooseQuantity(player, store, listing);
}

async function chooseQuantity(player, store, listing) {
  const form = new ModalFormData()
    .title(`Buy ${itemDisplayName(listing.item)}`)
    .label(itemMetadataText(listing.item))
    .textField(
      `${listing.quantity} per set at $${listing.price}. How many sets?`,
      "Whole number",
      { defaultValue: "1" }
    );
  const response = await form.show(player);
  if (response.canceled) return openStore(player, store);
  const values = response.formValues.filter((value) => value !== undefined);

  const sets = Number.parseInt(String(values[0]), 10);
  if (!Number.isSafeInteger(sets) || sets < 1) {
    player.sendMessage("§cEnter a positive whole number.");
    return openStore(player, store);
  }

  const totalItems = sets * listing.quantity;
  const totalCost = sets * listing.price;
  if (!Number.isSafeInteger(totalItems) || !Number.isSafeInteger(totalCost)) {
    player.sendMessage("§cThat purchase is too large.");
    return openStore(player, store);
  }

  const inventory = player.getComponent("minecraft:inventory")?.container;
  if (!inventory) {
    player.sendMessage("§cYour inventory is unavailable.");
    return openStore(player, store);
  }
  if (capacityForStoredItem(inventory, listing.item) < totalItems) {
    player.sendMessage("§cYou do not have enough inventory space for this purchase.");
    return openStore(player, store);
  }
  if (!trySpendEntityScore("Money", player, totalCost)) {
    player.sendMessage(`§cYou need $${totalCost}; your balance is $${getEntityScore("Money", player)}.`);
    return openStore(player, store);
  }

  const overflow = addStoredItems(inventory, listing.item, totalItems);
  if (overflow > 0) {
    removeMatchingItems(inventory, listing.item, totalItems - overflow);
    addEntityScore("Money", player, totalCost);
    player.sendMessage("§cThe items could not be delivered; your payment was refunded.");
    return openStore(player, store);
  }

  player.sendMessage(
    `§aBought ${totalItems}x ${itemDisplayName(listing.item)} for $${totalCost}.`
  );
  return openStore(player, store);
}
