#!/usr/bin/env python3
"""Build the Christmas town road pieces and make house connectors terminal."""

from pathlib import Path
import struct


class Tag:
    def __init__(self, kind, value, list_kind=None):
        self.kind, self.value, self.list_kind = kind, value, list_kind


class Reader:
    def __init__(self, data):
        self.data, self.at = data, 0

    def take(self, count):
        value = self.data[self.at:self.at + count]
        self.at += count
        return value

    def number(self, fmt):
        return struct.unpack(fmt, self.take(struct.calcsize(fmt)))[0]

    def string(self):
        return self.take(self.number("<H")).decode("utf8")

    def payload(self, kind):
        if kind in (1, 2, 3, 4, 5, 6):
            return Tag(kind, self.number({1:"<b",2:"<h",3:"<i",4:"<q",5:"<f",6:"<d"}[kind]))
        if kind == 7:
            return Tag(kind, self.take(self.number("<i")))
        if kind == 8:
            return Tag(kind, self.string())
        if kind == 9:
            item_kind, count = self.number("<B"), self.number("<i")
            return Tag(kind, [self.payload(item_kind) for _ in range(count)], item_kind)
        if kind == 10:
            result = {}
            while True:
                child_kind = self.number("<B")
                if child_kind == 0:
                    return Tag(kind, result)
                child_name = self.string()
                result[child_name] = self.payload(child_kind)
        if kind in (11, 12):
            fmt = "<i" if kind == 11 else "<q"
            return Tag(kind, [self.number(fmt) for _ in range(self.number("<i"))])
        raise ValueError(kind)

    def root(self):
        kind = self.number("<B")
        self.string()
        return self.payload(kind)


def pack_string(value):
    raw = value.encode("utf8")
    return struct.pack("<H", len(raw)) + raw


def write_payload(tag):
    kind, value = tag.kind, tag.value
    if kind in (1, 2, 3, 4, 5, 6):
        return struct.pack({1:"<b",2:"<h",3:"<i",4:"<q",5:"<f",6:"<d"}[kind], value)
    if kind == 7:
        return struct.pack("<i", len(value)) + value
    if kind == 8:
        return pack_string(value)
    if kind == 9:
        return struct.pack("<Bi", tag.list_kind, len(value)) + b"".join(write_payload(x) for x in value)
    if kind == 10:
        body = []
        for name, child in value.items():
            body.append(struct.pack("<B", child.kind) + pack_string(name) + write_payload(child))
        return b"".join(body) + b"\0"
    if kind in (11, 12):
        fmt = "<i" if kind == 11 else "<q"
        return struct.pack("<i", len(value)) + b"".join(struct.pack(fmt, x) for x in value)
    raise ValueError(kind)


def write_root(path, root):
    path.write_bytes(b"\x0a\x00\x00" + write_payload(root))


def byte(value): return Tag(1, value)
def integer(value): return Tag(3, value)
def string(value): return Tag(8, value)
def compound(value): return Tag(10, value)
def list_tag(kind, values): return Tag(9, values, kind)


def palette_block(name, states=None):
    state_tags = {key: integer(value) for key, value in (states or {}).items()}
    return compound({"name": string(name), "states": compound(state_tags), "version": integer(18168865)})


def jigsaw_entity(x, y, z, name, target, pool, final_state="minecraft:grass_path"):
    return compound({
        "BlockEntityVersion": integer(0), "final_state": string(final_state),
        "id": string("JigsawBlock"), "joint": string("rollable"),
        "name": string(name), "placement_priority": integer(0),
        "selection_priority": integer(0), "target": string(target),
        "target_pool": string(pool), "x": integer(x), "y": integer(y), "z": integer(z)
    })


