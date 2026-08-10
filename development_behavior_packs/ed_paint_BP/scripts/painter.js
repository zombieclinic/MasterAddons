import {BlockPermutation, Player, GameMode, ItemComponentTypes, system} from "@minecraft/server"

         class PaintBrush {
  onUseOn(event) {
    const { block, source: player } = event;
    if (!(player instanceof Player)) return;
    if (block.typeId !== "zombie:painting_easel") return;

    
    const inv = player.getComponent("minecraft:inventory")?.container;
    if (!inv) return;

    let consumed = false;
    for (let i = 0; i < inv.size; i++) {
      const stack = inv.getItem(i);
      if (stack?.typeId === "zombie:canvus") {
        if (stack.amount > 1) {
          stack.amount -= 1;
          inv.setItem(i, stack);
        } else {
          inv.setItem(i); // clear slot
        }
        consumed = true;
        break;
      }
    }

    if (!consumed) {
      player.sendMessage("§cYou need a canvas to use the easel.");
      return;
    }

    // Swap the easel state + sound
    const states = block.permutation.getAllStates();
    block.setPermutation(BlockPermutation.resolve("zombie:painting_easel_canvus", states));

    const { x, y, z } = block.location;
    block.dimension.runCommand(`playsound dig.wood @a ${x} ${y} ${z}`);
  }
}




class Painting {
  onUseOn(event) {
    const { block, source: player } = event;

    // only on canvas easel in survival
    if (
      !(player instanceof Player) ||
      !player.matches({ gameMode: GameMode.survival }) ||
      block.typeId !== "zombie:painting_easel_canvus"
    )
      return;

    const inv = player.getComponent("minecraft:inventory").container;
    const slot = player.selectedSlotIndex;
    const brush = inv.getItem(slot);
    if (
      !brush ||
      brush.typeId !== "zombie:paint_brush" ||
      !brush.hasComponent(ItemComponentTypes.Durability)
    )
      return;

    // --- DURABILITY HANDLING ---
    const newBrush = brush.clone();
    const dur = newBrush.getComponent(ItemComponentTypes.Durability);
    const amount = Math.floor(Math.random() * 10) + 1; // 1–10
    const wouldBe = dur.damage + amount;
    const { x, y, z } = block.location;

    if (wouldBe >= dur.maxDurability) {
      // play break sound, then remove
      player.dimension.runCommand(
        `playsound random.break @a ${x} ${y} ${z}`
      );
      inv.setItem(slot, undefined);
    } else {
      dur.damage = wouldBe;
      inv.setItem(slot, newBrush);
    }

    // --- EASEL, LOOT, PARTICLES & SOUND as before ---
    const states = block.permutation.getAllStates();
    const normalPerm = BlockPermutation.resolve(
      "zombie:painting_easel",
      states
    );
    block.setPermutation(normalPerm);

    player.dimension.runCommand(
      `loot spawn ${x + 0.5} ${y + 2} ${z + 0.5} loot "paintings/wood_paint_brush"`
    );

    const dir = states["minecraft:cardinal_direction"];
    const particle = dir === "north" || dir === "south"
      ? "zombie:rainbow"
      : "zombie:rainbow2";
    player.dimension.runCommand(
      `particle ${particle} ${x + 0.5} ${y} ${z + 0.5}`
    );

    player.dimension.runCommand(`playsound painting @a ${x} ${y} ${z}`);
  }
}

system.beforeEvents.startup.subscribe((event) => {
  event.itemComponentRegistry.registerCustomComponent("zombie:paintbrush", new PaintBrush());
  event.itemComponentRegistry.registerCustomComponent("zombie:paintings", new Painting());
});
