import { Block, system } from "@minecraft/server";

// Shark's Staircase Script 1.2
// Gives custom stairs vanilla-style inner and outer corner placement.

const NAMESPACE = "custom";
const CONNECTED_STAIR_TAG = `${NAMESPACE}:connected_stairs`;
const CARDINAL_DIRECTIONS = ["north", "east", "south", "west"];
const OPPOSITE_DIRECTIONS = {
    north: "south",
    east: "west",
    south: "north",
    west: "east",
};

export class ConnectedStairsComponent {
    onPlace({ block }) {
        try {
            block.setPermutation(
                block.permutation.withState(`${NAMESPACE}:placed`, true)
            );
        } catch {}

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

    const cornerDirections = getVanillaCornerDirections(block);
    let permutation = block.permutation;

    try {
        for (const direction of CARDINAL_DIRECTIONS) {
            permutation = permutation.withState(
                `${NAMESPACE}:${direction}`,
                cornerDirections.includes(direction)
            );
        }

        block.setPermutation(permutation);
    } catch {}
}

/**
 * Returns the two directions used by the existing stair permutations to select
 * a corner quadrant. An empty array means the stair should remain straight.
 * @param {Block} block
 * @returns {string[]}
 */
function getVanillaCornerDirections(block) {
    const current = getStairInfo(block);
    if (!current) return [];

    // A perpendicular stair in front creates an outside corner.
    const front = getStairInfo(getNeighbor(block, current.facing));
    if (
        isCompatibleCorner(current, front) &&
        canTakeShape(block, OPPOSITE_DIRECTIONS[front.facing], current)
    ) {
        return [current.facing, front.facing];
    }

    // A perpendicular stair behind creates an inside corner.
    const back = getStairInfo(
        getNeighbor(block, OPPOSITE_DIRECTIONS[current.facing])
    );
    if (
        isCompatibleCorner(current, back) &&
        canTakeShape(block, back.facing, current)
    ) {
        return [OPPOSITE_DIRECTIONS[current.facing], back.facing];
    }

    return [];
}

function isCompatibleCorner(current, nearby) {
    return nearby !== undefined &&
        nearby.half === current.half &&
        getAxis(nearby.facing) !== getAxis(current.facing);
}

/**
 * Matches vanilla's side check so a stair line is not forced into a corner by
 * another nearby stair.
 */
function canTakeShape(block, sideDirection, current) {
    const side = getStairInfo(getNeighbor(block, sideDirection));

    return side === undefined ||
        side.facing !== current.facing ||
        side.half !== current.half;
}

function getAxis(direction) {
    return direction === "north" || direction === "south" ? "z" : "x";
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
        const facing = block.permutation.getState(
            "minecraft:cardinal_direction"
        );
        const half = block.permutation.getState("minecraft:vertical_half");

        if (!CARDINAL_DIRECTIONS.includes(facing)) return undefined;
        if (half !== "top" && half !== "bottom") return undefined;

        return { facing, half };
    } catch {
        return undefined;
    }
}

function isCustomConnectedStair(block) {
    try {
        return !!block?.hasTag(CONNECTED_STAIR_TAG);
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