def make_road(kind, art_street=False, santa_street=False,
              road_pool="zombie:christmas_roads",
              building_pool="zombie:christmas_buildings",
              building_target="zombie:christmas_connector",
              clear_corridor=False, terminate_with_buildings=False,
              first_side_pool=None, second_side_pool=None,
              terminal_building_pools=None, road_length=8,
              extra_side_pair=False):
    # The path occupies y=0. The volume extends to y=2 so building connectors can
    # meet the exported house connectors without pulling each house underground.
    sx, sy, sz = 8, 3, road_length
    palette = [palette_block("minecraft:air"), palette_block("minecraft:grass_path")]
    directions = {2: {"facing_direction": 2, "rotation": 0}, 3: {"facing_direction": 3, "rotation": 0},
                  4: {"facing_direction": 4, "rotation": 0}, 5: {"facing_direction": 5, "rotation": 0}}
    for direction in (2, 3, 4, 5):
        palette.append(palette_block("minecraft:jigsaw", directions[direction]))
    blocks = [-1] * (sx * sy * sz)
    data = {}

    def index(x, y, z): return x * sy * sz + y * sz + z
    def path(x, z): blocks[index(x, 0, z)] = 1
    def jig(x, y, z, direction, name, target, pool, final_state="minecraft:grass_path"):
        pos = index(x, y, z)
        blocks[pos] = {2:2, 3:3, 4:4, 5:5}[direction]
        data[str(pos)] = compound({"block_entity_data": jigsaw_entity(x, y, z, name, target, pool, final_state)})

    # Two-block-wide north/south main road.
    for x in (3, 4):
        for z in range(sz): path(x, z)
    if kind == "cross":
        for x in range(sx):
            for z in (3, 4): path(x, z)
    else:
        # One-block door aprons join the lane to the adjacent building sockets.
        path(2, 3)
        path(5, 4)
        if extra_side_pair:
            path(2, sz - 5)
            path(5, sz - 4)

    # Forest towns need real air (rather than structure void) over the road and
    # one-block shoulders, otherwise trunks and leaves conceal the network.
    if clear_corridor:
        corridor = {(x, z) for x in range(2, 6) for z in range(sz)}
        if kind == "cross":
            corridor |= {(x, z) for x in range(sx) for z in range(2, 6)}
        for x, z in corridor:
            for y in (1, 2):
                blocks[index(x, y, z)] = 0

    # The Christmas network continues through roads. Halloween streets instead
    # use the same connector names for attachment to the hub, but every unused
    # endpoint terminates at a building so paths cannot wander into empty land.
    end_target = "minecraft:empty" if terminate_with_buildings else "zombie:road_connector"
    end_pool = "minecraft:empty" if terminate_with_buildings else road_pool
    end_state = "minecraft:grass_path"
    jig(3, 0, 0, 2, "zombie:road_connector", end_target, end_pool, end_state)
    jig(4, 0, sz - 1, 3, "zombie:road_connector", end_target, end_pool, end_state)
    if kind == "cross":
        jig(0, 0, 4, 4, "zombie:road_connector", end_target, end_pool, end_state)
        jig(7, 0, 3, 5, "zombie:road_connector", end_target, end_pool, end_state)
    if terminate_with_buildings:
        # Separate elevated sockets keep building floors at Y=0. The socket at
        # the road end consumed by the center fails harmlessly on collision;
        # every exposed end receives a terminal building.
        terminal_pools = terminal_building_pools or [building_pool] * 4
        jig(3, 2, 0, 2, "zombie:road_end_house_connector", building_target, terminal_pools[0], "minecraft:air")
        jig(4, 2, sz - 1, 3, "zombie:road_end_house_connector", building_target, terminal_pools[1], "minecraft:air")
        if kind == "cross":
            jig(0, 2, 4, 4, "zombie:road_end_house_connector", building_target, terminal_pools[2], "minecraft:air")
            jig(7, 2, 3, 5, "zombie:road_end_house_connector", building_target, terminal_pools[3], "minecraft:air")
    if kind != "cross":
        # House connectors are two blocks above the path. This raises every
        # building by two blocks compared with the original y=0 road connector.
        side_pool = "zombie:christmas_art" if art_street else building_pool
        connector_name = "zombie:road_art_connector" if art_street else "zombie:road_house_connector"
        first_pool = "zombie:christmas_santa_house" if santa_street else (first_side_pool or side_pool)
        second_pool = second_side_pool or side_pool
        first_name = "zombie:road_santa_connector" if santa_street else connector_name
        # Building sockets must be on the structure boundary. Moving them into
        # the road volume makes an attached building overlap its parent piece,
        # so Bedrock's jigsaw collision check rejects every building candidate.
        # These are the original, proven Christmas-town socket coordinates.
        jig(0, 2, 3, 4, first_name, building_target, first_pool, "minecraft:air")
        jig(7, 2, 4, 5, connector_name, building_target, second_pool, "minecraft:air")
        if extra_side_pair:
            jig(7, 2, sz - 5, 5, connector_name, building_target, first_pool, "minecraft:air")
            jig(0, 2, sz - 4, 4, connector_name, building_target, second_pool, "minecraft:air")

    root = compound({
        "format_version": integer(1), "size": list_tag(3, [integer(sx), integer(sy), integer(sz)]),
        "structure": compound({
            "block_indices": list_tag(9, [list_tag(3, [integer(x) for x in blocks]), list_tag(3, [integer(-1) for _ in blocks])]),
            "entities": list_tag(10, []),
            "palette": compound({"default": compound({"block_palette": list_tag(10, palette), "block_position_data": compound(data)})})
        }),
        "structure_world_origin": list_tag(3, [integer(0), integer(0), integer(0)])
    })
    return root


