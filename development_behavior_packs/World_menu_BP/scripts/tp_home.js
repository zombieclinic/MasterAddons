import { world } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { playerTpmenu } from "./playertp.js";
import {
  addEntityScore,
  getFakeScore,
  getEntityScore,
  trySpendEntityScore
} from "./core/scoreboard.js";
import { readPlayerData, writePlayerData } from "./core/storage.js";
import {
  beginTeleportWarmup,
  teleportWarmupSeconds
} from "./core/teleportWarmup.js";

const HOMES_KEY = "teleport:homes";

function getSettings() {
  const admin = world.scoreboard.getObjective("admin");
  return {
    maximum: Math.max(0, getFakeScore(admin, "homecount", 0)),
    createCost: Math.max(0, getFakeScore(admin, "homecost", 0)),
    teleportCost: Math.max(0, getFakeScore(admin, "teleporthomecost", 0))
  };
}

function readHomes(player) {
  const homes = readPlayerData(player, HOMES_KEY, []);
  return Array.isArray(homes) ? homes : [];
}

function saveHomes(player, homes) {
  writePlayerData(player, HOMES_KEY, homes);
}

function currentLocation(player) {
  return {
    dimensionId: player.dimension.id,
    x: Math.floor(player.location.x),
    y: Math.floor(player.location.y),
    z: Math.floor(player.location.z)
  };
}

function prettyDimension(id) {
  if (id === "minecraft:nether") return "Nether";
  if (id === "minecraft:the_end") return "The End";
  return "Overworld";
}

export async function tpHome(player) {
  const homes = readHomes(player);
  const settings = getSettings();
  const form = new ActionFormData()
    .title("Home Teleports")
    .body(
      `Saved homes: ${homes.length}/${settings.maximum}\n` +
      `New home: $${settings.createCost} · Teleport: $${settings.teleportCost}`
    )
    .button("§l§cBack", "textures/ui/book_arrowleft_hover");

  if (homes.length < settings.maximum) {
    form.button("Save Current Location", "textures/ui/color_plus");
  }
  for (const home of homes) {
    form.button(
      `${home.name}\n§7${home.x}, ${home.y}, ${home.z} · ${prettyDimension(home.dimensionId)}`
    );
  }

  const response = await form.show(player);
  if (response.canceled) return;
  if (response.selection === 0) return playerTpmenu(player);

  let index = 1;
  if (homes.length < settings.maximum) {
    if (response.selection === index) return addHome(player);
    index++;
  }
  const home = homes[response.selection - index];
  if (home) return homeOptions(player, home.id);
}

async function addHome(player) {
  const settings = getSettings();
  const homes = readHomes(player);
  if (homes.length >= settings.maximum) {
    player.sendMessage("§cYou have reached the home limit.");
    return tpHome(player);
  }

  const response = await new ModalFormData()
    .title("Save Current Location")
    .textField(`Home name (cost: $${settings.createCost})`, "Example: Main Base", { defaultValue: `Home ${homes.length + 1}` })
    .show(player);
  if (response.canceled) return tpHome(player);

  const name = String(response.formValues[0] ?? "").trim();
  if (!name) {
    player.sendMessage("§cHome name cannot be empty.");
    return addHome(player);
  }
  if (!trySpendEntityScore("Money", player, settings.createCost)) {
    player.sendMessage(`§cYou need $${settings.createCost}; your balance is $${getEntityScore("Money", player)}.`);
    return tpHome(player);
  }

  homes.push({
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    name,
    ...currentLocation(player)
  });
  saveHomes(player, homes);
  player.sendMessage(`§aSaved “${name}”.`);
  return tpHome(player);
}

async function homeOptions(player, homeId) {
  const home = readHomes(player).find((entry) => entry.id === homeId);
  if (!home) return tpHome(player);

  const response = await new ActionFormData()
    .title(home.name)
    .body(
      `${home.x}, ${home.y}, ${home.z} · ${prettyDimension(home.dimensionId)}\n` +
      `Teleport warmup: ${teleportWarmupSeconds()} seconds\n` +
      "Moving or taking damage cancels the teleport."
    )
    .button("Teleport", "textures/ui/icon_agent")
    .button("Update to Current Location", "textures/ui/update")
    .button("Rename", "textures/ui/anvil_icon")
    .button("Remove", "textures/ui/crossout")
    .button("§l§cBack", "textures/ui/book_arrowleft_hover")
    .show(player);
  if (response.canceled) return;
  if (response.selection === 0) return teleportHome(player, homeId);
  if (response.selection === 1) return updateHomeLocation(player, homeId);
  if (response.selection === 2) return renameHome(player, homeId);
  if (response.selection === 3) return removeHome(player, homeId);
  if (response.selection === 4) return tpHome(player);
}

function teleportHome(player, homeId) {
  const home = readHomes(player).find((entry) => entry.id === homeId);
  if (!home) return tpHome(player);
  const cost = getSettings().teleportCost;
  if (!trySpendEntityScore("Money", player, cost)) {
    player.sendMessage(`§cYou need $${cost} to teleport.`);
    return homeOptions(player, homeId);
  }

  beginTeleportWarmup(player, {
    label: home.name,
    onComplete: () => {
      player.teleport(
        { x: home.x + 0.5, y: home.y, z: home.z + 0.5 },
        { dimension: world.getDimension(home.dimensionId), checkForBlocks: true }
      );
      player.sendMessage(cost ? `§aTeleported home for $${cost}.` : "§aTeleported home.");
    },
    onCancel: () => {
      if (cost) addEntityScore("Money", player, cost);
    }
  });
}

function updateHomeLocation(player, homeId) {
  const homes = readHomes(player);
  const home = homes.find((entry) => entry.id === homeId);
  if (!home) return tpHome(player);
  Object.assign(home, currentLocation(player));
  saveHomes(player, homes);
  player.sendMessage(`§aUpdated “${home.name}”.`);
  return homeOptions(player, homeId);
}

async function renameHome(player, homeId) {
  const homes = readHomes(player);
  const home = homes.find((entry) => entry.id === homeId);
  if (!home) return tpHome(player);

  const response = await new ModalFormData()
    .title("Rename Home")
    .textField("Home name", "Home name", { defaultValue: home.name })
    .show(player);
  if (response.canceled) return homeOptions(player, homeId);
  const name = String(response.formValues[0] ?? "").trim();
  if (!name) {
    player.sendMessage("§cHome name cannot be empty.");
    return homeOptions(player, homeId);
  }
  home.name = name;
  saveHomes(player, homes);
  return homeOptions(player, homeId);
}

async function removeHome(player, homeId) {
  const homes = readHomes(player);
  const home = homes.find((entry) => entry.id === homeId);
  if (!home) return tpHome(player);
  const response = await new MessageFormData()
    .title("Remove Home")
    .body(`Remove “${home.name}”?`)
    .button1("Cancel")
    .button2("§cRemove")
    .show(player);
  if (!response.canceled && response.selection === 1) {
    saveHomes(player, homes.filter((entry) => entry.id !== homeId));
    player.sendMessage("§aHome removed.");
    return tpHome(player);
  }
  return homeOptions(player, homeId);
}
