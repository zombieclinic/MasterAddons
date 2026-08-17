import { system } from "@minecraft/server";

const WALL_TAG = "zombie:wall";
const STACKED_STATE = "zombie:stacked";

export class WallStackingComponent {
  onPlace({ block }) {
    scheduleRefresh(block);
  }

  onPlayerBreak({ block }) {
    scheduleRefresh(block);
  }

  onBreak({ block }) {
    scheduleRefresh(block);
  }
}

function scheduleRefresh(block) {
  if (!block) return;
  const { dimension, location } = block;
  system.run(() => {
    try {
      const changedPosition = dimension.getBlock(location);
      refreshWall(changedPosition);
      refreshWall(changedPosition?.below());
    } catch {}
  });
}

function refreshWall(block) {
  if (!block?.hasTag(WALL_TAG)) return;
  const stacked = block.above()?.hasTag(WALL_TAG) === true;

  try {
    if (block.permutation.getState(STACKED_STATE) === stacked) return;
    block.setPermutation(block.permutation.withState(STACKED_STATE, stacked));
  } catch {}
}
