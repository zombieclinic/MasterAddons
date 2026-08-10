import { readWorldData, writeWorldData } from "./storage.js";

const INDEX_KEY = "bases:index";
const DATA_PREFIX = "bases:data:";
const FRIENDS_PREFIX = "bases:friends:";

function newId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

function index() {
  const stored = readWorldData(INDEX_KEY, []);
  return Array.isArray(stored) ? stored : [];
}

function saveIndex(ids) {
  writeWorldData(INDEX_KEY, [...new Set(ids)]);
}

export function listBases() {
  return index().map(getBase).filter(Boolean);
}

export function getBase(id) {
  const base = readWorldData(`${DATA_PREFIX}${id}`);
  return base && typeof base === "object" ? base : undefined;
}

export function saveBase(base) {
  if (!base?.id || !base.ownerId) throw new Error("Invalid base data.");
  writeWorldData(`${DATA_PREFIX}${base.id}`, base);
  if (!index().includes(base.id)) saveIndex([...index(), base.id]);
  return base;
}

export function createBase(player, location) {
  const base = {
    version: 2,
    id: newId(),
    ownerId: player.id,
    ownerName: player.name,
    name: `Base ${listOwnerBases(player.id).length + 1}`,
    enabled: true,
    dimensionId: player.dimension.id,
    x: Math.floor(location.x),
    y: Math.floor(location.y),
    z: Math.floor(location.z)
  };
  return saveBase(base);
}

export function deleteBase(id) {
  writeWorldData(`${DATA_PREFIX}${id}`);
  saveIndex(index().filter((entry) => entry !== id));
}

export function listOwnerBases(ownerId) {
  return listBases().filter((base) => base.ownerId === ownerId);
}

export function getFriends(ownerId) {
  const friends = readWorldData(`${FRIENDS_PREFIX}${ownerId}`, []);
  return Array.isArray(friends) ? friends : [];
}

export function saveFriends(ownerId, friends) {
  writeWorldData(`${FRIENDS_PREFIX}${ownerId}`, friends);
}

export function isAllowedAtBase(player, base) {
  if (player.id === base.ownerId) return true;
  const normalizedName = player.name.toLocaleLowerCase();
  return getFriends(base.ownerId).some((friend) =>
    (friend.id && friend.id === player.id)
    || friend.name?.toLocaleLowerCase() === normalizedName
  );
}
