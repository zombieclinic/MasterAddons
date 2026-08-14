#!/usr/bin/env python3
"""Split traderhut.mcstructure at Y=5 and add a locked vertical jigsaw pair."""

from copy import deepcopy
from pathlib import Path
import struct


BYTE, SHORT, INT, LONG, FLOAT, DOUBLE, BYTE_ARRAY, STRING, LIST, COMPOUND, INT_ARRAY, LONG_ARRAY = range(1, 13)


class NBT:
    def __init__(self, data: bytes):
        self.data = data
        self.offset = 0

    def unpack(self, fmt):
        size = struct.calcsize("<" + fmt)
        value = struct.unpack_from("<" + fmt, self.data, self.offset)
        self.offset += size
        return value[0] if len(value) == 1 else list(value)

    def string(self):
        length = self.unpack("H")
        value = self.data[self.offset:self.offset + length].decode("utf-8")
        self.offset += length
        return value

    def payload(self, tag):
        if tag in (BYTE, SHORT, INT, LONG, FLOAT, DOUBLE):
            return self.unpack({BYTE: "b", SHORT: "h", INT: "i", LONG: "q", FLOAT: "f", DOUBLE: "d"}[tag])
        if tag == BYTE_ARRAY:
            length = self.unpack("i")
            value = self.data[self.offset:self.offset + length]
            self.offset += length
            return value
        if tag == STRING:
            return self.string()
        if tag == LIST:
            child_tag = self.unpack("B")
            return child_tag, [self.payload(child_tag) for _ in range(self.unpack("i"))]
        if tag == COMPOUND:
            value = {}
            while (child_tag := self.unpack("B")) != 0:
                name = self.string()
                value[name] = (child_tag, self.payload(child_tag))
            return value
        if tag in (INT_ARRAY, LONG_ARRAY):
            length = self.unpack("i")
            return self.unpack(f"{length}{'i' if tag == INT_ARRAY else 'q'}") if length else []
        raise ValueError(f"Unsupported NBT tag {tag}")

    def root(self):
        tag = self.unpack("B")
        name = self.string()
        return tag, name, self.payload(tag)


def pack_string(value):
    encoded = value.encode("utf-8")
    return struct.pack("<H", len(encoded)) + encoded


def pack_payload(tag, value):
    if tag in (BYTE, SHORT, INT, LONG, FLOAT, DOUBLE):
        return struct.pack("<" + {BYTE: "b", SHORT: "h", INT: "i", LONG: "q", FLOAT: "f", DOUBLE: "d"}[tag], value)
    if tag == BYTE_ARRAY:
        return struct.pack("<i", len(value)) + value
    if tag == STRING:
        return pack_string(value)
    if tag == LIST:
        child_tag, children = value
        return struct.pack("<Bi", child_tag, len(children)) + b"".join(pack_payload(child_tag, child) for child in children)
    if tag == COMPOUND:
        output = bytearray()
        for name, (child_tag, child) in value.items():
            output += struct.pack("<B", child_tag) + pack_string(name) + pack_payload(child_tag, child)
        return bytes(output) + b"\0"
    if tag in (INT_ARRAY, LONG_ARRAY):
        fmt = "i" if tag == INT_ARRAY else "q"
        return struct.pack("<i", len(value)) + (struct.pack(f"<{len(value)}{fmt}", *value) if value else b"")
    raise ValueError(f"Unsupported NBT tag {tag}")


def write_root(path, root):
    tag, name, value = root
    path.write_bytes(struct.pack("<B", tag) + pack_string(name) + pack_payload(tag, value))


def val(compound, key):
    return compound[key][1]


def set_value(compound, key, value):
    tag, _ = compound[key]
    compound[key] = tag, value


def block_index(x, y, z, size_y, size_z):
    return x * size_y * size_z + y * size_z + z


def slice_structure(source_root, start_y, end_y):
    root = deepcopy(source_root)
    data = root[2]
    old_x, old_y, old_z = val(data, "size")[1]
    new_y = end_y - start_y
    set_value(data, "size", (INT, [old_x, new_y, old_z]))
    structure = val(data, "structure")
    layers = [payload[1] for payload in val(structure, "block_indices")[1]]
    sliced_layers = []
    for layer in layers:
        sliced = []
        for x in range(old_x):
            for y in range(start_y, end_y):
                begin = block_index(x, y, 0, old_y, old_z)
                sliced.extend(layer[begin:begin + old_z])
        sliced_layers.append(sliced)
    assert all(len(layer) == old_x * new_y * old_z for layer in sliced_layers), [len(layer) for layer in sliced_layers]
    set_value(structure, "block_indices", (LIST, [(INT, layer) for layer in sliced_layers]))

    palette = val(val(structure, "palette"), "default")
    old_positions = val(palette, "block_position_data")
    new_positions = {}
    for old_key, entry in old_positions.items():
        old_index = int(old_key)
        x = old_index // (old_y * old_z)
        remainder = old_index % (old_y * old_z)
        y, z = divmod(remainder, old_z)
        if start_y <= y < end_y:
            new_positions[str(block_index(x, y - start_y, z, new_y, old_z))] = entry
    set_value(palette, "block_position_data", new_positions)

    origin_tag, origin_payload = data["structure_world_origin"]
    origin_child_tag, origin = origin_payload
    origin = list(origin)
    origin[1] += start_y
    data["structure_world_origin"] = origin_tag, (origin_child_tag, origin)
    entities = val(structure, "entities")[1]
    if entities:
        raise RuntimeError("Trader hut unexpectedly contains entities; refusing an unsafe split")
    return root


