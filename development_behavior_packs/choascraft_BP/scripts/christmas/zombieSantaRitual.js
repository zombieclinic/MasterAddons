import { system } from "@minecraft/server";

const HEAD = "zombie:zombie_santa_head";
const GINGERBREAD = "zombie:gingerbread";
const EASY_SANTA = "zombie:zombiesanta_easy";
const AIR = "minecraft:air";
const activeRituals = new Set();

const FORMATIONS = [
  [
    { x: 0, y: 0, z: 0, typeId: HEAD },
    { x: 0, y: -1, z: 0, typeId: GINGERBREAD },
    { x: -1, y: -1, z: 0, typeId: GINGERBREAD },
    { x: 1, y: -1, z: 0, typeId: GINGERBREAD },
    { x: 0, y: -2, z: 0, typeId: GINGERBREAD }
  ],
  [
    { x: 0, y: 0, z: 0, typeId: HEAD },
    { x: 0, y: -1, z: 0, typeId: GINGERBREAD },
    { x: 0, y: -1, z: -1, typeId: GINGERBREAD },
    { x: 0, y: -1, z: 1, typeId: GINGERBREAD },
    { x: 0, y: -2, z: 0, typeId: GINGERBREAD }
  ]
];

export class ZombieSantaRitualComponent {
  onPlace({ block }) {
    if (!block) return;
    system.run(() => checkRitual(block.dimension, block.location));
  }
}

function checkRitual(dimension, headLocation) {
  for (const formation of FORMATIONS) {
    if (!formation.every(part => {
      const block = getBlock(dimension, offset(headLocation, part));
      return block?.typeId === part.typeId;
    })) continue;

    completeRitual(dimension, headLocation, formation);
    return;
  }
}

function completeRitual(dimension, headLocation, formation) {
  const key = `${dimension.id}:${headLocation.x},${headLocation.y},${headLocation.z}`;
  if (activeRituals.has(key)) return;
  activeRituals.add(key);

  try {
    for (const part of formation) {
      getBlock(dimension, offset(headLocation, part))?.setType(AIR);
    }

    const spawnLocation = {
      x: headLocation.x + 0.5,
      y: headLocation.y - 1.5,
      z: headLocation.z + 0.5
    };
    dimension.spawnEntity(EASY_SANTA, spawnLocation);

    try {
      dimension.playSound("mob.wither.spawn", spawnLocation, { volume: 1, pitch: 1.2 });
      dimension.spawnParticle("minecraft:huge_explosion_emitter", spawnLocation);
    } catch {}
  } finally {
    system.runTimeout(() => activeRituals.delete(key), 20);
  }
}

function getBlock(dimension, location) {
  try {
    return dimension.getBlock(location);
  } catch {
    return undefined;
  }
}

function offset(location, part) {
  return {
    x: location.x + part.x,
    y: location.y + part.y,
    z: location.z + part.z
  };
}
