#!/usr/bin/env python3
"""Generate transparent stained-glass slabs, stairs, and their recipes."""

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

block_dir = bp / "blocks/decorative/colored_glass_shapes"
recipe_dir = bp / "recipes/decorative/colored_glass_shapes"
block_dir.mkdir(parents=True, exist_ok=True)
recipe_dir.mkdir(parents=True, exist_ok=True)

slab_template = json.loads((bp / "blocks/end/lumenroot_forest/lumenroot_rock_slab.json").read_text())
stair_template = json.loads((bp / "blocks/end/lumenroot_forest/lumenroot_rock_stairs.json").read_text())


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + "\n")


def glass_material(texture):
    return {
        "*": {
            "texture": texture,
            "render_method": "blend",
            "face_dimming": False,
            "ambient_occlusion": 0,
        }
    }


def make_recipe(identifier, source, shape, count):
    return {
        "format_version": "1.20.10",
        "minecraft:recipe_shaped": {
            "description": {"identifier": f"{identifier}_recipe"},
            "tags": ["crafting_table"],
            "pattern": shape,
            "key": {"#": {"item": source}},
            "result": {"item": identifier, "count": count},
            "unlock": [{"item": source}],
        },
    }


for color in colors:
    title = color.replace("_", " ").title()
    texture = f"{color}_stained_glass"
    source = f"minecraft:{color}_stained_glass"

    slab = copy.deepcopy(slab_template)
    slab_def = slab["minecraft:block"]
    slab_id = f"zombie:{color}_stained_glass_slab"
    slab_def["description"]["identifier"] = slab_id
    components = slab_def["components"]
    components["minecraft:display_name"] = f"{title} Stained Glass Slab"
    components["minecraft:material_instances"] = glass_material(texture)
    components["minecraft:item_visual"]["material_instances"] = glass_material(texture)
    components["minecraft:destructible_by_mining"] = {"seconds_to_destroy": 0.3}
    components["minecraft:destructible_by_explosion"] = {"explosion_resistance": 0.3}
    components["minecraft:light_dampening"] = 0
    components["minecraft:map_color"] = map_colors[color]
    components["minecraft:tags"] = ["zombie:slab"]
    write_json(block_dir / f"{color}_stained_glass_slab.json", slab)
    write_json(
        recipe_dir / f"{color}_stained_glass_slab.json",
        make_recipe(slab_id, source, ["###"], 6),
    )

    stairs = copy.deepcopy(stair_template)
    stair_def = stairs["minecraft:block"]
    stair_id = f"zombie:{color}_stained_glass_stairs"
    stair_def["description"]["identifier"] = stair_id
    components = stair_def["components"]
    components["minecraft:display_name"] = f"{title} Stained Glass Stairs"
    components["minecraft:material_instances"] = glass_material(texture)
    components["minecraft:destructible_by_mining"] = {"seconds_to_destroy": 0.3}
    components["minecraft:destructible_by_explosion"] = {"explosion_resistance": 0.3}
    components["minecraft:light_dampening"] = 0
    components["minecraft:map_color"] = map_colors[color]
    components["minecraft:tags"] = ["zombie:connected_stairs"]
    write_json(block_dir / f"{color}_stained_glass_stairs.json", stairs)
    write_json(
        recipe_dir / f"{color}_stained_glass_stairs.json",
        make_recipe(stair_id, source, ["#  ", "## ", "###"], 4),
    )

atlas_path = rp / "textures/terrain_texture.json"
atlas = json.loads(atlas_path.read_text())
for color in colors:
    atlas["texture_data"].pop(f"zombie_{color}_stained_glass", None)
write_json(atlas_path, atlas)

blocks_path = rp / "blocks.json"
blocks = json.loads(blocks_path.read_text())
for color in colors:
    blocks[f"zombie:{color}_stained_glass_slab"] = {"sound": "glass"}
    blocks[f"zombie:{color}_stained_glass_stairs"] = {"sound": "glass"}
write_json(blocks_path, blocks)

print(f"Generated {len(colors) * 2} colored glass blocks and recipes")
