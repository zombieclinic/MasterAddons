import { Block, system } from "@minecraft/server";

// Shark's Staircase Script 1.2
// Gives custom stairs vanilla-style inner and outer corner placement.

const NAMESPACE = "zombie";
const CONNECTED_STAIR_TAG = `${NAMESPACE}:connected_stairs`;
const CARDINAL_DIRECTIONS = ["north", "east", "south", "west"];
const OPPOSITE_DIRECTIONS = {
    north: "south",
    east: "west",
    south: "north",
    west: "east",
};
const VANILLA_STAIR_DIRECTIONS = {
    0: "east",
    1: "west",
    2: "south",
    3: "north",
};

export class ConnectedStairsComponent {
    onPlace({ block }) {
        scheduleRefresh(block.dimension, block.location);
    }

    onPlayerBreak({ block }) {
        scheduleRefresh(block.dimension, block.location);
    }

    onBreak({ block }) {
        scheduleRefresh(block.dimension, block.location);
    }
}

function scheduleRefresh(dimension, location) {
    // Waiting one tick is important on break: the old stair must be gone before
    // the surrounding stairs calculate their new shapes.
    system.run(() => {
        try {
            const center = dimension.getBlock(location);
            refreshCustomStair(center);

            for (const direction of CARDINAL_DIRECTIONS) {
                refreshCustomStair(getNeighbor(center, direction));
            }
        } catch {}
    });
}

/**
 * Recalculates all four connection states instead of only toggling one.
 * This prevents old corner states from being left behind.
 * @param {Block} block
 */
function refreshCustomStair(block) {
    if (!isCustomConnectedStair(block)) return;

    try {
        block.setPermutation(
            block.permutation.withState(
                `${NAMESPACE}:stair_type`,
                getStairType(block)
            )
        );
    } catch {}
}

function getStairType(block) {
    const current = getStairInfo(block);
    if (!current) return 1;
    const info = {};
    for (const direction of CARDINAL_DIRECTIONS) {
        info[direction] = getStairInfo(getNeighbor(block, direction));
    }
    const valid = (direction, facing) =>
        info[direction]?.half === current.half &&
        info[direction]?.facing === facing;
    const sameHalf = (direction) => info[direction]?.half === current.half;
    // Vanilla keeps a stair straight when a matching continuation occupies
    // the side that a proposed corner would cut into.
    const canCornerToward = (direction) =>
        info[direction] === undefined ||
        info[direction].half !== current.half ||
        info[direction].facing !== current.facing;

    switch (current.facing) {
        case "north":
            if (valid("north", "west") && canCornerToward("east")) return 4;
            if (valid("north", "east") && canCornerToward("west")) return 5;
            if (valid("south", "west") && canCornerToward("west")) return 2;
            if (valid("south", "east") && canCornerToward("east")) return 3;
            if (!sameHalf("north") && !sameHalf("south")) return 1;
            break;
        case "south":
            if (valid("north", "west") && canCornerToward("west")) return 3;
            if (valid("north", "east") && canCornerToward("east")) return 2;
            if (valid("south", "west") && canCornerToward("east")) return 4;
            if (valid("south", "east") && canCornerToward("west")) return 5;
            if (!sameHalf("north") && !sameHalf("south")) return 1;
            break;
        case "west":
            if (valid("west", "north") && canCornerToward("south")) return 5;
            if (valid("west", "south") && canCornerToward("north")) return 4;
            if (valid("east", "north") && canCornerToward("north")) return 3;
            if (valid("east", "south") && canCornerToward("south")) return 2;
            if (!sameHalf("west") && !sameHalf("east")) return 1;
            break;
        case "east":
            if (valid("west", "north") && canCornerToward("north")) return 2;
            if (valid("west", "south") && canCornerToward("south")) return 3;
            if (valid("east", "north") && canCornerToward("south")) return 5;
            if (valid("east", "south") && canCornerToward("north")) return 4;
            if (!sameHalf("west") && !sameHalf("east")) return 1;
            break;
    }
    return 1;
}

function getNeighbor(block, direction) {
    try {
        return block?.[direction]();
    } catch {
        return undefined;
    }
}

function getStairInfo(block) {
    if (!isStairBlock(block)) return undefined;

    try {
        let facing;
        let half;

        if (isVanillaStair(block)) {
            // Vanilla Bedrock stairs use their legacy states instead of the
            // placement-trait states used by our custom stairs.
            const direction = block.permutation.getState("weirdo_direction");
            const upsideDown = block.permutation.getState("upside_down_bit");

            facing = VANILLA_STAIR_DIRECTIONS[direction];
            half = upsideDown ? "top" : "bottom";
        } else {
            facing = block.permutation.getState(
                "minecraft:cardinal_direction"
            );
            half = block.permutation.getState("minecraft:vertical_half");
        }

        if (!CARDINAL_DIRECTIONS.includes(facing)) return undefined;
        if (half !== "top" && half !== "bottom") return undefined;

        return { facing, half };
    } catch {
        return undefined;
    }
}

function isCustomConnectedStair(block) {
    try {
        if (!block || block.typeId?.startsWith("minecraft:")) return false;
        return block.hasTag(CONNECTED_STAIR_TAG) ||
            block.permutation.getState(`${NAMESPACE}:stair_type`) !== undefined;
    } catch {
        return false;
    }
}

function isVanillaStair(block) {
    try {
        return block?.typeId?.startsWith("minecraft:") &&
            block.typeId.endsWith("_stairs");
    } catch {
        return false;
    }
}

function isStairBlock(block) {
    return isCustomConnectedStair(block) || isVanillaStair(block);
}
