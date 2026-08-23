#!/usr/bin/env python3
"""Prevent weather snow accumulation on Christmas decorations and shapes."""

import json
import re
from pathlib import Path


def brace_depths(text):
    depths = [0] * (len(text) + 1)
    depth = 0
    in_string = False
    escaped = False
    for index, char in enumerate(text):
        depths[index] = depth
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
        elif char == '"':
            in_string = True
        elif char in "[{":
            depth += 1
        elif char in "]}":
            depth -= 1
    depths[len(text)] = depth
    return depths


pack = Path(__file__).resolve().parents[1]
blocks = pack / "blocks"
files = set(blocks.rglob("*slab*.json")) | set(blocks.rglob("*stair*.json"))
files |= set((blocks / "christmas_land" / "candycanes").glob("*.json"))
files.add(blocks / "christmas_land" / "christmas_tree.json")
files = sorted(files)
changed = 0

for path in files:
    text = path.read_text()
    document = json.loads(text)
    components = document["minecraft:block"]["components"]
    desired = {"precipitation_behavior": "none"}
    if components.get("minecraft:precipitation_interactions") == desired and "minecraft:support" not in components:
        continue

    # `minecraft:support` has no "none" choice. Remove the invalid component
    # previously used for this purpose before adding precipitation behavior.
    support_pattern = re.compile(
        r'(?P<indent>^[ \t]*)"minecraft:support"\s*:\s*\{\s*'
        r'"shape"\s*:\s*"none"\s*\},?\s*', re.MULTILINE
    )
    text, removed = support_pattern.subn("", text, count=1)
    if "minecraft:support" in components and removed != 1:
        raise RuntimeError(f"Could not safely remove minecraft:support from {path}")

    # The precipitation component requires block format version 1.21.120.
    version_match = re.search(r'"format_version"\s*:\s*"([0-9.]+)"', text)
    if not version_match:
        raise RuntimeError(f"Missing format_version in {path}")
    version = tuple(int(part) for part in version_match.group(1).split("."))
    if version < (1, 21, 120):
        text = text[:version_match.start(1)] + "1.21.120" + text[version_match.end(1):]

    depths = brace_depths(text)
    matches = [
        match for match in re.finditer(r'"components"\s*:\s*\{', text)
        if depths[match.start()] == 2
    ]
    if len(matches) != 1:
        raise RuntimeError(f"Expected one block-level components object in {path}, found {len(matches)}")

    match = matches[0]
    opening = match.end() - 1
    line_start = text.rfind("\n", 0, match.start()) + 1
    parent_indent = text[line_start:match.start()]
    child_indent = parent_indent + ("\t" if "\t" in parent_indent else "    ")
    grandchild_indent = child_indent + ("\t" if "\t" in child_indent else "    ")
    closing_indent = child_indent
    remainder = text[opening + 1:]
    has_existing_component = bool(remainder.lstrip()) and not remainder.lstrip().startswith("}")
    comma = "," if has_existing_component else ""
    addition = (
        "\n" + child_indent + '"minecraft:precipitation_interactions": {'
        "\n" + grandchild_indent + '"precipitation_behavior": "none"'
        "\n" + closing_indent + "}" + comma
    )
    updated = text[:opening + 1] + addition + text[opening + 1:]
    json.loads(updated)
    path.write_text(updated)
    changed += 1

print(f"Updated {changed} of {len(files)} snow-sensitive block files")
