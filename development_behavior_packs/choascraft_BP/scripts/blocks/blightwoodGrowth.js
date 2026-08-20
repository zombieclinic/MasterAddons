import { ItemStack } from "@minecraft/server";

export class BlightwoodSporeCropComponent {
  onPlayerBreak({ block }) {
    const location = block.center();
    block.dimension.spawnItem(new ItemStack("zombie:blightwood_spore_seeds", 1), location);
    block.dimension.spawnItem(new ItemStack("zombie:blightwood_tree_spore", 1 + (Math.random() < 0.35 ? 1 : 0)), location);
  }
}
