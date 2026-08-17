#!/usr/bin/env python3
"""Apply vanilla-style center-post visibility to every custom wall block."""

import copy
import json
from pathlib import Path


bp = Path(__file__).resolve().parents[1]
root = bp.parents[1]
rp = root / "development_resource_packs/choascraft_RP"
straight_expression = (
    "(query.block_state('minecraft:connection_north') && "
    "query.block_state('minecraft:connection_south') && "
    "!query.block_state('minecraft:connection_east') && "
    "!query.block_state('minecraft:connection_west')) || "
    "(!query.block_state('minecraft:connection_north') && "
    "!query.block_state('minecraft:connection_south') && "
    "query.block_state('minecraft:connection_east') && "
    "query.block_state('minecraft:connection_west'))"
)
stacked_expression = "query.block_state('zombie:stacked')"
expression = (
    f"({stacked_expression}) || !({straight_expression})"
)

for model_path in (
    rp / "models/blocks/demon/demon_steel_wall.geo.json",
    rp / "models/blocks/gingerbread_wall.geo.json",
):
    model_data = json.loads(model_path.read_text())
    for geometry in model_data.get("minecraft:geometry", []):
        bones = geometry.get("bones", [])
        post_bone = next((bone for bone in bones if bone.get("name") == "post"), None)
        if not post_bone:
            continue
        center_bone = next((bone for bone in bones if bone.get("name") == "center"), None)
        if center_bone is None:
            center_bone = copy.deepcopy(post_bone)
            center_bone["name"] = "center"
            bones.insert(bones.index(post_bone) + 1, center_bone)
        for cube in center_bone.get("cubes", []):
            cube["size"][1] = 14
            for face in ("north", "south", "east", "west"):
                if face in cube.get("uv", {}):
                    cube["uv"][face]["uv_size"][1] = 14
        for direction in ("north", "south", "east", "west"):
            short_bone = next((bone for bone in bones if bone.get("name") == direction), None)
            if not short_bone:
                continue
            full_name = f"{direction}_full"
            full_bone = next((bone for bone in bones if bone.get("name") == full_name), None)
            if full_bone is None:
                full_bone = copy.deepcopy(short_bone)
                full_bone["name"] = full_name
                bones.append(full_bone)
            for cube in full_bone.get("cubes", []):
                cube["size"][1] = 16
                for face in ("north", "south", "east", "west"):
                    if face in cube.get("uv", {}):
                        cube["uv"][face]["uv_size"][1] = 16
    model_path.write_text(json.dumps(model_data, indent=2) + "\n")

updated = []
for path in sorted((bp / "blocks").rglob("*.json")):
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    block = data.get("minecraft:block", {})
    identifier = block.get("description", {}).get("identifier", "")
    if not identifier.endswith("_wall"):
        continue
    block.setdefault("description", {}).setdefault("states", {})["zombie:stacked"] = [
        False,
        True,
    ]
    post = (
        block.get("components", {})
        .get("minecraft:geometry", {})
        .get("bone_visibility", {})
        .get("post")
    )
    if not isinstance(post, dict):
        continue
    post["expression"] = expression
    block["components"]["minecraft:geometry"]["bone_visibility"]["center"] = {
        "expression": f"!({stacked_expression}) && ({straight_expression})",
        "version": 1,
    }
    visibility = block["components"]["minecraft:geometry"]["bone_visibility"]
    for direction in ("north", "south", "east", "west"):
        connection = f"query.block_state('minecraft:connection_{direction}')"
        visibility[direction]["expression"] = f"({connection}) && !({stacked_expression})"
        visibility[f"{direction}_full"] = {
            "expression": f"({connection}) && ({stacked_expression})",
            "version": 1,
        }
    block.setdefault("components", {})["minecraft:connection_rule"] = {
        "accepts_connections_from": "all"
    }
    block["components"].pop("minecraft:tick", None)
    block["components"]["zombie:wall_stacking"] = {}
    tags = block["components"].setdefault("minecraft:tags", [])
    if "zombie:wall" not in tags:
        tags.append("zombie:wall")
    path.write_text(json.dumps(data, indent=2) + "\n")
    updated.append(path)

print(f"Updated vanilla-style post visibility on {len(updated)} custom walls")
