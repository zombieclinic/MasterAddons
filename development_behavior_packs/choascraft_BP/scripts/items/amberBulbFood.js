import { Player } from "@minecraft/server";

export class AmberBulbFoodComponent {
  onConsume(event) {
    const player = event?.source;
    if (!(player instanceof Player)) return;
    player.addEffect("instant_health", 1, {
      amplifier: 0,
      showParticles: false
    });
  }
}
