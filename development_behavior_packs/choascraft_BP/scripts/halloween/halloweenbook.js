import { ActionFormData } from "@minecraft/server-ui";

/**
 * Components v2: Item component that opens a multi-page Halloween event book.
 * Attach in your item JSON:
 * "minecraft:custom_components": { "zombie:guidebook": {} }
 */
export class HalloweenGuidebook {
  onUse(ev) {
    const player = ev?.source;
    if (!player) return;
    showMain(player);
  }
}

/* ───────── small helpers ───────── */
function btn(form, label, icon) {
  if (icon) form.button(label, icon);
  else form.button(label);
  return form;
}
function backOnly(player, title, body) {
  const f = new ActionFormData().title(title).body(body).button("§7Back");
  f.show(player).then((r) => { if (r?.selection === 0) showMain(player); });
}

/* ========== MAIN MENU ========== */
function showMain(player) {
  const form = new ActionFormData()
    .title("§6Halloween Event §7— §5Guidebook")
    .body(
      "Welcome to the spooky season! This book explains how the event works, how to make candy, " +
      "and what prizes you can earn.\n\n" +
      "• §oTrick-or-Treaters§r appear at §onight§r in the world.\n" +
      "• Give them §ecandy§r for a §aPrize§r… or face a §cTrick§r!"
    );

  btn(form, "Event Overview", "textures/halloween/halloween_book")                     // 0
    .button("Crafting Candy", "textures/items/sugar")                                   // 1
    .button("Trick-or-Treaters", "textures/ui/trial_omen_effect")                       // 2
    .button("Wandering Traveler Witch (Z-Coin Shop)", "textures/items/potion_bottle_splash") // 3
    .button("Pumpkin King — Summon & Boss", "textures/halloween/pumpkin_king_head_icon") // 4 (combined)
    .button("Pumpkin Scythe", "textures/items/diamond_hoe")                             // 5 (new chapter)
    .button("Pumpkin Cannon", "textures/items/crossbow_standby")                        // 6
    .button("Prizes: Blocks", "textures/blocks/pumpkin_top")                            // 7
    .button("Prizes: Buckets", "textures/ui/icon_water_bucket")                         // 8
    .button("Prizes: Carved Pumpkins", "textures/blocks/pumpkin_face_on")               // 9
    .button("Prizes: Masks & Items", "textures/items/iron_helmet")                      // 10
    .button("Candy Types & Effects", "textures/items/apple");                           // 11

  form.show(player).then((res) => {
    switch (res?.selection) {
      case 0: pageOverview(player); break;
      case 1: pageCrafting(player); break;
      case 2: pageTOT(player); break;
      case 3: pageTravelerWitch(player); break;
      case 4: pagePumpkinKing(player); break;     // combined page
      case 5: pagePumpkinScythe(player); break;   // new page
      case 6: pagePumpkinCannon(player); break;
      case 7: pagePrizesBlocks(player); break;
      case 8: pagePrizesBuckets(player); break;
      case 9: pagePrizesCarved(player); break;
      case 10: pagePrizesItems(player); break;
      case 11: pageCandyTypes(player); break;
      default: break;
    }
  });
}

/* ========== PAGES ========== */

function pageOverview(player) {
  backOnly(
    player,
    "Event Overview",
    "§lWhen?§r\n• Nighttime.\n\n" +
    "§lWho appears?§r\n• Trick-or-Treaters: Creepers, Skeletons, Endermen, Zombies, and Witches dressed for the season.\n\n" +
    "§lHow it works§r\n• Give a Trick-or-Treater §ecandy§r to receive a §aPrize§r.\n" +
    "• If you don’t have candy, they’ll give you a §cTrick§r and fight!\n\n" +
    "§lPro-tip§r: Carry multiple candies; some visitors are extra greedy."
  );
}

function pageCrafting(player) {
  backOnly(
    player,
    "Crafting Candy",
    "Recipe (shapeless):\n• §62 Cocoa Beans§r\n• §62 Sugar§r\n\n" +
    "Crafts: §eHalloween Candy§r\n\n" +
    "Use candy on a Trick-or-Treater to get a prize, or eat it yourself for a random effect (good or bad) for 30 seconds."
  );
}

function pageTOT(player) {
  backOnly(
    player,
    "Trick-or-Treaters",
    "Visitors include:\n• §aCreeper§r\n• §fSkeleton§r\n• §5Enderman§r\n• §2Zombie§r\n• §dWitch§r\n\n" +
    "All are dressed up for the season. They wander at night looking for players with candy.\n" +
    "Give candy → §aPrize§r.\nNo candy → §cTrick§r (they attack!).\n\n" +
    "§lNew:§r They can now drop the §6Pumpkin Head Mask§r and the §ePumpkin Amulet§r."
  );
}

