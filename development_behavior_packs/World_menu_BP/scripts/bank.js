import { ItemStack } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { transferMoney } from "./transfermoney.js";
import { mainMenu } from "./mainmenu.js";
import { getEconomySettings } from "./core/economy.js";
import {
  addStoredItems,
  capacityForStoredItem,
  removeMatchingItems,
  serializeItemStack
} from "./core/itemData.js";
import {
  addEntityScore,
  getEntityScore,
  trySpendEntityScore
} from "./core/scoreboard.js";

const COIN_ITEM = "zombie:zcoin";

export async function bank(player) {
  const name = getEconomySettings().name;
  const response = await new ActionFormData()
    .title(`${name} Bank`)
    .body(`Balance: ${getEntityScore("Money", player)} ${name}`)
    .button("Deposit Physical Coins", "textures/ui/icon_best3")
    .button("Withdraw Physical Coins", "textures/ui/haste_effect")
    .button("Transfer Balance", "textures/ui/dressing_room_customization")
    .button("§l§cBack", "textures/ui/book_arrowleft_hover")
    .show(player);
  if (response.canceled) return;
  if (response.selection === 0) return deposit(player);
  if (response.selection === 1) return withdraw(player);
  if (response.selection === 2) return transferMoney(player, () => bank(player));
  if (response.selection === 3) return mainMenu(player);
}

function countCoins(container) {
  let amount = 0;
  for (let slot = 0; slot < container.size; slot++) {
    const item = container.getItem(slot);
    if (item?.typeId === COIN_ITEM) amount += item.amount;
  }
  return amount;
}

function removeCoins(container, amount) {
  if (countCoins(container) < amount) return false;
  let remaining = amount;
  for (let slot = 0; slot < container.size && remaining > 0; slot++) {
    const item = container.getItem(slot);
    if (item?.typeId !== COIN_ITEM) continue;
    const taken = Math.min(remaining, item.amount);
    if (taken === item.amount) container.setItem(slot);
    else {
      item.amount -= taken;
      container.setItem(slot, item);
    }
    remaining -= taken;
  }
  return remaining === 0;
}

async function deposit(player) {
  const inventory = player.getComponent("minecraft:inventory")?.container;
  if (!inventory) return bank(player);
  const available = countCoins(inventory);
  if (!available) {
    player.sendMessage("§eYou have no physical coins to deposit.");
    return bank(player);
  }

  const response = await new ModalFormData()
    .title("Deposit Coins")
    .textField(`Amount (maximum ${available})`, "Whole number", { defaultValue: String(available) })
    .show(player);
  if (response.canceled) return bank(player);
  const amount = Number.parseInt(String(response.formValues[0]), 10);
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > available) {
    player.sendMessage("§cEnter a valid deposit amount.");
    return bank(player);
  }
  if (!removeCoins(inventory, amount)) {
    player.sendMessage("§cYour inventory changed before the deposit completed.");
    return bank(player);
  }
  addEntityScore("Money", player, amount);
  player.sendMessage(`§aDeposited ${amount}.`);
  return bank(player);
}

async function withdraw(player) {
  const balance = getEntityScore("Money", player);
  if (balance <= 0) {
    player.sendMessage("§eYou have no balance to withdraw.");
    return bank(player);
  }

  const response = await new ModalFormData()
    .title("Withdraw Coins")
    .textField(`Amount (maximum ${balance})`, "Whole number", { defaultValue: String(balance) })
    .show(player);
  if (response.canceled) return bank(player);
  const amount = Number.parseInt(String(response.formValues[0]), 10);
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > balance) {
    player.sendMessage("§cEnter a valid withdrawal amount.");
    return bank(player);
  }

  const inventory = player.getComponent("minecraft:inventory")?.container;
  const template = serializeItemStack(new ItemStack(COIN_ITEM, 1));
  if (!inventory || capacityForStoredItem(inventory, template) < amount) {
    player.sendMessage("§cYou do not have enough inventory space.");
    return bank(player);
  }
  if (!trySpendEntityScore("Money", player, amount)) {
    player.sendMessage("§cYour balance changed before withdrawal completed.");
    return bank(player);
  }
  const overflow = addStoredItems(inventory, template, amount);
  if (overflow > 0) {
    removeMatchingItems(inventory, template, amount - overflow);
    addEntityScore("Money", player, amount);
    player.sendMessage("§cWithdrawal failed; your balance was refunded.");
    return bank(player);
  }
  player.sendMessage(`§aWithdrew ${amount} physical coins.`);
  return bank(player);
}
