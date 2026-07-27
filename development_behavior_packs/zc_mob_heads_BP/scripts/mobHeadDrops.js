import {
  EquipmentSlot,
  ItemStack,
  world
} from "@minecraft/server";
import {
  MOB_HEAD_DROP_CONFIG,
  SPECIAL_HEAD_VARIANT_CHANCES
} from "./config/mobHeadDropConfig.js";

const AXOLOTL_HEADS = [
  "zombie:axolotl_lucy_mask",
  "zombie:axolotl_wild_mask",
  "zombie:axolotl_gold_mask",
  "zombie:axolotl_cyan_mask",
  "zombie:axolotl_blue_mask"
];
const CAT_HEADS = [
  "zombie:cattabby_mask",
  "zombie:cattuxedo_mask",
  "zombie:redcattabby_mask",
  "zombie:catsiamese_mask",
  "zombie:catbritish_mask",
  "zombie:cat_calico_mask",
  "zombie:catpersian_mask",
  "zombie:catragdoll_mask",
  "zombie:catwhite_mask",
  "zombie:catjellie_mask",
  "zombie:blackcat_mask"
];
const HORSE_HEADS = [
  "zombie:whitehorse_mask",
  "zombie:horsecreamy_mask",
  "zombie:chestnuthorse_mask",
  "zombie:horse_mask",
  "zombie:blackhorse_mask",
  "zombie:grayhorse_mask",
  "zombie:darkbrownhorse_mask"
];
const PANDA_HEADS = [
  "zombie:panda_mask",
  "zombie:panda_lazy_mask",
  "zombie:panda_worried_mask",
  "zombie:panda_playful_mask",
  "zombie:panda_brown_mask",
  "zombie:panda_weak_mask",
  "zombie:panda_aggressive_mask"
];
const PARROT_HEADS = [
  "zombie:parrot_red_blue_mask",
  "zombie:parrot_blue_mask",
  "zombie:parrot_green_mask",
  "zombie:parrot_yellow_blue_mask",
  "zombie:parrot_gray_mask"
];
const RABBIT_HEADS = [
  "zombie:rabbit_brown_mask",
  "zombie:rabbit_white_mask",
  "zombie:rabbit_black_mask",
  "zombie:rabbit_white_splotched_mask",
  "zombie:rabbit_gold_mask",
  "zombie:rabbit_salt_mask"
];
const DYE_COLORS = [
  "white", "orange", "magenta", "light_blue", "yellow", "lime", "pink", "gray",
  "light_gray", "cyan", "purple", "blue", "brown", "green", "red", "black"
];
const WOLF_COATS = ["", "ashen", "black", "chestnut", "rusty", "winter", "spotted", "striped", "wood"];
const VILLAGER_BIOMES = ["plains", "desert", "jungle", "savanna", "snow", "swamp", "taiga"];
const VILLAGER_JOBS = [
  "farmer", "fisherman", "shepherd", "fletcher", "librarian", "cartographer", "cleric",
  "armorer", "weaponsmith", "toolsmith", "butcher", "leatherworker", "mason", "nitwit", "unskilled"
];
const COPPER_GOLEM_HEADS = Object.freeze({
  unoxidized: "zombie:copper_golem_mask",
  exposed: "zombie:copper_golem_exposed_mask",
  weathered: "zombie:copper_golem_weathered_mask",
  oxidized: "zombie:copper_golem_oxidized_mask"
});

function componentValue(entity, componentIds, fallback = 0) {
  for (const id of componentIds) {
    try {
      const component = entity.getComponent(id);
      if (!component) continue;
      for (const key of ["value", "variant", "color", "markVariant", "skinId"]) {
        if (Number.isInteger(component[key])) return component[key];
      }
    } catch {}
  }
  return fallback;
}

function hasComponent(entity, id) {
  try {
    return Boolean(entity.getComponent(id));
  } catch {
    return false;
  }
}

function entityProperty(entity, id) {
  try {
    return entity.getProperty(id);
  } catch {
    return undefined;
  }
}

