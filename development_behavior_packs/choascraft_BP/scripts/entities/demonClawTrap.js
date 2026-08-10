import { system, world } from "@minecraft/server";

const CHECK_INTERVAL = 5;
const TRAP_RADIUS = 1.5;
const FREEZE_DURATION = CHECK_INTERVAL + 3;
const FREEZE_AMPLIFIER = 255;
const clawsByPlayer = new Map();

function getEntity(id) {
  try {
    const entity = world.getEntity(id);
    return entity?.isValid ? entity : undefined;
  } catch {
    return undefined;
  }
}

function isAlive(player) {
  try {
    const health = player.getComponent("minecraft:health");
    return !health || health.currentValue > 0;
  } catch {
    return false;
  }
}

function freeze(player) {
  try {
    player.addEffect("slowness", FREEZE_DURATION, {
      amplifier: FREEZE_AMPLIFIER,
      showParticles: false
    });
  } catch {}
}

function addTrap(player, clawId) {
  let clawIds = clawsByPlayer.get(player.id);
  if (!clawIds) {
    clawIds = new Set();
    clawsByPlayer.set(player.id, clawIds);
  }
  clawIds.add(clawId);
}

function releasePlayer(playerId, clawId) {
  const clawIds = clawsByPlayer.get(playerId);
  if (!clawIds) return;

  clawIds.delete(clawId);
  if (clawIds.size > 0) return;
  clawsByPlayer.delete(playerId);

  const player = getEntity(playerId);
  if (!player) return;
  try {
    player.removeEffect("slowness");
  } catch {}
}

export function startDemonClawTrap(claw) {
  if (!claw?.isValid) return;

  const clawId = claw.id;
  const trappedPlayers = new Set();

  const update = () => {
    const liveClaw = getEntity(clawId);
    if (!liveClaw) {
      for (const playerId of trappedPlayers) releasePlayer(playerId, clawId);
      return;
    }

    try {
      for (const player of liveClaw.dimension.getPlayers({
        location: liveClaw.location,
        maxDistance: TRAP_RADIUS
      })) {
        if (!isAlive(player)) continue;
        trappedPlayers.add(player.id);
        addTrap(player, clawId);
      }

      for (const playerId of trappedPlayers) {
        const player = getEntity(playerId);
        if (player && isAlive(player)) freeze(player);
      }
    } finally {
      system.runTimeout(update, CHECK_INTERVAL);
    }
  };

  update();
}
