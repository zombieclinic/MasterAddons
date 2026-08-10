// index.js
// -----------------------------------------------------------------------------
// ZombieCraft Halloween runtime
// - Routes ScriptEvents (vines trap, pumpkin cannon) with per-tick de-dupe
// - Registers custom item/block components
// -----------------------------------------------------------------------------

import { system } from "@minecraft/server";

// ──────────────────────────────────────────────────────────────────────────────
// Imports
// ─────────────────────────────────────────────────────────────────────────────-
import { HalloweenGuidebook } from "./halloweenbook.js";
import { Candy } from "./candy.js";
import { PumpkinScythe} from "./pumpkin_scythe.js";

import { vines } from "./blood_vines.js";

import {
  isValid,
  isOurProjectile,
  findNearestTargetFromProjectile,
  pumpkinize,
} from "./pumpkin_cannon.js";

// ──────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────-
const EVENTS = {
  VINES: "zc:vines",
  PUMPKIN: "zc:charged_pumpkin",
};

function safeRun(label, fn) {
  try {
    fn();
  } catch (e) {
    // Comment out if you want silent prod logs
    console.warn?.(`[${label}]`, e);
  }
}

// De-dupe the same (event,id + source.id) within the same tick
const handledThisTick = new Set();
function oncePerTick(key, fn) {
  if (handledThisTick.has(key)) return;
  handledThisTick.add(key);
  try {
    fn();
  } finally {
    system.runTimeout(() => handledThisTick.delete(key), 0);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Unified ScriptEvent router
// ─────────────────────────────────────────────────────────────────────────────-
system.afterEvents.scriptEventReceive.subscribe(({ id, sourceEntity }) => {
  switch (id) {
    case EVENTS.VINES: {
      if (!sourceEntity) return; // must be the vine entity
      const key = `${id}:${sourceEntity.id}`;
      return oncePerTick(key, () =>
        safeRun("vines", () => vines(sourceEntity))
      );
    }

    case EVENTS.PUMPKIN: {
      if (!sourceEntity) return;
      if (!isValid(sourceEntity)) return;

      const key = `${id}:${sourceEntity.id}`;
      return oncePerTick(key, () =>
        safeRun("pumpkin", () => {
          if (isOurProjectile(sourceEntity)) {
            // Let physics settle: pick target next tick, then clean up projectile
            system.runTimeout(() => {
              const target = findNearestTargetFromProjectile(sourceEntity);
              if (target) pumpkinize(target);
              try { sourceEntity.remove(); } catch {}
            }, 0);
          } else {
            // Direct mode: pumpkinize the source entity
            pumpkinize(sourceEntity);
          }
        })
      );
    }

    default:
      // Unknown id → ignore
      return;
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Component registration
// ─────────────────────────────────────────────────────────────────────────────-
const BLOCK_COMPONENTS = [
  // ["your:block_component_id", YourBlockComponentClass],
];

const ITEM_COMPONENTS = [
  ["zc:candy", Candy],
  ["zc:halloweenguidebook", HalloweenGuidebook],
  ["zc:pumpkin_scythe", PumpkinScythe]
];

system.beforeEvents.startup.subscribe(({ blockComponentRegistry, itemComponentRegistry }) => {
  for (const [id, Comp] of BLOCK_COMPONENTS) {
    safeRun(`register:block:${id}`, () =>
      blockComponentRegistry.registerCustomComponent(id, new Comp())
    );
  }
  for (const [id, Comp] of ITEM_COMPONENTS) {
    safeRun(`register:item:${id}`, () =>
      itemComponentRegistry.registerCustomComponent(id, new Comp())
    );
  }
});

// Keep module scope clean
export {};
