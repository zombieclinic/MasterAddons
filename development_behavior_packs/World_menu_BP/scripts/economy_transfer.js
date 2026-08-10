import { world } from "@minecraft/server";
import { getEconomySettings } from "./core/economy.js";
import {
  addEntityScore,
  ensureObjective,
  getEntityScore,
  hasEntityScore,
  setEntityScore
} from "./core/scoreboard.js";

export function economyTransfer(player) {
  const settings = getEconomySettings();
  if (!settings.transferVisible || !settings.oldObjectiveId) {
    player.sendMessage("§cEconomy conversion is not configured.");
    return;
  }

  const oldObjective = world.scoreboard.getObjective(settings.oldObjectiveId);
  if (!oldObjective) {
    player.sendMessage("§cThe configured old economy no longer exists.");
    return;
  }
  const status = ensureObjective("economyTransfer", "Economy Conversion Status");
  if (getEntityScore(status, player, 0) === 1) {
    player.sendMessage("§cYou already converted this economy.");
    return;
  }

  const amount = getEntityScore(oldObjective, player, 0);
  if (amount <= 0) {
    player.sendMessage("§cYou have no old balance to convert.");
    return;
  }

  addEntityScore("Money", player, amount, settings.name);
  setEntityScore(oldObjective, player, 0);
  setEntityScore(status, player, 1);
  player.sendMessage(`§aConverted ${amount} ${settings.name}.`);
}
