import { system, world } from "@minecraft/server";
import { getFakeScore } from "./scoreboard.js";

const active = new Map();
const MOVEMENT_TOLERANCE_SQUARED = 0.01;

export function teleportWarmupSeconds() {
  const admin = world.scoreboard.getObjective("admin");
  return Math.max(0, getFakeScore(admin, "teleportdelay", 5));
}

export function hasActiveTeleport(player) {
  return active.has(player.id);
}

export function beginTeleportWarmup(player, options) {
  cancelTeleportWarmup(player, "A new teleport replaced the previous one.", false);

  const seconds = teleportWarmupSeconds();
  if (seconds <= 0) {
    complete(player, options);
    return;
  }

  const start = {
    x: player.location.x,
    y: player.location.y,
    z: player.location.z,
    dimensionId: player.dimension.id
  };
  const state = {
    options,
    start,
    endTick: system.currentTick + seconds * 20,
    intervalId: undefined
  };
  active.set(player.id, state);

  const check = () => {
    if (!player.isValid) {
      cancelTeleportWarmup(player, "You left before the teleport completed.", false);
      return;
    }
    if (moved(player, start)) {
      cancelTeleportWarmup(player, "Teleport canceled because you moved.");
      return;
    }

    const ticksRemaining = state.endTick - system.currentTick;
    if (ticksRemaining <= 0) {
      stop(player.id);
      complete(player, options);
      return;
    }

    const secondsRemaining = Math.ceil(ticksRemaining / 20);
    player.onScreenDisplay.setActionBar(
      `§bTeleporting to ${options.label ?? "destination"} in §f${secondsRemaining}§b…\n` +
      "§7Do not move or take damage."
    );
  };

  state.intervalId = system.runInterval(check, 5);
  check();
}

export function cancelTeleportWarmup(player, reason, notify = true) {
  const state = active.get(player.id);
  if (!state) return false;
  stop(player.id);
  try {
    state.options.onCancel?.();
  } catch (error) {
    console.warn(`[World Menu] Teleport cancellation cleanup failed: ${error}`);
  }
  if (notify && player.isValid) {
    player.onScreenDisplay.setActionBar("§cTeleport canceled.");
    player.sendMessage(`§c${reason}`);
  }
  return true;
}

world.afterEvents.entityHurt.subscribe(({ hurtEntity }) => {
  if (hurtEntity.typeId !== "minecraft:player") return;
  cancelTeleportWarmup(hurtEntity, "Teleport canceled because you took damage.");
});

function moved(player, start) {
  if (player.dimension.id !== start.dimensionId) return true;
  const dx = player.location.x - start.x;
  const dy = player.location.y - start.y;
  const dz = player.location.z - start.z;
  return dx * dx + dy * dy + dz * dz > MOVEMENT_TOLERANCE_SQUARED;
}

function stop(playerId) {
  const state = active.get(playerId);
  if (!state) return;
  if (state.intervalId !== undefined) system.clearRun(state.intervalId);
  active.delete(playerId);
}

function complete(player, options) {
  try {
    options.onComplete();
  } catch (error) {
    try {
      options.onCancel?.();
    } catch {}
    player.sendMessage(`§cTeleport failed; payment refunded. ${error}`);
  }
}
