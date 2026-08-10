import { EntityDamageCause, system, world } from "@minecraft/server";

const END_GOLEM = "zombie:end_golem";
const GUARD_RADIUS = 24;
const PROVOCATION_COOLDOWN_TICKS = 10;
const lastProvokedTick = new Map();

world.afterEvents.playerBreakBlock.subscribe((event) => {
  const typeId = event.brokenBlockPermutation?.type?.id;
  const player = event.player;
  const block = event.block;

  if (!player || !block || !isProtectedBiomeBlock(typeId)) return;

  let golems;
  try {
    golems = block.dimension.getEntities({
      type: END_GOLEM,
      location: block.center(),
      maxDistance: GUARD_RADIUS
    });
  } catch {
    return;
  }

  for (const golem of golems) provokeGolem(golem, player);
});

function isProtectedBiomeBlock(typeId) {
  if (typeof typeId !== "string") return false;

  return typeId.startsWith("zombie:amaranthine_")
    || typeId.startsWith("zombie:stripped_amaranthine_")
    || typeId.startsWith("zombie:lumenroot_")
    || typeId.startsWith("zombie:stripped_lumenroot_");
}

function provokeGolem(golem, player) {
  const tick = system.currentTick;
  const previousTick = lastProvokedTick.get(golem.id) ?? -PROVOCATION_COOLDOWN_TICKS;
  if (tick - previousTick < PROVOCATION_COOLDOWN_TICKS) return;

  try {
    const health = golem.getComponent("minecraft:health");
    const healthBefore = health?.currentValue;
    if (typeof healthBefore !== "number" || healthBefore <= 1) return;

    lastProvokedTick.set(golem.id, tick);
    golem.applyDamage(1, {
      cause: EntityDamageCause.entityAttack,
      damagingEntity: player
    });

    system.run(() => restoreProvocationDamage(golem, healthBefore));
  } catch {
  }
}

function restoreProvocationDamage(golem, healthBefore) {
  try {
    if (!golem.isValid) {
      lastProvokedTick.delete(golem.id);
      return;
    }

    const health = golem.getComponent("minecraft:health");
    if (!health || typeof health.setCurrentValue !== "function") return;

    const restoredHealth = Math.min(healthBefore, health.currentValue + 1);
    health.setCurrentValue(restoredHealth);
  } catch {
  }
}
