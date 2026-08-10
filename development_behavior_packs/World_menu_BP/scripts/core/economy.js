import { world } from "@minecraft/server";
import { ensureObjective, getEntityScore, setEntityScore } from "./scoreboard.js";
import { readWorldData, writeWorldData } from "./storage.js";

const SETTINGS_KEY = "economy:settings";
const PENDING_BALANCES_KEY = "economy:pendingBalances";

export function getEconomySettings() {
  return {
    name: "Money",
    displayMode: "none",
    actionBarTemplate: "§d{player}\\n§6{economy} - $ {money}",
    startingBalance: 0,
    oldObjectiveId: undefined,
    transferVisible: false,
    ...readWorldData(SETTINGS_KEY, {})
  };
}

export function economyActionBarText(player) {
  const settings = getEconomySettings();
  const balance = getEntityScore("Money", player);
  return String(settings.actionBarTemplate ?? "")
    .replace(/\\n/g, "\n")
    .replaceAll("{player}", player.name)
    .replaceAll("{economy}", settings.name)
    .replaceAll("{money}", Number(balance).toLocaleString("en-US"));
}

export function saveEconomySettings(changes) {
  const settings = { ...getEconomySettings(), ...changes };
  writeWorldData(SETTINGS_KEY, settings);
  return settings;
}

export function ensureEconomyObjectives() {
  const settings = getEconomySettings();
  const money = ensureObjective("Money", settings.name);
  const display = ensureObjective("MoneyDisplay", settings.name);
  return { money, display };
}

export function renameEconomyObjectives(name) {
  const trimmedName = String(name ?? "").trim();
  if (!trimmedName) throw new Error("Economy name cannot be empty.");

  const money = world.scoreboard.getObjective("Money");
  const pending = readWorldData(PENDING_BALANCES_KEY, []);
  const pendingBalances = Array.isArray(pending) ? [...pending] : [];
  const onlinePlayers = [...world.getPlayers()];
  const onlineBalances = [];

  if (money) {
    for (const entry of money.getScores()) {
      const online = onlinePlayers.find(
        (player) => player.scoreboardIdentity?.id === entry.participant.id
      );
      if (online) {
        onlineBalances.push({ player: online, score: entry.score });
      } else {
        const key = entry.participant.displayName.toLocaleLowerCase();
        const existing = pendingBalances.findIndex(
          (record) => record.name.toLocaleLowerCase() === key
        );
        const record = { name: entry.participant.displayName, score: entry.score };
        if (existing >= 0) pendingBalances[existing] = record;
        else pendingBalances.push(record);
      }
    }
  }

  const settings = saveEconomySettings({ name: trimmedName });
  applyEconomyDisplay("none");
  for (const id of ["Money", "MoneyDisplay"]) {
    if (world.scoreboard.getObjective(id)) world.scoreboard.removeObjective(id);
  }

  const objectives = ensureEconomyObjectives();
  for (const balance of onlineBalances) {
    setEntityScore(objectives.money, balance.player, balance.score);
    setEntityScore(objectives.display, balance.player, balance.score);
  }
  writeWorldData(PENDING_BALANCES_KEY, pendingBalances);
  applyEconomyDisplay(settings.displayMode);
  return settings;
}

export function restorePendingEconomyBalance(player, objective) {
  const stored = readWorldData(PENDING_BALANCES_KEY, []);
  if (!Array.isArray(stored) || !stored.length) return false;

  const key = player.name.toLocaleLowerCase();
  const index = stored.findIndex((record) => record.name?.toLocaleLowerCase() === key);
  if (index < 0) return false;

  const [record] = stored.splice(index, 1);
  setEntityScore(objective ?? "Money", player, Number(record.score) || 0);
  writeWorldData(PENDING_BALANCES_KEY, stored);
  return true;
}

export function applyEconomyDisplay(mode = getEconomySettings().displayMode) {
  const overworld = world.getDimension("overworld");
  try {
    overworld.runCommand("scoreboard objectives setdisplay sidebar");
    overworld.runCommand("scoreboard objectives setdisplay list");
    if (mode === "sidebar" || mode === "both" || mode === "actionbar_sidebar") {
      overworld.runCommand("scoreboard objectives setdisplay sidebar MoneyDisplay");
    }
    if (mode === "list_ascending") {
      overworld.runCommand("scoreboard objectives setdisplay list MoneyDisplay ascending");
    } else if (mode === "list_descending") {
      overworld.runCommand("scoreboard objectives setdisplay list MoneyDisplay descending");
    } else if (mode === "both") {
      overworld.runCommand("scoreboard objectives setdisplay list MoneyDisplay");
    }
  } catch (error) {
    console.warn(`[World Menu] Could not update economy display: ${error}`);
  }
}
