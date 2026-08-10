import { Player } from "@minecraft/server";

const NIGHT_VISION_DURATION = 30 * 20;

export class AmaranthineAppleFoodComponent {
  onConsume(event) {
    const player = event?.source;
    if (!(player instanceof Player)) return;

    player.addEffect("instant_health", 1, {
      amplifier: 1,
      showParticles: false
    });
    player.addEffect("night_vision", NIGHT_VISION_DURATION, {
      amplifier: 0,
      showParticles: false
    });
  }
}
