import { getEntityScore, hasEntityScore, setEntityScore } from "./scoreboard.js";
import { readPlayerData, writePlayerData } from "./storage.js";
import { world } from "@minecraft/server";

const OWNER_KEY = "permissions:owner";

export function isOwner(player) {
  return readPlayerData(player, OWNER_KEY, false) === true;
}

export function setOwner(player, value) {
  writePlayerData(player, OWNER_KEY, Boolean(value));
}

export function getAdminRank(player) {
  if (!hasEntityScore("admin", player)) return undefined;
  return getEntityScore("admin", player);
}

export function setAdminRank(player, rank) {
  return setEntityScore("admin", player, rank, "Admin Settings");
}

export function isAdministrator(player) {
  return isOwner(player) || getAdminRank(player) !== undefined;
}

export function migrateLegacyPermissions(player) {
  const admin = world.scoreboard.getObjective("admin");
  if (!admin) return;

  const ownerEntry = admin.getParticipants()
    .find((entry) => entry.displayName === `admin_${player.name}_owner`);
  if (ownerEntry) setOwner(player, true);

  if (!hasEntityScore(admin, player)) {
    const rankEntry = admin.getParticipants()
      .find((entry) => entry.displayName === `admin_${player.name}`);
    if (rankEntry) setAdminRank(player, admin.getScore(rankEntry));
  }
}