def make_town_center(source, road_pool="zombie:christmas_roads",
                     special_road_pool="zombie:christmas_santa_road",
                     road_pools=None):
    """Convert the original decorated hub into a ground-level road start piece."""
    root = Reader(source.read_bytes()).root()
    value = root.value
    size = [item.value for item in value["size"].value]
    sy, sz = size[1], size[2]
    structure = value["structure"].value
    blocks = structure["block_indices"].value[0].value
    default = structure["palette"].value["default"].value
    position_data = default["block_position_data"].value

    connector_number = 0
    for old_key in sorted(list(position_data), key=int):
        position = position_data[old_key]
        entity = position.value.get("block_entity_data")
        if not entity or entity.value.get("id").value != "JigsawBlock":
            continue
        old_index = int(old_key)
        x = old_index // (sy * sz)
        remainder = old_index % (sy * sz)
        old_y, z = remainder // sz, remainder % sz
        new_index = x * sy * sz + z

        # Preserve the connector's facing palette entry while relocating it.
        blocks[new_index] = blocks[old_index]
        blocks[old_index] = integer(-1)
        del position_data[old_key]
        position_data[str(new_index)] = position

        be = entity.value
        be["y"] = integer(be["y"].value - old_y)
        be["name"] = string("zombie:center_road_connector")
        be["target"] = string("zombie:road_connector")
        # Christmas uses one special Santa street; other towns can omit it.
        if road_pools:
            pool = road_pools[connector_number % len(road_pools)]
        else:
            pool = special_road_pool if connector_number == 0 and special_road_pool else road_pool
        be["target_pool"] = string(pool)
        be["final_state"] = string("minecraft:grass_path")
        connector_number += 1
    return root


root_dir = Path(__file__).resolve().parents[1]
structures = root_dir / "structures" / "christmas"
write_root(structures / "path_straight.mcstructure", make_road("straight"))
write_root(structures / "path_straight_art.mcstructure", make_road("straight", art_street=True))
write_root(structures / "path_straight_santa.mcstructure", make_road("straight", santa_street=True))
write_root(structures / "path_cross.mcstructure", make_road("cross"))
write_root(structures / "town_center.mcstructure", make_town_center(structures / "tree.mcstructure"))

