import { world } from "@minecraft/server";
import { clearAllWorldMenuData } from "./storage.js";

const PLAYER_GUIDE_TAG = "zc_worldmenu_guide_received";

const WORLD_MENU_OBJECTIVES = new Set([
  "Money",
  "MoneyDisplay",
  "admin",
  "BanList",
  "basesecurity",
  "betausers",
  "economyStart",
  "economyTransfer",
  "setspawn",
  "storeowner"
]);

function isWorldMenuObjective(id) {
  return WORLD_MENU_OBJECTIVES.has(id) || id.startsWith("rank_");
}

export function deleteAllWorldMenuData() {
  const removedObjectives = [];
  const failedObjectives = [];

  try {
    const overworld = world.getDimension("overworld");
    overworld.runCommand("scoreboard objectives setdisplay sidebar");
    overworld.runCommand("scoreboard objectives setdisplay list");
    overworld.runCommand("scoreboard objectives setdisplay belowname");
  } catch {
    // Display slots do not contain persistent World Menu data.
  }

  for (const objective of [...world.scoreboard.getObjectives()]) {
    if (!isWorldMenuObjective(objective.id)) continue;
    try {
      world.scoreboard.removeObjective(objective.id);
      removedObjectives.push(objective.id);
    } catch (error) {
      failedObjectives.push(`${objective.id}: ${error}`);
    }
  }

  clearAllWorldMenuData();
  for (const player of world.getPlayers()) {
    player.removeTag(PLAYER_GUIDE_TAG);
  }
  return { removedObjectives, failedObjectives };
}
