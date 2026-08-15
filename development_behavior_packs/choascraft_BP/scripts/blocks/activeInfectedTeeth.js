import { BlockPermutation, system } from "@minecraft/server";

const AIR = "minecraft:air";
const INFECTED_SLIME = "zombie:infected_slime";
const ZOMBIES = [
	"zombie:crusher",
	"zombie:impaler",
	"zombie:runner",
	"zombie:scavenger",
	"zombie:spitter",
	"zombie:walker"
];
const lastTriggerTicks = new Map();

export class ActiveInfectedTeethComponent {
	onPlace(event) {
		ensureSlime(event.block);
	}

	onStepOn(event) {
		ensureSlime(event.block);
		spawnMonster(event.block, event.entity);
	}

	onEntityFallOn(event) {
		ensureSlime(event.block);
		spawnMonster(event.block, event.entity);
	}

	onPlayerBreak(event) {
		removeLinkedSlime(event.block);
	}

	onBreak(event) {
		removeLinkedSlime(event.block);
	}
}

function spawnMonster(block, entity) {
	if (!block || entity?.typeId !== "minecraft:player") return;

	const key = blockKey(block);
	const currentTick = system.currentTick;
	if (currentTick - (lastTriggerTicks.get(key) ?? -20) < 20) return;
	lastTriggerTicks.set(key, currentTick);

	const zombie = ZOMBIES[Math.floor(Math.random() * ZOMBIES.length)];
	const dimension = block.dimension;
	const location = { x: block.location.x + 0.5, y: block.location.y + 1.2, z: block.location.z + 0.5 };

	system.run(() => {
		try {
			dimension.spawnEntity(zombie, location);
		} catch {
		}
	});
}

function ensureSlime(block) {
	if (!block) return false;

	const above = block.above();
	if (!above) return false;
	if (above.typeId === INFECTED_SLIME) return true;
	if (!above.isAir && above.typeId !== AIR) return false;

	try {
		above.setPermutation(BlockPermutation.resolve(INFECTED_SLIME));
		return true;
	} catch {
		return false;
	}
}

function removeLinkedSlime(block) {
	const above = block?.above();
	if (above?.typeId !== INFECTED_SLIME) return;

	system.run(() => {
		try {
			above.setType(AIR);
		} catch {
		}
	});
}

function blockKey(block) {
	return `${block.dimension.id}:${block.location.x},${block.location.y},${block.location.z}`;
}
