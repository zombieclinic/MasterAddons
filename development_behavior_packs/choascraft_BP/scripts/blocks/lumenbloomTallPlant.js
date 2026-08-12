import { BlockPermutation, system } from "@minecraft/server";

const HALF = "zombie:plant_half";
const AIR = "minecraft:air";

export class LumenbloomTallPlantComponent {
  onPlace(event) { completePlant(event.block); }
  onTick(event) { completePlant(event.block); }
  onPlayerBreak(event) { removeOtherHalf(event.block, event.brokenBlockPermutation); }
  onBreak(event) { removeOtherHalf(event.block, event.brokenBlockPermutation); }
}

function completePlant(block) {
  if (!block) return;
  const typeId = block.typeId;
  const half = getHalf(block);
  if (half === "top") {
    if (block.below()?.typeId !== typeId) safelyRemove(block);
    return;
  }

  const above = block.above();
  if (!above || (above.typeId !== AIR && !above.isAir && above.typeId !== typeId)) return;
  try {
    if (above.typeId !== typeId || getHalf(above) !== "top") {
      above.setPermutation(BlockPermutation.resolve(typeId, { [HALF]: "top" }));
    }
  } catch {}
}

function removeOtherHalf(block, permutation) {
  const typeId = permutation?.type?.id ?? permutation?.typeId;
  if (!typeId?.startsWith("zombie:lumenbloom_")) return;
  let half;
  try { half = permutation.getState(HALF); } catch { return; }
  const other = half === "top" ? block.below() : block.above();
  if (other?.typeId !== typeId) return;
  system.run(() => safelyRemove(other));
}

function safelyRemove(block) {
  try { block.setType(AIR); } catch {}
}

function getHalf(block) {
  try { return block.permutation.getState(HALF); } catch { return undefined; }
}