def configure_jigsaw(root, x, y, z, facing, name, target, pool):
    data = root[2]
    size_x, size_y, size_z = val(data, "size")[1]
    structure = val(data, "structure")
    palette = val(val(structure, "palette"), "default")
    blocks = val(palette, "block_palette")[1]
    jigsaw_index = next(i for i, block in enumerate(blocks) if val(block, "name") == "minecraft:jigsaw")
    air_index = next(i for i, block in enumerate(blocks) if val(block, "name") == "minecraft:air")
    states = val(blocks[jigsaw_index], "states")
    set_value(states, "facing_direction", facing)
    block_layers = val(structure, "block_indices")[1]
    for _, layer in block_layers:
        for old_index, palette_index in enumerate(layer):
            if palette_index == jigsaw_index:
                layer[old_index] = air_index
    positions = val(palette, "block_position_data")
    for old_index in list(positions):
        entry = positions[old_index][1]
        if "block_entity_data" in entry and "joint" in entry["block_entity_data"][1]:
            del positions[old_index]

    indices = block_layers[0][1]
    index = block_index(x, y, z, size_y, size_z)
    if index >= len(indices):
        raise RuntimeError(f"Jigsaw index {index} outside block layer of {len(indices)}; size is {(size_x, size_y, size_z)}")
    indices[index] = jigsaw_index

    entity = {
        "BlockEntityVersion": (INT, 0),
        "final_state": (STRING, "minecraft:air"),
        "id": (STRING, "JigsawBlock"),
        # Vertical rollable joints may rotate the child independently.  Aligned
        # keeps the lower piece in exactly the same rotation as the upper one.
        "joint": (STRING, "aligned"),
        "name": (STRING, name),
        "placement_priority": (INT, 0),
        "selection_priority": (INT, 0),
        "target": (STRING, target),
        "target_pool": (STRING, pool),
    }
    _, origin = val(data, "structure_world_origin")
    entity["x"] = (INT, origin[0] + x)
    entity["y"] = (INT, origin[1] + y)
    entity["z"] = (INT, origin[2] + z)
    positions[str(index)] = (COMPOUND, {"block_entity_data": (COMPOUND, entity)})


def preserve_exterior_padding(root):
    """Turn the template's 1/2-block Z padding into non-placing cells."""
    data = root[2]
    size_x, size_y, size_z = val(data, "size")[1]
    structure = val(data, "structure")
    palette = val(val(structure, "palette"), "default")
    blocks = val(palette, "block_palette")[1]
    air_index = next(i for i, block in enumerate(blocks) if val(block, "name") == "minecraft:air")
    primary = val(structure, "block_indices")[1][0][1]
    # The saved hut is 44 blocks deep, but its brick perimeter occupies Z=1..41.
    # Preserve the world in the unused row at Z=0 and rows Z=42..43 so explicit
    # structure air does not dig narrow trenches outside the wall.
    for x in range(size_x):
        for y in range(size_y):
            for z in (0, size_z - 2, size_z - 1):
                index = block_index(x, y, z, size_y, size_z)
                if primary[index] == air_index:
                    primary[index] = -1


def add_entity(root, identifier, x, y, z, yaw=0.0):
    """Add a persistent entity at a local position in the structure."""
    data = root[2]
    structure = val(data, "structure")
    _, origin = val(data, "structure_world_origin")
    entities_tag, entities_payload = structure["entities"]
    child_tag, entities = entities_payload
    # Empty NBT lists use TAG_End until their first element establishes a type.
    if child_tag == 0 and not entities:
        child_tag = COMPOUND
    elif child_tag != COMPOUND:
        raise RuntimeError(f"Unexpected entity list tag {child_tag}")

    entity = {
        "identifier": (STRING, identifier),
        "Pos": (LIST, (FLOAT, [origin[0] + x, origin[1] + y, origin[2] + z])),
        "Rotation": (LIST, (FLOAT, [yaw, 0.0])),
        "Persistent": (BYTE, 1),
        "NaturalSpawn": (BYTE, 0),
        "OnGround": (BYTE, 1),
        "UniqueID": (LONG, -900000000001 - len(entities)),
    }
    entities.append(entity)
    structure["entities"] = (entities_tag, (child_tag, entities))


pack = Path(__file__).resolve().parents[1]
source = pack / "structures/traders_buildings/traderhut.mcstructure"
parsed = NBT(source.read_bytes()).root()
upper = slice_structure(parsed, 5, 15)
lower = slice_structure(parsed, 0, 5)

# The upper connector faces down; the lower connector faces up. Jigsaws are
# adjacent after assembly. Source layer Y=5 is now the bottom layer of the main
# structure, raising all of its visible content by one block relative to ground.
configure_jigsaw(upper, 21, 0, 1, 0, "zombie:traderhut", "zombie:trader_hut_lower", "zombie:traderhut")
configure_jigsaw(lower, 21, 4, 1, 1, "zombie:trader_hut_lower", "minecraft:empty", "minecraft:empty")
preserve_exterior_padding(upper)
preserve_exterior_padding(lower)

# Three resident merchants are spaced through the hut's main room. These are
# stored in the upper template so both surface and forest variants receive them.
add_entity(upper, "zombie:foragefolk", 21.5, 1.0, 30.5, 180.0)
add_entity(upper, "zombie:foragefolk", 22.5, 1.0, 30.5, 180.0)
add_entity(upper, "zombie:foragefolk", 23.5, 1.0, 30.5, 180.0)

write_root(pack / "structures/traders_buildings/traderhut_upper.mcstructure", upper)
write_root(pack / "structures/traders_buildings/traderhut_lower.mcstructure", lower)
print("Created traderhut_upper.mcstructure (44x10x44) and traderhut_lower.mcstructure (44x5x44)")
