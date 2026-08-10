import { system, world } from "@minecraft/server";
import { isAdministrator } from "./core/permissions.js";
import { getBaseSecuritySettings } from "./core/scoreboard.js";
import { isAllowedAtBase, listBases } from "./core/bases.js";

const messageCooldowns = new Map();
let initialized = false;

export function initializeBaseProtection() {
  if (initialized) return;
  initialized = true;

  world.beforeEvents.playerBreakBlock.subscribe((event) => {
    const base = restrictedBaseAt(event.player, event.block.location);
    if (!base) return;
    event.cancel = true;
    warn(event.player, base, "break blocks");
  });

  world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    if (!isContainer(event.block)) return;
    const base = restrictedBaseAt(event.player, event.block.location);
    if (!base) return;
    event.cancel = true;
    warn(event.player, base, "open containers");
  });
}

function restrictedBaseAt(player, location) {
  if (isAdministrator(player)) return undefined;
  const radius = getBaseSecuritySettings().radius;
  const radiusSquared = radius * radius;

  return listBases().find((base) => {
    if (!base.enabled || base.dimensionId !== player.dimension.id) return false;
    if (isAllowedAtBase(player, base)) return false;
    const dx = location.x - base.x;
    const dy = location.y - base.y;
    const dz = location.z - base.z;
    return dx * dx + dy * dy + dz * dz <= radiusSquared;
  });
}

function isContainer(block) {
  try {
    if (block.getComponent("inventory") || block.getComponent("minecraft:inventory")) return true;
  } catch {
    // Some container blocks expose no inventory component in before-events.
  }

  const id = block.typeId;
  return id.includes("chest")
    || id.includes("shulker_box")
    || id.includes("barrel")
    || id.includes("hopper")
    || id.includes("furnace")
    || id.includes("smoker")
    || id.includes("blast_furnace")
    || id.includes("dispenser")
    || id.includes("dropper")
    || id.includes("brewing_stand");
}

function warn(player, base, action) {
  const nextAllowed = messageCooldowns.get(player.id) ?? 0;
  if (system.currentTick < nextAllowed) return;
  messageCooldowns.set(player.id, system.currentTick + 40);
  system.run(() => {
    if (!player.isValid) return;
    player.sendMessage(
      `§cYou cannot ${action} inside ${base.ownerName}'s ${base.name}. Ask to be added as a basemate.`
    );
  });
}
