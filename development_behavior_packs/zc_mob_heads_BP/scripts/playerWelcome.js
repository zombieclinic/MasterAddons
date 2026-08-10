import {
  ItemStack,
  system,
  world
} from "@minecraft/server";

const WELCOME_TAG = "mobhead_joined";
const WELCOME_DELAY_TICKS = 20 * 60;
const pendingWelcomes = new Set();

const WELCOME_MESSAGE =
  "§6Welcome to ZC MobHeads 2.0, created by §cZombie§aClinic§6!§r\n\n" +
  "Inside this book, you can explore all the available mob heads and learn how to collect them. " +
  "See if you can find them all!\n\n" +
  "I hope you enjoy using them as much as I enjoyed creating them.\n\n" +
  "Happy crafting and happy hunting!";

function giveWelcomeBook(player) {
  const book = new ItemStack("zombie:mobheadbook", 1);
  const inventory = player.getComponent("minecraft:inventory");
  const remainder = inventory?.container?.addItem(book);

  if (remainder) {
    player.dimension.spawnItem(remainder, player.location);
  }
}

world.afterEvents.playerSpawn.subscribe(({ initialSpawn, player }) => {
  if (!initialSpawn || player.hasTag(WELCOME_TAG) || pendingWelcomes.has(player.id)) return;

  pendingWelcomes.add(player.id);

  system.runTimeout(() => {
    pendingWelcomes.delete(player.id);

    try {
      if (player.hasTag(WELCOME_TAG)) return;

      giveWelcomeBook(player);
      player.sendMessage(WELCOME_MESSAGE);
      player.addTag(WELCOME_TAG);
    } catch {
      // The player left before the delay ended. Their next join will schedule it again.
    }
  }, WELCOME_DELAY_TICKS);
});
