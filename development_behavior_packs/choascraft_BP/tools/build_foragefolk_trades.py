#!/usr/bin/env python3
"""Build ForageFolk offers from every custom seed and edible item in the pack."""

import json
from pathlib import Path


pack = Path(__file__).resolve().parents[1]
items = set()
for path in (pack / "items").rglob("*.json"):
    try:
        item = json.loads(path.read_text())["minecraft:item"]
    except (KeyError, json.JSONDecodeError):
        continue
    identifier = item.get("description", {}).get("identifier")
    components = item.get("components", {})
    if identifier and (
        "minecraft:food" in components
        or "seed" in identifier.lower()
        or "spore" in identifier.lower()
    ):
        items.add(identifier)

trades = []
for identifier in sorted(items):
    is_starter = "seed" in identifier.lower() or "spore" in identifier.lower()
    trades.append({
        "wants": [{"item": "minecraft:emerald", "quantity": 1 if is_starter else 2}],
        "gives": [{
            "item": identifier,
            "quantity": {"min": 2, "max": 4} if is_starter else 1,
        }],
        "max_uses": 12,
        "reward_exp": True,
        "trader_exp": 1,
    })

thresholds = [0, 10, 70, 150, 250]
offers_per_tier = [2, 2, 1, 1, 1]
# Higher-level stock is deliberately cheaper. Seed/spore starters use the first
# value and prepared foods use the second value for each tier.
emerald_prices = [(8, 12), (6, 9), (4, 7), (3, 5), (2, 3)]
tiers = []
for tier_index, threshold in enumerate(thresholds):
    tier_trades = trades[tier_index::len(thresholds)]
    starter_price, food_price = emerald_prices[tier_index]
    for trade in tier_trades:
        identifier = trade["gives"][0]["item"].lower()
        is_starter = "seed" in identifier or "spore" in identifier
        trade["wants"][0]["quantity"] = starter_price if is_starter else food_price
    tiers.append({
        "total_exp_required": threshold,
        "groups": [{
            "num_to_select": offers_per_tier[tier_index],
            "trades": tier_trades,
        }],
    })

table = {"tiers": tiers}
target = pack / "trading/foragefolk.json"
target.write_text(json.dumps(table, indent="\t") + "\n")
print(f"Wrote {len(trades)} ForageFolk offers to {target.relative_to(pack)}")
