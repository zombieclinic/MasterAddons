#!/usr/bin/env python3
"""Create the peaceful Christmas elf trader and place one in every town house."""

import json
from pathlib import Path


pack = Path(__file__).resolve().parents[1]
helper_source = (pack / "tools" / "build_christmas_roads.py").read_text().split("root_dir =")[0]
exec(helper_source)


def behavior_file():
    return {
        "format_version": "1.26.40",
        "minecraft:entity": {
            "description": {
                "identifier": "zombie:zombieelf_villager",
                "spawn_category": "creature",
                "is_spawnable": True,
                "is_summonable": True,
                "is_experimental": False
            },
            "components": {
                "minecraft:type_family": {"family": ["villager", "christmas_elf", "mob", "christmas"]},
                "minecraft:nameable": {},
                "minecraft:persistent": {},
                "minecraft:is_hidden_when_invisible": {},
                "minecraft:economy_trade_table": {
                    "display_name": "Christmas Elf",
                    "new_screen": True,
                    "show_trade_screen": True,
                    "persist_trades": True,
                    "convert_trades_economy": True,
                    "table": "trading/christmas/zombieelf.json"
                },
                "minecraft:trade_resupply": {},
                "minecraft:health": {"value": 20, "max": 20},
                "minecraft:collision_box": {"width": 0.6, "height": 1.8},
                "minecraft:movement": {"value": 0.3},
                "minecraft:movement.basic": {},
                "minecraft:navigation.walk": {
                    "can_walk": True, "can_pass_doors": True, "can_open_doors": True,
                    "avoid_water": True, "avoid_damage_blocks": True
                },
                "minecraft:jump.static": {},
                "minecraft:physics": {},
                "minecraft:pushable_by_entity": {},
                "minecraft:pushable_by_block": {},
                "minecraft:behavior.float": {"priority": 0},
                "minecraft:behavior.trade_with_player": {"priority": 1},
                "minecraft:behavior.panic": {"priority": 2, "speed_multiplier": 1.2},
                "minecraft:behavior.trade_interest": {
                    "priority": 3, "within_radius": 6, "interest_time": 45,
                    "remove_item_time": 1, "carried_item_switch_time": 2, "cooldown": 2
                },
                "minecraft:behavior.look_at_trading_player": {"priority": 4},
                "minecraft:behavior.random_stroll": {"priority": 6, "speed_multiplier": 0.6},
                "minecraft:behavior.look_at_player": {"priority": 7, "look_distance": 6, "probability": 0.04},
                "minecraft:behavior.random_look_around": {"priority": 8},
                "minecraft:conditional_bandwidth_optimization": {}
            }
        }
    }


