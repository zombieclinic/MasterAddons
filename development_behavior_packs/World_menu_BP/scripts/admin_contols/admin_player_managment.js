import { world } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { adminSettingsMenu } from "../admin_menu.js";
import {
  getAdminRank,
  isOwner,
  setAdminRank
} from "../core/permissions.js";
import { ensureObjective, getFakeScore } from "../core/scoreboard.js";
import { readWorldData, writeWorldData } from "../core/storage.js";

const RANK_SETTINGS = [
  "commandprompt",
  "tp_settings",
  "player_settings",
  "stores_settings",
  "gamemode_settings"
];

const RANK_CHILD_SETTINGS = {
  tp_settings: ["Tplayer", "TPPlayer"],
  player_settings: [
    "PlayerSettings_banmenu",
    "PlayerSettings_mpb",
    "PlayerSettings_inventory",
    "PlayerSettings_playerbases"
  ],
  stores_settings: [
    "StoreSettings_ServerShop",
    "StoreSettings_PlayertoPlayer",
    "StoreSettings_SellShop"
  ],
  gamemode_settings: [
    "gamemode_self_survival",
    "gamemode_self_creative",
    "gamemode_self_adventure",
    "gamemode_self_spectator",
    "gamemode_other_survival",
    "gamemode_other_creative",
    "gamemode_other_adventure",
    "gamemode_other_spectator"
  ]
};

function rankDefinitions() {
  const admin = ensureObjective("admin", "Admin Settings");
  return admin.getParticipants()
    .filter((entry) => entry.displayName.startsWith("rank_"))
    .map((entry) => ({
      id: entry.displayName.slice(5),
      name: decode(entry.displayName.slice(5)),
      level: admin.getScore(entry)
    }))
    .sort((left, right) => left.level - right.level);
}

function adminDirectory() {
  const records = readWorldData("permissions:admins", []);
  return Array.isArray(records) ? records : [];
}

function saveAdminRecord(target, rank) {
  const records = adminDirectory().filter((entry) => entry.id !== target.id);
  records.push({ id: target.id, name: target.name, rank });
  writeWorldData("permissions:admins", records);
}

export async function adminPlayerManagement(player) {
  const records = adminDirectory();
  const form = new ActionFormData()
    .title("Admin Management")
    .body("Admin assignments use player scoreboard identities, never encoded names.")
    .button("Assign Online Admin", "textures/ui/dressing_room_customization")
    .button("Manage Ranks", "textures/ui/anvil_icon")
    .button("§l§cBack", "textures/ui/book_arrowleft_hover")
    .button("§l§cExit", "textures/ui/crossout");
  for (const record of records) {
    form.button(`${record.name}\n§7Rank level ${record.rank}`);
  }

  const response = await form.show(player);
  if (response.canceled) return;
  if (response.selection === 0) return chooseAdmin(player);
  if (response.selection === 1) return manageRanks(player);
  if (response.selection === 2) return adminSettingsMenu(player);
  if (response.selection === 3) return;
  const record = records[response.selection - 4];
  if (record) return manageAdminRecord(player, record);
}

async function chooseAdmin(player) {
  const players = [...world.getPlayers()]
    .filter((target) => !isOwner(target))
    .sort((a, b) => a.name.localeCompare(b.name));
  const form = new ActionFormData()
    .title("Assign Admin")
    .button("§l§cBack");
  for (const target of players) {
    const rank = getAdminRank(target);
    form.button(`${target.name}${rank === undefined ? "" : `\n§7Current level ${rank}`}`);
  }
  const response = await form.show(player);
  if (response.canceled || response.selection === 0) return adminPlayerManagement(player);
  const target = players[response.selection - 1];
  if (target) return chooseRank(player, target);
}

async function chooseRank(player, target) {
  const ranks = rankDefinitions();
  const form = new ActionFormData()
    .title(`Rank for ${target.name}`)
    .button("Trusted Admin (level 0)");
  for (const rank of ranks) form.button(`${rank.name} (level ${rank.level})`);
  form.button("§l§cBack");
  const response = await form.show(player);
  if (response.canceled || response.selection === ranks.length + 1) return chooseAdmin(player);

  const level = response.selection === 0 ? 0 : ranks[response.selection - 1]?.level;
  if (level === undefined) return chooseAdmin(player);
  setAdminRank(target, level);
  saveAdminRecord(target, level);
  player.sendMessage(`§a${target.name} is now an admin at level ${level}.`);
  return adminPlayerManagement(player);
}

async function manageAdminRecord(player, record) {
  const online = [...world.getPlayers()].find((target) => target.id === record.id);
  const response = await new ActionFormData()
    .title(record.name)
    .body(online ? `Online · level ${record.rank}` : `Offline · level ${record.rank}`)
    .button("Change Rank")
    .button("Remove Admin")
    .button("§l§cBack")
    .show(player);
  if (response.canceled) return;
  if (response.selection === 0) {
    if (!online) {
      player.sendMessage("§eThe player must be online to change their rank safely.");
      return manageAdminRecord(player, record);
    }
    return chooseRank(player, online);
  }
  if (response.selection === 1) return removeAdmin(player, record, online);
  return adminPlayerManagement(player);
}

