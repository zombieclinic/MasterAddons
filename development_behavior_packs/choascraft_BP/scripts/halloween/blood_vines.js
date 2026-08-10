// blood_vines.js
// Freeze players standing in the same block as the vine (they can still attack).

import { system } from "@minecraft/server";

const VINE_TRAP_SECONDS = 30;     // total trap lifetime
const REAPPLY_EVERY_TICKS = 12;   // reapply every 0.6s (20 tps)
const SLOW_AMPLIFIER = 255;       // immobilize movement
const TAG_PREFIX = "zvine:";

// ───────────────────────── helpers ─────────────────────────
function sameBlock(a, b) {
  return (
    Math.floor(a.x) === Math.floor(b.x) &&
    Math.floor(a.y) === Math.floor(b.y) &&
    Math.floor(a.z) === Math.floor(b.z)
  );
}

function markTrapped(player, vineId) {
  const tag = TAG_PREFIX + vineId;
  if (!player.hasTag(tag)) player.addTag(tag);
}

function unmarkTrapped(player, vineId) {
  const tag = TAG_PREFIX + vineId;
  if (player.hasTag(tag)) player.removeTag(tag);
}

function applyFreeze(player) {
  try {
    // short duration so it clears instantly when we stop reapplying
    player.addEffect("slowness", 40, {
      amplifier: SLOW_AMPLIFIER,
      showParticles: false,
    });
  } catch {}
}

function clearFreeze(player) {
  try { player.removeEffect("slowness"); } catch {}
}

// Is the player still a valid, living entity?
function isAlive(entity) {
  if (!entity?.isValid) return false; // isValid is a PROPERTY in 2.2.0
  try {
    const hp = entity.getComponent("health");
    if (!hp) return true; // if no health component, assume alive/valid
    const currentHealth = hp.currentValue ?? hp.current;
    return typeof currentHealth !== "number" || currentHealth > 0;
  } catch {
    return false;
  }
}

// ───────────────────────── main ─────────────────────────
export function vines(vineEntity) {
  if (!vineEntity?.isValid) return;

  const vineId = vineEntity.id;
  const dim = vineEntity.dimension;
  const origin = vineEntity.location;

  // Find players sharing this exact block
  const nearby = dim.getPlayers({ location: origin, maxDistance: 1.5 });
  const trapped = new Set();

  for (const p of nearby) {
    if (!isAlive(p)) continue;
    if (sameBlock(p.location, origin)) {
      markTrapped(p, vineId);
      trapped.add(p);
      applyFreeze(p);
    }
  }

  if (trapped.size === 0) return;

  const maxTicks = VINE_TRAP_SECONDS * 20;
  let ticks = 0;

  const handle = system.runInterval(() => {
    ticks += REAPPLY_EVERY_TICKS;

    // stop if vine despawned/invalid or timer expired
    if (!vineEntity.isValid || ticks >= maxTicks) {
      for (const p of trapped) {
        if (!p?.isValid) continue;
        unmarkTrapped(p, vineId);
        clearFreeze(p);
      }
      system.clearRun(handle);
      return;
    }

    // maintain or release per trapped player
    for (const p of [...trapped]) {
      if (!isAlive(p)) {
        unmarkTrapped(p, vineId);
        clearFreeze(p);
        trapped.delete(p);
        continue;
      }

      if (sameBlock(p.location, origin)) {
        applyFreeze(p);
      } else {
        unmarkTrapped(p, vineId);
        clearFreeze(p);
        trapped.delete(p);
      }
    }

    if (trapped.size === 0) system.clearRun(handle);
  }, REAPPLY_EVERY_TICKS);
}
