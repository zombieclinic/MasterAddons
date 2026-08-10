import { system, world } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { tpHome } from "./tp_home.js";
import { mainMenu } from "./mainmenu.js";
import {
  addEntityScore,
  getEntityScore,
  getFakeScore,
  trySpendEntityScore
} from "./core/scoreboard.js";
import { readWorldData, writeWorldData } from "./core/storage.js";
import {
  beginTeleportWarmup,
  teleportWarmupSeconds
} from "./core/teleportWarmup.js";

const requestsByTargetId = new Map();
const REQUEST_LIFETIME = 20 * 60 * 5;

function config(name) {
  return getFakeScore(world.scoreboard.getObjective("admin"), name, 0);
}

export async function playerTpmenu(player) {
  const actions = [];
  const form = new ActionFormData()
    .title("Player Teleports")
    .body("Choose an option.");

  if (config("playertpsplayer") === 1) {
    form.button("Player-to-Player TP", "textures/ui/FriendsIcon");
    actions.push(() => playerToPlayerMenu(player));
  }
  if (config("hometps") === 1) {
    form.button("Homes", "textures/ui/icon_fall");
    actions.push(() => tpHome(player));
  }
  if (config("teleportspawn") === 1) {
    form.button("Teleport to Spawn", "textures/ui/icon_agent");
    actions.push(() => confirmSpawn(player));
  }
  form.button("§l§cBack", "textures/ui/book_arrowleft_hover");
  actions.push(() => mainMenu(player));

  const response = await form.show(player);
  if (!response.canceled) actions[response.selection]?.();
}

async function playerToPlayerMenu(player) {
  const pending = currentRequests(player);
  const response = await new ActionFormData()
    .title("Player-to-Player TP")
    .body(`Pending requests: ${pending.length}`)
    .button("Request Teleport")
    .button(`Review Requests (${pending.length})`)
    .button("§l§cBack")
    .show(player);
  if (response.canceled) return;
  if (response.selection === 0) return requestTeleport(player);
  if (response.selection === 1) return reviewRequests(player);
  if (response.selection === 2) return playerTpmenu(player);
}

async function requestTeleport(player) {
  const players = [...world.getPlayers()]
    .filter((target) => target.id !== player.id)
    .sort((left, right) => left.name.localeCompare(right.name));
  if (!players.length) {
    player.sendMessage("§eNo other players are online.");
    return playerToPlayerMenu(player);
  }

  const form = new ActionFormData()
    .title("Request Teleport")
    .button("§l§cBack");
  for (const target of players) form.button(target.name);
  const response = await form.show(player);
  if (response.canceled || response.selection === 0) return playerToPlayerMenu(player);

  const target = players[response.selection - 1];
  if (!target?.isValid) {
    player.sendMessage("§cThat player is no longer online.");
    return requestTeleport(player);
  }

  const requests = currentRequests(target)
    .filter((entry) => entry.requesterId !== player.id);
  requests.push({
    requesterId: player.id,
    requesterName: player.name,
    cost: Math.max(0, config("teleporthomecost")),
    expiresAt: system.currentTick + REQUEST_LIFETIME
  });
  requestsByTargetId.set(target.id, requests);
  target.sendMessage(`§e${player.name} sent you a teleport request.`);
  player.sendMessage(`§aRequest sent to ${target.name}.`);
  return playerToPlayerMenu(player);
}

function currentRequests(player) {
  const requests = requestsByTargetId.get(player.id) ?? [];
  const current = requests.filter((entry) => entry.expiresAt > system.currentTick);
  if (current.length) requestsByTargetId.set(player.id, current);
  else requestsByTargetId.delete(player.id);
  return current;
}

async function reviewRequests(player) {
  const requests = currentRequests(player);
  if (!requests.length) {
    player.sendMessage("§eYou have no pending requests.");
    return playerToPlayerMenu(player);
  }

  const form = new ActionFormData()
    .title("Teleport Requests")
    .button("§l§cBack");
  for (const request of requests) {
    form.button(`${request.requesterName}\n§7Cost to requester: $${request.cost}`);
  }
  const response = await form.show(player);
  if (response.canceled || response.selection === 0) return playerToPlayerMenu(player);
  const request = requests[response.selection - 1];
  if (request) return decideRequest(player, request);
}

