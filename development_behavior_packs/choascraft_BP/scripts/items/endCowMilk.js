import { ItemStack, Player } from "@minecraft/server";

const EFFECTS = {
  night_vision: { id: "night_vision", duration: 15 * 20, amplifier: 0 },
  speed: { id: "speed", duration: 15 * 20, amplifier: 0 },
  healing: { id: "instant_health", duration: 1, amplifier: 1 },
  resistance: { id: "resistance", duration: 15 * 20, amplifier: 0 }
};

export class EndCowMilkComponent {
  constructor(effectName) {
    this.effect = EFFECTS[effectName];
  }

  onConsume(event) {
    const player = event?.source;
    if (!(player instanceof Player) || !this.effect) return;

    try {
      player.addEffect(this.effect.id, this.effect.duration, {
        amplifier: this.effect.amplifier,
        showParticles: false
      });
    } catch {}

    const inventory = player.getComponent("minecraft:inventory")?.container;
    if (!inventory) return;

    const remainder = inventory.addItem(new ItemStack("minecraft:bucket", 1));
    if (remainder) {
      try { player.dimension.spawnItem(remainder, player.location); } catch {}
    }
  }
}