def hostile_elf_file():
    """Preserve the original hostile elf identifier used by Zombie Santa content."""
    return {
        "format_version": "1.26.40",
        "minecraft:entity": {
            "description": {
                "identifier": "zombie:zombieelf", "spawn_category": "monster",
                "is_spawnable": True, "is_summonable": True
            },
            "component_groups": {
                "minecraft:zombie_baby": {
                    "minecraft:is_baby": {}, "minecraft:scale": {"value": 0.5},
                    "minecraft:movement": {"value": 0.35},
                    "minecraft:experience_reward": {
                        "on_death": "query.last_hit_by_player ? 12 + (query.equipment_count * math.random(1,3)) : 0"
                    }
                },
                "minecraft:zombie_adult": {
                    "minecraft:experience_reward": {
                        "on_death": "query.last_hit_by_player ? 5 + (query.equipment_count * math.random(1,3)) : 0"
                    }
                }
            },
            "components": {
                "minecraft:is_hidden_when_invisible": {}, "minecraft:nameable": {},
                "minecraft:type_family": {"family": ["zombie", "undead", "monster", "mob", "christmas"]},
                "minecraft:collision_box": {"width": 0.6, "height": 1.9},
                "minecraft:movement": {"value": 0.23}, "minecraft:movement.basic": {},
                "minecraft:navigation.walk": {
                    "is_amphibious": True, "can_pass_doors": True,
                    "can_walk": True, "can_break_doors": True
                },
                "minecraft:annotation.break_door": {}, "minecraft:jump.static": {},
                "minecraft:can_climb": {}, "minecraft:health": {"value": 20, "max": 20},
                "minecraft:hurt_on_condition": {"damage_conditions": [{
                    "filters": {"test": "in_lava", "subject": "self", "operator": "==", "value": True},
                    "cause": "lava", "damage_per_tick": 4
                }]},
                "minecraft:breathable": {
                    "total_supply": 15, "suffocate_time": 0,
                    "breathes_air": True, "breathes_water": True
                },
                "minecraft:attack": {"damage": 5},
                "minecraft:loot": {"table": "loot_tables/christmass/elf.json"},
                "minecraft:despawn": {"despawn_from_distance": {}, "despawn_from_simulation_edge": True},
                "minecraft:behavior.float": {"priority": 0},
                "minecraft:behavior.hurt_by_target": {"priority": 1},
                "minecraft:behavior.nearest_attackable_target": {
                    "priority": 2, "must_see": True, "reselect_targets": True, "within_radius": 25,
                    "entity_types": [{
                        "filters": {"any_of": [
                            {"test": "is_family", "subject": "other", "value": "player"},
                            {"test": "is_family", "subject": "other", "value": "villager"},
                            {"test": "is_family", "subject": "other", "value": "wandering_trader"},
                            {"test": "is_family", "subject": "other", "value": "snowgolem"},
                            {"test": "is_family", "subject": "other", "value": "irongolem"}
                        ]},
                        "max_dist": 35, "must_see": False
                    }]
                },
                "minecraft:behavior.melee_box_attack": {"priority": 3, "can_spread_on_fire": True},
                "minecraft:behavior.stomp_turtle_egg": {
                    "priority": 4, "speed_multiplier": 1, "search_range": 10,
                    "search_height": 2, "goal_radius": 1.14, "interval": 20
                },
                "minecraft:behavior.random_stroll": {"priority": 7, "speed_multiplier": 1},
                "minecraft:behavior.look_at_player": {"priority": 8, "look_distance": 6, "probability": 0.02},
                "minecraft:behavior.random_look_around": {"priority": 9},
                "minecraft:physics": {},
                "minecraft:pushable_by_entity": {},
                "minecraft:pushable_by_block": {},
                "minecraft:conditional_bandwidth_optimization": {}
            },
            "events": {
                "minecraft:entity_spawned": {"randomize": [
                    {"weight": 5, "add": {"component_groups": ["minecraft:zombie_baby"]}},
                    {"weight": 95, "add": {"component_groups": ["minecraft:zombie_adult"]}}
                ]},
                "minecraft:as_baby": {"add": {"component_groups": ["minecraft:zombie_baby"]}},
                "minecraft:as_adult": {"add": {"component_groups": ["minecraft:zombie_adult"]}}
            }
        }
    }


def christmas_identifiers():
    identifiers = []
    for kind, root_key in (("blocks", "minecraft:block"), ("items", "minecraft:item")):
        for path in (pack / kind).rglob("*.json"):
            if "christmas" not in str(path).lower():
                continue
            try:
                document = json.loads(path.read_text())
            except json.JSONDecodeError:
                continue
            identifier = document.get(root_key, {}).get("description", {}).get("identifier")
            if identifier and not identifier.lower().endswith("_crop"):
                identifiers.append(identifier)
    return sorted(set(identifiers))


