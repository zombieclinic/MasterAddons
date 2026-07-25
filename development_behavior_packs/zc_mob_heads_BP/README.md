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

## Placed heads

Placed heads intentionally retain small loot tables under
`loot_tables/blocks`. These tables only return the corresponding head item
when its placed block is broken. They do not replace any vanilla mob or chest
loot.

## Script entry

`scripts/index.js` is the single manifest entry and loads the drop system and
guidebook.
