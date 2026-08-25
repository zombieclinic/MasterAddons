#!/usr/bin/env python3
"""Turn the Halloween catalogs into small, progressive economy trade tiers."""

import json
from pathlib import Path


pack = Path(__file__).resolve().parents[1]
trade_dir = pack / "trading" / "halloween"
thresholds = (0, 12, 36, 72, 120)
discounts = (1.0, 0.75, 0.55, 0.40, 0.10)
experience = (3, 5, 8, 12, 16)

# Canonical prices keep this builder repeatable after the generated tiers have
# already received their level discounts.
base_costs = {
    "ninjos:clown_tt_bucket": 2, "ninjos:creeper_pumpkin_lit": 2,
    "ninjos:frankenstein_tt_bucket": 2, "ninjos:ghost_tt_bucket": 2,
    "ninjos:mummy_tt_bucket": 2, "ninjos:pumpkin": 1,
    "ninjos:pumpkin_face1": 2, "ninjos:pumpkin_face2": 2,
    "ninjos:pumpkin_face3": 2, "ninjos:pumpkin_heart": 5,
    "ninjos:pumpkin_pickaxe": 10, "ninjos:pumpkin_tt_bucket": 2,
    "ninjos:skull_tt_bucket": 2, "ninjos:vampire_tt_bucket": 2,
    "zombie:chargedpunkin": 4, "zombie:creeper_halloween_mask": 5,
    "zombie:cross_grave": 2, "zombie:ender_cat_block": 3,
    "zombie:grave_stone": 2, "zombie:halloween_book": 4,
    "zombie:halloween_candycorn": 1, "zombie:halloween_green_apple": 1,
    "zombie:halloween_popsicle": 1, "zombie:horse_toy": 3,
    "zombie:pig_creeper_block": 3, "zombie:pumpkin_amulet": 8,
    "zombie:pumpkin_cannon": 12, "zombie:pumpkin_king_block": 4,
    "zombie:pumpkin_king_head": 8, "zombie:pumpkin_scythe_3d": 16,
    "zombie:pumpkin_scythe": 14, "zombie:skeleton_halloween_mask": 5,
    "zombie:skeleton_sheep_block": 3, "zombie:skull_block": 2,
    "zombie:skull_shelf": 3, "zombie:spider_cover_web": 1,
    "zombie:spider_halloween_mask": 5, "zombie:witch_pumpkin_block": 3,
    "zombie:zcoin": 4, "zombie:zombie_ghost_block": 3,
    "zombie:zombie_halloween_mask": 5, "zombie:zombie_skull_bone": 2,
    "zombie:zombie_steve_block": 3
}

witch_base_costs = {
    "zombie:pumpkin_amulet": 2, "zombie:chargedpunkin": 1,
    "zombie:creeper_halloween_mask": 1, "zombie:halloween_candycorn": 1,
    "zombie:halloween_green_apple": 1, "zombie:halloween_popsicle": 1,
    "zombie:pumpkin_king_head": 10, "zombie:pumpkin_cannon": 10,
    "zombie:skeleton_halloween_mask": 3, "zombie:spider_halloween_mask": 3,
    "zombie:zombie_halloween_mask": 3
}


def catalog(document):
    """Flatten existing tiers while removing duplicate output offers."""
    result = {}
    for tier in document["tiers"]:
        for group in tier["groups"]:
            for trade in group["trades"]:
                result.setdefault(trade["gives"][0]["item"], trade)
    return list(result.values())


def build(path, selections, costs):
    document = json.loads(path.read_text())
    trades = catalog(document)
    trades.sort(key=lambda trade: (costs[trade["gives"][0]["item"]], trade["gives"][0]["item"]))
    tiers = []
    for tier_index in range(5):
        # Each tier receives a mix of common and rare goods. Striding the sorted
        # catalog makes the stronger level discount visibly lower the complete
        # price range instead of expensive goods masking the discount.
        offers = trades[tier_index::5]
        for trade in offers:
            item = trade["gives"][0]["item"]
            trade["wants"][0]["quantity"] = max(1, round(costs[item] * discounts[tier_index]))
            trade["wants"][0]["price_multiplier"] = round(0.05 - tier_index * 0.01, 2)
            trade["max_uses"] = 16
            trade["reward_exp"] = True
            trade["trader_exp"] = experience[tier_index]
        tiers.append({
            "total_exp_required": thresholds[tier_index],
            "groups": [{"num_to_select": min(selections, len(offers)), "trades": offers}]
        })
    path.write_text(json.dumps({"tiers": tiers}, indent=2) + "\n")


build(trade_dir / "halloween_villagers.json", selections=4, costs=base_costs)
build(trade_dir / "halloween_witch.json", selections=3, costs=witch_base_costs)
print("Built five progressive Halloween trade tiers with small random selections")
