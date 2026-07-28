import { system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { MOB_HEAD_DROP_CONFIG } from "./config/mobHeadDropConfig.js";

const MOB_TYPE_BY_NAME = Object.freeze({
  "Allay": "minecraft:allay",
  "Armadillo": "minecraft:armadillo",
  "Axolotl": "minecraft:axolotl",
  "Bat": "minecraft:bat",
  "Bee": "minecraft:bee",
  "Blaze": "minecraft:blaze",
  "Bogged": "minecraft:bogged",
  "Breeze": "minecraft:breeze",
  "Camel": "minecraft:camel",
  "Camel Husk": "minecraft:camel_husk",
  "Cat": "minecraft:cat",
  "Cave Spider": "minecraft:cave_spider",
  "Chicken": "minecraft:chicken",
  "Cod": "minecraft:cod",
  "Cow": "minecraft:cow",
  "Copper Golem": "minecraft:copper_golem",
  "Creaking": "minecraft:creaking",
  "Dolphin": "minecraft:dolphin",
  "Donkey": "minecraft:donkey",
  "Drowned": "minecraft:drowned",
  "Elder Guardian": "minecraft:elder_guardian",
  "Enderman": "minecraft:enderman",
  "Endermite": "minecraft:endermite",
  "Fox": "minecraft:fox",
  "Arctic Fox": "minecraft:fox",
  "Frog (Cold)": "minecraft:frog",
  "Frog (Temperate)": "minecraft:frog",
  "Frog (Warm)": "minecraft:frog",
  "Ghast": "minecraft:ghast",
  "Glow Squid": "minecraft:glow_squid",
  "Goat": "minecraft:goat",
  "Guardian": "minecraft:guardian",
  "Hoglin": "minecraft:hoglin",
  "Horse": "minecraft:horse",
  "Husk": "minecraft:husk",
  "Illager": "minecraft:evoker",
  "Iron Golem": "minecraft:iron_golem",
  "Llama": "minecraft:llama",
  "Magma Cube": "minecraft:magma_cube",
  "Mooshroom": "minecraft:mooshroom",
  "Mule": "minecraft:mule",
  "Nautilus": "minecraft:nautilus",
  "Ocelot": "minecraft:ocelot",
  "Panda": "minecraft:panda",
  "Parched": "minecraft:parched",
  "Parrot": "minecraft:parrot",
  "Phantom": "minecraft:phantom",
  "Pig": "minecraft:pig",
  "Piglin Brute": "minecraft:piglin_brute",
  "Pillager": "minecraft:pillager",
  "Polar Bear": "minecraft:polar_bear",
  "Pufferfish": "minecraft:pufferfish",
  "Rabbit": "minecraft:rabbit",
  "Ravager": "minecraft:ravager",
  "Salmon": "minecraft:salmon",
  "Sheep": "minecraft:sheep",
  "Shulker": "minecraft:shulker",
  "Silverfish": "minecraft:silverfish",
  "Skeleton Horse": "minecraft:skeleton_horse",
  "Zombie Horse": "minecraft:zombie_horse",
  "Slime": "minecraft:slime",
  "Sniffer": "minecraft:sniffer",
  "Snow Golem": "minecraft:snow_golem",
  "Spider": "minecraft:spider",
  "Squid": "minecraft:squid",
  "Stray": "minecraft:stray",
  "Strider": "minecraft:strider",
  "Sulfur Cube": "minecraft:sulfur_cube",
  "Tadpole": "minecraft:tadpole",
  "Tropical Fish": "minecraft:tropical_fish",
  "Turtle": "minecraft:turtle",
  "Vex": "minecraft:vex",
  "Vindicator": "minecraft:vindicator",
  "Wandering Trader": "minecraft:wandering_trader",
  "Warden": "minecraft:warden",
  "Witch": "minecraft:witch",
  "Wither": "minecraft:wither",
  "Zombie Piglin": "minecraft:zombified_piglin",
  "Zombie Nautilus": "minecraft:zombie_nautilus",
  "Zombie Villager": "minecraft:zombie_villager"
});

function percent(value) {
  return `${Number((value * 100).toFixed(3))}%`;
}

function dropConfigFor(mobData) {
  let typeId = mobData.typeId ?? MOB_TYPE_BY_NAME[mobData.name];
  if (!typeId && mobData.name.endsWith(" Wolf")) typeId = "minecraft:wolf";
  if (!typeId && /(Armorer|Butcher|Cartographer|Cleric|Farmer|Fisherman|Fletcher|Leatherworker|Librarian|Mason|Nitwit|Shepherd|Toolsmith|Unskilled|Weaponsmith)$/.test(mobData.name)) {
    typeId = "minecraft:villager";
  }
  return typeId ? MOB_HEAD_DROP_CONFIG[typeId] : undefined;
}

class MobHeadBook {
  onUse(event) {
    const { source: player } = event;
    showMobHeadBookForm(player);
  }
}

function showMobHeadBookForm(player) {
  const MobHeadBookForm = new ActionFormData()
    .title("§6The Mob Heads Guidebook")
    .body("§8━━━━━━━━━━━━━━━━━━━━━━\n§6§lMOB HEADS COLLECTION§r\n§8━━━━━━━━━━━━━━━━━━━━━━\n\n§7Land the credited killing blow for a chance to collect a mob's head. Looting adds the listed bonus once per enchantment level.\n\n§dVariants match the mob you defeat, including sheep colors, villager outfits, fox coats, and wolf coats/states.\n\n§5Shulker colors are crafted from the undyed mask.\n\n§aChoose a category:")
    .button("§lBasic Mobs", "textures/mobheads/items/allay")
    .button("§lUndead Mobs", "textures/mobheads/items/husk")
    .button("§lNether Mobs", "textures/mobheads/items/blaze")
    .button("§lEnd Mobs", "textures/mobheads/items/enderman")
    .button("§lAquatic Mobs", "textures/mobheads/items/dolphin")
    .button("§lBosses & Rare", "textures/mobheads/items/warden")
    .button("§lAnimals", "textures/mobheads/items/cow")
    .button("§lVillagers", "textures/mobheads/items/villager_v2_desert_armorer")
    .button("§lWolf Variants", "textures/mobheads/items/wolf_wild")
    .button("§lShulker Recipes", "textures/mobheads/items/shulker")
    .button("§d§lEaster Eggs", "textures/mobheads/items/adventuretime/zombieclinic")
    .button("§c§lExit");

  MobHeadBookForm.show(player).then(response => {
    if (response.canceled) return;
    switch (response.selection) {
      case 0: showBasicMobs(player); break;
      case 1: showUndeadMobs(player); break;
      case 2: showNetherMobs(player); break;
      case 3: showEndMobs(player); break;
      case 4: showAquaticMobs(player); break;
      case 5: showBossesMobs(player); break;
      case 6: showAnimalMobs(player); break;
      case 7: showVillagerMenu(player); break;
      case 8: showWolfMenu(player); break;
      case 9: showShulkerRecipes(player); break;
      case 10: showEasterEggs(player); break;
      case 11: return;
      default: break;
    }
  });
}

// ========== CATEGORY MENUS ==========

// Basic Mobs
function showBasicMobs(player) {
  const form = new ActionFormData()
    .title("§6Basic Mobs")
    .body("§7Select a mob head to view its drop chance:")
    .button("Allay", "textures/mobheads/items/allay")
    .button("Armadillo", "textures/mobheads/items/armadillo")
    .button("Bat", "textures/mobheads/items/bat")
    .button("Bee", "textures/mobheads/items/bee")
    .button("Cave Spider", "textures/mobheads/items/cave_spider")
    .button("Copper Golem", "textures/mobheads/items/copper_golem_icon")
    .button("Creaking", "textures/mobheads/items/creaking_icon")
    .button("Iron Golem", "textures/mobheads/items/iron_golem")
    .button("Silverfish", "textures/mobheads/items/silverfish")
    .button("Slime", "textures/mobheads/items/slime")
    .button("Snow Golem", "textures/mobheads/items/snow_golem")
    .button("Spider", "textures/mobheads/items/spider")
    .button("Sulfur Cube", "textures/mobheads/items/sulfur_icon")
    .button("Vex", "textures/mobheads/items/vex")
    .button("§c← Back");

  form.show(player).then(response => {
    if (response.canceled) return;
    const mobData = [
      { name: "Allay", chance: "10%", looting: "+2%", biome: "Found in Woodland Mansions and near Pillager Outposts", facts: "Friendly helper that picks up matching items and follows note blocks it has been tuned to. Can duplicate when dancing near a jukebox by giving it an amethyst shard." },
      { name: "Armadillo", chance: "10%", looting: "+2%", biome: "Spawns in Savannas and Badlands", facts: "Rolls into a ball when threatened. Drops armadillo scutes used for wolf armor; brushing yields scutes." },
      { name: "Bat", chance: "10%", looting: "+2%", biome: "Spawns in caves and underground areas below Y=63", facts: "Ambient mob that does not attack; roosts upside down and flies away when disturbed." },
      { name: "Bee", chance: "10%", looting: "+2%", biome: "Spawns near nests in Plains, Sunflower Plains, and Flower Forests", facts: "Pollinates crops and produces honey. Becomes angry if its hive is broken; a bee dies shortly after stinging." },
      { name: "Cave Spider", chance: "10%", looting: "+2%", biome: "Spawns from spawners in Mineshafts", facts: "Smaller than spiders and inflicts Poison on hit. Can fit through 1-block gaps." },
      { name: "Copper Golem", biome: "Player-built from a copper block and carved pumpkin", facts: "Sorts items from copper chests into nearby chests. It oxidizes through four appearances and eventually becomes a statue unless waxed; an axe can scrape oxidation away." },
      { name: "Creaking", chance: "20%", looting: "+1%", biome: "Pale Gardens at night when linked to a naturally generated Creaking Heart", facts: "Stops moving while watched. Attacking a heart-linked Creaking points toward its hidden Heart and may create resin clumps; destroying the Heart removes its linked Creaking." },
      { name: "Iron Golem", chance: "10%", looting: "+2%", biome: "Spawns naturally in Villages or can be player-built", facts: "Village protector. Can be built with iron blocks and a carved pumpkin; offers poppies to baby villagers." },
      { name: "Silverfish", chance: "10%", looting: "+2%", biome: "Commonly in Strongholds and from infested stone in some mountain areas", facts: "Hides in infested blocks and calls nearby silverfish when attacked." },
      { name: "Slime", chance: "10%", looting: "+2%", biome: "Spawns in Swamps at night and in slime chunks below Y=40", facts: "Splits into smaller slimes on death; size determines health and damage." },
      { name: "Snow Golem", chance: "10%", looting: "+2%", biome: "Player-built with snow blocks and a pumpkin", facts: "Throws snowballs at hostile mobs and leaves snow layers in cold biomes; takes damage from rain/heat." },
      { name: "Spider", chance: "10%", looting: "+2%", biome: "Spawns in darkness in the Overworld", facts: "Neutral in daylight unless provoked; can climb walls; can spawn with a skeleton rider (spider jockey)." },
      { name: "Sulfur Cube", biome: "Sulfur caves beneath sulfur springs", facts: "A Chaos Cubed mob with an appetite for blocks. Feeding it different blocks changes how it moves, including bouncing and sliding behaviors." },
      { name: "Vex", chance: "1%", looting: "+0.1%", biome: "Summoned by Evokers in Woodland Mansions and Raids", facts: "A small flying hostile mob that passes through blocks and attacks with an iron sword. After a successful Vex head roll, this pack gives an 80% normal head and 20% charging head." }
    ];

    if (response.selection === 14) {
      showMobHeadBookForm(player);
    } else if (response.selection < mobData.length) {
      showMobDetail(player, mobData[response.selection], () => showBasicMobs(player));
    }
  });
}

// Undead Mobs
function showUndeadMobs(player) {
  const form = new ActionFormData()
    .title("§6Undead Mobs")
    .body("§7Select an undead mob head to view its drop chance:")
    .button("Camel Husk", "textures/mobheads/items/camel")
    .button("Drowned", "textures/mobheads/items/drowned")
    .button("Husk", "textures/mobheads/items/husk")
    .button("Parched", "textures/mobheads/items/parched_icon")
    .button("Phantom", "textures/mobheads/items/phantom")
    .button("Skeleton Horse", "textures/mobheads/items/skeleton_horse")
    .button("Zombie Horse", "textures/mobheads/items/zombie_horse")
    .button("Stray", "textures/mobheads/items/stray")
    .button("Zombie Villager", "textures/mobheads/items/zombie_villager_v2")
    .button("§c← Back");

  form.show(player).then(response => {
    if (response.canceled) return;
    const mobData = [
      { name: "Camel Husk", biome: "Deserts", facts: "A passive undead mount that does not burn in sunlight. It can spawn with as many as two hostile riders; defeat both riders to claim and tame the mount." },
      { name: "Drowned", chance: "10%", looting: "+2%", biome: "Oceans, Rivers, and underwater ruins", facts: "Underwater zombie variant; some spawn with tridents and nautilus shells. Burns in sunlight when on land." },
      { name: "Husk", chance: "1%", looting: "+0.1%", biome: "Deserts and variants", facts: "Desert zombie that does not burn in sunlight and inflicts Hunger. Converts to a normal zombie after prolonged submersion." },
      { name: "Parched", biome: "Deserts, often riding camel husks", facts: "A sunlight-immune skeleton variant that attacks with a bow. Parched riders create a mounted daytime threat in desert biomes." },
      { name: "Phantom", chance: "10%", looting: "+2%", biome: "Spawns at night if a player hasn’t slept for 3+ days", facts: "Flying undead that swoops from above; drops phantom membranes used for Slow Falling potions." },
      { name: "Skeleton Horse", chance: "10%", looting: "+10%", biome: "Skeleton-horse traps triggered during thunderstorms", facts: "An undead horse that becomes rideable after its skeleton rider is defeated. It can be ridden underwater without throwing off its rider." },
      { name: "Zombie Horse", chance: "1%", looting: "+0.1%", biome: "Rare undead horse; obtainable through special spawning", facts: "An undead horse variant with decayed green skin." },
      { name: "Stray", chance: "10%", looting: "+2%", biome: "Ice Spikes, Frozen Oceans, and snowy biomes", facts: "Cold-biome skeleton variant that shoots Arrows of Slowness." },
      { name: "Zombie Villager", chance: "1%", looting: "+0.1%", biome: "Any biome; also from villagers killed by zombies", facts: "Can be cured with Splash Weakness + Golden Apple; retains profession attire." }
    ];

    if (response.selection === 9) {
      showMobHeadBookForm(player);
    } else if (response.selection < mobData.length) {
      showMobDetail(player, mobData[response.selection], () => showUndeadMobs(player));
    }
  });
}

// Nether Mobs
function showNetherMobs(player) {
  const form = new ActionFormData()
    .title("§6Nether Mobs")
    .body("§7Select a nether mob head to view its drop chance:")
    .button("Blaze", "textures/mobheads/items/blaze")
    .button("Ghast", "textures/mobheads/items/ghast")
    .button("Hoglin", "textures/mobheads/items/hoglin")
    .button("Magma Cube", "textures/mobheads/items/magma_cube")
    .button("Piglin Brute", "textures/mobheads/items/piglin_brute")
    .button("Strider", "textures/mobheads/items/strider")
    .button("Zoglin", "textures/mobheads/items/zoglin")
    .button("Zombie Piglin", "textures/mobheads/items/zombie_pigman")
    .button("§c← Back");

  form.show(player).then(response => {
    if (response.canceled) return;
    const mobData = [
      { name: "Blaze", chance: "10%", looting: "+2%", biome: "From spawners in Nether Fortresses", facts: "Flying mob that shoots fireballs; drops blaze rods essential for brewing and Eyes of Ender." },
      { name: "Ghast", chance: "10%", looting: "+2%", biome: "Open areas of the Nether", facts: "Large floating mob that fires explosive fireballs; drops ghast tears and gunpowder." },
      { name: "Hoglin", chance: "10%", looting: "+2%", biome: "Crimson Forests", facts: "Hostile pig-beast repelled by warped fungus; turns into a Zoglin if brought to the Overworld." },
      { name: "Magma Cube", chance: "10%", looting: "+2%", biome: "Nether Wastes and Basalt Deltas", facts: "Nether counterpart to slimes; splits into smaller cubes and is immune to fire and lava." },
      { name: "Piglin Brute", chance: "10%", looting: "+2%", biome: "Bastion Remnants", facts: "Tough piglin that always attacks on sight and cannot be bartered with; wields an axe." },
      { name: "Strider", chance: "10%", looting: "+2%", biome: "Across lava lakes in Nether biomes", facts: "A passive lava-walker that can be saddled and steered with warped fungus on a stick. It shivers and turns purple away from lava; this pack gives 20% of successful Strider head rolls that suffocated appearance." },
      { name: "Zoglin", chance: "10%", looting: "+2%", biome: "Created when Hoglins leave the Nether", facts: "Zombified hoglin hostile to most mobs; cannot be bred or leashed." },
      { name: "Zombie Piglin", chance: "10%", looting: "+2%", biome: "Nether Wastes and from pigs struck by lightning", facts: "Neutral until attacked; nearby piglins/zombified piglins join the fight if provoked." }
    ];

    if (response.selection === 8) {
      showMobHeadBookForm(player);
    } else if (response.selection < mobData.length) {
      showMobDetail(player, mobData[response.selection], () => showNetherMobs(player));
    }
  });
}

// End Mobs  
function showEndMobs(player) {
  const form = new ActionFormData()
    .title("§6End Mobs")
    .body("§7Select an end mob head to view its drop chance:")
    .button("Enderman", "textures/mobheads/items/enderman")
    .button("Endermite", "textures/mobheads/items/endermite")
    .button("Shulker", "textures/mobheads/items/shulker")
    .button("§c← Back");

  form.show(player).then(response => {
    if (response.canceled) return;
    const mobData = [
      { name: "Enderman", chance: "1%", looting: "+0.1%", biome: "The End, Nether, and rarely Overworld at night", facts: "Teleports and picks up certain blocks; becomes hostile when stared at; drops ender pearls." },
      { name: "Endermite", chance: "10%", looting: "+2%", biome: "5% chance from thrown ender pearls", facts: "Small hostile mob that attracts Enderman aggression; despawns after a short time (~2 minutes)." },
      { name: "Shulker", biome: "End Cities", facts: "Drops the undyed purple mask. Combine that mask with any of the 16 dyes to craft its colored version. Naming a living shulker §fjeb§7 makes a successful head roll drop the animated rainbow mask." }
    ];

    if (response.selection === 3) {
      showMobHeadBookForm(player);
    } else if (response.selection < mobData.length) {
      showMobDetail(player, mobData[response.selection], () => showEndMobs(player));
    }
  });
}

// Aquatic Mobs
function showAquaticMobs(player) {
  const form = new ActionFormData()
    .title("§6Aquatic Mobs")
    .body("§7Select an aquatic mob head to view its drop chance:")
    .button("Axolotl", "textures/mobheads/items/axolotl_lucy")
    .button("Cod", "textures/mobheads/items/cod")
    .button("Dolphin", "textures/mobheads/items/dolphin")
    .button("Elder Guardian", "textures/mobheads/items/elder_guardian")
    .button("Glow Squid", "textures/mobheads/items/glow_squid")
    .button("Guardian", "textures/mobheads/items/guardian")
    .button("Nautilus", "textures/mobheads/items/nautilus_icon")
    .button("Pufferfish", "textures/mobheads/items/pufferfish")
    .button("Salmon", "textures/mobheads/items/salmon")
    .button("Squid", "textures/mobheads/items/squid")
    .button("Tadpole", "textures/mobheads/items/tadpole")
    .button("Tropical Fish", "textures/mobheads/items/tropicalfish")
    .button("Turtle", "textures/mobheads/items/turtle")
    .button("Zombie Nautilus", "textures/mobheads/items/nautilus_icon")
    .button("§c← Back");

  form.show(player).then(response => {
    if (response.canceled) return;
    const mobData = [
      { name: "Axolotl", biome: "Lush Cave water over clay", facts: "Comes in five colors, attacks many aquatic mobs, and may play dead while regenerating. The blue variant is obtained through breeding rather than natural spawning." },
      { name: "Cod", chance: "10%", looting: "+2%", biome: "Oceans (Cold, Normal, Lukewarm)", facts: "Swims in schools; can be caught in a bucket; used as food or to tempt cats." },
      { name: "Dolphin", chance: "10%", looting: "+2%", biome: "Most ocean biomes except Frozen", facts: "Leads players to shipwrecks and ruins; grants Dolphin’s Grace when nearby in water." },
      { name: "Elder Guardian", chance: "10%", looting: "+2%", biome: "Three per Ocean Monument", facts: "Mini-boss that applies Mining Fatigue; drops wet sponges and prismarine items." },
      { name: "Glow Squid", chance: "10%", looting: "+2%", biome: "Underground water below Y=30", facts: "Emits a glow effect and drops glow ink sacs to make text/item frames glow." },
      { name: "Guardian", chance: "10%", looting: "+2%", biome: "In and around Ocean Monuments", facts: "Hostile laser-firing fish with retractable spikes; drops prismarine shards/crystals." },
      { name: "Nautilus", biome: "Overworld oceans", facts: "A neutral underwater mount that can be tempted and tamed with pufferfish. Riding one boosts underwater travel and preserves the rider's existing air supply." },
      { name: "Pufferfish", chance: "10%", looting: "+2%", biome: "Warm Ocean biomes", facts: "Inflates when approached and inflicts Poison on contact; used to brew Water Breathing." },
      { name: "Salmon", chance: "10%", looting: "+2%", biome: "Rivers, Frozen Oceans, and Cold Oceans", facts: "Comes in multiple sizes; can be caught in buckets and cooked for food." },
      { name: "Squid", chance: "10%", looting: "+2%", biome: "Oceans and Rivers", facts: "Releases an ink cloud when hurt; drops ink sacs used for dye and books/quills." },
      { name: "Tadpole", chance: "1%", looting: "+0.1%", biome: "From breeding frogs (grows by temperature into variants)", facts: "Baby frog form; can be scooped in a bucket; takes ~20 minutes to grow into a frog variant." },
      { name: "Tropical Fish", chance: "10%", looting: "+2%", biome: "Warm Oceans and Lush Caves", facts: "Extremely varied colors/patterns (thousands of combos); used to breed axolotls and tempt cats." },
      { name: "Turtle", chance: "10%", looting: "+2%", biome: "Warm beaches", facts: "Returns to its home beach to lay eggs after breeding with seagrass. Baby turtles drop scutes when they grow into adults." },
      { name: "Zombie Nautilus", biome: "Overworld oceans", facts: "An undead underwater mount often carrying a trident-wielding drowned. Unseat the rider, then use pufferfish to tame it; coral and standard appearances share the same drop chance." }
    ];

    if (response.selection === 14) {
      showMobHeadBookForm(player);
    } else if (response.selection < mobData.length) {
      showMobDetail(player, mobData[response.selection], () => showAquaticMobs(player));
    }
  });
}

// Bosses & Rare Mobs
function showBossesMobs(player) {
  const form = new ActionFormData()
    .title("§6Bosses & Rare Mobs")
    .body("§7Select a boss or rare mob head to view its drop chance:")
    .button("Bogged", "textures/mobheads/items/bogged")
    .button("Breeze", "textures/mobheads/items/breeze")
    .button("Illager", "textures/mobheads/items/pillager")
    .button("Pillager", "textures/mobheads/items/pillager")
    .button("Ravager", "textures/mobheads/items/ravager")
    .button("Sniffer", "textures/mobheads/items/sniffer")
    .button("Vindicator", "textures/mobheads/items/vindicator")
    .button("Wandering Trader", "textures/mobheads/items/wandering_trader")
    .button("Warden", "textures/mobheads/items/warden")
    .button("Witch", "textures/mobheads/items/witch")
    .button("Wither", "textures/mobheads/items/wither")
    .button("§c← Back");

  form.show(player).then(response => {
    if (response.canceled) return;
    const mobData = [
      { name: "Bogged", chance: "10%", looting: "+2%", biome: "Swamps, Mangrove Swamps, and some Trial Chambers", facts: "A slower-firing skeleton variant that shoots poisoned arrows. Shearing the mushrooms from its head drops mushrooms and changes its appearance." },
      { name: "Breeze", chance: "10%", looting: "+2%", biome: "Trial Chambers (Trial Spawners)", facts: "Wind-based foe that fires wind charges to knock back and move entities; highly mobile." },
      { name: "Illager", chance: "10%", looting: "+2%", biome: "Illager faction across Outposts, Mansions, and Raids", facts: "Hostile villager offshoot. Variants include Pillagers (crossbows), Vindicators (axes), and Evokers (fangs/vex summons)." },
      { name: "Pillager", chance: "10%", looting: "+2%", biome: "Outposts and Raids", facts: "Crossbow-wielding illager; raid captains wear banners; crossbows can break after heavy use." },
      { name: "Ravager", chance: "10%", looting: "+2%", biome: "Raids (wave 3+)", facts: "Massive beast that tramples crops and deals heavy melee damage; can carry pillagers/vindicators during raids." },
      { name: "Sniffer", chance: "10%", looting: "+2%", biome: "Hatched from eggs obtained by brushing suspicious sand in Warm Ocean Ruins", facts: "An ancient passive mob that sniffs out and digs up torchflower and pitcher pod items. Sniffers breed using torchflower seeds." },
      { name: "Vindicator", chance: "10%", looting: "+2%", biome: "Woodland Mansions and Raids", facts: "Aggressive illager with an iron axe; named “Johnny” attacks nearly all mobs." },
      { name: "Wandering Trader", chance: "1%", looting: "+0.1%", biome: "Randomly near players in the Overworld", facts: "Arrives with two trader llamas; drinks Invisibility at night; despawns after 40–60 minutes." },
      { name: "Warden", chance: "100%", looting: "N/A", biome: "Deep Dark, summoned by repeated naturally generated Sculk Shrieker warnings", facts: "Blind but tracks vibrations and nearby entities by smell. It has extremely high health, powerful melee attacks, and a sonic-boom ranged attack." },
      { name: "Witch", chance: "10%", looting: "+2%", biome: "Swamp huts and at light level 0 elsewhere", facts: "Throws harmful potions and drinks buffs to survive; villagers struck by lightning become witches." },
      { name: "Wither", chance: "1%", looting: "+0.1%", biome: "Player-summoned boss", facts: "A three-headed boss that fires explosive wither skulls and drops a Nether Star. Its guaranteed head roll is weighted among normal (80%), armored (15%), invulnerable (3%), and armored-invulnerable (2%) appearances." }
    ];

    if (response.selection === 11) {
      showMobHeadBookForm(player);
    } else if (response.selection < mobData.length) {
      showMobDetail(player, mobData[response.selection], () => showBossesMobs(player));
    }
  });
}

// Animal Mobs - Page 1
function showAnimalMobs(player) {
  const form = new ActionFormData()
    .title("§6Animal Mobs - Page 1/2")
    .body("§7Select an animal mob head to view its drop chance:")
    .button("Camel", "textures/mobheads/items/camel")
    .button("Cat", "textures/mobheads/items/cat_tabby")
    .button("Chicken", "textures/mobheads/items/chicken_warm")
    .button("Cow", "textures/mobheads/items/cow")
    .button("Donkey", "textures/mobheads/items/donkey")
    .button("Fox", "textures/mobheads/items/fox_red")
    .button("Arctic Fox", "textures/mobheads/items/fox_arctic")
    .button("Frog (Cold)", "textures/mobheads/items/frog_cold")
    .button("Frog (Temperate)", "textures/mobheads/items/frog_temperate")
    .button("Frog (Warm)", "textures/mobheads/items/frog_warm")
    .button("Goat", "textures/mobheads/items/goat_default")
    .button("Horse", "textures/mobheads/items/horse_base_white")
    .button("Llama", "textures/mobheads/items/llama_gray")
    .button("Mooshroom", "textures/mobheads/items/mooshroom_red")
    .button("Mule", "textures/mobheads/items/mule")
    .button("Parrot", "textures/mobheads/items/parrot_red")
    .button("§eNext Page →")
    .button("§c← Back");

  form.show(player).then(response => {
    if (response.canceled) return;
    const mobData = [
      { name: "Camel", chance: "10%", looting: "+2%", biome: "Desert Villages", facts: "A two-seat mount with a forward dash. Its height keeps mounted players beyond the reach of many short melee mobs." },
      { name: "Cat", biome: "Villages and swamp huts", facts: "Has eleven coat variants. Tamed cats follow or sit for their owner, repel creepers and phantoms, and may bring gifts after their owner sleeps." },
      { name: "Chicken", chance: "10%", looting: "+2%", biome: "Most grassy Overworld biomes", facts: "Lays eggs, flaps to slow falls, and breeds with seeds. The pack drops heads matching the temperate, cold, or warm chicken appearance." },
      { name: "Cow", chance: "10%", looting: "+2%", biome: "Plains and many grassy biomes", facts: "Provides milk and breeds with wheat. The pack drops heads matching the temperate, cold, or warm cow appearance." },
      { name: "Donkey", chance: "1%", looting: "+0.1%", biome: "Plains and Meadows", facts: "Rideable and can carry a chest for storage; breeding with a horse produces a mule." },
      { name: "Fox", chance: "1%", looting: "+0.1%", biome: "Taiga biomes", facts: "Nocturnal hunter that picks up items in its mouth; can be trusted if bred in captivity." },
      { name: "Arctic Fox", chance: "1%", looting: "+0.1%", biome: "Snowy Taiga biomes", facts: "White variant adapted to snowy areas; similar behavior to red foxes." },
      { name: "Frog (Cold)", chance: "1%", looting: "+0.1%", biome: "Tadpoles grown in cold biomes (green)", facts: "Eats small slimes and magma cubes; produces a unique froglight color from magma cubes." },
      { name: "Frog (Temperate)", biome: "Tadpoles grown in temperate biomes (orange)", facts: "The frog variant is chosen by the biome temperature where a tadpole grows up. Temperate frogs create ochre froglights after eating small magma cubes." },
      { name: "Frog (Warm)", chance: "1%", looting: "+0.1%", biome: "Tadpoles grown in warm biomes (white)", facts: "Warm frogs create pearlescent froglights after eating small magma cubes." },
      { name: "Goat", chance: "10%", looting: "+1%", biome: "Mountain biomes", facts: "Can ram entities; may drop goat horns; screaming goats are rarer." },
      { name: "Horse", biome: "Plains and Savannas", facts: "A tameable mount with seven base coat colors and several marking patterns. This pack's head variants follow the horse's base coat color." },
      { name: "Llama", chance: "10%", looting: "+2%", biome: "Savanna and Windswept Hills", facts: "Can be tamed, decorated with carpets, and carry chests; forms caravans when leashed." },
      { name: "Mooshroom", chance: "10%", looting: "+2%", biome: "Mushroom Fields", facts: "Shearing turns it into a cow and drops mushrooms; lightning can swap red/brown variants." },
      { name: "Mule", chance: "1%", looting: "+0.1%", biome: "Bred from horse and donkey", facts: "Sterile hybrid; can be ridden and carry a chest; cannot breed." },
      { name: "Parrot", biome: "Jungles", facts: "Has five color variants, can be tamed with seeds, sits on shoulders, dances near jukeboxes, and imitates nearby hostile-mob sounds." }
    ];

    if (response.selection === 17) {
      showMobHeadBookForm(player);
    } else if (response.selection === 16) {
      showAnimalMobsPage2(player);
    } else if (response.selection < mobData.length) {
      showMobDetail(player, mobData[response.selection], () => showAnimalMobs(player));
    }
  });
}

// Animal Mobs - Page 2
function showAnimalMobsPage2(player) {
  const form = new ActionFormData()
    .title("§6Animal Mobs - Page 2/2")
    .body("§7Select an animal mob head to view its drop chance:")
    .button("Ocelot", "textures/mobheads/items/ocelot")
    .button("Panda", "textures/mobheads/items/panda")
    .button("Pig", "textures/mobheads/items/pig")
    .button("Polar Bear", "textures/mobheads/items/polar_bear")
    .button("Rabbit", "textures/mobheads/items/rabbit_coat_brown")
    .button("Sheep", "textures/mobheads/items/sheep_white")
    .button("§e← Previous Page")
    .button("§c← Back to Main");

  form.show(player).then(response => {
    if (response.canceled) return;
    const mobData = [
      { name: "Ocelot", chance: "10%", looting: "+2%", biome: "Jungle biomes", facts: "Skittish wild cat that scares creepers and phantoms; can be trusted by feeding fish but no longer becomes a domestic cat." },
      { name: "Panda", chance: "10%", looting: "+2%", biome: "Jungles, especially Bamboo Jungles", facts: "Has multiple personalities (playful, lazy, aggressive, worried, weak, brown); eats bamboo and cake; babies can sneeze." },
      { name: "Pig", chance: "10%", looting: "+2%", biome: "Most grassy Overworld biomes", facts: "Rideable with a saddle and carrot on a stick; lightning turns it into a zombified piglin. The pack matches temperate, cold, and warm pig appearances." },
      { name: "Polar Bear", chance: "10%", looting: "+2%", biome: "Snowy Shores and Frozen biomes", facts: "Neutral unless cubs are nearby; strong melee attack; cannot be bred." },
      { name: "Rabbit", chance: "10%", looting: "+2%", biome: "Deserts, snowy biomes, flower forests, taigas, and meadows", facts: "Its natural coat depends on biome. Naming one §fToast§7 gives the secret Toast appearance, which this pack preserves in its head drop." },
      { name: "Sheep", chance: "10%", looting: "+2%", biome: "Plains and many grassy biomes", facts: "Wool can be dyed 16 colors and regrows after eating grass. The dropped head matches its wool color; a sheep named §fjeb§7 drops the rainbow head when its roll succeeds." }
    ];

    if (response.selection === 7) {
      showMobHeadBookForm(player);
    } else if (response.selection === 6) {
      showAnimalMobs(player);
    } else if (response.selection < mobData.length) {
      showMobDetail(player, mobData[response.selection], () => showAnimalMobsPage2(player));
    }
  });
}

// Villager Biomes Menu
function showVillagerMenu(player) {
  const form = new ActionFormData()
    .title("§6Villager Heads")
    .body("§7Select a biome to view villager heads from that region:")
    .button("Desert Villagers", "textures/mobheads/items/villager_v2_desert_armorer")
    .button("Jungle Villagers", "textures/mobheads/items/villager_v2_jungle_armorer")
    .button("Plains Villagers", "textures/mobheads/items/villager_v2_plains_armorer")
    .button("Savanna Villagers", "textures/mobheads/items/villager_v2_savanna_armorer")
    .button("Snow Villagers", "textures/mobheads/items/villager_v2_snow_armorer")
    .button("Swamp Villagers", "textures/mobheads/items/villager_v2_swamp_armorer")
    .button("Taiga Villagers", "textures/mobheads/items/villager_v2_taiga_armorer")
    .button("§c← Back");

  form.show(player).then(response => {
    if (response.canceled) return;
    switch (response.selection) {
      case 0: showDesertVillagers(player); break;
      case 1: showJungleVillagers(player); break;
      case 2: showPlainsVillagers(player); break;
      case 3: showSavannaVillagers(player); break;
      case 4: showSnowVillagers(player); break;
      case 5: showSwampVillagers(player); break;
      case 6: showTaigaVillagers(player); break;
      case 7: showMobHeadBookForm(player); break;
    }
  });
}

// Desert Villagers
function showDesertVillagers(player) {
  const form = new ActionFormData()
    .title("§6Desert Villagers")
    .body("§7All villagers have a §e5% base drop chance §7with §e+1% per Looting level§7.\n\nSelect a profession:")
    .button("Armorer").button("Butcher").button("Cartographer").button("Cleric")
    .button("Farmer").button("Fisherman").button("Fletcher").button("Leatherworker")
    .button("Librarian").button("Mason").button("Nitwit").button("Shepherd")
    .button("Toolsmith").button("Unskilled").button("Weaponsmith")
    .button("§c← Back");

  form.show(player).then(response => {
    if (response.canceled) return;
    const professions = ["Armorer", "Butcher", "Cartographer", "Cleric", "Farmer", "Fisherman",
      "Fletcher", "Leatherworker", "Librarian", "Mason", "Nitwit", "Shepherd",
      "Toolsmith", "Unskilled", "Weaponsmith"];

    if (response.selection === 15) {
      showVillagerMenu(player);
    } else if (response.selection < professions.length) {
      showMobDetail(player, {
        name: `Desert ${professions[response.selection]}`,
        chance: "5%",
        looting: "+1%",
        biome: "Found in Desert Villages",
        facts: "Desert villagers wear orange/yellow clothing. Professions vary by job site blocks; zombification and curing can improve trades."
      }, () => showDesertVillagers(player));
    }
  });
}

// Jungle Villagers
function showJungleVillagers(player) {
  const form = new ActionFormData()
    .title("§6Jungle Villagers")
    .body("§7All villagers have a §e5% base drop chance §7with §e+1% per Looting level§7.\n\nSelect a profession:")
    .button("Armorer").button("Butcher").button("Cartographer").button("Cleric")
    .button("Farmer").button("Fisherman").button("Fletcher").button("Leatherworker")
    .button("Librarian").button("Mason").button("Nitwit").button("Shepherd")
    .button("Toolsmith").button("Unskilled").button("Weaponsmith")
    .button("§c← Back");

  form.show(player).then(response => {
    if (response.canceled) return;
    const professions = ["Armorer", "Butcher", "Cartographer", "Cleric", "Farmer", "Fisherman",
      "Fletcher", "Leatherworker", "Librarian", "Mason", "Nitwit", "Shepherd",
      "Toolsmith", "Unskilled", "Weaponsmith"];

    if (response.selection === 15) {
      showVillagerMenu(player);
    } else if (response.selection < professions.length) {
      showMobDetail(player, {
        name: `Jungle ${professions[response.selection]}`,
        chance: "5%",
        looting: "+1%",
        biome: "Found in Jungle Villages",
        facts: "Jungle villagers wear green/brown clothing. Villagers seek shelter from rain and sleep at night; gossip affects iron golem spawning and prices."
      }, () => showJungleVillagers(player));
    }
  });
}

// Plains Villagers
function showPlainsVillagers(player) {
  const form = new ActionFormData()
    .title("§6Plains Villagers")
    .body("§7All villagers have a §e5% base drop chance §7with §e+1% per Looting level§7.\n\nSelect a profession:")
    .button("Armorer").button("Butcher").button("Cartographer").button("Cleric")
    .button("Farmer").button("Fisherman").button("Fletcher").button("Leatherworker")
    .button("Librarian").button("Mason").button("Nitwit").button("Shepherd")
    .button("Toolsmith").button("Unskilled").button("Weaponsmith")
    .button("§c← Back");

  form.show(player).then(response => {
    if (response.canceled) return;
    const professions = ["Armorer", "Butcher", "Cartographer", "Cleric", "Farmer", "Fisherman",
      "Fletcher", "Leatherworker", "Librarian", "Mason", "Nitwit", "Shepherd",
      "Toolsmith", "Unskilled", "Weaponsmith"];

    if (response.selection === 15) {
      showVillagerMenu(player);
    } else if (response.selection < professions.length) {
      showMobDetail(player, {
        name: `Plains ${professions[response.selection]}`,
        chance: "5%",
        looting: "+1%",
        biome: "Found in Plains Villages",
        facts: "Plains villagers wear classic brown clothing. Iron golems protect villages; work hours and bed claims drive daily routines."
      }, () => showPlainsVillagers(player));
    }
  });
}

// Savanna Villagers
function showSavannaVillagers(player) {
  const form = new ActionFormData()
    .title("§6Savanna Villagers")
    .body("§7All villagers have a §e5% base drop chance §7with §e+1% per Looting level§7.\n\nSelect a profession:")
    .button("Armorer").button("Butcher").button("Cartographer").button("Cleric")
    .button("Farmer").button("Fisherman").button("Fletcher").button("Leatherworker")
    .button("Librarian").button("Mason").button("Nitwit").button("Shepherd")
    .button("Toolsmith").button("Unskilled").button("Weaponsmith")
    .button("§c← Back");

  form.show(player).then(response => {
    if (response.canceled) return;
    const professions = ["Armorer", "Butcher", "Cartographer", "Cleric", "Farmer", "Fisherman",
      "Fletcher", "Leatherworker", "Librarian", "Mason", "Nitwit", "Shepherd",
      "Toolsmith", "Unskilled", "Weaponsmith"];

    if (response.selection === 15) {
      showVillagerMenu(player);
    } else if (response.selection < professions.length) {
      showMobDetail(player, {
        name: `Savanna ${professions[response.selection]}`,
        chance: "5%",
        looting: "+1%",
        biome: "Found in Savanna Villages",
        facts: "Savanna villagers wear orange/red clothing; settlements use acacia. Zombies can break doors on Hard difficulty."
      }, () => showSavannaVillagers(player));
    }
  });
}

// Snow Villagers
function showSnowVillagers(player) {
  const form = new ActionFormData()
    .title("§6Snow Villagers")
    .body("§7All villagers have a §e5% base drop chance §7with §e+1% per Looting level§7.\n\nSelect a profession:")
    .button("Armorer").button("Butcher").button("Cartographer").button("Cleric")
    .button("Farmer").button("Fisherman").button("Fletcher").button("Leatherworker")
    .button("Librarian").button("Mason").button("Nitwit").button("Shepherd")
    .button("Toolsmith").button("Unskilled").button("Weaponsmith")
    .button("§c← Back");

  form.show(player).then(response => {
    if (response.canceled) return;
    const professions = ["Armorer", "Butcher", "Cartographer", "Cleric", "Farmer", "Fisherman",
      "Fletcher", "Leatherworker", "Librarian", "Mason", "Nitwit", "Shepherd",
      "Toolsmith", "Unskilled", "Weaponsmith"];

    if (response.selection === 15) {
      showVillagerMenu(player);
    } else if (response.selection < professions.length) {
      showMobDetail(player, {
        name: `Snow ${professions[response.selection]}`,
        chance: "5%",
        looting: "+1%",
        biome: "Found in Snowy Villages",
        facts: "Snow villagers wear blue/cyan clothing; snowy villages use spruce wood. All professions are possible depending on job sites."
      }, () => showSnowVillagers(player));
    }
  });
}

// Swamp Villagers
function showSwampVillagers(player) {
  const form = new ActionFormData()
    .title("§6Swamp Villagers")
    .body("§7All villagers have a §e5% base drop chance §7with §e+1% per Looting level§7.\n\nSelect a profession:")
    .button("Armorer").button("Butcher").button("Cartographer").button("Cleric")
    .button("Farmer").button("Fisherman").button("Fletcher").button("Leatherworker")
    .button("Librarian").button("Mason").button("Nitwit").button("Shepherd")
    .button("Toolsmith").button("Unskilled").button("Weaponsmith")
    .button("§c← Back");

  form.show(player).then(response => {
    if (response.canceled) return;
    const professions = ["Armorer", "Butcher", "Cartographer", "Cleric", "Farmer", "Fisherman",
      "Fletcher", "Leatherworker", "Librarian", "Mason", "Nitwit", "Shepherd",
      "Toolsmith", "Unskilled", "Weaponsmith"];

    if (response.selection === 15) {
      showVillagerMenu(player);
    } else if (response.selection < professions.length) {
      showMobDetail(player, {
        name: `Swamp ${professions[response.selection]}`,
        chance: "5%",
        looting: "+1%",
        biome: "Found in Swamp Villages",
        facts: "Swamp villagers wear purple clothing; cats commonly spawn in villages; nearby swamp huts can host witches."
      }, () => showSwampVillagers(player));
    }
  });
}

// Taiga Villagers
function showTaigaVillagers(player) {
  const form = new ActionFormData()
    .title("§6Taiga Villagers")
    .body("§7All villagers have a §e5% base drop chance §7with §e+1% per Looting level§7.\n\nSelect a profession:")
    .button("Armorer").button("Butcher").button("Cartographer").button("Cleric")
    .button("Farmer").button("Fisherman").button("Fletcher").button("Leatherworker")
    .button("Librarian").button("Mason").button("Nitwit").button("Shepherd")
    .button("Toolsmith").button("Unskilled").button("Weaponsmith")
    .button("§c← Back");

  form.show(player).then(response => {
    if (response.canceled) return;
    const professions = ["Armorer", "Butcher", "Cartographer", "Cleric", "Farmer", "Fisherman",
      "Fletcher", "Leatherworker", "Librarian", "Mason", "Nitwit", "Shepherd",
      "Toolsmith", "Unskilled", "Weaponsmith"];

    if (response.selection === 15) {
      showVillagerMenu(player);
    } else if (response.selection < professions.length) {
      showMobDetail(player, {
        name: `Taiga ${professions[response.selection]}`,
        chance: "5%",
        looting: "+1%",
        biome: "Found in Taiga Villages",
        facts: "Taiga villagers wear brown/cream clothing; settlements use spruce; bells gather villagers and influence gossip."
      }, () => showTaigaVillagers(player));
    }
  });
}

// Wolf Variants Menu
function showWolfMenu(player) {
  const form = new ActionFormData()
    .title("§6Wolf Variants")
    .body("§7All wolves have a §e20% base drop chance §7with §e+1% per Looting level§7.\n\nSelect a wolf variant:")
    .button("Wild Wolf").button("Tamed Wolf").button("Angry Wolf")
    .button("Ashen Wolf").button("Black Wolf").button("Chestnut Wolf")
    .button("Rusty Wolf").button("Spotted Wolf").button("Striped Wolf")
    .button("Winter Wolf").button("Woods Wolf")
    .button("§c← Back");

  form.show(player).then(response => {
    if (response.canceled) return;
    const wolfData = [
      { name: "Wild Wolf", chance: "20%", looting: "+1%", biome: "Forests and Taigas", facts: "Neutral until attacked; hunts sheep, rabbits, foxes, and skeletons; can be tamed with bones." },
      { name: "Tamed Wolf", chance: "20%", looting: "+1%", biome: "Created by taming wild wolves", facts: "Follows and defends its owner; sits on command; collar color can be dyed; heals by feeding meat." },
      { name: "Angry Wolf", chance: "20%", looting: "+1%", biome: "Triggered when hurt or owner attacked", facts: "Hostile red-eyed variant that attacks in packs; calms over time if not further provoked." },
      { name: "Ashen Wolf", chance: "20%", looting: "+1%", biome: "Snowy Taiga biomes", facts: "Cold-adapted gray variant; behavior matches other wolves." },
      { name: "Black Wolf", chance: "20%", looting: "+1%", biome: "Old Growth Pine Taiga", facts: "Dark-fur wolf variant native to old-growth pine forests." },
      { name: "Chestnut Wolf", chance: "20%", looting: "+1%", biome: "Old Growth Spruce Taiga", facts: "Reddish-brown variant native to older spruce forests." },
      { name: "Rusty Wolf", chance: "20%", looting: "+1%", biome: "Sparse Jungle biomes", facts: "Jungle-adapted reddish variant; less common than forest wolves." },
      { name: "Spotted Wolf", chance: "20%", looting: "+1%", biome: "Savanna Plateau biomes", facts: "Distinctive spotted coat; suited to hot climates." },
      { name: "Striped Wolf", chance: "20%", looting: "+1%", biome: "Wooded Badlands", facts: "Arid-biome variant with stripe patterns." },
      { name: "Winter Wolf", chance: "20%", looting: "+1%", biome: "Grove biomes", facts: "White-fur variant adapted to snowy mountain meadows." },
      { name: "Woods Wolf", chance: "20%", looting: "+1%", biome: "Forest biomes", facts: "Common forest wolf with classic gray-brown coat; natural pack hunter." }
    ];

    if (response.selection === 11) {
      showMobHeadBookForm(player);
    } else if (response.selection < wolfData.length) {
      showMobDetail(player, wolfData[response.selection], () => showWolfMenu(player));
    }
  });
}

function showShulkerRecipes(player) {
  const form = new ActionFormData()
    .title("§6Shulker Mask Recipes")
    .body(
      "§7Kill a shulker to obtain the §5Undyed Shulker Mask§7.\n\n" +
      "§aPicking up the undyed mask unlocks all 16 dye recipes.\n\n" +
      "§eRecipe\n§fUndyed Shulker Mask + any dye\n§7→ Matching colored Shulker Mask\n\n" +
      "§dAvailable colors\n§fWhite, Orange, Magenta, Light Blue, Yellow, Lime, Pink, Gray, " +
      "Light Gray, Cyan, Purple, Blue, Brown, Green, Red, and Black.\n\n" +
      "§bSecret variant\n§7Name a living shulker §fjeb§7. If its head-drop roll succeeds, it drops the rainbow mask."
    )
    .button("§c← Back");

  form.show(player).then(response => {
    if (!response.canceled && response.selection === 0) showMobHeadBookForm(player);
  });
}

function showEasterEggs(player) {
  const form = new ActionFormData()
    .title("§dEaster Egg Heads")
    .body(
      "§8━━━━━━━━━━━━━━━━━━━━━━\n" +
      "§c§lZC §a§lSECRET HEADS§r\n" +
      "§8━━━━━━━━━━━━━━━━━━━━━━\n\n" +
      "§7Rename any mob with one of the names below, then land the credited killing blow for a chance to collect that special head.\n\n" +
      "§eBase chance §8• §f10%\n" +
      "§eLooting bonus §8• §f+1% per level\n\n" +
      "§aNames are case-insensitive. Do not include the word \"Mask.\"\n\n" +
      "§6§lAVAILABLE NAMES§r\n" +
      "§fZombieClinic, ZombieClinic2, satandragon3233, Nuisance82mc, Herobrine, DoomGuy, Mario, Eggman, " +
      "Bedrock City, ArcticShark, Uncle Grandpa, Old Guy, Im a Meme, Trickledabit, Knight2077, " +
      "ClassSick1, bluewinqs, Tj, usuriousberry39, xXHeadTripXx, ChromGod3329, LizzyAaaa, Robbae03, " +
      "ScreamingEgl, TheN1NJ4LL0, TheOGHoney, ToroLoco, Vegan Chzburger, WeeHannahx0, ZellaBites, " +
      "bazzerk, sloth, spartanlex2, Russbox, Universal9Gaming, and snow.\n\n" +
      "§d§lJEB SECRETS§r\n" +
      "§7Name a sheep or shulker §fjeb§7 to make its successful normal head roll drop the matching rainbow Jeb head."
    )
    .button("§c← Back");

  form.show(player).then(response => {
    if (!response.canceled && response.selection === 0) showMobHeadBookForm(player);
  });
}

// Generic mob detail display
function showMobDetail(player, mobData, backFunction) {
  const config = dropConfigFor(mobData);
  const chance = config ? percent(config.chance) : mobData.chance;
  const looting = config ? `+${percent(config.lootingBonus)}` : mobData.looting;
  const dropChanceText = chance === "100%"
    ? "§a§lGUARANTEED DROP!"
    : `§eBase chance §8• §f${chance}\n§eLooting bonus §8• §f${looting} per level`;

  const form = new ActionFormData()
    .title(`§6${mobData.name} Head`)
    .body(
      `§8━━━━━━━━━━━━━━━━━━━━━━\n` +
      `§6§lDROP RATE§r\n${dropChanceText}\n\n` +
      `§b§lFOUND IN§r\n§7${mobData.biome}\n\n` +
      `§a§lCOLLECTOR NOTES§r\n§7${mobData.facts}\n\n` +
      `§8Player-attributed kills only.\n` +
      `§8━━━━━━━━━━━━━━━━━━━━━━`
    )
    .button("§c← Back");

  form.show(player).then(response => {
    if (response.selection === 0) {
      backFunction(player);
    }
  });
}

system.beforeEvents.startup.subscribe((event) => {
  event.itemComponentRegistry.registerCustomComponent("zombie:mobheadbook", new MobHeadBook());
});
