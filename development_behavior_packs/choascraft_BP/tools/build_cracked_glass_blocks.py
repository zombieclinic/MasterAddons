#!/usr/bin/env python3
"""Generate cracked glass blocks, loot tables, and terrain-atlas entries."""

import json
from pathlib import Path


bp = Path(__file__).resolve().parents[1]
root = bp.parents[1]
rp = root / "development_resource_packs/choascraft_RP"

colors = [
    "black", "blue", "brown", "cyan", "gray", "green", "light_blue",
    "lime", "magenta", "orange", "pink", "purple", "red", "silver",
    "white", "yellow",
]

variants = [("", "Cracked Glass", "glass")]
variants += [
    (
        f"{('light_gray' if color == 'silver' else color)}_stained_",
        f"Cracked {('Light Gray' if color == 'silver' else color.replace('_', ' ').title())} Stained Glass",
        f"glass_{color}",
    )
    for color in colors
]
variants.append(("tinted_", "Cracked Tinted Glass", "tinted_glass"))

block_dir = bp / "blocks/decorative/cracked_glass"
loot_dir = bp / "loot_tables/blocks/decorative/cracked_glass"
recipe_dir = bp / "recipes/decorative/cracked_glass"
block_dir.mkdir(parents=True, exist_ok=True)
loot_dir.mkdir(parents=True, exist_ok=True)
recipe_dir.mkdir(parents=True, exist_ok=True)

atlas_path = rp / "textures/terrain_texture.json"
atlas = json.loads(atlas_path.read_text())
texture_data = atlas["texture_data"]

for name_part, display_name, texture_file in variants:
    short_name = f"cracked_{name_part}glass"
    identifier = f"zombie:{short_name}"
    texture_key = f"zombie_{short_name}"
    components = {
        "minecraft:display_name": display_name,
        "minecraft:geometry": "minecraft:geometry.full_block",
        "minecraft:material_instances": {
            "*": {
                "texture": texture_key,
                "render_method": "blend",
                "face_dimming": False,
                "ambient_occlusion": 0,
            }
        },
        "minecraft:destructible_by_mining": {"seconds_to_destroy": 0.3},
        "minecraft:destructible_by_explosion": {"explosion_resistance": 0.3},
        "minecraft:light_dampening": 15 if name_part == "tinted_" else 0,
        "minecraft:loot": f"loot_tables/blocks/decorative/cracked_glass/{short_name}.json",
    }
    block = {
        "format_version": "1.26.20",
        "minecraft:block": {
            "description": {
                "identifier": identifier,
                "menu_category": {"category": "construction"},
            },
            "components": components,
        },
    }
    loot = {
        "pools": [{
            "rolls": 1,
            "entries": [{"type": "item", "name": identifier}],
        }]
    }
    if name_part == "":
        source_glass = "minecraft:glass"
    elif name_part == "tinted_":
        source_glass = "minecraft:tinted_glass"
    else:
        color = name_part.removesuffix("_stained_")
        source_glass = f"minecraft:{color}_stained_glass"
    recipe = {
        "format_version": "1.20.10",
        "minecraft:recipe_shapeless": {
            "description": {"identifier": f"zombie:{short_name}_recipe"},
            "tags": ["crafting_table"],
            "ingredients": [
                {"item": source_glass},
                {"item": "minecraft:flint"},
            ],
            "result": [{"item": identifier, "count": 1}],
            "unlock": [{"item": source_glass}],
        },
    }
    (block_dir / f"{short_name}.json").write_text(json.dumps(block, indent=2) + "\n")
    (loot_dir / f"{short_name}.json").write_text(json.dumps(loot, indent=2) + "\n")
    (recipe_dir / f"{short_name}.json").write_text(json.dumps(recipe, indent=2) + "\n")
    texture_data[texture_key] = {
        "textures": f"textures/blocks/glass/{texture_file}"
    }

atlas_path.write_text(json.dumps(atlas, indent=2) + "\n")
print(f"Generated {len(variants)} cracked glass blocks, loot tables, and recipes")
