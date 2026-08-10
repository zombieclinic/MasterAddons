import { world } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import {
  addEntityScore,
  getEntityScore,
  trySpendEntityScore
} from "./core/scoreboard.js";

export async function transferMoney(player, back = () => {}) {
  const players = [...world.getPlayers()]
    .filter((target) => target.id !== player.id)
    .sort((left, right) => left.name.localeCompare(right.name));
  const form = new ActionFormData()
    .title("Transfer Money")
    .body(`Your balance: $${getEntityScore("Money", player)}`)
    .button("§l§cBack");
  for (const target of players) form.button(target.name);
  const response = await form.show(player);
  if (response.canceled || response.selection === 0) return back();
  const target = players[response.selection - 1];
  if (!target) return transferMoney(player, back);

  const amountResponse = await new ModalFormData()
    .title(`Transfer to ${target.name}`)
    .textField("Amount", "Positive whole number", { defaultValue: "1" })
    .show(player);
  if (amountResponse.canceled) return transferMoney(player, back);
  const amount = Number.parseInt(String(amountResponse.formValues[0]), 10);
  if (!Number.isSafeInteger(amount) || amount < 1) {
    player.sendMessage("§cEnter a positive whole number.");
    return transferMoney(player, back);
  }
  if (!trySpendEntityScore("Money", player, amount)) {
    player.sendMessage("§cYou do not have enough money.");
    return transferMoney(player, back);
  }
  try {
    addEntityScore("Money", target, amount);
    player.sendMessage(`§aTransferred $${amount} to ${target.name}.`);
    target.sendMessage(`§a${player.name} transferred $${amount} to you.`);
  } catch (error) {
    addEntityScore("Money", player, amount);
    player.sendMessage(`§cTransfer failed; your money was refunded. ${error}`);
  }
  return back();
}
