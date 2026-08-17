#!/usr/bin/env python3
"""Generate slabs, stairs, fences, walls, and recipes for colored amethyst."""

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
block_dir = bp / "blocks/dyeable/colored_amethyst_shapes"
recipe_dir = bp / "recipes/dyeable/colored_amethyst_shapes"
block_dir.mkdir(parents=True, exist_ok=True)
recipe_dir.mkdir(parents=True, exist_ok=True)


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + "\n")


def material(texture):
    return {
        "*": {
            "texture": texture,
            "render_method": "opaque",
            "face_dimming": True,
            "ambient_occlusion": 1,
        }
    }


def recipe(identifier, source, pattern, count, extra_key=None):
    key = {"#": {"item": source}}
    if extra_key:
        key.update(extra_key)
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
    "slab": (["###"], 6, None),
    "stairs": (["#  ", "## ", "###"], 4, None),
    "fence": (["#A#", "#A#"], 3, {"A": {"item": "minecraft:amethyst_shard"}}),
    "fence_gate": (["A#A", "A#A"], 1, {"A": {"item": "minecraft:amethyst_shard"}}),
    "wall": (["###", "###"], 6, None),
}

for color in colors:
    title = color.replace("_", " ").title()
    source = f"zombie:colored_amethyst_{color}"
    texture = f"zombie_colored_amethyst_{color}"
    for shape in ("slab", "stairs", "fence", "fence_gate", "wall"):
        block = copy.deepcopy(templates[shape])
        definition = block["minecraft:block"]
        identifier = f"zombie:colored_amethyst_{color}_{shape}"
        definition["description"]["identifier"] = identifier
        components = definition["components"]
        components["minecraft:display_name"] = f"{title} Amethyst {shape.replace('_', ' ').title()}"
        components["minecraft:material_instances"] = material(texture)
        if "minecraft:item_visual" in components:
            components["minecraft:item_visual"]["material_instances"] = material(texture)
        components["minecraft:destructible_by_mining"] = {"seconds_to_destroy": 1.5}
        components["minecraft:destructible_by_explosion"] = {"explosion_resistance": 6}
        components["minecraft:map_color"] = map_colors[color]
        if shape == "slab":
            components["minecraft:tags"] = ["zombie:slab", "minecraft:is_pickaxe_item_destructible", "stone"]
        elif shape == "stairs":
            components["minecraft:tags"] = ["zombie:connected_stairs", "minecraft:is_pickaxe_item_destructible", "stone"]
        else:
            components["minecraft:tags"] = ["minecraft:has_fence_connections", "minecraft:is_pickaxe_item_destructible", "stone"]
        write_json(block_dir / f"colored_amethyst_{color}_{shape}.json", block)

        pattern, count, extra_key = recipe_shapes[shape]
        write_json(
            recipe_dir / f"colored_amethyst_{color}_{shape}.json",
            recipe(identifier, source, pattern, count, extra_key),
        )

# The normal vanilla amethyst block is not part of the custom dyeable family,
# but it uses the same shape system and needs the same complete building set.
standard_source = "minecraft:amethyst_block"
standard_texture = "amethyst_block"
for shape in ("slab", "stairs", "fence", "fence_gate", "wall"):
    block = copy.deepcopy(templates[shape])
    definition = block["minecraft:block"]
    identifier = f"zombie:amethyst_block_{shape}"
    definition["description"]["identifier"] = identifier
    components = definition["components"]
    components["minecraft:display_name"] = f"Amethyst Block {shape.replace('_', ' ').title()}"
    components["minecraft:material_instances"] = material(standard_texture)
    if "minecraft:item_visual" in components:
        components["minecraft:item_visual"]["material_instances"] = material(standard_texture)
    components["minecraft:destructible_by_mining"] = {"seconds_to_destroy": 1.5}
    components["minecraft:destructible_by_explosion"] = {"explosion_resistance": 6}
    components["minecraft:map_color"] = "#A27BCE"
    if shape == "slab":
        components["minecraft:tags"] = ["zombie:slab", "minecraft:is_pickaxe_item_destructible", "stone"]
    elif shape == "stairs":
        components["minecraft:tags"] = ["zombie:connected_stairs", "minecraft:is_pickaxe_item_destructible", "stone"]
    else:
        components["minecraft:tags"] = ["minecraft:has_fence_connections", "minecraft:is_pickaxe_item_destructible", "stone"]
    write_json(block_dir / f"amethyst_block_{shape}.json", block)

    pattern, count, extra_key = recipe_shapes[shape]
    write_json(
        recipe_dir / f"amethyst_block_{shape}.json",
        recipe(identifier, standard_source, pattern, count, extra_key),
    )

blocks_path = rp / "blocks.json"
blocks = json.loads(blocks_path.read_text())
for color in colors:
    for shape in ("slab", "stairs", "fence", "fence_gate", "wall"):
        blocks[f"zombie:colored_amethyst_{color}_{shape}"] = {"sound": "amethyst_block"}
for shape in ("slab", "stairs", "fence", "fence_gate", "wall"):
    blocks[f"zombie:amethyst_block_{shape}"] = {"sound": "amethyst_block"}
write_json(blocks_path, blocks)

print(f"Generated {len(colors) * 5 + 5} amethyst blocks and recipes")
