import { Player, system } from "@minecraft/server";

const FIVE_SECONDS = 5 * 20;

export class LumenrootFruitFoodComponent {
  onConsume(event) {
    const player = event?.source;
    if (!(player instanceof Player)) return;

    player.addEffect("levitation", FIVE_SECONDS, {
      amplifier: 0,
      showParticles: true
    });

    system.runTimeout(() => {
      if (!player.isValid) return;
      player.addEffect("slow_falling", FIVE_SECONDS, {
        amplifier: 0,
        showParticles: true
      });
    }, FIVE_SECONDS);
  }
}
