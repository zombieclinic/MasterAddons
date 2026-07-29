import { ItemStack } from "@minecraft/server";

/*
 * Shiny mob-head variants
 *
 * Every successful mob-head drop gets one independent shiny roll. Shiny heads
 * use dedicated item and block identifiers generated under the shiny folders.
 * This preserves the Shiny variant after it is placed and broken again.
 *
 * 1 / 4096 = approximately 0.0244% of successful head drops.
 * Looting intentionally does not improve this collector rarity.
 */
export const SHINY_HEAD_CHANCE = 1 / 4096;
export const SHINY_HEAD_ODDS_TEXT = "1 in 4,096 head drops";

export function createHeadDropStack(normalItemId) {
  const itemId = Math.random() < SHINY_HEAD_CHANCE
    ? `${normalItemId}_shiny`
    : normalItemId;
  return new ItemStack(itemId, 1);
}

export function addShinyCollectorLore(itemStack) {
  if (!itemStack.typeId.endsWith("_shiny")) return false;

  try {
    const existingLore = itemStack.getLore();
    itemStack.setLore([
      ...existingLore,
      ...(existingLore.length ? [""] : []),
      "§d§l✦ SHINY VARIANT ✦",
      `§8Extremely rare: ${SHINY_HEAD_ODDS_TEXT}`
    ]);
    return true;
  } catch (error) {
    console.warn(`[Mob Heads] Could not apply shiny variant to ${itemStack.typeId}: ${error}`);
    return false;
  }
}