function safeArrayValue(values, index, context) {
  if (values[index] !== undefined) return values[index];
  console.warn(
    `[Mob Heads] Unknown ${context} variant ${index}; using variant 0. Expected 0-${values.length - 1}.`
  );
  return values[0];
}

function resolveHeadItem(entity, resolver) {
  const variant = componentValue(entity, ["minecraft:variant"]);
  const name = entity.nameTag?.toLowerCase() ?? "";
  const context = `${entity.typeId} (${resolver})`;

  switch (resolver) {
    case "axolotl":
      return safeArrayValue(AXOLOTL_HEADS, variant, context);
    case "bee":
      return hasComponent(entity, "minecraft:is_angry") ? "zombie:bee_angry_mask" : "zombie:bee_mask";
    case "cat":
      return safeArrayValue(CAT_HEADS, variant, context);
    case "chicken":
      return safeArrayValue(
        ["zombie:chicken_mask", "zombie:chicken_cold_mask", "zombie:chicken_warm_mask"],
        variant,
        context
      );
    case "cow":
      return safeArrayValue(
        ["zombie:cow_mask", "zombie:cow_cold_mask", "zombie:cow_warm_mask"],
        variant,
        context
      );
    case "copper_golem": {
      const oxidation = entityProperty(entity, "minecraft:oxidation_level");
      if (typeof oxidation === "string" && COPPER_GOLEM_HEADS[oxidation]) {
        return COPPER_GOLEM_HEADS[oxidation];
      }

      return safeArrayValue(
        Object.values(COPPER_GOLEM_HEADS),
        variant,
        `${context} oxidation`
      );
    }
    case "fox":
      return variant === 1 ? "zombie:arctic_fox_mask" : "zombie:fox_mask";
    case "frog":
      return safeArrayValue(
        ["zombie:temperate_frog_mask", "zombie:coldfrog_mask", "zombie:warm_frog_mask"],
        variant,
        context
      );
    case "goat":
      return variant === 1 ? "zombie:goat_screamer_mask" : "zombie:goat_mask";
    case "horse":
      return safeArrayValue(HORSE_HEADS, variant, context);
    case "llama":
      return safeArrayValue(
        ["zombie:lama_mask", "zombie:lama_white_mask", "zombie:lama_brown_mask", "zombie:lama_gray_mask"],
        variant,
        context
      );
    case "mooshroom":
      return variant === 1 ? "zombie:mooshroom_brown_mask" : "zombie:mooshroom_mask";
    case "panda":
      return safeArrayValue(PANDA_HEADS, variant, context);
    case "parrot":
      return safeArrayValue(PARROT_HEADS, variant, context);
    case "pig":
      return safeArrayValue(
        ["zombie:pig_mask", "zombie:pig_cold_mask", "zombie:pig_warm_mask"],
        variant,
        context
      );
    case "rabbit":
      return name === "toast"
        ? "zombie:rabbit_toast_mask"
        : safeArrayValue(RABBIT_HEADS, variant, context);
    case "sheep":
      return name === "jeb_"
        ? "zombie:sheep_jeb_mask"
        : `zombie:sheep_${safeArrayValue(DYE_COLORS, variant, context)}_mask`;
    case "shulker":
      if (name === "jeb_") return "zombie:shulker_jeb_mask";
      return variant >= 0 && variant < DYE_COLORS.length
        ? `zombie:shulker_${DYE_COLORS[variant] === "light_gray" ? "silver" : DYE_COLORS[variant]}_mask`
        : "zombie:shulker_mask";
    case "strider":
      return Math.random() < SPECIAL_HEAD_VARIANT_CHANCES.striderSuffocated
        ? "zombie:strider_suffocated_mask"
        : "zombie:strider_mask";
    case "vex":
      return hasComponent(entity, "minecraft:is_charged") ? "zombie:vex_charging_mask" : "zombie:vex_mask";
    case "villager":
      return resolveVillagerHead(entity);
    case "wither":
      return resolveWitherHead();
    case "wolf":
      return resolveWolfHead(entity, variant);
    case "zombie_nautilus":
      return entityProperty(entity, "minecraft:variant") === "coral" || variant === 1
        ? "zombie:zombie_nautilus_coral_mask"
        : "zombie:zombie_nautilus_mask";
    default:
      return undefined;
  }
}

