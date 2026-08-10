import { BlockPermutation, system } from "@minecraft/server";

const BLOOD_VINE = "zombie:blood_vine";
const AIR = "minecraft:air";
const STAGE_STATE = "zombie:vine_stage";
const GROWING_STATE = "zombie:vine_growing";
const START = "start";
const MIDDLE = "middle";
const END = "end";
const YES = "yes";
const NO = "no";
const FACE_STATE = "minecraft:block_face";
const MAX_VINE_LENGTH = 64;
const pendingBreaks = new Set();

export class BloodVineGrowthComponent {
	onPlace(event) {
		growBloodVine(event.block);
	}

	onTick(event) {
		growBloodVine(event.block);
	}

	onPlayerBreak(event) {
		breakVinesBelow(event.block, event.brokenBlockPermutation);
	}

	onBreak(event) {
		breakVinesBelow(event.block, event.brokenBlockPermutation);
	}
}

function breakVinesBelow(block, brokenPermutation) {
	if (!block || getTypeId(brokenPermutation) !== BLOOD_VINE) return;

	const originKey = getBlockKey(block);
	if (pendingBreaks.has(originKey)) return;
	pendingBreaks.add(originKey);

	system.run(() => {
		const clearedKeys = [];

		try {
			let current = block.below();

			for (let i = 0; i < MAX_VINE_LENGTH && isBloodVine(current); i++) {
				const key = getBlockKey(current);
				const next = current.below();
				pendingBreaks.add(key);
				clearedKeys.push(key);
				current.setType(AIR);
				current = next;
			}
		} catch {
		} finally {
			system.run(() => {
				pendingBreaks.delete(originKey);
				for (const key of clearedKeys) pendingBreaks.delete(key);
			});
		}
	});
}

function growBloodVine(block) {
	if (!isBloodVineStage(block, START)) return false;
	if (getState(block, GROWING_STATE) !== YES) return false;

	const tip = findTip(block);
	if (!tip) {
		stopGrowing(block);
		return false;
	}

	const target = tip.below();
	if (!canGrowInto(target)) {
		stopGrowing(block);
		return false;
	}

	try {
		if (tip !== block) {
			tip.setPermutation(tip.permutation.withState(STAGE_STATE, MIDDLE));
		}

		target.setPermutation(BlockPermutation.resolve(BLOOD_VINE, {
			[FACE_STATE]: getFace(block),
			[STAGE_STATE]: END,
			[GROWING_STATE]: NO
		}));

		if (!canGrowInto(target.below())) {
			stopGrowing(block);
		}

		return true;
	} catch {
		return false;
	}
}

function findTip(startBlock) {
	let current = startBlock;

	for (let i = 0; i < 32; i++) {
		const below = current.below();
		if (!isBloodVine(below)) return current;
		current = below;
	}

	return current;
}

function stopGrowing(block) {
	try {
		block.setPermutation(block.permutation.withState(GROWING_STATE, NO));
	} catch {}
}

function canGrowInto(block) {
	if (!block) return false;
	if (block.typeId === AIR || block.isAir) return true;
	try {
		return block.isLiquid === true;
	} catch {
		return false;
	}
}

function isBloodVine(block) {
	return block?.typeId === BLOOD_VINE;
}

function isBloodVineStage(block, stage) {
	return isBloodVine(block) && getState(block, STAGE_STATE) === stage;
}

function getFace(block) {
	return getState(block, FACE_STATE) ?? "north";
}

function getState(block, state) {
	try {
		return block.permutation.getState(state);
	} catch {
		return undefined;
	}
}

function getTypeId(permutation) {
	return permutation?.type?.id ?? permutation?.typeId;
}

function getBlockKey(block) {
	const { x, y, z } = block.location;
	return `${block.dimension.id}:${x}:${y}:${z}`;
}
