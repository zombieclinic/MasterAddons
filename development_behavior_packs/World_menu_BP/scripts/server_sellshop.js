import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { mainMenu } from "./mainmenu.js";
import {
  countMatchingItems,
  itemDisplayName,
  itemMetadataText,
  removeMatchingItems
} from "./core/itemData.js";
import { listShops } from "./core/shops.js";
import { addEntityScore, getEntityScore } from "./core/scoreboard.js";

export async function serverSellShop(player) {
  const shops = listShops("sell");
  const form = new ActionFormData()
    .title("Sell Shops")
    .body(shops.length ? "Choose a shop." : "No sell shops are available.")
    .button("§l§cBack", "textures/ui/book_arrowleft_hover");
  for (const shop of shops) form.button(shop.name, "textures/ui/MCoin");

  const response = await form.show(player);
  if (response.canceled) return;
  if (response.selection === 0) return mainMenu(player);
  const shop = shops[response.selection - 1];
  if (shop) return viewShop(player, shop);
}

async function viewShop(player, shop) {
  const form = new ActionFormData()
    .title(shop.name)
    .body(`Balance: $${getEntityScore("Money", player)}\nOnly exact item variants are accepted.`)
    .button("§l§cBack", "textures/ui/book_arrowleft_hover");

  for (const listing of shop.listings) {
    const enchanted = listing.item.enchantments?.length ? " §d✦" : "";
    form.button(
      `${itemDisplayName(listing.item)}${enchanted} x${listing.quantity}\nPays $${listing.price}`,
      "textures/ui/MCoin"
    );
  }

  const response = await form.show(player);
  if (response.canceled) return;
  if (response.selection === 0) return serverSellShop(player);
  const listing = shop.listings[response.selection - 1];
  if (listing) return chooseSets(player, shop, listing);
}

async function chooseSets(player, shop, listing) {
  const inventory = player.getComponent("minecraft:inventory")?.container;
  if (!inventory) {
    player.sendMessage("§cYour inventory is unavailable.");
    return viewShop(player, shop);
  }

  const matching = countMatchingItems(inventory, listing.item);
  const availableSets = Math.floor(matching / listing.quantity);
  if (availableSets < 1) {
    player.sendMessage(
      `§cYou need ${listing.quantity} matching ${itemDisplayName(listing.item)}.`
    );
    return viewShop(player, shop);
  }

  const response = await new ModalFormData()
    .title(`Sell ${itemDisplayName(listing.item)}`)
    .label(itemMetadataText(listing.item))
    .textField(
      `Sets to sell (maximum ${availableSets}, $${listing.price} each)`,
      "Whole number",
      { defaultValue: "1" }
    )
    .show(player);
  if (response.canceled) return viewShop(player, shop);
  const values = response.formValues.filter((value) => value !== undefined);

  const sets = Number.parseInt(String(values[0]), 10);
  if (!Number.isSafeInteger(sets) || sets < 1 || sets > availableSets) {
    player.sendMessage(`§cEnter a whole number from 1 to ${availableSets}.`);
    return viewShop(player, shop);
  }

  const itemCount = sets * listing.quantity;
  const earnings = sets * listing.price;
  if (!Number.isSafeInteger(itemCount) || !Number.isSafeInteger(earnings)) {
    player.sendMessage("§cThat transaction is too large.");
    return viewShop(player, shop);
  }
  if (!removeMatchingItems(inventory, listing.item, itemCount)) {
    player.sendMessage("§cYour inventory changed before the sale could complete.");
    return viewShop(player, shop);
  }

  addEntityScore("Money", player, earnings);
  player.sendMessage(
    `§aSold ${itemCount}x ${itemDisplayName(listing.item)} for $${earnings}.`
  );
  return viewShop(player, shop);
}
