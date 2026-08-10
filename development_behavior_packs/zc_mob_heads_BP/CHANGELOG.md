# ZC Mob Heads Changelog

This changelog covers the 2.0 rewrite that moved Mob Heads from entity loot-table
injection to the Minecraft Script API.

## 2.0.0 - Unreleased

### Script-based drop system

- Replaced per-entity mob-head loot injection with one event-driven
  `entityDie` listener.
- Head rolls now run only when a player causes the mob's death.
- Moved drop rates and per-level Looting bonuses into
  `scripts/config/mobHeadDropConfig.js`.
- Added direct entity lookup so unrelated deaths do not perform the complete
  head-selection routine.
- Added resolver-based selection for mobs with multiple appearances, including
  axolotls, bees, cats, chickens, cows, foxes, frogs, goats, horses, llamas,
  mooshrooms, pandas, parrots, pigs, rabbits, sheep, shulkers, striders,
  villagers, vexes, withers, wolves, and zombie nautiluses.
- Added weighted special variants for charging vexes, cold striders, and the
  armored and invulnerable Wither appearances.
- Kept block loot tables only for returning a placed head when it is broken.
- Consolidated pack startup through `scripts/index.js`.

### Shiny heads

- Added a true Shiny variant for every standard and named Easter-egg head.
- Every successful head drop has an independent 1-in-4,096 Shiny chance.
- Shiny odds are intentionally unaffected by Looting.
- Added permanent enchantment glint and collector lore to Shiny heads.
- Added dedicated Shiny items, wearable attachables, placed blocks, and block
  loot tables so a head stays Shiny after being placed and broken.
- Added `tools/generateShinyHeadVariants.mjs` for rebuilding generated Shiny
  definitions when new heads are introduced.

### Heads and variants

- Added support for camel husks.
- Added all four copper golem oxidation stages.
- Added nautilus, zombie nautilus, and coral zombie nautilus heads.
- Added parched and sulfur cube heads.
- Added skeleton horse and zombie horse heads.
- Expanded biome, profession, color, temperament, and appearance handling for
  existing head families.

### Named Easter-egg heads

- Moved named-mob Easter eggs into the scripted drop system.
- Added alias handling for community names.
- Added custom lore captions for community heads.
- Added the latest submitted captions:
  - SpartanLex2: “Neither warrior nor king, but the scribe whose creations
    shaped them both.”
  - Vegan Chzburger: “I know I look good, but control yourself”
  - ToroLoco: “The apocalypse? Sign me the hell up!”
  - ZombieClinic: “Cult of the Dead Chicken”
- Shiny rolls and Shiny collector lore also apply to named Easter-egg heads.

### Guidebook and player experience

- Converted the Mob Heads guidebook to Script API forms.
- Added a player welcome/pack notification script.
- Updated the guidebook's supported mob and Easter-egg name lists.
- Documented drop configuration, Shiny generation, placed-head behavior, and
  the script entry point in `README.md`.

### Localization

- Rebuilt the English catalog from the actual item and block definitions.
- Expanded Mob Heads localization from 353 entries to 1,390 keys.
- Connected 1,388 item and block display-name definitions to localization keys
  instead of hard-coded English names.
- Added language files for:
  - English (United States)
  - Spanish (Spain)
  - Spanish (Mexico)
  - French
  - German
  - Portuguese (Brazil)
  - Russian
  - Japanese
  - Korean
  - Simplified Chinese
  - Traditional Chinese
- Preserved the pink display formatting used by Shiny heads.

### Fixes and maintenance

- Shortened resource-pack attachable paths to satisfy Bedrock's 80-character
  content-path limit; the longest Mob Heads resource path is now 79 characters.
- Updated head definitions for current Bedrock item and block formats.
- Added support for current and legacy Bedrock entity identifiers where both
  may occur, including tropical fish, evokers, vindicators, villagers,
  zombified piglins, zombie villagers, and Withers.
- Centralized special variant odds and Shiny rarity so balancing no longer
  requires editing generated item or block files.

### Behavior changes from the legacy pack

- Environmental deaths no longer roll a head unless the damage source resolves
  to a player killer.
- Looting bonuses are calculated by the script and may differ from the old
  loot-table implementation.
- Shiny heads are separate persistent variants rather than temporary lore or
  glint applied to a normal head.
- Mob drop balancing should now be performed only in
  `scripts/config/mobHeadDropConfig.js`.
