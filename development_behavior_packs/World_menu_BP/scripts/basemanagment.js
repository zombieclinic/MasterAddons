import { world } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { editFriendsMenu } from "./freindslist_tab.js";
import { mainMenu } from "./mainmenu.js";
import {
  createBase,
  deleteBase,
  listBases,
  listOwnerBases,
  saveBase
} from "./core/bases.js";
import {
  addEntityScore,
  getBaseSecuritySettings,
  getEntityScore,
  trySpendEntityScore
} from "./core/scoreboard.js";
import { readWorldData } from "./core/storage.js";

function rules() {
  return getBaseSecuritySettings();
}

export async function baseManagement(player) {
  const config = rules();
  const response = await new ActionFormData()
    .title("Base Security")
    .body(
      `Maximum bases: ${config.maximum}\nCost: $${config.cost}\n` +
      `Protection radius: ${config.radius}\n` +
      `Minimum from spawn: ${config.minimumSpawn}\n` +
      `Minimum spacing: ${config.minimumOther}`
    )
    .button("Manage Bases", "textures/ui/icon_summer")
    .button("Manage Base Members", "textures/ui/FriendsIcon")
    .button("§l§cBack", "textures/ui/book_arrowleft_hover")
    .show(player);
  if (response.canceled) return;
  if (response.selection === 0) return baseSecurityManagement(player);
  if (response.selection === 1) return editFriendsMenu(player);
  if (response.selection === 2) return mainMenu(player);
}

export async function baseSecurityManagement(player) {
  const bases = listOwnerBases(player.id);
  const config = rules();
  const placement = placementStatus(player);
  const form = new ActionFormData()
    .title("My Protected Bases")
    .body(`${bases.length}/${config.maximum} bases\n\n${placement.body}`)
    .button(
      placement.allowed ? "§aProtect Current Location" : "§cCannot Protect Here",
      "textures/ui/color_plus"
    )
    .button("§l§cBack", "textures/ui/book_arrowleft_hover");
  for (const base of bases) {
    form.button(
      `${base.enabled ? "§aOn" : "§cOff"}§r ${base.name}\n§7${base.x}, ${base.y}, ${base.z}`
    );
  }

  const response = await form.show(player);
  if (response.canceled) return;
  if (response.selection === 0) return addSecurityBase(player);
  if (response.selection === 1) return baseManagement(player);
  const base = bases[response.selection - 2];
  if (base) return editSecurityBase(player, base.id);
}

export async function editSecurityBase(player, baseId) {
  const base = listOwnerBases(player.id).find((entry) => entry.id === baseId);
  if (!base) return baseSecurityManagement(player);
  const placement = placementStatus(player, base.id);
  const response = await new ActionFormData()
    .title(base.name)
    .body(
      `${base.x}, ${base.y}, ${base.z} · ${base.dimensionId}\n\n` +
      `Move-to-current-location check:\n${placement.body}`
    )
    .button(`Security: ${base.enabled ? "§aOn" : "§cOff"}`)
    .button("Move to Current Location")
    .button("Rename")
    .button("Remove")
    .button("§l§cBack")
    .show(player);
  if (response.canceled) return;
  if (response.selection === 0) {
    base.enabled = !base.enabled;
    saveBase(base);
    return editSecurityBase(player, base.id);
  }
  if (response.selection === 1) return moveBase(player, base);
  if (response.selection === 2) return renameBase(player, base);
  if (response.selection === 3) return removeBase(player, base);
  if (response.selection === 4) return baseSecurityManagement(player);
}

function validateLocation(player, ignoredBaseId) {
  return placementStatus(player, ignoredBaseId).error;
}

function placementStatus(player, ignoredBaseId) {
  const config = rules();
  const { x, z } = player.location;
  const originDistance = Math.hypot(x, z);
  const spawnDistances = spawnLocations(player.dimension.id)
    .map((spawn) => ({
      label: spawn.label,
      distance: Math.hypot(x - spawn.x, z - spawn.z)
    }))
    .sort((left, right) => left.distance - right.distance);
  const closestSpawn = spawnDistances[0];
  const otherBaseDistances = listBases()
    .filter((base) =>
      base.id !== ignoredBaseId
      && base.ownerId !== player.id
      && base.dimensionId === player.dimension.id
    )
    .map((base) => ({
      base,
      distance: Math.hypot(x - base.x, z - base.z)
    }))
    .sort((left, right) => left.distance - right.distance);
  const closestOther = otherBaseDistances[0];

  let error;
  if (originDistance < config.minimumOrigin) {
    error = distanceError("the world origin", originDistance, config.minimumOrigin);
  } else if (closestSpawn && closestSpawn.distance < config.minimumSpawn) {
    error = distanceError(closestSpawn.label, closestSpawn.distance, config.minimumSpawn);
  } else if (closestOther && closestOther.distance < config.minimumOther) {
    error = distanceError("another protected base", closestOther.distance, config.minimumOther);
  }

  const spawnLine = closestSpawn
    ? `${wholeBlocks(closestSpawn.distance)} / ${config.minimumSpawn} blocks (${closestSpawn.label})`
    : `Not applicable in ${player.dimension.id}`;
  const otherLine = closestOther
    ? `${wholeBlocks(closestOther.distance)} / ${config.minimumOther} blocks (${closestOther.base.name})`
    : `No other player's base in this dimension / ${config.minimumOther} required`;

  return {
    allowed: !error,
    error,
    body:
      `${error ? "§cPlacement: TOO CLOSE" : "§aPlacement: ALLOWED"}§r\n` +
      `${error ? `Reason: ${error}\n` : ""}` +
      `Spawn: ${spawnLine}\n` +
      `Other base: ${otherLine}\n` +
      `World origin: ${wholeBlocks(originDistance)} / ${config.minimumOrigin} blocks`
  };
}