function resolveWitherHead() {
  const roll = Math.random();
  let threshold = SPECIAL_HEAD_VARIANT_CHANCES.witherNormal;
  if (roll < threshold) return "zombie:wither_mask";

  threshold += SPECIAL_HEAD_VARIANT_CHANCES.witherArmored;
  if (roll < threshold) return "zombie:wither_armored_mask";

  threshold += SPECIAL_HEAD_VARIANT_CHANCES.witherInvulnerable;
  if (roll < threshold) return "zombie:wither_invulnerable_mask";

  return "zombie:wither_armored_invulnerable_mask";
}

function resolveVillagerHead(entity) {
  const job = componentValue(entity, ["minecraft:variant"]);
  const biome = componentValue(entity, ["minecraft:mark_variant"]);
  const biomeName = safeArrayValue(VILLAGER_BIOMES, biome, `${entity.typeId} biome`);
  const jobName = safeArrayValue(VILLAGER_JOBS, job, `${entity.typeId} profession`);
  if (biomeName === "desert" && jobName === "armorer") return "zombie:villager_desert_armorer_mask";
  if (biomeName === "desert" && jobName === "butcher") return "zombie:villager_desert_butcher_mask";
  return `zombie:villager_v2_${biomeName}_${jobName}_mask`;
}

function resolveWolfHead(entity, coatIndex) {
  const coat = safeArrayValue(WOLF_COATS, coatIndex, `${entity.typeId} coat`);
  const state = hasComponent(entity, "minecraft:is_angry")
    ? "angry"
    : hasComponent(entity, "minecraft:is_tamed") ? "tamed" : "wild";
  if (!coat) {
    return state === "tamed" ? "zombie:wolf_tame_mask" : `zombie:wolf_${state}_mask`;
  }
  return `zombie:wolf_${coat}${state === "wild" ? "" : `_${state}`}_mask`;
}

function getPlayerKiller(damageSource) {
  const attacker = damageSource?.damagingEntity;
  if (attacker?.typeId === "minecraft:player") return attacker;

  const projectile = damageSource?.damagingProjectile;
  try {
    const owner = projectile?.getComponent("minecraft:projectile")?.owner;
    return owner?.typeId === "minecraft:player" ? owner : undefined;
  } catch {
    return undefined;
  }
}

function getLootingLevel(player) {
  try {
    const equippable = player.getComponent("minecraft:equippable");
    const weapon = equippable?.getEquipment(EquipmentSlot.Mainhand);
    const enchantable = weapon?.getComponent("minecraft:enchantable");
    return enchantable?.getEnchantments()
      ?.find((enchantment) => enchantment.type.id === "looting" || enchantment.type.id === "minecraft:looting")
      ?.level ?? 0;
  } catch {
    return 0;
  }
}

world.afterEvents.entityDie.subscribe((event) => {
  const deadEntity = event.deadEntity;
  const config = MOB_HEAD_DROP_CONFIG[deadEntity.typeId];
  if (!config) return;

  const player = getPlayerKiller(event.damageSource);
  if (!player) return;

  const chance = Math.min(1, config.chance + getLootingLevel(player) * config.lootingBonus);
  if (Math.random() >= chance) return;

  const itemId = config.item ?? resolveHeadItem(deadEntity, config.resolver);
  if (!itemId) return;

  try {
    deadEntity.dimension.spawnItem(new ItemStack(itemId, 1), deadEntity.location);
  } catch (error) {
    console.warn(`[Mob Heads] Could not drop ${itemId} for ${deadEntity.typeId}: ${error}`);
  }
});
