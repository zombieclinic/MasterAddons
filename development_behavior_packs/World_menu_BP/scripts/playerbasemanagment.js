import { world } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { playerManagementMenu } from "./admin_menu.js";
import { deleteBase, listBases, saveBase } from "./core/bases.js";
import { readPlayerData } from "./core/storage.js";

export async function playerBaseMenu(player) {
  const response = await new ActionFormData()
    .title("Player Locations")
    .body("Inspect protected bases or the saved homes of online players.")
    .button("Protected Bases")
    .button("Online Player Homes")
    .button("§l§cBack", "textures/ui/book_arrowleft_hover")
    .show(player);
  if (response.canceled) return;
  if (response.selection === 0) return protectedBases(player);
  if (response.selection === 1) return chooseOnlinePlayerHomes(player);
  if (response.selection === 2) return playerManagementMenu(player);
}

async function protectedBases(player) {
  const bases = listBases();
  const form = new ActionFormData()
    .title("Protected Bases")
    .body(`${bases.length} protected location(s)`)
    .button("§l§cBack", "textures/ui/book_arrowleft_hover");
  for (const base of bases) {
    form.button(
      `${base.enabled ? "§aOn" : "§cOff"}§r ${base.ownerName}: ${base.name}\n` +
      `§7${base.x}, ${base.y}, ${base.z}`
    );
  }
  const response = await form.show(player);
  if (response.canceled || response.selection === 0) return playerBaseMenu(player);
  const base = bases[response.selection - 1];
  if (base) return protectedBaseOptions(player, base);
}

async function protectedBaseOptions(player, base) {
  const response = await new ActionFormData()
    .title(`${base.ownerName}: ${base.name}`)
    .body(`${base.dimensionId}\n${base.x}, ${base.y}, ${base.z}`)
    .button("Teleport")
    .button(base.enabled ? "Disable Protection" : "Enable Protection")
    .button("Remove Protection")
    .button("§l§cBack")
    .show(player);
  if (response.canceled) return;
  if (response.selection === 0) {
    try {
      player.teleport(
        { x: base.x + 0.5, y: base.y, z: base.z + 0.5 },
        { dimension: world.getDimension(base.dimensionId), checkForBlocks: true }
      );
    } catch (error) {
      player.sendMessage(`§cTeleport failed: ${error}`);
    }
    return protectedBaseOptions(player, base);
  }
  if (response.selection === 1) {
    base.enabled = !base.enabled;
    saveBase(base);
    return protectedBaseOptions(player, base);
  }
  if (response.selection === 2) return confirmDeleteBase(player, base);
  if (response.selection === 3) return protectedBases(player);
}

async function confirmDeleteBase(player, base) {
  const response = await new MessageFormData()
    .title("Remove Protected Base")
    .body(`Remove ${base.ownerName}'s “${base.name}”?`)
    .button1("Cancel")
    .button2("Remove")
    .show(player);
  if (!response.canceled && response.selection === 1) {
    deleteBase(base.id);
    return protectedBases(player);
  }
  return protectedBaseOptions(player, base);
}

async function chooseOnlinePlayerHomes(player) {
  const players = [...world.getPlayers()].sort((a, b) => a.name.localeCompare(b.name));
  const form = new ActionFormData()
    .title("Online Player Homes")
    .button("§l§cBack");
  for (const target of players) form.button(target.name);
  const response = await form.show(player);
  if (response.canceled || response.selection === 0) return playerBaseMenu(player);
  const target = players[response.selection - 1];
  if (target) return showHomes(player, target);
}

async function showHomes(player, target) {
  const homes = readPlayerData(target, "teleport:homes", []);
  const form = new ActionFormData()
    .title(`${target.name}'s Homes`)
    .body(`${homes.length} saved home(s)`)
    .button("§l§cBack");
  for (const home of homes) {
    form.button(`${home.name}\n§7${home.x}, ${home.y}, ${home.z}`);
  }
  const response = await form.show(player);
  if (response.canceled || response.selection === 0) return chooseOnlinePlayerHomes(player);
  const home = homes[response.selection - 1];
  if (!home) return;
  try {
    player.teleport(
      { x: home.x + 0.5, y: home.y, z: home.z + 0.5 },
      { dimension: world.getDimension(home.dimensionId), checkForBlocks: true }
    );
  } catch (error) {
    player.sendMessage(`§cTeleport failed: ${error}`);
  }
  return showHomes(player, target);
}
