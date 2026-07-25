import { system, world } from "@minecraft/server";

const REGISTER_EVENT = "zombie:zombie_santa_register";
const EASY = "zombie:zombiesanta_easy";
const MEDIUM = "zombie:zombiesanta_medium";
const HARD = "zombie:zombiesanta_hard";
const NEXT_PHASE = new Map([
  [EASY, MEDIUM],
  [MEDIUM, HARD]
]);
const activeHard = new Set();

function safeEntity(id) {
  try {
    const entity = world.getEntity(id);
    return entity?.isValid ? entity : undefined;
  } catch {
    return undefined;
  }
}

function scheduleHardTeleport(id) {
  system.runTimeout(() => {
    const santa = safeEntity(id);
    if (!santa || santa.typeId !== HARD) {
      activeHard.delete(id);
      return;
    }

    const target = santa.dimension.getPlayers({
      location: santa.location,
      maxDistance: 64,
      closest: 1
    })[0];

    if (target) {
      const angle = Math.random() * Math.PI * 2;
      const destination = {
        x: target.location.x + Math.cos(angle) * 3,
        y: target.location.y,
        z: target.location.z + Math.sin(angle) * 3
      };

      try {
        const teleported = santa.tryTeleport(destination, {
          checkForBlocks: true,
          facingLocation: {
            x: target.location.x,
            y: target.location.y + 1,
            z: target.location.z
          }
        });
        if (teleported) {
          santa.dimension.spawnParticle("minecraft:huge_explosion_emitter", santa.location);
          santa.dimension.playSound("mob.endermen.portal", santa.location, {
            volume: 1,
            pitch: 0.7
          });
        }
      } catch (error) {
        console.warn(`[Zombie Santa] Teleport failed: ${error}`);
      }
    }

    scheduleHardTeleport(id);
  }, 1200);
}

system.afterEvents.scriptEventReceive.subscribe(({ id, sourceEntity }) => {
  if (id !== REGISTER_EVENT || !sourceEntity) return;
  if (sourceEntity.typeId !== HARD || activeHard.has(sourceEntity.id)) return;

  activeHard.add(sourceEntity.id);
  scheduleHardTeleport(sourceEntity.id);
});

world.afterEvents.entityDie.subscribe(({ deadEntity }) => {
  const nextType = NEXT_PHASE.get(deadEntity.typeId);
  if (!nextType) {
    if (deadEntity.typeId === HARD) activeHard.delete(deadEntity.id);
    return;
  }

  const { dimension, location } = deadEntity;
  system.run(() => {
    try {
      const next = dimension.spawnEntity(nextType, location);
      dimension.playSound("mob.wither.spawn", location, {
        volume: 1,
        pitch: nextType === HARD ? 0.65 : 0.85
      });
      dimension.spawnParticle("minecraft:huge_explosion_emitter", next.location);
    } catch (error) {
      console.error(`[Zombie Santa] Could not start next phase: ${error}`);
    }
  });
});
