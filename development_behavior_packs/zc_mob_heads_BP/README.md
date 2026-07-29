# ZC Mob Heads behavior pack

## Drop system

Mob heads use one event-driven `entityDie` listener. The listener runs only when
an entity dies, verifies that a player caused the death, looks up the entity
directly in the configuration, applies Looting, and rolls once.

Edit all base chances and per-level Looting bonuses here:

`scripts/config/mobHeadDropConfig.js`

Each entry uses decimal chances:

```js
"minecraft:bat": {
  item: "zombie:bat_mask",
  chance: 0.10,
  lootingBonus: 0.02
}
```

That example is a 10% base chance plus 2% for each Looting level.

Variant selection and the single death listener are in:

`scripts/mobHeadDrops.js`

Special appearance weights, including the rarer armored Wither heads and the
suffocated Strider head, are also editable at the bottom of:

`scripts/config/mobHeadDropConfig.js`

## Shiny heads

Every successful normal or named Easter-egg head drop has an independent
1-in-4,096 chance to become a true shiny variant. Every normal head has a
dedicated Shiny item, Shiny placed block, Shiny block loot table, and Shiny
wearable definition. They reuse the normal texture/model with permanent
`minecraft:glint`, and remain Shiny after being placed and broken. Looting
does not increase shiny odds.

Shiny rarity and glint behavior are kept separately in:

`scripts/config/shinyHeadVariants.js`

The generated definitions live in the `items/shiny`, `blocks/shiny`,
`loot_tables/blocks/shiny`, and resource-pack `attachables/shiny` folders.
Regenerate all variants after adding a normal head with:

`node tools/generateShinyHeadVariants.mjs`

## Placed heads

Placed heads intentionally retain small loot tables under
`loot_tables/blocks`. These tables only return the corresponding head item
when its placed block is broken. They do not replace any vanilla mob or chest
loot.

## Script entry

`scripts/index.js` is the single manifest entry and loads the drop system and
guidebook.
