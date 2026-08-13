import { BlockPermutation, system } from "@minecraft/server";

const VINE = "zombie:lumenbloom_vine";
const STAGE = "zombie:vine_stage";
const GROWING = "zombie:vine_growing";
const MAX_LENGTH = 64;
const pendingBreaks = new Set();

export class LumenbloomVineGrowthComponent {
  onTick(event) { grow(event.block); }
  onPlayerBreak(event) { breakBelow(event.block, event.brokenBlockPermutation); }
  onBreak(event) { breakBelow(event.block, event.brokenBlockPermutation); }
}

function grow(block) {
  if (block?.typeId !== VINE || state(block, STAGE) !== "start" || state(block, GROWING) !== "yes") return;
  let tip = block;
  for (let i = 0; i < MAX_LENGTH; i++) {
    const below = tip.below();
    if (below?.typeId !== VINE) break;
    tip = below;
  }
  const target = tip.below();
  if (!target || (!target.isAir && target.typeId !== "minecraft:air")) return stop(block);
  try {
    if (tip !== block) tip.setPermutation(tip.permutation.withState(STAGE, "middle"));
    target.setPermutation(BlockPermutation.resolve(VINE, { [STAGE]: "end", [GROWING]: "no" }));
    const next = target.below();
    if (!next || (!next.isAir && next.typeId !== "minecraft:air")) stop(block);
  } catch {}
}

function stop(block) {
  try { block.setPermutation(block.permutation.withState(GROWING, "no")); } catch {}
}

function breakBelow(block, permutation) {
  if (!block || (permutation?.type?.id ?? permutation?.typeId) !== VINE) return;
  const key = `${block.dimension.id}:${block.location.x}:${block.location.y}:${block.location.z}`;
  if (pendingBreaks.has(key)) return;
  pendingBreaks.add(key);
  system.run(() => {
    try {
      let current = block.below();
      for (let i = 0; i < MAX_LENGTH && current?.typeId === VINE; i++) {
        const next = current.below();
        current.setType("minecraft:air");
        current = next;
      }
    } catch {} finally { pendingBreaks.delete(key); }
  });
}

function state(block, name) {
  try { return block.permutation.getState(name); } catch { return undefined; }
}
