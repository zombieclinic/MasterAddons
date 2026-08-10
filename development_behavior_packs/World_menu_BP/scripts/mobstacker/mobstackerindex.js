import { world, system } from "@minecraft/server";

const validMobTypes = [
    "minecraft:zombie",
    "minecraft:chicken",
    "minecraft:creeper",
    "minecraft:skeleton",
    "minecraft:spider",
];

const MAX_STACK = 1000;
const SEARCH_RADIUS = 10;

export class ConvergenceBlock {
    onTick(event) {
        const { block, dimension } = event;
        if (!block || !dimension) return;

        spawnParticleRing(block, dimension);

        const center = {
            x: block.location.x + 0.5,
            y: block.location.y + 0.5,
            z: block.location.z + 0.5,
        };

        const nearbyEntities = dimension.getEntities({
            maxDistance: SEARCH_RADIUS,
            location: center,
        });

        const entitiesByType = {};
        for (const entity of nearbyEntities) {
            if (!entity || !entity.isValid()) continue;
            if (!validMobTypes.includes(entity.typeId)) continue;
            const typeId = entity.typeId;
            if (!entitiesByType[typeId]) {
                entitiesByType[typeId] = [];
            }
            entitiesByType[typeId].push(entity);
        }

        for (const [typeId, entityArray] of Object.entries(entitiesByType)) {
            if (entityArray.length >= 2) {
                mergePair(entityArray[0], entityArray[1]);
            }
        }
    }
}

function spawnParticleRing(block, dimension) {
    const centerX = block.location.x + 0.5;
    const centerY = block.location.y + 0.5;
    const centerZ = block.location.z + 0.5;
    const radius = SEARCH_RADIUS;
    const particleCount = 72;

    for (let i = 0; i < particleCount; i++) {
        const angle = (2 * Math.PI / particleCount) * i;
        const x = centerX + radius * Math.cos(angle);
        const z = centerZ + radius * Math.sin(angle);

        dimension.spawnParticle("minecraft:heart_particle", {
            x: x,
            y: centerY,
            z: z,
        });
    }
}

function mergePair(e1, e2) {
    const data1 = parseNameTag(e1.nameTag || e1.typeId);
    const data2 = parseNameTag(e2.nameTag || e2.typeId);

    let receiver, donor;
    if (data1.stackCount >= data2.stackCount) {
        receiver = e1;
        donor = e2;
    } else {
        receiver = e2;
        donor = e1;
    }

    const receiverData = parseNameTag(receiver.nameTag || receiver.typeId);
    const donorData = parseNameTag(donor.nameTag || donor.typeId);

    if (receiverData.stackCount >= MAX_STACK) {
        return;
    }

    const newReceiverCount = receiverData.stackCount + 1;
    const newDonorCount = donorData.stackCount - 1;
    const baseName = typeIdToName(e1.typeId);

    receiver.nameTag = `${baseName} x${newReceiverCount}`;

    if (newDonorCount <= 0) {
        donor.remove();
    } else {
        donor.nameTag = `${baseName} x${newDonorCount}`;
    }
}

function parseNameTag(nameTag) {
    const match = nameTag.match(/^(.*)\sx(\d+)$/);
    if (match) {
        return {
            baseName: match[1].trim(),
            stackCount: parseInt(match[2]) || 1,
        };
    }
    return {
        baseName: typeIdToName(nameTag),
        stackCount: 1,
    };
}

function typeIdToName(rawName) {
    const parts = rawName.split(":");
    let base = parts.length > 1 ? parts[1] : parts[0];
    base = base.replace(/_/g, " ");
    base = base
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    return base.trim();
}
