#!/usr/bin/env python3
"""Make every placeable mob-head item stack to 64 and non-enchantable."""

import json
from pathlib import Path


pack = Path(__file__).resolve().parents[1]
files = sorted((pack / "items" / "mobheads").rglob("*.json"))
files += sorted((pack / "items" / "shiny").rglob("*.json"))

for path in files:
    document = json.loads(path.read_text())
    components = document["minecraft:item"]["components"]
    components.pop("minecraft:enchantable", None)
    components["minecraft:max_stack_size"] = 64
    path.write_text(json.dumps(document, indent=2, ensure_ascii=False) + "\n")

print(f"Updated {len(files)} mob-head items")
