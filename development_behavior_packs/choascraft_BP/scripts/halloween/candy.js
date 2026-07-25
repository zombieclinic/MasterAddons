import { system } from "@minecraft/server";

const DURATION_TICKS = 30 * 20; // 30 seconds

// Mixed pool of legit Bedrock effects (good & bad)
const EFFECT_POOL = [
  "minecraft:nausea",
  "minecraft:speed",
  "minecraft:slowness",
  "minecraft:haste",
  "minecraft:mining_fatigue",
  "minecraft:strength",
  "minecraft:weakness",
  "minecraft:jump_boost",
  "minecraft:regeneration",
  "minecraft:resistance",
  "minecraft:fire_resistance",
  "minecraft:water_breathing",
  "minecraft:invisibility",
  "minecraft:blindness",
  "minecraft:night_vision",
  "minecraft:hunger",
  "minecraft:poison",
  "minecraft:wither",
  "minecraft:absorption",
  "minecraft:slow_falling",
  "minecraft:levitation",
];

function pickRandomEffect() {
  return EFFECT_POOL[(Math.random() * EFFECT_POOL.length) | 0];
}

// v2 Item Component class
export class Candy {
  // Called when the item is consumed (works with items that are food or otherwise consumable)
  onConsume(ev) {
    try {
      const src = ev?.source;
      if (!src?.addEffect) return;

      // Try a few picks in case some effect isn’t available in your runtime
      for (let tries = 0; tries < 3; tries++) {
        const effectId = pickRandomEffect();
        try {
          src.addEffect(effectId, DURATION_TICKS, { amplifier: 0, showParticles: true });
          break;
        } catch { /* try another */ }
      }
    } catch {
      // swallow errors; components should never crash tick
    }
  }

  // (Optional) If you want right-click to eat even when not a food item:
  // onUse(ev) { /* no-op for now */ }
}
