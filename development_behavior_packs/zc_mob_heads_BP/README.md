# ZC Mob Heads behavior pack

See `CHANGELOG.md` for the complete 2.0 Script API conversion history.

## Addon description

Turn every battle into a trophy hunt with **ZombieCraft Mob Heads 2.0**!
Defeating supported mobs gives you a chance to collect their heads, with
Looting increasing many of the drop rates. Wear your collection as masks or
place the heads in your world to display your victories.

Hunt appearance-specific heads for mobs such as axolotls, cats, frogs, horses,
pandas, rabbits, sheep, shulkers, villagers, wolves, and more. Some mobs also
have special forms to discover, including charging vexes, cold striders, and
armored or invulnerable Withers.

For dedicated collectors, every successful head drop has an independent
**1-in-4,096 chance to become a Shiny**. Shiny heads have a permanent glint,
special collector lore, and remain Shiny after being placed and broken.
Named community Easter eggs provide even more unique heads and personal
captions to find.

Whether you are building a trophy hall, decorating a base, running an SMP, or
trying to complete the entire collection, ZombieCraft Mob Heads makes hunting
more rewarding.

### Features

- Script-powered head drops for a large collection of Minecraft mobs.
- Configurable base chances and Looting bonuses.
- Appearance, biome, profession, color, and temperament variants.
- Wearable masks and placeable trophy blocks.
- Ultra-rare persistent Shiny heads with a 1-in-4,096 drop chance.
- Special community Easter-egg heads with custom lore.
- An in-game guidebook containing drop and collection information.
- Multiplayer-friendly, event-driven processing that runs when mobs die.

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