async function decideRequest(target, request) {
  const requester = [...world.getPlayers()]
    .find((player) => player.id === request.requesterId);
  if (!requester) {
    removeRequest(target, request.requesterId);
    target.sendMessage("§cThat player is no longer online.");
    return reviewRequests(target);
  }

  const response = await new MessageFormData()
    .title("Teleport Request")
    .body(
      `Allow ${requester.name} to teleport to you for $${request.cost}?\n\n` +
      `Warmup: ${teleportWarmupSeconds()} seconds. Moving or taking damage cancels it.`
    )
    .button1("Decline")
    .button2("Accept")
    .show(target);
  removeRequest(target, requester.id);
  if (response.canceled || response.selection !== 1) {
    requester.sendMessage(`§e${target.name} declined your teleport request.`);
    return reviewRequests(target);
  }
  if (!trySpendEntityScore("Money", requester, request.cost)) {
    requester.sendMessage(`§cYou need $${request.cost} to teleport.`);
    target.sendMessage(`§e${requester.name} no longer has enough money.`);
    return reviewRequests(target);
  }

  beginTeleportWarmup(requester, {
    label: target.name,
    onComplete: () => {
      if (!target.isValid) throw new Error(`${target.name} is no longer online.`);
      requester.teleport(target.location, { dimension: target.dimension });
      requester.sendMessage(
        request.cost ? `§aTeleported to ${target.name} for $${request.cost}.` : `§aTeleported to ${target.name}.`
      );
      target.sendMessage(`§a${requester.name} teleported to you.`);
    },
    onCancel: () => {
      if (request.cost) addEntityScore("Money", requester, request.cost);
    }
  });
  return reviewRequests(target);
}

function removeRequest(target, requesterId) {
  const remaining = currentRequests(target)
    .filter((entry) => entry.requesterId !== requesterId);
  if (remaining.length) requestsByTargetId.set(target.id, remaining);
  else requestsByTargetId.delete(target.id);
}

async function confirmSpawn(player) {
  const cost = Math.max(0, config("teleporthomecost"));
  const response = await new MessageFormData()
    .title("Teleport to Spawn")
    .body(
      `${cost ? `Teleport to spawn for $${cost}?` : "Teleport to spawn for free?"}\n\n` +
      `Warmup: ${teleportWarmupSeconds()} seconds. Moving or taking damage cancels it.`
    )
    .button1("Cancel")
    .button2("Teleport")
    .show(player);
  if (!response.canceled && response.selection === 1) return teleportSpawn(player, cost);
  return playerTpmenu(player);
}

function getSpawn() {
  const stored = readWorldData("teleport:spawn");
  if (stored?.dimensionId && [stored.x, stored.y, stored.z].every(Number.isFinite)) return stored;

  const objective = world.scoreboard.getObjective("setspawn");
  const legacy = objective?.getParticipants()
    .map((entry) => entry.displayName)
    .find((name) => name.startsWith("global_spawn_"));
  const match = legacy?.match(/^global_spawn_(overworld|nether|the_end)_(-?\d+)_(-?\d+)_(-?\d+)$/);
  if (!match) return undefined;
  const spawn = {
    dimensionId: `minecraft:${match[1]}`,
    x: Number(match[2]),
    y: Number(match[3]),
    z: Number(match[4])
  };
  writeWorldData("teleport:spawn", spawn);
  return spawn;
}

function teleportSpawn(player, cost) {
  const spawn = getSpawn();
  if (!spawn) {
    player.sendMessage("§cAn administrator has not set the global spawn.");
    return playerTpmenu(player);
  }
  if (!trySpendEntityScore("Money", player, cost)) {
    player.sendMessage(`§cYou need $${cost}; your balance is $${getEntityScore("Money", player)}.`);
    return playerTpmenu(player);
  }

  beginTeleportWarmup(player, {
    label: "spawn",
    onComplete: () => {
      player.teleport(
        { x: spawn.x + 0.5, y: spawn.y, z: spawn.z + 0.5 },
        { dimension: world.getDimension(spawn.dimensionId), checkForBlocks: true }
      );
      player.sendMessage(cost ? `§aTeleported to spawn for $${cost}.` : "§aTeleported to spawn.");
    },
    onCancel: () => {
      if (cost) addEntityScore("Money", player, cost);
    }
  });
}
