import { readWorldData, writeWorldData } from "./storage.js";

const BANS_KEY = "moderation:bans";

export function listBans() {
  const bans = readWorldData(BANS_KEY, []);
  return Array.isArray(bans) ? bans : [];
}

export function banPlayerRecord({ id, name, reason = "Banned by an administrator." }) {
  const normalizedName = String(name ?? "").trim();
  if (!normalizedName) throw new Error("Player name cannot be empty.");

  const bans = listBans().filter((ban) =>
    id ? ban.id !== id : ban.name.toLocaleLowerCase() !== normalizedName.toLocaleLowerCase()
  );
  const record = { id, name: normalizedName, reason };
  bans.push(record);
  writeWorldData(BANS_KEY, bans);
  return record;
}

export function unbanPlayerRecord(record) {
  writeWorldData(
    BANS_KEY,
    listBans().filter((ban) =>
      record.id ? ban.id !== record.id : ban.name !== record.name
    )
  );
}

export function getPlayerBan(player) {
  const normalizedName = player.name.toLocaleLowerCase();
  return listBans().find((ban) =>
    (ban.id && ban.id === player.id)
    || ban.name.toLocaleLowerCase() === normalizedName
  );
}

export function enforcePlayerBan(player) {
  const ban = getPlayerBan(player);
  if (!ban) return false;
  try {
    player.runCommand(`kick @s ${ban.reason}`);
  } catch (error) {
    console.warn(`[World Menu] Could not kick banned player ${player.name}: ${error}`);
  }
  return true;
}