async function removeAdmin(player, record, online) {
  const response = await new MessageFormData()
    .title("Remove Admin")
    .body(`Remove admin permissions from ${record.name}?`)
    .button1("Cancel")
    .button2("Remove")
    .show(player);
  if (response.canceled || response.selection !== 1) {
    return manageAdminRecord(player, record);
  }

  const admin = world.scoreboard.getObjective("admin");
  if (online?.scoreboardIdentity && admin) {
    admin.removeParticipant(online.scoreboardIdentity);
  } else if (admin) {
    const identity = admin.getParticipants().find((entry) => entry.id === record.id);
    if (identity) admin.removeParticipant(identity);
  }
  writeWorldData(
    "permissions:admins",
    adminDirectory().filter((entry) => entry.id !== record.id)
  );
  return adminPlayerManagement(player);
}

async function manageRanks(player) {
  const ranks = rankDefinitions();
  const form = new ActionFormData()
    .title("Manage Ranks")
    .button("Add Rank", "textures/ui/anvil_icon")
    .button("§l§cBack");
  for (const rank of ranks) form.button(`${rank.name}\n§7Level ${rank.level}`);
  const response = await form.show(player);
  if (response.canceled) return;
  if (response.selection === 0) return addRank(player);
  if (response.selection === 1) return adminPlayerManagement(player);
  const rank = ranks[response.selection - 2];
  if (rank) return editRank(player, rank);
}

async function addRank(player) {
  const response = await new ModalFormData()
    .title("Add Rank")
    .textField("Rank name", "Example: Moderator")
    .textField("Rank level", "Whole number greater than 1")
    .show(player);
  if (response.canceled) return manageRanks(player);
  const name = String(response.formValues[0] ?? "").trim();
  const level = Number.parseInt(String(response.formValues[1]), 10);
  const id = encode(name);
  if (!id || !Number.isSafeInteger(level) || level <= 1) {
    player.sendMessage("§cEnter a rank name and a level greater than 1.");
    return addRank(player);
  }
  if (rankDefinitions().some((rank) => rank.id === id || rank.level === level)) {
    player.sendMessage("§cThat rank name or level is already in use.");
    return addRank(player);
  }

  ensureObjective("admin").setScore(`rank_${id}`, level);
  ensureObjective(`rank_${id}`, `${name} Settings`);
  return editRank(player, { id, name, level });
}

async function editRank(player, rank) {
  const objective = ensureObjective(`rank_${rank.id}`, `${rank.name} Settings`);
  const form = new ActionFormData()
    .title(rank.name)
    .body(`Rank level: ${rank.level}`);
  for (const setting of RANK_SETTINGS) {
    form.button(`${setting.replace(/_/g, " ")}: ${getFakeScore(objective, setting) === 1 ? "§aOn" : "§cOff"}`);
  }
  form.button("Remove Rank");
  form.button("§l§cBack");
  const response = await form.show(player);
  if (response.canceled) return;
  if (response.selection < RANK_SETTINGS.length) {
    const setting = RANK_SETTINGS[response.selection];
    return editRankCategory(player, rank, setting);
  }
  if (response.selection === RANK_SETTINGS.length) return removeRank(player, rank);
  return manageRanks(player);
}

async function editRankCategory(player, rank, category) {
  const objective = ensureObjective(`rank_${rank.id}`, `${rank.name} Settings`);
  const children = RANK_CHILD_SETTINGS[category] ?? [];
  const form = new ActionFormData()
    .title(`${rank.name}: ${category.replace(/_/g, " ")}`)
    .button(
      `Category: ${getFakeScore(objective, category) === 1 ? "§aEnabled" : "§cDisabled"}`
    );
  for (const child of children) {
    form.button(
      `${child.replace(/_/g, " ")}: ${getFakeScore(objective, child) === 1 ? "§aOn" : "§cOff"}`
    );
  }
  form.button("§l§cBack");

  const response = await form.show(player);
  if (response.canceled) return;
  if (response.selection === 0) {
    objective.setScore(category, getFakeScore(objective, category) === 1 ? 0 : 1);
    return editRankCategory(player, rank, category);
  }
  if (response.selection === children.length + 1) return editRank(player, rank);
  const child = children[response.selection - 1];
  if (child) {
    objective.setScore(child, getFakeScore(objective, child) === 1 ? 0 : 1);
    return editRankCategory(player, rank, category);
  }
}

async function removeRank(player, rank) {
  const response = await new MessageFormData()
    .title("Remove Rank")
    .body(`Remove ${rank.name}? Existing admins at level ${rank.level} will become trusted admins.`)
    .button1("Cancel")
    .button2("Remove")
    .show(player);
  if (response.canceled || response.selection !== 1) return editRank(player, rank);

  const admin = ensureObjective("admin");
  admin.removeParticipant(`rank_${rank.id}`);
  try {
    world.scoreboard.removeObjective(`rank_${rank.id}`);
  } catch {
    // Already absent.
  }
  for (const target of world.getPlayers()) {
    if (getAdminRank(target) === rank.level) setAdminRank(target, 0);
  }
  writeWorldData(
    "permissions:admins",
    adminDirectory().map((entry) =>
      entry.rank === rank.level ? { ...entry, rank: 0 } : entry
    )
  );
  return manageRanks(player);
}

function encode(value) {
  return value.trim().replace(/§./g, "").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 24);
}

function decode(value) {
  return value.replace(/_/g, " ");
}