function spawnLocations(dimensionId) {
  const locations = [];

  // The configured distance must still work before an administrator uses the
  // World Menu's custom Set Spawn button.
  if (dimensionId === "minecraft:overworld") {
    const spawn = world.getDefaultSpawnLocation();
    locations.push({ ...spawn, label: "world spawn" });
  }

  const menuSpawn = readWorldData("teleport:spawn");
  if (
    menuSpawn?.dimensionId === dimensionId
    && Number.isFinite(menuSpawn.x)
    && Number.isFinite(menuSpawn.z)
  ) {
    const duplicatesWorldSpawn = locations.some(
      (spawn) => spawn.x === menuSpawn.x && spawn.z === menuSpawn.z
    );
    if (!duplicatesWorldSpawn) {
      locations.push({ ...menuSpawn, label: "the World Menu spawn" });
    }
  }

  return locations;
}

function distanceError(label, actualDistance, requiredDistance) {
  const actual = wholeBlocks(actualDistance);
  const farther = Math.max(1, Math.ceil(requiredDistance - actualDistance));
  return `You are ${actual} blocks from ${label}. Bases must be at least ` +
    `${requiredDistance} blocks away; move ${farther} more blocks away.`;
}

function wholeBlocks(distance) {
  return Math.floor(distance);
}

export function addSecurityBase(player) {
  const config = rules();
  if (listOwnerBases(player.id).length >= config.maximum) {
    player.sendMessage("§cYou have reached the protected-base limit.");
    return baseSecurityManagement(player);
  }
  const invalid = validateLocation(player);
  if (invalid) {
    player.sendMessage(`§c${invalid}`);
    return baseSecurityManagement(player);
  }
  if (!trySpendEntityScore("Money", player, config.cost)) {
    player.sendMessage(`§cYou need $${config.cost}; your balance is $${getEntityScore("Money", player)}.`);
    return baseSecurityManagement(player);
  }

  try {
    const base = createBase(player, player.location);
    player.sendMessage(`§aProtected ${base.name}.`);
    return editSecurityBase(player, base.id);
  } catch (error) {
    addEntityScore("Money", player, config.cost);
    player.sendMessage(`§cCould not create the base; payment refunded. ${error}`);
    return baseSecurityManagement(player);
  }
}

function moveBase(player, base) {
  const invalid = validateLocation(player, base.id);
  if (invalid) {
    player.sendMessage(`§c${invalid}`);
    return editSecurityBase(player, base.id);
  }
  base.dimensionId = player.dimension.id;
  base.x = Math.floor(player.location.x);
  base.y = Math.floor(player.location.y);
  base.z = Math.floor(player.location.z);
  saveBase(base);
  player.sendMessage("§aBase location updated.");
  return editSecurityBase(player, base.id);
}

async function renameBase(player, base) {
  const response = await new ModalFormData()
    .title("Rename Protected Base")
    .textField("Base name", "Base name", { defaultValue: base.name })
    .show(player);
  if (response.canceled) return editSecurityBase(player, base.id);
  const name = String(response.formValues[0] ?? "").trim();
  if (name) {
    base.name = name;
    saveBase(base);
  } else {
    player.sendMessage("§cBase name cannot be empty.");
  }
  return editSecurityBase(player, base.id);
}

async function removeBase(player, base) {
  const response = await new MessageFormData()
    .title("Remove Protected Base")
    .body(`Remove protection from “${base.name}”?`)
    .button1("Cancel")
    .button2("Remove")
    .show(player);
  if (!response.canceled && response.selection === 1) {
    deleteBase(base.id);
    return baseSecurityManagement(player);
  }
  return editSecurityBase(player, base.id);
}
