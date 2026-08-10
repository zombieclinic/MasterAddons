import { world } from "@minecraft/server";

const PREFIX = "wm:";
const GENERATION_ID = `${PREFIX}dataGeneration`;

function currentGeneration() {
  const generation = world.getDynamicProperty(GENERATION_ID);
  return typeof generation === "string" ? generation : undefined;
}

function playerDataIsCurrent(player) {
  const generation = currentGeneration();
  if (!generation) return true;
  return player.getDynamicProperty(GENERATION_ID) === generation;
}

export function readWorldData(key, fallback) {
  const raw = world.getDynamicProperty(`${PREFIX}${key}`);
  if (typeof raw !== "string" || raw.length === 0) return fallback;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`[World Menu] Invalid stored data for ${key}: ${error}`);
    return fallback;
  }
}

export function writeWorldData(key, value) {
  const id = `${PREFIX}${key}`;
  if (value === undefined) {
    world.setDynamicProperty(id);
    return;
  }
  world.setDynamicProperty(id, JSON.stringify(value));
}

export function stablePlayerKey(player) {
  return player.id;
}

export function readPlayerData(player, key, fallback) {
  if (!playerDataIsCurrent(player)) return fallback;
  const raw = player.getDynamicProperty(`${PREFIX}${key}`);
  if (typeof raw !== "string" || raw.length === 0) return fallback;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`[World Menu] Invalid player data ${key} for ${player.name}: ${error}`);
    return fallback;
  }
}

export function writePlayerData(player, key, value) {
  const generation = currentGeneration();
  if (generation) player.setDynamicProperty(GENERATION_ID, generation);

  const id = `${PREFIX}${key}`;
  if (value === undefined) {
    player.setDynamicProperty(id);
    return;
  }
  player.setDynamicProperty(id, JSON.stringify(value));
}

export function clearAllWorldMenuData() {
  for (const id of world.getDynamicPropertyIds()) {
    if (id.startsWith(PREFIX)) world.setDynamicProperty(id);
  }

  for (const player of world.getPlayers()) {
    for (const id of player.getDynamicPropertyIds()) {
      if (id.startsWith(PREFIX)) player.setDynamicProperty(id);
    }
  }

  // Offline players cannot be edited. A new generation makes their old
  // World Menu player properties unreadable if they return later.
  const generation = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  world.setDynamicProperty(GENERATION_ID, generation);
}
