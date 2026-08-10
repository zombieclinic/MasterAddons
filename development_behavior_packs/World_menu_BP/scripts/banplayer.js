import { world } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { playerManagementMenu } from "./admin_menu.js";
import { isOwner } from "./core/permissions.js";
import {
  banPlayerRecord,
  enforcePlayerBan,
  listBans,
  unbanPlayerRecord
} from "./core/moderation.js";

export async function banMenu(player) {
  const response = await new ActionFormData()
    .title("Ban Management")
    .button("Ban Online Player", "textures/ui/anvil_icon")
    .button("Ban Player Name", "textures/ui/FriendsIcon")
    .button("View and Unban", "textures/ui/icon_book_writable")
    .button("§l§cBack", "textures/ui/book_arrowleft_hover")
    .show(player);
  if (response.canceled) return;
  if (response.selection === 0) return chooseOnlinePlayer(player);
  if (response.selection === 1) return enterPlayerName(player);
  if (response.selection === 2) return viewBans(player);
  if (response.selection === 3) return playerManagementMenu(player);
}

async function chooseOnlinePlayer(player) {
  const players = [...world.getPlayers()]
    .filter((target) => target.id !== player.id && !isOwner(target))
    .sort((a, b) => a.name.localeCompare(b.name));
  const form = new ActionFormData()
    .title("Ban Online Player")
    .button("§l§cBack");
  for (const target of players) form.button(target.name);
  const response = await form.show(player);
  if (response.canceled || response.selection === 0) return banMenu(player);
  const target = players[response.selection - 1];
  if (target) return confirmBan(player, { id: target.id, name: target.name }, target);
}

async function enterPlayerName(player) {
  const response = await new ModalFormData()
    .title("Ban Player Name")
    .textField("Exact player name", "Spaces, underscores, and numbers are supported")
    .textField("Reason", "Reason shown to player", { defaultValue: "Banned by an administrator." })
    .show(player);
  if (response.canceled) return banMenu(player);
  const name = String(response.formValues[0] ?? "").trim();
  const reason = String(response.formValues[1] ?? "").trim() || "Banned by an administrator.";
  if (!name) {
    player.sendMessage("§cPlayer name cannot be empty.");
    return enterPlayerName(player);
  }
  return confirmBan(player, { name, reason });
}

async function confirmBan(player, record, onlineTarget) {
  const response = await new MessageFormData()
    .title("Confirm Ban")
    .body(`Ban ${record.name}?`)
    .button1("Cancel")
    .button2("Ban")
    .show(player);
  if (response.canceled || response.selection !== 1) return banMenu(player);

  if (onlineTarget && isOwner(onlineTarget)) {
    player.sendMessage("§cThe world owner cannot be banned.");
    return banMenu(player);
  }
  const saved = banPlayerRecord(record);
  player.sendMessage(`§aBanned ${saved.name}.`);
  if (onlineTarget) enforcePlayerBan(onlineTarget);
  return banMenu(player);
}

async function viewBans(player) {
  const bans = listBans();
  const form = new ActionFormData()
    .title("Banned Players")
    .body(bans.length ? "Choose a player to unban." : "The ban list is empty.")
    .button("§l§cBack");
  for (const ban of bans) form.button(`${ban.name}\n§7${ban.reason}`);
  const response = await form.show(player);
  if (response.canceled || response.selection === 0) return banMenu(player);
  const ban = bans[response.selection - 1];
  if (!ban) return;

  const confirmation = await new MessageFormData()
    .title("Unban Player")
    .body(`Unban ${ban.name}?`)
    .button1("Cancel")
    .button2("Unban")
    .show(player);
  if (!confirmation.canceled && confirmation.selection === 1) {
    unbanPlayerRecord(ban);
    player.sendMessage(`§aUnbanned ${ban.name}.`);
  }
  return viewBans(player);
}
