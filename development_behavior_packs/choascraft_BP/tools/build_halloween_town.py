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
    "zombie:trick_orzombie",
    "zombie:trickcreeper_spawn_proxy",
    "zombie:trickendermen_spawn_proxy",
    "zombie:trick_skeleton_spawn_proxy",
    "zombie:trickorwitch_spawn_proxy",
    "zombie:trick_zombie_spawn_proxy"
}
trader_marker_states = {
    "zombie:trickcreeper_spawn_proxy": 0,
    "zombie:trickendermen_spawn_proxy": 1,
    "zombie:trick_skeleton_spawn_proxy": 2,
    "zombie:trickorwitch_spawn_proxy": 3,
    "zombie:trick_zombie_spawn_proxy": 4
}
structure_traders = {
    "halloween_church.mcstructure": ("zombie:trickorwitch_spawn_proxy",),
    "halloween_grave2.mcstructure": ("zombie:trick_skeleton_spawn_proxy",),
    "halloween_head.mcstructure": ("zombie:trickendermen_spawn_proxy",),
    "halloween_house_1.mcstructure": (
        "zombie:trick_zombie_spawn_proxy", "zombie:trick_skeleton_spawn_proxy",
        "zombie:trickorwitch_spawn_proxy"
    ),
    "halloween_house_2.mcstructure": (
        "zombie:trickcreeper_spawn_proxy", "zombie:trickendermen_spawn_proxy"
    ),
    "halloweenjack.mcstructure": (
        "zombie:trickcreeper_spawn_proxy", "zombie:trickendermen_spawn_proxy",
        "zombie:trick_skeleton_spawn_proxy", "zombie:trickorwitch_spawn_proxy",
        "zombie:trick_zombie_spawn_proxy"
    ),
    "windmill.mcstructure": ("zombie:trick_zombie_spawn_proxy",)
}

# The four missing connector positions are on the outer ground edge nearest the
# natural entrance/open side of each saved build. Facing values use Bedrock's
# north/south/west/east values 2/3/4/5.
missing_connectors = {
    "halloween_grave2.mcstructure": (14, 2, 0, 2),
    "halloween_head.mcstructure": (12, 2, 0, 2),
    # The authored connector was at z=1, inside the building bounds. Jigsaw
    # collision therefore rejected this house beside a road. Put it on the
    # north boundary, matching the working Christmas house sockets.
    "halloween_house_1.mcstructure": (6, 2, 0, 2),
    "halloween_house_2.mcstructure": (6, 2, 0, 2),
    "windmill.mcstructure": (21, 2, 9, 5)
}


def index_of(x, y, z, sy, sz):
    return x * sy * sz + y * sz + z


def block_name(default, palette_index):
    if palette_index < 0:
        return None
    return default["block_palette"].value[palette_index].value["name"].value


def trader_positions(root, count):
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
    choices = sorted(candidates or fallback)
    if not choices:
        raise RuntimeError("No safe trader position found")
    selected = []
    for _, x, y, z in choices:
        if all(abs(x - old_x) + abs(z - old_z) >= 3 for old_x, _, old_z in selected):
            selected.append((x, y, z))
            if len(selected) == count:
                break
    if len(selected) < count:
        used = set(selected)
        selected.extend((x, y, z) for _, x, y, z in choices if (x, y, z) not in used)
    if len(selected) < count:
        raise RuntimeError(f"Only found {len(selected)} safe trader positions; need {count}")
    return [(x + 0.5, float(y), z + 0.5) for x, y, z in selected[:count]]


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


loot_table = "loot_tables/chests/halloween_town.json"
loot_containers = 0