def trade_file(identifiers):
    thresholds = [0, 10, 70, 150, 250]
    # Spread the complete catalog across five unlockable experience tiers.
    tier_items = [identifiers[index::5] for index in range(5)]
    tiers = []
    for tier_index, items in enumerate(tier_items):
        trades = []
        emerald_cost = tier_index + 1
        for identifier in items:
            rare = any(word in identifier for word in ("santa_", "lore_book", "christmas_tree", "lucky_present"))
            cost = emerald_cost + (4 if rare else 0)
            trades.append({
                "wants": [{"item": "minecraft:emerald", "quantity": cost, "price_multiplier": 0.05}],
                "gives": [{"item": identifier, "quantity": 1}],
                "max_uses": 16 if not rare else 4,
                "reward_exp": True,
                "trader_exp": 2 + tier_index * 3
            })
        tiers.append({
            "total_exp_required": thresholds[tier_index],
            "groups": [{"num_to_select": len(trades), "trades": trades}]
        })
    return {"tiers": tiers}


def block_name(default, palette_index):
    if palette_index < 0:
        return None
    return default["block_palette"].value[palette_index].value["name"].value


def interior_position(root):
    value = root.value
    sx, sy, sz = [item.value for item in value["size"].value]
    structure = value["structure"].value
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
                    center_distance = abs(x - (sx - 1) / 2) + abs(z - (sz - 1) / 2)
                    candidates.append((y + center_distance * 0.05, x, y, z))
    if not candidates:
        return None
    _, x, y, z = min(candidates)
    return x + 0.5, float(y), z + 0.5


def proxy_entity(root, local_position, unique_id):
    origin = [item.value for item in root.value["structure_world_origin"].value]
    x, y, z = local_position
    return compound({
        "identifier": string("zombie:zombieelf_villager_spawn_proxy"),
        "Pos": list_tag(5, [Tag(5, origin[0] + x), Tag(5, origin[1] + y), Tag(5, origin[2] + z)]),
        "Rotation": list_tag(5, [Tag(5, 0.0), Tag(5, 0.0)]),
        "UniqueID": Tag(4, unique_id),
        "Persistent": byte(1),
        "NaturalSpawn": byte(0),
        "OnGround": byte(1)
    })


hostile_path = pack / "entities" / "christmas_mobs" / "zombieelf.json"
hostile_path.write_text(json.dumps(hostile_elf_file(), indent=2) + "\n")
entity_path = pack / "entities" / "christmas_mobs" / "zombieelf_villager.json"
entity_path.write_text(json.dumps(behavior_file(), indent=2) + "\n")
identifiers = christmas_identifiers()
trade_path = pack / "trading" / "christmas" / "zombieelf.json"
trade_path.parent.mkdir(parents=True, exist_ok=True)
trade_path.write_text(json.dumps(trade_file(identifiers), indent=2) + "\n")

houses = {
    "blacksmith", "christmas_12", "christmas_16", "christmas_17", "christmas18",
    "christmas_house1", "christmas_house2", "christmas_house3", "christmas_house4",
    "christmas_house5", "christmas_house6", "christmas_house7", "christmas_house9",
    "christmas_house10", "christmas_house15", "christmass_house_11", "christmass_house14"
}
structures = pack / "structures" / "christmas"
placed = []
for number, name in enumerate(sorted(houses), 1):
    path = structures / f"{name}.mcstructure"
    raw = path.read_bytes()
    # Repair files produced by an earlier run where an originally empty entity
    # list retained TAG_End as its element type after receiving its first entry.
    raw = raw.replace(b"\x09\x08\x00entities\x00\x01\x00\x00\x00", b"\x09\x08\x00entities\x0a\x01\x00\x00\x00")
    root = Reader(raw).root()
    entity_list = root.value["structure"].value["entities"]
    entities = entity_list.value
    entities[:] = [
        entity for entity in entities
        if entity.value.get("identifier", string("")).value not in {
            "zombie:zombieelf_spawn_proxy", "zombie:zombieelf_villager_spawn_proxy"
        }
    ]
    position = interior_position(root)
    if position is None:
        raise RuntimeError(f"No safe interior position found in {path}")
    entities.append(proxy_entity(root, position, -88000000000 - number))
    entity_list.list_kind = 10
    write_root(path, root)
    placed.append((name, position))

print(f"Created {len(identifiers)} Christmas trades and placed elves in {len(placed)} houses")
