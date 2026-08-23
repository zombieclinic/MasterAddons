#!/usr/bin/env python3
"""Add and normalize the jigsaws used by Halloween town world generation."""

from pathlib import Path


pack = Path(__file__).resolve().parents[1]
helper = pack / "tools" / "build_christmas_roads.py"
scope = {}
exec(helper.read_text().split("root_dir =")[0], scope)
Reader = scope["Reader"]
Tag = scope["Tag"]
byte = scope["byte"]
compound = scope["compound"]
integer = scope["integer"]
jigsaw_entity = scope["jigsaw_entity"]
list_tag = scope["list_tag"]
palette_block = scope["palette_block"]
string = scope["string"]
write_root = scope["write_root"]


folder = pack / "structures" / "halloween"
connector_name = "zombie:halloween_town_connector"
town_pool = "zombie:halloween_town"
trader_ids = {
    "ninjos:halloween_witch",
    "zombie:trickcreeper",
    "zombie:trickendermen",
    "zombie:trick_or_treat_skeleton",
    "zombie:trickorwitch",
    "zombie:trick_orzombie"
}
structure_traders = {
    "halloween_church.mcstructure": "ninjos:halloween_witch",
    "halloween_grave2.mcstructure": "zombie:trick_or_treat_skeleton",
    "halloween_head.mcstructure": "zombie:trickendermen",
    "halloween_house_1.mcstructure": "zombie:trick_orzombie",
    "halloween_house_2.mcstructure": "zombie:trickcreeper",
    "halloweenjack.mcstructure": "zombie:trickorwitch",
    "windmill.mcstructure": "zombie:trick_orzombie"
}

# The four missing connector positions are on the outer ground edge nearest the
# natural entrance/open side of each saved build. Facing values use Bedrock's
# north/south/west/east values 2/3/4/5.
missing_connectors = {
    "halloween_grave2.mcstructure": (14, 2, 0, 2),
    "halloween_head.mcstructure": (12, 2, 0, 2),
    "halloween_house_2.mcstructure": (6, 2, 0, 2),
    "windmill.mcstructure": (21, 1, 9, 5)
}


def index_of(x, y, z, sy, sz):
    return x * sy * sz + y * sz + z


def block_name(default, palette_index):
    if palette_index < 0:
        return None
    return default["block_palette"].value[palette_index].value["name"].value


def trader_position(root):
    sx, sy, sz = [item.value for item in root.value["size"].value]
    structure = root.value["structure"].value
    indices = structure["block_indices"].value[0].value
    default = structure["palette"].value["default"].value
    candidates = []
    fallback = []
    for x in range(1, sx - 1):
        for z in range(1, sz - 1):
            for y in range(1, sy - 2):
                below = block_name(default, indices[index_of(x, y - 1, z, sy, sz)].value)
                here = block_name(default, indices[index_of(x, y, z, sy, sz)].value)
                above = block_name(default, indices[index_of(x, y + 1, z, sy, sz)].value)
                if not below or below == "minecraft:air" or here != "minecraft:air" or above != "minecraft:air":
                    continue
                distance = abs(x - (sx - 1) / 2) + abs(z - (sz - 1) / 2)
                score = y + distance * 0.05
                fallback.append((score, x, y, z))
                # Prefer a genuinely sheltered spot with a roof above it.
                roof = any(
                    block_name(default, indices[index_of(x, roof_y, z, sy, sz)].value) not in (None, "minecraft:air")
                    for roof_y in range(y + 2, min(sy, y + 10))
                )
                if roof:
                    candidates.append((score, x, y, z))
    choices = candidates or fallback
    if not choices:
        raise RuntimeError("No safe trader position found")
    _, x, y, z = min(choices)
    return x + 0.5, float(y), z + 0.5


def trader_entity(root, identifier, local_position, unique_id):
    origin = [item.value for item in root.value["structure_world_origin"].value]
    x, y, z = local_position
    return compound({
        "identifier": string(identifier),
        "Pos": list_tag(5, [Tag(5, origin[0] + x), Tag(5, origin[1] + y), Tag(5, origin[2] + z)]),
        "Rotation": list_tag(5, [Tag(5, 0.0), Tag(5, 0.0)]),
        "UniqueID": Tag(4, unique_id),
        "Persistent": byte(1),
        "NaturalSpawn": byte(0),
        "OnGround": byte(1)
    })


for path in sorted(folder.glob("*.mcstructure")):
    root = Reader(path.read_bytes()).root()
    sx, sy, sz = [item.value for item in root.value["size"].value]
    structure = root.value["structure"].value
    default = structure["palette"].value["default"].value
    palette = default["block_palette"].value
    positions = default["block_position_data"].value

    # Existing saved jigsaws are already at the correct doors/edges. Normalize
    # their pool links: the centerpiece grows four pieces, while attached town
    # buildings terminate after using their single incoming connector.
    for position in positions.values():
        block_entity = position.value.get("block_entity_data")
        if not block_entity or not block_entity.value.get("id") or block_entity.value["id"].value != "JigsawBlock":
            continue
        data = block_entity.value
        data["name"] = scope["string"](connector_name)
        data["target"] = scope["string"](connector_name)
        data["target_pool"] = scope["string"](town_pool if path.name == "halloweenjack.mcstructure" else "minecraft:empty")
        data["final_state"] = scope["string"]("minecraft:air")

    if path.name in missing_connectors:
        x, y, z, facing = missing_connectors[path.name]
        palette_index = next(
            (
                number for number, entry in enumerate(palette)
                if entry.value["name"].value == "minecraft:jigsaw"
                and entry.value["states"].value.get("facing_direction")
                and entry.value["states"].value["facing_direction"].value == facing
            ),
            len(palette)
        )
        if palette_index == len(palette):
            palette.append(palette_block("minecraft:jigsaw", {"facing_direction": facing, "rotation": 0}))
        block_index = index_of(x, y, z, sy, sz)
        structure["block_indices"].value[0].value[block_index] = integer(palette_index)
        positions[str(block_index)] = compound({
            "block_entity_data": jigsaw_entity(
                x, y, z, connector_name, connector_name, "minecraft:empty", "minecraft:air"
            )
        })

    # Keep existing decorative/passive entities, but make this operation
    # repeatable and guarantee exactly one Halloween trader per town piece.
    entity_list = structure["entities"]
    entity_list.value[:] = [
        entity for entity in entity_list.value
        if not entity.value.get("identifier") or entity.value["identifier"].value not in trader_ids
    ]
    entity_list.value.append(trader_entity(
        root,
        structure_traders[path.name],
        trader_position(root),
        -89311000000 - len(structure_traders) - list(sorted(structure_traders)).index(path.name)
    ))
    entity_list.list_kind = 10

    write_root(path, root)

print("Halloween town jigsaws normalized and one trader placed in each of 7 structures")