function pageTravelerWitch(player) {
  backOnly(
    player,
    "Wandering Traveler Witch (Z-Coin Shop)",
    "Find the §5Wandering Traveler Witch§r roaming at night.\n\n" +
    "• Earn §6Z-Coins§r from Trick-or-Treater rewards.\n" +
    "• Trades §dHalloween items§r for §6Z-Coins§r.\n" +
    "• Possible stock includes: §ePumpkin Amulet§r, candy, décor, and other seasonal goods.\n" +
    "• Great way to gear up for the Pumpkin King trial."
  );
}

/* COMBINED: Summon + Boss */
function pagePumpkinKing(player) {
  backOnly(
    player,
    "Pumpkin King — Summon & Boss",
    "§lHow to Summon§r\n" +
    "• Use a §ePumpkin Amulet§r §oon the Pumpkin King's Head§r (statue/altar).\n" +
    "• Get the amulet from §oTrick-or-Treaters§r or trade with the §5Wandering Traveler Witch§r for §6Z-Coins§r.\n\n" +
    "§lThe Trial§r\n" +
    "• The fight begins as soon as he awakens—come prepared (potions, buffs, best gear).\n" +
    "• The Pumpkin King is tough; coordinate with friends and watch his phases.\n\n" +
    "§lRewards§r\n" +
    "• Defeat him to claim the §ePumpkin Scythe§r and other seasonal loot."
  );
}

/* NEW: Pumpkin Scythe chapter (farming + charged summon) */
function pagePumpkinScythe(player) {
  backOnly(
    player,
    "Pumpkin Scythe",
    "A legendary tool forged for harvest and havoc.\n\n" +
    "§lFarming Mode§r\n" +
    "• Use it on §2dirt§r or §a grass§r to instantly convert blocks into §9farmland§r.\n" +
    "• Great for preparing big fields fast.\n\n" +
    "§lCharged Mode (Summons)§r\n" +
    "• §oCrouch + Use§r to spend §65 XP levels§r and load the scythe with §e5 charges§r (1 charge per level).\n" +
    "• While charged, §oUse§r (no crouch) to summon a §afriendly zombie§r to fight for you for about §o1 minute§r.\n" +
    "• Each summon consumes §e1 charge§r. With 5 charges, you can summon up to §e5 zombies§r before recharging.\n\n" +
    "§lNotes§r\n" +
    "• When all charges are spent, just §oCrouch + Use§r again to convert more XP into charges.\n" +
    "• The scythe’s farming ability is always available—charges are only for summoning."
  );
}

function pagePumpkinCannon(player) {
  backOnly(
    player,
    "Pumpkin Cannon",
    "The §ePumpkin Cannon§r is now a §ldrop§r in the event.\n\n" +
    "• Fire it at your §bfriends§r to §6turn their head into a pumpkin§r (for laughs!).\n" +
    "• Fire it at §2Zombies§r and §fSkeletons§r to §6pumpkin-head§r them too.\n\n" +
    "Handle with care — pranks may cause sudden cackling."
  );
}

function pagePrizesBlocks(player) {
  backOnly(
    player,
    "Prizes — Blocks & Decorations",
    "Possible decorative rewards:\n" +
    "• Cross Gravestone\n" +
    "• Ghost Block\n" +
    "• Gravestone\n" +
    "• Trick-or-Treaters Status display (all variants)\n" +
    "• Skull & Bone Block\n" +
    "• Zombie Horse Statue"
  );
}

function pagePrizesBuckets(player) {
  backOnly(
    player,
    "Prizes — Painted Buckets",
    "Collectible themed buckets:\n" +
    "• Clown\n" +
    "• Frankenstein\n" +
    "• Ghost\n" +
    "• Mummy\n" +
    "• Pumpkin\n" +
    "• Skull\n" +
    "• Vampire"
  );
}

function pagePrizesCarved(player) {
  backOnly(
    player,
    "Prizes — Carved Pumpkins",
    "Carved patterns you can win:\n" +
    "• Creeper faces (3 variants)\n" +
    "• Heart & Pickaxe\n" +
    "• Classic Pumpkin Face"
  );
}

function pagePrizesItems(player) {
  backOnly(
    player,
    "Prizes — Masks & Items",
    "Masks:\n• Creeper Mask\n• Skeleton Mask\n• Spider Mask\n• Zombie Mask\n• §6Pumpkin Head Mask§r (from Trick-or-Treaters)\n\n" +
    "Other prizes:\n" +
    "• Halloween Candy (for more trades!)\n" +
    "• §ePumpkin Cannon§r (event drop)\n" +
    "• §ePumpkin Scythe§r (defeat the Pumpkin King)"
  );
}

function pageCandyTypes(player) {
  backOnly(
    player,
    "Candy Types & Effects",
    "Special candies you can also receive:\n" +
    "• Candy Corn\n" +
    "• Green Apple\n" +
    "• Popsicles\n\n" +
    "Eat any candy to receive a §orandom effect§r—good or bad—for §o30 seconds§r. Best of luck!"
  );
}