# Only process the seven authored town buildings. Generated road/center pieces
# live in the same folder but are rebuilt separately and have no resident map.
for structure_name in sorted(structure_traders):
    path = folder / structure_name
    root = Reader(path.read_bytes()).root()
    sx, sy, sz = [item.value for item in root.value["size"].value]
    structure = root.value["structure"].value
    default = structure["palette"].value["default"].value
    palette = default["block_palette"].value
    positions = default["block_position_data"].value

    # Make marker generation repeatable: clear markers written by an earlier
    # run before choosing the resident positions again.
    air_palette = next(
        number for number, entry in enumerate(palette)
        if entry.value["name"].value == "minecraft:air"
    )
    primary_indices = structure["block_indices"].value[0].value
    for block_index, palette_index in enumerate(primary_indices):
        if block_name(default, palette_index.value) == "zombie:halloween_trader_spawn_marker":
            primary_indices[block_index] = integer(air_palette)

    # Remove a misplaced authored connector before recreating it at the exact
    # boundary coordinate below. Keeping both would let the hidden socket claim
    # a road attachment while the visible doorway remained disconnected.
    if path.name in missing_connectors:
        expected = index_of(*missing_connectors[path.name][:3], sy, sz)
        for position_key in list(positions):
            position = positions[position_key]
            block_entity = position.value.get("block_entity_data")
            if (block_entity and block_entity.value.get("id")
                    and block_entity.value["id"].value == "JigsawBlock"
                    and int(position_key) != expected):
                structure["block_indices"].value[0].value[int(position_key)] = integer(-1)
                del positions[position_key]

    # Barrels and vanilla copper-chest variants receive delayed random loot.
    # Ordinary chests retain their authored contents. Seed zero lets each placed
    # structure roll independently when a player first opens the container.
    for position_key, position in positions.items():
        block_entity = position.value.get("block_entity_data")
        if not block_entity:
            continue
        palette_index = structure["block_indices"].value[0].value[int(position_key)].value
        name = block_name(default, palette_index)
        if name != "minecraft:barrel" and "copper_chest" not in (name or ""):
            continue
        data = block_entity.value
        data.pop("Items", None)
        data["LootTable"] = string(loot_table)
        data["LootTableSeed"] = Tag(4, 0)
        loot_containers += 1

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
        data["target_pool"] = scope["string"]("minecraft:empty")
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

    # Match the Christmas village: every generated building carries one
    # short-lived proxy, which creates its resident only after worldgen loads it.
    entity_list = structure["entities"]
    entity_list.value[:] = [
        entity for entity in entity_list.value
        if not entity.value.get("identifier") or entity.value["identifier"].value not in trader_ids
    ]
    residents = structure_traders[path.name]
    for identifier, position in zip(residents, trader_positions(root, len(residents))):
        marker_state = trader_marker_states[identifier]
        marker_palette = next((
            number for number, entry in enumerate(palette)
            if entry.value["name"].value == "zombie:halloween_trader_spawn_marker"
            and entry.value["states"].value.get("zombie:trader_type")
            and entry.value["states"].value["zombie:trader_type"].value == marker_state
        ), len(palette))
        if marker_palette == len(palette):
            palette.append(palette_block(
                "zombie:halloween_trader_spawn_marker",
                {"zombie:trader_type": marker_state}
            ))
        x, y, z = int(position[0]), int(position[1]), int(position[2])
        structure["block_indices"].value[0].value[index_of(x, y, z, sy, sz)] = integer(marker_palette)
    entity_list.list_kind = 10

    write_root(path, root)

foundation_blocks_removed = 0
for path in sorted(folder.glob("*.mcstructure")):
    root = Reader(path.read_bytes()).root()
    sx, sy, sz = [item.value for item in root.value["size"].value]
    structure = root.value["structure"].value
    default = structure["palette"].value["default"].value
    primary_indices = structure["block_indices"].value[0].value
    foundation_names = {"minecraft:dirt", "minecraft:coarse_dirt"}
    removed_from_structure = 0
    for x in range(sx):
        for z in range(sz):
            block_index = index_of(x, 0, z, sy, sz)
            if block_name(default, primary_indices[block_index].value) in foundation_names:
                primary_indices[block_index] = integer(-1)
                removed_from_structure += 1
    if removed_from_structure:
        write_root(path, root)
        foundation_blocks_removed += removed_from_structure

print(
    "Halloween town normalized with trader residents in all 7 buildings, "
    f"{loot_containers} random-loot containers, and {foundation_blocks_removed} "
    "bottom dirt blocks removed"
)
