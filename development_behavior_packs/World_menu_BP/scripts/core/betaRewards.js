import { EquipmentSlot, ItemStack } from "@minecraft/server";

const REWARDS = {
  mask: {
    id: "zombie:enderzombie_mask",
    name: "Ender Zombie Mask",
    tags: ["betatester_mask1", "betatester_mask2"]
  },
  cape: {
    id: "zombie:enderzombie_cape",
    name: "Ender Zombie Cape",
    tags: ["betatester_cape1", "betatester_cape2"]
  }
};
const BETA_REWARD_LORE = [
  "§dBeta Tester Reward",
  "§aKept after death"
];
const BETA_TESTERS = new Set([
  "zombieclinic",
  "r0sedrag0n91",
  "satandragon4233",
  "etphonehome3876",
  "lemonrobin78030",
  "crims0nbl00d",
  "c0d0gamer",
  "suddenpuppet908",
  "zaybzoril",
  "uberbluelion"
]);

export function isBetaTester(player) {
  return BETA_TESTERS.has(player.name.toLocaleLowerCase());
}

export function getBetaClaimCount(player, type) {
  const reward = REWARDS[type];
  if (!reward) return 0;
  if (player.hasTag(reward.tags[1])) return 2;
  if (player.hasTag(reward.tags[0])) return 1;
  return 0;
}

export function createBetaReward(type) {
  const reward = REWARDS[type];
  if (!reward) throw new Error(`Unknown beta reward type: ${type}`);
  const item = new ItemStack(reward.id, 1);
  applyBetaRewardData(item);
  return item;
}

export function upgradeOwnedBetaRewards(player) {
  const rewardIds = new Set(Object.values(REWARDS).map((reward) => reward.id));
  const inventory = player.getComponent("minecraft:inventory")?.container;
  if (inventory) {
    for (let slot = 0; slot < inventory.size; slot++) {
      const item = inventory.getItem(slot);
      if (!item || !rewardIds.has(item.typeId)) continue;
      if (applyBetaRewardData(item)) inventory.setItem(slot, item);
    }
  }

  const equippable = player.getComponent("minecraft:equippable");
  if (!equippable) return;
  for (const slot of [
    EquipmentSlot.Head,
    EquipmentSlot.Chest,
    EquipmentSlot.Legs,
    EquipmentSlot.Feet,
    EquipmentSlot.Offhand,
    EquipmentSlot.Mainhand
  ]) {
    const item = equippable.getEquipment(slot);
    if (!item || !rewardIds.has(item.typeId)) continue;
    if (applyBetaRewardData(item)) equippable.setEquipment(slot, item);
  }
}

export function claimBetaReward(player, selection) {
  if (!isBetaTester(player)) {
    return { ok: false, message: "§cThis reward is only available to listed beta testers." };
  }

  const requestedTypes = selection === "both" ? ["mask", "cape"] : [selection];
  if (requestedTypes.some((type) => !REWARDS[type])) {
    return { ok: false, message: "§cThat beta reward does not exist." };
  }

  const claimableTypes = requestedTypes.filter((type) => getBetaClaimCount(player, type) < 2);
  if (claimableTypes.length === 0) {
    return { ok: false, message: "§cYou have already claimed that reward twice." };
  }

  const inventory = player.getComponent("minecraft:inventory")?.container;
  if (!inventory) {
    return { ok: false, message: "§cYour inventory is not available yet. Please try again." };
  }

  const emptySlots = [];
  for (let slot = 0; slot < inventory.size && emptySlots.length < claimableTypes.length; slot++) {
    if (!inventory.getItem(slot)) emptySlots.push(slot);
  }
  if (emptySlots.length < claimableTypes.length) {
    return {
      ok: false,
      message: `§cClear ${claimableTypes.length - emptySlots.length} more inventory slot(s) and try again.`
    };
  }

  for (let index = 0; index < claimableTypes.length; index++) {
    const type = claimableTypes[index];
    inventory.setItem(emptySlots[index], createBetaReward(type));
    advanceClaimTag(player, type);
  }

  const grantedNames = claimableTypes.map((type) => REWARDS[type].name).join(" and ");
  const skipped = requestedTypes.length - claimableTypes.length;
  return {
    ok: true,
    message: `§aGranted ${grantedNames} with Keep on Death enabled.${skipped ? " §eThe other reward has already been claimed twice." : ""}`
  };
}

// Kept for the existing admin command.
export function claimBetaCape(player) {
  return claimBetaReward(player, "cape");
}

function advanceClaimTag(player, type) {
  const [firstTag, secondTag] = REWARDS[type].tags;
  if (player.hasTag(firstTag)) {
    player.removeTag(firstTag);
    player.addTag(secondTag);
  } else {
    player.addTag(firstTag);
  }
}

function applyBetaRewardData(item) {
  let changed = false;
  if (!item.keepOnDeath) {
    item.keepOnDeath = true;
    changed = true;
  }

  const lore = item.getLore();
  if (!lore.includes(BETA_REWARD_LORE[1])) {
    item.setLore([
      ...lore.slice(0, 18),
      ...BETA_REWARD_LORE
    ]);
    changed = true;
  }
  return changed;
}
