import { readWorldData, writeWorldData } from "./storage.js";

const INDEX_KEY = "shops:index";
const SHOP_KEY_PREFIX = "shops:data:";
const SHOP_TYPES = new Set(["server", "player", "sell"]);

function newId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function readIndex() {
  const index = readWorldData(INDEX_KEY, []);
  return Array.isArray(index) ? index : [];
}

function writeIndex(index) {
  writeWorldData(INDEX_KEY, [...new Set(index)]);
}

export function listShops(type) {
  return readIndex()
    .map((id) => getShop(id))
    .filter((shop) => shop && (!type || shop.type === type));
}

export function getShop(id) {
  const shop = readWorldData(`${SHOP_KEY_PREFIX}${id}`);
  return shop && typeof shop === "object" ? shop : undefined;
}

export function createShop({ type, name, owner }) {
  if (!SHOP_TYPES.has(type)) throw new Error(`Unsupported shop type: ${type}`);

  const trimmedName = String(name ?? "").trim();
  if (!trimmedName) throw new Error("Shop name cannot be empty.");

  const id = newId();
  const shop = {
    version: 2,
    id,
    type,
    name: trimmedName,
    ownerId: owner?.id,
    ownerName: owner?.name,
    pendingBalance: 0,
    listings: []
  };

  writeWorldData(`${SHOP_KEY_PREFIX}${id}`, shop);
  writeIndex([...readIndex(), id]);
  return shop;
}

export function saveShop(shop) {
  if (!shop?.id || !SHOP_TYPES.has(shop.type)) {
    throw new Error("Cannot save invalid shop data.");
  }
  writeWorldData(`${SHOP_KEY_PREFIX}${shop.id}`, shop);
  if (!readIndex().includes(shop.id)) {
    writeIndex([...readIndex(), shop.id]);
  }
  return shop;
}

export function deleteShop(id) {
  writeWorldData(`${SHOP_KEY_PREFIX}${id}`);
  writeIndex(readIndex().filter((entry) => entry !== id));
}

export function addListing(shop, { item, quantity, price, stock }) {
  const listing = {
    id: newId(),
    item: { ...item, amount: 1 },
    quantity: Math.max(1, Math.trunc(quantity)),
    price: Math.max(0, Math.trunc(price))
  };
  if (stock !== undefined) listing.stock = Math.max(0, Math.trunc(stock));

  shop.listings.push(listing);
  saveShop(shop);
  return listing;
}

export function updateListing(shop, listingId, changes) {
  const listing = shop.listings.find((entry) => entry.id === listingId);
  if (!listing) throw new Error("Shop listing no longer exists.");

  if (changes.quantity !== undefined) {
    listing.quantity = Math.max(1, Math.trunc(changes.quantity));
  }
  if (changes.price !== undefined) {
    listing.price = Math.max(0, Math.trunc(changes.price));
  }
  if (changes.stock !== undefined) {
    listing.stock = Math.max(0, Math.trunc(changes.stock));
  }
  saveShop(shop);
  return listing;
}

export function removeListing(shop, listingId) {
  const index = shop.listings.findIndex((entry) => entry.id === listingId);
  if (index < 0) return undefined;
  const [removed] = shop.listings.splice(index, 1);
  saveShop(shop);
  return removed;
}

export function isShopOwner(player, shop) {
  return Boolean(player && shop && player.id === shop.ownerId);
}