# Halloween uses three guaranteed landmark streets plus one bounded neighborhood
# branch. Each landmark street places houses along its sides and its unique large
# building at the far end. Keep these pools here so rebuilding the generated
# center cannot silently restore the old recursive road graph.
halloween_structures = root_dir / "structures" / "halloween"
write_root(halloween_structures / "path_straight.mcstructure", make_road(
    "straight", road_pool="zombie:halloween_roads",
    building_pool="zombie:halloween_town",
    building_target="zombie:halloween_town_connector", clear_corridor=True
))
write_root(halloween_structures / "path_cross.mcstructure", make_road(
    "cross", road_pool="zombie:halloween_roads",
    building_pool="zombie:halloween_town",
    building_target="zombie:halloween_town_connector", clear_corridor=True
))
write_root(halloween_structures / "path_inner_straight.mcstructure", make_road(
    "straight", road_pool="zombie:halloween_outer_roads",
    building_pool="zombie:halloween_houses",
    building_target="zombie:halloween_town_connector", clear_corridor=True,
    first_side_pool="zombie:halloween_house_1",
    second_side_pool="zombie:halloween_house_2"
))
write_root(halloween_structures / "path_inner_cross.mcstructure", make_road(
    "cross", road_pool="zombie:halloween_outer_roads",
    building_target="zombie:halloween_town_connector", clear_corridor=True
))

def write_halloween_terminal_road(filename, terminal_pool, road_length=8,
                                  extra_side_pair=False):
    write_root(halloween_structures / filename, make_road(
        "straight", building_pool="zombie:halloween_houses",
        building_target="zombie:halloween_town_connector", clear_corridor=True,
        terminate_with_buildings=True,
        first_side_pool="zombie:halloween_house_1",
        second_side_pool="zombie:halloween_house_2",
        terminal_building_pools=[terminal_pool] * 4,
        road_length=road_length, extra_side_pair=extra_side_pair
    ))


write_halloween_terminal_road("path_outer_house.mcstructure", "zombie:halloween_houses")
write_halloween_terminal_road("path_outer_church.mcstructure", "zombie:halloween_church")
write_halloween_terminal_road("path_outer_grave.mcstructure", "zombie:halloween_grave")
write_halloween_terminal_road("path_outer_windmill.mcstructure", "zombie:halloween_windmill")
# Long arms give the landmark footprints room beyond the centerpiece. The
# second pair of side sockets places ordinary houses before the landmark, so
# the windmill/church/graveyard reads as sitting behind the neighborhood.
write_halloween_terminal_road(
    "path_straight_church.mcstructure", "zombie:halloween_church", 40, True
)
write_halloween_terminal_road(
    "path_straight_grave.mcstructure", "zombie:halloween_grave", 40, True
)
write_halloween_terminal_road(
    "path_straight_windmill.mcstructure", "zombie:halloween_windmill", 40, True
)
write_root(halloween_structures / "town_center.mcstructure", make_town_center(
    halloween_structures / "halloweenjack.mcstructure",
    special_road_pool=None,
    road_pools=[
        "zombie:halloween_church_road",
        "zombie:halloween_grave_road",
        "zombie:halloween_windmill_road",
        "zombie:halloween_inner_cross_roads"
    ]
))

# A placed building must terminate instead of immediately growing another building.
# NBT strings carry their own lengths, so these targeted replacements preserve every
# block and entity byte from structures exported by the game (including legacy tags).
for path in structures.glob("*.mcstructure"):
    if path.name in {"path_straight.mcstructure", "path_straight_art.mcstructure", "path_straight_santa.mcstructure", "path_cross.mcstructure", "town_center.mcstructure"}:
        continue
    raw = path.read_bytes()
    old_pool = pack_string("zombie:christmas_stronghold")
    new_pool = pack_string("minecraft:empty")
    raw = raw.replace(old_pool, new_pool)
    path.write_bytes(raw)
