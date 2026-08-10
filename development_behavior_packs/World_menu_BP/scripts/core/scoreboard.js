import { world } from "@minecraft/server";
import { readWorldData, writeWorldData } from "./storage.js";

const BASE_SECURITY_STORAGE_KEY = "settings:baseSecurity";
const DEFAULT_BASE_SECURITY_SETTINGS = Object.freeze({
  radius: 150,
  maximum: 1,
  minimumOrigin: 100,
  minimumSpawn: 1000,
  cost: 0,
  minimumOther: 500
});
const BASE_SECURITY_FIELDS = Object.freeze({
  radius: { score: "basesecurityrange", minimum: 1 },
  maximum: { score: "basesecuritycount", minimum: 0 },
  minimumOrigin: { score: "baseXY", minimum: 1 },
  minimumSpawn: { score: "basespawndistance", minimum: 1 },
  cost: { score: "basesucurtycost", minimum: 0 },
  minimumOther: { score: "basePlayerDistance", minimum: 1 }
});

export function ensureObjective(id, displayName = id) {
  return world.scoreboard.getObjective(id)
    ?? world.scoreboard.addObjective(id, displayName);
}

export function getEntityScore(objectiveOrId, entity, fallback = 0) {
  const objective = typeof objectiveOrId === "string"
    ? world.scoreboard.getObjective(objectiveOrId)
    : objectiveOrId;
  const identity = entity?.scoreboardIdentity;
  if (!objective || !identity) return fallback;

  try {
    return objective.getScore(identity) ?? fallback;
  } catch {
    return fallback;
  }
}

export function hasEntityScore(objectiveOrId, entity) {
  const objective = typeof objectiveOrId === "string"
    ? world.scoreboard.getObjective(objectiveOrId)
    : objectiveOrId;
  const identity = entity?.scoreboardIdentity;
  if (!objective || !identity) return false;

  try {
    return objective.hasParticipant(identity);
  } catch {
    return objective.getParticipants().some((entry) => entry.id === identity.id);
  }
}

export function setEntityScore(objectiveOrId, entity, value, displayName) {
  const objective = typeof objectiveOrId === "string"
    ? ensureObjective(objectiveOrId, displayName)
    : objectiveOrId;
  const identity = entity?.scoreboardIdentity;
  if (!objective || !entity) throw new Error("A valid entity and objective are required.");

  // Passing the Entity is name-safe and lets Bedrock create its scoreboard
  // identity during the brief join window where scoreboardIdentity is absent.
  objective.setScore(identity ?? entity, Math.trunc(value));
  return Math.trunc(value);
}

export function addEntityScore(objectiveOrId, entity, amount, displayName) {
  const objective = typeof objectiveOrId === "string"
    ? ensureObjective(objectiveOrId, displayName)
    : objectiveOrId;
  const next = getEntityScore(objective, entity) + Math.trunc(amount);
  return setEntityScore(objective, entity, next);
}

export function trySpendEntityScore(objectiveOrId, entity, amount) {
  const objective = typeof objectiveOrId === "string"
    ? world.scoreboard.getObjective(objectiveOrId)
    : objectiveOrId;
  const cost = Math.trunc(amount);
  if (!objective || cost < 0) return false;

  const balance = getEntityScore(objective, entity);
  if (balance < cost) return false;
  setEntityScore(objective, entity, balance - cost);
  return true;
}

export function getFakeScore(objectiveOrId, participantName, fallback = 0) {
  const objective = typeof objectiveOrId === "string"
    ? world.scoreboard.getObjective(objectiveOrId)
    : objectiveOrId;
  if (!objective) return fallback;

  // Modern Bedrock accepts a fake-player name directly. Prefer this path so
  // the lookup does not depend on a participant list having refreshed yet.
  try {
    const directScore = objective.getScore(participantName);
    if (directScore !== undefined) return directScore;
  } catch {
    // Older runtimes require resolving the participant first.
  }

  const participant = objective.getParticipants()
    .find((entry) => entry.displayName === participantName);
  if (!participant) return fallback;

  try {
    return objective.getScore(participant) ?? fallback;
  } catch {
    return fallback;
  }
}

export function hasFakeScore(objectiveOrId, participantName, expectedValue) {
  const objective = typeof objectiveOrId === "string"
    ? world.scoreboard.getObjective(objectiveOrId)
    : objectiveOrId;
  if (!objective) return false;

  const participant = objective.getParticipants()
    .find((entry) => entry.displayName === participantName);
  if (!participant) return false;
  if (expectedValue === undefined) return true;

  try {
    return objective.getScore(participant) === expectedValue;
  } catch {
    return false;
  }
}

export function getBaseSecuritySettings() {
  const stored = readWorldData(BASE_SECURITY_STORAGE_KEY, {});
  const admin = world.scoreboard.getObjective("admin");
  const settings = {};

  for (const [property, field] of Object.entries(BASE_SECURITY_FIELDS)) {
    const savedValue = Number(stored?.[property]);
    if (validBaseSetting(savedValue, field.minimum)) {
      settings[property] = savedValue;
      continue;
    }

    const legacyScore = getFakeScore(admin, field.score, Number.NaN);
    settings[property] = validBaseSetting(legacyScore, field.minimum)
      ? legacyScore
      : DEFAULT_BASE_SECURITY_SETTINGS[property];
  }
  return settings;
}

export function saveBaseSecuritySettings(settings) {
  const normalized = {};
  for (const [property, field] of Object.entries(BASE_SECURITY_FIELDS)) {
    const value = Math.trunc(Number(settings?.[property]));
    if (!validBaseSetting(value, field.minimum)) {
      throw new Error(`Invalid base security setting: ${property}`);
    }
    normalized[property] = value;
  }

  writeWorldData(BASE_SECURITY_STORAGE_KEY, normalized);
  const admin = ensureObjective("admin", "Admin Controls");
  for (const [property, field] of Object.entries(BASE_SECURITY_FIELDS)) {
    admin.setScore(field.score, normalized[property]);
  }
  return normalized;
}

function validBaseSetting(value, minimum) {
  return Number.isFinite(value) && value >= minimum;
}
