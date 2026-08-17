#!/usr/bin/env python3
"""Generate all building shapes for the colored glowing obsidian family."""

import copy
import json
from pathlib import Path


bp = Path(__file__).resolve().parents[1]
root = bp.parents[1]
rp = root / "development_resource_packs/choascraft_RP"
colors = [
    "black", "blue", "brown", "cyan", "gray", "green", "light_blue",
    "light_gray", "lime", "magenta", "orange", "pink", "purple", "red",
    "white", "yellow",
]
map_colors = {
    "black": "#1D1D21", "blue": "#3C44AA", "brown": "#835432",
    "cyan": "#169C9C", "gray": "#474F52", "green": "#5E7C16",
    "light_blue": "#3AB3DA", "light_gray": "#9D9D97", "lime": "#80C71F",
    "magenta": "#C74EBD", "orange": "#F9801D", "pink": "#F38BAA",
    "purple": "#8932B8", "red": "#B02E26", "white": "#F9FFFE",
    "yellow": "#FED83D",
}
templates = {
    "slab": bp / "blocks/end/lumenroot_forest/lumenroot_rock_slab.json",
    "stairs": bp / "blocks/end/lumenroot_forest/lumenroot_rock_stairs.json",
    "fence": bp / "blocks/quartz/quartz_fence.json",
    "fence_gate": bp / "blocks/quartz/quartz_fence_gate.json",
    "wall": bp / "blocks/quartz/quartz_wall.json",
}
templates = {name: json.loads(path.read_text()) for name, path in templates.items()}
block_dir = bp / "blocks/dyeable/colored_glowing_obsidian_shapes"
recipe_dir = bp / "recipes/dyeable/colored_glowing_obsidian_shapes"
block_dir.mkdir(parents=True, exist_ok=True)
recipe_dir.mkdir(parents=True, exist_ok=True)


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + "\n")


def material(texture):
    return {
        "*": {
            "texture": texture,
            "render_method": "opaque",
            "face_dimming": False,
            "ambient_occlusion": 0,
        }
    }


def recipe(identifier, source, pattern, count, connector=False):
    key = {"#": {"item": source}}
    if connector:
        key["I"] = {"item": "minecraft:iron_ingot"}
    return {
        "format_version": "1.20.10",
        "minecraft:recipe_shaped": {
            "description": {"identifier": f"{identifier}_recipe"},
            "tags": ["crafting_table"],
            "pattern": pattern,
            "key": key,
            "result": {"item": identifier, "count": count},
            "unlock": [{"item": source}],
        },
    }


recipe_shapes = {
    "slab": (["###"], 6, False),
    "stairs": (["#  ", "## ", "###"], 4, False),
    "fence": (["#I#", "#I#"], 3, True),
    "fence_gate": (["I#I", "I#I"], 1, True),
    "wall": (["###", "###"], 6, False),
}
generated_ids = []

for color in colors:
    title = color.replace("_", " ").title()
    source = f"zombie:colored_glowing_obsidian_{color}"
    texture = f"zombie_colored_glowing_obsidian_{color}"
    for shape in ("slab", "stairs", "fence", "fence_gate", "wall"):
        block = copy.deepcopy(templates[shape])
        definition = block["minecraft:block"]
        identifier = f"zombie:colored_glowing_obsidian_{color}_{shape}"
        generated_ids.append(identifier)
        definition["description"]["identifier"] = identifier
        components = definition["components"]
        components["minecraft:display_name"] = (
            f"{title} Glowing Obsidian {shape.replace('_', ' ').title()}"
        )
        components["minecraft:material_instances"] = material(texture)
        if "minecraft:item_visual" in components:
            components["minecraft:item_visual"]["material_instances"] = material(texture)
        components["minecraft:destructible_by_mining"] = {"seconds_to_destroy": 25}
        components["minecraft:destructible_by_explosion"] = {"explosion_resistance": 1200}
        components["minecraft:light_emission"] = 12
        components["minecraft:map_color"] = map_colors[color]
        if shape == "slab":
            components["minecraft:tags"] = ["zombie:slab", "minecraft:is_pickaxe_item_destructible", "stone"]
        elif shape == "stairs":
            components["minecraft:tags"] = ["zombie:connected_stairs", "minecraft:is_pickaxe_item_destructible", "stone"]
        elif shape == "wall":
            tags = components.setdefault("minecraft:tags", [])
            for tag in ("minecraft:has_fence_connections", "minecraft:is_pickaxe_item_destructible", "stone", "zombie:wall"):
                if tag not in tags:
                    tags.append(tag)
        else:
            components["minecraft:tags"] = ["minecraft:has_fence_connections", "minecraft:is_pickaxe_item_destructible", "stone"]
        write_json(block_dir / f"colored_glowing_obsidian_{color}_{shape}.json", block)

        pattern, count, connector = recipe_shapes[shape]
        write_json(
            recipe_dir / f"colored_glowing_obsidian_{color}_{shape}.json",
            recipe(identifier, source, pattern, count, connector),
        )

blocks_path = rp / "blocks.json"
blocks = json.loads(blocks_path.read_text())
for identifier in generated_ids:
    blocks[identifier] = {"sound": "stone"}
write_json(blocks_path, blocks)

catalog_path = bp / "item_catalog/crafting_item_catalog.json"
catalog = json.loads(catalog_path.read_text())
for category in catalog["minecraft:crafting_items_catalog"]["categories"]:
    for group in category.get("groups", []):
        if group.get("group_identifier", {}).get("name") != "zombie:itemGroup.name.colored_glowing_obsidian":
            continue
        items = group.setdefault("items", [])
        for identifier in generated_ids:
            if identifier not in items:
                items.append(identifier)
write_json(catalog_path, catalog)

print(f"Generated {len(generated_ids)} colored glowing obsidian blocks and recipes")
