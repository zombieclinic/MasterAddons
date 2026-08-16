const POWER_OFFSETS = [
  { x: 0, y: 0, z: 0 },
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 }
];

export class AtlantisPowerToggle {
  onTick({ block } = {}) {
    const dimension = block?.dimension;
    if (!block || !dimension || block.typeId === "minecraft:air") return;

    const { x, y, z } = block.location;
    let powered = false;

    for (const offset of POWER_OFFSETS) {
      try {
        const neighbor = dimension.getBlock({
          x: x + offset.x,
          y: y + offset.y,
          z: z + offset.z
        });
        if ((neighbor?.getRedstonePower?.() ?? 0) > 0) {
          powered = true;
          break;
        }
      } catch {}
    }

    const desiredState = powered ? 1 : 0;
    const permutation = block.permutation;
    const currentState = permutation.getState("zombie:transparent");
    if (currentState === undefined || currentState === desiredState) return;

    try {
      block.setPermutation(permutation.withState("zombie:transparent", desiredState));
    } catch {}
  }
}
