import { EnchantmentTypes, ItemComponentTypes, ItemStack } from "@minecraft/server";

const MAX_CONTAINER_DEPTH = 4;

export function serializeItemStack(item, depth = 0) {
  if (!item) return undefined;

  const data = {
    typeId: item.typeId,
    amount: item.amount
  };

  if (item.nameTag) data.nameTag = item.nameTag;

  const lore = item.getLore();
  if (lore.length) data.lore = lore;

  const canDestroy = item.getCanDestroy();
  if (canDestroy.length) data.canDestroy = [...canDestroy].sort();

  const canPlaceOn = item.getCanPlaceOn();
  if (canPlaceOn.length) data.canPlaceOn = [...canPlaceOn].sort();

  if (item.keepOnDeath) data.keepOnDeath = true;
  if (item.lockMode && item.lockMode !== "none") data.lockMode = item.lockMode;

  const durability = item.getComponent("minecraft:durability");
  if (durability) data.damage = durability.damage;

  const enchantable = item.getComponent("minecraft:enchantable");
  const enchantments = enchantable?.getEnchantments() ?? [];
  if (enchantments.length) {
    data.enchantments = enchantments
      .map((enchantment) => ({
        id: enchantment.type.id,
        level: enchantment.level
      }))
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  const dynamicProperties = {};
  for (const id of [...item.getDynamicPropertyIds()].sort()) {
    const value = item.getDynamicProperty(id);
    if (["boolean", "number", "string"].includes(typeof value)) {
      dynamicProperties[id] = value;
    } else if (
      value
      && typeof value === "object"
      && Number.isFinite(value.x)
      && Number.isFinite(value.y)
      && Number.isFinite(value.z)
    ) {
      dynamicProperties[id] = { x: value.x, y: value.y, z: value.z };
    }
  }
  if (Object.keys(dynamicProperties).length) {
    data.dynamicProperties = dynamicProperties;
  }

  const itemInventory = getItemContainer(item);
  if (itemInventory) {
    if (depth >= MAX_CONTAINER_DEPTH) {
      throw new Error(`Nested item storage exceeds ${MAX_CONTAINER_DEPTH} levels.`);
    }
    const items = [];
    for (let slot = 0; slot < itemInventory.size; slot++) {
      const stored = itemInventory.getItem(slot);
      if (stored) {
        items.push({
          slot,
          item: serializeItemStack(stored, depth + 1)
        });
      }
    }
    data.container = {
      size: itemInventory.size,
      items
    };
  } else if (isShulkerBox(item.typeId)) {
    data.storageUnavailable = true;
    if (Number.isFinite(item.weight)) data.weight = item.weight;
    data.detectedComponents = getItemComponentIds(item);
  }

  return data;
}

export function deserializeItemStack(data, amount = data?.amount ?? 1, depth = 0) {
  if (!data?.typeId) throw new Error("Stored item data has no type identifier.");

  const item = new ItemStack(data.typeId, Math.max(1, Math.trunc(amount)));
  if (data.nameTag) item.nameTag = data.nameTag;
  if (Array.isArray(data.lore) && data.lore.length) item.setLore(data.lore);
  if (Array.isArray(data.canDestroy) && data.canDestroy.length) {
    item.setCanDestroy(data.canDestroy);
  }
  if (Array.isArray(data.canPlaceOn) && data.canPlaceOn.length) {
    item.setCanPlaceOn(data.canPlaceOn);
  }
  if (data.keepOnDeath === true) item.keepOnDeath = true;
  if (typeof data.lockMode === "string" && data.lockMode !== "none") {
    item.lockMode = data.lockMode;
  }

  const durability = item.getComponent("minecraft:durability");
  if (durability && Number.isFinite(data.damage)) {
    durability.damage = Math.max(0, Math.min(durability.maxDurability, Math.trunc(data.damage)));
  }

  const enchantable = item.getComponent("minecraft:enchantable");
  if (enchantable && Array.isArray(data.enchantments)) {
    for (const stored of data.enchantments) {
      const type = EnchantmentTypes.get(stored.id);
      if (!type) continue;
      try {
        enchantable.addEnchantment({
          type,
          level: Math.max(1, Math.trunc(stored.level))
        });
      } catch {
        // Ignore enchantments that are no longer valid for this item/API version.
      }
    }
  }

  if (data.dynamicProperties && typeof data.dynamicProperties === "object") {
    for (const [id, value] of Object.entries(data.dynamicProperties)) {
      try {
        item.setDynamicProperty(id, value);
      } catch {
        // A removed or invalid property must not prevent delivery of the item.
      }
    }
  }

  if (data.container && typeof data.container === "object") {
    if (depth >= MAX_CONTAINER_DEPTH) {
      throw new Error(`Nested item storage exceeds ${MAX_CONTAINER_DEPTH} levels.`);
    }
    const itemInventory = getItemContainer(item);
    if (!itemInventory) {
      throw new Error(`${data.typeId} no longer exposes its stored-item inventory.`);
    }
    const entries = Array.isArray(data.container.items) ? data.container.items : [];
    for (const entry of entries) {
      const slot = Math.trunc(entry?.slot);
      if (!Number.isInteger(slot) || slot < 0 || slot >= itemInventory.size || !entry?.item) {
        throw new Error(`Stored ${data.typeId} contains an invalid inventory slot.`);
      }
      itemInventory.setItem(
        slot,
        deserializeItemStack(entry.item, entry.item.amount ?? 1, depth + 1)
      );
    }
  }

  return item;
}

export function itemDisplayName(data) {
  if (data?.nameTag) return data.nameTag;
  const path = data?.typeId?.split(":").pop() ?? "Unknown item";
  return path.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function prepareShulkerAsEmpty(data) {
  const prepared = {
    ...data,
    shulkerContentsDiscarded: true
  };
  delete prepared.storageUnavailable;
  delete prepared.detectedComponents;
  delete prepared.weight;
  delete prepared.container;
  return prepared;
}

export function itemMetadataText(itemOrData, options = {}) {
  const data = itemOrData instanceof ItemStack
    ? serializeItemStack(itemOrData)
    : itemOrData;
  if (!data?.typeId) return "§cNo item metadata is available.";

  const lines = [
    `§6Identifier: §f${data.typeId}`,
    `§6Display Name: §f${itemDisplayName(data)}`
  ];
  if (data.nameTag) lines.push(`§6Custom Name: §f${data.nameTag}`);

  if (Array.isArray(data.enchantments) && data.enchantments.length) {
    lines.push(
      "§6Enchantments:\n" +
      data.enchantments
        .map((entry) => `  §d${prettyId(entry.id)} §f${entry.level}`)
        .join("\n")
    );
  } else {
    lines.push("§6Enchantments: §7None");
  }

  if (Array.isArray(data.lore) && data.lore.length) {
    lines.push(`§6Lore:\n${data.lore.map((line) => `  §r${line}`).join("\n")}`);
  } else {
    lines.push("§6Lore: §7None");
  }

  if (Number.isFinite(data.damage)) {
    lines.push(`§6Durability Damage: §f${Math.trunc(data.damage)}`);
  }
  if (Array.isArray(data.canDestroy) && data.canDestroy.length) {
    lines.push(`§6Can Destroy: §f${data.canDestroy.join(", ")}`);
  }
  if (Array.isArray(data.canPlaceOn) && data.canPlaceOn.length) {
    lines.push(`§6Can Place On: §f${data.canPlaceOn.join(", ")}`);
  }
  if (data.keepOnDeath) lines.push("§6Keep on Death: §aYes");
  if (data.lockMode) lines.push(`§6Lock Mode: §f${data.lockMode}`);

  if (data.shulkerContentsDiscarded) {
    lines.push(
      "§cShulker Contents: Not included\n" +
      "§eThis listing delivers only an empty shulker box."
    );
  } else if (data.container && Array.isArray(data.container.items)) {
    if (data.container.items.length) {
      lines.push(
        `§6Stored Contents: §f${data.container.items.length}/${data.container.size ?? "?"} occupied slots\n` +
        data.container.items
          .flatMap(({ slot, item }) => storedItemMetadataLines(slot, item))
          .join("\n")
      );
    } else {
      lines.push("§6Stored Contents: §7Empty");
    }
  } else if (data.storageUnavailable) {
    lines.push(options.storageContext === "viewer"
      ? "§eStored Contents: Bedrock does not expose contents inside a shulker item."
      : "§cStored Contents: Bedrock did not expose this shulker inventory.\n" +
        "§cThe shop requires a warning before saving it.");
    if (Number.isFinite(data.weight)) lines.push(`§6Reported Weight: §f${data.weight}`);
    if (Array.isArray(data.detectedComponents) && data.detectedComponents.length) {
      lines.push(`§6Detected Components: §f${data.detectedComponents.join(", ")}`);
    }
  }

  const properties = data.dynamicProperties && typeof data.dynamicProperties === "object"
    ? Object.entries(data.dynamicProperties)
    : [];
  if (properties.length) {
    lines.push(
      "§6Dynamic Properties:\n" +
      properties.map(([id, value]) => `  §b${id}: §f${JSON.stringify(value)}`).join("\n")
    );
  } else {
    lines.push("§6Dynamic Properties: §7None");
  }
  return lines.join("\n");
}

function prettyId(id) {
  const path = String(id ?? "").split(":").pop();
  return path.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getItemContainer(item) {
  for (const componentId of [
    ItemComponentTypes.Inventory,
    "minecraft:inventory",
    "inventory"
  ]) {
    try {
      const container = item.getComponent(componentId)?.container;
      if (container) return container;
    } catch {
      // Try the remaining supported identifiers and component scan.
    }
  }

  try {
    for (const component of item.getComponents()) {
      if (component?.container) return component.container;
    }
  } catch {
    // Items without an exposed container have no storage metadata to serialize.
  }
  return undefined;
}

function getItemComponentIds(item) {
  try {
    return item.getComponents()
      .map((component) => component?.typeId ?? component?.componentId)
      .filter((id) => typeof id === "string")
      .sort();
  } catch {
    return [];
  }
}

function isShulkerBox(typeId) {
  return /^minecraft:(?:undyed_|(?:white|orange|magenta|light_blue|yellow|lime|pink|gray|light_gray|cyan|purple|blue|brown|green|red|black)_)?shulker_box$/.test(
    String(typeId ?? "")
  );
}

function storedItemMetadataLines(slot, item, depth = 0) {
  const indent = "  ".repeat(depth + 1);
  const lines = [
    `${indent}§bSlot ${Number(slot) + 1}: §f${item.amount ?? 1}x ${itemDisplayName(item)}`,
    `${indent}§8${item.typeId ?? "unknown"}`
  ];

  if (item.nameTag) lines.push(`${indent}§6Custom Name: §f${item.nameTag}`);
  if (Array.isArray(item.enchantments) && item.enchantments.length) {
    lines.push(
      `${indent}§6Enchantments: §d` +
      item.enchantments
        .map((entry) => `${prettyId(entry.id)} ${entry.level}`)
        .join("§f, §d")
    );
  }
  if (Array.isArray(item.lore) && item.lore.length) {
    lines.push(`${indent}§6Lore: §r${item.lore.join(`\n${indent}  §r`)}`);
  }
  if (Number.isFinite(item.damage)) {
    lines.push(`${indent}§6Durability Damage: §f${Math.trunc(item.damage)}`);
  }
  if (item.container && Array.isArray(item.container.items)) {
    lines.push(
      `${indent}§6Nested Storage: §f${item.container.items.length}/${item.container.size ?? "?"} occupied slots`
    );
    if (depth < 2) {
      for (const nested of item.container.items) {
        lines.push(...storedItemMetadataLines(nested.slot, nested.item, depth + 1));
      }
    }
  }
  return lines;
}

export function itemDataEquals(left, right) {
  if (!left || !right) return false;
  const normalizedLeft = { ...serializeItemStack(left), amount: 1 };
  const normalizedRight = {
    ...(right instanceof ItemStack ? serializeItemStack(right) : right),
    amount: 1
  };
  return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
}

export function countMatchingItems(container, template) {
  let total = 0;
  for (let slot = 0; slot < container.size; slot++) {
    const item = container.getItem(slot);
    if (item && itemDataEquals(item, template)) total += item.amount;
  }
  return total;
}

export function removeMatchingItems(container, template, amount) {
  if (countMatchingItems(container, template) < amount) return false;

  let remaining = amount;
  for (let slot = 0; slot < container.size && remaining > 0; slot++) {
    const item = container.getItem(slot);
    if (!item || !itemDataEquals(item, template)) continue;

    const removed = Math.min(remaining, item.amount);
    if (removed === item.amount) {
      container.setItem(slot);
    } else {
      item.amount -= removed;
      container.setItem(slot, item);
    }
    remaining -= removed;
  }
  return remaining === 0;
}

export function addStoredItems(container, template, totalAmount) {
  let remaining = totalAmount;
  const probe = deserializeItemStack(template, 1);
  const maxAmount = probe.maxAmount;

  while (remaining > 0) {
    const amount = Math.min(remaining, maxAmount);
    const overflow = container.addItem(deserializeItemStack(template, amount));
    if (overflow) return remaining - amount + overflow.amount;
    remaining -= amount;
  }
  return 0;
}

export function capacityForStoredItem(container, template) {
  const probe = deserializeItemStack(template, 1);
  let capacity = 0;

  for (let slot = 0; slot < container.size; slot++) {
    const item = container.getItem(slot);
    if (!item) {
      capacity += probe.maxAmount;
    } else if (itemDataEquals(item, template)) {
      capacity += Math.max(0, item.maxAmount - item.amount);
    }
  }
  return capacity;
}
