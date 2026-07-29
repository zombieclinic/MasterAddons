import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resourceRoot = path.resolve(packRoot, "../../development_resource_packs/zc_mob_heads.RP");
const itemRoot = path.join(packRoot, "items/mobheads");
const blockRoot = path.join(packRoot, "blocks/mask");
const attachableRoot = path.join(resourceRoot, "attachables");
const targetFormatVersion = "1.26.30";

const items = jsonFiles(itemRoot).map(readDefinition);
const blocks = jsonFiles(blockRoot).map(readDefinition);
const attachables = jsonFiles(attachableRoot).map(readDefinition);
const blockById = new Map(
  blocks.map((entry) => [entry.json["minecraft:block"]?.description?.identifier, entry])
);
const attachableById = new Map(
  attachables.map((entry) => [entry.json["minecraft:attachable"]?.description?.identifier, entry])
);

let generated = 0;
for (const itemEntry of items) {
  const normalItem = itemEntry.json["minecraft:item"];
  const normalItemId = normalItem?.description?.identifier;
  const normalBlockId = normalItem?.components?.["minecraft:block_placer"]?.block;
  const blockEntry = blockById.get(normalBlockId);
  const attachableEntry = attachableById.get(normalItemId);
  if (!normalItemId || !blockEntry || !attachableEntry) {
    throw new Error(`Incomplete normal head definition for ${normalItemId ?? itemEntry.file}`);
  }

  const shinyItemId = `${normalItemId}_shiny`;
  const shinyBlockId = `${normalBlockId}_shiny`;

  const shinyItemJson = clone(itemEntry.json);
  shinyItemJson.format_version = targetFormatVersion;
  const shinyItem = shinyItemJson["minecraft:item"];
  shinyItem.description.identifier = shinyItemId;
  shinyItem.components["minecraft:display_name"].value =
    shinyName(shinyItem.components["minecraft:display_name"].value);
  shinyItem.components["minecraft:glint"] = true;
  shinyItem.components["minecraft:block_placer"].block = shinyBlockId;

  const shinyBlockJson = clone(blockEntry.json);
  shinyBlockJson.format_version = targetFormatVersion;
  const shinyBlock = shinyBlockJson["minecraft:block"];
  shinyBlock.description.identifier = shinyBlockId;
  shinyBlock.components["minecraft:display_name"] =
    shinyName(shinyBlock.components["minecraft:display_name"]);

  const normalLootReference = shinyBlock.components["minecraft:loot"];
  const normalLootFile = path.join(packRoot, normalLootReference);
  const shinyLootJson = {
    pools: [
      {
        rolls: 1,
        entries: [
          {
            type: "item",
            name: shinyItemId
          }
        ]
      }
    ]
  };
  const lootRelative = path.relative(path.join(packRoot, "loot_tables/blocks"), normalLootFile);
  const shinyLootRelative = shinyFileName(lootRelative);
  const shinyLootFile = path.join(packRoot, "loot_tables/blocks/shiny", shinyLootRelative);
  shinyBlock.components["minecraft:loot"] = toPackPath(
    path.relative(packRoot, shinyLootFile)
  );

  const shinyAttachableJson = clone(attachableEntry.json);
  shinyAttachableJson["minecraft:attachable"].description.identifier = shinyItemId;

  writeJson(
    path.join(
      packRoot,
      "items/shiny",
      shinyFileName(path.relative(itemRoot, itemEntry.file))
    ),
    shinyItemJson
  );
  writeJson(
    path.join(
      packRoot,
      "blocks/shiny",
      shinyFileName(path.relative(blockRoot, blockEntry.file))
    ),
    shinyBlockJson
  );
  writeJson(shinyLootFile, shinyLootJson);
  writeJson(
    path.join(
      resourceRoot,
      "attachables/shiny",
      shinyFileName(path.relative(attachableRoot, attachableEntry.file))
    ),
    shinyAttachableJson
  );
  generated++;
}

console.log(
  `Generated ${generated} Shiny items, ${generated} Shiny blocks, ` +
  `${generated} Shiny loot tables, and ${generated} Shiny attachables.`
);

function jsonFiles(root) {
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.name.endsWith(".json")) files.push(file);
    }
  };
  visit(root);
  return files.sort();
}

function readDefinition(file) {
  return { file, json: JSON.parse(fs.readFileSync(file, "utf8")) };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function shinyName(normalName) {
  return `§dShiny ${String(normalName).replace(/§./g, "")}`;
}

function shinyFileName(relativeFile) {
  const extension = path.extname(relativeFile);
  return `${relativeFile.slice(0, -extension.length)}_shiny${extension}`;
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function toPackPath(file) {
  return file.split(path.sep).join("/");
}
