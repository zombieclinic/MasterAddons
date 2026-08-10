import { EquipmentSlot, world } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { playerMenuSettings } from "./playermenusettings.js";
import { getFakeScore } from "../core/scoreboard.js";
import {
  itemDisplayName,
  itemMetadataText,
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

function heldItem(player) {
  return player.getComponent("minecraft:equippable")
    ?.getEquipment(EquipmentSlot.Mainhand);
}

function integer(value, minimum, label) {
  const result = Number.parseInt(String(value), 10);
  if (!Number.isSafeInteger(result) || result < minimum) {
    throw new Error(`${label} must be a whole number of at least ${minimum}.`);
  }
  return result;
}

export async function sellShop(player) {
  const admin = world.scoreboard.getObjective("admin")
    ?? world.scoreboard.addObjective("admin", "Admin Controls");
  const visible = getFakeScore(admin, "sellshop", 0) === 1;
  const shops = listShops("sell");

  const form = new ActionFormData()
    .title("Sell Shops")
    .body("Sell listings match the complete held item, including enchantments and custom data.")
    .button(`Sell Shops: ${visible ? "§aVisible" : "§cHidden"}`, "textures/ui/mashup_world")
    .button("Add Shop", "textures/ui/mining_fatigue_effect")
    .button("§l§cBack", "textures/ui/book_arrowleft_hover");
  for (const shop of shops) form.button(shop.name, "textures/ui/MCoin");

  const response = await form.show(player);
  if (response.canceled) return;
  if (response.selection === 0) {
    admin.setScore("sellshop", visible ? 0 : 1);
    return sellShop(player);
  }
  if (response.selection === 1) return createSellShop(player);
  if (response.selection === 2) return playerMenuSettings(player);
  const selected = shops[response.selection - 3];
  if (selected) return manageShop(player, selected);
}

async function createSellShop(player) {
  const response = await new ModalFormData()
    .title("Create Sell Shop")
    .textField("Shop name", "Example: Enchanted Gear Exchange")
    .show(player);
  if (response.canceled) return sellShop(player);

  try {
    const shop = createShop({
      type: "sell",
      name: response.formValues[0],
      owner: player
    });
    return manageShop(player, shop);
  } catch (error) {
    player.sendMessage(`§c${error.message}`);
    return sellShop(player);
  }
}

async function manageShop(player, shop) {
  const current = listShops("sell").find((entry) => entry.id === shop.id);
  if (!current) return sellShop(player);

  const form = new ActionFormData()
    .title(`Manage: ${current.name}`)
    .body("Hold the exact item players must provide, then choose Add Held Item.")
    .button("§l§cBack", "textures/ui/book_arrowleft_hover")
    .button("Add Held Item", "textures/ui/mashup_world")
    .button("Rename Shop", "textures/ui/anvil_icon")
    .button("Remove Shop", "textures/ui/mining_fatigue_effect");

  for (const listing of current.listings) {
    const enchanted = listing.item.enchantments?.length ? " §d✦" : "";
    form.button(
      `${itemDisplayName(listing.item)}${enchanted} x${listing.quantity} - $${listing.price}`,
      "textures/ui/MCoin"
    );
  }

  const response = await form.show(player);
  if (response.canceled || response.selection === 0) return sellShop(player);
  if (response.selection === 1) return addHeldListing(player, current);
  if (response.selection === 2) return renameShop(player, current);
  if (response.selection === 3) return removeShop(player, current);
  const listing = current.listings[response.selection - 4];
  if (listing) return editListing(player, current, listing);
}

async function addHeldListing(player, shop) {
  const held = heldItem(player);
  if (!held) {
    player.sendMessage("§cHold the exact item this shop should accept.");
    return manageShop(player, shop);
  }

  const item = serializeItemStack(held);
  const response = await new ModalFormData()
    .title(`Accept ${itemDisplayName(item)}`)
    .label(itemMetadataText(item))
    .textField("Items required per set", "Whole number", { defaultValue: String(held.amount) })
    .textField("Money paid per set", "Whole number", { defaultValue: "1" })
    .show(player);
  if (response.canceled) return manageShop(player, shop);
  const values = response.formValues.filter((value) => value !== undefined);

  try {
    addListing(shop, {
      item,
      quantity: integer(values[0], 1, "Set size"),
      price: integer(values[1], 0, "Payout")
    });
  } catch (error) {
    player.sendMessage(`§c${error.message}`);
  }
  return manageShop(player, shop);
}

async function editListing(player, shop, listing) {
  const response = await new ModalFormData()
    .title(`Edit ${itemDisplayName(listing.item)}`)
    .label(itemMetadataText(listing.item))
    .textField("Items required per set", "Whole number", { defaultValue: String(listing.quantity) })
    .textField("Money paid per set", "Whole number", { defaultValue: String(listing.price) })
    .toggle("Remove listing", { defaultValue: false })
    .show(player);
  if (response.canceled) return manageShop(player, shop);
  const values = response.formValues.filter((value) => value !== undefined);

  try {
    if (values[2]) {
      removeListing(shop, listing.id);
    } else {
      updateListing(shop, listing.id, {
        quantity: integer(values[0], 1, "Set size"),
        price: integer(values[1], 0, "Payout")
      });
    }
  } catch (error) {
    player.sendMessage(`§c${error.message}`);
  }
  return manageShop(player, shop);
}

async function renameShop(player, shop) {
  const response = await new ModalFormData()
    .title("Rename Sell Shop")
    .textField("Shop name", "Shop name", { defaultValue: shop.name })
    .show(player);
  if (response.canceled) return manageShop(player, shop);

  const name = String(response.formValues[0] ?? "").trim();
  if (name) {
    shop.name = name;
    saveShop(shop);
  } else {
    player.sendMessage("§cShop name cannot be empty.");
  }
  return manageShop(player, shop);
}

async function removeShop(player, shop) {
  const response = await new MessageFormData()
    .title("Remove Sell Shop")
    .body(`Remove “${shop.name}” and all listings?`)
    .button1("Cancel")
    .button2("§cRemove")
    .show(player);
  if (!response.canceled && response.selection === 1) {
    deleteShop(shop.id);
    return sellShop(player);
  }
  return manageShop(player, shop);
}
