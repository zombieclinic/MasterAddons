import { system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";


class MobHeadBook {
  onUse(event) {
    const { source: player } = event;
    showMobHeadBookForm(player);
  }
}

function showMobHeadBookForm(player) {
  const MobHeadBookForm = new ActionFormData()
    .title("§6The Mob Heads Guidebook")
    .body("§7Welcome to the Mob Heads Addon!\n\n§fMob heads are rare drops obtained by killing mobs. Each mob has a chance to drop their head when killed by a player.\n\n§eDrop chances vary by mob and can be increased with the Looting enchantment!\n\n§aSelect a category below to view specific mob heads and their drop rates:")
    .button("§lBasic Mobs", "textures/mobheads/items/cow")
    .button("§lUndead Mobs", "textures/mobheads/items/husk")
    .button("§lNether Mobs", "textures/mobheads/items/blaze")
    .button("§lEnd Mobs", "textures/mobheads/items/enderman")
    .button("§lAquatic Mobs", "textures/mobheads/items/dolphin")
    .button("§lBosses & Rare", "textures/mobheads/items/warden")
    .button("§lAnimals", "textures/mobheads/items/cow")
    .button("§lVillagers", "textures/mobheads/items/villager_v2_desert_armorer")
    .button("§lWolf Variants", "textures/mobheads/items/wolf_wild");

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
    .button("Creaking", "textures/mobheads/items/creaking_icon")
    .button("Iron Golem", "textures/mobheads/items/iron_golem")
    .button("Silverfish", "textures/mobheads/items/silverfish")
    .button("Slime", "textures/mobheads/items/slime")
    .button("Snow Golem", "textures/mobheads/items/snow_golem")
    .button("Spider", "textures/mobheads/items/spider")
    .button("Vex", "textures/mobheads/items/vex")
    .button("§c← Back", "textures/ui/back");

  form.show(player).then(response => {
    if (response.canceled) return;
    const mobData = [
      { name: "Allay", chance: "10%", looting: "+2%", biome: "Found in Woodland Mansions and near Pillager Outposts", facts: "Friendly helper that picks up matching items and follows note blocks it has been tuned to. Can duplicate when dancing near a jukebox by giving it an amethyst shard." },
      { name: "Armadillo", chance: "10%", looting: "+2%", biome: "Spawns in Savannas and Badlands", facts: "Rolls into a ball when threatened. Drops armadillo scutes used for wolf armor; brushing yields scutes." },
      { name: "Bat", chance: "10%", looting: "+2%", biome: "Spawns in caves and underground areas below Y=63", facts: "Ambient mob that does not attack; roosts upside down and flies away when disturbed." },
      { name: "Bee", chance: "10%", looting: "+2%", biome: "Spawns near nests in Plains, Sunflower Plains, and Flower Forests", facts: "Pollinates crops and produces honey. Becomes angry if its hive is broken; a bee dies shortly after stinging." },
      { name: "Cave Spider", chance: "10%", looting: "+2%", biome: "Spawns from spawners in Mineshafts", facts: "Smaller than spiders and inflicts Poison on hit. Can fit through 1-block gaps." },
      { name: "Creaking", chance: "20%", looting: "+1%", biome: "Found in Pale Garden biomes at night", facts: "Freezes when you look directly at it (won’t freeze if you wear a carved pumpkin). Naturally spawned Creakings are immune to damage—hit one to reveal an orange particle trail pointing to its Creaking Heart hidden in pale oak logs. Destroying the Heart instantly makes the Creaking disintegrate. Striking a Creaking can also cause resin clumps to form on nearby pale oak logs." },
      { name: "Iron Golem", chance: "10%", looting: "+2%", biome: "Spawns naturally in Villages or can be player-built", facts: "Village protector. Can be built with iron blocks and a carved pumpkin; offers poppies to baby villagers." },
      { name: "Silverfish", chance: "10%", looting: "+2%", biome: "Commonly in Strongholds and from infested stone in some mountain areas", facts: "Hides in infested blocks and calls nearby silverfish when attacked." },
      { name: "Slime", chance: "10%", looting: "+2%", biome: "Spawns in Swamps at night and in slime chunks below Y=40", facts: "Splits into smaller slimes on death; size determines health and damage." },
      { name: "Snow Golem", chance: "10%", looting: "+2%", biome: "Player-built with snow blocks and a pumpkin", facts: "Throws snowballs at hostile mobs and leaves snow layers in cold biomes; takes damage from rain/heat." },
      { name: "Spider", chance: "10%", looting: "+2%", biome: "Spawns in darkness in the Overworld", facts: "Neutral in daylight unless provoked; can climb walls; can spawn with a skeleton rider (spider jockey)." },
      { name: "Vex", chance: "1%", looting: "+0.1%", biome: "Summoned by Evokers in Mansions and Raids", facts: "Small flying hostile mob that can pass through blocks and wields an iron sword." }
    ];

    if (response.selection === 12) {
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
    .button("Drowned", "textures/mobheads/items/drowned")
    .button("Husk", "textures/mobheads/items/husk")
    .button("Phantom", "textures/mobheads/items/phantom")
    .button("Skeleton Horse", "textures/mobheads/items/skeleton_horse")
    .button("Stray", "textures/mobheads/items/stray")
    .button("Zombie Villager", "textures/mobheads/items/zombie_villager_v2")
    .button("§c← Back", "textures/ui/back");

  form.show(player).then(response => {
    if (response.canceled) return;
    const mobData = [
      { name: "Drowned", chance: "10%", looting: "+2%", biome: "Oceans, Rivers, and underwater ruins", facts: "Underwater zombie variant; some spawn with tridents and nautilus shells. Burns in sunlight when on land." },
      { name: "Husk", chance: "1%", looting: "+0.1%", biome: "Deserts and variants", facts: "Desert zombie that does not burn in sunlight and inflicts Hunger. Converts to a normal zombie after prolonged submersion." },
      { name: "Phantom", chance: "10%", looting: "+2%", biome: "Spawns at night if a player hasn’t slept for 3+ days", facts: "Flying undead that swoops from above; drops phantom membranes used for Slow Falling potions." },
      { name: "Skeleton Horse", chance: "1%", looting: "+0.1%", biome: "From skeleton traps during thunderstorms", facts: "Headless-looking undead steed from trap events; can be ridden and moves well underwater." },
      { name: "Stray", chance: "10%", looting: "+2%", biome: "Ice Spikes, Frozen Oceans, and snowy biomes", facts: "Cold-biome skeleton variant that shoots Arrows of Slowness." },
      { name: "Zombie Villager", chance: "1%", looting: "+0.1%", biome: "Any biome; also from villagers killed by zombies", facts: "Can be cured with Splash Weakness + Golden Apple; retains profession attire." }
    ];

    if (response.selection === 6) {
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
    .button("§c← Back", "textures/ui/back");

  form.show(player).then(response => {
    if (response.canceled) return;
    const mobData = [
      { name: "Blaze", chance: "10%", looting: "+2%", biome: "From spawners in Nether Fortresses", facts: "Flying mob that shoots fireballs; drops blaze rods essential for brewing and Eyes of Ender." },
      { name: "Ghast", chance: "10%", looting: "+2%", biome: "Open areas of the Nether", facts: "Large floating mob that fires explosive fireballs; drops ghast tears and gunpowder." },
      { name: "Hoglin", chance: "10%", looting: "+2%", biome: "Crimson Forests", facts: "Hostile pig-beast repelled by warped fungus; turns into a Zoglin if brought to the Overworld." },
      { name: "Magma Cube", chance: "10%", looting: "+2%", biome: "Nether Wastes and Basalt Deltas", facts: "Nether counterpart to slimes; splits into smaller cubes and is immune to fire and lava." },
      { name: "Piglin Brute", chance: "10%", looting: "+2%", biome: "Bastion Remnants", facts: "Tough piglin that always attacks on sight and cannot be bartered with; wields an axe." },
      { name: "Strider", chance: "10%", looting: "+2%", biome: "Across lava lakes in all Nether biomes", facts: "Passive lava-walker; can be saddled and controlled with warped fungus on a stick; shivers outside lava." },
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
    .button("§c← Back", "textures/ui/back");

  form.show(player).then(response => {
    if (response.canceled) return;
    const mobData = [
      { name: "Enderman", chance: "1%", looting: "+0.1%", biome: "The End, Nether, and rarely Overworld at night", facts: "Teleports and picks up certain blocks; becomes hostile when stared at; drops ender pearls." },
      { name: "Endermite", chance: "10%", looting: "+2%", biome: "5% chance from thrown ender pearls", facts: "Small hostile mob that attracts Enderman aggression; despawns after a short time (~2 minutes)." }
    ];

    if (response.selection === 2) {
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
    .button("Cod", "textures/mobheads/items/cod")
    .button("Dolphin", "textures/mobheads/items/dolphin")
    .button("Elder Guardian", "textures/mobheads/items/elder_guardian")
    .button("Glow Squid", "textures/mobheads/items/glow_squid")
    .button("Guardian", "textures/mobheads/items/guardian")
    .button("Pufferfish", "textures/mobheads/items/pufferfish")
    .button("Salmon", "textures/mobheads/items/salmon")
    .button("Squid", "textures/mobheads/items/squid")
    .button("Tadpole", "textures/mobheads/items/tadpole")
    .button("Tropical Fish", "textures/mobheads/items/tropicalfish")
    .button("Turtle", "textures/mobheads/items/turtle")
    .button("§c← Back", "textures/ui/back");

  form.show(player).then(response => {
    if (response.canceled) return;
    const mobData = [
      { name: "Cod", chance: "10%", looting: "+2%", biome: "Oceans (Cold, Normal, Lukewarm)", facts: "Swims in schools; can be caught in a bucket; used as food or to tempt cats." },
      { name: "Dolphin", chance: "10%", looting: "+2%", biome: "Most ocean biomes except Frozen", facts: "Leads players to shipwrecks and ruins; grants Dolphin’s Grace when nearby in water." },
      { name: "Elder Guardian", chance: "10%", looting: "+2%", biome: "Three per Ocean Monument", facts: "Mini-boss that applies Mining Fatigue; drops wet sponges and prismarine items." },
      { name: "Glow Squid", chance: "10%", looting: "+2%", biome: "Underground water below Y=30", facts: "Emits a glow effect and drops glow ink sacs to make text/item frames glow." },
      { name: "Guardian", chance: "10%", looting: "+2%", biome: "In and around Ocean Monuments", facts: "Hostile laser-firing fish with retractable spikes; drops prismarine shards/crystals." },
      { name: "Pufferfish", chance: "10%", looting: "+2%", biome: "Warm Ocean biomes", facts: "Inflates when approached and inflicts Poison on contact; used to brew Water Breathing." },
      { name: "Salmon", chance: "10%", looting: "+2%", biome: "Rivers, Frozen Oceans, and Cold Oceans", facts: "Comes in multiple sizes; can be caught in buckets and cooked for food." },
      { name: "Squid", chance: "10%", looting: "+2%", biome: "Oceans and Rivers", facts: "Releases an ink cloud when hurt; drops ink sacs used for dye and books/quills." },
      { name: "Tadpole", chance: "1%", looting: "+0.1%", biome: "From breeding frogs (grows by temperature into variants)", facts: "Baby frog form; can be scooped in a bucket; takes ~20 minutes to grow into a frog variant." },
      { name: "Tropical Fish", chance: "10%", looting: "+2%", biome: "Warm Oceans and Lush Caves", facts: "Extremely varied colors/patterns (thousands of combos); used to breed axolotls and tempt cats." },
      { name: "Turtle", chance: "10%", looting: "+2%", biome: "Warm beaches", facts: "Lays eggs on home beaches; babies drop scutes when growing; adults can’t be bred without seagrass." }
    ];

    if (response.selection === 11) {
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
    .button("§c← Back", "textures/ui/back");

  form.show(player).then(response => {
    if (response.canceled) return;
    const mobData = [
      { name: "Bogged", chance: "10%", looting: "+2%", biome: "Swamps and Mangrove Swamps", facts: "Moss-covered skeleton variant that shoots Poison-tipped arrows; can generate mushrooms on its model." },
      { name: "Breeze", chance: "10%", looting: "+2%", biome: "Trial Chambers (Trial Spawners)", facts: "Wind-based foe that fires wind charges to knock back and move entities; highly mobile." },
      { name: "Illager", chance: "10%", looting: "+2%", biome: "Illager faction across Outposts, Mansions, and Raids", facts: "Hostile villager offshoot. Variants include Pillagers (crossbows), Vindicators (axes), and Evokers (fangs/vex summons)." },
      { name: "Pillager", chance: "10%", looting: "+2%", biome: "Outposts and Raids", facts: "Crossbow-wielding illager; raid captains wear banners; crossbows can break after heavy use." },
      { name: "Ravager", chance: "10%", looting: "+2%", biome: "Raids (wave 3+)", facts: "Massive beast that tramples crops and deals heavy melee damage; can carry pillagers/vindicators during raids." },
      { name: "Sniffer", chance: "10%", looting: "+2%", biome: "Hatched from eggs in Warm Ocean Ruins", facts: "Ancient passive mob that sniffs and digs up torchflower and pitcher plant seeds; can be bred with torchflower seeds." },
      { name: "Vindicator", chance: "10%", looting: "+2%", biome: "Woodland Mansions and Raids", facts: "Aggressive illager with an iron axe; named “Johnny” attacks nearly all mobs." },
      { name: "Wandering Trader", chance: "1%", looting: "+0.1%", biome: "Randomly near players in the Overworld", facts: "Arrives with two trader llamas; drinks Invisibility at night; despawns after 40–60 minutes." },
      { name: "Warden", chance: "100%", looting: "N/A", biome: "Deep Dark via Sculk Shriekers", facts: "Blind but tracks vibrations and sense of smell; highest health and damage; drops a sculk catalyst." },
      { name: "Witch", chance: "10%", looting: "+2%", biome: "Swamp huts and at light level 0 elsewhere", facts: "Throws harmful potions and drinks buffs to survive; villagers struck by lightning become witches." },
      { name: "Wither", chance: "1%", looting: "+0.1%", biome: "Summoned boss", facts: "Three-headed boss that fires wither skulls and causes the Wither effect; drops a nether star for beacons." }
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
    .button("Chicken", "textures/mobheads/items/chicken_warm")
    .button("Cow", "textures/mobheads/items/cow")
    .button("Donkey", "textures/mobheads/items/donkey")
    .button("Fox", "textures/mobheads/items/fox_red")
    .button("Arctic Fox", "textures/mobheads/items/fox_arctic")
    .button("Frog (Cold)", "textures/mobheads/items/frog_cold")
    .button("Frog (Warm)", "textures/mobheads/items/frog_warm")
    .button("Goat", "textures/mobheads/items/goat_default")
    .button("Llama", "textures/mobheads/items/llama_gray")
    .button("Mooshroom", "textures/mobheads/items/mooshroom_red")
    .button("Mule", "textures/mobheads/items/mule")
    .button("§eNext Page →")
    .button("§c← Back", "textures/ui/back");

  form.show(player).then(response => {
    if (response.canceled) return;
    const mobData = [
      { name: "Camel", chance: "10%", looting: "+2%", biome: "Desert Villages", facts: "Two-seater mount with a dash; tall enough to keep riders out of most melee reach; immune to standard knockback." },
      { name: "Chicken", chance: "10%", looting: "+2%", biome: "Most grassy Overworld biomes", facts: "Lays eggs periodically; falls slowly and takes no fall damage; bred with any seeds." },
      { name: "Cow", chance: "10%", looting: "+2%", biome: "Plains and many grassy biomes", facts: "Renewable milk source; drops leather and beef; bred with wheat." },
      { name: "Donkey", chance: "1%", looting: "+0.1%", biome: "Plains and Meadows", facts: "Rideable and can carry a chest for storage; breeding with a horse produces a mule." },
      { name: "Fox", chance: "1%", looting: "+0.1%", biome: "Taiga biomes", facts: "Nocturnal hunter that picks up items in its mouth; can be trusted if bred in captivity." },
      { name: "Arctic Fox", chance: "1%", looting: "+0.1%", biome: "Snowy Taiga biomes", facts: "White variant adapted to snowy areas; similar behavior to red foxes." },
      { name: "Frog (Cold)", chance: "1%", looting: "+0.1%", biome: "Tadpoles grown in cold biomes (green)", facts: "Eats small slimes and magma cubes; produces a unique froglight color from magma cubes." },
      { name: "Frog (Warm)", chance: "1%", looting: "+0.1%", biome: "Tadpoles grown in warm/temperate biomes", facts: "Different frog variants yield different froglight colors when eating magma cubes." },
      { name: "Goat", chance: "10%", looting: "+2%", biome: "Mountain biomes", facts: "Can ram entities; may drop goat horns; screaming goats are rarer." },
      { name: "Llama", chance: "10%", looting: "+2%", biome: "Savanna and Windswept Hills", facts: "Can be tamed, decorated with carpets, and carry chests; forms caravans when leashed." },
      { name: "Mooshroom", chance: "10%", looting: "+2%", biome: "Mushroom Fields", facts: "Shearing turns it into a cow and drops mushrooms; lightning can swap red/brown variants." },
      { name: "Mule", chance: "1%", looting: "+0.1%", biome: "Bred from horse and donkey", facts: "Sterile hybrid; can be ridden and carry a chest; cannot breed." }
    ];

    if (response.selection === 13) {
      showMobHeadBookForm(player);
    } else if (response.selection === 12) {
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
    .button("Sheep", "textures/mobheads/items/rabbit_coat_brown")
    .button("§e← Previous Page")
    .button("§c← Back to Main", "textures/ui/back");

  form.show(player).then(response => {
    if (response.canceled) return;
    const mobData = [
      { name: "Ocelot", chance: "10%", looting: "+2%", biome: "Jungle biomes", facts: "Skittish wild cat that scares creepers and phantoms; can be trusted by feeding fish but no longer becomes a domestic cat." },
      { name: "Panda", chance: "10%", looting: "+2%", biome: "Jungles, especially Bamboo Jungles", facts: "Has multiple personalities (playful, lazy, aggressive, worried, weak, brown); eats bamboo and cake; babies can sneeze." },
      { name: "Pig", chance: "10%", looting: "+2%", biome: "Most grassy Overworld biomes", facts: "Rideable with saddle and carrot on a stick; drops porkchops; lightning can turn pigs into zombified piglins." },
      { name: "Polar Bear", chance: "10%", looting: "+2%", biome: "Snowy Shores and Frozen biomes", facts: "Neutral unless cubs are nearby; strong melee attack; cannot be bred." },
      { name: "Rabbit", chance: "10%", looting: "+2%", biome: "Plains, Forests, Taigas, Deserts, and more", facts: "Small and fast with multiple variants; rare “Toast” skin via name; drops hide and meat." },
      { name: "Sheep", chance: "10%", looting: "+2%", biome: "Plains and most grassy biomes", facts: "Wool can be dyed 16 colors; regrows wool by eating grass; naturally spawning pink sheep are rare." }
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
    .button("§c← Back", "textures/ui/back");

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
    .body("§7All villagers have a §e1% base drop chance §7with §e+0.1% per Looting level§7.\n\nSelect a profession:")
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
        chance: "1%",
        looting: "+0.1%",
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
    .body("§7All villagers have a §e1% base drop chance §7with §e+0.1% per Looting level§7.\n\nSelect a profession:")
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
        chance: "1%",
        looting: "+0.1%",
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
    .body("§7All villagers have a §e1% base drop chance §7with §e+0.1% per Looting level§7.\n\nSelect a profession:")
    .button("Armorer")
    .button("§c← Back");

  form.show(player).then(response => {
    if (response.canceled) return;

    if (response.selection === 1) {
      showVillagerMenu(player);
    } else if (response.selection === 0) {
      showMobDetail(player, {
        name: "Snow Armorer",
        chance: "1%",
        looting: "+0.1%",
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
    .body("§7All villagers have a §e1% base drop chance §7with §e+0.1% per Looting level§7.\n\nSelect a profession:")
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
        chance: "1%",
        looting: "+0.1%",
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
    .body("§7All villagers have a §e1% base drop chance §7with §e+0.1% per Looting level§7.\n\nSelect a profession:")
    .button("Armorer").button("Butcher").button("Cartographer").button("Cleric")
    .button("Farmer").button("Fisherman").button("Fletcher").button("Leatherworker")
    .button("Librarian").button("Mason")
    .button("§c← Back");

  form.show(player).then(response => {
    if (response.canceled) return;
    const professions = ["Armorer", "Butcher", "Cartographer", "Cleric", "Farmer", "Fisherman",
      "Fletcher", "Leatherworker", "Librarian", "Mason"];

    if (response.selection === 10) {
      showVillagerMenu(player);
    } else if (response.selection < professions.length) {
      showMobDetail(player, {
        name: `Taiga ${professions[response.selection]}`,
        chance: "1%",
        looting: "+0.1%",
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
      { name: "Black Wolf", chance: "20%", looting: "+1%", biome: "Old Growth Pine/Spruce Taiga", facts: "Dark-fur variant found in ancient taiga forests." },
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

// Generic mob detail display
function showMobDetail(player, mobData, backFunction) {
  const dropChanceText = mobData.chance === "100%"
    ? "§a§lGUARANTEED DROP!"
    : `§eBase Drop Chance: §f${mobData.chance}\n§eLooting Bonus: §f${mobData.looting} per level`;

  const form = new ActionFormData()
    .title(`§6${mobData.name} Head`)
    .body(`§7━━━━━━━━━━━━━━━━━━━━━━\n\n${dropChanceText}\n\n§b${mobData.biome}\n\n§7${mobData.facts}\n\n§7━━━━━━━━━━━━━━━━━━━━━━`)
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
