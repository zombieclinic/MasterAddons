#!/usr/bin/env python3
"""Repair the old End ball and build colored structure variants."""

from pathlib import Path


# Reuse the pack's little-endian NBT reader without executing its build step.
pack = Path(__file__).resolve().parents[1]
helper = pack / "tools" / "build_christmas_roads.py"
scope = {}
exec(helper.read_text().split("root_dir =")[0], scope)
Reader = scope["Reader"]
Tag = scope["Tag"]
byte = scope["byte"]
string = scope["string"]
compound = scope["compound"]
list_tag = scope["list_tag"]
palette_block = scope["palette_block"]
jigsaw_entity = scope["jigsaw_entity"]
integer = scope["integer"]
write_root = scope["write_root"]


structures = pack / "structures"
source = structures / "ball.mcstructure"
original = Reader(source.read_bytes()).root()

# Every non-vanilla block left in this old structure refers to content which was
# removed from the pack. Replace those palette slots while retaining the chest,
# spawner, End stone, and vanilla amethyst decoration.
colors = ("purple", "blue", "cyan", "green", "red", "pink")
output_dir = structures / "zombie"
output_dir.mkdir(parents=True, exist_ok=True)
end_loot_table = "loot_tables/chests/end_structures.json"


def add_random_container_loot(root):
    structure = root.value["structure"].value
    default = structure["palette"].value["default"].value
    palette = default["block_palette"].value
    indices = structure["block_indices"].value[0].value
    count = 0
    for position_key, position in default["block_position_data"].value.items():
        block_entity = position.value.get("block_entity_data")
        if not block_entity:
            continue
        palette_index = indices[int(position_key)].value
        if palette_index < 0:
            continue
        block_name = palette[palette_index].value["name"].value
        if "chest" not in block_name and block_name != "minecraft:barrel":
            continue
        data = block_entity.value
        data.pop("Items", None)
        data["LootTable"] = string(end_loot_table)
        data["LootTableSeed"] = Tag(4, 0)
        count += 1
    return count


def recolored_root(color):
    root = Reader(source.read_bytes()).root()
    palette = root.value["structure"].value["palette"].value["default"].value["block_palette"].value
    replacement = palette_block(f"zombie:colored_amethyst_{color}")
    for index, entry in enumerate(palette):
        if not entry.value["name"].value.startswith("minecraft:"):
            palette[index] = replacement
    add_random_container_loot(root)
    return root


for color in colors:
    write_root(output_dir / f"end_amethyst_ball_{color}.mcstructure", recolored_root(color))

# Keep the structure-block name `ball` useful too; purple is the default version.
write_root(source, recolored_root("purple"))

# Repair the first End outpost. These are the retired blocks found in its saved
# palette; vanilla decoration, containers, and entities are deliberately kept.
outpost_path = structures / "outpost1.mcstructure"
outpost_root = Reader(outpost_path.read_bytes()).root()
outpost_palette = outpost_root.value["structure"].value["palette"].value["default"].value["block_palette"].value
retired_outpost_blocks = {
    "trickle:real_dark",
    "zombie:doom14",
    "zombie:rubberslab",
    "zombie:tron2",
    "zombie:tron8"
}
for index, entry in enumerate(outpost_palette):
    if entry.value["name"].value in retired_outpost_blocks:
        outpost_palette[index] = palette_block("zombie:lumenroot_planks")
add_random_container_loot(outpost_root)
write_root(outpost_path, outpost_root)


def block_name(default, palette_index):
    if palette_index < 0:
        return None
    return default["block_palette"].value[palette_index].value["name"].value


def interior_position(root):
    sx, sy, sz = [item.value for item in root.value["size"].value]
    structure = root.value["structure"].value
    indices = structure["block_indices"].value[0].value
    default = structure["palette"].value["default"].value

    def index(x, y, z):
        return x * sy * sz + y * sz + z

    candidates = []
    for x in range(1, sx - 1):
        for z in range(1, sz - 1):
            for y in range(1, sy - 1):
                below = block_name(default, indices[index(x, y - 1, z)].value)
                here = block_name(default, indices[index(x, y, z)].value)
                above = block_name(default, indices[index(x, y + 1, z)].value)
                if below and below != "minecraft:air" and here == "minecraft:air" and above == "minecraft:air":
                    distance = abs(x - (sx - 1) / 2) + abs(z - (sz - 1) / 2)
                    candidates.append((y + distance * 0.05, x + 0.5, float(y), z + 0.5))
    if not candidates:
        raise RuntimeError("No safe position found for the cobble golem")
    _, x, y, z = min(candidates)
    return x, y, z


def golem_entity(root, local_position):
    origin = [item.value for item in root.value["structure_world_origin"].value]
    x, y, z = local_position
    return compound({
        "identifier": string("zombie:cobble_golem"),
        "Pos": list_tag(5, [Tag(5, origin[0] + x), Tag(5, origin[1] + y), Tag(5, origin[2] + z)]),
        "Rotation": list_tag(5, [Tag(5, 0.0), Tag(5, 0.0)]),
        "UniqueID": Tag(4, -89000000413),
        "Persistent": byte(1),
        "NaturalSpawn": byte(0),
        "OnGround": byte(1)
    })


golem_path = structures / "golems.mcstructure"
golem_root = Reader(golem_path.read_bytes()).root()
golem_structure = golem_root.value["structure"].value
entity_list = golem_structure["entities"]
entity_list.value[:] = [
    entity for entity in entity_list.value
    if entity.value.get("identifier", string("")).value != "zombie:cobble_golem"
]
entity_list.value.append(golem_entity(golem_root, interior_position(golem_root)))
entity_list.list_kind = 10

# Give jigsaw world generation a ground-level anchor at the rear edge of the
# template. Its final state becomes snow after placement, so no jigsaw remains.
sx, sy, sz = [item.value for item in golem_root.value["size"].value]
anchor_x, anchor_y, anchor_z = sx // 2, 0, sz - 1
anchor_index = anchor_x * sy * sz + anchor_y * sz + anchor_z
default = golem_structure["palette"].value["default"].value
palette = default["block_palette"].value
jigsaw_palette_index = next(
    (index for index, entry in enumerate(palette) if entry.value["name"].value == "minecraft:jigsaw"),
    len(palette)
)
if jigsaw_palette_index == len(palette):
    palette.append(palette_block("minecraft:jigsaw", {"facing_direction": 1, "rotation": 0}))
golem_structure["block_indices"].value[0].value[anchor_index] = integer(jigsaw_palette_index)
default["block_position_data"].value[str(anchor_index)] = compound({
    "block_entity_data": jigsaw_entity(
        anchor_x, anchor_y, anchor_z,
        "zombie:cobble_golem_village_start",
        "minecraft:empty",
        "minecraft:empty",
        "minecraft:snow"
    )
})
write_root(golem_path, golem_root)

print(f"Repaired ball.mcstructure and built {len(colors)} colored End variants")
print("Replaced all retired outpost1 blocks with zombie:lumenroot_planks")
print("Placed exactly one zombie:cobble_golem and one surface jigsaw in golems.mcstructure")
