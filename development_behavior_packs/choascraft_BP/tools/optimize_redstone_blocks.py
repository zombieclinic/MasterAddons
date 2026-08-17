#!/usr/bin/env python3
"""Remove pressure-plate polling and normalize lamp polling to 20 ticks."""

import json
from pathlib import Path


bp = Path(__file__).resolve().parents[1]
plate_files = []
lamp_files = []


def walk(value, visitor):
    if isinstance(value, dict):
        visitor(value)
        for child in list(value.values()):
            walk(child, visitor)
    elif isinstance(value, list):
        for child in value:
            walk(child, visitor)


for path in sorted((bp / "blocks").rglob("*.json")):
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    serialized = json.dumps(data)
    changed = False

    if "zc:pressureplate" in serialized:
        def remove_plate_ticks(obj):
            nonlocal_changed = "zc:pressureplate_release_tick" in obj
            if nonlocal_changed:
                obj.pop("zc:pressureplate_release_tick", None)
                obj.pop("minecraft:tick", None)

        before = json.dumps(data, sort_keys=True)
        walk(data, remove_plate_ticks)
        changed = json.dumps(data, sort_keys=True) != before
        plate_files.append(path)

    if "zombie:dyeable_redstone_lamp" in serialized:
        def set_lamp_interval(obj):
            if "zombie:dyeable_redstone_lamp" in obj:
                obj["minecraft:tick"] = {
                    "interval_range": [20, 20],
                    "looping": True,
                }

        before = json.dumps(data, sort_keys=True)
        walk(data, set_lamp_interval)
        changed = changed or json.dumps(data, sort_keys=True) != before
        lamp_files.append(path)

    if changed:
        path.write_text(json.dumps(data, indent=2) + "\n")

print(f"Removed polling from {len(plate_files)} pressure plates")
print(f"Set {len(lamp_files)} redstone lamps to 20-tick polling")
