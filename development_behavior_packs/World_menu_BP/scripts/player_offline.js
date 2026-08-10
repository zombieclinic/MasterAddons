import { world } from "@minecraft/server";
import {
  addEntityScore,
  ensureObjective,
  getEntityScore,
  getFakeScore,
  setEntityScore
} from "./core/scoreboard.js";
import {
  applyEconomyDisplay,
  ensureEconomyObjectives,
  getEconomySettings,
  restorePendingEconomyBalance
} from "./core/economy.js";

export function immediatePlayerOfflineCommandLeave() {
  try {
    const admin = world.scoreboard.getObjective("admin");
    if (!admin) return;

    const { money, display: moneyDisplay } = ensureEconomyObjectives();
    const initialized = ensureObjective("economyStart", "Economy Started");
    const settings = getEconomySettings();

    applyEconomyDisplay(settings.displayMode);

    for (const player of world.getPlayers()) {
      if (!player.scoreboardIdentity) continue;
      restorePendingEconomyBalance(player, money);
      if (getEntityScore(initialized, player, 0) !== 1) {
        setEntityScore(initialized, player, 1);
        if (settings.startingBalance > 0) {
          addEntityScore(money, player, settings.startingBalance);
          player.sendMessage(`§aYou received your starting balance of ${settings.startingBalance}.`);
        }
      }
      setEntityScore(moneyDisplay, player, getEntityScore(money, player));
    }
  } catch (error) {
    console.error(`[World Menu] Economy synchronization failed: ${error}`);
  }
}
