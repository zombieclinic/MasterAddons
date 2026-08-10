import {
  EnderChestInspector,
  inspectEnderChest as inspectDirectEnderChest
} from "../player_enderchest.js";

export { EnderChestInspector };

export function inspectEnderChest(admin, selectedPlayer, options = {}) {
  return inspectDirectEnderChest(admin, selectedPlayer, options);
}
